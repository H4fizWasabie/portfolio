// Test actual built pages over HTTP and extracted-folder file:// review mode.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/home/theoses/.resume-gen/node_modules/playwright-core');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {pathToFileURL}=require('node:url');
const root=process.env.PREVIEW_ROOT||__dirname, evidence=process.env.QA_EVIDENCE||path.join(__dirname,'evidence','eight-projects');
const projects=require('./projects.cjs');
const expected=['procura','pims','dd-drugs-register','theoses','yen','map','hills-ai-content-lab','89lab'];
const runtime=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8'));
const results=[],external=[],errors=[];let browser,server;
fs.mkdirSync(evidence,{recursive:true});
const assert=(test,message)=>{if(!test)throw Error(message);};
const routes=['index.html','projects/index.html','resume/index.html',...expected.map(slug=>'work/'+slug+'/index.html')];
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.ttf':'font/ttf','.txt':'text/plain','.pdf':'application/pdf'};
function contrast(a,b){const luminance=x=>{const v=x.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
(async()=>{
 assert(JSON.stringify(projects.map(p=>p.slug))===JSON.stringify(expected),'Approved project selection changed');
 for(const {file,sha256} of runtime){const bytes=fs.readFileSync(path.join(root,file));assert(require('node:crypto').createHash('sha256').update(bytes).digest('hex')===sha256,'Manifest hash mismatch: '+file);}
 server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/';
 browser=await chromium.launch({executablePath:process.env.CHROME||'/home/theoses/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [1440,1024,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:width<768?844:1080},reducedMotion:'reduce'});
  await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base)||url.startsWith('data:'))return route.continue();external.push(url);return route.abort();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  for(const route of routes){
   const response=await page.goto(base+route);assert(response.status()===200,'Route failed: '+route);
   await page.evaluate(()=>document.fonts.ready);
   assert(await page.locator('h1').count()===1,'Heading structure: '+route);
   assert(await page.locator('h1,h2,h3,h4').evaluateAll(headings=>headings.every((h,i)=>i===0||Number(h.tagName.slice(1))<=Number(headings[i-1].tagName.slice(1))+1)),'Skipped heading level: '+route);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow: '+width+' '+route);
   assert(await page.locator('a[href^="mailto:"]').count()>0,'Contact missing: '+route);
   assert(await page.locator('a[href$="Resume-Hafiz-Jamali.pdf"]').count()>0,'Résumé missing: '+route);
   const brokenLinks=await page.evaluate(()=>[...document.querySelectorAll('a[href],link[href],script[src],img[src]')].map(el=>el.getAttribute('href')||el.getAttribute('src')).filter(url=>url&&!url.startsWith('#')&&!/^(https:|mailto:)/.test(url)).map(url=>new URL(url,location.href).pathname));
   for(const link of brokenLinks)assert(fs.existsSync(path.join(root,decodeURIComponent(link).slice(1))),'Missing local link: '+route+' -> '+link);
   if(route==='index.html'){
    assert(await page.locator('.all-work .project-row').count()===8,'Homepage missing one of eight projects');
    assert(await page.locator('[data-app]').evaluateAll(tabs=>tabs.map(t=>t.dataset.app).join(','))==='procura,theoses,map','Featured selection incorrect');
    assert(await page.locator('#play,[data-scene]').count()===0,'Detailed walkthrough remains on homepage');
    assert(await page.locator('#about').isVisible(),'Personal background missing');
    assert(await page.locator('#demo-image').evaluate(image=>image.naturalWidth===1360),'Hero image failed');
    await page.locator('[data-app="map"]').click();await page.waitForFunction(()=>document.querySelector('#showcase-panel').getAttribute('aria-busy')==='false');
    assert((await page.locator('#preview-caption').innerText()).includes('fictional'),'MAP disclosure missing');
    assert((await page.locator('#preview-project-link').getAttribute('href')).includes('work/map/'),'MAP link incorrect');
    assert(await page.locator('#demo-image').evaluate(image=>image.naturalWidth===1360),'MAP composite unavailable');
    await page.locator('[data-app="procura"]').focus();await page.keyboard.press('ArrowRight');assert(await page.locator('[data-app="theoses"]').getAttribute('aria-selected')==='true','Arrow-key selection failed');
    await page.keyboard.press('End');assert(await page.locator('[data-app="map"]').getAttribute('aria-selected')==='true','End key failed');
    await page.keyboard.press('Home');await page.waitForFunction(()=>document.querySelector('#showcase-panel').getAttribute('aria-busy')==='false');
    await page.locator('#about a[href="resume/index.html"]').click();await page.waitForURL(base+'resume/index.html');
    assert((await page.locator('.resume-paper').innerText()).includes('MAP — My Awesome App'),'Preview button opens wrong resume');
    await page.goto(base+'index.html');await page.evaluate(()=>document.fonts.ready);
   }else if(route==='projects/index.html'){
    assert(await page.locator('.project-list .project-row').count()===8,'Project index incomplete');
   }else if(route==='resume/index.html'){
    assert((await page.locator('.resume-paper').innerText()).includes('MAP — My Awesome App'),'Approved resume content missing');
    assert(await page.locator('iframe,object,embed').count()===0,'Preview depends on a PDF viewer');
    assert(await page.locator('.resume-paper p').evaluateAll(ps=>ps.every(p=>parseFloat(getComputedStyle(p).fontSize)>=16)),'Resume reading text too small');
   }else{
    const slug=route.split('/')[1],project=projects.find(p=>p.slug===slug);
    assert((await page.locator('h1').innerText())===project.title,'Wrong project page '+route);
    assert(await page.locator('.case-boundary').isVisible(),'Boundaries missing: '+slug);
    if(project.scenes.length){
     for(let i=0;i<project.scenes.length;i++){
      await page.locator('[data-gallery-choice="'+i+'"]').click();await page.waitForFunction(()=>document.querySelector('[data-gallery]').getAttribute('aria-busy')==='false');
      const frame=page.locator('[data-gallery-frame="'+i+'"]');assert(await frame.isVisible(),'Gallery selection failed '+slug+' '+i);
      assert(await frame.locator('img').evaluate(image=>image.naturalWidth>1000),'Image failed '+slug+' '+i);
      assert(await frame.locator('img').evaluate(image=>{const r=image.getBoundingClientRect();return Math.abs(r.width/r.height-image.naturalWidth/image.naturalHeight)<.02;}),'Image stretched '+slug+' '+i);
      const full=frame.locator('figcaption a');const popupPromise=page.waitForEvent('popup');await full.click();const popup=await popupPromise;await popup.waitForLoadState();assert(await popup.locator('img').evaluate(image=>image.naturalWidth>1000),'Full-size image failed '+slug);await popup.close();
     }
     await page.locator('[data-gallery-choice="0"]').click();await page.waitForFunction(()=>document.querySelector('[data-gallery]').getAttribute('aria-busy')==='false');
    }else assert((await page.locator('.workflow-outline').innerText()).includes('not an app screenshot'),'Outline misrepresented '+slug);
   }
   if([1440,390].includes(width)&&process.env.QA_CAPTURE!=='0'){
    await page.evaluate(async()=>{for(const image of document.images)if(!image.closest('[hidden]')){image.loading='eager';await image.decode();}document.activeElement?.blur();scrollTo(0,0);});
    const label=route==='index.html'?'home':route==='projects/index.html'?'projects':route.split('/')[1];
    await page.screenshot({path:path.join(evidence,label+'-'+width+'.png'),fullPage:true,animations:'disabled'});
    if(label==='home')await page.screenshot({path:path.join(evidence,'hero-'+width+'.png'),animations:'disabled'});
   }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Post-interaction overflow '+route);
  }
  const colors=await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return Object.fromEntries(['moss','oat','ink','muted','rust'].map(k=>[k,s.getPropertyValue('--'+k).trim()]));});
  const pairs=[['oat/moss',colors.oat,colors.moss],['ink/oat',colors.ink,colors.oat],['muted/oat',colors.muted,colors.oat],['oat/rust',colors.oat,colors.rust]].map(([name,a,b])=>({name,ratio:contrast(a,b)}));assert(pairs.every(p=>p.ratio>=4.5),'Contrast below AA');
  assert(await page.locator('.nav a').evaluateAll(links=>links.every(link=>parseFloat(getComputedStyle(link).fontSize)>=12)),'Small functional nav text');
  results.push({width,pages:routes.length,passed:true,contrast:pairs});console.log('PASS '+width+'px: 11 pages; eight projects; featured tabs/keyboard; galleries/full-size; background/résumé/contact; links; disclosure; no overflow');await context.close();
 }
 // Exercise no-JS fallback and both manual navigation states without live mutation.
 const noJS=await browser.newContext({javaScriptEnabled:false});const fallback=await noJS.newPage();await fallback.goto(base+'index.html');assert(await fallback.locator('noscript').isVisible(),'No-JS homepage disclosure missing');assert(await fallback.locator('[data-app]').evaluateAll(t=>t.every(x=>x.disabled)),'Inactive controls misleading');await fallback.goto(base+'work/map/index.html');assert(await fallback.locator('.gallery-frame').evaluateAll(frames=>frames.every(f=>!f.hidden)),'No-JS gallery loses images');await noJS.close();console.log('PASS no-JS: links remain usable; four MAP captures visible; selectors disabled');
 // Error paths are induced by request routing, never by overwriting source/live state.
 const missing=await browser.newContext();await missing.route('**/map-tools-demo.webp',route=>route.abort());await missing.route('**/map-overview.webp',route=>route.abort());const errorPage=await missing.newPage();await errorPage.goto(base+'index.html');await errorPage.locator('[data-app="map"]').click();await errorPage.waitForFunction(()=>!document.getElementById('preview-error').hidden);await errorPage.goto(base+'work/map/index.html');await errorPage.locator('[data-gallery-choice="3"]').click();await errorPage.waitForFunction(()=>!document.querySelector('.gallery-error').hidden);await missing.close();console.log('PASS missing-assets: homepage and project gallery recover with explicit bundle guidance');
 // Offline ZIP opens from a normal extracted folder, with relative links/assets.
 const offline=await browser.newContext({reducedMotion:'no-preference'});const filePage=await offline.newPage();filePage.on('pageerror',error=>errors.push(error.message));
 for(const route of routes){await filePage.goto(pathToFileURL(path.join(root,route)).href);await filePage.evaluate(()=>document.fonts.ready);assert(await filePage.locator('h1').count()===1,'Offline page missing '+route);if(route==='index.html'){await filePage.locator('[data-app="map"]').click();await filePage.waitForFunction(()=>document.getElementById('demo-image').naturalWidth===1360&&document.getElementById('app-heading').textContent==='MAP');}if(route==='work/map/index.html'){await filePage.locator('[data-gallery-choice="3"]').click();await filePage.waitForFunction(()=>document.querySelector('[data-gallery-frame="3"] img').naturalWidth===1152);}}
 await offline.close();console.log('PASS offline file://: all 11 pages, local font/images, featured tabs and MAP gallery');
 assert(errors.length===0,'Runtime JS errors: '+errors.join('; '));assert(external.length===0,'Unexpected external runtime requests: '+external.join('; '));
 fs.writeFileSync(path.join(evidence,'qa.json'),JSON.stringify({results,noJS:true,missingAssets:true,offline:true,externalRequests:external,jsErrors:errors,root},null,2));
 console.log('PASS summary: 55 responsive route checks + all 11 offline pages; zero external/production runtime requests; zero JS errors');
 await browser.close();await new Promise(resolve=>server.close(resolve));
})().catch(async error=>{console.error(error);fs.writeFileSync(path.join(evidence,'qa-partial.json'),JSON.stringify({results,external,errors},null,2));await browser?.close();server?.close();process.exitCode=1;});
