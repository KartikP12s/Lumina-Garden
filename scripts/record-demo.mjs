/** Capture the actual browser in real time, including the live stress test. */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('artifacts');
await mkdir(output, { recursive: true });
await mkdir('docs', { recursive: true });
const baseURL = process.env.LUMINA_URL || 'http://127.0.0.1:4173';
let server;
let browser;
let context;
const errors = [];
try {
  if (!process.env.LUMINA_URL) {
    server = spawn('npm', ['run', 'preview', '--', '--port', '4173', '--strictPort'], { stdio: 'pipe' });
    server.stderr.on('data', data => process.stderr.write(data));
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { ready = (await fetch(baseURL)).ok; } catch { /* Wait for our preview server. */ }
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!ready) throw new Error('Preview server did not start. Build the app first.');
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  context = await browser.newContext({
    viewport: { width: 1440, height: 1167 }, deviceScaleFactor: 1,
    recordVideo: { dir: output, size: { width: 1440, height: 1080 } },
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__lumina));
  await page.locator('#start-garden').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'docs/alpha/recording-preview.png', fullPage: true });
  console.log('Garden loaded; capturing a real click and nine-second growth.');
  await page.locator('#clear').click();
  await page.locator('#seed').fill('2026');
  const bounds = await page.locator('#viewport canvas').boundingBox();
  if (!bounds) throw new Error('Garden canvas missing');
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.61);
  await page.waitForTimeout(1500);
  await page.mouse.click(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.61);
  await page.waitForTimeout(9500);
  await page.locator('#lab summary').click();
  await page.locator('#tour').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  console.log('Guided demo running: 150 seconds, with explanation overlays and 1/3/5-plant stress test.');
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(10000);
    const state = await page.evaluate(() => ({ plants: window.__lumina.plantCount, results: window.__lumina.benchmark?.results.length ?? 0 }));
    console.log(`Demo ${String((i + 1) * 10).padStart(3)}s: ${state.plants} plants, ${state.results} benchmark levels recorded.`);
    if (i === 13) await page.screenshot({ path: path.join(output, 'benchmark-screen.png') });
  }
  await page.waitForFunction(() => !window.__lumina.busy, { timeout: 10000 });
  const report = await page.evaluate(() => window.__lumina.benchmark);
  if (!report || report.results.length !== 3) throw new Error('Incomplete benchmark');
  await writeFile('docs/alpha/benchmark-results.json', JSON.stringify(report, null, 2) + '\n');
  await writeFile(path.join(output, 'browser-errors.json'), JSON.stringify(errors, null, 2) + '\n');
  const video = page.video();
  await context.close(); context = undefined;
  const recorded = await video.path();
  await rename(recorded, path.join(output, 'LuminaGarden-Assignment3-Demo.webm'));
  console.log('Saved artifacts/LuminaGarden-Assignment3-Demo.webm and docs/alpha/benchmark-results.json');
  console.log(JSON.stringify(report.results, null, 2));
  if (errors.length) throw new Error(`Browser errors were recorded: ${errors.join('; ')}`);
} finally {
  await context?.close();
  await browser?.close();
  server?.kill('SIGTERM');
}
