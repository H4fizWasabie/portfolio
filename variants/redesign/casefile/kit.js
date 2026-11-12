// What forms.js and more.js build their Sample demos from: typed entries, the Sheet's one Stamp, the live region,
// buttons and error flags. Every entry the demos make is fictional; nothing here talks to a system.
export const $ = (root, sel) => sel ? root.querySelector(sel) : document.querySelector(root);
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// The level of a cell label: h3 under a homepage Sheet's h2, h2 under a project page's h1 (page.cjs).
export const cellHead = sheet => (sheet.classList.contains('project') ? 'h2' : 'h3');
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function h(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) k in n ? (n[k] = v) : n.setAttribute(k, v);
  n.append(...kids);
  return n;
}

// Typed entries: the finished text holds the layout from the first keystroke, so nothing reflows while it types.
export function typer() {
  let run = 0;
  return {
    stop: () => run++,
    async type(node, text) {
      const mine = run;
      if (reduced()) { node.textContent = text; return; }
      const done = h('span'), rest = h('span', { style: 'visibility:hidden' }, text);
      node.replaceChildren(done, rest);
      for (const ch of text) {
        await sleep(25);
        if (mine !== run) return;
        done.textContent += ch;
        rest.textContent = rest.textContent.slice(1);
      }
      node.textContent = text;
    },
  };
}

// The sheet's one stamp: change its word and let it thunk.
export function stamper(sheet) {
  const s = $(sheet, '.foot .stamp'), first = s.textContent;
  const set = (text, thunk = true) => {
    s.textContent = text;
    s.classList.remove('thunk');
    if (thunk) { void s.offsetWidth; s.classList.add('thunk'); }
  };
  return { set, restore: () => set(first, false) };
}

export function liveRegion(sheet) {
  const p = h('p', { className: 'sr', 'aria-live': 'polite' });
  sheet.append(p);
  return text => { p.textContent = text; };
}

const arrow = '<svg class="arr" width="16" height="16" aria-hidden="true"><use href="#arr"/></svg>';
export function button(label, type = 'button') {
  const b = h('button', { type, className: 'btn' });
  b.innerHTML = `<span></span> ${arrow}`;
  b.firstElementChild.textContent = label;
  return b;
}
export const setLabel = (b, text) => { b.firstElementChild.textContent = text; };
export const again = () => h('button', { type: 'button', className: 'again', hidden: true }, 'Start again');

// Input flags an error the way the request form does: red outline, label and message via aria-invalid.
export function flag(field, msg) {
  const err = field.parentNode.querySelector('.err');
  if (msg) { err.textContent = msg; field.setAttribute('aria-invalid', 'true'); field.setAttribute('aria-describedby', err.id); }
  else { field.removeAttribute('aria-invalid'); field.removeAttribute('aria-describedby'); }
}
