// A finite actual-browser walkthrough, not a generated waterfall video.
const {chromium}=require('/tmp/node_modules/playwright');
const path=require('node:path');const {pathToFileURL}=require('node:url');
let browser;
(async()=>{
 const root=__dirname;
 browser=await chromium.launch({executablePath:'/home/theoses/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const ctx=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:path.join(root,'evidence/recording'),size:{width:1280,height:800}},reducedMotion:'no-preference'});
 const page=await ctx.newPage();await page.goto(pathToFileURL(path.join(root,'dist/index.html')).href);await page.waitForFunction(()=>waterfallPreview?.state().ready&&waterfallPreview.state().draws>2);await page.evaluate(()=>document.fonts.ready);
 // Record a bounded 11-second camera tour driven by the normal document scroll position.
 await page.evaluate(()=>new Promise(resolve=>{document.documentElement.style.scrollBehavior='auto';let start;function tour(now){if(start===undefined)start=now;const elapsed=now-start;const p=Math.max(0,Math.min(1,(elapsed-1700)/7600));scrollTo(0,p*(document.documentElement.scrollHeight-innerHeight));if(elapsed<11000)requestAnimationFrame(tour);else resolve();}requestAnimationFrame(tour);}));
 const video=page.video();await ctx.close();await video.saveAs(path.join(root,'evidence/waterfall-browser-preview.webm'));await browser.close();console.log('PASS: finite actual browser recording, upper cascades to pool, from exact delivery HTML');
})().catch(async error=>{console.error(error);await browser?.close();process.exit(1)});
