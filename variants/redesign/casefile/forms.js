// Sample forms as small working demos. Every entry is fictional; nothing here talks to a system.
// Without this script each sheet shows its filled-in sample (and the "Was" diagram) as printed by page.cjs.
import { $, reduced, h, typer, stamper, liveRegion, button, setLabel, again, flag, cellHead } from './kit.js';

const TODAY = '05 Oct'; // the fictional "today" of the sample ledger

// Lift the top sheet: the top form sits over a pink carbon copy holding the "Was" diagram.
// Lifted, the sheet hinges at its top edge and tilts back under a perspective (keep FOLD in step with .lift-stage in style.css).
// footprint() is the height that tilted sheet covers, so the copy leaves that much room above its diagram.
// The button names what is underneath: the paper process the system replaced.
const FOLD = { deg: 64, persp: 1200 };
const LIFT = 'See the paper process underneath';
const footprint = H => {
  const a = FOLD.deg * Math.PI / 180;
  return Math.ceil(H * Math.cos(a) * FOLD.persp / (FOLD.persp + H * Math.sin(a))) + 6;
};

function makeLift(heading, formNodes, copyNodes, say) {
  const btn = h('button', { type: 'button', className: 'btn lift-btn', 'aria-pressed': 'false' }, LIFT);
  const form = h('div', { className: 'lift-form' }, ...formNodes);
  const copy = h('div', { className: 'lift-copy' }, ...copyNodes);
  const stage = h('div', { className: 'lift-stage' }, copy, form);
  const el = h('div', { className: 'lift' }, h('div', { className: 'lift-bar' }, heading, btn), stage);
  let slide;
  const set = on => {
    const from = stage.offsetHeight;
    slide?.cancel();
    if (on) stage.style.setProperty('--fp', `${footprint(form.offsetHeight)}px`);
    el.classList.toggle('lifted', on);
    form.inert = on;
    btn.setAttribute('aria-pressed', on);
    btn.textContent = on ? 'Put it back' : LIFT;
    // The stage closes up around the copy when lifted and opens again when put back.
    const to = stage.offsetHeight;
    if (!reduced() && from !== to) slide = stage.animate({ height: [`${from}px`, `${to}px`] }, { duration: 450, easing: 'cubic-bezier(.16,1,.3,1)' });
    say(on ? 'Top sheet lifted. The paper process underneath is showing.' : 'Top sheet laid back.');
  };
  btn.addEventListener('click', () => set(!el.classList.contains('lifted')));
  el.addEventListener('keydown', e => {
    if (e.key === 'Escape' && el.classList.contains('lifted')) { set(false); btn.focus(); }
  });
  return el;
}

