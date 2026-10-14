// Behaviour for the demos in demos.cjs. Every demo runs on fictional sample data.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms));
const $ = (root, sel) => root.querySelector(sel);
const li = (text, cls = '') => Object.assign(document.createElement('li'), { textContent: text, className: cls });

function stamp(demo, text) {
  const s = $(demo, '.stamp');
  s.textContent = text;
  s.classList.remove('is-on');
  if (text) { void s.offsetWidth; s.classList.add('is-on'); }
  $(demo, '[data-status]').textContent = text;
}

const setups = {
  procura(d) {
    const result = $(d, '[data-result]');
    const clear = () => { result.hidden = true; stamp(d, ''); };
    for (const row of d.querySelectorAll('[data-item]')) {
      const out = $(row, 'output');
      for (const b of row.querySelectorAll('[data-step]')) b.addEventListener('click', () => {
        const n = Math.max(0, Math.min(999, +out.value + +b.dataset.step));
        out.value = n;
        row.classList.toggle('is-low', n < +row.dataset.reorder);
        clear();
      });
    }
    $(d, '[data-action=draft]').addEventListener('click', () => {
      const orders = {};
      for (const row of d.querySelectorAll('[data-item].is-low')) {
        const qty = 2 * row.dataset.reorder - +$(row, 'output').value;
        (orders[row.dataset.supplier] ||= []).push(`${$(row, 'th').textContent} × ${qty}`);
      }
      const suppliers = Object.keys(orders);
      result.hidden = false;
      if (!suppliers.length) { result.textContent = 'Nothing is below its reorder point, so there is nothing to order.'; stamp(d, ''); return; }
      result.innerHTML = suppliers.map(s => `<p><strong>${s}</strong></p><ul>${orders[s].map(o => `<li>${o}</li>`).join('')}</ul>`).join('');
      stamp(d, suppliers.length > 1 ? `${suppliers.length} orders drafted` : 'Order drafted');
    });
  },

  pims(d) {
    const stages = [...d.querySelectorAll('.track li')];
    const btn = $(d, '[data-action=advance]'), reset = $(d, '[data-action=reset]'), log = $(d, '[data-log]');
    const steps = [
      ['Create order', 'Procurement approved the request.'],
      ['Record receipt', 'Order PO-2291 went to Meridian Medical.'],
      [null, 'Stores received 12 boxes and recorded the receipt.']
    ];
    let at = 0;
    btn.addEventListener('click', () => {
      const [label, entry] = steps[at++];
      stages[at].classList.add('is-done');
      log.append(li(entry));
      if (label) btn.textContent = label;
      else { btn.hidden = true; reset.hidden = false; stamp(d, 'Received'); }
    });
    reset.addEventListener('click', () => {
      at = 0;
      stages.forEach((s, i) => s.classList.toggle('is-done', i === 0));
      log.replaceChildren(li('Surgery raised the request.'));
      btn.textContent = 'Approve request'; btn.hidden = false; reset.hidden = true;
      stamp(d, ''); btn.focus();
    });
  },

  dd(d) {
    const form = $(d, '[data-count]'), input = $(form, 'input'), error = $(d, '[data-error]');
    const reason = $(d, '[data-reason]'), ledger = $(d, '[data-ledger]');
    const row = (cells, cls = '') => {
      const tr = document.createElement('tr'); tr.className = cls;
      for (const c of cells) tr.append(Object.assign(document.createElement('td'), { textContent: c }));
      ledger.append(tr);
    };
    let counted;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const n = Number(input.value);
      const ok = input.value !== '' && Number.isInteger(n) && n >= 0 && n <= 99;
      error.hidden = ok;
      input.setAttribute('aria-invalid', !ok);
      if (!ok) { error.textContent = 'Enter a whole number from 0 to 99.'; input.focus(); return; }
      while (ledger.rows.length > 1) ledger.deleteRow(-1);
      counted = n;
      if (n === 14) { reason.hidden = true; row(['Today', '14', 'Balanced']); stamp(d, 'Balanced'); return; }
      row(['Today', String(n), `Differs by ${n - 14}`], 'is-flag');
      reason.hidden = false; stamp(d, '');
      $(reason, 'select').focus();
    });
    $(d, '[data-action=correct]').addEventListener('click', () => {
      row(['Correction', `System count set to ${counted}`, $(reason, 'select').value]);
      reason.hidden = true;
      stamp(d, 'Corrected');
    });
  },

  theoses(d) {
    const steps = [...d.querySelectorAll('[data-steps] li')];
    const run = $(d, '[data-action=run]'), review = $(d, '[data-review]'), draft = $(d, '[data-draft]');
    run.addEventListener('click', async () => {
      run.disabled = true;
      for (const s of steps) { s.classList.add('is-active'); await wait(550); s.classList.replace('is-active', 'is-done'); }
      draft.hidden = false; run.hidden = true; review.hidden = false;
      $(review, 'button').focus();
    });
    $(d, '[data-action=approve]').addEventListener('click', () => { review.hidden = true; stamp(d, 'Approved'); });
    $(d, '[data-action=revise]').addEventListener('click', () => {
      $(d, '[data-draft-text]').textContent = 'Revised: gauze swabs fell below the reorder point on Tuesday, so two purchase orders are ready to approve. Glove use rose compared with last week; the count is attached for checking.';
      $(d, '.draft-label').textContent = 'Revised draft for review';
    });
  },

  lab(d) {
    const stages = [...d.querySelectorAll('[data-pipeline] li')];
    const run = $(d, '[data-action=run]'), quota = $(d, '[data-quota]'), log = $(d, '[data-log]');
    const topics = ['How reorder points work', 'Why registers keep corrections', 'What an indent is'];
    let published = 0;
    run.addEventListener('click', async () => {
      run.disabled = true; stamp(d, '');
      stages.forEach(s => s.className = '');
      log.replaceChildren();
      if (published) log.append(li(`“${topics[published - 1]}” is already published, so the pipeline picked the next topic.`));
      log.append(li(`Topic: ${topics[published % topics.length]}`));
      for (const [i, s] of stages.entries()) {
        s.classList.add('is-active'); await wait(420); s.classList.remove('is-active');
        if (i === 5 && quota.checked) {
          s.classList.add('is-fail');
          log.append(li('Upload refused: quota used up. The finished video was handed back for manual posting.'));
        } else s.classList.add('is-done');
      }
      log.append(li(quota.checked ? 'Outcome recorded: manual post needed.' : 'Outcome recorded: published and verified.'));
      if (!quota.checked) published++;
      stamp(d, quota.checked ? 'Handed back' : 'Published');
      run.disabled = false; run.textContent = 'Run again';
    });
  },

  yen(d) {
    const buttons = [...d.querySelectorAll('[data-channel]')], thread = $(d, '[data-thread]'), input = $(d, '#yen-say');
    let channel = 'Terminal';
    const replies = ['Not yet. It is still a draft waiting for your approval.', 'Done. I will remind you here on Friday.', 'Yes, same conversation. Ask me anything about it.'];
    const prompts = ['Remind me again from here.', 'Is this still the same conversation?', ''];
    let turn = 0;
    const say = (who, text, cls = '') => {
      const item = li(text, cls);
      item.prepend(Object.assign(document.createElement('span'), { textContent: who }));
      thread.append(item);
    };
    buttons.forEach(b => b.addEventListener('click', () => {
      channel = b.dataset.channel;
      buttons.forEach(x => x.setAttribute('aria-pressed', x === b));
    }));
    $(d, '[data-say]').addEventListener('submit', e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) { input.focus(); return; }
      say(channel, text);
      say('Yen', replies[turn % replies.length], 'is-agent');
      input.value = prompts[turn % prompts.length];
      turn++;
    });
  }
};


export function initDemos() {
  for (const d of document.querySelectorAll('[data-demo]')) setups[d.dataset.demo](d);
}
