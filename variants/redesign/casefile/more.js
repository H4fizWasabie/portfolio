// Sample demos on the Theoses, 89lab, MAP and Yen pages (#128). Every entry is fictional; nothing here talks to a system.
// Without this script each Sheet shows its finished sample, as printed by more.cjs. Typed entries, the Stamp, "Start again"
// and the live region follow forms.js; both build them from kit.js.
import { initGalleries } from '../gallery.js';
import { $, reduced, sleep, h, typer, stamper, liveRegion, button, setLabel, again, flag } from './kit.js';

const pause = ms => (reduced() ? Promise.resolve() : sleep(ms));

// A printed tick box with a typed X: '' (open), 'done' or 'fail' (refused).
function mark(li, state) {
  li.className = state;
  li.firstElementChild.textContent = { done: '×', fail: '!' }[state] || '';
  li.lastElementChild.textContent = { done: ', done', fail: ', refused' }[state] || '';
  li.removeAttribute('aria-current');
}
const current = li => li.setAttribute('aria-current', 'step');

function theoses(sheet) {
  const say = liveRegion(sheet), stamp = stamper(sheet).set, t = typer();
  const steps = [...sheet.querySelectorAll('[data-steps] li')];
  const draftCell = $(sheet, '[data-draft]'), draft = $(draftCell, '.val'), draftLab = $(draftCell, '.lab');
  const first = draft.textContent, firstLab = draftLab.textContent;
  const revised = 'Revised: gauze swabs fell below the reorder point on Tuesday, so two purchase orders are ready to approve. Glove use rose compared with last week; the count is attached for checking.';
  const reviewer = sheet.querySelectorAll('.sign .ln')[1];
  const run = button('Run task'), approve = button('Approve'), revise = h('button', { type: 'button', className: 'again' }, 'Ask for changes'), reset = again();
  $(sheet, '.ticket').lastElementChild.before(h('div', { className: 'cell' }, h('div', { className: 'demo-bar' }, run, approve, revise, reset)));

  const words = ['Read', 'Compared'], told = ['Read the inventory export: done.', 'Compared with last week: done.'];
  let busy = false;
  const start = () => {
    t.stop(); busy = false;
    steps.forEach(li => mark(li, ''));
    draftCell.hidden = true; draft.textContent = first; draftLab.textContent = firstLab;
    reviewer.textContent = '';
    run.hidden = false; approve.hidden = revise.hidden = reset.hidden = true;
    stamp('Open', false);
  };
  start();

  run.addEventListener('click', async () => {
    if (busy) return;
    busy = true; run.hidden = true;
    for (const [i, li] of steps.entries()) {
      current(li); await pause(550); mark(li, 'done');
      if (i < 2) { stamp(words[i]); say(told[i]); }
    }
    draftCell.hidden = false;
    await t.type(draft, first);
    stamp('For review'); say('Draft ready. The task has stopped for your review.');
    approve.hidden = revise.hidden = false; busy = false; approve.focus();
  });
  revise.addEventListener('click', async () => {
    if (busy) return;
    busy = true; draftLab.textContent = 'Revised draft for review';
    await t.type(draft, revised);
    stamp('Revised'); say('Draft revised. It is waiting for your review.'); busy = false;
  });
  approve.addEventListener('click', async () => {
    if (busy) return;
    busy = true; approve.hidden = revise.hidden = true;
    await t.type(reviewer, 'M.T.');
    stamp('Approved'); say('Approved. M.T. signed the ticket. Nothing was sent.');
    reset.hidden = false; reset.focus(); busy = false;
  });
  reset.addEventListener('click', () => { start(); say('Demo reset.'); run.focus(); });
}

function lab(sheet) {
  const say = liveRegion(sheet), stamp = stamper(sheet).set, t = typer();
  const stages = [...sheet.querySelectorAll('[data-stages] li')], log = $(sheet, 'tbody');
  const lanes = {
    news: ['AI news', '89lab on Facebook', ['A lab releases a smaller open model', 'An editor adds agent mode', 'A new speech model runs on a laptop']],
    repo: ['GitHub repo', 'YouTube Shorts and Threads', ['A terminal coding agent', 'A local voice assistant', 'A browser automation kit']],
    concept: ['AI concept', '89lab on Facebook', ['What a context window is', 'How tool calling works', 'Why agents need memory']],
  };
  const refused = 'Upload refused: daily limit reached. The finished video went to Telegram for manual posting.';
  const lane = h('fieldset', { className: 'cell pick' }, h('legend', { className: 'lab' }, 'Channel'),
    ...Object.entries(lanes).map(([k, [name]], i) => h('label', { className: 'opt' }, h('input', { type: 'radio', name: 'lane', value: k, checked: i === 0 }), name)));
  const limit = h('input', { type: 'checkbox', name: 'limit' });
  const run = button('Run the sheet'), reset = again();
  $(sheet, '.run').before(h('div', { className: 'cells two' }, lane,
    h('div', { className: 'cell' }, h('p', { className: 'lab' }, 'Upload'), h('label', { className: 'opt' }, limit, 'Daily upload limit reached'), h('div', { className: 'demo-bar' }, run, reset))));

  const empty = h('tr', { className: 'empty' }, h('td', { className: 'none', colSpan: 4 }, 'No runs yet today.'));
  const added = [];
  let published, n, busy = false;
  // A row of the ledger: the cells type on together, except one left blank to type later.
  const row = (cls, cells) => {
    const tr = h('tr', { className: cls }), tds = cells.map(([label, , c]) => h('td', { 'data-label': label, className: c || '' }));
    tr.append(...tds); log.append(tr); added.push(tr);
    return { tds, typing: Promise.all(cells.map(([, text], i) => text && t.type(tds[i], text))) };
  };
  const start = () => {
    t.stop(); busy = false; published = { news: 0, repo: 0, concept: 0 }; n = 0;
    added.length = 0; log.replaceChildren(empty);
    stages.forEach(li => mark(li, ''));
    lane.querySelector('input').checked = true; limit.checked = false;
    setLabel(run, 'Run the sheet'); run.disabled = false; reset.hidden = true;
    stamp('Ready', false);
  };
  start();

  run.addEventListener('click', async () => {
    if (busy) return;
    busy = true; run.disabled = true; empty.remove();
    const k = lane.querySelector(':checked').value, [name, where, topics] = lanes[k], handOff = limit.checked, done = published[k];
    stamp('Running'); say(`Running the ${name} channel.`);
    stages.forEach(li => mark(li, ''));
    if (done) await row('skipped', [['Run', '', 'n'], ['Channel', name], ['Topic', `“${topics[(done - 1) % topics.length]}”`], ['Result', 'Skipped: already posted, so the next topic was picked.']]).typing;
    const entry = row('', [['Run', String(++n), 'n'], ['Channel', name], ['Topic', topics[done % topics.length]], ['Result', '']]);
    await entry.typing;
    for (const [i, li] of stages.entries()) { current(li); await pause(380); mark(li, i === 6 && handOff ? 'fail' : 'done'); }
    await t.type(entry.tds[3], handOff ? refused : `Published to ${where}.`);
    if (!handOff) published[k]++;
    stamp(handOff ? 'Handed off' : 'Published');
    say(handOff ? 'The upload limit was reached. The finished video went to Telegram for manual posting.' : `Published to ${where}.`);
    busy = false; run.disabled = false; setLabel(run, 'Run again'); reset.hidden = false;
  });
  reset.addEventListener('click', () => { if (busy) return; start(); say('Demo reset.'); run.focus(); });
}

