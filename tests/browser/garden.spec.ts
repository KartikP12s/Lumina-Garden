import { expect, test } from '@playwright/test';

test('click-to-plant grows through stages, enforces five plants, and renders without shader errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.locator('#loading')).toHaveCount(0);
  await expect(page.locator('.plant-card')).toHaveCount(3);
  await page.locator('#clear').click();
  await page.locator('#seed').fill('same-seed');
  const canvas = page.locator('#viewport canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Canvas missing');
  // The lower-middle canvas is unobstructed soil in the default camera view.
  await canvas.click({ position: { x: bounds.width * 0.5, y: bounds.height * 0.61 } });
  await expect(page.locator('.plant-card')).toHaveCount(1);
  await expect(page.locator('#specimen')).toContainText('Sprout');
  await expect(page.locator('#specimen')).toContainText('Stem', { timeout: 5000 });
  await expect(page.locator('#specimen')).toContainText('Branches', { timeout: 5000 });
  await expect(page.locator('#specimen')).toContainText('Leaves', { timeout: 5000 });
  await expect(page.locator('#specimen')).toContainText('Mature', { timeout: 10000 });
  const firstSeed = await page.evaluate(() => (window as any).__lumina.seeds[0]);
  await page.locator('#clear').click();
  await page.locator('#plant').click();
  expect(await page.evaluate(() => (window as any).__lumina.seeds[0])).toBe(firstSeed);
  for (let i = 1; i < 5; i++) await page.locator('#plant').click();
  await expect(page.locator('.plant-card')).toHaveCount(5);
  await expect(page.locator('#plant')).toBeDisabled();
  await expect(page.locator('#plant-count')).toHaveText('5 / 5');
  await page.locator('#bloom').uncheck();
  expect(await page.evaluate(() => (window as any).__lumina.bloomEnabled)).toBe(false);
  await page.locator('#bloom').check();
  await page.locator('#lights').uncheck();
  await page.locator('#lights').check();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('orbit drags do not plant and benchmark can be cancelled cleanly', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loading')).toHaveCount(0);
  const box = await page.locator('#viewport canvas').boundingBox();
  if (!box) throw new Error('Canvas missing');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 20, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('.plant-card')).toHaveCount(3);
  await page.locator('#lab summary').click();
  await page.locator('#benchmark').click();
  await expect(page.locator('#plant')).toBeDisabled();
  await page.locator('#stop').click();
  await expect(page.locator('#benchmark')).toBeEnabled();
  await expect(page.locator('#download')).toBeDisabled();
});

test('WebGL2 failure displays useful instructions', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (id: any, ...args: any[]) {
      return id === 'webgl2' ? null : (original as any).call(this, id, ...args);
    } as any;
  });
  await page.goto('/');
  await expect(page.locator('#loading')).toContainText('WebGL2 is unavailable');
  await expect(page.locator('#plant')).toBeDisabled();
});