function pims() {
  const sheet = $('#pims'), say = liveRegion(sheet), st = stamper(sheet), t = typer();
  const row = $(sheet, '.slipside'), [slipCell, wasCell] = row.children;
  const heading = $(slipCell, '.lab'), sign = $(slipCell, '.sign');

  // Signature line: blank until each step types into it.
  const [, apprLn, recvLn] = sign.querySelectorAll('.ln');
  apprLn.textContent = '';
  const orderLn = h('span', { className: 'ln' }), dateLn = h('span', { className: 'ln' });
  apprLn.parentNode.after(h('span', {}, 'Order no. ', orderLn));
  recvLn.parentNode.after(h('span', {}, 'Received on ', dateLn));

  const names = ['Requested', 'Approved', 'Ordered', 'Received'];
  const stages = names.map(n => h('li', {}, h('span', { className: 'box', 'aria-hidden': 'true' }), n, h('span', { className: 'sr' })));
  const track = h('ol', { className: 'track', 'aria-label': 'Request status' }, ...stages);
  const log = h('ul', { className: 'lines log' });
  const go = button('Approve request'), reset = again();
  const hint = h('p', { className: 'hint' }, 'Approve the request, then follow it through ordering and receipt.');

  const steps = [
    { label: 'Create order', type: () => [[apprLn, 'M.T.']], entry: 'Procurement approved the requisition.', stamp: 'Approved', tell: 'Approved. M.T. signed the slip.' },
    { label: 'Record receipt', type: () => [[orderLn, 'PO-2291']], entry: 'Order PO-2291 went to Sample Medical Supplies Sdn Bhd (fictional).', stamp: 'Ordered', tell: 'Ordered. Order number PO-2291 typed on the slip.' },
    { type: () => [[recvLn, 'S.K.'], [dateLn, `${TODAY} 2026`]], entry: 'Stores received the order and recorded the receipt.', stamp: 'Received', tell: 'Received. S.K. signed and the date is typed on the slip.' },
  ];
  let at = 0, busy = false;
  const paint = () => stages.forEach((li, i) => {
    li.classList.toggle('done', i <= at);
    li.firstElementChild.textContent = i <= at ? '×' : '';
    li.lastElementChild.textContent = i <= at ? ', done' : '';
    i === at ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current');
  });
  const entry = text => { const li = h('li'); log.append(li); return t.type(li, text); };

  const start = () => {
    t.stop(); at = 0; busy = false;
    for (const n of [apprLn, orderLn, recvLn, dateLn]) n.textContent = '';
    log.replaceChildren(h('li', {}, 'Theatre and Ward raised the requisition.'));
    setLabel(go, 'Approve request'); go.hidden = false; reset.hidden = true;
    st.set('Requested', false); paint();
  };
  start();

  go.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    const s = steps[at++];
    paint();
    await Promise.all([...s.type().map(([n, x]) => t.type(n, x)), entry(s.entry)]);
    st.set(s.stamp);
    say(s.tell);
    busy = false;
    if (s.label) setLabel(go, s.label);
    else { go.hidden = true; reset.hidden = false; reset.focus(); }
  });
  reset.addEventListener('click', () => { start(); say('Demo reset to the requested step.'); go.focus(); });

  const lift = makeLift(heading, [track, ...[...slipCell.children].filter(c => c !== heading), hint, h('div', { className: 'demo-bar' }, go, reset), log], wasCell.childNodes, say);
  row.replaceWith(lift);
}

