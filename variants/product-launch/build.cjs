// Build static review pages and a strict runtime allowlist. Never deploys.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = __dirname;
fs.writeFileSync(path.join(root,'site.css'),fs.readFileSync(path.join(root,'base.css'),'utf8')+'\n'+fs.readFileSync(path.join(root,'extension.css'),'utf8'));
require('./render.cjs');
const runtime = ['index.html','projects/index.html',...require('./projects.cjs').map(p=>'work/'+p.slug+'/index.html'),'site.css','gallery.js','epilogue.ttf','OFL-Epilogue.txt',...fs.readdirSync(root).filter(name=>/\.webp(?:\.json)?$/.test(name)).sort()];
const manifest = runtime.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}));
fs.writeFileSync(path.join(root,'runtime-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`PASS build: ${manifest.length} allowlisted runtime files; source, fixtures and design contracts excluded`);
