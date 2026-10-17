// Everything the page needs before the room exists: day and night, the About columns, the
// contact brief, the screenshot tabs and the demos. This file is small on purpose, so those work
// at once on a slow phone; room.js (three.js, about 680KB) loads afterwards and takes over the hero.
import { initGalleries } from '../gallery.js';
import { initDemos } from '../demos.js';
import { initColonnade } from './about.js';
import { initBrief } from './brief.js';
import './theme.js';

initGalleries();
initDemos();
initColonnade();
initBrief();

if (document.querySelector('[data-stage], [data-object]')) {
  const room = () => {
    // Fetch the model alongside the script instead of after it; room.js's loader picks the preload up.
    document.head.append(Object.assign(document.createElement('link'), { rel: 'preload', as: 'fetch', crossOrigin: '', href: new URL('workshop.glb', import.meta.url).href }));
    // If the room cannot start the page falls back to its static layout (room.js does the same for no WebGL).
    import('./room.js').catch(() => document.documentElement.removeAttribute('data-room'));
  };
  const idle = () => (window.requestIdleCallback ? requestIdleCallback(room, { timeout: 1500 }) : setTimeout(room, 200));
  document.readyState === 'complete' ? idle() : addEventListener('load', idle, { once: true });
}