function dd() {
  const sheet = $('#dd-drugs-register'), say = liveRegion(sheet), st = stamper(sheet), t = typer();
  const tbody = $(sheet, 'tbody'), added = [];
  const input = h('input', { type: 'text', className: 'write', inputMode: 'numeric', id: 'dd-count', name: 'count', value: '12', autocomplete: 'off' });
  // Each reason corrects the count it explains: a recount fixes the physical count, the others bring the system in line with the shelf.
  const reasons = {
    'Breakage recorded on the ward': n => `system count reduced from 14 to ${n}; breakage recorded on the ward.`,
    'Dispensing not yet entered': n => `system count reduced from 14 to ${n}; dispensing entered.`,
    'Receipt not yet entered': n => `system count raised from 14 to ${n}; receipt not yet entered.`,
    'Recount: counting error': n => `recount found 14; physical count corrected from ${n} to 14.`
  };
  const reasonsFor = n => n < 14 ? ['Breakage recorded on the ward', 'Dispensing not yet entered', 'Recount: counting error'] : ['Receipt not yet entered', 'Recount: counting error'];
  const reasonSel = h('select', { id: 'dd-reason' });
  const reasonCell = h('label', { className: 'cell field full', hidden: true }, h('span', { className: 'lab' }, 'Reason for the difference'), reasonSel);
  const submit = button('Submit count', 'submit'), correct = button('Record correction'), reset = again();
  correct.hidden = true;
  const form = h('form', { className: 'cells two', noValidate: true },
    h('label', { className: 'cell field' }, h('span', { className: 'lab' }, 'Physical count of Item A'), input, h('span', { className: 'err', id: 'err-count' })),
    h('div', { className: 'cell' }, h('p', { className: 'lab' }, 'System count of Item A'), h('p', { className: 'val' }, '14')),
    reasonCell,
    h('div', { className: 'cell full' }, h('p', { className: 'hint' }, 'The system expects 14 of Item A. Type what is on the shelf, then submit the count.'), h('div', { className: 'demo-bar' }, submit, correct, reset)));
  $(sheet, '.fields').after(form);
  input.addEventListener('input', () => flag(input, ''));

  async function addRow(cls, build) {
    const jobs = [], tr = h('tr', { className: cls });
    const td = (label, text, attrs, tag = 'td') => { const n = h(tag, { 'data-label': label, ...attrs }); jobs.push([n, text]); return n; };
    build(tr, td, jobs);
    tbody.append(tr);
    added.push(tr);
    await Promise.all(jobs.map(([n, x]) => t.type(n, x)));
  }

  let n, busy = false;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy || input.readOnly) return;
    const v = input.value.trim();
    n = Number(v);
    if (!/^\d{1,2}$/.test(v)) { flag(input, 'Enter a whole number from 0 to 99.'); input.focus(); return; }
    busy = true;
    input.readOnly = true; submit.hidden = true;
    const diff = n - 14;
    if (!diff) {
      await addRow('', (tr, td) => tr.append(td('Date', TODAY), td('Item', 'Item A'), td('Physical count', String(n)), td('System count', '14'), td('Difference', '0 Balanced'), td('Initials', 'A.R.')));
      st.set('Balanced'); say('Count of 14 matches the system count. A ledger row marked Balanced was added.');
      reset.hidden = false; reset.focus();
    } else {
      const sign = (diff > 0 ? '+' : '−') + Math.abs(diff);
      await addRow('flag', (tr, td, jobs) => {
        const b = h('b'), mark = h('span', { className: 'mark' });
        jobs.push([b, sign], [mark, 'discrepancy']);
        tr.append(td('Date', TODAY), td('Item', 'Item A'), td('Physical count', String(n)), td('System count', '14'), h('td', { 'data-label': 'Difference' }, h('span', {}, b, ' ', mark)), td('Initials', 'M.T.'));
      });
      reasonSel.replaceChildren(...reasonsFor(n).map(r => h('option', {}, r)));
      reasonCell.hidden = false; correct.hidden = false;
      say(`Count of ${n} differs from the system count by ${sign}. A discrepancy row was added. Choose a reason, then record a correction.`);
      reasonSel.focus();
    }
    busy = false;
  });
  correct.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    const reason = reasonSel.value;
    reasonCell.hidden = true; correct.hidden = true;
    await addRow('', (tr, td) => tr.append(td('Date', TODAY), td('Item', 'Item A'),
      td('Correction', `Correction to entry of today: ${reasons[reason](n)}`, { colSpan: 3 }), td('Initials', 'M.T.')));
    st.set('Corrected'); say('Correction row added, referring to the flagged entry of today. The original entry is unchanged.');
    reset.hidden = false; reset.focus(); busy = false;
  });
  reset.addEventListener('click', () => {
    t.stop(); busy = false;
    added.splice(0).forEach(tr => tr.remove());
    input.readOnly = false; input.value = '12'; flag(input, '');
    submit.hidden = false; correct.hidden = true; reset.hidden = true; reasonCell.hidden = true;
    st.restore(); say('Demo reset.'); input.focus();
  });
}

