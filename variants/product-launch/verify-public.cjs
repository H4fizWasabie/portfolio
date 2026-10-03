// Non-mutating HTTP/browser verification. Defaults to the isolated staging port.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/home/theoses/.resume-gen/node_modules/playwright-core');
const base=(process.env.BASE_URL||'http://127.0.0.1:19124').replace(/\/$/,'');
const origin='https://portfolio.wasabietech.com',root=process.env.BUILD_ROOT||path.join(__dirname,'dist');
const projects=require('./projects.cjs'),routes=['/', '/projects/',...projects.map(p=>'/work/'+p.slug+'/')];
let browser;
(async()=>{
 for(const route of routes){
  const response=await fetch(base+route,{headers:{'user-agent':'Googlebot'},redirect:'manual'});
  assert.equal(response.status,200,route);assert.doesNotMatch(response.headers.get('x-robots-tag')||'',/noindex/i,route);
  const html=await response.text();assert.ok(html.includes(`<link rel="canonical" href="${origin}${route}">`),route);assert.match(html,/name="robots" content="index,follow"/);assert.doesNotMatch(html,/Review preview\./);
  if(route==='/')assert.ok(html.includes(fs.readFileSync(path.join(__dirname,'../../apps/web/index.html'),'utf8').match(/<meta\b[^>]*name="google-site-verification"[^>]*>/)[0]),'Public Search Console verification missing');
  const ld=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);assert.equal(ld['@graph'][2].url,origin+route);
  const alias=await fetch(base+route+'index.html',{redirect:'manual'});assert.equal(alias.status,308);assert.equal(new URL(alias.headers.get('location'),base).pathname,route);
 }
 console.log('PASS public crawl: ten 200/indexable canonical pages; JSON-LD; all index.html aliases redirect');
 for(const [alias,expected] of [['/variant-product-launch','/'],['/variant-product-launch/','/'],['/variant-product-launch/work/map/index.html','/work/map/index.html'],['/work/map','/work/map/']]){
  const response=await fetch(base+alias,{redirect:'manual'});assert.equal(response.status,308,alias);assert.equal(new URL(response.headers.get('location'),base).pathname,expected,alias);
 }
 const archived=await fetch(base+'/variant-alpha/');assert.equal(archived.status,200);assert.match(archived.headers.get('x-robots-tag')||'',/noindex/i);
 const robots=await fetch(base+'/robots.txt');assert.equal(robots.status,200);const robotText=await robots.text();assert.ok(robotText.includes('Sitemap: '+origin+'/sitemap.xml'));assert.doesNotMatch(robotText,/Disallow: \/variant-/);
 const sitemap=await fetch(base+'/sitemap.xml');assert.equal(sitemap.status,200);assert.deepEqual([...((await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g))].map(m=>m[1]),routes.map(route=>origin+route));
 for(const url of ['/this-page-does-not-exist','/projects.cjs','/render.cjs','/FICTIONAL-FIXTURES.json','/.impeccable/surfaces/contract.md'])assert.equal((await fetch(base+url)).status,404,url);
 console.log('PASS discovery: variant redirects, archived previews noindex, robots/sitemap, genuine 404s, no source/fixture exposure');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8'));
 for(const entry of manifest){const response=await fetch(base+'/'+entry.file);assert.equal(response.status,200,entry.file);assert.equal(crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),entry.sha256,entry.file);}
 console.log('PASS live assets: all '+manifest.length+' served files match the production manifest');
 const pdf=await fetch(base+'/resume/Resume-Hafiz-Jamali.pdf');assert.equal(pdf.status,200);assert.match(pdf.headers.get('content-type')||'',/application\/pdf/);
 const resumeRedirect=await fetch(base+'/resume',{redirect:'manual'});assert.equal(resumeRedirect.status,302);assert.equal(new URL(resumeRedirect.headers.get('location'),base).pathname,'/resume/Resume-Hafiz-Jamali.pdf');
 const movie=fs.readdirSync('/var/www/portfolio/apps/web/dist').filter(name=>name.endsWith('.mp4')).sort().at(-1);
 if(movie){const response=await fetch(base+'/'+movie,{method:'HEAD'});assert.equal(response.status,200);assert.match(response.headers.get('content-type')||'',/video\/mp4/);}
 console.log('PASS legacy assets: existing résumé PDF/redirect and published video remain accessible');
 browser=await chromium.launch({executablePath:process.env.CHROME||'/home/theoses/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  for(const route of routes){
   await page.goto(base+route);await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('h1').count(),1,route);assert.equal(await page.locator('.preview-note').count(),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route);
   if(route==='/'){
    assert.equal(await page.locator('.all-work .project-row').count(),8);
    await page.locator('[data-app="map"]').click();await page.waitForFunction(()=>document.getElementById('demo-image').naturalWidth===1360&&document.getElementById('app-heading').textContent==='MAP');
    await page.locator('#preview-project-link').click();await page.waitForURL(base+'/work/map/');assert.equal(await page.locator('h1').innerText(),'MAP');
   }
   if(route==='/work/map/'){
    await page.locator('[data-gallery-choice="3"]').click();await page.waitForFunction(()=>document.querySelector('[data-gallery-frame="3"] img').naturalWidth===1152&&!document.querySelector('[data-gallery-frame="3"]').hidden);
    const png=process.env.PUBLIC_EVIDENCE;
    if(png){fs.mkdirSync(png,{recursive:true});await page.screenshot({path:path.join(png,'live-map-'+width+'.png'),fullPage:true});}
   }
  }
  assert.deepEqual(errors,[]);await context.close();console.log('PASS actual browser '+width+'px: ten public routes; canonical navigation; MAP featured link/gallery; no preview banner, overflow or JS errors');
 }
 await browser.close();console.log('PASS public verification complete: canonical portfolio reachable and crawlable; indexing/ranking is controlled by search engines');
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1;});