// The approved screens become tabs: one at a time, arrow keys move between them (gallery.js).
function map(sheet) {
  const box = $(sheet, '[data-screens]'), figs = [...box.children];
  const tabs = figs.map((f, i) => {
    f.setAttribute('role', 'tabpanel'); f.setAttribute('aria-labelledby', `screen-t${i}`); f.hidden = i > 0;
    return h('button', { type: 'button', role: 'tab', id: `screen-t${i}`, className: 'tab', 'aria-controls': f.id, 'aria-selected': String(i === 0), tabIndex: i ? -1 : 0 }, f.dataset.name);
  });
  box.before(h('div', { className: 'tabs', role: 'tablist', 'aria-label': 'MAP screens' }, ...tabs));
  box.parentNode.setAttribute('data-gallery', '');
  box.classList.add('tabbed');
  initGalleries();
}

function yen(sheet) {
  const say = liveRegion(sheet), stamp = stamper(sheet).set, t = typer();
  const thread = $(sheet, '.thread'), seed = [...thread.children].slice(0, 2).map(li => li.cloneNode(true));
  const replies = ['Not yet. It is still a draft waiting for your approval.', 'Done. I will remind you here on Friday.', 'Yes, same conversation. Ask me anything about it.'];
  const prompts = ['Did the gauze order go out?', 'Remind me again from here.', 'Is this still the same conversation?', ''];
  const input = h('input', { type: 'text', id: 'yen-say', name: 'say', autocomplete: 'off' });
  const channels = ['Terminal', 'Telegram', 'Browser'].map((c, i) => h('label', { className: 'opt' }, h('input', { type: 'radio', name: 'channel', value: c, checked: i === 0 }), c));
  const send = button('Send', 'submit'), reset = again();
  const form = h('form', { className: 'cells two', noValidate: true },
    h('fieldset', { className: 'cell pick' }, h('legend', { className: 'lab' }, 'Message taken on'), ...channels),
    h('label', { className: 'cell field' }, h('span', { className: 'lab' }, 'Your message'), input, h('span', { className: 'err', id: 'err-say' })),
    h('div', { className: 'cell full' }, h('div', { className: 'demo-bar' }, send, reset)));
  $(sheet, '[data-ticks]').replaceWith(form);
  input.addEventListener('input', () => flag(input, ''));

  const line = (who, text, cls = '') => {
    const body = h('span'), li = h('li', { className: cls }, h('span', { className: 'who' }, who), body);
    thread.append(li);
    return t.type(body, text);
  };
  let turn, last, busy = false;
  const start = () => {
    t.stop(); busy = false; turn = 0; last = 'Terminal';
    thread.replaceChildren(...seed.map(li => li.cloneNode(true)));
    input.value = prompts[0]; flag(input, '');
    channels[0].firstElementChild.checked = true; reset.hidden = true;
    stamp('Message taken', false);
  };
  start();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    const text = input.value.trim();
    if (!text) { flag(input, 'Write a message first.'); input.focus(); return; }
    busy = true;
    const channel = form.elements.channel.value, reply = replies[turn % replies.length];
    input.value = ''; reset.hidden = false;
    await line(channel, text);
    await line('Yen', reply, 'is-agent');
    input.value = prompts[++turn % prompts.length];
    if (channel !== last) stamp('Same thread');
    last = channel; busy = false;
    say(`Sent from ${channel}. Yen replied in the same conversation: ${reply}`);
  });
  reset.addEventListener('click', () => { start(); say('Demo reset.'); input.focus(); });
}

const sheet = document.querySelector('[data-form]');
if (sheet) ({ theoses, '89lab': lab, map, yen })[sheet.dataset.form](sheet);
