// Portable CI regression test: execute both builders, not just inspect source.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=__dirname,dist=path.join(root,'dist'),origin='https://portfolio.wasabietech.com';
const routes=['/', '/projects/',...require('./projects.cjs').map(p=>'/work/'+p.slug+'/')];
const rel=route=>route==='/'?'index.html':route.slice(1)+'index.html';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
execFileSync(process.execPath,[path.join(root,'build.cjs')],{stdio:'inherit'});
const preview=new Map(routes.map(route=>[route,fs.readFileSync(path.join(root,rel(route)))]));
for(const [route,bytes] of preview){const html=bytes.toString();assert.match(html,/content="noindex,nofollow"/);assert.doesNotMatch(html,/rel="canonical"/);assert.match(html,/Review preview\./);}
execFileSync(process.execPath,[path.join(root,'build.cjs'),'--publish'],{stdio:'inherit'});
for(const route of routes){
 const html=fs.readFileSync(path.join(dist,rel(route)),'utf8');
 assert.match(html,/name="robots" content="index,follow"/);
 assert.ok(html.includes(`<link rel="canonical" href="${origin}${route}">`),route);
 assert.ok(html.includes(`<meta property="og:url" content="${origin}${route}">`),route);
 assert.doesNotMatch(html,/Review preview\.|Extract the complete preview ZIP/);
 assert.doesNotMatch(html,/href="[^"]*index\.html/);
 const ld=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 assert.equal(ld['@graph'][0].name,'Hafiz Jamali');assert.equal(ld['@graph'][2].url,origin+route);
 assert.deepEqual(fs.readFileSync(path.join(root,rel(route))),preview.get(route),'Publication modified review output');
}
const verification=fs.readFileSync(path.join(root,'../../apps/web/index.html'),'utf8').match(/<meta\b[^>]*name="google-site-verification"[^>]*>/)[0];
assert.ok(fs.readFileSync(path.join(dist,'index.html'),'utf8').includes(verification),'Google Search Console verification lost');
const site=fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8');
assert.deepEqual([...site.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]),routes.map(route=>origin+route));
assert.match(site,/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
const robots=fs.readFileSync(path.join(dist,'robots.txt'),'utf8');assert.match(robots,/Allow: \/\n/);assert.ok(robots.includes('Sitemap: '+origin+'/sitemap.xml'));assert.doesNotMatch(robots,/Disallow: \/variant-/);
const manifest=JSON.parse(fs.readFileSync(path.join(dist,'runtime-manifest.json'),'utf8'));
for(const entry of manifest){assert.equal(hash(fs.readFileSync(path.join(dist,entry.file))),entry.sha256);assert.doesNotMatch(entry.file,/^(\.impeccable|evidence|FICTIONAL|projects\.cjs|render\.cjs)/);}
assert.equal(manifest.length,44);
console.log('PASS publication regression: both executed modes; ten indexable canonical pages; valid JSON-LD; clean links; sitemap/robots; 44 runtime hashes; review output unchanged');
