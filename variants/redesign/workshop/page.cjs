// Variant A, "The Workshop": a small clay room modelled in Blender (model/build_workshop.py).
// Every object on the bench is a project; selecting one flies the camera to it.
const B = require('../blocks.cjs');
const { demos } = require('../demos.cjs');

const fonts = ['schibsted-grotesk-latin-wght-normal.woff2'];
const licenses = ['OFL-schibsted-grotesk.txt'];
const thumbs = ['procura', 'pims', 'dd-drugs-register', 'theoses', '89lab', 'map', 'yen'].map(s => `model/thumb-${s}.webp`);
const statics = ['model/workshop.glb', 'model/poster.webp', 'photo/hafiz-portrait.webp', ...thumbs];

// What each project is on the bench, so the index can name the object.
const objectName = { procura: 'Trolley of deliveries', pims: 'Supply cabinet', 'dd-drugs-register': 'Drug safe', theoses: 'Monitor and home server', '89lab': 'Camera, light and microphone', map: 'Phone on its charger', yen: 'Little robot' };

// What a client can ask for, each tied to the projects that prove it.
const services = [
  ['Stock and purchasing apps', 'Know what to buy, raise requests and track every order from request to receipt.', ['procura', 'pims']],
  ['Records with an audit trail', 'Daily counts and corrections that keep the original entry, with a name on every change.', ['dd-drugs-register']],
  ['AI assistants and automation', 'Repeated work done by an agent or a pipeline, with your review before anything goes out.', ['theoses', '89lab', 'yen']],
  ['Android apps', 'Local-first phone apps that work without accounts or tracking.', ['map']],
  ['AI teaching and coaching', 'Learn how to design an AI agent, which tools to use and how to build the system yourself, with me alongside.', ['89lab', 'theoses']]
];

// How a project runs, in order.
const process = [
  ['We talk through your workflow', 'You show me how the work happens today: the spreadsheets, the handovers and the steps that keep repeating.'],
  ['I build a first version on sample data', 'You see something working early, with fictional data, before it touches any real records.'],
  ['We test it with your team', 'The people who will use it try it on real tasks, and I adjust it to how they actually work.'],
  ['I hand it over and support it', 'You get the running app and a walkthrough, and I stay available for fixes and changes.']
];

// Sets day or night before first paint: stored choice, else the device setting. Stills are always day.
const themeScript = `<script>try{var t=localStorage.getItem('workshop-theme')}catch(e){}if(/[?&]still=/.test(location.search))t='light';document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')</script>`;
const toggle = '<button class="theme-toggle" type="button" data-theme-toggle>Lights off</button>';
const nav = root => B.nav(root, '', toggle, `${root}resume/`);
const footer = root => B.footer(root, `${root}resume/`);

// The uneven grid of object renders, shared by the homepage and /projects/.
const workGrid = (projects, root, esc) => `<ul class="work-grid">${projects.map(p => `<li class="work-${p.slug}"><a href="${root}work/${p.slug}/">${thumb(root, p, 'loading="lazy"')}
<span class="work-text"><span class="work-object">${esc(objectName[p.slug])}</span><strong>${esc(p.title)}</strong><span>${esc(p.summary)}</span></span></a></li>`).join('')}</ul>`;

const thumb = (root, p, attrs = '') => `<img src="${root}static/thumb-${p.slug}.webp" alt="" width="640" height="480" ${attrs}>`;

