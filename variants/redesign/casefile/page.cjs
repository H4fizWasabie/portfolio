// Variant "The Case File" (production): the portfolio is a book of carbonless duplicate forms on a desk (ADR 0003, DESIGN.md).
// The homepage is the "Record of work" Sheet, a Sheet for each system in production (each shaped like the form it replaced, with a
// Sample demo that forms.js turns on), a continuation Sheet, Particulars and the Request form. Project facts come from
// projects.cjs, site wording from content.cjs; what is only about a form (its rows, its department and status) is here.
// Each project page is a minimal Sheet for now (tickets #127 to #129 build the pages out).
const B = require('../blocks.cjs');
const D = require('./diagrams.cjs');

const fonts = ['archivo-latin-wdth-normal.woff2', 'courier-prime-latin-400-normal.woff2', 'courier-prime-latin-700-normal.woff2'];
const licenses = ['OFL-archivo.txt', 'OFL-courier-prime.txt'];
const preload = fonts.slice(0, 2); // the bold Courier is fetched when a sheet needs it
const statics = ['../workshop/photo/hafiz-portrait.webp'];

const arr = '<svg class="arr" width="16" height="16" aria-hidden="true"><use href="#arr"/></svg>';
const symbol = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="arr" viewBox="0 0 16 16"><path d="M1.5 8h12M9 3.5 13.5 8 9 12.5" fill="none" stroke="currentColor" stroke-width="1.6"/></symbol></svg>`;
const two = (n, w = 4) => String(n).padStart(w, '0');

// The four systems in production, each on the form it replaced. Sheet order is content.cjs order.
const forms = {
  pims: { color: 'pink', title: 'Stock request', dept: 'Veterinary hospital · stock and inventory', status: 'In production', stamp: ['In production', -5, 0, 0], shots: 2 },
  'dd-drugs-register': { color: 'canary', title: 'Daily count', dept: 'Veterinary hospital · clinical recordkeeping', status: 'In daily clinical use since September 2026', stamp: ['In daily use', 5, 60, 30] },
  procura: { color: 'blue', title: 'Purchase order', dept: 'Veterinary hospital · purchasing', status: 'In production', stamp: ['In production', -9, 110, 90], shots: 1 },
  cavelms: { color: 'green', title: 'Course certificate', dept: 'Client · training company', status: 'Live at cavelms.com; CaveText on the Chrome Web Store', stamp: ['Live', 3, 40, 120] }
};
const sampleNote = '<p class="sample">Sample entries, fictional</p>';
const stampOf = ([text, rot, mx, my]) => `<span class="stamp" style="--rot:${rot}deg;--mx:${mx}px;--my:${my}px" aria-hidden="true">${text}</span>`;

const btn = (href, label, attrs = '') => `<a class="btn" href="${href}"${attrs}>${label} ${arr}</a>`;
const sheetHead = (esc, { tag = 'h2', id, title, sub, serial = '' }) => `<div class="head">
  <div><${tag}${id ? ` id="${id}"` : ''} class="form-title">${esc(title)}</${tag}><p class="sub">${esc(sub)}</p></div>${serial}
 </div>`;
const serial = (no, cap) => `\n  <p class="serial"><span class="no">No. ${two(no)}</span><span class="cap">${cap}</span></p>`;
const fieldCells = (esc, pairs) => `<div class="cells two fields">${pairs.map(([l, v]) => `<div class="cell"><p class="lab">${l}</p><p class="val">${esc(v)}</p></div>`).join('')}</div>`;

// A printed table: rows of [label, value] pairs (the label shows as a caption on phones). A value is escaped unless it is {html}.
const table = (esc, { caption, cls = 'register slip', head, rows }) => `<table class="${cls}">
    <caption class="sr">${esc(caption)}</caption>
    <thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr${r.cls ? ` class="${r.cls}"` : ''}>${r.cells.map(([label, v, cls], i) => `<td data-label="${esc(label)}"${cls ? ` class="${cls}"` : ''}>${v && v.html ? v.html : esc(v)}</td>`).join('')}</tr>`).join('\n     ')}</tbody>
   </table>`;
