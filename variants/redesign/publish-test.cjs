#!/usr/bin/env node
// Regression test for the production build (CI and release.sh): builds the noindex preview and the
// production site, then checks SEO tags, structured data, links, sitemap/robots, the résumé and
// that every manifest hash matches. Replaces product-launch/publish-test.cjs for the Workshop design.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert/strict');
const http = require('http');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const here = __dirname;
const origin = 'https://portfolio.wasabietech.com';
const { projects } = require('./content.cjs');
const routes = ['/', '/projects/', '/resume/', ...projects.map(p => `/work/${p.slug}/`)];
const rel = route => (route === '/' ? 'index.html' : route.slice(1) + 'index.html');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

execFileSync(process.execPath, [path.join(here, 'publish.cjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(here, 'build.cjs'), 'workshop'], { stdio: 'inherit' });
const site = path.join(here, 'dist', 'site'), preview = path.join(here, 'dist', 'workshop');

assert.ok(!projects.some(p => /hill/i.test(p.slug)), 'Hill’s AI Content Lab was removed from the portfolio');
for (const route of routes) {
  const html = fs.readFileSync(path.join(site, rel(route)), 'utf8');
  assert.match(html, /name="robots" content="index,follow"/, route);
  assert.ok(html.includes(`<link rel="canonical" href="${origin}${route}">`), route);
  assert.ok(html.includes(`<meta property="og:url" content="${origin}${route}">`), route);
  assert.doesNotMatch(html, /href="[^"]*index\.html/, route);
  assert.doesNotMatch(html, /<a\b[^>]*href="https:\/\/portfolio\.wasabietech\.com\//, `${route}: links stay same-origin`);
  if (route !== '/resume/') assert.doesNotMatch(html, /[—–]/, `${route}: no dashes in the copy`); // the résumé source keeps its own typography
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${route}: one h1`);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(ld['@graph'][0].name, 'Hafiz Jamali');
  assert.equal(ld['@graph'][2].url, origin + route);
  const previewHtml = fs.readFileSync(path.join(preview, rel(route)), 'utf8'); // publish.cjs printed the PDF, so the preview has /resume/ too
  assert.match(previewHtml, /content="noindex,nofollow"/, `${route}: preview stays noindex`);
  assert.doesNotMatch(previewHtml, /rel="canonical"/, `${route}: preview has no canonical`);
}

const verification = fs.readFileSync(path.join(here, '../../apps/web/index.html'), 'utf8').match(/<meta\b[^>]*name="google-site-verification"[^>]*>/)[0];
const home = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
assert.ok(home.includes(verification), 'Google Search Console verification lost');
assert.equal((home.match(/data-pick="/g) || []).length, projects.length, 'every project is on the bench');
assert.equal((home.match(/<li class="work-/g) || []).length, projects.length, 'every project is in the work grid');
assert.match(home, /href="resume\/"/, 'homepage links the résumé on this site');
assert.match(home, /data-enquiry/, 'Enquiry form present');

const theoses = fs.readFileSync(path.join(site, 'work/theoses/index.html'), 'utf8');
assert.match(theoses, /built on the pi coding agent/, 'Theoses is described as a fork of pi');
for (const p of projects.filter(p => p.slug !== 'map')) {
  assert.match(fs.readFileSync(path.join(site, `work/${p.slug}/index.html`), 'utf8'), /data-demo=/, `${p.slug}: playable demo`);
}

const sitemap = fs.readFileSync(path.join(site, 'sitemap.xml'), 'utf8');
assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]), routes.map(r => origin + r));
assert.match(sitemap, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
const robots = fs.readFileSync(path.join(site, 'robots.txt'), 'utf8');
assert.match(robots, /Allow: \/\n/);
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));

const manifest = JSON.parse(fs.readFileSync(path.join(site, 'runtime-manifest.json'), 'utf8'));
const listed = new Set(manifest.map(e => e.file));
for (const route of routes) assert.ok(listed.has(rel(route)), `manifest lists ${rel(route)}`);
for (const f of ['favicon.svg', 'robots.txt', 'sitemap.xml', 'llms.txt', 'static/main.js', 'static/style.css', 'static/workshop.glb', 'static/poster.webp', 'resume/Resume-Hafiz-Jamali.pdf']) assert.ok(listed.has(f), `manifest lists ${f}`);
for (const e of manifest) {
  assert.equal(hash(fs.readFileSync(path.join(site, e.file))), e.sha256, e.file);
  assert.doesNotMatch(e.file, /^(assets\/|\.impeccable|evidence|FICTIONAL|.*\.cjs$)/, `${e.file}: no source or reserved paths`);
}

assert.deepEqual(fs.readFileSync(path.join(site, 'resume/Resume-Hafiz-Jamali.pdf')), fs.readFileSync(path.join(here, '../../resume/Resume-Hafiz-Jamali.pdf')));
const reader = fs.readFileSync(path.join(site, 'resume/index.html'), 'utf8');
assert.match(reader, /MAP — Android Productivity App/);
assert.doesNotMatch(reader, /<iframe|<object|<embed/);
// Enquiry form at phone width with the API reply faked in the browser: what the visitor sees, and what is sent.
async function enquiryChecks(browser, url) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  let requests = [], reply = { status: 200, body: '{"ok":true}' };
  await page.route('**/api/contact', route => {
    requests.push(route.request().postDataJSON());
    if (!reply) return route.abort();
    route.fulfill({ status: reply.status, contentType: 'application/json', body: reply.body });
  });
  const visible = sel => page.locator(sel).first().isVisible();
  const fill = async (name, email) => {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.check('[name=need] >> nth=0');
    await page.check('[name=people] >> nth=1');
    await page.fill('[name=today]', 'Orders live in three spreadsheets');
    await page.fill('[name=name]', name);
    await page.fill('[name=email]', email);
    requests = [];
  };
  const submit = () => page.click('[data-enquiry-send]');

  for (const [missing, name, email] of [['name', '', 'ada@example.com'], ['email', 'Ada', ''], ['email', 'Ada', 'not-an-email']]) {
    await fill(name, email);
    await submit();
    assert.ok(await visible(`[data-error=${missing}]`), `Enquiry form: ${missing} error shows for "${name}" / "${email}"`);
    assert.equal(await page.evaluate(() => document.activeElement.name), missing, 'Enquiry form: focus moves to the invalid field');
    assert.equal(requests.length, 0, 'Enquiry form: nothing is sent while a field is invalid');
  }

  await fill('Ada Lovelace', 'ada@example.com');
  await submit();
  await page.waitForSelector('[data-enquiry-sent]:not([hidden])');
  assert.equal(await page.locator('[data-enquiry-sent]').textContent(), "Sent. I'll reply to ada@example.com within two working days.");
  assert.ok(!(await visible('[data-enquiry]')), 'Enquiry form: the form is replaced by the confirmation');
  assert.equal(requests.length, 1);
  assert.deepEqual({ ...requests[0], message: undefined }, { name: 'Ada Lovelace', email: 'ada@example.com', website: '', message: undefined });
  assert.match(requests[0].message, /^What I need: .+\nPeople who would use it: 2 to 10\nHow it works today:\nOrders live in three spreadsheets$/);

  for (const [what, r] of [['429', { status: 429, body: '{"error":"Too many messages"}' }], ['500', { status: 500, body: '{}' }], ['a network failure', null]]) {
    reply = r;
    await fill('Ada Lovelace', 'ada@example.com');
    await submit();
    await page.waitForSelector('[data-enquiry-failed]:not([hidden])');
    assert.ok(await visible('[data-enquiry-failure]') && (await page.locator('[data-enquiry-failure]').textContent()).length > 10, `Enquiry form: ${what} explains the failure`);
    const mail = new URL(await page.getAttribute('[data-enquiry-mail]', 'href'));
    assert.equal(mail.protocol, 'mailto:');
    const body = mail.searchParams.get('body');
    for (const answer of ['Orders live in three spreadsheets', 'Ada Lovelace', 'ada@example.com', '2 to 10']) assert.ok(body.includes(answer), `Enquiry form: ${what} fallback mail has "${answer}"`);
    assert.ok(!(await page.locator('[data-enquiry-send]').isDisabled()), `Enquiry form: the button works again after ${what}`);
  }
  await page.close();
}
// Browser step: serve the production build locally and check the layout where a phone would see it.
async function browserChecks() {
  const server = http.createServer((req, res) => {
    const file = path.join(site, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
    if (!file.startsWith(site) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(file)] || 'application/octet-stream' }).end(fs.readFileSync(file)); // module scripts need a JavaScript type
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const width of [360, 390, 430]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
      await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `/: no sideways scroll at ${width}px`);
      assert.ok(await page.evaluate(() => { // About on phones: the open Chapter's caption sits below its image, never over it
        const open = document.querySelector('.chapter.is-open, .chapter');
        return open.querySelector('.chapter-panel').getBoundingClientRect().top >= open.querySelector('.chapter-view img').getBoundingClientRect().bottom - 0.5;
      }), `/: About caption sits below the image at ${width}px`);
      assert.ok(await page.evaluate(() => !document.querySelector('#about .hiring') && document.querySelectorAll('#contact a[href^="mailto:"]:not(.enquiry-failed a)').length === 1 && !!document.querySelector('#contact .hiring a[href$="resume/"]')), `/: Contact has the Hiring line and one email, About has no Hiring line at ${width}px`);
      await page.close();
    }
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await desktop.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' });
    assert.ok(await desktop.evaluate(() => { // About on desktop: the open Background Chapter's caption sits beside its portrait, not over it
      const open = document.querySelector('.chapter.is-open');
      return open.querySelector('.chapter-panel').getBoundingClientRect().left >= open.querySelector('.portrait').getBoundingClientRect().right - 0.5;
    }), '/: About caption sits beside the portrait at 1440px');
    await desktop.close();
    await enquiryChecks(browser, `http://127.0.0.1:${server.address().port}/`);
  } finally {
    await browser.close();
    server.close();
  }
}

console.log(`PASS publication regression: ${routes.length} indexable canonical pages with valid JSON-LD; same-origin links; sitemap/robots; ${manifest.length} manifest hashes; demos, Enquiry form and résumé present; preview stays noindex`);
browserChecks().then(() => console.log('PASS browser step: on the production build the About caption sits below its image (beside the portrait on desktop), Contact has the Hiring line and one email, and nothing scrolls sideways at 360, 390 and 430px; the Enquiry form sends, validates and falls back to the mail app when sending fails'));