function procura() {
  const sheet = $('#procura'), say = liveRegion(sheet), st = stamper(sheet), t = typer();
  const po = $(sheet, '.po'), orderCells = po.nextElementSibling, orderBody = $(orderCells, 'tbody');
  const sampleLines = [...orderBody.children].map(r => r.cloneNode(true));

  const items = [['Gauze swab 10×10', 51, 50, 'pack'], ['Syringe 3 ml', 7, 6, 'box'], ['Bandage, 5 cm', 25, 24, 'roll'], ['Surgical gloves, M', 21, 20, 'box']];
  const table = h('table', { className: 'register slip stock' });
  table.innerHTML = '<caption class="sr">Reorder check, sample counts</caption><thead><tr><th scope="col">Item</th><th scope="col">On hand</th><th scope="col">Reorder at</th><th scope="col">Check</th></tr></thead><tbody></tbody>';
  const rows = items.map(([name, have, at, unit]) => {
    const r = { name, at, unit, start: have, have, num: h('span', { className: 'num' }), check: h('td', { 'data-label': 'Check' }) };
    const step = (sign, d) => {
      const b = h('button', { type: 'button', className: 'stepbtn', 'aria-label': `${d < 0 ? 'One fewer' : 'One more'} ${name}` }, sign);
      b.addEventListener('click', () => {
        if (busy) return;
        r.have = Math.max(0, Math.min(999, r.have + d));
        paint(r); undraft();
        say(`${name}: ${r.have} on hand, ${r.have <= r.at ? 'at or below' : 'above'} the reorder point of ${r.at}.`);
      });
      return b;
    };
    r.tr = h('tr', {}, h('td', { 'data-label': 'Item' }, name), h('td', { 'data-label': 'On hand' }, h('span', { className: 'stepper' }, step('−', -1), r.num, step('+', 1))), h('td', { 'data-label': 'Reorder at' }, String(at)), r.check);
    return r;
  });
  const paint = r => {
    const low = r.have <= r.at;
    r.num.textContent = r.have;
    r.tr.classList.toggle('flag', low);
    r.check.replaceChildren(low ? h('span', { className: 'low' }, 'reorder') : 'ok');
  };
  rows.forEach(paint);
  $(table, 'tbody').append(...rows.map(r => r.tr));

  const msg = h('p', { className: 'val msg' });
  const draftBtn = button('Draft purchase order'), reset = again();
  let busy = false, drafted = false;

  function undraft() {
    msg.textContent = '';
    if (!drafted) return;
    t.stop(); drafted = false;
    orderBody.replaceChildren(...sampleLines.map(r => r.cloneNode(true)));
    reset.hidden = true; st.restore();
  }
  draftBtn.addEventListener('click', async () => {
    if (busy) return;
    undraft();
    const low = rows.filter(r => r.have < r.at);
    busy = true;
    if (!low.length) {
      const text = 'Nothing is at or below its reorder point, so there is nothing to order.';
      say(text); await t.type(msg, text); busy = false; return;
    }
    const jobs = [];
    orderBody.replaceChildren(...low.map((r, i) => {
      const d = h('td', { 'data-label': 'Description' }), q = h('td', { 'data-label': 'Qty' }), u = h('td', { 'data-label': 'Unit' });
      jobs.push([d, r.name], [q, String(2 * r.at - r.have)], [u, r.unit]);
      return h('tr', {}, h('td', { className: 'n', 'data-label': 'Line' }, String(i + 1)), d, q, u);
    }));
    const text = `${low.length} order ${low.length > 1 ? 'lines' : 'line'} drafted from items at or below their reorder point.`;
    await Promise.all([...jobs.map(([n, x]) => t.type(n, x)), t.type(msg, text)]);
    drafted = true; busy = false;
    st.set('Drafted'); say(text); reset.hidden = false; reset.focus();
  });
  reset.addEventListener('click', () => {
    rows.forEach(r => { r.have = r.start; paint(r); });
    undraft(); busy = false; say('Demo reset.'); draftBtn.focus();
  });

  // The reorder check comes first, as it drafts the order lines; the lifted sheet is the purchase order form alone.
  const was = $(sheet, '.wasnow-was'), before = po.previousElementSibling, head = cellHead(sheet);
  const stock = h('div', { className: 'cells' }, h('div', { className: 'cell' }, h(head, { className: 'lab' }, 'Reorder check'), table,
    h('p', { className: 'hint' }, 'Lower a count to its reorder point or below, then draft the purchase order.'), h('div', { className: 'demo-bar' }, draftBtn, reset), msg));
  const lift = makeLift(h(head, { className: 'lab' }, 'Purchase order'), [po, orderCells], was.childNodes, say);
  const wasnow = $(sheet, '.wasnow');
  wasnow.classList.add('solo');
  was.remove();
  if (!wasnow.firstElementChild) wasnow.remove(); // the homepage Sheet has no screens beside the Was diagram
  before.after(stock, lift);
}

