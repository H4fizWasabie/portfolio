#!/usr/bin/env node
// Builds the redesign into dist/<variant>/: a homepage, one page per project, the extra pages a
// variant defines (/projects/, /resume/) and only the files those pages reference.
// Previews: node build.cjs [variant...]   Production: see publish.cjs (PORTFOLIO_PUBLISH=1).
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { projects, site, esc } = require('./content.cjs');

const here = __dirname;
const images = path.join(here, '..', 'product-launch');
const resumeDir = path.join(here, '..', '..', 'resume');
const variants = ['workflow', 'turntable', 'workshop'];

const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
const write = (to, text) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.writeFileSync(to, text); };

const projectImages = [...new Set(projects.flatMap(p => [p.preview, ...p.scenes.map(s => s[1])]).filter(Boolean))];

function build(name, { out = path.join(here, 'dist', name), publish = false } = {}) {
  if (!variants.includes(name)) throw new Error(`unknown variant ${name}`);
  const dir = path.join(here, name);
  const page = require(path.join(dir, 'page.cjs'));
  fs.rmSync(out, { recursive: true, force: true });

  write(path.join(out, 'index.html'), page.home({ projects, site, esc, root: '' }));
  projects.forEach((p, i) => {
    const next = projects[(i + 1) % projects.length];
    write(path.join(out, 'work', p.slug, 'index.html'), page.project({ p, next, projects, site, esc, root: '../../' }));
  });
  if (page.projectsPage) write(path.join(out, 'projects', 'index.html'), page.projectsPage({ projects, site, esc, root: '../' }));
  if (page.resumePage) {
    const pdf = path.join(resumeDir, 'Resume-Hafiz-Jamali.pdf');
    if (fs.existsSync(pdf)) {
      const reader = require(path.join(resumeDir, 'preview.cjs'))();
      write(path.join(out, 'resume', 'index.html'), page.resumePage({ site, esc, root: '../' }, reader));
      write(path.join(out, 'static', 'resume.css'), reader.css);
      copy(pdf, path.join(out, 'resume', reader.filename));
    } else if (publish) {
      throw new Error('Résumé PDF missing; run node resume/pdf.cjs first');
    } else {
      console.warn(`${name}: no résumé PDF, so no /resume/ page in this preview (run node resume/pdf.cjs)`);
    }
  }
  if (!publish) write(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

  copy(path.join(dir, 'style.css'), path.join(out, 'static', 'style.css'));
  for (const f of [...page.fonts, ...page.licenses]) copy(path.join(here, 'fonts', f), path.join(out, 'static', f));
  for (const f of projectImages) copy(path.join(images, f), path.join(out, 'static', f));
  for (const f of page.static || []) {
    // Workshop renders (poster, thumbnails) come from a first build via render-stills.cjs.
    if (fs.existsSync(path.join(dir, f))) copy(path.join(dir, f), path.join(out, 'static', path.basename(f)));
    else if (publish) throw new Error(`missing ${name}/${f}`);
    else console.warn(`missing ${name}/${f}`);
  }

  esbuild.buildSync({
    entryPoints: [path.join(dir, 'main.js')], bundle: true, minify: true, format: 'esm', splitting: true,
    target: 'es2020', outdir: path.join(out, 'static'), chunkNames: '[name]-[hash]', logLevel: 'warning'
  });
  console.log(`built ${name}${publish ? ' (production)' : ''}`);
  return out;
}

module.exports = { build, variants };

if (require.main === module) {
  const chosen = process.argv.slice(2).length ? process.argv.slice(2) : variants;
  for (const name of chosen) build(name);
}
