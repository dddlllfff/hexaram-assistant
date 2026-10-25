import { _electron as electron } from '@playwright/test';
import assert from 'node:assert/strict';
import path from 'node:path';
const env = { ...process.env, HEXARAM_DEV: '0' };
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({
  ...(process.env.HEXARAM_EXECUTABLE ? { executablePath: process.env.HEXARAM_EXECUTABLE } : {}),
  args: [
    ...(process.env.HEXARAM_EXECUTABLE ? [] : ['.']),
    `--user-data-dir=${path.resolve('test-results', `electron-profile-${Date.now()}`)}`,
  ],
  env,
});
try {
  const page = await app.firstWindow();
  await page.waitForSelector('h1');
  assert.ok((await page.title()).includes('HexARAM'));
  await page.getByRole('button', { name: '添加候选珠光护手', exact: true }).click();
  await page.getByRole('button', { name: '我选这个', exact: true }).click();
  await page.getByRole('heading', { name: '技能暴击', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/windows-desktop.png' });
  console.log(
    'PASS: Windows Electron launch, local files, recommendation interaction, isolated renderer.',
  );
} finally {
  await app.close();
}