function home({ projects, site, esc, root }) {
  const by = Object.fromEntries(projects.map(p => [p.slug, p]));
  const data = projects.map(p => ({
    slug: p.slug, title: p.title, category: p.category, summary: p.summary, description: p.description,
    image: p.slug === 'map' ? 'map-home-demo.webp' : p.preview || (p.scenes[0] && p.scenes[0][1]) || null,
    disclosure: p.disclosure, steps: p.workflow
  }));
  return `${B.head({ title: site.title, description: site.description, root, fonts,
    route: '/', extra: `${themeScript}<meta name="portfolio-surface" content="workshop"><link rel="preload" href="${root}static/poster.webp" as="image">` })}
<body>
<div class="sky">${nav(root)}
<section class="bench">
<div class="bench-stage" data-stage>
<img class="bench-poster" src="${root}static/poster.webp" alt="A small clay workshop: a desk with a monitor, phone, lamp and robot, a supply cabinet, a drug safe, a trolley of deliveries, and a camera with a ring light." width="1600" height="1200">
<p class="bench-tip" data-tip hidden></p>
<aside class="drawer" data-drawer aria-labelledby="drawer-title" hidden>
<button class="drawer-close" type="button" data-close>Back to the bench</button>
<p class="drawer-kind" data-f="category"></p><h2 id="drawer-title" data-f="title"></h2><p class="drawer-summary" data-f="summary"></p>
<figure data-f="figure"></figure><p data-f="description"></p>
<a class="button" data-f="link" href="#">Read the case study</a>
<div class="drawer-nav"><button type="button" data-step="-1">Previous<span></span></button><button type="button" data-step="1">Next<span></span></button></div></aside>
</div>
<div class="bench-copy"><h1>${esc(site.headline)}</h1><p>${esc(site.sub)}</p>
<p class="actions"><a class="button" href="${site.mailto}">${esc(site.cta)}</a><a class="text-link" href="#work">See the work</a></p>
<div class="bench-index"><p id="index-label">Everything in this room is a project I built. Pick one:</p>
<ul aria-labelledby="index-label">${projects.map(p => `<li><a href="${root}work/${p.slug}/" data-pick="${p.slug}">${esc(p.title)}</a></li>`).join('')}</ul></div></div>
</section></div>
<main>
<section class="services" aria-labelledby="services-title"><h2 id="services-title">What I can do for you</h2>
<ul>${services.map(([h, d, slugs]) => `<li><h3>${h}</h3><p>${d}</p><p class="service-links">${slugs.map(s => `<a href="${root}work/${s}/">${esc(by[s].title)}</a>`).join('')}</p></li>`).join('')}</ul></section>

<section class="work" id="work" aria-labelledby="work-title"><h2 id="work-title">The work, object by object</h2>
${workGrid(projects, root, esc)}</section>

<section class="process" aria-labelledby="process-title"><h2 id="process-title">How a project runs</h2>
<ol>${process.map(([h, d]) => `<li><h3>${h}</h3><p>${d}</p></li>`).join('')}</ol></section>

<section class="about" id="about" aria-labelledby="about-title">
<img class="portrait" src="${root}static/hafiz-portrait.webp" alt="Hafiz Jamali" width="580" height="725" loading="lazy">
<div><h2 id="about-title">About me</h2>
${site.about.map(t => `<p>${esc(t)}</p>`).join('')}
<p class="hiring">${esc(site.hiring)} <a href="${root}resume/">Read my résumé</a></p></div></section>
<section class="contact" id="contact"><h2>${esc(site.contactTitle)}</h2>
<p>Pick what fits and add a line about how the work happens today. It opens an email to me with the details filled in.</p>
<form class="brief" data-brief data-email="${site.email}" novalidate>
<fieldset><legend>What do you need?</legend><div class="chips">${[...services.map(sv => sv[0]), 'Something else'].map((n, i) => `<label class="chip"><input type="checkbox" name="need" value="${n}" id="need-${i}">${n}</label>`).join('')}</div></fieldset>
<fieldset><legend>How many people would use it?</legend><div class="chips">${['Just me', '2 to 10', '11 to 50', 'More than 50'].map((n, i) => `<label class="chip"><input type="radio" name="people" value="${n}" id="people-${i}">${n}</label>`).join('')}</div></fieldset>
<div class="field"><label for="brief-today">How does the work happen today?</label>
<textarea id="brief-today" rows="3" aria-describedby="brief-help"></textarea>
<p class="field-help" id="brief-help">For example: we track stock in three spreadsheets and orders get missed.</p></div>
<p class="field-error" data-brief-error role="alert" hidden></p>
<div class="brief-actions"><button class="button">Write the email</button><a href="mailto:${site.email}">${site.email}</a></div>
<p class="brief-done" data-brief-done hidden>Your email app should open with the draft. If it does not, write to ${site.email}.</p>
</form>
<p class="contact-actions brief-fallback"><a class="button" href="${site.mailto}">${esc(site.cta)}</a><a href="mailto:${site.email}">${site.email}</a></p>
</section>
</main>${footer(root)}
<script type="application/json" id="bench-data">${JSON.stringify({ root, projects: data })}</script>
<script type="module" src="${root}static/main.js"></script></body></html>`;
}

