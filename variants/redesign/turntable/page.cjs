// Variant B, "Turntable": a photo-studio sweep with a turntable of devices. Scrolling
// through the projects turns the table to the device showing that project's real screens.
const B = require('../blocks.cjs');

const fonts = ['unbounded-latin-wght-normal.woff2', 'figtree-latin-wght-normal.woff2'];
const licenses = ['OFL-unbounded.txt', 'OFL-figtree.txt'];

// Device each project is shown on: laptop for web apps, phone for MAP, tablet for workflow outlines.
const device = { procura: 'laptop', pims: 'laptop', 'dd-drugs-register': 'tablet', theoses: 'laptop', '89lab': 'tablet', map: 'phone', yen: 'tablet' };

function home({ projects, site, esc, root }) {
  const stageData = projects.map(p => ({
    slug: p.slug, title: p.title, device: device[p.slug],
    screen: p.slug === 'map' ? 'map-home-demo.webp' : p.preview || null,
    steps: p.workflow, disclosure: p.disclosure
  }));
  return `${B.head({ title: site.title, description: site.description, root, fonts })}
<body>${B.nav(root)}
<main>
<div class="studio">
<div class="stage" data-stage aria-hidden="true">
<img class="stage-fallback" src="${root}static/procura-inventory.webp" alt="" width="1360" height="860">
<p class="stage-caption" data-caption>${esc(projects[0].disclosure)}</p>
</div>
<div class="reel">
<section class="hero"><h1>${esc(site.headline)}</h1><p>${esc(site.sub)}</p>
<p class="actions"><a class="button" href="${site.mailto}">${esc(site.cta)}</a><a class="text-link" href="#work">See the work</a></p>
<p class="drag-hint js-only">Drag the turntable to look around. Tap a screen to open the project.</p></section>
<div id="work">
${projects.map((p, i) => `<section class="chapter" data-chapter="${i}" aria-labelledby="t-${p.slug}">
<p class="kind">${esc(p.category)}</p><h2 id="t-${p.slug}">${esc(p.title)}</h2>
<p class="summary">${esc(p.summary)}</p><p>${esc(p.description)}</p>
<a class="button button-ghost" href="${root}work/${p.slug}/">Read the case study<span class="sr-only"> for ${esc(p.title)}</span></a></section>`).join('')}
</div></div></div>

<section class="about" id="about" aria-labelledby="about-title"><h2 id="about-title">About me</h2>
<div>${site.about.map(t => `<p>${esc(t)}</p>`).join('')}
<p class="hiring">${esc(site.hiring)} <a href="${site.resume}">Read my résumé</a></p></div></section>
<section class="contact" id="contact">${B.contact()}</section>
</main>${B.footer(root)}
<script type="application/json" id="stage-data">${JSON.stringify({ root, projects: stageData })}</script>
<script type="module" src="${root}static/main.js"></script></body></html>`;
}

function project({ p, next, site, esc, root }) {
  return `${B.head({ title: `${p.title} | ${site.name}`, description: p.description, root, fonts })}
<body>${B.nav(root)}
<main class="case">
<header class="case-head"><p><a href="${root}#work">All work</a></p><p class="kind">${esc(p.category)}</p><h1>${esc(p.title)}</h1><p class="case-lede">${esc(p.description)}</p></header>
<div class="sweep">${B.gallery(p, root)}</div>
<div class="case-grid"><div class="case-body">${B.caseBody(p)}</div><aside class="case-facts">${B.facts(p)}</aside></div>
<nav class="next" aria-label="Next project"><a href="${root}work/${next.slug}/"><span>Next project</span>${esc(next.title)}</a></nav>
<section class="contact">${B.contact()}</section>
</main>${B.footer(root)}
<script type="module" src="${root}static/main.js"></script></body></html>`;
}

module.exports = { fonts, licenses, home, project };
