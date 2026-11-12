#!/usr/bin/env node
// Non-mutating checks against the served site (release.sh runs this after switching `current`
// and rolls back if it fails). BASE_URL defaults to the public origin.
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright-core');

const base = (process.env.BASE_URL || 'https://portfolio.wasabietech.com').replace(/\/$/, '');
const origin = 'https://portfolio.wasabietech.com';
const site = process.env.BUILD_ROOT || path.join(__dirname, 'dist', 'site');
const { projects } = require('./content.cjs');
const routes = ['/', '/projects/', '/resume/', ...projects.map(p => `/work/${p.slug}/`)];
const made = projects.filter(p => p.register); // the systems in production: a Sheet each on the homepage, with a Sample demo
let browser;

// The Case File's Sample demos run in the page and send nothing, so driving one stays non-mutating.
const button = (page, id, name) => page.locator(`#${id}`).getByRole('button', { name });
async function procuraDemo(page) {
  await page.getByRole('button', { name: 'One fewer Gauze swab 10×10' }).click({ clickCount: 2 }); // 51, reorder at 50
  await button(page, 'procura', 'Draft purchase order').click();
  await page.waitForFunction(() => document.querySelector('#procura .foot .stamp')?.textContent === 'Drafted');
}

(async () => {
  for (const route of routes) {
    const res = await fetch(base + route, { headers: { 'user-agent': 'Googlebot' }, redirect: 'manual' });
    assert.equal(res.status, 200, route);
    assert.doesNotMatch(res.headers.get('x-robots-tag') || '', /noindex/i, route);
    const html = await res.text();
    assert.ok(html.includes(`<link rel="canonical" href="${origin}${route}">`), route);
    assert.match(html, /name="robots" content="index,follow"/, route);
    if (route === '/') assert.ok(html.includes(fs.readFileSync(path.join(__dirname, '../../apps/web/index.html'), 'utf8').match(/<meta\b[^>]*name="google-site-verification"[^>]*>/)[0]), 'Search Console verification missing');
    if (route === '/') {
      assert.match(html, /name="portfolio-surface" content="casefile"/, 'the homepage is the Case File');
      for (const p of made) assert.ok(html.includes(`id="${p.slug}"`) && html.includes(`href="#${p.slug}"`), `/: ${p.slug} has a Sheet and the Register links to it`);
    }
    if (route === '/work/cavelms/') {
      assert.match(html, /CaveText/, route);
      assert.match(html, /href="https:\/\/chromewebstore\.google\.com\/detail\/cavetext\//, `${route} links the Chrome Web Store listing`);
    }
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(ld['@graph'][2].url, origin + route);
    const alias = await fetch(base + route + 'index.html', { redirect: 'manual' });
    assert.equal(alias.status, 308, route + 'index.html');
    assert.equal(new URL(alias.headers.get('location'), base).pathname, route);
  }
  console.log(`PASS public crawl: ${routes.length} indexable canonical pages; JSON-LD; index.html aliases redirect`);

  for (const [from, to] of [['/variant-product-launch', '/'], ['/variant-product-launch/', '/'], ['/work/map', '/work/map/'], ['/resume', '/resume/']]) {
    const res = await fetch(base + from, { redirect: 'manual' });
    assert.equal(res.status, 308, from);
    assert.equal(new URL(res.headers.get('location'), base).pathname, to, from);
  }
  const archived = await fetch(base + '/variant-alpha/');
  assert.equal(archived.status, 200);
  assert.match(archived.headers.get('x-robots-tag') || '', /noindex/i);
  const robots = await (await fetch(base + '/robots.txt')).text();
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]), routes.map(r => origin + r));
  for (const url of ['/this-page-does-not-exist', '/work/hills-ai-content-lab/', '/projects.cjs', '/publish.cjs', '/FICTIONAL-FIXTURES.json']) {
    assert.equal((await fetch(base + url)).status, 404, url);
  }
  console.log('PASS discovery: redirects, archived previews noindex, robots/sitemap, removed and source paths 404');

  const manifest = JSON.parse(fs.readFileSync(path.join(site, 'runtime-manifest.json'), 'utf8'));
  for (const e of manifest) {
    const res = await fetch(base + '/' + e.file);
    assert.equal(res.status, 200, e.file);
    assert.equal(crypto.createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex'), e.sha256, e.file);
  }
  const pdf = await fetch(base + '/resume/Resume-Hafiz-Jamali.pdf');
  assert.match(pdf.headers.get('content-type') || '', /application\/pdf/);
  const legacy = '/var/www/portfolio/apps/web/dist';
  const movie = fs.existsSync(legacy) && fs.readdirSync(legacy).filter(n => n.endsWith('.mp4')).sort().at(-1);
  if (movie) assert.equal((await fetch(base + '/' + movie, { method: 'HEAD' })).status, 200, movie);
  console.log(`PASS files: all ${manifest.length} served files match the manifest; résumé PDF and legacy video served`);

  // Rejected before saving, counting or alerting, so this stays non-mutating. Needs the API released first (resume/DEPLOYMENT.md, "API release").
  const overlong = await fetch(base + '/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'verify-public', email: 'verify@example.com', message: 'x'.repeat(5001) }) });
  assert.equal(overlong.status, 400, 'over-long Enquiry is rejected');
  console.log('PASS api: over-long Enquiry gets 400');

  browser = await chromium.launch({ executablePath: process.env.CHROME || '/home/theoses/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const route of routes) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('h1').count(), 1, route);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: no sideways scroll at ${width}px`);
      if (route === '/') {
        assert.equal(await page.locator('meta[name="portfolio-surface"]').getAttribute('content'), 'casefile');
        assert.equal(await page.locator('main section.sheet').count(), 1 + made.length + 3, 'first Sheet, one per system, continuation, Particulars, Request form');
        for (const p of made) {
          assert.ok(await page.locator(`#${p.slug}`).isVisible(), `${p.slug} Sheet shows`);
          assert.equal(await page.locator(`.register a[href="#${p.slug}"]`).count(), 1, `the Register links ${p.slug}`);
        }
        assert.equal(await page.locator('canvas').count(), 0, 'no canvas: the House is gone');
        for (const [id, name] of [['pims', 'Approve request'], ['dd-drugs-register', 'Submit count'], ['procura', 'Draft purchase order'], ['cavelms', 'Submit exam']]) {
          assert.ok(await button(page, id, name).isVisible(), `${id}: the Sample demo has its control`);
        }
        assert.deepEqual(await page.locator('.lift-btn').allTextContents(), Array(2).fill('See the paper process underneath'), 'PIMS and Procura offer to lift the top sheet, and say what is underneath');
        assert.ok(await page.locator('#pims .hint').isVisible() && await page.locator('#dd-drugs-register .hint').isVisible(), 'the PIMS and DD demos say how to play');
        for (const p of made) assert.equal(await page.locator(`#${p.slug} .btn.primary[href="#request"]`).count(), 1, `${p.slug}: the Request is the Sheet's one filled button`);
        assert.equal(await page.locator('#pims .more-rows').isVisible(), width === 390, 'the homepage slips show two sample lines on phones only');
        await procuraDemo(page);
        await page.locator('#procura a[href$="work/procura/"]').first().click();
        await page.waitForURL(base + '/work/procura/');
      }
      if (route === '/work/procura/') {
        await procuraDemo(page);
      }
      if (route === '/work/cavelms/') {
        assert.ok(await button(page, 'cavelms', 'Submit exam').isVisible(), 'CaveLMS: the Sample exam has its control');
        assert.ok(await page.getByText('Attached: CaveText').isVisible(), 'CaveText is attached to the CaveLMS Sheet');
      }
      if (route === '/work/map/') {
        await page.locator('[role=tab]').nth(3).click();
        await page.waitForFunction(() => [...document.querySelectorAll('[role=tabpanel]')].some(p => !p.hidden && p.querySelector('img')?.naturalWidth === 1152));
      }
      if (route === '/resume/') {
        assert.match(await page.locator('.resume-paper').innerText(), /MAP — Android Productivity App/);
      }
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS browser ${width}px: every route renders one h1 without overflow or errors; the Record of work, its Sheets and Sample demos, /work/cavelms/, MAP gallery and résumé work`);
  }
  await browser.close();
  console.log('PASS public verification complete');
})().catch(async e => { console.error(e); await browser?.close(); process.exitCode = 1; });