function cave() {
  const sheet = $('#cavelms'), say = liveRegion(sheet), st = stamper(sheet), t = typer();
  const cert = $(sheet, '.cert'), whos = [...cert.querySelectorAll('.who')], first = whos.map(w => w.textContent);
  const course = 'Sample Course: Reading a stock card';
  const questions = [
    { q: 'A stock card shows 10 on hand, 20 received and 5 issued. What is the balance?', opts: ['15', '25', '35'], ans: '25' },
    { q: 'Which document records that goods arrived?', opts: ['Purchase order', 'Goods received note', 'Invoice'], ans: 'Goods received note' },
  ];
  const name = h('input', { type: 'text', className: 'write', id: 'exam-name', name: 'name', maxLength: 40, autocomplete: 'off' });
  const sets = questions.map((q, i) => {
    const err = h('span', { className: 'err', id: `err-q${i + 1}` });
    const fs = h('fieldset', { className: 'cell q' }, h('legend', { className: 'lab' }, `${i + 1}. ${q.q}`),
      ...q.opts.map(o => h('label', { className: 'opt' }, h('input', { type: 'radio', name: `q${i + 1}`, value: o }), o)), err);
    fs.addEventListener('change', () => { fs.classList.remove('wrong'); fs.removeAttribute('aria-describedby'); });
    return { fs, err, q, i };
  });
  const result = h('p', { className: 'val msg' });
  const submit = button('Submit exam', 'submit'), reset = again();
  const form = h('form', { className: 'cells two', noValidate: true },
    h('div', { className: 'cell full' }, h(cellHead(sheet), { className: 'lab' }, `Sample exam: ${course}`), h('p', { className: 'sample' }, 'Sample entries, fictional')),
    h('label', { className: 'cell field full' }, h('span', { className: 'lab' }, 'Your name'), name, h('span', { className: 'err', id: 'err-exam-name' })),
    ...sets.map(s => s.fs),
    h('div', { className: 'cell full' }, h('div', { className: 'demo-bar' }, submit, reset), result));
  $(sheet, '.fields').after(form);
  name.addEventListener('input', () => flag(name, ''));

  let busy = false, issued = false;
  const extra = [];
  const lock = on => { sets.forEach(s => { s.fs.disabled = on; }); name.readOnly = on; };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy || issued) return;
    const who = name.value.trim();
    if (!who) { flag(name, 'Add your name.'); name.focus(); return; }
    let score = 0;
    for (const s of sets) {
      const got = form.elements[`q${s.i + 1}`].value, ok = got === s.q.ans;
      score += ok;
      s.fs.classList.toggle('wrong', !ok);
      s.err.textContent = got ? 'Not the right answer.' : 'Choose an answer.';
      ok ? s.fs.removeAttribute('aria-describedby') : s.fs.setAttribute('aria-describedby', s.err.id);
    }
    const pass = score === 2, line = `Score ${score} of 2, pass mark 2${pass ? '' : '. Try again.'}`;
    busy = true;
    say(pass ? `${line}. Certificate issued to ${who}.` : line);
    if (!pass) { await t.type(result, line); busy = false; return; }
    lock(true); submit.hidden = true;
    const date = h('p', { className: 'who val' });
    extra.push(h('p', { className: 'pre' }, 'Date issued'), date);
    $(cert, '.sample').before(...extra);
    await Promise.all([t.type(result, line), t.type(whos[0], who), t.type(whos[1], course), t.type(date, `${TODAY} 2026`)]);
    issued = true; busy = false;
    st.set('Issued'); reset.hidden = false; reset.focus();
  });
  reset.addEventListener('click', () => {
    t.stop(); busy = issued = false;
    lock(false); name.value = ''; flag(name, ''); result.textContent = '';
    sets.forEach(s => { s.fs.classList.remove('wrong'); s.fs.removeAttribute('aria-describedby'); s.fs.querySelectorAll('input').forEach(r => { r.checked = false; }); });
    whos.forEach((w, i) => { w.textContent = first[i]; });
    extra.splice(0).forEach(n => n.remove());
    submit.hidden = false; reset.hidden = true; st.restore(); say('Demo reset.'); name.focus();
  });
}

// Each Sheet's demo starts only on a page that has the Sheet.
for (const [id, start] of [['pims', pims], ['dd-drugs-register', dd], ['procura', procura], ['cavelms', cave]]) if (document.getElementById(id)) start();
