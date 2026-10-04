// Scoped V5 layout checks. Run against offline artifact or WATERFALL_WIDE_QA_URL.
const {chromium}=require('/tmp/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=__dirname,url=process.env.WATERFALL_WIDE_QA_URL||pathToFileURL(path.join(root,'dist/index.html')).href;
const baseline=process.env.WATERFALL_WIDE_BASELINE||'/tmp/portfolio-wide-baseline.html';
const evidence=process.env.WATERFALL_WIDE_EVIDENCE||path.join(root,'evidence/wide-glass');
const results=[];let browser;
const rgba=s=>s.match(/[\d.]+/g).map(Number);
const lum=c=>c.slice(0,3).reduce((n,x,i)=>{const v=x/255;return n+(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)*[.2126,.7152,.0722][i];},0);
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
async function geometry(page){return page.evaluate(()=>Array.from(document.querySelectorAll('main section,main .reading,main h1,main h2,main p,main .actions')).map(el=>{const r=el.getBoundingClientRect();return [el.tagName,el.className,r.x,r.y,r.width,r.height];}));}
async function cards(page){return page.evaluate(()=>Array.from(document.querySelectorAll('.reading')).map(el=>{const s=getComputedStyle(el),p=getComputedStyle(el.querySelector('p:not(.project-title)'));return {width:el.getBoundingClientRect().width,bg:s.backgroundColor,blur:s.backdropFilter,opacity:s.opacity,text:p.color,textOpacity:p.opacity,bodySize:p.fontSize};}));}
(async()=>{
 fs.mkdirSync(evidence,{recursive:true});
 browser=await chromium.launch({executablePath:'/home/theoses/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const original=fs.readFileSync(baseline,'utf8'),current=require('./build.cjs')();
 assert.deepEqual([...current.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]),[...original.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]),'Water, motion controls and resume scripts unchanged');
 results.push({test:'all JavaScript byte-identical to published V4 source',pass:true});
 for(const [width,height] of [[1280,720],[1440,900],[1920,1080],[1024,768],[820,1180],[390,844],[320,740],[667,375]]){
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>waterfallPreview?.state().ready);
  assert.equal(await p.locator('body').getAttribute('data-card-treatment'),'wide-moss-glass-v5');
  assert.equal(await p.locator('meta[name="robots"]').getAttribute('content'),'noindex,nofollow');
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const cs=await cards(p);assert.equal(cs.length,6);let min=Infinity;
  for(const c of cs){
   assert.equal(c.opacity,'1');assert.equal(c.textOpacity,'1');assert.equal(c.bg,width>760?'rgba(35, 46, 30, 0.75)':'rgba(35, 46, 30, 0.78)');
   assert.equal(c.blur,width>760?'blur(24px)':'blur(12px)');assert.equal(c.bodySize,width>760?'18px':'14px');
   const bg=rgba(c.bg),bound=bg.slice(0,3).map(x=>x*bg[3]+255*(1-bg[3]));const ratio=contrast(rgba(c.text),bound);assert(ratio>=4.5);min=Math.min(min,ratio);
   if(width>760)assert(Math.abs(c.width-Math.min(1120,width*.60))<1,'Shared desktop width, including About and large-display rules');
  }
  if(width<=760){const old=await ctx.newPage();await old.goto(pathToFileURL(baseline).href);await old.evaluate(()=>document.fonts.ready);assert.deepEqual(await geometry(p),await geometry(old),'Mobile reading layout remains V4-identical');await old.close();}
  // Every reading passage fits horizontally and its children stay within the card.
  const escaped=await p.evaluate(()=>Array.from(document.querySelectorAll('.reading')).flatMap(card=>{const r=card.getBoundingClientRect();return Array.from(card.querySelectorAll('h1,h2,p,img,.action')).filter(el=>{const b=el.getBoundingClientRect();return b.x<r.x-1||b.right>r.right+1;}).map(el=>el.tagName+':'+el.textContent.slice(0,30));}));assert.deepEqual(escaped,[]);
  if([1280,1440,390].includes(width)){await p.screenshot({path:path.join(evidence,`hero-${width}.png`)});await p.locator('#work').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('#work img').complete&&document.querySelector('#work img').naturalWidth>0);await p.screenshot({path:path.join(evidence,`project-${width}.png`)});}
  await p.locator('#resume-preview summary').click();assert(await p.locator('#resume-preview').evaluate(e=>e.open));assert(await p.locator('.resume-paper').isVisible());assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Expanded resume overflow');
  await p.locator('#motion-toggle').focus();await p.keyboard.press('Enter');assert(await p.locator('#motion-options').evaluate(e=>e.open));
  const panel=await p.locator('#motion-panel').boundingBox();assert(panel.x>=0&&panel.y>=0&&panel.x+panel.width<=width+1&&panel.y+panel.height<=height+1);
  for(const selector of ['#pause','#motion-toggle','#still']){const b=await p.locator(selector).boundingBox();assert(b.width>=44&&b.height>=44);}
  await p.keyboard.press('Escape');assert(!(await p.locator('#motion-options').evaluate(e=>e.open)));assert(await p.locator('#motion-toggle').evaluate(e=>e===document.activeElement));
  await p.locator('#motion-toggle').click();await p.locator('header>a').focus();assert(!(await p.locator('#motion-options').evaluate(e=>e.open)));
  assert.equal(await p.locator('.index li a').count(),8);assert.equal(errors.length,0,errors.join('\n'));
  results.push({test:'six readable cards, no overflow, resume disclosure, eight projects',width,height,cardWidth:cs[0].width,whiteBackdropBodyContrast:min,mobileGeometryUnchanged:width<=760,pass:true});await ctx.close();
 }
 for(const [feature,value] of [['prefers-reduced-transparency','reduce'],['prefers-contrast','more']]){
  const ctx=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),p=await ctx.newPage(),cdp=await ctx.newCDPSession(p);
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:feature,value},{name:'prefers-reduced-motion',value:'reduce'}]});await p.goto(url);await p.evaluate(()=>document.fonts.ready);
  assert(await p.evaluate(({feature,value})=>matchMedia(`(${feature}:${value})`).matches,{feature,value}));
  for(const c of await cards(p)){assert.equal(c.bg,'rgba(35, 46, 30, 0.94)');assert.equal(c.blur,'none');}
  results.push({test:'native preference fallback',feature,pass:true});await ctx.close();
 }
 const ctx=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),p=await ctx.newPage();await p.goto(url);await p.evaluate(()=>document.fonts.ready);
 await p.addStyleTag({content:'#landscape{background:white!important}#fallback,#water,#shade{visibility:hidden!important}'});await p.screenshot({path:path.join(evidence,'white-backdrop-1440.png')});await ctx.close();
 fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify(results,null,2));for(const r of results)console.log('PASS',JSON.stringify(r));await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exit(1)});
