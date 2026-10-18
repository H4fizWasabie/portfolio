// Variant A, "The Workshop": a small clay room modelled in Blender (model/build_workshop.py).
// Every object on the bench is a project; selecting one flies the camera to it.
const B = require('../blocks.cjs');
const { demos } = require('../demos.cjs');
const { site } = require('../content.cjs');

const fonts = ['schibsted-grotesk-latin-wght-normal.woff2'];
const licenses = ['OFL-schibsted-grotesk.txt'];
const thumbs = ['procura', 'pims', 'dd-drugs-register', 'theoses', '89lab', 'map', 'yen'].flatMap(s => [`model/thumb-${s}.webp`, `model/thumb-${s}-night.webp`]);
const statics = ['model/workshop.glb', 'model/poster.webp', 'photo/hafiz-portrait.webp', ...thumbs];

// What each project is on the bench, so the index can name the object.
const objectName = { procura: 'Trolley of deliveries', pims: 'Supply cabinet', 'dd-drugs-register': 'Drug safe', theoses: 'Monitor and home server', '89lab': 'Camera, light and microphone', map: 'Phone on its charger', yen: 'Little robot' };

// What a client can ask for. The homepage shelves each project under the service it proves;
// teaching has no object of its own, so its row is a short note instead of cards.
const services = [
  ['Stock and purchasing apps', 'Know what to buy, raise requests and track every order from request to receipt.', ['procura', 'pims']],
  ['Records with an audit trail', 'Daily counts and corrections that keep the original entry, with a name on every change.', ['dd-drugs-register']],
  ['AI assistants and automation', 'Repeated work done by an agent or a pipeline, with your review before anything goes out.', ['theoses', '89lab', 'yen']],
  ['Android apps', 'Local-first phone apps that work without accounts or tracking.', ['map']],
  ['AI teaching and coaching', 'Learn how to design an AI agent, which tools to use and how to build the system yourself, with me alongside.', []]
];
const coaching = `mailto:${site.email}?subject=${encodeURIComponent('Coaching session')}&body=${encodeURIComponent('What I want to build or learn:\n\nJust me, or a team (how many people)?\n\nWhen suits me:\n')}`;
const teaching = root => `<div class="shelf-note"><p>My <a href="${root}work/89lab/">content pipelines</a> publish AI news, a GitHub project to learn from and an AI concept explained every day. I coach people and teams who want to design and build their own agents and automation.</p>
<p class="shelf-action"><a class="button" href="${coaching}">Book a coaching session</a></p></div>`;

// About: three chapters, each shown by one of the room's objects (or the portrait). The words are the
// owner's About copy, kept exactly as written.
const chapters = [
  ['Background', 'portrait', 'Operations first, then software', 'Four years building systems, with AI automation at the core, coming from hands-on procurement, pharmacy and emergency care. PIMS, Procura and the DD Drugs Register run daily at the veterinary hospital where I work.'],
  ['How I work', 'pims', 'Requirements → build → measure', 'I model the data around the real workflow, put it in front of the people who use it, and let the numbers decide what\'s next. My own AI agent tests, reviews and ships changes through pull requests, including to this site.'],
  ['Now', 'theoses', 'Agents that run on their own', 'Running Theoses, my self-hosted AI agent: about 30 scheduled jobs and 730+ commits in six weeks. Also building agent harnesses from scratch in Go (Neo, Fender, Mino), with more than a dozen public repositories on AI automation and agent design.']
];
// One column per chapter. Without JavaScript every chapter shows; about.js opens one at a time (style.css).
const portrait = root => `<img class="portrait" src="${root}static/hafiz-portrait.webp" alt="Hafiz Jamali" width="580" height="725" loading="lazy">`;
const colonnade = (root, esc) => `<ul class="colonnade" data-colonnade>${chapters.map(([label, slug, head, text], i) => `<li class="chapter${i ? '' : ' is-open'}">
<button class="chapter-tab" type="button" aria-expanded="true" aria-controls="chapter-${i}"><span>${two(i + 1)}</span>${esc(label)}</button>
<div class="chapter-view" id="chapter-${i}">${slug === 'portrait' ? portrait(root) : thumb(root, { slug }, 'loading="lazy"')}<div class="chapter-panel"><h3>${esc(head)}</h3><p>${esc(text)}</p></div></div></li>`).join('')}</ul>`;

