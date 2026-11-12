// The Case File pages for Theoses, 89lab, MAP and Yen (#128): one Sheet each, on a form of its own, carrying that
// project's demo restyled in the form vocabulary. Each Sheet prints its finished sample, so the page reads
// completely without JavaScript; more.js turns the sample into the working demo. Project facts, including each project's status, come from projects.cjs.
// page.cjs hands in its shared pieces (kit) so there is one copy of the Sheet markup.
const B = require('../blocks.cjs');

// What each form is called and says about its project. The stamp is [word, rotation, mask x, mask y].
const forms = {
  theoses: { color: 'blue', title: 'Work ticket', dept: 'Self-hosted · assistant and coding agent', stamp: ['For review', -6, 20, 40] },
  '89lab': { color: 'canary', title: 'Daily run sheet', dept: 'Content pipelines · AI news, lessons and videos', stamp: ['Published', 4, 70, 20] },
  map: { color: 'green', title: 'Screen capture sheet', dept: 'Android · personal utility', stamp: ['In daily use', -4, 0, 80] },
  yen: { color: 'pink', title: 'While you were out', dept: 'Go · AI agent', stamp: ['Same thread', 5, 100, 50] }
};

const stageNames = ['Pick topic', 'Check sources', 'Write script', 'Voiceover', 'Captions', 'Render', 'Publish', 'Record'];
const draft = 'Gauze swabs dropped below the reorder point on Tuesday. Two purchase orders are ready for Tanjung Clinical and Meridian Medical. Glove use is up on last week.';
const done = label => `<li class="done"><span class="box" aria-hidden="true">×</span>${label}<span class="sr">, done</span></li>`;

// The printed sample inside each Sheet. A tick box is a typed ×; entries are typed black (style.css).
const demos = {
  theoses: (p, { esc }, k) => `<div class="cells ticket">
  <div class="cell"><h3 class="lab">Task</h3><p class="val">Draft this week’s stock report</p></div>
  <div class="cell"><h3 class="lab">Steps</h3><ol class="checks" data-steps>${['Read the inventory export', 'Compare with last week', 'Draft the report'].map(s => done(esc(s))).join('')}</ol></div>
  <div class="cell" data-draft><h3 class="lab">Draft for review</h3><p class="val">${esc(draft)}</p></div>
  <div class="cell">
   <p class="sign"><span>Requested by <span class="ln">A.R.</span></span><span>Reviewed by <span class="ln"></span></span></p>
   ${k.sampleNote}
   <p class="hint">Staged demo: the portfolio sends no messages, creates no orders and changes no files.</p>
  </div>
 </div>`,

  '89lab': (p, { esc }, k) => `<div class="cells run">
  <div class="cell"><h3 class="lab">Stages of a run</h3><ol class="track stages" data-stages>${stageNames.map(s => done(esc(s))).join('')}</ol></div>
  <div class="cell">
   <h3 class="lab">Run sheet, today</h3>
   ${k.table(esc, {
     caption: 'Run sheet, sample entries', cls: 'register slip', head: ['Run', 'Channel', 'Topic', 'Result'],
     rows: [['AI news', 'A lab releases a smaller open model', 'Published to 89lab on Facebook.'], ['GitHub repo', 'A terminal coding agent', 'Published to YouTube Shorts and Threads.'], ['AI concept', 'What a context window is', 'Published to 89lab on Facebook.']]
       .map((r, i) => ({ cells: [['Run', String(i + 1), 'n'], ['Channel', r[0]], ['Topic', r[1]], ['Result', r[2]]] }))
   })}
   ${k.sampleNote}
   <p class="hint">Nothing is published from this page.</p>
  </div>
 </div>`,

  map: (p, { esc, root }, k) => `<div class="cells">
  <div class="cell">
   <h3 class="lab">Screens, pasted on this page</h3>
   <div class="screens" data-screens>${p.scenes.map(([name, file, caption], i) => `<figure class="screen" id="screen-p${i}" data-name="${esc(name)}"><a href="${root}static/${file}">${B.img(root, file, `${p.title}: ${name}. ${caption}`, 'decoding="async"')}</a><figcaption><b>${esc(name)}.</b> ${esc(caption)}</figcaption></figure>`).join('')}</div>
   ${k.sampleNote}
   <p class="hint">${esc(p.disclosure)}</p>
  </div>
 </div>`,

  yen: (p, { esc }, k) => {
    const li = (who, text, cls = '') => `<li${cls ? ` class="${cls}"` : ''}><span class="who">${who}</span><span>${esc(text)}</span></li>`;
    return `<div class="cells" data-ticks>
  <div class="cell">
   <h3 class="lab">While you were out</h3>
   <p class="val">One conversation and one memory, whichever channel you use</p>
   <p class="lab ticks-lab">Message taken on</p>
   <ul class="ticks">${['Terminal', 'Telegram', 'Browser'].map(c => `<li><span class="box" aria-hidden="true">×</span>${c}</li>`).join('')}</ul>
  </div>
 </div>
 <div class="cells">
  <div class="cell">
   <h3 class="lab">Message</h3>
   <ul class="lines thread" aria-label="The conversation">${[
     li('Terminal', 'Remind me to check the gauze order on Friday.'), li('Yen', 'Noted for Friday.', 'is-agent'),
     li('Telegram', 'Did the gauze order go out?'), li('Yen', 'Not yet. It is still a draft waiting for your approval.', 'is-agent'),
     li('Browser', 'Remind me again from here.'), li('Yen', 'Done. I will remind you here on Friday.', 'is-agent')].join('')}</ul>
   ${k.sampleNote}
   <p class="hint">Architecture demo, not a running agent. Nothing is sent.</p>
  </div>
 </div>`;
  }
};

function project({ p, next, projects, site, esc, root }, k) {
  const f = forms[p.slug], n = projects.indexOf(p) + 1;
  const cls = ['sheet', f.color, 'perf', 'case', !p.problem && 'noproblem', !p.facts && 'nofacts'].filter(Boolean).join(' ');
  const links = [k.btn(`${root}#request`, 'Request work'), p.source && k.btn(p.source, 'Source on GitHub', ' rel="noopener"'), p.releases && k.btn(p.releases, 'APK releases on GitHub', ' rel="noopener"'),
    `<a class="plain" href="${root}resume/">Read the résumé</a>`, `<a class="plain" href="${root}projects/">All work</a>`].filter(Boolean).join('');
  return k.shell({ title: `${p.title} | ${site.name}`, description: p.description, route: `/work/${p.slug}/`, root, site, esc, main: `<section class="${cls}" id="sheet" data-form="${p.slug}" aria-labelledby="project-h">
 ${k.sheetHead(esc, { tag: 'h1', id: 'project-h', title: `${f.title} · ${p.title}`, sub: p.category, serial: k.serial(n, `item ${n} of ${projects.length}`) })}
 ${k.fieldCells(esc, [['Department', f.dept], ['Status', p.listing.status]])}
 <div class="cells"><div class="cell"><h3 class="lab">What it is</h3><p class="val">${esc(p.description)}</p></div></div>
 ${demos[p.slug](p, { esc, root }, k)}
 ${k.body(p, esc, ['problem', 'built', 'how', 'limits', 'stack', 'facts'])}
 <div class="foot"><span class="links">${links}</span>${k.stampOf(f.stamp)}</div>
</section>
<p class="more-link"><a href="${root}work/${next.slug}/">Next: ${esc(next.title)}</a></p>` });
}

module.exports = { project };