function project({ p, next, site, esc, root }) {
  return `${B.head({ title: `${p.title} | ${site.name}`, description: p.description, root, fonts, route: `/work/${p.slug}/`, extra: themeScript })}
<body>${nav(root)}
<main class="case">
<header class="case-head"><div><p><a href="${root}#work">Back to the bench</a></p><h1>${esc(p.title)}</h1>
<p class="kind">${esc(p.category)}</p><p class="case-lede">${esc(p.description)}</p></div>
<div><div class="object-view" data-object="${p.slug}" data-root="${root}">${thumb(root, p)}</div><p class="object-hint">Drag sideways to turn it.</p></div></header>
${p.slug === 'map' ? '' : `<section class="try" aria-labelledby="try-title"><h2 id="try-title">Try it</h2><p>A small working version of the workflow, running in your browser with fictional data.</p>${demos[p.slug](root, p)}</section>`}
${B.gallery(p, root)}
<div class="case-grid"><div class="case-body">${B.caseBody(p)}</div><aside class="case-facts">${B.facts(p)}</aside></div>
<nav class="next" aria-label="Next project"><a href="${root}work/${next.slug}/">${thumb(root, next, 'loading="lazy"')}<span>Next on the bench<strong>${esc(next.title)}</strong></span></a></nav>
<section class="contact">${B.contact()}</section>
</main>${footer(root)}
<script type="module" src="${root}static/main.js"></script></body></html>`;
}

function projectsPage({ projects, site, esc, root }) {
  return `${B.head({ title: `All projects | ${site.name}`, description: 'Seven projects across procurement, inventory, clinical records, Android, AI agents and content automation.', root, fonts, route: '/projects/', extra: themeScript })}
<body>${nav(root)}
<main class="index-page">
<p><a href="${root}">Back to the bench</a></p>
<h1>All projects</h1>
<p class="index-intro">Business apps, an Android app and AI automation. Each case study shows what the software does, with fictional sample data, and what it does not claim.</p>
${workGrid(projects, root, esc)}
<section class="contact">${B.contact()}</section>
</main>${footer(root)}
<script type="module" src="${root}static/main.js"></script></body></html>`;
}

// The résumé reader is derived from the approved source by resume/preview.cjs (needs the built PDF).
function resumePage({ site, root }, reader) {
  return `${B.head({ title: `Résumé | ${site.name}`, description: 'Hafiz Jamali’s résumé: internal tools developer and AI automation for operations.', root, fonts, route: '/resume/', extra: `${themeScript}<link rel="stylesheet" href="${root}static/resume.css">` })}
<body>${nav(root)}
<main class="resume-page">
<h1>Résumé</h1>
<p class="index-intro">My experience and the systems I’ve built. Download the one-page PDF if you need a copy.</p>
<p class="resume-actions"><a class="button" href="${reader.filename}" download="${reader.filename}">Download PDF</a><a href="${root}">Back to the bench</a></p>
${reader.html}
</main>${footer(root)}
<script type="module" src="${root}static/main.js"></script></body></html>`;
}

module.exports = { fonts, licenses, static: statics, home, project, projectsPage, resumePage };
