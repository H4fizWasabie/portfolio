#!/usr/bin/env node
// Renders poster.webp (no-WebGL fallback and first paint) and a day and a night thumbnail per
// project from the built Workshop page, so stills always match workshop.glb.
// Usage: CHROME=/path/to/chrome node render-stills.cjs <url of built workshop homepage> [night]
// ("night" renders only the night thumbnails, "poster" only the poster). The poster keeps a
// transparent background, so the room sits on the page's sky in day and night.
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const path = require('path');
const { projects } = require('../../content.cjs');

const url = process.argv[2];
if (!url || !process.env.CHROME) throw new Error('usage: CHROME=... node render-stills.cjs <url>');

const night = projects.map(p => [p.slug, 640, 480, true]);
const shots = process.argv[3] === 'night' ? night : process.argv[3] === 'poster' ? [['poster', 1600, 1200]] : [['poster', 1600, 1200], ...projects.map(p => [p.slug, 640, 480]), ...night];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [still, width, height, dark] of shots) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, colorScheme: 'light' });
    await page.goto(`${url}?still=${still}${dark ? '&night=1' : ''}`, { waitUntil: 'networkidle' });
    if (still === 'poster') await page.addStyleTag({ content: 'html,body,.sky{background:none!important}' });
    await page.waitForSelector('html[data-ready]', { state: 'attached', timeout: 60000 });
    await page.waitForTimeout(500);
    const png = path.join(__dirname, `${still}${dark ? '-night' : ''}.png`);
    await page.locator('canvas').screenshot({ path: png, omitBackground: still === 'poster' });
    const out = path.join(__dirname, still === 'poster' ? 'poster.webp' : `thumb-${still}${dark ? '-night' : ''}.webp`);
    execFileSync('python3', ['-c', 'import sys; from PIL import Image; Image.open(sys.argv[1]).save(sys.argv[2], "WEBP", quality=82, method=6)', png, out]);
    execFileSync('rm', [png]);
    console.log('rendered', path.basename(out));
    await page.close();
  }
  await browser.close();
})();
