// Markup shared by every preview. Each variant wraps these in its own shell and CSS,
// so case-study content stays identical while the design changes.
const fs = require('fs');
const path = require('path');
const { esc, site } = require('./content.cjs');

const origin = 'https://portfolio.wasabietech.com';
let verification;

// Production pages (PORTFOLIO_PUBLISH=1) are indexable and carry the same canonical, social and
// structured-data tags the previous site published, plus the existing Search Console tag on the
// homepage. Everything else is a noindex preview.
function seo(route, title, description) {
  if (process.env.PORTFOLIO_PUBLISH !== '1') return '<meta name="robots" content="noindex,nofollow"><link rel="icon" href="data:,">';
  verification ??= fs.readFileSync(path.join(__dirname, '../../apps/web/index.html'), 'utf8').match(/<meta\b[^>]*name="google-site-verification"[^>]*>/)?.[0];
  if (!verification) throw new Error('Google Search Console verification tag missing from apps/web/index.html');
  const url = origin + route;
  const graph = [
    { '@type': 'Person', '@id': origin + '/#hafiz', name: 'Hafiz Jamali', alternateName: 'Mohammad Hafiz Bin Jamali', url: origin + '/', sameAs: [site.github], knowsAbout: ['Business applications', 'Procurement software', 'AI automation'] },
    { '@type': 'WebSite', '@id': origin + '/#website', url: origin + '/', name: 'Hafiz Jamali portfolio', publisher: { '@id': origin + '/#hafiz' } },
    { '@type': route === '/projects/' ? 'CollectionPage' : 'WebPage', '@id': url + '#page', url, name: title, description, isPartOf: { '@id': origin + '/#website' }, about: { '@id': origin + '/#hafiz' } }
  ];
  return `<meta name="robots" content="index,follow">${route === '/' ? verification : ''}<link rel="canonical" href="${url}"><link rel="icon" href="/favicon.svg" type="image/svg+xml">`
    + `<meta property="og:type" content="website"><meta property="og:site_name" content="Hafiz Jamali"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}">`
    + `<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}">`
    + `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
}

const imgSize = f => (f.startsWith('map-') && f !== 'map-overview.webp' ? [1152, 2560] : [1360, 860]);

const head = ({ title, description, root, fonts, extra = '', route = '/' }) => `<!doctype html>
<html lang="en" class="no-js"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
${seo(route, title, description)}
${fonts.map(f => `<link rel="preload" href="${root}static/${f}" as="font" type="font/woff2" crossorigin>`).join('')}
<link rel="stylesheet" href="${root}static/style.css">
<script>document.documentElement.classList.replace('no-js','js')</script>${extra}
</head>`;

const img = (root, f, alt, attrs = '') => {
  const [w, h] = imgSize(f);
  return `<img src="${root}static/${f}" alt="${esc(alt)}" width="${w}" height="${h}" ${attrs}>`;
};

// Real screenshots get tabs; projects without safe screenshots get their workflow outline.
const gallery = (p, root) => {
  if (!p.scenes.length) {
    return `<figure class="outline"><figcaption>Workflow outline, not a screenshot</figcaption>
<ol>${p.workflow.map(s => `<li>${esc(s)}</li>`).join('')}</ol></figure>`;
  }
  const id = `g-${p.slug}`;
  return `<figure class="gallery" data-gallery>
<div class="gallery-tabs" role="tablist" aria-label="${esc(p.title)} screens">${p.scenes.map((s, i) =>
    `<button role="tab" id="${id}-t${i}" aria-controls="${id}-p${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(s[0])}</button>`).join('')}</div>
${p.scenes.map((s, i) => `<div role="tabpanel" id="${id}-p${i}" aria-labelledby="${id}-t${i}" class="gallery-panel${s[1].startsWith('map-') ? ' is-phone' : ''}"${i ? ' hidden' : ''}>
<a href="${root}static/${s[1]}">${img(root, s[1], `${p.title}: ${s[0]}. ${s[2]}`, i ? 'loading="lazy"' : '')}</a><p>${esc(s[2])}</p></div>`).join('')}
<figcaption>${esc(p.disclosure)}</figcaption></figure>`;
};

const caseBody = p => `<section><h2>The problem</h2><p>${esc(p.problem)}</p></section>
<section><h2>What I built</h2><p>${esc(p.built)}</p></section>
<section><h2>How it works</h2><ol class="steps">${p.workflow.map(s => `<li>${esc(s)}</li>`).join('')}</ol></section>
<section><h2>Under the hood</h2><p>${esc(p.implementation)}</p></section>
<section><h2>What this page does not claim</h2><p>${esc(p.limits)}</p></section>`;

const facts = p => `<dl>
<div><dt>Built with</dt><dd>${p.stack.map(esc).join(', ')}</dd></div>
${p.facts ? `<div><dt>In use</dt><dd><ul>${p.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul></dd></div>` : ''}
${p.source ? `<div><dt>Source</dt><dd><a href="${esc(p.source)}">${esc(p.source.replace('https://', ''))}</a></dd></div>` : ''}
${p.releases ? `<div><dt>Download</dt><dd><a href="${esc(p.releases)}">APK releases on GitHub</a></dd></div>` : ''}
</dl>`;

const contact = () => `<h2>${esc(site.contactTitle)}</h2><p>${esc(site.contactBody)}</p>
<p class="contact-actions"><a class="button" href="${site.mailto}">${esc(site.cta)}</a> <a href="mailto:${site.email}">${site.email}</a></p>`;

const footer = (root, resume = site.resume) => `<footer class="site-footer"><p>${esc(site.name)}. Custom business apps and AI automation.</p>
<p><a href="${resume}">Résumé</a> <a href="${site.github}">GitHub</a></p></footer>`;

const nav = (root, extraClass = '', extra = '', resume = site.resume) => `<header class="site-nav ${extraClass}"><a class="brand" href="${root || './'}">${esc(site.name)}</a>
<nav aria-label="Main"><a href="${root}#work">Work</a><a href="${root}#about">About</a><a href="${resume}">Résumé</a>${extra}<a class="button button-small" href="${site.mailto}">${esc(site.cta)}</a></nav></header>`;

module.exports = { head, img, gallery, caseBody, facts, contact, footer, nav };