// Sets day or night before first paint: stored choice, else the device setting.
// Stills are day unless render-stills.cjs asks for night.
const themeScript = `<script>try{var t=localStorage.getItem('workshop-theme')}catch(e){}if(/[?&]still=/.test(location.search))t=/[?&]night=1/.test(location.search)?'dark':'light';document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')</script>`;
// The whole homepage sits in the room: wide or phone layout, chosen before first paint so nothing
// jumps when the room loads. room.js keeps it current and removes it if the room cannot start;
// without JavaScript, with reduced motion or in ?still= renders the page keeps its static layout.
const roomScript = `<script>(function(){if(/[?&]still=/.test(location.search)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;document.documentElement.dataset.room=matchMedia('(max-width: 899px), (orientation: portrait)').matches?'phone':'wide'})()</script>`;
const toggle = '<button class="theme-toggle" type="button" aria-pressed="false" data-theme-toggle>Night</button>';
// Phones keep a short contact button in the bar, since the hero's button sits below the room;
// the links drop to a second row there (style.css), so nothing has to be hidden.
const nav = (root, site, esc) => `<a class="skip" href="#main">Skip to content</a><header class="site-nav"><a class="brand" href="${root || './'}">${esc(site.name)}</a>
<nav aria-label="Main"><a href="${root}#work">Work</a><a href="${root}#about">About</a><a href="${root}resume/">Résumé</a></nav>
<div class="nav-actions">${toggle}<a class="button button-small" href="${root}#contact"><span class="cta-long">${esc(site.cta)}</span><span class="cta-short">${esc(site.ctaShort)}</span></a></div></header>`;
// Words, or letters, each in a clipped span so the scroll can raise them one after another (style.css).
const rise = (parts, esc) => parts.map((w, i) => (w === ' ' ? ' ' : `<span class="w"><span style="--i:${i}">${esc(w)}</span></span>`)).join('');
const words = (text, esc) => rise(text.split(/( )/), esc);
// The name set large where the room ends (the goodbye shot on the homepage), rising letter by letter as it comes into view.
const wordmark = `<p class="wordmark" aria-hidden="true" data-stop data-look="@end">${rise([...site.name], s => s)}</p>`;
const footer = root => `${wordmark}${B.footer(root, `${root}resume/`)}`;

const card = (p, root, esc, num) => `<li class="work-${p.slug}"><a href="${root}work/${p.slug}/">${thumb(root, p, 'loading="lazy"')}
<span class="work-text">${num ? `<span class="tour-count">${num}</span>` : ''}<span class="work-object">${esc(objectName[p.slug])}</span><strong>${esc(p.title)}</strong><span>${esc(p.proof || p.summary)}</span></span></a></li>`;

// /projects/: every object render in one uneven grid.
const workGrid = (projects, root, esc) => `<ul class="work-grid">${projects.map(p => card(p, root, esc)).join('')}</ul>`;

// Homepage: one shelf per service, the projects that prove it beside it. data-look names what the
// room shows while the shelf is on screen (room.js); teaching has no object, so it shows the desk.
const shelves = (by, root, esc) => {
  const all = Object.keys(by), num = s => `${two(all.indexOf(s) + 1)} / ${two(all.length)}`;
  return `<div class="shelves">${services.map(([h, d, slugs]) => `<section class="shelf" data-stop data-look="${slugs.join(' ') || '@teach'}"><div class="shelf-panel"><div class="shelf-head"><h3>${h}</h3><p>${d}</p></div>
${slugs.length ? `<ul class="shelf-items">${slugs.map(s => card(by[s], root, esc, num(s))).join('')}</ul>` : teaching(root)}</div></section>`).join('')}</div>`;
};

