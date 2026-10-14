// Prints resume-datasheet-source.html to the one-page PDF the site serves. The PDF is a build output: edit the source, never the PDF.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright-core');
const source=path.join(__dirname,'resume-datasheet-source.html'),out=path.join(__dirname,'Resume-Hafiz-Jamali.pdf');
const flat=s=>s.replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
async function render(){
 const browser=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  await page.goto(pathToFileURL(source).href);await page.evaluate(()=>document.fonts.ready);
  await page.pdf({path:out,preferCSSPageSize:true,printBackground:true});
 }finally{await browser.close();}
 assert.match(execFileSync('pdfinfo',[out],{encoding:'utf8'}),/Pages:\s+1\b/,'Résumé PDF overflows one page');
 // Every contact line and system title in the source must survive into the PDF text.
 const html=fs.readFileSync(source,'utf8'),text=flat(execFileSync('pdftotext',[out,'-'],{encoding:'utf8'}));
 const expected=[...html.matchAll(/<span>([^<]+)<\/span>|<td class="sysname">([^<]+?)\s*</g)].map(m=>flat(m[1]||m[2]));
 for(const term of expected)assert(text.includes(term),'Résumé PDF is missing: '+term);
 console.log(`PASS résumé PDF: one page, ${expected.length} contact/system lines match the source`);
}
if(require.main===module)render().catch(e=>{console.error(e);process.exitCode=1;});
