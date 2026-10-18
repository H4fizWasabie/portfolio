#!/usr/bin/env node
// Renders poster.webp and poster-phone.webp (first paint and the no-WebGL fallback) from the built Workshop page,
// so they always match house.glb: the hero of the House at the wide and the phone framing the live page uses.
// Usage: CHROME=/path/to/chrome node render-stills.cjs <url of built workshop homepage>
// The project thumbnails (thumb-*.webp) come from the old room model and are not rendered here any more; they
// return with the Rooms (see the House tickets).
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const path = require('path');

const url = process.argv[2];
if (!url || !process.env.CHROME) throw new Error('usage: CHROME=... node render-stills.cjs <url>');

// still param, output file, viewport and device scale: the poster fills the screen exactly as the live canvas does.
const shots = [['poster', 'poster.webp', 1600, 1000, 1], ['poster-phone', 'poster-phone.webp', 390, 844, 2]];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [still, file, width, height, scale] of shots) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale, colorScheme: 'light' });
    await page.goto(`${url}?still=${still}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('html[data-ready]', { state: 'attached', timeout: 60000 });
    await page.waitForTimeout(500);
    const png = path.join(__dirname, `${still}.png`);
    await page.locator('canvas').screenshot({ path: png });
    execFileSync('python3', ['-I', '-c', 'import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], "WEBP", quality=80, method=6)', png, path.join(__dirname, file)]);
    execFileSync('rm', [png]);
    console.log('rendered', file);
    await page.close();
  }
  await browser.close();
})();
