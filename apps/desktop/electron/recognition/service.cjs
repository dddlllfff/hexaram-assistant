const { desktopCapturer, nativeImage, app } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { discoverClient, pollLcu, pollLive } = require('./transport.cjs');
const { sanitizeConfig } = require('./settings.cjs');
const { feature, rankIcon } = require('./image-match.cjs');
const titleAllowed = (name) =>
  /^(League of Legends(?: \(TM\) Client)?|英雄联盟(?:客户端)?|LeagueClient(?:Ux)?)$/i.test(name);
function abortable(promise, signal) {
  return new Promise((resolve, reject) => {
    const cancel = () => reject(new Error('扫描已取消。'));
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    Promise.resolve(promise)
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', cancel));
  });
}
const crop = (image, r) => {
  const { width, height } = image.getSize();
  const x = Math.min(width - 1, Math.round(r.x * width)),
    y = Math.min(height - 1, Math.round(r.y * height));
  return image.crop({
    x,
    y,
    width: Math.min(width - x, Math.max(1, Math.floor(r.w * width))),
    height: Math.min(height - y, Math.max(1, Math.floor(r.h * height))),
  });
};
class RecognitionService {
  constructor({ emit, userData, resourceRoot }) {
    this.emit = emit;
    this.userData = userData;
    this.root = resourceRoot;
    this.settings = sanitizeConfig();
    this.sequence = 0;
    this.apiBusy = false;
    this.scanBusy = false;
    this.phase = 'Unknown';
    this.instance = crypto.randomUUID();
    this.lastDiscover = 0;
    this.lastScan = 0;
    this.templates = null;
  }
  async initialize() {
    try {
      this.settings = sanitizeConfig(
        JSON.parse(await fs.readFile(path.join(this.userData, 'recognition.json'), 'utf8')),
      );
      this.settings.allowUnverifiedMode = false;
    } catch {}
    this.timer = setInterval(
      () => this.tick().catch(() => this.send({ message: '自动读取暂时不可用，仍可手动操作。' })),
      2000,
    );
    return this.settings;
  }
  send(packet) {
    if (this.closed) return;
    this.emit({
      ...packet,
      instance: this.instance,
      sequence: ++this.sequence,
      capturedAt: packet.capturedAt ?? Date.now(),
      phase: this.phase,
      queueId: this.queueId,
      matchId: this.matchId,
      enabled: this.settings.enabled,
      modeConfirmed: this.settings.allowUnverifiedMode,
    });
  }
  async configure(patch) {
    if (patch.directory !== undefined && patch.directory !== this.settings.directory) {
      this.credentials = null;
      this.lastDiscover = 0;
    }
    this.settings = sanitizeConfig({ ...this.settings, ...patch });
    await fs.writeFile(path.join(this.userData, 'recognition.json'), JSON.stringify(this.settings));
    if (!this.settings.enabled) {
      this.scanController?.abort();
      await this.stopWorker();
    }
    this.send({ message: this.settings.enabled ? '自动读取已开启。' : '自动读取已暂停。' });
    return this.settings;
  }
  async sources() {
    const rows = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 0, height: 0 },
      fetchWindowIcons: false,
    });
    return rows.filter((s) => titleAllowed(s.name)).map((s) => ({ id: s.id, name: s.name }));
  }
  async capture() {
    const rows = (
      await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 2560, height: 1440 },
        fetchWindowIcons: false,
      })
    ).filter((s) => titleAllowed(s.name));
    let source = rows.find((s) => s.id === this.settings.sourceId);
    if (!source) {
      const game = rows.filter((s) => /\(TM\) Client/.test(s.name));
      source = game.length === 1 ? game[0] : rows.length === 1 ? rows[0] : null;
    }
    if (!source)
      throw new Error(
        rows.length
          ? '发现多个游戏窗口，请手动指定要识别的窗口。'
          : '没有找到可读取的英雄联盟窗口。',
      );
    if (source.thumbnail.isEmpty() || source.thumbnail.getSize().width < 100)
      throw new Error('游戏窗口图像为空，请检查最小化或独占全屏状态。');
    return { image: source.thumbnail, name: source.name, id: source.id };
  }
  async preview() {
    const { image, name, id } = await this.capture();
    return { dataUrl: image.resize({ width: 1280 }).toDataURL(), name, id, ...image.getSize() };
  }
  async worker() {
    if (!this.settings.enabled) throw new Error('识别已暂停。');
    if (this.workerPromise) return this.workerPromise;
    this.send({ message: '正在加载本地中英文识别模型，首次加载可能需要数秒。' });
    this.workerPromise = (async () => {
      const moduleRoot = app.isPackaged
        ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules')
        : path.join(app.getAppPath(), 'node_modules');
      const tesseract = require(path.join(moduleRoot, 'tesseract.js'));
      const w = await tesseract.createWorker(['chi_sim', 'eng'], 1, {
        langPath: path.join(this.root, 'models'),
        cacheMethod: 'none',
        gzip: true,
        workerPath: path.join(
          moduleRoot,
          'tesseract.js',
          'src',
          'worker-script',
          'node',
          'index.js',
        ),
        errorHandler: () => {},
      });
      await w.setParameters({
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1',
        user_defined_dpi: '160',
      });
      return w;
    })();
    try {
      return await this.workerPromise;
    } catch {
      this.workerPromise = null;
      throw new Error('本地 OCR 模型加载失败，请检查安装包资源是否完整。');
    }
  }
  async stopWorker() {
    const promise = this.workerPromise;
    this.workerPromise = null;
    if (promise)
      try {
        await (await promise).terminate();
      } catch {}
  }
  async readText(image, region, signal) {
    if (signal.aborted) throw new Error('扫描已取消。');
    const input = crop(image, region);
    const w = await abortable(this.worker(), signal);
    const scaled = input.resize({
      width: Math.min(1600, Math.max(600, input.getSize().width * 2)),
      quality: 'best',
    });
    const { data } = await abortable(w.recognize(scaled.toPNG()), signal);
    return { text: data.text.slice(0, 1000), confidence: data.confidence };
  }
  async loadTemplates() {
    if (this.templates) return;
    const rows = JSON.parse(await fs.readFile(path.join(this.root, 'icons.json'), 'utf8'));
    this.templates = rows.map((row) => {
      const image = nativeImage.createFromPath(path.join(this.root, 'icons', row.file));
      return { gameId: row.gameId, feature: this.iconFeature(image) };
    });
  }
  iconFeature(image) {
    const normalized = image.resize({ width: 80, height: 80, quality: 'best' });
    return feature(
      normalized
        .crop({ x: 10, y: 10, width: 60, height: 60 })
        .resize({ width: 24, height: 24, quality: 'best' })
        .getBitmap(),
    );
  }
  async scan() {
    if (!this.settings.enabled || this.scanBusy) return;
    const eligible =
      this.queueId === 2400 || (this.queueId == null && this.settings.allowUnverifiedMode);
    if (!eligible) {
      this.send({
        message:
          this.queueId == null
            ? '无法确认游戏模式。请连接客户端，或手动确认本局为海克斯大乱斗。'
            : '当前不是海克斯大乱斗，自动识别暂停。',
      });
      return;
    }
    const scene =
      this.settings.scene === 'auto'
        ? this.phase === 'ChampSelect'
          ? 'select'
          : this.phase === 'InProgress'
            ? 'game'
            : 'unknown'
        : this.settings.scene;
    if (scene === 'unknown') {
      this.send({ message: '等待游戏阶段。接口不可用时可手动指定选人或对局阶段。' });
      return;
    }
    if (scene === 'select' && !this.settings.championText) {
      this.send({ message: '选人英雄优先通过接口读取；接口不可用时可校准英雄名称区域。' });
      return;
    }
    this.scanBusy = true;
    const controller = new AbortController();
    this.scanController = controller;
    try {
      const settings = this.settings;
      const phase = this.phase,
        matchId = this.matchId,
        queueId = this.queueId;
      const current = () =>
        this.settings === settings &&
        settings.enabled &&
        this.phase === phase &&
        this.matchId === matchId &&
        this.queueId === queueId;
      const { image, name } = await this.capture();
      const capturedAt = Date.now();
      const fingerprint = crypto.createHash('sha256').update(image.toPNG()).digest('hex');
      if (scene === 'select') {
        const championText = await this.readText(image, settings.championText, controller.signal);
        if (current())
          this.send({
            capturedAt,
            championText,
            frameHash: fingerprint,
            sourceName: name,
            message: '已扫描选人英雄名称。',
          });
        return;
      }
      const candidatesText = [];
      for (const region of settings.candidates)
        candidatesText.push(await this.readText(image, region, controller.signal));
      const selectedText = settings.selectedText
        ? await this.readText(image, settings.selectedText, controller.signal)
        : undefined;
      const selectedIcons = [];
      if (settings.selectedIcons) {
        await this.loadTemplates();
        const row = crop(image, settings.selectedIcons);
        const { width, height } = row.getSize();
        const slotWidth = width / settings.slots;
        for (let i = 0; i < settings.slots; i++) {
          const icon = row.crop({
            x: Math.floor(i * slotWidth),
            y: 0,
            width: Math.max(1, Math.floor(slotWidth)),
            height,
          });
          const match = rankIcon(this.iconFeature(icon), this.templates);
          if (match) selectedIcons.push({ ...match, slot: i });
        }
      }
      if (current())
        this.send({
          capturedAt,
          candidatesText,
          selectedText,
          selectedIcons,
          frameHash: fingerprint,
          sourceName: name,
          message: '已扫描游戏窗口；仅连续稳定的高置信结果会更新本局。',
        });
    } catch (error) {
      if (this.settings.enabled)
        this.send({ message: error.message ?? '识别失败，可继续手动操作。' });
    } finally {
      this.scanBusy = false;
      this.scanController = null;
    }
  }
  async tick() {
    if (!this.settings.enabled || this.apiBusy) return;
    this.apiBusy = true;
    try {
      let connectionMessage = '';
      let state = {};
      if (!this.credentials && Date.now() - this.lastDiscover > 15000) {
        this.lastDiscover = Date.now();
        const found = await discoverClient(this.settings.directory);
        if (found.port) this.credentials = found;
        else connectionMessage = found.error;
      }
      if (this.credentials) {
        try {
          state = await pollLcu(this.credentials);
        } catch {
          this.credentials = null;
          connectionMessage = '客户端连接已失效，正在等待重连。';
        }
      }
      const newSession = state.phase === 'ChampSelect' && this.phase !== 'ChampSelect';
      if (newSession) {
        this.queueId = undefined;
        this.matchId = undefined;
      }
      if (state.phase) this.phase = state.phase;
      if (state.queueId !== undefined) this.queueId = state.queueId;
      if (state.matchId) this.matchId = state.matchId;
      if (['None', 'Lobby', 'EndOfGame'].includes(this.phase)) {
        this.queueId = state.queueId;
        this.matchId = state.matchId;
      }
      let live = {};
      if (this.phase === 'InProgress' || this.phase === 'Unknown')
        try {
          live = (await pollLive()) ?? {};
        } catch {}
      if (live.liveConnected && this.phase === 'Unknown') this.phase = 'InProgress';
      this.send({
        ...state,
        ...live,
        newSession,
        message:
          connectionMessage ||
          (this.credentials ? '客户端接口已连接。' : '等待客户端；仍可使用窗口识别与手动输入。'),
      });
      if (Date.now() - this.lastScan >= this.settings.interval) {
        this.lastScan = Date.now();
        this.scan().catch(() => {});
      }
    } finally {
      this.apiBusy = false;
    }
  }
  async close() {
    this.closed = true;
    this.scanController?.abort();
    clearInterval(this.timer);
    await this.stopWorker();
  }
}
module.exports = { RecognitionService, titleAllowed, crop };
