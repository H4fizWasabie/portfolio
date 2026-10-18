// Everything the page needs before the room exists: day and night, the About columns, the
// Enquiry form, the screenshot tabs and the demos. This file is small on purpose, so those work
// at once on a slow phone; room.js (three.js, about 680KB) loads afterwards and takes over the hero.
import { initGalleries } from '../gallery.js';
import { initDemos } from '../demos.js';
import { initColonnade } from './about.js';
import { initEnquiry } from './enquiry.js';
import './theme.js';

initGalleries();
initDemos();
initColonnade();
initEnquiry();

// Lazy pictures fade in as they arrive (style.css); the ones already loaded are left alone.
for (const img of document.querySelectorAll('img[loading=lazy]')) {
  if (img.complete) continue;
  img.classList.add('is-arriving');
  img.addEventListener('load', () => img.classList.remove('is-arriving'), { once: true });
  img.addEventListener('error', () => img.classList.remove('is-arriving'), { once: true });
}

if (document.querySelector('[data-stage], [data-object]')) {
  const room = () => {
    // Fetch the model alongside the script instead of after it; room.js's loaders pick the preloads up. The homepage
    // shows the House; a project page its object from its Room's asset.
    const asset = document.querySelector('[data-object]')?.dataset.asset;
    const files = asset ? [['fetch', `room-${asset}.glb`], ['image', `room-${asset}-light.webp`]] : [['fetch', 'house.glb'], ['image', 'house-light.webp'], ['image', 'backdrop.webp'], ['image', 'house-wet.webp'], ['image', 'water-normal.webp']];
    for (const [as, file] of files) document.head.append(Object.assign(document.createElement('link'), { rel: 'preload', as, crossOrigin: '', href: new URL(file, import.meta.url).href }));
    // If the room cannot start the page falls back to its static layout (room.js does the same for no WebGL).
    import('./room.js').catch(() => document.documentElement.removeAttribute('data-room'));
  };
  const idle = () => (window.requestIdleCallback ? requestIdleCallback(room, { timeout: 1500 }) : setTimeout(room, 200));
  document.readyState === 'complete' ? idle() : addEventListener('load', idle, { once: true });
}
