import { _electron as electron, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
const env = { ...process.env, HEXARAM_DEV: '0' };
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({
  ...(process.env.HEXARAM_EXECUTABLE ? { executablePath: process.env.HEXARAM_EXECUTABLE } : {}),
  args: [
    ...(process.env.HEXARAM_EXECUTABLE ? [] : ['.']),
    `--user-data-dir=${path.resolve('test-results', `recognition-profile-${Date.now()}`)}`,
  ],
  env,
});
try {
  const page = await app.firstWindow();
  await page.waitForSelector('h1');
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // A synthetic window exercises actual Windows capture and the bundled offline worker;
  // it is never a game client and does not connect to or interact with a match.
  const root = process.env.HEXARAM_EXECUTABLE
    ? path.join(path.dirname(process.env.HEXARAM_EXECUTABLE), 'resources', 'recognition')
    : path.resolve('resources', 'recognition');
  const icon = fs.readFileSync(path.join(root, 'icons', '3018.png')).toString('base64');
  const source = await app.evaluate(async ({ BrowserWindow }, icon) => {
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      frame: false,
      resizable: false,
      title: 'League of Legends (TM) Client',
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    const html = `<title>League of Legends (TM) Client</title><style>body{margin:0;background:#101820;color:white;font:26px Arial}p{position:absolute;margin:0;top:200px;width:340px;height:70px;padding-top:15px;text-align:center;background:#101820}.selected{top:470px;left:40px;width:360px}img{position:absolute;top:600px;left:40px;width:80px;height:80px}</style><p style="left:20px">Jeweled Gauntlet</p><p style="left:420px">Donation</p><p style="left:820px">Recursion</p><p class="selected">炼狱导管</p><img src="data:image/png;base64,${icon}">`;
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    return win.getMediaSourceId();
  }, icon);
  const config = {
    sourceId: source,
    allowUnverifiedMode: true,
    scene: 'game',
    interval: 15000,
    candidates: [20, 420, 820].map((x) => ({
      x: x / 1200,
      y: 200 / 800,
      w: 340 / 1200,
      h: 70 / 800,
    })),
    selectedText: { x: 40 / 1200, y: 470 / 800, w: 360 / 1200, h: 70 / 800 },
    selectedIcons: null,
  };
  await page.evaluate((c) => window.hexaramRecognition.configure(c), config);
  // Reload reads settings through the public preload API and keeps hook state in sync.
  await page.reload();
  await page.getByText('连接与区域设置', { exact: false }).click();
  await page.getByRole('checkbox', { name: '接口无法确认时，我确认本局为海克斯大乱斗' }).check();
  await page.getByText('连接与区域设置', { exact: false }).click();
  await page.getByRole('button', { name: '开启自动读取', exact: true }).click();
  const scan = async () => {
    await page.evaluate(() => window.hexaramRecognition.scan());
  };
  await page.evaluate(() => {
    window.__reads = [];
    window.hexaramRecognition.onObservation((p) => {
      if (p.selectedIcons) window.__reads.push(p.selectedIcons);
    });
  });
  await scan();
  await scan();
  await expect(page.locator('.candidate-card')).toHaveCount(3, { timeout: 30000 });
  await expect(page.locator('.selected-list')).toContainText('炼狱导管');
  await page.getByRole('button', { name: '移除已选炼狱导管', exact: true }).click();
  await scan();
  await scan();
  await expect(page.locator('.selected-list')).not.toContainText('炼狱导管');
  await expect(
    page.getByRole('button', { name: '不再添加 炼狱导管 · 取消', exact: true }),
  ).toBeVisible();
  // Exercise icon matching using the same capture path, independently of OCR text.
  await page.getByRole('button', { name: '不再添加 炼狱导管 · 取消', exact: true }).click();
  await page.evaluate(() =>
    window.hexaramRecognition.configure({
      selectedText: null,
      selectedIcons: { x: 40 / 1200, y: 600 / 800, w: 320 / 1200, h: 80 / 800 },
      slots: 4,
    }),
  );
  await scan();
  await scan();
  assert.ok(
    (await page.evaluate(() => window.__reads.at(-1))).some((r) => r.gameId === 3018 && r.accepted),
  );
  await expect(page.locator('.selected-list')).toContainText('大腕');
  // Synthetic API observations drive the same reconciliation subscription as real LCU.
  await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows().find((w) => w.getTitle().includes('HexARAM'));
    for (let i = 1; i <= 2; i++)
      main.webContents.send('recognition:observation', {
        instance: 'api-fixture',
        sequence: i,
        capturedAt: Date.now(),
        enabled: true,
        phase: 'ChampSelect',
        queueId: 2400,
        championGameId: 22,
      });
  });
  await expect(page.locator('.build-title > div > p').first()).toContainText('艾希');
  await page.getByRole('textbox', { name: '搜索英雄' }).fill('Leona');
  await page.getByRole('button', { name: /曙 蕾欧娜/ }).click();
  await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows().find((w) => w.getTitle().includes('HexARAM'));
    for (let i = 3; i <= 4; i++)
      main.webContents.send('recognition:observation', {
        instance: 'api-fixture',
        sequence: i,
        capturedAt: Date.now(),
        enabled: true,
        phase: 'ChampSelect',
        queueId: 2400,
        championGameId: 22,
      });
  });
  await expect(page.locator('.build-title > div > p').first()).toContainText('蕾欧娜');
  await expect(
    page.getByRole('button', { name: '英雄手动锁定 · 解除', exact: true }),
  ).toBeVisible();
  await page.getByText('连接与区域设置', { exact: false }).click();
  await page.getByRole('button', { name: '预览与校准识别区域', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '识别区域校准' })).toBeVisible();
  await page.screenshot({ path: 'test-results/recognition-calibration.png' });
  await page.getByRole('button', { name: '关闭区域校准' }).click();
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  assert.deepEqual(errors, []);
  await page.evaluate(() =>
    Promise.all([
      window.hexaramRecognition.scan(),
      window.hexaramRecognition.configure({ enabled: false }),
    ]),
  );
  await page.screenshot({ path: 'test-results/recognition-desktop.png' });
  console.log(
    'PASS: actual Windows capture, offline OCR, icon recognition, stable updates, manual correction, LCU observation and sandboxed UI.',
  );
} finally {
  await app.close();
}
