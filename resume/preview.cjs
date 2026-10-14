// One approved source for the responsive HTML reader and offline PDF download.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function payload(){
 const sourceFile=path.join(__dirname,'resume-datasheet-source.html'),pdfFile=path.join(__dirname,'Resume-Hafiz-Jamali.pdf');
 const source=fs.readFileSync(sourceFile,'utf8');
 if(!fs.existsSync(pdfFile)||fs.statSync(pdfFile).mtimeMs<fs.statSync(sourceFile).mtimeMs)throw new Error('Résumé PDF missing or older than its source; run node resume/pdf.cjs');
 const pdf=fs.readFileSync(pdfFile);
 let body=source.match(/<body>([\s\S]*?)<\/body>/)[1].trim();
 body=body.replace(/<h1\b/g,'<h2').replace(/<\/h1>/g,'</h2>')
  .replace(/<div class="sechead">(.*?)<\/div>/g,'<h3 class="sechead">$1</h3>');
 // This footer is print provenance, not navigation to the not-yet-promoted reader.
 body=body.replace(/<div class="foot mono">[\s\S]*?<\/div>/,'');
 let css=source.match(/<style>([\s\S]*?)<\/style>/)[1]
  .replace(/\/\*[\s\S]*?\*\//g,'').replace(/@page\s*\{[^{}]*\}/g,'')
  .replace(/@media print\s*\{\s*\.page\s*\{[^{}]*\}\s*\}/g,'');
 css=css.replace(/([^{}]+)\{([^{}]*)\}/g,(_,selectors,props)=>{
  const scoped=selectors.trim().split(',').map(s=>s.trim()==='body'?'.resume-paper':'.resume-paper '+s.trim().replace(/^h1$/,'h2')).join(',');
  return scoped+'{'+props+'}\n';
 });
 css+=fs.readFileSync(path.join(__dirname,'reader.css'),'utf8');
 return {html:`<article class="resume-paper" aria-label="Hafiz Jamali résumé">${body}</article>`,css,pdfData:'data:application/pdf;base64,'+pdf.toString('base64'),pdfSha256:crypto.createHash('sha256').update(pdf).digest('hex'),filename:'Resume-Hafiz-Jamali.pdf'};
}
module.exports=payload;
if(require.main===module)process.stdout.write(JSON.stringify(payload()));
