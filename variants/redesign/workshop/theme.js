// Day and night for the Workshop. The device setting decides until the visitor flips the
// desk lamp or the navigation switch; that choice is remembered. The first paint is set by
// the inline script in the page head (see page.cjs) so the page never flashes.
const KEY = 'workshop-theme';
const root = document.documentElement;
const system = matchMedia('(prefers-color-scheme: dark)');
const buttons = document.querySelectorAll('[data-theme-toggle]');

const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const isNight = () => root.dataset.theme === 'dark';

function apply(night) {
  root.dataset.theme = night ? 'dark' : 'light';
  for (const b of buttons) b.textContent = night ? 'Lights on' : 'Lights off';
  dispatchEvent(new Event('themechange'));
}

export function toggleTheme() {
  const night = !isNight();
  try { localStorage.setItem(KEY, night ? 'dark' : 'light'); } catch { /* private mode: still switch */ }
  apply(night);
}

system.addEventListener('change', e => { if (!stored()) apply(e.matches); });
buttons.forEach(b => b.addEventListener('click', toggleTheme));
for (const b of buttons) b.textContent = isNight() ? 'Lights on' : 'Lights off';
