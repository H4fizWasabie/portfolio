#!/usr/bin/env node
/**
 * Post-build assembly for the portfolio web root.
 *
 * WHY THIS EXISTS
 * ---------------
 * Caddy serves this repo's build output straight out of the working tree
 * (root * /var/www/portfolio/apps/web/dist, where /var/www/portfolio is a
 * symlink to this repo). So `vite build` writes directly into the live web
 * root, and because Vite's `emptyOutDir` defaults to true, anything in dist/
 * that Vite did not itself emit is deleted.
 *
 * That used to destroy the live homepage. Vite emits exactly one HTML entry
 * (from apps/web/index.html — the React case-study app), but the live site
 * needs two:
 *
 *   dist/index.html        the hand-maintained "eta" ledger deck (the homepage)
 *   dist/react-index.html  the React app, used as the Caddy SPA fallback for
 *                          /work/* and /resume
 *
 * Everything else the site serves now lives in apps/web/public/ (fonts/,
 * robots.txt, sitemap.xml, llms.txt, icons, img/), which Vite copies verbatim,
 * so it survives a rebuild by construction.
 *
 * So this script does the one thing `vite build` cannot: it parks the React
 * entry as react-index.html and puts the deck back at index.html. Then it
 * asserts the result is complete, so a broken build fails loudly instead of
 * silently deploying a site with no homepage.
 */

import { existsSync, renameSync, copyFileSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '..');            // apps/web
const repoRoot = resolve(webRoot, '..', '..');  // repo root
const dist = join(webRoot, 'dist');

const REACT_ENTRY = join(dist, 'index.html');       // what vite emits
const SPA_ENTRY = join(dist, 'react-index.html');   // what Caddy needs
const DECK_SOURCE = join(repoRoot, 'variants', 'eta', 'index.html');

const fail = (msg) => {
  console.error(`\n  ✗ postbuild: ${msg}\n`);
  process.exit(1);
};

console.log('  postbuild: assembling web root');

// 1. Vite must have emitted its entry. If not, the build itself failed.
if (!existsSync(REACT_ENTRY)) {
  fail(`expected Vite output at ${REACT_ENTRY} — did \`vite build\` succeed?`);
}

// 2. Park the React entry where Caddy's SPA fallback looks for it.
renameSync(REACT_ENTRY, SPA_ENTRY);
console.log('    · index.html -> react-index.html (React SPA entry)');

// 3. Put the homepage deck back.
if (!existsSync(DECK_SOURCE)) {
  fail(
    `homepage source missing at ${DECK_SOURCE}\n` +
    '    The live homepage is this file. Without it the site would deploy\n' +
    '    with no homepage, so refusing to continue.'
  );
}
copyFileSync(DECK_SOURCE, REACT_ENTRY);
const deckBytes = statSync(DECK_SOURCE).size;
console.log(`    · variants/eta/index.html -> index.html (${deckBytes} bytes, homepage)`);

// 4. Assert the complete expected artifact set is present.
const required = [
  'index.html',
  'react-index.html',
  'fonts/fonts.css',
  'fonts/fonts2.css',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'img',
  'assets',
];
const missing = required.filter((p) => !existsSync(join(dist, p)));
if (missing.length) {
  fail(
    `build output is incomplete — missing: ${missing.join(', ')}\n` +
    '    Files the site serves should come from apps/web/public/. If one of\n' +
    '    these is absent, it was probably never moved into public/.'
  );
}

// 5. Assert the deck's own relative asset references resolve. This is the
//    exact failure mode that took the homepage down: the deck surviving while
//    the fonts/images it points at did not.
const deck = readFileSync(REACT_ENTRY, 'utf8');
const refs = [...deck.matchAll(/(?:href|src)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((u) => !/^(?:[a-z]+:|\/\/|#|data:|\/)/i.test(u));
const brokenRefs = [...new Set(refs)].filter((u) => !existsSync(join(dist, u.split('?')[0])));
if (brokenRefs.length) {
  fail(
    `the homepage deck references files that are not in dist/: ${brokenRefs.join(', ')}\n` +
    '    Move them into apps/web/public/ so Vite copies them on every build.'
  );
}

console.log(`    · verified ${required.length} required artifacts and ${new Set(refs).size} deck asset refs`);
console.log('  postbuild: web root complete\n');
