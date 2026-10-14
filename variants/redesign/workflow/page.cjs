// Variant C, "Try the workflow": every project is shown as a small working demo
// with fictional sample data, styled like the forms and registers the software replaces.
const B = require('../blocks.cjs');

const fonts = ['ibm-plex-sans-latin-400-normal.woff2', 'ibm-plex-sans-latin-600-normal.woff2', 'ibm-plex-sans-latin-700-normal.woff2'];
const licenses = ['OFL-ibm-plex-sans.txt'];

const { demos } = require('../demos.cjs');

const services = [
  ['Stock and purchasing apps', 'Know what to buy, raise requests and track every order.', ['procura', 'pims']],
  ['Records with an audit trail', 'Daily counts and corrections that never erase the original entry.', ['dd-drugs-register']],
  ['AI assistants and automation', 'Repeated work handled by an agent, with your review before anything goes out.', ['theoses', '89lab', 'yen']],
  ['Android apps', 'Local-first phone apps without accounts or tracking.', ['map']]
];

const demoArticle = (p, root, esc, cls = '') => `<article class="demo ${cls}" id="demo-${p.slug}">
<header><h3><a href="${root}work/${p.slug}/">${esc(p.title)}</a></h3><p>${esc(p.summary)}</p></header>
${demos[p.slug](root, p)}
<a class="more" href="${root}work/${p.slug}/">Read the ${esc(p.title)} case study</a></article>`;

function home({ projects, site, esc, root }) {
  const by = Object.fromEntries(projects.map(p => [p.slug, p]));
  const title = slug => by[slug].title;
  return `${B.head({ title: site.title, description: site.description, root, fonts })}
<body>${B.nav(root)}
<main>
<section class="hero"><div class="hero-copy"><h1>${esc(site.headline)}</h1><p>${esc(site.sub)}</p>
<p class="hero-actions"><a class="button" href="${site.mailto}">${esc(site.cta)}</a><a href="#work">See the work</a></p></div>
${demoArticle(by.procura, root, esc, 'demo-hero')}</section>

<section class="services" aria-labelledby="services-title"><h2 id="services-title">What I can build for you</h2>
<ul>${services.map(([h, d, slugs]) => `<li><h3>${h}</h3><p>${d}</p><p class="service-links">${slugs.map(s => `<a href="#demo-${s}">${esc(title(s))}</a>`).join(' ')}</p></li>`).join('')}</ul></section>

<section class="work" id="work" aria-labelledby="work-title"><h2 id="work-title">Try the work</h2>
<p class="lede">Each demo runs in your browser with fictional data and links to the full case study.</p>
<div class="demo-grid">
${demoArticle(by.pims, root, esc, 'span-full')}
${demoArticle(by['dd-drugs-register'], root, esc, 'span-narrow')}
${demoArticle(by.theoses, root, esc, 'span-wide')}
${demoArticle(by['89lab'], root, esc, 'span-full')}
${demoArticle(by.map, root, esc, 'span-narrow')}
${demoArticle(by.yen, root, esc, 'span-wide')}
</div></section>

<section class="about" id="about" aria-labelledby="about-title"><h2 id="about-title">About me</h2>
${site.about.map(t => `<p>${esc(t)}</p>`).join('')}
<p class="hiring">${esc(site.hiring)} <a href="${site.resume}">Read my résumé</a></p></section>

<section class="contact" id="contact">${B.contact()}</section>
</main>${B.footer(root)}
<script type="module" src="${root}static/main.js"></script></body></html>`;
}

function project({ p, next, site, esc, root }) {
  const hasDemo = p.slug !== 'map';
  return `${B.head({ title: `${p.title} | ${site.name}`, description: p.description, root, fonts })}
<body>${B.nav(root)}
<main class="case">
<header class="case-head"><p><a href="${root}#work">All work</a></p><h1>${esc(p.title)}</h1><p class="category">${esc(p.category)}</p><p class="case-lede">${esc(p.description)}</p></header>
${hasDemo ? `<section class="case-demo" aria-label="Try it">${demos[p.slug](root, p)}</section>` : ''}
${B.gallery(p, root)}
<div class="case-grid"><div class="case-body">${B.caseBody(p)}</div><aside class="sheet case-facts">${B.facts(p)}</aside></div>
<nav class="next" aria-label="Next project"><a href="${root}work/${next.slug}/">Next: ${esc(next.title)}</a></nav>
<section class="contact">${B.contact()}</section>
</main>${B.footer(root)}
<script type="module" src="${root}static/main.js"></script></body></html>`;
}

module.exports = { fonts, licenses, home, project };
