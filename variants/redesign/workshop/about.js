// About colonnade: one chapter open at a time. Hover and keyboard focus open a column on wide
// screens, a tap opens a row on phones. Without this script every chapter stays open (style.css).
export function initColonnade() {
  const list = document.querySelector('[data-colonnade]');
  if (!list) return;
  const wide = matchMedia('(min-width: 900px) and (orientation: landscape)');
  const chapters = [...list.children];
  const open = c => {
    const was = list.querySelector('.is-open');
    if (c === was) return;
    // The old panel leaves upward while the new one rises; then it drops back below, unseen.
    was.classList.replace('is-open', 'is-leaving');
    setTimeout(() => was.classList.remove('is-leaving'), 700);
    c.classList.remove('is-leaving');
    c.classList.add('is-open');
    for (const x of chapters) x.firstElementChild.setAttribute('aria-expanded', x === c);
  };
  for (const c of chapters) {
    const tab = c.firstElementChild;
    tab.addEventListener('click', () => open(c));
    tab.addEventListener('focus', () => open(c));
    c.addEventListener('pointerenter', e => { if (wide.matches && e.pointerType === 'mouse') open(c); });
    tab.setAttribute('aria-expanded', c.classList.contains('is-open'));
  }
}
