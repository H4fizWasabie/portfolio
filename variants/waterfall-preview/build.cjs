// Standard-library-only builder shared by offline review and canonical publication.
const fs=require('node:fs'),path=require('node:path');
const assets={FONT:['epilogue.ttf','font/ttf'],WATERFALL:['waterfall.webp','image/webp'],MASK:['water-matte.png','image/png'],FLOW:['tier-flow.png','image/png'],DETAIL:['water-detail.png','image/png'],PROCURA:['procura-inventory.webp','image/webp'],THEOSES:['theoses-report.webp','image/webp'],MAP:['map-overview.webp','image/webp']};
function build(){
 let html=fs.readFileSync(path.join(__dirname,'preview.html'),'utf8');const resume=require('../../resume/preview.cjs')();
 const replacements={RESUME_CSS:resume.css,RESUME_HTML:resume.html,RESUME_PDF:resume.pdfData};
 for(const [key,[file,mime]]of Object.entries(assets))replacements[key]=`data:${mime};base64,${fs.readFileSync(path.join(__dirname,'assets',file)).toString('base64')}`;
 for(const[key,value]of Object.entries(replacements)){const marker=`__${key}__`;if(!html.includes(marker))throw Error('Missing marker '+marker);html=html.replaceAll(marker,value);}
 if(/__(?:RESUME_|FONT|WATERFALL|MASK|FLOW|DETAIL|PROCURA|THEOSES|MAP)/.test(html))throw Error('Unresolved preview marker');
 return html;
}
module.exports=build;
if(require.main===module){const dir=path.join(__dirname,'dist');fs.mkdirSync(dir,{recursive:true});const html=build();fs.writeFileSync(path.join(dir,'index.html'),html);console.log(`Built offline V4: ${Buffer.byteLength(html)} bytes; no live writes`);}