const lines = (esc, items, cls) => `<ul class="${cls}">${items.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;

// The sections of a Sheet's body, from the project's facts. Areas are laid out by style.css on the homepage.
const part = {
  problem: (p, esc, areas) => p.problem && `<div class="cell${areas ? ' a-problem' : ''}"><h3 class="lab">The problem</h3><p>${esc(p.problem)}</p></div>`,
  built: (p, esc, areas, label = 'What I built') => `<div class="cell${areas ? ' a-built' : ''}"><h3 class="lab">${label}</h3><p>${esc(p.built)}</p></div>`,
  how: (p, esc, areas) => `<div class="cell${areas ? ' a-how' : ''}"><h3 class="lab">How it works</h3><ol class="items">${p.workflow.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>`,
  limits: (p, esc, areas) => `<div class="cell${areas ? ' a-limits' : ''}"><h3 class="lab">What it doesn’t do</h3><p>${esc(p.limits)}</p></div>`,
  stack: (p, esc, areas) => `<div class="cell${areas ? ' a-stack' : ''}"><h3 class="lab">Built with</h3>${lines(esc, p.stack, 'chips')}</div>`,
  facts: (p, esc, areas) => p.facts && `<div class="cell${areas ? ' a-facts' : ''}"><h3 class="lab">On record</h3>${lines(esc, p.facts, 'lines')}</div>`
};
const body = (p, esc, order, cls, areas = true, extra = '') => `<div class="cells two body${cls ? ' ' + cls : ''}">
  ${order.map(k => part[k](p, esc, areas)).filter(Boolean).join('\n  ')}${extra}
 </div>`;

const shot = (root, p, esc, [name, file, caption]) => `<figure class="shot">${B.img(root, file, `${p.title}: ${name}. ${caption}`, 'loading="lazy" decoding="async"')}<figcaption><b>${esc(name)}.</b> ${esc(p.disclosure)}</figcaption></figure>`;
const shots = (root, p, esc, n) => `<div class="shots${n > 1 ? ' two' : ''}">${p.scenes.slice(0, n).map(s => shot(root, p, esc, s)).join('')}</div>`;
const now = inner => `<div class="cells">\n  <div class="cell"><p class="wn">Now</p>${inner}</div>\n </div>`;

// What each system's Sheet holds besides the shared body: the printed form with its sample entries.
const sheets = {
  pims: (p, { esc, root }) => `<div class="cells slipside">
  <div class="cell">
   <h3 class="lab">Stock requisition slip</h3>
   ${table(esc, {
     caption: 'Stock requisition slip, sample lines', head: ['Item', 'Description', 'Qty', 'Unit', 'Dept'],
     rows: [['Surgical gloves, M', 10, 'box', 'Theatre'], ['Syringe 3 ml', 5, 'box', 'Ward'], ['Gauze swab 10×10', 12, 'pack', 'Ward'], ['Bandage, 5 cm', 8, 'roll', 'Theatre']]
       .map((r, i) => ({ cells: [['Item', String(i + 1), 'n'], ['Description', r[0]], ['Qty', String(r[1])], ['Unit', r[2]], ['Dept', r[3]]] }))
   })}
   ${sampleNote}
   <p class="sign"><span>Requested by <span class="ln">A.R.</span></span><span>Approved by <span class="ln">M.T.</span></span><span>Received by <span class="ln"></span></span></p>
  </div>
  <div class="cell"><p class="wn">Was</p>${D.pimsWas}<p class="cap2"><b>Diagram:</b> the paper process this replaced.</p></div>
 </div>
 ${body(p, esc, ['problem', 'built', 'how', 'limits', 'stack', 'facts'])}
 ${now(shots(root, p, esc, 2))}`,

  'dd-drugs-register': (p, { esc }) => `<div class="cells">
  <div class="cell">
   <h3 class="lab">Daily count ledger</h3>
   ${table(esc, {
     caption: 'Daily count ledger, sample entries', head: ['Date', 'Item', 'Physical count', 'System count', 'Difference', 'Initials'],
     rows: [['03 Oct', 'Item A', 40, 40, 0, 'A.R.'], ['03 Oct', 'Item B', 12, 12, 0, 'A.R.'], ['04 Oct', 'Item A', 38, 38, 0, 'M.T.'], ['04 Oct', 'Item B', 11, 12, '−1', 'M.T.']]
       .map(r => ({ cls: r[4] === '−1' ? 'flag' : '', cells: [['Date', r[0]], ['Item', r[1]], ['Physical count', String(r[2])], ['System count', String(r[3])],
         ['Difference', r[4] === '−1' ? { html: '<span><b>−1</b> <span class="mark">discrepancy</span></span>' } : String(r[4])], ['Initials', r[5]]] }))
   })}
   ${sampleNote}
  </div>
 </div>
 ${body(p, esc, ['problem', 'built', 'limits', 'how', 'diag', 'stack', 'facts'], 'dd')}`,

  procura: (p, { esc, root }) => `<div class="cells two po">
  <div class="cell"><h3 class="lab">Vendor</h3><p class="val">Sample Medical Supplies Sdn Bhd (fictional)</p></div>
  <div class="cell"><h3 class="lab">Ship to</h3><p class="val">Veterinary hospital store</p></div>
 </div>
 <div class="cells">
  <div class="cell">
   <h3 class="lab">Order lines</h3>
   ${table(esc, {
     caption: 'Purchase order lines, sample', head: ['Line', 'Description', 'Qty', 'Unit'],
     rows: [['Gauze swab 10×10', 15, 'pack'], ['Syringe 3 ml', 10, 'box'], ['Bandage, 5 cm', 24, 'roll']]
       .map((r, i) => ({ cells: [['Line', String(i + 1), 'n'], ['Description', r[0]], ['Qty', String(r[1])], ['Unit', r[2]]] }))
   })}
   ${sampleNote}
  </div>
 </div>
 ${body(p, esc, ['problem', 'built', 'how', 'limits', 'stack', 'facts'], 'pair')}
 <div class="cells wasnow">
  <div class="cell wasnow-was"><p class="wn">Was</p>${D.procuraWas}<p class="cap2"><b>Diagram:</b> the setup this replaced.</p></div>
  <div class="cell wasnow-now"><p class="wn">Now</p>${shots(root, p, esc, 1)}</div>
 </div>`,

  cavelms: (p, { esc }) => `<div class="cells">
  <div class="cell">
   <h3 class="lab">PDF certificate, as issued</h3>
   <div class="cert">
    <p class="pre">Certificate of completion</p>
    <p class="pre">Awarded to</p>
    <p class="who val">Sample Learner (fictional)</p>
    <p class="pre">For completing</p>
    <p class="who val">Sample Course</p>
    ${sampleNote}
   </div>
  </div>
 </div>
 ${body(p, esc, ['built', 'how', 'limits', 'stack'], 'pair')}
 ${body(p.cavetext, esc, ['built', 'how', 'limits', 'stack'], 'pair').replace('<h3 class="lab">What I built</h3>', '<h3 class="lab">Attached: CaveText</h3>')}`
};

// The dd body places the diagram between the facts it sits beside (style.css, .body.dd).
part.diag = (p, esc) => `<div class="cell a-diag"><p class="wn">Now</p><figure class="shot">${D.ddNow}<figcaption><b>Diagram:</b> workflow outline, not the hospital interface.</figcaption></figure></div>`;

const sheet = (p, n, count, ctx) => {
  const f = forms[p.slug], { esc, root } = ctx;
  const cls = ['sheet', f.color, 'perf', 'case', !p.problem && 'noproblem', !p.facts && 'nofacts'].filter(Boolean).join(' ');
  const foot = p.slug === 'cavelms'
    ? `${btn(p.url, 'Visit CaveLMS', ' rel="noopener"')} ${btn(p.cavetext.store, 'CaveText on the Chrome Web Store', ' rel="noopener"')}`
    : btn(`${root}work/${p.slug}/`, 'Full case study');
  return `<section class="${cls}" id="${p.slug}" aria-labelledby="${p.slug}-h">
 ${sheetHead(esc, { id: `${p.slug}-h`, title: `${f.title} · ${p.title}`, sub: p.category, serial: serial(n, `item ${n} of ${count}`) })}
 ${fieldCells(esc, [['Department', f.dept], ['Status', f.status]])}
 ${sheets[p.slug](p, ctx)}
 <div class="foot">${foot}${stampOf(f.stamp)}</div>
</section>`;
};

// One line of the Register: the homepage links it to the system's Sheet, /projects/ to its page and adds a Status cell.
const registerRow = (esc, p, i, href, status) => {
  const r = p.register || p.listing;
  return { cells: [['Item', String(i + 1), 'n'], ['System', { html: `<span><a href="${href}">${esc(r.label || p.title)}</a> <span class="note">${esc(r.note)}</span></span>` }, 'sys'], ['Was', r.was], ['Now', r.now], ...(status ? [['Status', status]] : [])] };
};

// The first Sheet: what Hafiz does, and the Register of systems in production.
const first = (made, site, esc) => `<div id="top" class="stack">
 <div class="copy canary" aria-hidden="true"></div>
 <div class="copy pink" aria-hidden="true"></div>
 <section class="sheet white first" aria-labelledby="statement">
  ${sheetHead(esc, { tag: 'p', title: site.formTitle, sub: site.formSub, serial: serial(made.length, 'systems in production') })}
  <h1 id="statement" class="statement">${esc(site.statement)}</h1>
  ${fieldCells(esc, [['Replaces', site.replaces], ['Where', site.where]])}
  <div class="register-wrap">
   ${table(esc, {
     caption: 'Systems in production, with what each replaced', cls: 'register', head: ['Item', 'System', 'Was', 'Now'],
     rows: made.map((p, i) => registerRow(esc, p, i, `#${p.slug}`))
   })}
   <span class="stamp over" style="--mx:30px;--my:100px" aria-hidden="true">In use</span>
  </div>
  <div class="foot"><a class="plain" href="resume/">Read the résumé</a>${btn('#request', 'Request work')}</div>
 </section>
</div>`;

const more = (rest, start, root, esc) => `<section class="sheet white perf narrow" aria-labelledby="more-h">
 ${sheetHead(esc, { id: 'more-h', title: 'Continuation sheet', sub: 'also built' })}
 ${table(esc, {
   caption: 'Other work, one line each', cls: 'register more', head: ['Item', 'Project', 'Entry'],
   rows: rest.map((p, i) => ({ cells: [['Item', String(start + i), 'n'], ['Project', { html: `<a href="${root}work/${p.slug}/">${esc(p.title)}</a>` }, 'sys'], ['Entry', p.entry]] }))
 })}
 <div class="foot"><span class="stamp" style="--rot:-2deg;--mx:90px;--my:10px" aria-hidden="true">Filed</span></div>
</section>`;

const about = (root, site, esc) => `<section class="sheet canary perf narrow" id="about" aria-labelledby="about-h">
 ${sheetHead(esc, { id: 'about-h', title: 'Particulars', sub: 'who built these systems' })}
 <div class="about">
  <figure class="portrait">
   <figcaption class="lab">Photo</figcaption>
   <img src="${root}static/hafiz-portrait.webp" width="580" height="725" alt="Portrait of ${esc(site.name)}" loading="lazy" decoding="async">
  </figure>
  <div class="cells two fields">
   ${site.particulars.map(([l, v], i) => `<div class="cell${i > 1 ? ' full' : ''}"><p class="lab">${l}</p><p class="val">${esc(v)}</p></div>`).join('\n   ')}
  </div>
 </div>
 <div class="foot"><span class="links">${btn(`${root}resume/`, 'Résumé')}${btn(site.github, 'GitHub', ' rel="noopener"')}</span><span class="stamp" style="--rot:6deg;--mx:20px;--my:70px" aria-hidden="true">On file</span></div>
</section>`;

const request = (site, esc) => `<section class="sheet white perf narrow" id="request" aria-labelledby="request-h">
 ${sheetHead(esc, { id: 'request-h', title: site.requestTitle, sub: site.requestSub, serial: serial(5, 'next in line') })}
 <form action="mailto:${site.email}" method="post" enctype="text/plain" data-request>
  <div class="cells">
   <label class="cell field"><span class="lab">What does your team do today, and what gets repeated?</span><textarea name="message" rows="5" required autocomplete="off"></textarea><span class="err" id="err-message">Tell me a little about what your team does today.</span></label>
  </div>
  <div class="cells two">
   <label class="cell field"><span class="lab">Your name</span><input type="text" name="name" required autocomplete="name"><span class="err" id="err-name">Add your name.</span></label>
   <label class="cell field"><span class="lab">Your email</span><input type="email" name="email" required autocomplete="email" inputmode="email"><span class="err" id="err-email">Add an email address I can reply to, like name@example.com.</span></label>
  </div>
  <div class="hp" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></div>
  <p class="fail" role="alert" hidden><span class="why"></span> Email <a href="mailto:${site.email}">${site.email}</a> instead.</p>
  <div class="foot">
   <div class="send"><button class="btn" type="submit"><span>Send request</span> ${arr}</button><p>Or email <a href="mailto:${site.email}">${site.email}</a></p></div>
   <p class="done" tabindex="-1" hidden>${esc(site.requestDone)}</p>
   <div class="office"><span class="lab">For office use</span><span class="stamp" style="--rot:-7deg;--mx:50px;--my:40px" hidden aria-hidden="true">Received</span></div>
  </div>
 </form>
</section>`;

// Shell shared by every page: the desk bar, the sheets, the footer and the one script.
const deskbar = (root, site, esc) => `${symbol}
<a class="skip" href="#main">Skip to content</a>
<header class="deskbar">
 <a class="mark" href="${root ? root : '#top'}">${esc(site.name)}</a>
 <nav aria-label="Primary">
  <a href="${root}#work">Work</a>
  <a href="${root}#about">About</a>
  <a href="${root}resume/">Résumé</a>
  <a class="req" href="${root}#request">${esc(site.requestSend)}</a>
 </nav>
</header>`;
const shell = ({ title, description, route, root, site, esc, main, extra = '' }) => `${B.head({ title, description, root, fonts: preload, route, extra: `<meta name="theme-color" content="#2f3b33"><meta name="portfolio-surface" content="casefile">${extra}` })}
<body>
${deskbar(root, site, esc)}
<main id="main">
${main}
</main>

<footer class="deskfoot">
 <p>${esc(site.deskNote)}</p>
 <p>© ${esc(site.name)}</p>
</footer>
<script type="module" src="${root}static/main.js"></script>
</body></html>`;

function home({ projects, site, esc, root }) {
  const made = projects.filter(p => forms[p.slug]), rest = projects.filter(p => !forms[p.slug]), ctx = { esc, root };
  return shell({ title: site.title, description: site.description, route: '/', root, site, esc, main: `${first(made, site, esc)}

<div id="work">

${made.map((p, i) => sheet(p, i + 1, made.length, ctx)).join('\n\n')}
</div>

${more(rest, made.length + 1, root, esc)}

${about(root, site, esc)}

${request(site, esc)}` });
}

// A minimal Sheet per project until the Case File pages are built out: the project's facts and links.
function project({ p, next, site, esc, root }) {
  const links = [p.url && btn(p.url, `Visit ${esc(p.title)}`, ' rel="noopener"'), p.cavetext && btn(p.cavetext.store, 'CaveText on the Chrome Web Store', ' rel="noopener"'),
    p.source && btn(p.source, 'Source on GitHub', ' rel="noopener"'), p.releases && btn(p.releases, 'APK releases on GitHub', ' rel="noopener"')].filter(Boolean);
  return shell({ title: `${p.title} | ${site.name}`, description: p.description, route: `/work/${p.slug}/`, root, site, esc, main: `<section class="sheet ${forms[p.slug]?.color || 'white'} perf narrow" aria-labelledby="project-h">
 ${sheetHead(esc, { tag: 'h1', id: 'project-h', title: p.title, sub: p.category })}
 <div class="cells"><div class="cell"><p class="lab">What it is</p><p class="val">${esc(p.description)}</p></div></div>
 ${body(p, esc, ['problem', 'built', 'how', 'limits', 'stack', 'facts'], '', false, p.cavetext ? `\n  ${part.built(p.cavetext, esc, false, 'Attached: CaveText')}\n  ${part.how(p.cavetext, esc, false)}\n  ${part.limits(p.cavetext, esc, false)}\n  ${part.stack(p.cavetext, esc, false)}` : '')}
 <div class="foot"><span class="links">${btn(`${root}#${p.slug}`, 'Back to the Record of work')}${links.join('')}</span></div>
</section>
<p class="more-link"><a href="${root}work/${next.slug}/">Next: ${esc(next.title)}</a></p>` });
}

// #129 /projects/: the full Register, one Sheet with every project as a row linking its page.
function projectsPage({ projects, site, esc, root }) {
  return shell({ title: `All work | ${site.name}`, description: 'Every project: internal tools and AI automation that replace paper forms and spreadsheets.', route: '/projects/', root, site, esc, main: `<section class="sheet white perf" aria-labelledby="all-h">
 ${sheetHead(esc, { tag: 'h1', id: 'all-h', title: 'Register of work', sub: 'every project, what it replaced and where it stands', serial: serial(projects.length, 'projects on record') })}
 <div class="register-wrap">
  ${table(esc, {
    caption: 'All projects, with what each replaced and where it stands', cls: 'register all', head: ['Item', 'System', 'Was', 'Now', 'Status'],
    rows: projects.map((p, i) => registerRow(esc, p, i, `${root}work/${p.slug}/`, forms[p.slug]?.status || p.listing.status))
  })}
  <span class="stamp over" style="--mx:0px;--my:0px" aria-hidden="true">On file</span>
 </div>
 <div class="foot">${btn(root, 'Back to the Record of work')}${btn(`${root}resume/`, 'Résumé')}</div>
</section>` });
}

// #129 /resume/: the reader on a Sheet. The reader is derived from the approved source by resume/preview.cjs (needs the built PDF).
function resumePage({ site, esc, root }, reader) {
  return shell({ title: `Résumé | ${site.name}`, description: 'Hafiz Jamali’s résumé: internal tools developer and AI automation for operations.', route: '/resume/', root, site, esc,
    extra: `<link rel="stylesheet" href="${root}static/resume.css">`, main: `<section class="sheet white perf resume-sheet" aria-labelledby="resume-h">
 ${sheetHead(esc, { tag: 'h1', id: 'resume-h', title: 'Résumé', sub: 'My experience and the systems I’ve built.' })}
 <div class="foot"><span class="links"><a class="btn" href="${reader.filename}" download="${reader.filename}">Download PDF ${arr}</a>${btn(root, 'Back to the Record of work')}</span></div>
 <div class="resume-wrap">${reader.html}</div>
</section>` });
}

module.exports = { fonts, licenses, static: statics, home, project, projectsPage, resumePage };
