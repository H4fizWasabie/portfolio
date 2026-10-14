// Screenshot tabs for case-study galleries (ARIA tabs pattern, arrow keys move between tabs).
export function initGalleries() {
  for (const g of document.querySelectorAll('[data-gallery]')) {
    const tabs = [...g.querySelectorAll('[role=tab]')];
    const select = tab => {
      for (const t of tabs) {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      }
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        const n = tabs[(i + d + tabs.length) % tabs.length];
        select(n);
        n.focus();
      });
    });
  }
}
