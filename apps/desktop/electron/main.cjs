const { app, BrowserWindow, session, shell, ipcMain, dialog } = require('electron');
const path = require('node:path');
const { RecognitionService } = require('./recognition/service.cjs');
let mainWindow, recognition;
function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#0b1019',
    title: '海克斯工坊 · HexARAM',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  mainWindow = win;
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (
        target.protocol === 'https:' &&
        ['op.gg', 'lolalytics.com', 'arammayhem.com'].includes(target.hostname)
      )
        shell.openExternal(target.href);
    } catch {}
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  if (!app.isPackaged && process.env.HEXARAM_DEV === '1') win.loadURL('http://127.0.0.1:5173');
  else win.loadFile(path.join(__dirname, '../../../dist/index.html'));
}
app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) =>
    callback(false),
  );
  recognition = new RecognitionService({
    userData: app.getPath('userData'),
    resourceRoot: app.isPackaged
      ? path.join(process.resourcesPath, 'recognition')
      : path.join(app.getAppPath(), 'resources', 'recognition'),
    emit: (packet) => {
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('recognition:observation', packet);
    },
  });
  await recognition.initialize();
  function handle(channel, callback) {
    ipcMain.handle(channel, async (event, ...args) => {
      if (
        !mainWindow ||
        event.sender !== mainWindow.webContents ||
        event.senderFrame !== mainWindow.webContents.mainFrame
      )
        throw new Error('Unsupported sender');
      try {
        return await callback(...args);
      } catch (error) {
        return { error: error.message ?? '操作失败' };
      }
    });
  }
  handle('recognition:settings', () => recognition.settings);
  handle('recognition:configure', (settings) => {
    const allowed = [
      'enabled',
      'sourceId',
      'allowUnverifiedMode',
      'scene',
      'interval',
      'slots',
      'candidates',
      'championText',
      'selectedText',
      'selectedIcons',
    ];
    const patch = {};
    for (const key of allowed)
      if (settings && Object.hasOwn(settings, key)) patch[key] = settings[key];
    return recognition.configure(patch);
  });
  handle('recognition:directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择英雄联盟安装目录（包含 LeagueClient 或 lockfile）',
      properties: ['openDirectory'],
    });
    if (result.canceled) return recognition.settings;
    return recognition.configure({ directory: result.filePaths[0] });
  });
  handle('recognition:sources', () => recognition.sources());
  handle('recognition:preview', () => recognition.preview());
  handle('recognition:scan', async () => {
    await recognition.scan();
    return { ok: true };
  });
  createWindow();
  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) createWindow();
  });
});
app.on('before-quit', () => recognition?.close());
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
