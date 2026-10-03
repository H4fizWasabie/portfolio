/* Local screenshot navigation only. No API, analytics or live application. */
(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const data = document.getElementById('featured-data');
  if (data) {
    const projects = JSON.parse(data.textContent);
    const tabs = [...document.querySelectorAll('[data-app]')];
    const image = document.getElementById('demo-image');
    const error = document.getElementById('preview-error');
    let epoch = 0;
    async function choose(index) {
      const request = ++epoch;
      const project = projects[index];
      tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
      document.getElementById('showcase-panel').setAttribute('aria-labelledby', tabs[index].id);
      document.getElementById('showcase-panel').setAttribute('aria-busy', 'true');
      document.getElementById('app-heading').textContent = project.title;
      document.getElementById('screen-label').textContent = project.slug === 'map' ? 'Edited phone captures' : project.slug === 'theoses' ? 'Staged sample conversation' : 'Fictional demo records';
      document.getElementById('preview-caption').textContent = project.disclosure;
      const link = document.getElementById('preview-project-link');
      link.href = 'work/' + project.slug + '/' + (document.querySelector('link[rel="canonical"]') ? '' : 'index.html');
      link.textContent = 'View ' + project.title + ' project';
      error.hidden = true;
      image.alt = project.alt;
      image.src = project.preview;
      try { await image.decode(); } catch { if (request === epoch) error.hidden = false; }
      finally { if (request === epoch) document.getElementById('showcase-panel').setAttribute('aria-busy', 'false'); }
    }
    tabs.forEach((tab, index) => {
      tab.disabled = false;
      tab.addEventListener('click', () => void choose(index));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault(); tabs[next].focus(); void choose(next);
      });
    });
    // Bounded CSS reveal respects reduced motion. There is no automatic playback.
    if (motion.matches) image.getAnimations().forEach(animation => animation.cancel());
    void choose(0);
  }
  for (const gallery of document.querySelectorAll('[data-gallery]')) {
    const choices = [...gallery.querySelectorAll('[data-gallery-choice]')];
    const frames = [...gallery.querySelectorAll('[data-gallery-frame]')];
    const error = gallery.querySelector('.gallery-error');
    let epoch = 0;
    async function choose(index) {
      const request = ++epoch;
      gallery.setAttribute('aria-busy', 'true');
      choices.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      frames.forEach((frame, i) => { frame.hidden = i !== index; });
      error.hidden = true;
      const image = frames[index].querySelector('img');
      image.loading = 'eager';
      try { await image.decode(); } catch { if (request === epoch) error.hidden = false; }
      finally { if (request === epoch) gallery.setAttribute('aria-busy', 'false'); }
    }
    choices.forEach((button, index) => {
      button.disabled = false;
      button.addEventListener('click', () => void choose(index));
      button.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % choices.length;
        else if (event.key === 'ArrowLeft') next = (index + choices.length - 1) % choices.length;
        else return;
        event.preventDefault(); choices[next].focus(); void choose(next);
      });
    });
    void choose(0);
  }
})();
