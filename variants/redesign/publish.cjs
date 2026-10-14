#!/usr/bin/env node
// Production build of the Workshop into dist/site: prints the résumé PDF, builds indexable pages,
// then writes favicon, robots, sitemap, llms.txt and runtime-manifest.json (every file the release
// copies, with its hash). Never deploys; release.sh does that.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const here = __dirname;
const out = path.join(here, 'dist', 'site');
const origin = 'https://portfolio.wasabietech.com';

execFileSync(process.execPath, [path.join(here, '../../resume/pdf.cjs')], { stdio: 'inherit' });
process.env.PORTFOLIO_PUBLISH = '1';
const { build } = require('./build.cjs');
const { projects } = require('./content.cjs');
build('workshop', { out, publish: true });

const routes = ['/', '/projects/', '/resume/', ...projects.map(p => `/work/${p.slug}/`)];
const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
fs.copyFileSync(path.join(here, '../../apps/web/public/favicon.svg'), path.join(out, 'favicon.svg'));
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`);
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(r => `  <url><loc>${origin}${r}</loc><lastmod>${day}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(out, 'llms.txt'), `# Hafiz Jamali\n\nCustom business applications and AI automation.\nCanonical portfolio: ${origin}/\n\n## Projects\n${projects.map(p => `- [${p.title}](${origin}/work/${p.slug}/): ${p.description}`).join('\n')}\n\nScreenshots use clearly labelled fictional or staged data. Workflow outlines are not application screenshots. Project pages include small in-browser demos on fictional sample data; they are not the real applications.\n`);

const files = [];
const walk = dir => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else files.push(path.relative(out, full));
  }
};
walk(out);
const manifest = files.filter(f => f !== 'runtime-manifest.json').sort()
  .map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(out, file))).digest('hex') }));
fs.writeFileSync(path.join(out, 'runtime-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`PASS production build: ${manifest.length} files, ${routes.length} indexable pages in ${path.relative(process.cwd(), out)}`);
