/** Capture the compiled alpha and genuine performance evidence. */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const root = 'docs/alpha';
await mkdir(`${root}/evidence`, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1120 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async name => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${root}/evidence/${name}.png`, fullPage: true });
};
const canvasShot = async name => page.locator('#viewport canvas').screenshot({ path: `${root}/evidence/${name}.png` });
const slider = async (id, value) => page.locator(id).evaluate((input, v) => { input.value = v; input.dispatchEvent(new Event('input', { bubbles: true })); }, value);
try {
  await page.goto(process.env.LUMINA_URL || 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__lumina));
  await shot('menu');
  await page.locator('#start-garden').click();
  await slider('#wind', '0');
  await page.locator('#plant').click();
  console.log('Capturing real growth stages.');
  await page.waitForTimeout(400); await canvasShot('growth-sprout');
  await page.waitForTimeout(1500); await canvasShot('growth-stem');
  await page.waitForTimeout(2300); await canvasShot('growth-branches');
  await page.waitForTimeout(2200); await canvasShot('growth-leaves');
  await page.waitForFunction(() => window.__lumina.growingCount === 0);
  await canvasShot('growth-mature');
  await slider('#wind', '0.7');
  await slider('#daylight', '0.15');
  await page.locator('#lab summary').click();
  await page.locator('#benchmark').click();
  console.log('Benchmark started: wind 70%, daylight 15%, bloom enabled.');
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(10000);
    console.log(JSON.stringify(await page.evaluate(() => ({ plants: window.__lumina.plantCount, completed: window.__lumina.benchmark?.results.length, busy: window.__lumina.busy }))));
  }
  await page.waitForFunction(() => !window.__lumina.busy);
  const result = await page.evaluate(() => window.__lumina.benchmark);
  if (result?.results.length !== 3) throw new Error('Incomplete alpha benchmark');
  await writeFile(`${root}/benchmark-results.json`, JSON.stringify(result, null, 2) + '\n');
  await shot('benchmark');
  await page.locator('#lab summary').click();
  await slider('#daylight', '0'); await shot('alpha-night'); await canvasShot('night');
  await slider('#daylight', '1'); await shot('alpha-day'); await canvasShot('day');
  await slider('#daylight', '0.15');
  await slider('#wind', '0'); await page.waitForTimeout(100); await canvasShot('wind-still');
  await slider('#wind', '1'); await page.waitForTimeout(900); await canvasShot('wind-moving');
  await page.locator('#bloom').uncheck(); await canvasShot('bloom-off');
  await page.locator('#bloom').check(); await canvasShot('bloom-on');
  await page.locator('#finish').click(); await shot('complete');
  await page.locator('#restart-garden').click();
  if (await page.evaluate(() => window.__lumina.plantCount) !== 0) throw new Error('Restart left plants behind');
  await writeFile(`${root}/browser-errors.json`, JSON.stringify(errors, null, 2) + '\n');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Saved alpha screenshots and measured benchmark; restart verified.');
  console.log(JSON.stringify(result.results, null, 2));
} finally { await browser.close(); }
