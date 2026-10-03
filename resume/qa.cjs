// Test the actual offline V4 disclosure + both renderer/source/PDF consistency.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/tmp/node_modules/playwright');
const root=path.join(__dirname,'..'),evidence=process.env.RESUME_EVIDENCE||'/tmp/portfolio-resume-preview-evidence';
const url=process.env.RESUME_PREVIEW_URL||pathToFileURL(path.join(root,'variants/waterfall-preview/dist/index.html')).href;
const pdf=fs.readFileSync(path.join(__dirname,'Resume-Hafiz-Jamali.pdf')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
let browser;
(async()=>{
 fs.mkdirSync(evidence,{recursive:true});
 assert.match(execFileSync('pdfinfo',[path.join(__dirname,'Resume-Hafiz-Jamali.pdf')],{encoding:'utf8'}),/Pages:\s+1\b/);
 const text=execFileSync('pdftotext',[path.join(__dirname,'Resume-Hafiz-Jamali.pdf'),'-'],{encoding:'utf8'});assert.match(text,/MAP/);assert.doesNotMatch(text,/Procure Pilot/);
 browser=await chromium.launch({executablePath:process.env.CHROME||'/home/theoses/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[];
 for(const width of [1440,768,390,320])for(const js of [true,false]){
  const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:js,reducedMotion:'reduce',acceptDownloads:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.evaluate(()=>document.fonts.ready);
  const summary=page.locator('#resume-preview > summary');await summary.focus();await page.keyboard.press('Enter');
  assert(await page.locator('#resume-preview').evaluate(el=>el.open),'Keyboard did not open preview');
  assert(await page.locator('.resume-paper').isVisible());
  const content=await page.locator('.resume-paper').innerText();for(const term of ['SYSTEMS BUILDER','MAP — My Awesome App','Procura','Theoses','EXPERIENCE','SKILLS','73'])assert(content.includes(term),term);
  assert(!content.includes('Procure Pilot'));assert.equal(await page.locator('iframe,object,embed').count(),0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Preview overflows '+width);
  assert(await page.locator('.resume-paper p').evaluateAll(ps=>ps.every(p=>parseFloat(getComputedStyle(p).fontSize)>=16)),'Reading type too small');
  assert(await page.locator('.resume-paper .meta,.resume-paper .tags,.resume-paper .kind,.resume-paper .certline,.resume-paper .sysurl,.resume-paper .jd').evaluateAll(nodes=>nodes.every(node=>parseFloat(getComputedStyle(node).fontSize)>=12)),'Resume labels too small');
  assert(!(await page.locator('#scene-label').isVisible()),'Scene badge overlaps reader');
  if(js&&[1440,390].includes(width)){
   await summary.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(evidence,'resume-open-'+width+'.png'),fullPage:false,animations:'disabled'});
   await page.locator('.resume-paper').screenshot({path:path.join(evidence,'resume-reader-'+width+'.png'),animations:'disabled'});
  }
  const pending=page.waitForEvent('download');await page.locator('a[download="Resume-Hafiz-Jamali.pdf"]').click();const download=await pending;
  assert.equal(download.suggestedFilename(),'Resume-Hafiz-Jamali.pdf');assert.equal(hash(fs.readFileSync(await download.path())),hash(pdf),'Download differs from approved PDF');
  await summary.focus();await page.keyboard.press('Enter');assert(!(await page.locator('#resume-preview').evaluate(el=>el.open)),'Keyboard did not collapse');
  if(js){await page.locator('footer a[href="#resume-preview"]').click();assert(await page.locator('#resume-preview').evaluate(el=>el.open),'Footer navigation failed to open preview');}
  assert.deepEqual(errors,[]);results.push({width,js,keyboard:true,htmlReading:true,downloadSha256:hash(pdf),overflow:false});console.log('PASS resume '+width+'px '+(js?'JS':'no-JS')+': native keyboard preview, readable text, correct PDF download, no overflow/errors');
  await context.close();
 }
 fs.writeFileSync(path.join(evidence,'resume-qa.json'),JSON.stringify({url,results},null,2));await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
