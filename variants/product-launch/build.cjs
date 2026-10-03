// Separate review/production builds. This command never deploys or reloads Caddy.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=__dirname,published=process.argv.includes('--publish');
process.env.PORTFOLIO_PUBLISH=published?'1':'0';
const root=published?path.join(source,'dist'):source;
fs.mkdirSync(root,{recursive:true});
const projects=require('./projects.cjs');
const assets=['gallery.js','epilogue.ttf','OFL-Epilogue.txt',...fs.readdirSync(source).filter(name=>/\.webp(?:\.json)?$/.test(name)).sort()];
if(published){
 for(const file of assets)fs.copyFileSync(path.join(source,file),path.join(root,file));
 fs.copyFileSync(path.join(source,'../../apps/web/public/favicon.svg'),path.join(root,'favicon.svg'));
}
fs.writeFileSync(path.join(root,'site.css'),fs.readFileSync(path.join(source,'base.css'),'utf8')+'\n'+fs.readFileSync(path.join(source,'extension.css'),'utf8'));
require('./render.cjs');
const pages=['index.html','projects/index.html',...projects.map(p=>'work/'+p.slug+'/index.html')];
const runtime=[...pages,'site.css',...assets];
if(published){
 const origin='https://portfolio.wasabietech.com',urls=['/', '/projects/',...projects.map(p=>'/work/'+p.slug+'/')];
 const day=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur'});
 fs.writeFileSync(path.join(root,'robots.txt'),'User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: '+origin+'/sitemap.xml\n');
 fs.writeFileSync(path.join(root,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(url=>`  <url><loc>${origin}${url}</loc><lastmod>${day}</lastmod></url>`).join('\n')+'\n</urlset>\n');
 fs.writeFileSync(path.join(root,'llms.txt'),'# Hafiz Jamali\n\nCustom business applications and AI automation.\nCanonical portfolio: '+origin+'/\n\n## Projects\n'+projects.map(p=>`- [${p.title}](${origin}/work/${p.slug}/): ${p.description}`).join('\n')+'\n\nThe case studies use clearly labelled fictional/staged screenshot data. Workflow outlines are not application screenshots. Interactive applications are not embedded in this portfolio.\n');
 runtime.push('favicon.svg','robots.txt','sitemap.xml','llms.txt');
}
const manifest=runtime.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}));
fs.writeFileSync(path.join(root,'runtime-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`PASS ${published?'production':'review'} build: ${manifest.length} runtime files; ten pages; ${published?'indexable canonical URLs':'noindex review'}; no live writes`);
