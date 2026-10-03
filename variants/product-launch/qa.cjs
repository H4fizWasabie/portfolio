const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/home/theoses/.resume-gen/node_modules/playwright-core');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=__dirname,results=[],production=[];let browser;
function assert(condition,message){if(!condition)throw Error(message);}
function contrast(a,b){const l=x=>{const v=x.replace('#','').match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};const x=l(a),y=l(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
(async()=>{
 browser=await chromium.launch({executablePath:process.env.CHROME||'/home/theoses/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [1440,1024,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:width<768?844:1080},reducedMotion:'no-preference'});
  await context.route('**/*',route=>{if(['file:','data:','blob:'].some(prefix=>route.request().url().startsWith(prefix)))return route.continue();production.push(route.request().url());return route.abort();});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.clock.install();
  await page.goto(pathToFileURL(path.join(root,'Hafiz-Product-Launch-preview.html')).href);
  await page.evaluate(()=>{for(const image of document.images)image.loading='eager';return Promise.all([...document.images].map(image=>image.decode()));});await page.evaluate(()=>document.fonts.ready);
  assert(await page.locator('#demo-image').evaluate(image=>image.naturalWidth===1360),'Genuine screenshot did not load');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow at '+width);
  assert(await page.locator('.project-visual img').evaluateAll(images=>images.every(image=>{const r=image.getBoundingClientRect();return Math.abs(r.width/r.height-68/43)<.02;})),'Case screenshot letterboxing/height regression at '+width);
  assert(await page.locator('a[href^="mailto:"]').count()===2,'Contact email/link missing');
  assert(await page.locator('.hero-actions').evaluate(element=>element.getBoundingClientRect().bottom<innerHeight),'Hero CTA below fold at '+width);
  await page.locator('[data-app="pims"]').click();await page.waitForFunction(()=>document.getElementById('demo-image').alt.includes('PIMS')&&document.getElementById('screen-loading').hidden);
  await page.locator('[data-scene="1"]').click();await page.waitForFunction(()=>document.getElementById('demo-image').alt.includes('indent'));
  assert(await page.locator('[data-scene="1"]').getAttribute('aria-pressed')==='true','Scene state failed');
  await page.locator('[data-app="theoses"]').click();await page.locator('[data-scene="1"]').click();assert((await page.locator('#scene-caption').innerText()).includes('No message or order is sent'),'Staged scenario disclosure lost');
  await page.locator('[data-app="procura"]').focus();await page.keyboard.press('ArrowRight');assert(await page.locator('[data-app="pims"]').getAttribute('aria-selected')==='true','Roving keyboard tabs failed');
  await page.locator('[data-app="procura"]').click();await page.waitForFunction(()=>document.getElementById('screen-loading').hidden);
  await page.locator('#play').click();await page.clock.runFor(2600);assert(await page.locator('[data-scene="1"]').getAttribute('aria-pressed')==='true','Timed walkthrough did not advance');
  await page.locator('#play').click();const src=await page.locator('#demo-image').getAttribute('src');await page.clock.runFor(6000);assert(src===await page.locator('#demo-image').getAttribute('src'),'Paused walkthrough advanced');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.getElementById('play').disabled);assert(await page.locator('#play').isDisabled(),'Reduced motion failed to disable autoplay');await page.locator('[data-app="theoses"]').click();await page.waitForFunction(()=>document.getElementById('screen-loading').hidden);assert(await page.locator('#demo-image').evaluate(image=>image.getAnimations().length===0),'Reduced motion still animates screenshot');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow after app switch');
  assert(await page.locator('.scene-tab,.stage-header span,.project-visual figcaption,.honesty').evaluateAll(elements=>elements.every(element=>parseFloat(getComputedStyle(element).fontSize)>=11)),'Functional text below 11px');
  assert(await page.locator('.hero .shell').evaluate(element=>parseFloat(getComputedStyle(element).paddingLeft)>=22),'Hero shell inset missing');
  // Validate full-size viewing in the exported HTML, not just source links.
  const popupPromise=page.waitForEvent('popup');await page.locator('#image-link').click();const popup=await popupPromise;await popup.waitForLoadState();assert(popup.url().startsWith('blob:'),'Self-contained full-size link failed');assert(await popup.locator('img').evaluate(image=>image.naturalWidth===1360),'Full-size screenshot did not render');await popup.close();
  await page.locator('[data-open-app="pims"]').click();assert(await page.locator('[data-app="pims"]').getAttribute('aria-selected')==='true','Project CTA failed to switch apps');
  await page.locator('[data-app="procura"]').click();await page.waitForFunction(()=>document.getElementById('screen-loading').hidden);await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!document.getElementById('play').disabled);await page.evaluate(()=>scrollTo(0,0));
  // Actual changed code is exercised above. Rendering all target sizes is one QA round.
  if([1440,390].includes(width)){await page.screenshot({path:path.join(root,'evidence',`preview-${width}.png`),fullPage:true,animations:'disabled'});await page.screenshot({path:path.join(root,'evidence',`hero-${width}.png`),animations:'disabled'});}
  assert(errors.length===0,'JS errors: '+errors.join('; '));
  const colours=await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);return Object.fromEntries(['moss','oat','ink','muted','rust'].map(key=>[key,s.getPropertyValue('--'+key).trim()]));});
  const checks=[['oat on moss',colours.oat,colours.moss],['ink on oat',colours.ink,colours.oat],['muted on oat',colours.muted,colours.oat],['oat on rust',colours.oat,colours.rust]].map(([name,a,b])=>({name,ratio:contrast(a,b)}));
  results.push({width,passed:true,controls:true,keyboard:true,playPause:true,reducedMotion:true,fullSizeExport:true,overflow:false,jsErrors:errors,contrast:checks});
  console.log(`PASS ${width}px: genuine assets; app/scenes; keyboard; playback/pause; reduced motion; full-size export; contact; no overflow/errors. Contrast: ${checks.map(c=>c.name+'='+c.ratio.toFixed(2)).join(', ')}`);
  await context.close();
 }
 const noJS=await browser.newContext({javaScriptEnabled:false});const fallback=await noJS.newPage();await fallback.goto(pathToFileURL(path.join(root,'Hafiz-Product-Launch-preview.html')).href);assert(await fallback.locator('noscript').isVisible(),'No-JS disclosure missing');assert(await fallback.locator('[data-app="pims"]').isDisabled(),'No-JS controls misleadingly active');assert(await fallback.locator('#demo-image').evaluate(image=>image.naturalWidth===1360),'No-JS genuine image unavailable');await noJS.close();
 // Execute the error/empty recovery path against a COPY; never replace live state.
 const html=fs.readFileSync(path.join(root,'Hafiz-Product-Launch-preview.html'),'utf8'),bad=html.replaceAll(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g,'data:image/webp;base64,bm90YW5pbWFnZQ==');fs.writeFileSync(path.join(root,'evidence/broken-asset-test.html'),bad);
 const errorContext=await browser.newContext();const errorPage=await errorContext.newPage();await errorPage.goto(pathToFileURL(path.join(root,'evidence/broken-asset-test.html')).href);await errorPage.waitForFunction(()=>!document.getElementById('screen-error').hidden);assert((await errorPage.locator('#screen-error').innerText()).includes('complete downloaded preview bundle'),'Missing-asset recovery message failed');await errorContext.close();
 assert(production.length===0,'Unexpected external/production requests');fs.writeFileSync(path.join(root,'evidence/qa.json'),JSON.stringify({results,noJS:true,missingAssetRecovery:true,productionRequests:production},null,2));
 assert(results.every(r=>r.contrast.every(c=>c.ratio>=4.5)),'Contrast needs correction (see evidence/qa.json)');
 console.log('PASS: no-JS fallback, missing-asset recovery, zero external/production requests, all tested text pairs >=4.5:1.');await browser.close();
})().catch(async error=>{console.error(error);fs.writeFileSync(path.join(root,'evidence/qa-partial.json'),JSON.stringify({results,production},null,2));await browser?.close();process.exit(1)});
