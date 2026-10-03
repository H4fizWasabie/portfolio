// Exercise final CSS, worst-case backdrop contrast, and preference fallbacks.
const {chromium}=require('/tmp/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=__dirname,url=pathToFileURL(path.join(root,'dist/index.html')).href,baseline=pathToFileURL('/tmp/waterfall-v2-delivery.html').href;
let browser;const results=[];
function rgba(css){const a=css.match(/[\d.]+/g).map(Number);return {rgb:a.slice(0,3),alpha:a.length===4?a[3]:1};}
function luminance(rgb){return rgb.map(x=>{const v=x/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
function contrast(fg,bg){const a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
function composite(colour,background){return colour.rgb.map((v,i)=>v*colour.alpha+background[i]*(1-colour.alpha));}
async function css(page){return page.evaluate(()=>Array.from(document.querySelectorAll('.reading')).map(el=>{const s=getComputedStyle(el),p=el.querySelector('p'),text=getComputedStyle(p||el),a=el.querySelector('.action');return {background:s.backgroundColor,blur:s.backdropFilter||s.webkitBackdropFilter,opacity:s.opacity,textColour:text.color,textOpacity:text.opacity,imageOpacity:el.querySelector('img')?getComputedStyle(el.querySelector('img')).opacity:null,buttonOpacity:a?getComputedStyle(a).opacity:null};}));}
async function bounds(page){return page.evaluate(()=>Array.from(document.querySelector('main').querySelectorAll('section,.reading,h1,h2,p,.actions,.action')).map(el=>{const r=el.getBoundingClientRect();return [el.tagName,el.className,...[r.x,r.y,r.width,r.height].map(v=>Math.round(v*100)/100)];}));}
(async()=>{
 browser=await chromium.launch({executablePath:'/home/theoses/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 for(const [width,height,dpr] of [[1440,900,2],[390,844,3],[320,740,2]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,reducedMotion:'no-preference'});
  const old=await context.newPage();await old.goto(baseline);await old.evaluate(()=>document.fonts.ready);await old.waitForFunction(()=>waterfallPreview?.state().ready);const oldBounds=await bounds(old);await old.close();
  const page=await context.newPage();await page.goto(url);await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>waterfallPreview?.state().ready);assert.equal(await page.locator('body').getAttribute('data-card-treatment'),'moss-glass-v3');assert.deepEqual(await bounds(page),oldBounds,'Layout/text geometry must remain V2-identical');const cards=await css(page);assert.equal(cards.length,6);
  const ratios=[];
  for(const c of cards){assert.equal(c.background,'rgba(35, 46, 30, 0.78)');assert.equal(c.blur,'blur(12px)');assert.equal(c.opacity,'1');assert.equal(c.textOpacity,'1');if(c.imageOpacity)assert.equal(c.imageOpacity,'1');if(c.buttonOpacity)assert.equal(c.buttonOpacity,'1');const bg=composite(rgba(c.background),[255,255,255]);const ratio=contrast(rgba(c.textColour).rgb,bg);assert(ratio>=4.5,'Worst-case white-water body contrast '+ratio);ratios.push(ratio);}
  await page.locator('.action.secondary').hover();const secondary=await page.locator('.action.secondary').evaluate(el=>{const s=getComputedStyle(el);return {bg:s.backgroundColor,colour:s.color,opacity:s.opacity};});const hovered=rgba(secondary.bg);assert.equal(hovered.alpha,1);assert(contrast(rgba(secondary.colour).rgb,hovered.rgb)>=4.5);assert.equal(secondary.opacity,'1');
  // Force a white backdrop to check the card's actual computed treatment over
  // the brightest physically possible scene (not a changed live scene).
  await page.addStyleTag({content:'#landscape{background:white!important}#fallback,#water,#shade{visibility:hidden!important}'});await page.screenshot({path:path.join(root,'evidence',`glass-white-${width}.png`)});results.push({test:'six glass cards: exact V2 layout, blur, opaque content and worst-white body contrast',width,height,dpr,minContrast:Math.min(...ratios),background:cards[0].background,blur:cards[0].blur});await context.close();
 }
 // Ask the real browser to evaluate both preferences; do not simulate a rule
 // by overriding the reading-card style and then claim native support.
 for(const [feature,value] of [['prefers-reduced-transparency','reduce'],['prefers-contrast','more']]){
  const ctx=await browser.newContext({viewport:{width:390,height:844}});const page=await ctx.newPage();const session=await ctx.newCDPSession(page);await session.send('Emulation.setEmulatedMedia',{features:[{name:feature,value}]});await page.goto(url);await page.evaluate(()=>document.fonts.ready);assert(await page.evaluate(({feature,value})=>matchMedia(`(${feature}:${value})`).matches,{feature,value}),'Browser cannot emulate '+feature);const cards=await css(page);for(const c of cards){assert.equal(c.background,'rgba(35, 46, 30, 0.94)');assert.equal(c.blur,'none');assert.equal(c.opacity,'1');}await page.screenshot({path:path.join(root,'evidence',feature+'.png')});results.push({test:'real browser preference fallback',feature,value,background:cards[0].background,blur:cards[0].blur,pass:true});await ctx.close();
 }
 // A separate engine launch disables its native backdrop-filter feature,
 // exercising the @supports base rule rather than injected CSS.
 const fallbackBrowser=await chromium.launch({executablePath:'/home/theoses/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage','--disable-blink-features=CSSBackdropFilter']});const p=await fallbackBrowser.newPage({viewport:{width:390,height:844}});await p.goto(url);await p.evaluate(()=>document.fonts.ready);const supports=await p.evaluate(()=>CSS.supports('backdrop-filter','blur(1px)')||CSS.supports('-webkit-backdrop-filter','blur(1px)'));if(!supports){const cards=await css(p);for(const c of cards){assert.equal(c.background,'rgba(35, 46, 30, 0.94)');assert.equal(c.blur,'none');}results.push({test:'actual unsupported-backdrop-filter fallback',pass:true});}else results.push({test:'unsupported-backdrop-filter fallback',verified:false,reason:'Chromium flag did not disable CSS feature; preference-based no-blur fallback tested instead'});await fallbackBrowser.close();
 fs.writeFileSync(path.join(root,'evidence/card-results.json'),JSON.stringify(results,null,2));for(const x of results)console.log(x.verified===false?'SKIP':'PASS',JSON.stringify(x));await browser.close();
})().catch(async error=>{console.error(error);await browser?.close();process.exit(1)});
