// A finite actual-browser walkthrough, not a generated waterfall video.
const {chromium}=require('/tmp/node_modules/playwright');
const path=require('node:path');const {pathToFileURL}=require('node:url');
let browser;
(async()=>{
 const root=__dirname;
 browser=await chromium.launch({executablePath:'/home/theoses/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const ctx=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:path.join(root,'evidence/recording'),size:{width:1280,height:800}},reducedMotion:'no-preference'});
 const page=await ctx.newPage();await page.goto(pathToFileURL(path.join(root,'dist/index.html')).href);await page.waitForFunction(()=>waterfallPreview?.state().ready&&waterfallPreview.state().draws>2);await page.evaluate(()=>document.fonts.ready);
 // Finite actual-browser demo: hold each view so the owner can assess flow,
 // then travel down the scene through ordinary document scrolling.
 await page.evaluate(()=>new Promise(resolve=>{document.documentElement.style.scrollBehavior='auto';let start;function tour(now){if(start===undefined)start=now;const t=(now-start)/1000;let p=0;if(t>=3&&t<7)p=.53*(t-3)/4;else if(t>=7&&t<10)p=.53;else if(t>=10&&t<14)p=.53+.47*(t-10)/4;else if(t>=14)p=1;scrollTo(0,p*(document.documentElement.scrollHeight-innerHeight));if(t<17)requestAnimationFrame(tour);else resolve();}requestAnimationFrame(tour);}));
 const video=page.video();await ctx.close();await video.saveAs(path.join(root,'evidence/waterfall-browser-preview.webm'));await browser.close();console.log('PASS: finite actual browser recording, upper cascades to pool, from exact delivery HTML');
})().catch(async error=>{console.error(error);await browser?.close();process.exit(1)});