// One stop per project. Phones: each card rides the bottom of the screen over the room while the
// camera rests on its object (room.js). Wide screens: these are only the scroll distance, and the
// large caption (tour-card) shows the name instead. Shown only while the room is the background.
const two = n => String(n).padStart(2, '0');
const steps = (projects, esc) => `<ol class="tour-steps" data-steps>${projects.map((p, i) => `<li data-stop data-look="${p.slug}"><div class="step-card"><p class="tour-count">${two(i + 1)} / ${two(projects.length)}</p>
<p class="tour-object">${esc(objectName[p.slug])}</p><p class="tour-title">${esc(p.title)}</p><p class="tour-summary">${esc(p.proof || p.summary)}</p>
<button class="button" type="button" data-open="${p.slug}">Open the project</button></div></li>`).join('')}</ol>`;

// Day and night renders of the same object; the theme shows one (the hidden one is never fetched).
const thumb = (root, p, attrs = '') => ['', '-night'].map(v => `<img class="thumb${v || '-day'}" src="${root}static/thumb-${p.slug}${v}.webp" alt="" width="640" height="480" ${attrs}>`).join('');

function home({ projects, site, esc, root }) {
  const by = Object.fromEntries(projects.map(p => [p.slug, p]));
  const data = projects.map(p => ({
    slug: p.slug, title: p.title, object: objectName[p.slug], category: p.category, summary: p.proof || p.summary, description: p.description,
    image: p.slug === 'map' ? 'map-home-demo.webp' : p.preview || (p.scenes[0] && p.scenes[0][1]) || null,
    disclosure: p.disclosure, steps: p.workflow
  }));
  return `${B.head({ title: site.title, description: site.description, root, fonts,
    route: '/', extra: `${themeScript}${roomScript}<meta name="portfolio-surface" content="workshop"><link rel="preload" href="${root}static/poster.webp" as="image">` })}
<body>
<div class="tour" data-tour><div class="sky">${nav(root, site, esc)}
<section class="bench">
<div class="bench-stage" data-stage>
<img class="bench-poster" src="${root}static/poster.webp" alt="A small clay workshop: a desk with a monitor, phone, lamp and robot, a supply cabinet, a drug safe, a trolley of deliveries, and a camera with a ring light." width="1600" height="1200">
<p class="bench-tip" data-tip hidden></p>
<p class="bench-hint" data-hint hidden>Tap anything in the room to open it</p>
</div>
<aside class="drawer" data-drawer aria-labelledby="drawer-title" hidden>
<button class="drawer-close" type="button" data-close>Back to the bench</button>
<h2 id="drawer-title" data-f="title"></h2><p class="drawer-kind" data-f="category"></p><p class="drawer-summary" data-f="summary"></p>
<figure data-f="figure"></figure><p data-f="description"></p>
<a class="button" data-f="link" href="#">Read the case study</a>
<div class="drawer-nav"><button type="button" data-step="-1">Previous<span></span></button><button type="button" data-step="1">Next<span></span></button></div></aside>
<div class="tour-card is-away" data-tour-card><p class="tour-count" data-t="count"></p><p class="tour-object" data-t="object"></p>
<p class="tour-title" data-t="title"></p><p class="tour-summary" data-t="summary"></p><button class="button" type="button" data-t="open">Open the project</button></div>
<div class="bench-copy"><div class="bench-panel"><h1>${esc(site.headline)}</h1><p>${esc(site.sub)}</p>
<p class="actions"><a class="button" href="#contact">${esc(site.cta)}</a><a class="text-link" href="#work">See the work</a></p>
<div class="bench-index"><p id="index-label">Everything in this room is a project I built. Pick one:</p>
<ul aria-labelledby="index-label">${projects.map(p => `<li><a href="${root}work/${p.slug}/" data-pick="${p.slug}">${esc(p.title)}</a></li>`).join('')}</ul></div></div></div>
${steps(projects, esc)}</section></div></div>
<main id="main">
<section class="work" id="work" aria-labelledby="work-title"><h2 id="work-title" class="rise">${words('What I can do for you', esc)}</h2>
${shelves(by, root, esc)}</section>
${wordmark}

<section class="about" id="about" aria-labelledby="about-title"><h2 id="about-title" class="rise">${words('About me', esc)}</h2>
${colonnade(root, esc)}
<p class="hiring">${esc(site.hiring)} <a href="${root}resume/">Read my résumé</a></p></section>
<section class="contact contact-block" id="contact" aria-labelledby="contact-title"><h2 id="contact-title" class="rise">${words(site.contactTitle, esc)}</h2>
<p>${esc(site.contactBody)} ${esc(site.based)}</p>
<div class="contact-reach"><a class="contact-mail" href="${site.mailto}">${site.email}</a>
<form class="enquiry" data-enquiry data-email="${site.email}" action="mailto:${site.email}?subject=Project%20enquiry" method="post" enctype="text/plain" novalidate>
<fieldset><legend>What do you need?</legend><div class="chips">${services.map(sv => sv[0]).map((n, i) => `<label class="chip"><input type="checkbox" name="need" value="${n}" id="need-${i}">${n}</label>`).join('')}</div></fieldset>
<fieldset><legend>How many people would use it?</legend><div class="chips">${['Just me', '2 to 10', '11 to 50', 'More than 50'].map((n, i) => `<label class="chip"><input type="radio" name="people" value="${n}" id="people-${i}">${n}</label>`).join('')}</div></fieldset>
<div class="field"><label for="enquiry-today">How does the work happen today?</label>
<textarea id="enquiry-today" name="today" rows="3" maxlength="4500" aria-describedby="enquiry-help"></textarea>
<p class="field-help" id="enquiry-help">For example: we track stock in three spreadsheets and orders get missed.</p>
<p class="field-error" id="enquiry-today-error" data-error="today" role="alert" hidden></p></div>
<fieldset><legend>Who should I reply to?</legend><div class="enquiry-who">
<div class="field"><label for="enquiry-name">Your name</label><input id="enquiry-name" name="name" type="text" autocomplete="name" maxlength="200">
<p class="field-error" id="enquiry-name-error" data-error="name" role="alert" hidden></p></div>
<div class="field"><label for="enquiry-email">Your email</label><input id="enquiry-email" name="email" type="email" autocomplete="email" maxlength="254" inputmode="email">
<p class="field-error" id="enquiry-email-error" data-error="email" role="alert" hidden></p></div></div></fieldset>
<div class="enquiry-trap" aria-hidden="true"><label>Leave this empty<input name="website" type="text" tabindex="-1" autocomplete="off"></label></div>
<p class="field-help">I only use your name and email to reply to you.</p>
<div class="enquiry-actions"><button class="button" data-enquiry-send>Send enquiry</button><a href="mailto:${site.email}">${site.email}</a></div>
<div class="enquiry-failed" data-enquiry-failed hidden><p class="field-error" data-enquiry-failure role="alert"></p>
<p>You can write to <a href="mailto:${site.email}">${site.email}</a> instead. This message is ready to send from your mail app, or copy it.</p>
<p><a class="button" data-enquiry-mail href="mailto:${site.email}">Open in your mail app</a></p>
<textarea readonly rows="7" data-enquiry-text aria-label="Your message"></textarea>
<p class="enquiry-copy"><button type="button" class="button" data-enquiry-copy>Copy message</button><span role="status" data-enquiry-copied></span></p></div>
</form>
<div class="enquiry-sent" data-enquiry-sent role="status" tabindex="-1" hidden></div>
<p class="contact-links"><a href="${site.github}">GitHub</a><a href="${root}resume/">Résumé</a></p>
<p class="contact-actions enquiry-fallback"><a class="button" href="${site.mailto}">${esc(site.cta)}</a><a href="mailto:${site.email}">${site.email}</a></p></div>
</section>
</main>${B.footer(root, `${root}resume/`)}
<script type="application/json" id="bench-data">${JSON.stringify({ root, projects: data })}</script>
<script type="module" src="${root}static/main.js"></script></body></html>`;
}

