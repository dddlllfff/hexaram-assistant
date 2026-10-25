import { test, expect } from '@playwright/test';
test('minimum Windows window has no horizontal overflow or runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '灼烧消耗', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('selecting augments updates a route, inventory and session survive reload', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '灼烧消耗', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '添加候选珠光护手', exact: true }).click();
  await expect(page.getByRole('heading', { name: '灼烧消耗', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '我选这个', exact: true }).click();
  await expect(page.getByRole('heading', { name: '技能暴击', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '标记拥有卢登的回声', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: '技能暴击', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '取消拥有卢登的回声', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '移除已选珠光护手', exact: true }).click();
  await expect(page.getByRole('heading', { name: '灼烧消耗', exact: true })).toBeVisible();
});
test('hero filters, reset and level 18 state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: '搜索英雄' }).fill('Leona');
  await page.getByRole('button', { name: /曙 蕾欧娜/ }).click();
  await expect(page.getByRole('heading', { name: '控制前排', exact: true })).toBeVisible();
  await page.getByLabel('当前等级').selectOption('18');
  await expect(page.getByText('已达 18 级', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '开始新一局', exact: true }).click();
  await page.getByRole('button', { name: '清空并开始', exact: true }).click();
  await expect(page.getByLabel('当前等级')).toHaveValue('3');
});
test('max three candidates, choose actual result, threat and export', async ({ page }) => {
  await page.goto('/');
  for (const name of ['珠光护手', '炼狱导管', '捐赠'])
    await page.getByRole('button', { name: `添加候选${name}`, exact: true }).click();
  await page.getByRole('button', { name: '添加候选无限循环往复', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('候选区已满');
  await expect(page.locator('.candidate-card')).toHaveCount(3);
  await page
    .locator('.candidate-card')
    .filter({ has: page.getByRole('heading', { name: '捐赠', exact: true }) })
    .getByRole('button', { name: '我选这个' })
    .click();
  await expect(page.locator('.selected-list')).toContainText('捐赠');
  await expect(page.locator('.candidate-card')).toHaveCount(0);
  await page.getByLabel('敌方主要压力').selectOption('healing');
  await expect(page.locator('.adaptation')).toContainText('莫雷洛秘典');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出本局方案' }).click();
  expect((await download).suggestedFilename()).toBe('HexARAM-Brand.txt');
});
test('full roster supports Chinese aliases and special skill modes', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('textbox', { name: '搜索英雄' });
  await search.fill('杰斯');
  await page.getByRole('button', { name: /杰斯/ }).click();
  await expect(
    page.getByText('杰斯 R 自动升级，Q/W/E 各可升 6 级；不手动点 R。', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.skill-grid strong').filter({ hasText: /^R$/ })).toHaveCount(0);
  await search.fill('厄斐琉斯');
  await page.getByRole('button', { name: /厄斐琉斯/ }).click();
  await expect(page.getByText('查看特殊加点说明', { exact: true })).toBeVisible();
  await expect(page.locator('.skill-grid strong')).toHaveCount(0);
  await search.fill('luoke');
  await page.getByRole('button', { name: /洛克/ }).click();
  await expect(page.getByRole('heading', { name: '法术切入', exact: true })).toBeVisible();
});
