#!/usr/bin/env node
// Regression test for the production build (CI and release.sh): builds the noindex preview and the
// production site (the Case File), then checks SEO tags, structured data, links, sitemap/robots, llms.txt,
// the résumé and that every manifest hash matches; and drives the production site in a real browser
// (reading without JavaScript, the four Sample demos and the lift at phone width, the Request form with
// the contact API faked, no overflow, no request to another host).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert/strict');
const http = require('http');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const here = __dirname;
const origin = 'https://portfolio.wasabietech.com';
const { projects, site: words, esc } = require('./content.cjs');
const routes = ['/', '/projects/', '/resume/', ...projects.map(p => `/work/${p.slug}/`)];
const rel = route => (route === '/' ? 'index.html' : route.slice(1) + 'index.html');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const norm = s => s.replace(/\s+/g, ' ').trim();
const made = projects.filter(p => p.register); // the systems in production, each with a Sheet on the homepage
const rest = projects.filter(p => !p.register); // the continuation Sheet
const cave = made.find(p => p.slug === 'cavelms');

execFileSync(process.execPath, [path.join(here, 'publish.cjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(here, 'build.cjs'), 'casefile'], { stdio: 'inherit' });
const site = path.join(here, 'dist', 'site'), preview = path.join(here, 'dist', 'casefile');

assert.ok(!projects.some(p => /hill/i.test(p.slug)), 'Hill’s AI Content Lab was removed from the portfolio');
assert.deepEqual(projects.map(p => p.slug), ['pims', 'dd-drugs-register', 'procura', 'cavelms', 'theoses', '89lab', 'map', 'yen'], 'project order');
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
assert.match(home, /name="portfolio-surface" content="casefile"/, 'the homepage is the Case File');
assert.match(home, /href="resume\/"/, 'homepage links the résumé on this site');
assert.match(home, /<form[^>]*action="mailto:[^"]*"[^>]*data-request|<form[^>]*data-request[^>]*action="mailto:/, 'the Request form falls back to the mail app');
assert.doesNotMatch(home, /house|\[data-stop\]|data-enquiry|<canvas/i, '/: nothing of the House or the old Enquiry form remains');

// Every project is on the homepage: the systems in production on a Sheet of their own, the rest on the continuation Sheet.
for (const p of made) assert.ok(home.includes(`id="${p.slug}"`) && home.includes(`href="#${p.slug}"`), `/: ${p.slug} has a Sheet and the Register links to it`);
for (const p of rest) assert.ok(home.includes(`href="work/${p.slug}/"`), `/: the continuation Sheet links ${p.slug}`);
// The homepage HTML holds the short version of every Sheet, so search engines and visitors without JavaScript read it. The long version
// (problem, the full account, how it works, limits, stack, screens, Under the hood) is on /work/<slug>/ and only there.
const firstSentence = s => s.match(/^.*?\.(?=\s|$)/)[0];
const sheetWords = [
  words.statement, words.hiring, words.formSub, words.replaces, words.where, words.requestTitle, words.requestSub, ...words.particulars.map(r => r[1]),
  ...made.flatMap(p => [p.title, p.category, p.register.note, p.register.was, p.register.now, p.summary, ...(p.facts || []), ...(p.cavetext ? [firstSentence(p.cavetext.built)] : [])]),
  ...rest.flatMap(p => [p.title, p.entry])
].filter(Boolean);
for (const text of sheetWords) assert.ok(home.includes(esc(text)), `/: the homepage says "${text}"`);
assert.equal(firstSentence(cave.cavetext.built), 'A Chrome extension built for The Cave Consult and published under their name.', 'CaveText is one line on the homepage');
const pageOnlyWords = made.flatMap(p => [p.problem, p.built, p.limits, p.implementation, ...p.workflow, ...p.stack.filter(s => s.length > 4), ...(p.cavetext ? [p.cavetext.built, p.cavetext.limits, ...p.cavetext.workflow, ...p.cavetext.stack] : [])]).filter(Boolean);
for (const text of pageOnlyWords) assert.ok(!home.includes(esc(text)), `/: the homepage leaves "${text.slice(0, 50)}" to the project page`);
for (const p of made) for (const [, file] of p.scenes) assert.ok(!home.includes(`static/${file}`), `/: the ${file} screen is on the project page only`);
assert.doesNotMatch(home, /Under the hood|class="shot"|class="chips"/, '/: no screens, stack or implementation notes on the homepage');
assert.equal((home.match(/<section class="sheet /g) || []).length, 1 + made.length + 1 + 1 + 1, '/: first Sheet, one Sheet per system, continuation, Particulars, Request form');
assert.doesNotMatch(home, /lift-btn|class="again"|class="hint"/, '/: no demo controls or instructions are printed (forms.js adds them)');

const caveText = fs.readFileSync(path.join(site, 'work/cavelms/index.html'), 'utf8');
assert.match(caveText, /CaveText/, '/work/cavelms/ carries CaveText');
assert.match(caveText, /href="https:\/\/chromewebstore\.google\.com\/detail\/cavetext\//, '/work/cavelms/ links the Chrome Web Store listing');
const theoses = fs.readFileSync(path.join(site, 'work/theoses/index.html'), 'utf8');
assert.match(theoses, /built on the pi coding agent/, 'Theoses is described as a fork of pi');

const sitemap = fs.readFileSync(path.join(site, 'sitemap.xml'), 'utf8');
assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]), routes.map(r => origin + r));
assert.match(sitemap, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
const robots = fs.readFileSync(path.join(site, 'robots.txt'), 'utf8');
assert.match(robots, /Allow: \/\n/);
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
const llms = fs.readFileSync(path.join(site, 'llms.txt'), 'utf8');
for (const p of projects) assert.ok(llms.includes(`- [${p.title}](${origin}/work/${p.slug}/): ${p.description}`), `llms.txt lists ${p.slug}`);

const manifest = JSON.parse(fs.readFileSync(path.join(site, 'runtime-manifest.json'), 'utf8'));
const listed = new Set(manifest.map(e => e.file));
for (const route of routes) assert.ok(listed.has(rel(route)), `manifest lists ${rel(route)}`);
for (const f of ['favicon.svg', 'robots.txt', 'sitemap.xml', 'llms.txt', 'static/main.js', 'static/style.css', 'static/archivo-latin-wdth-normal.woff2', 'static/courier-prime-latin-400-normal.woff2', 'static/courier-prime-latin-700-normal.woff2', 'static/OFL-archivo.txt', 'static/OFL-courier-prime.txt', 'static/hafiz-portrait.webp', 'resume/Resume-Hafiz-Jamali.pdf']) assert.ok(listed.has(f), `manifest lists ${f}`);
for (const e of manifest) {
  assert.equal(hash(fs.readFileSync(path.join(site, e.file))), e.sha256, e.file);
  assert.doesNotMatch(e.file, /^(assets\/|\.impeccable|evidence|FICTIONAL|.*\.cjs$)/, `${e.file}: no source or reserved paths`);
}

assert.deepEqual(fs.readFileSync(path.join(site, 'resume/Resume-Hafiz-Jamali.pdf')), fs.readFileSync(path.join(here, '../../resume/Resume-Hafiz-Jamali.pdf')));
const reader = fs.readFileSync(path.join(site, 'resume/index.html'), 'utf8');
assert.match(reader, /MAP — Android Productivity App/);
assert.doesNotMatch(reader, /<iframe|<object|<embed/);
resumeFileChecks();

// ---- Browser step: the production site served locally, driven at phone width (390x844) and desktop (1440x900).
const phone = { width: 390, height: 844 };
const until = (page, sel, text) => page.waitForFunction(([s, t]) => document.querySelector(s)?.textContent === t, [sel, text]);
const text = (page, sel) => page.locator(sel).first().textContent();
const visible = (page, sel) => page.locator(sel).first().isVisible();

// Reading: without JavaScript (and with reduced motion) the homepage is a set of filled-in forms, complete, with no demo controls.
async function readingChecks(browser, url) {
  for (const [what, options] of [['no JavaScript', { javaScriptEnabled: false }], ['reduced motion', { reducedMotion: 'reduce' }]]) {
    const page = await browser.newPage({ viewport: phone, ...options });
    await page.goto(url, { waitUntil: 'networkidle' });
    const main = norm(await page.locator('main').textContent());
    for (const t of sheetWords) assert.ok(main.includes(norm(t)), `/: ${what}: the page says "${t}"`);
    for (const p of made) assert.ok((await text(page, `#${p.slug}-h`)).includes(p.title), `/: ${what}: ${p.title} has its Sheet heading`);
    for (const p of made) assert.equal(norm(await text(page, `#${p.slug} .foot a[href="work/${p.slug}/"]`)), 'Full case study', `/: ${what}: ${p.title} links its page`);
    for (const p of made) assert.equal(norm(await text(page, `#${p.slug} .foot a[href="#request"]`)), 'Request one like this', `/: ${what}: ${p.title} leads to the Request form`);
    for (const href of [cave.url, cave.cavetext.store]) assert.equal(await page.locator(`#cavelms .foot a[href="${href}"]`).count(), 1, `/: ${what}: CaveLMS keeps its link to ${href}`);
    assert.equal(await page.locator('main h1, main h2').count(), 1 + made.length + 3, `/: ${what}: every Sheet has a heading`); // the statement, each system, then continuation, Particulars and Request
    if (options.javaScriptEnabled === false) {
      for (const id of ['pims', 'procura']) assert.ok(await page.evaluate(i => [...document.querySelectorAll(`#${i} .diagram`)].some(d => { const r = d.getBoundingClientRect(); return r.width > 100 && r.height > 100; }), id), `/: ${what}: the Was diagram of ${id} shows`);
      assert.equal(await page.locator('#dd-drugs-register .diagram').count(), 0, `/: ${what}: the DD workflow diagram is on its project page`);
      assert.equal(await page.locator('#pims .hint, #dd-drugs-register .hint, #procura .hint').count(), 0, `/: ${what}: the demo instructions need JavaScript`);
      for (const id of ['pims', 'dd-drugs-register', 'procura', 'cavelms']) assert.equal(await page.locator(`#${id} button, #${id} input, #${id} select`).count(), 0, `/: ${what}: ${id} has no demo controls`);
    } else {
      assert.equal(await page.evaluate(() => document.getAnimations().length), 0, `/: ${what}: nothing animates`);
    }
    await page.close();
  }
}

// The first screen: the Hiring line is in view on a phone; on a desktop the whole Register and the Request work button are.
async function firstScreenChecks(browser, url) {
  const bottom = async (page, sel) => { const b = await page.locator(sel).first().boundingBox(); return b.y + b.height; };
  let page = await browser.newPage({ viewport: phone, reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle' });
  assert.equal(norm(await text(page, '.first .hiring')), `${words.hiring} Read the résumé`, 'first screen: the Hiring line says it');
  assert.equal(await page.getAttribute('.first .hiring a', 'href'), 'resume/', 'first screen: the Hiring line links the résumé');
  assert.ok(await bottom(page, '.first .hiring') <= phone.height, 'first screen: the Hiring line is visible without scrolling at 390x844');
  await page.close();
  page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle' });
  assert.ok(await bottom(page, '.first .register tbody tr:last-child') <= 900, 'first screen: the whole Register fits within 900px at 1440px');
  assert.ok(await bottom(page, '.first .foot .btn') <= 900, 'first screen: the Request work button fits within 900px at 1440px');
  await page.close();
}

// Sample demos, end to end. Reduced motion makes the typed entries instant.
async function demoChecks(browser, url) {
  const page = await browser.newPage({ viewport: phone, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  const stamp = id => `#${id} .foot .stamp`;
  const button = (id, name) => page.locator(`#${id}`).getByRole('button', { name });

  // The demos say how to play them, and a field to type in looks like one to write in: a dotted writing line, boxed on hover and focus.
  assert.equal(norm(await text(page, '#pims .hint')), 'Approve the request, then follow it through ordering and receipt.', 'PIMS: the demo says how to play');
  assert.equal(norm(await text(page, '#dd-drugs-register .hint')), 'The system expects 14 of Item A. Type what is on the shelf, then submit the count.', 'DD: the demo says how to play');
  for (const id of ['pims', 'dd-drugs-register']) assert.ok(await visible(page, `#${id} .hint`), `${id}: the instruction shows`);
  const writeLine = async (sel, what) => {
    const look = () => page.$eval(sel, el => { const cs = getComputedStyle(el); return { line: `${cs.borderBottomStyle} ${cs.borderBottomWidth}`, box: cs.borderTopColor, font: cs.fontFamily }; });
    const idle = await look();
    assert.equal(idle.line, 'dotted 2px', `${what}: a dotted writing line under the entry`);
    assert.equal(idle.box, 'rgba(0, 0, 0, 0)', `${what}: no box until hover or focus`);
    assert.match(idle.font, /^"?Courier Prime/, `${what}: the entry is typed`);
    await page.hover(sel);
    assert.equal((await look()).box, 'rgb(27, 42, 107)', `${what}: boxed on hover`);
    await page.mouse.move(0, 0);
    await page.focus(sel);
    assert.equal((await look()).box, 'rgb(27, 42, 107)', `${what}: boxed on focus`);
    await page.$eval(sel, el => el.blur());
  };
  await writeLine('#dd-count', 'DD count');
  await writeLine('#exam-name', 'CaveLMS name');

  // PIMS: through Received, signing the slip as it goes.
  await until(page, stamp('pims'), 'Requested');
  const sign = () => page.$$eval('#pims .sign .ln', ls => ls.map(l => l.textContent));
  assert.deepEqual(await sign(), ['A.R.', '', '', '', ''], 'PIMS: only the requester has signed');
  for (const [label, stampText, entry] of [['Approve request', 'Approved', 'Procurement approved the requisition.'], ['Create order', 'Ordered', 'PO-2291'], ['Record receipt', 'Received', 'Stores received the order']]) {
    await button('pims', label).click();
    await until(page, stamp('pims'), stampText);
    assert.ok((await text(page, '#pims .log')).includes(entry), `PIMS: the log says "${entry}"`);
  }
  assert.deepEqual(await sign(), ['A.R.', 'M.T.', 'PO-2291', 'S.K.', '05 Oct 2026'], 'PIMS: the slip is signed, ordered and dated');
  assert.ok(await visible(page, '#pims .again'), 'PIMS: Start again offered at the end');
  assert.match(await text(page, '#pims [aria-live]'), /^Received\./, 'PIMS: the step is announced');
  await button('pims', 'Start again').click();
  await until(page, stamp('pims'), 'Requested');
  assert.deepEqual(await sign(), ['A.R.', '', '', '', ''], 'PIMS: Start again clears the slip');

  // DD Drugs Register: an invalid count adds nothing; a balanced count; a discrepancy that is then corrected without erasing the entry.
  const rows = () => page.locator('#dd-drugs-register tbody tr').count();
  assert.equal(await rows(), 4);
  await page.fill('#dd-count', 'abc');
  await button('dd-drugs-register', 'Submit count').click();
  assert.ok(await visible(page, '#err-count'), 'DD: an invalid count is flagged');
  assert.equal(await page.getAttribute('#dd-count', 'aria-invalid'), 'true');
  assert.equal(await rows(), 4, 'DD: an invalid count adds no row');
  await page.fill('#dd-count', '14');
  await button('dd-drugs-register', 'Submit count').click();
  await until(page, stamp('dd-drugs-register'), 'Balanced');
  assert.equal(await rows(), 5);
  assert.ok((await text(page, '#dd-drugs-register tbody tr:last-child')).includes('0 Balanced'));
  await button('dd-drugs-register', 'Start again').click();
  await until(page, stamp('dd-drugs-register'), 'In daily use');
  assert.equal(await rows(), 4, 'DD: Start again removes the added rows');
  await page.fill('#dd-count', '12');
  await button('dd-drugs-register', 'Submit count').click();
  await page.waitForSelector('#dd-drugs-register tbody tr.flag >> nth=1');
  assert.equal(await rows(), 5);
  assert.match(await text(page, '#dd-drugs-register tbody tr:last-child'), /−2.*discrepancy/s, 'DD: the difference is flagged');
  await page.selectOption('#dd-reason', 'Recount: counting error');
  await button('dd-drugs-register', 'Record correction').click();
  await until(page, stamp('dd-drugs-register'), 'Corrected');
  assert.equal(await rows(), 6);
  assert.match(await text(page, '#dd-drugs-register tbody tr:last-child'), /Correction to entry of today: recount found 14; physical count corrected from 12 to 14\./, 'DD: a recount corrects the physical count, not the system');
  assert.match(await text(page, '#dd-drugs-register tbody tr:nth-child(5)'), /−2.*discrepancy/s, 'DD: the original entry is still in the ledger');
  await button('dd-drugs-register', 'Start again').click();
  await until(page, stamp('dd-drugs-register'), 'In daily use');
  assert.equal(await rows(), 4);
  await page.fill('#dd-count', '12');
  await button('dd-drugs-register', 'Submit count').click();
  await page.selectOption('#dd-reason', 'Breakage recorded on the ward');
  await button('dd-drugs-register', 'Record correction').click();
  await until(page, stamp('dd-drugs-register'), 'Corrected');
  assert.match(await text(page, '#dd-drugs-register tbody tr:last-child'), /Correction to entry of today: system count reduced from 14 to 12; breakage recorded on the ward\./, 'DD: breakage corrects the system count');
  await button('dd-drugs-register', 'Start again').click();
  await page.fill('#dd-count', '16');
  await button('dd-drugs-register', 'Submit count').click();
  assert.deepEqual(await page.$$eval('#dd-reason option', o => o.map(x => x.textContent)), ['Receipt not yet entered', 'Recount: counting error'], 'DD: a count above the system offers only reasons that raise it');
  await page.selectOption('#dd-reason', 'Receipt not yet entered');
  await button('dd-drugs-register', 'Record correction').click();
  await until(page, stamp('dd-drugs-register'), 'Corrected');
  assert.match(await text(page, '#dd-drugs-register tbody tr:last-child'), /Correction to entry of today: system count raised from 14 to 16; receipt not yet entered\./);
  await button('dd-drugs-register', 'Start again').click();
  await until(page, stamp('dd-drugs-register'), 'In daily use');
  assert.equal(await rows(), 4);

  // Procura: nothing low drafts nothing; lowering items drafts lines; changing a count withdraws the draft.
  const lines = () => page.$$eval('#procura .po ~ .cells tbody tr', trs => trs.map(tr => [...tr.cells].map(c => c.textContent).join('|')));
  const sample = await lines();
  assert.equal(sample.length, 3);
  await button('procura', 'Draft purchase order').click();
  await page.waitForFunction(() => /^Nothing is at or below its reorder point/.test(document.querySelector('#procura .msg').textContent));
  assert.deepEqual(await lines(), sample, 'Procura: nothing low leaves the sample lines');
  assert.equal(await text(page, stamp('procura')), 'In production');
  const down = name => page.getByRole('button', { name: `One fewer ${name}` });
  await down('Gauze swab 10×10').click(); // 51 to 50: at the reorder point is time to reorder
  assert.match(await text(page, '#procura .stock tbody tr:first-child'), /50.*50.*reorder/s, 'Procura: on hand at the reorder point is flagged');
  await down('Gauze swab 10×10').click();
  assert.match(await text(page, '#procura .stock tbody tr:first-child'), /49.*50.*reorder/s);
  await button('procura', 'Draft purchase order').click();
  await until(page, stamp('procura'), 'Drafted');
  assert.deepEqual(await lines(), ['1|Gauze swab 10×10|51|pack'], 'Procura: one line, 2 x reorder point - on hand');
  assert.equal(await text(page, '#procura .msg'), '1 order line drafted from items at or below their reorder point.');
  await down('Syringe 3 ml').click({ clickCount: 2 }); // 7 to 5, reorder at 6
  await until(page, stamp('procura'), 'In production');
  assert.deepEqual(await lines(), sample, 'Procura: changing a count withdraws the draft');
  await button('procura', 'Draft purchase order').click();
  await until(page, stamp('procura'), 'Drafted');
  assert.deepEqual(await lines(), ['1|Gauze swab 10×10|51|pack', '2|Syringe 3 ml|7|box']);
  await button('procura', 'Start again').click();
  assert.deepEqual(await lines(), sample, 'Procura: Start again restores the sample');
  assert.equal(await text(page, '#procura .stock tbody tr:first-child .num'), '51');

  // CaveLMS: a missing name, a fail, then a pass that issues the certificate.
  const exam = button('cavelms', 'Submit exam');
  await exam.click();
  assert.ok(await visible(page, '#err-exam-name'), 'CaveLMS: a missing name is flagged');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'exam-name');
  await page.fill('#exam-name', 'Ada Lovelace');
  await page.check('input[name=q1][value="15"]');
  await exam.click();
  await page.waitForFunction(() => /Score 0 of 2.*Try again\./.test(document.querySelector('#cavelms .msg').textContent));
  assert.equal(await text(page, '#err-q1'), 'Not the right answer.');
  assert.equal(await text(page, '#err-q2'), 'Choose an answer.');
  assert.ok(await visible(page, '#err-q1') && await visible(page, '#err-q2'), 'CaveLMS: wrong and unanswered questions are flagged');
  await page.check('input[name=q2][value="Goods received note"]');
  await exam.click();
  await page.waitForFunction(() => /Score 1 of 2.*Try again\./.test(document.querySelector('#cavelms .msg').textContent));
  assert.equal(await text(page, '#cavelms .cert .who'), 'Sample Learner (fictional)', 'CaveLMS: no certificate on a fail');
  assert.equal(await text(page, stamp('cavelms')), 'Live');
  await page.check('input[name=q1][value="25"]');
  await exam.click();
  await until(page, stamp('cavelms'), 'Issued');
  assert.equal(await text(page, '#cavelms .cert .who'), 'Ada Lovelace');
  assert.match(await text(page, '#cavelms .cert'), /Sample Course: Reading a stock card[\s\S]*05 Oct 2026/);
  await button('cavelms', 'Start again').click();
  await until(page, stamp('cavelms'), 'Live');
  assert.equal(await text(page, '#cavelms .cert .who'), 'Sample Learner (fictional)', 'CaveLMS: Start again restores the certificate');
  assert.equal(await page.inputValue('#exam-name'), '');

  assert.deepEqual(errors, [], 'the demos raised no script errors');
  await page.close();
}

// Lift the top sheet on PIMS and Procura: the top form tilts back to show the Was diagram; put it back by button or Escape.
// The button says what is underneath.
const lifter = 'See the paper process underneath';
async function liftChecks(browser, url) {
  const page = await browser.newPage({ viewport: phone, reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle' });
  for (const id of ['pims', 'procura']) {
    const lift = `#${id} .lift`, btn = `${lift} .lift-btn`;
    const state = () => page.evaluate(([b, f]) => [document.querySelector(b).getAttribute('aria-pressed'), document.querySelector(b).textContent, document.querySelector(f).inert], [btn, `${lift} .lift-form`]);
    assert.deepEqual(await state(), ['false', lifter, false], `${id}: the form starts on top`);
    await page.click(btn);
    assert.deepEqual(await state(), ['true', 'Put it back', true], `${id}: lifting shows the copy and parks the form`);
    assert.equal(await text(page, `#${id} [aria-live]`), 'Top sheet lifted. The paper process underneath is showing.', `${id}: lifting is announced`);
    assert.ok(await visible(page, `${lift} .lift-copy .diagram`), `${id}: the Was diagram is showing under the lifted copy`);
    await page.click(btn);
    assert.deepEqual(await state(), ['false', lifter, false], `${id}: put back by button`);
    await page.click(btn);
    await page.keyboard.press('Escape');
    assert.deepEqual(await state(), ['false', lifter, false], `${id}: put back with Escape`);
    assert.equal(await page.evaluate(b => document.activeElement === document.querySelector(b), btn), true, `${id}: focus returns to the lift button`);
  }
  await page.close();
}

// Request form at phone width with the API reply faked in the browser: what the visitor sees, and what is sent.
async function requestChecks(browser, url) {
  const page = await browser.newPage({ viewport: phone, reducedMotion: 'reduce' });
  let requests = [], reply = { status: 200, body: '{"ok":true}' };
  await page.route('**/api/contact', route => {
    requests.push(route.request().postDataJSON());
    if (!reply) return route.abort();
    route.fulfill({ status: reply.status, contentType: 'application/json', body: reply.body });
  });
  const fill = async (v, honeypot = '') => {
    await page.goto(url, { waitUntil: 'networkidle' });
    for (const k of ['message', 'name', 'email']) await page.fill(`[data-request] [name=${k}]`, v[k]);
    if (honeypot) await page.evaluate(h => { document.querySelector('[name=website]').value = h; }, honeypot);
    requests = [];
  };
  const ok = { message: 'Orders live in three spreadsheets', name: 'Ada Lovelace', email: 'ada@example.com' };
  const submit = () => page.click('[data-request] button[type=submit]');

  for (const [missing, v] of [['message', { ...ok, message: '  ' }], ['name', { ...ok, name: '' }], ['email', { ...ok, email: '' }], ['email', { ...ok, email: 'not-an-email' }]]) {
    await fill(v);
    await submit(); // a tap on Send right after typing a bad email must not be lost
    assert.ok(await visible(page, `#err-${missing}`), `Request form: the ${missing} error shows for ${JSON.stringify(v)}`);
    assert.equal(await page.getAttribute(`[data-request] [name=${missing}]`, 'aria-invalid'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.name), missing, 'Request form: focus moves to the invalid field');
    assert.equal(requests.length, 0, 'Request form: nothing is sent while a field is invalid');
    await page.fill(`[data-request] [name=${missing}]`, ok[missing]);
    assert.equal(await page.getAttribute(`[data-request] [name=${missing}]`, 'aria-invalid'), null, 'Request form: typing clears the flag');
  }

  await fill(ok);
  await submit();
  await page.waitForSelector('[data-request] .done:not([hidden])');
  assert.equal(await text(page, '[data-request] .done'), words.requestDone);
  assert.ok(await visible(page, '[data-request] .office .stamp'), 'Request form: the Received stamp lands');
  assert.ok(!(await visible(page, '[data-request] .send')) && !(await visible(page, '[data-request] [name=message]')), 'Request form: the fields give way to the confirmation');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'done', 'Request form: the confirmation takes focus');
  assert.deepEqual(requests, [{ name: 'Ada Lovelace', email: 'ada@example.com', message: 'Orders live in three spreadsheets', website: '' }], 'Request form: the posted body');
  await fill(ok, 'http://spam.example');
  await submit();
  await page.waitForSelector('[data-request] .done:not([hidden])');
  assert.equal(requests[0].website, 'http://spam.example', 'Request form: the honeypot is posted as it was filled');

  for (const [what, r, why] of [['400', { status: 400, body: '{"error":"bad"}' }, 'Your request was not accepted. Check your name, email and message.'], ['429', { status: 429, body: '{"error":"Too many messages"}' }, 'Several requests were sent in a short time, so this one was not sent.'],
    ['500', { status: 500, body: '{}' }, 'Your request could not be sent.'], ['a network failure', null, 'Your request could not be sent. Check your connection.']]) {
    reply = r;
    await fill(ok);
    await submit();
    await page.waitForSelector('[data-request] .fail:not([hidden])');
    assert.equal(await text(page, '[data-request] .why'), why, `Request form: ${what} explains the failure`);
    assert.equal(await page.getAttribute('[data-request] .fail a', 'href'), `mailto:${words.email}`, 'Request form: the failure offers email');
    assert.ok(!(await page.locator('[data-request] button[type=submit]').isDisabled()), `Request form: the button works again after ${what}`);
    assert.equal(await text(page, '[data-request] button[type=submit] span'), 'Send request');
    assert.ok(!(await visible(page, '[data-request] .done')), `Request form: ${what} is not a confirmation`);
    assert.equal(await page.inputValue('[data-request] [name=message]'), ok.message, 'Request form: the message is kept');
  }
  await page.close();
}

// Every route at phone and desktop width: one h1, no sideways scroll, every image arrives, no request leaves the site.
async function pageChecks(browser, base) {
  for (const width of [360, 390, 430, 1440]) {
    for (const route of width === 390 || width === 1440 ? routes : ['/']) {
      const page = await browser.newPage({ viewport: { width, height: width > 500 ? 900 : 844 }, reducedMotion: 'reduce' });
      const outside = [], failed = [], errors = [];
      page.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) outside.push(r.url()); });
      page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + route, { waitUntil: 'networkidle' });
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } scrollTo(0, 0); });
      await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('h1').count(), 1, `${route}: one h1 at ${width}px`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: no sideways scroll at ${width}px`);
      // The outline never skips a level: h1 first, and no heading more than one level below the one before it.
      const levels = await page.$$eval('main h1, main h2, main h3, main h4, main h5, main h6', hs => hs.map(h => Number(h.tagName[1])));
      assert.equal(levels[0], 1, `${route}: the first heading is the h1 at ${width}px`);
      levels.forEach((l, i) => assert.ok(i === 0 || l <= levels[i - 1] + 1, `${route}: h${l} follows h${levels[i - 1]} at ${width}px (a skipped level), headings ${levels.join('')}`));
      assert.deepEqual(await page.evaluate(() => [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src)), [], `${route}: every image arrives at ${width}px`);
      assert.deepEqual(outside, [], `${route}: no request to another host at ${width}px`);
      assert.deepEqual(failed, [], `${route}: every asset is served at ${width}px`);
      assert.deepEqual(errors, [], `${route}: no script errors at ${width}px`);
      await page.close();
    }
  }
}

// The résumé PDF carries the two changed facts and still prints on one A4 page; /projects/ is the full Register and /resume/ wears the Case File.
function resumeFileChecks() {
  const pdf = path.join(here, '../../resume/Resume-Hafiz-Jamali.pdf');
  assert.match(execFileSync('pdfinfo', [pdf], { encoding: 'utf8' }), /Pages:\s+1\b/, 'résumé PDF: one page');
  const pdfText = norm(execFileSync('pdftotext', [pdf, '-'], { encoding: 'utf8' }));
  assert.ok(pdfText.includes('cavelms.com'), 'résumé PDF: CaveLMS is at cavelms.com');
  assert.ok(!pdfText.includes('lms.wasabietech.com'), 'résumé PDF: the old CaveLMS address is gone');
  assert.match(pdfText, /CaveText.*Chrome extension.*The Cave Consult.*Chrome Web Store/, 'résumé PDF: a CaveText line');
  assert.equal((pdfText.match(/CaveText/g) || []).length, 1, 'résumé PDF: CaveText is one line');
  assert.match(reader, /cavelms\.com/, 'résumé reader: CaveLMS is at cavelms.com');
  assert.doesNotMatch(reader, /lms\.wasabietech\.com/, 'résumé reader: the old CaveLMS address is gone');
}

async function projectsPageChecks(browser, base) {
  for (const [what, options] of [['no JavaScript', { javaScriptEnabled: false }], ['JavaScript', {}]]) {
    const page = await browser.newPage({ viewport: phone, reducedMotion: 'reduce', ...options });
    await page.goto(`${base}/projects/`, { waitUntil: 'networkidle' });
    assert.equal(await text(page, 'main h1'), 'Register of work', `/projects/: ${what}: the Sheet is the Register of work`);
    assert.match(await text(page, 'main .serial .no'), /^No\. 0008$/, `/projects/: ${what}: the serial counts the eight projects`);
    assert.ok(await visible(page, 'main .stamp'), `/projects/: ${what}: the Stamp shows`);
    const rows = await page.$$eval('main table.register tbody tr', trs => trs.map(tr => ({ href: tr.querySelector('.sys a')?.href, text: tr.textContent.replace(/\s+/g, ' '), status: tr.querySelector('td[data-label=Status]')?.textContent.trim() })));
    assert.deepEqual(rows.map(r => r.href), projects.map(p => `${base}/work/${p.slug}/`), `/projects/: ${what}: eight rows in site order, each linking its page`);
    for (const [i, p] of projects.entries()) {
      const r = p.register || p.listing;
      for (const t of [r.label || p.title, r.was, r.now]) assert.ok(rows[i].text.includes(t), `/projects/: ${what}: the ${p.slug} row says "${t}"`);
      assert.ok(rows[i].status, `/projects/: ${what}: the ${p.slug} row has a status`);
    }
    if (options.javaScriptEnabled === false) assert.equal(await page.locator('main button, main input').count(), 0, '/projects/: reads without controls');
    // Phones stack each row into labelled lines, as the homepage Register does.
    const labels = await page.$eval('main table.register tbody tr', tr => [...tr.cells].map(td => getComputedStyle(td, '::before').content.replaceAll('"', '')));
    assert.deepEqual(labels, ['Item', 'System', 'Was', 'Now', 'Status'], `/projects/: ${what}: phone rows carry their labels`);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(`${base}/projects/`, { waitUntil: 'networkidle' });
  assert.deepEqual(await page.$$eval('main table.register thead th', ths => ths.map(t => t.textContent)), ['Item', 'System', 'Was', 'Now', 'Status'], '/projects/: desktop Register columns');
  await page.close();
}

async function resumeReaderChecks(browser, base) {
  for (const viewport of [phone, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    await page.goto(`${base}/resume/`, { waitUntil: 'networkidle' });
    const look = await page.evaluate(() => {
      const css = (s, p) => getComputedStyle(document.querySelector(s))[p];
      return { sheet: !!document.querySelector('main .sheet .resume-paper'), h1: css('main h1', 'fontFamily'), name: css('.resume-paper h2', 'color'), nameFont: css('.resume-paper h2', 'fontFamily'), body: css('.resume-paper .profile', 'fontFamily'), bg: css('.resume-paper', 'backgroundColor') };
    });
    assert.ok(look.sheet, `/resume/: the reader sits on a Sheet at ${viewport.width}px`);
    assert.ok(look.h1.includes('Archivo') && look.nameFont.includes('Archivo') && look.body.includes('Archivo'), `/resume/: Case File type at ${viewport.width}px`);
    assert.equal(look.name, 'rgb(27, 42, 107)', `/resume/: the name is in Case File navy at ${viewport.width}px`);
    assert.notEqual(look.bg, 'rgb(255, 255, 255)', `/resume/: no separate white page at ${viewport.width}px`);
    const dl = await page.getAttribute('main a[download]', 'href');
    assert.equal(dl, 'Resume-Hafiz-Jamali.pdf', '/resume/: the PDF download is offered');
    const res = await page.request.get(`${base}/resume/${dl}`);
    assert.ok(res.ok() && (await res.body()).subarray(0, 4).toString() === '%PDF', '/resume/: the PDF download works');
    assert.match(norm(await page.locator('.resume-paper').textContent()), /cavelms\.com/);
    await page.close();
  }
}

// Project pages of the four systems in production: the homepage Sheet with the fuller case study, all screens, the Sample demo,
// the lift where it applies, and links to the next project, the Request form and the résumé.
async function projectPageChecks(browser, base) {
  const system = made.map(p => p.slug);
  const stamp = id => `#${id} .foot .stamp`;
  for (const p of made) {
    const next = projects[(projects.indexOf(p) + 1) % projects.length], url = `${base}/work/${p.slug}/`, where = `/work/${p.slug}/`;
    const click = (page, name) => page.locator(`#${p.slug}`).getByRole('button', { name }).click();

    // Without JavaScript: one complete Sheet, every screen with its disclosure, the diagrams, no demo controls, and the three onward links.
    const plain = await browser.newPage({ viewport: phone, javaScriptEnabled: false });
    await plain.goto(url, { waitUntil: 'networkidle' });
    const main = norm(await plain.locator('main').textContent());
    const cave = p.cavetext ? [p.cavetext.built, p.cavetext.limits, ...p.cavetext.workflow, ...p.cavetext.stack] : [];
    for (const t of [p.title, p.category, p.problem, p.built, p.implementation, p.limits, ...p.workflow, ...p.stack, ...(p.facts || []), ...cave, p.scenes.length && p.disclosure].filter(Boolean)) assert.ok(main.includes(norm(t)), `${where}: the page says "${t}"`);
    assert.equal(await plain.locator('main section.sheet').count(), 1, `${where}: one Sheet`);
    assert.equal(await plain.locator('main h1').count(), 1, `${where}: one h1`);
    assert.ok((await text(plain, 'main h1')).includes(p.title), `${where}: the h1 names the project`);
    assert.equal(await plain.locator('main .shot img').count(), p.scenes.length, `${where}: every approved screen is shown`);
    for (const [name, file] of p.scenes) assert.ok(await plain.locator(`main .shot img[src$="static/${file}"][alt*="${name}"]`).count(), `${where}: the ${name} screen`);
    assert.equal(await plain.locator('main button, main input, main select').count(), 0, `${where}: no demo controls without JavaScript`);
    if (p.slug !== 'cavelms') assert.ok(await visible(plain, 'main .diagram'), `${where}: the diagram shows`);
    for (const href of [`../../work/${next.slug}/`, '../../#request', '../../resume/']) assert.ok(await plain.locator(`main a[href="${href}"]`).count(), `${where}: links ${href}`);
    if (p.slug === 'cavelms') {
      assert.ok(await plain.locator(`main a[href="${p.url}"]`).count(), `${where}: links CaveLMS`);
      assert.ok(await plain.locator(`main a[href="${p.cavetext.store}"]`).count(), `${where}: links the Chrome Web Store listing`);
    }
    await plain.close();

    // With JavaScript: the Sample demo runs on the page, and the lift where there is a paper process to show.
    const page = await browser.newPage({ viewport: phone, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    if (p.slug === 'pims') {
      await until(page, stamp('pims'), 'Requested');
      for (const [label, s] of [['Approve request', 'Approved'], ['Create order', 'Ordered'], ['Record receipt', 'Received']]) { await click(page, label); await until(page, stamp('pims'), s); }
      assert.ok(await visible(page, '#pims .again'), 'PIMS page: Start again offered at the end');
    } else if (p.slug === 'dd-drugs-register') {
      await page.fill('#dd-count', '14');
      await click(page, 'Submit count');
      await until(page, stamp(p.slug), 'Balanced');
      await click(page, 'Start again');
      await page.fill('#dd-count', '12');
      await click(page, 'Submit count');
      await page.selectOption('#dd-reason', 'Recount: counting error');
      await click(page, 'Record correction');
      await until(page, stamp(p.slug), 'Corrected');
    } else if (p.slug === 'procura') {
      await page.getByRole('button', { name: 'One fewer Gauze swab 10×10' }).click({ clickCount: 2 });
      await click(page, 'Draft purchase order');
      await until(page, stamp('procura'), 'Drafted');
    } else {
      await page.fill('#exam-name', 'Ada Lovelace');
      await page.check('input[name=q1][value="25"]');
      await page.check('input[name=q2][value="Goods received note"]');
      await click(page, 'Submit exam');
      await until(page, stamp('cavelms'), 'Issued');
      assert.equal(await text(page, '#cavelms .cert .who'), 'Ada Lovelace', `${where}: the certificate is issued in the name entered`);
    }
    if (['pims', 'procura'].includes(p.slug)) {
      for (const [width, diagram] of [[390, 'tall'], [1440, 'wide']]) {
        await page.setViewportSize({ width, height: 900 });
        const lift = `#${p.slug} .lift`;
        await page.click(`${lift} .lift-btn`);
        assert.ok(await visible(page, `${lift} .lift-copy .diagram.${diagram}`), `${where}: lifting shows the Was diagram at ${width}px`);
        await page.keyboard.press('Escape');
        assert.equal(await page.getAttribute(`${lift} .lift-btn`, 'aria-pressed'), 'false', `${where}: Escape puts the copy back at ${width}px`);
      }
    }
    assert.deepEqual(errors, [], `${where}: the demo raised no script errors`);
    await page.close();
  }
  assert.deepEqual(system, ['pims', 'dd-drugs-register', 'procura', 'cavelms'], 'the four systems in production have project pages');
}

// The Theoses, 89lab, MAP and Yen pages. Each is one Sheet on a form of its own; its demo is progressive enhancement.
const continuation = ['theoses', '89lab', 'map', 'yen'].map(slug => projects.find(p => p.slug === slug));
const approvedMap = ['map-home-demo.webp', 'map-calendar-demo.webp', 'map-tasks-demo.webp', 'map-tools-demo.webp'];

async function continuationReadingChecks(browser, base) {
  for (const [what, options] of [['no JavaScript', { javaScriptEnabled: false }], ['reduced motion', { reducedMotion: 'reduce' }]]) {
    for (const p of continuation) {
      const route = `/work/${p.slug}/`, next = projects[(projects.indexOf(p) + 1) % projects.length];
      const page = await browser.newPage({ viewport: phone, ...options });
      await page.goto(base + route, { waitUntil: 'networkidle' });
      const main = norm(await page.locator('main').textContent());
      for (const t of [p.description, p.problem, p.built, p.limits, ...p.workflow, ...p.stack, ...(p.facts || [])]) assert.ok(main.includes(norm(t)), `${route}: ${what}: the page says "${t}"`);
      assert.equal(await page.locator('main .sheet').count(), 1, `${route}: ${what}: one Sheet`);
      assert.ok(await visible(page, '[data-form] .foot .stamp'), `${route}: ${what}: the Sheet carries its Stamp`);
      assert.ok(await visible(page, '[data-form] .sample'), `${route}: ${what}: the sample entries are labelled`);
      assert.ok(await visible(page, 'main a[href$="#request"]') && await visible(page, 'main a[href$="resume/"]'), `${route}: ${what}: links the Request form and the résumé`);
      assert.equal(await page.getAttribute(`main a[href$="work/${next.slug}/"]`, 'href'), `../../work/${next.slug}/`, `${route}: ${what}: links the next project`);
      if (p.slug === 'theoses') assert.match(main, /pi coding agent/, `${route}: ${what}: built on the pi coding agent`);
      if (p.slug === 'map') {
        const srcs = await page.$$eval('main img', is => is.map(i => i.getAttribute('src').split('/').pop()));
        assert.deepEqual(srcs, approvedMap, `${route}: ${what}: only the four approved screens`);
        assert.deepEqual(await page.$$eval('main img', (is, all) => is.map(i => i.naturalWidth > 0 && (!all || i.getBoundingClientRect().width > 100)), options.javaScriptEnabled === false), [true, true, true, true], `${route}: ${what}: all four screens arrive${options.javaScriptEnabled === false ? ' and show' : ''}`);
      }
      if (options.javaScriptEnabled === false) assert.equal(await page.locator('main button, main input, main select, main textarea').count(), 0, `${route}: ${what}: no demo controls`);
      else {
        assert.ok(await page.locator('main button').count() > 0, `${route}: ${what}: the demo is switched on`);
        assert.equal(await page.evaluate(() => document.getAnimations().length), 0, `${route}: ${what}: nothing animates`);
      }
      await page.close();
    }
  }
}

// Each demo end to end (reduced motion makes the typed entries instant), at one width.
async function continuationDemoChecks(browser, base, width) {
  const page = await browser.newPage({ viewport: { width, height: width > 500 ? 900 : 844 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const stamp = '[data-form] .foot .stamp';
  const button = name => page.locator('[data-form]').getByRole('button', { name });
  const open = async slug => { await page.goto(`${base}/work/${slug}/`, { waitUntil: 'networkidle' }); };
  const fits = async what => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${what}: no sideways scroll at ${width}px`);
  const live = () => text(page, '[data-form] [aria-live]');

  // Theoses: a work ticket whose steps tick off, then stops for review.
  await open('theoses');
  await until(page, stamp, 'Open');
  const ticked = () => page.$$eval('[data-steps] li', ls => ls.map(l => l.classList.contains('done')));
  const signed = () => page.$$eval('[data-form] .sign .ln', ls => ls.map(l => l.textContent));
  assert.deepEqual(await ticked(), [false, false, false], 'Theoses: no step is ticked at the start');
  assert.ok(!(await visible(page, '[data-draft]')), 'Theoses: no draft before the task has run');
  await button('Run task').click();
  await until(page, stamp, 'For review');
  assert.deepEqual(await ticked(), [true, true, true], 'Theoses: every step ticked');
  assert.match(await text(page, '[data-draft]'), /Gauze swabs dropped below the reorder point/, 'Theoses: the draft is shown for review');
  assert.match(await live(), /stopped for your review/, 'Theoses: the stop is announced');
  assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Approve', 'Theoses: focus moves to Approve');
  assert.deepEqual(await signed(), ['A.R.', ''], 'Theoses: nobody has reviewed it yet');
  await button('Ask for changes').click();
  await until(page, stamp, 'Revised');
  assert.match(await text(page, '[data-draft]'), /Revised draft for review[\s\S]*Revised: gauze swabs/, 'Theoses: Ask for changes revises the draft');
  await button('Approve').focus();
  await page.keyboard.press('Enter');
  await until(page, stamp, 'Approved');
  assert.deepEqual(await signed(), ['A.R.', 'M.T.'], 'Theoses: the reviewer signs');
  assert.ok(!(await visible(page, '[data-form] button.btn')), 'Theoses: no review buttons after approval');
  assert.match(await live(), /^Approved\./, 'Theoses: the approval is announced');
  await fits('Theoses');
  await button('Start again').click();
  await until(page, stamp, 'Open');
  assert.deepEqual(await ticked(), [false, false, false], 'Theoses: Start again unticks the steps');
  assert.deepEqual(await signed(), ['A.R.', ''], 'Theoses: Start again clears the signature');
  assert.ok(!(await visible(page, '[data-draft]')), 'Theoses: Start again clears the draft');

  // 89lab: a run sheet; repeats are skipped; the upload limit hands off to Telegram.
  await open('89lab');
  await until(page, stamp, 'Ready');
  const runs = () => page.$$eval('[data-form] tbody tr:not(.empty)', trs => trs.map(tr => [...tr.cells].map(c => c.textContent)));
  const stages = () => page.$$eval('[data-stages] li', ls => ls.map(l => l.classList.contains('done') ? 'done' : l.classList.contains('fail') ? 'fail' : ''));
  assert.deepEqual(await runs(), [], '89lab: the sheet starts with no runs');
  assert.ok(await visible(page, '[data-form] tr.empty'), '89lab: an empty sheet says so');
  await button('Run the sheet').click();
  await until(page, stamp, 'Published');
  assert.deepEqual(await runs(), [['1', 'AI news', 'A lab releases a smaller open model', 'Published to 89lab on Facebook.']], '89lab: one run logged');
  assert.deepEqual(await stages(), Array(8).fill('done'), '89lab: every stage ticked');
  await button('Run again').click();
  await until(page, stamp, 'Published');
  assert.deepEqual((await runs()).slice(1), [['', 'AI news', '“A lab releases a smaller open model”', 'Skipped: already posted, so the next topic was picked.'], ['2', 'AI news', 'An editor adds agent mode', 'Published to 89lab on Facebook.']], '89lab: a repeat is skipped');
  await page.check('input[name=lane][value=repo]');
  await page.check('input[name=limit]');
  await button('Run again').click();
  await until(page, stamp, 'Handed off');
  assert.deepEqual((await runs()).at(-1), ['3', 'GitHub repo', 'A terminal coding agent', 'Upload refused: daily limit reached. The finished video went to Telegram for manual posting.'], '89lab: the limit hands off to Telegram');
  assert.deepEqual(await stages(), ['done', 'done', 'done', 'done', 'done', 'done', 'fail', 'done'], '89lab: the Publish stage is the one refused');
  assert.match(await live(), /Telegram/, '89lab: the hand-off is announced');
  await page.uncheck('input[name=limit]');
  await button('Run again').click();
  await until(page, stamp, 'Published');
  assert.deepEqual((await runs()).at(-1), ['4', 'GitHub repo', 'A terminal coding agent', 'Published to YouTube Shorts and Threads.'], '89lab: a handed-off topic is not counted as posted');
  await fits('89lab');
  await button('Start again').click();
  await until(page, stamp, 'Ready');
  assert.deepEqual(await runs(), [], '89lab: Start again clears the sheet');
  assert.deepEqual(await stages(), Array(8).fill(''), '89lab: Start again clears the stages');
  assert.equal(await text(page, '[data-form] button.btn span'), 'Run the sheet');

  // MAP: the four approved screens, as tabs once the script runs.
  await open('map');
  const tabs = page.getByRole('tab');
  assert.deepEqual(await tabs.allTextContents(), ['Home', 'Calendar', 'Tasks', 'Tools'], 'MAP: a tab for each approved screen');
  const shown = () => page.$$eval('[data-form] figure', fs => fs.filter(f => f.getBoundingClientRect().width > 0).map(f => f.querySelector('img').getAttribute('src').split('/').pop()));
  assert.deepEqual(await shown(), ['map-home-demo.webp'], 'MAP: the first screen shows');
  await tabs.nth(1).click();
  assert.deepEqual(await shown(), ['map-calendar-demo.webp'], 'MAP: a tab shows its screen');
  assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
  await page.keyboard.press('ArrowRight');
  assert.deepEqual(await shown(), ['map-tasks-demo.webp'], 'MAP: arrow keys move between tabs');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Tasks');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  assert.deepEqual(await shown(), ['map-home-demo.webp'], 'MAP: the tabs wrap round');
  await fits('MAP');

  // Yen: a message slip that keeps one thread across three channels.
  await open('yen');
  await until(page, stamp, 'Message taken');
  const thread = () => page.$$eval('[data-form] .thread li', ls => ls.map(l => [...l.children].map(c => c.textContent)));
  assert.deepEqual(await thread(), [['Terminal', 'Remind me to check the gauze order on Friday.'], ['Yen', 'Noted for Friday.']], 'Yen: the slip starts with one exchange');
  assert.equal(await page.inputValue('#yen-say'), 'Did the gauze order go out?');
  await page.check('input[name=channel][value=Telegram]');
  await button('Send').click();
  await until(page, stamp, 'Same thread');
  assert.deepEqual((await thread()).slice(2), [['Telegram', 'Did the gauze order go out?'], ['Yen', 'Not yet. It is still a draft waiting for your approval.']], 'Yen: the reply keeps the same thread');
  await page.check('input[name=channel][value=Browser]');
  await page.press('#yen-say', 'Enter');
  await page.waitForFunction(() => document.querySelectorAll('[data-form] .thread li').length === 6);
  assert.deepEqual((await thread()).slice(4), [['Browser', 'Remind me again from here.'], ['Yen', 'Done. I will remind you here on Friday.']], 'Yen: keep talking on the third channel');
  assert.match(await live(), /^Sent from Browser\./, 'Yen: the reply is announced');
  await page.fill('#yen-say', '  ');
  await button('Send').click();
  assert.ok(await visible(page, '#err-say'), 'Yen: an empty message is flagged');
  assert.equal(await page.getAttribute('#yen-say', 'aria-invalid'), 'true');
  assert.equal((await thread()).length, 6, 'Yen: an empty message adds nothing');
  await fits('Yen');
  await button('Start again').click();
  await until(page, stamp, 'Message taken');
  assert.equal((await thread()).length, 2, 'Yen: Start again clears the thread');
  assert.equal(await page.isChecked('input[name=channel][value=Terminal]'), true);

  assert.deepEqual(errors, [], 'the continuation demos raised no script errors');
  await page.close();
}

async function continuationChecks(browser, base) {
  await continuationReadingChecks(browser, base);
  for (const width of [390, 1440]) await continuationDemoChecks(browser, base, width);
  console.log('PASS continuation pages: Theoses, 89lab, MAP and Yen read complete without JavaScript or with reduced motion; each demo runs end to end at 390 and 1440px with no sideways scroll; MAP shows only its four approved screens');
}

// Weight and legibility at 390px: the homepage Sheets are the short version, the Stamp is large text with the contrast to match,
// and the Photo label of the Particulars is the Label size.
const phoneHomeCeiling = 13300; // px; measured 12,091 after the Sheets were cut from 17,001 (~10% headroom)
const luminance = ([r, g, b]) => { const c = [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + .05) / (lo + .05); };
const rgb = css => css.match(/[\d.]+/g).slice(0, 3).map(Number);
async function phoneHomeChecks(browser, url) {
  const page = await browser.newPage({ viewport: phone, reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } scrollTo(0, 0); });
  await page.waitForLoadState('networkidle');
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`homepage at ${phone.width}px is ${height}px tall (ceiling ${phoneHomeCeiling}px; was 17001px with the full Sheets)`);
  assert.ok(height < phoneHomeCeiling, `/: the homepage at 390px is ${height}px tall, over the ${phoneHomeCeiling}px ceiling`);

  const stamps = await page.$$eval('.stamp:not([hidden])', els => els.map(el => { const cs = getComputedStyle(el); return { word: el.textContent, size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight), ink: cs.color, opacity: Number(cs.opacity), ground: getComputedStyle(el.closest('.sheet')).backgroundColor }; }));
  assert.equal(stamps.length, 1 + made.length + 2, '/: a Stamp on the first Sheet, each system, the continuation Sheet and Particulars');
  for (const s of stamps) {
    const ground = rgb(s.ground), ink = rgb(s.ink).map((v, i) => v * s.opacity + ground[i] * (1 - s.opacity));
    const ratio = contrast(ink, ground), large = s.size >= 18.66 && s.weight >= 700; // 14pt bold is large text
    assert.ok(large ? ratio >= 3 : ratio >= 4.5, `/: the "${s.word}" Stamp is ${ratio.toFixed(2)}:1 at ${s.size}px/${s.weight}, not large text and under 4.5:1`);
    assert.ok(large && s.size >= 19.2 && s.weight === 900, `/: the "${s.word}" Stamp is ${s.size}px/${s.weight}, under 1.2rem at weight 900`);
  }
  const labels = await page.$$eval('.portrait .lab, .about .cell .lab', els => els.map(el => getComputedStyle(el).fontSize));
  assert.equal(new Set(labels).size, 1, `/: the Photo label is the Label size, not ${labels}`);
  assert.equal(labels[0], '11.84px', '/: the Label token is .74rem');
  await page.close();
}

async function browserChecks() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };
  const server = http.createServer((req, res) => {
    const file = path.join(site, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
    if (!file.startsWith(site) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }).end(fs.readFileSync(file)); // module scripts need a JavaScript type
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    await readingChecks(browser, `${base}/`);
    await phoneHomeChecks(browser, `${base}/`);
    await firstScreenChecks(browser, `${base}/`);
    await demoChecks(browser, `${base}/`);
    await liftChecks(browser, `${base}/`);
    await requestChecks(browser, `${base}/`);
    await projectPageChecks(browser, base);

    await continuationChecks(browser, base);
    await pageChecks(browser, base);
    await projectsPageChecks(browser, base);
    await resumeReaderChecks(browser, base);
    console.log('PASS /projects/ and /resume/: /projects/ is the full Register (eight rows in site order, each linking its page, stacking into labelled rows at 390px, no JavaScript needed); /resume/ is the reader on a Sheet in Case File type and colours with the PDF download; the PDF is one page with cavelms.com and the CaveText line');
  } finally {
    await browser.close();
    server.close();
  }
}

console.log(`PASS publication regression: ${routes.length} indexable canonical pages with valid JSON-LD; same-origin links; sitemap/robots/llms.txt; ${manifest.length} manifest hashes; the Case File homepage says every Sheet's words; résumé present; preview stays noindex`);
browserChecks().then(() => console.log('PASS browser step: without JavaScript or with reduced motion the homepage reads complete with no demo controls; the PIMS, DD Drugs Register, Procura and CaveLMS demos and the lift run end to end at 390px; each of their four /work/ pages reads complete without JavaScript, shows every approved screen, runs its demo and lift, and links the next project, the Request form and the résumé; the first screen holds the Hiring line at 390px and the whole Register and Request work button at 1440px; the CaveLMS Sheet links its page; the Request form validates, sends {name, email, message, website} and reports 400, 429, 500 and network failures; every route has one h1 with no skipped heading level, no sideways scroll and no request to another host at 390 and 1440px; the homepage Sheets are the short version (the long one is only on /work/) and stay under the phone height ceiling; the PIMS and DD demos say how to play, their entries look like fill-in fields and the lift button says what is underneath; the Stamp is large text with enough contrast at 390px'));