function project({ p, next, site, esc, root }) {
  return `${B.head({ title: `${p.title} | ${site.name}`, description: p.description, root, fonts, route: `/work/${p.slug}/`, extra: themeScript })}
<body>${nav(root, site, esc)}
<main id="main" class="case">
<header class="case-head"><div><p><a href="${root}projects/">All projects</a></p><h1>${esc(p.title)}</h1>
<p class="kind">${esc(p.category)}</p><p class="case-lede">${esc(p.description)}</p>${p.proof ? `<p class="case-proof">${esc(p.proof)}</p>` : ''}</div>
<div><div class="object-view" data-object="${p.slug}" data-root="${root}">${thumb(root, p, 'loading="lazy"')}</div><p class="object-hint">Drag sideways to turn it.</p></div></header>
${p.slug === 'map' ? '' : `<section class="try" aria-labelledby="try-title"><h2 id="try-title">Try it</h2><p>A small working version of the workflow, running in your browser with fictional data.</p>${demos[p.slug](root, p)}</section>`}
${p.scenes.length ? B.gallery(p, root) : ''}
<div class="case-grid"><div class="case-body">${B.caseBody(p)}</div><aside class="case-facts">${B.facts(p)}</aside></div>
<nav class="next" aria-label="Next project"><a href="${root}work/${next.slug}/">${thumb(root, next, 'loading="lazy"')}<span>Next project<strong>${esc(next.title)}</strong></span></a></nav>
<section class="contact">${B.contact(`${root}#contact`)}</section>
</main>${footer(root)}
<script type="module" src="${root}static/main.js"></script></body></html>`;
}

function projectsPage({ projects, site, esc, root }) {
  return `${B.head({ title: `All projects | ${site.name}`, description: 'Seven projects across procurement, inventory, clinical records, Android, AI agents and content automation.', root, fonts, route: '/projects/', extra: themeScript })}
<body>${nav(root, site, esc)}
<main id="main" class="index-page">
<p><a href="${root}">Back to the homepage</a></p>
<h1>All projects</h1>
<p class="index-intro">Business apps, an Android app and AI automation. Each case study shows what the software does, with fictional sample data, and what it does not claim.</p>
${workGrid(projects, root, esc)}
<section class="contact">${B.contact(`${root}#contact`)}</section>
</main>${footer(root)}
<script type="module" src="${root}static/main.js"></script></body></html>`;
}

// The résumé reader is derived from the approved source by resume/preview.cjs (needs the built PDF).
function resumePage({ site, esc, root }, reader) {
  return `${B.head({ title: `Résumé | ${site.name}`, description: 'Hafiz Jamali’s résumé: internal tools developer and AI automation for operations.', root, fonts, route: '/resume/', extra: `${themeScript}<link rel="stylesheet" href="${root}static/resume.css">` })}
<body>${nav(root, site, esc)}
<main id="main" class="resume-page">
<h1>Résumé</h1>
<p class="index-intro">My experience and the systems I’ve built. Download the one-page PDF if you need a copy.</p>
<p class="resume-actions"><a class="button" href="${reader.filename}" download="${reader.filename}">Download PDF</a><a href="${root}">Back to the homepage</a></p>
${reader.html}
</main>${footer(root)}
<script type="module" src="${root}static/main.js"></script></body></html>`;
}

module.exports = { fonts, licenses, static: statics, home, project, projectsPage, resumePage };
