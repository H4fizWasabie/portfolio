// Build a genuinely self-contained preview; no bundle or production checkout.
const fs=require('node:fs'),path=require('node:path');
const root=__dirname,site=fs.existsSync(path.join(root,'site','index.html'))?path.join(root,'site'):root;
let html=fs.readFileSync(path.join(site,'index.html'),'utf8');
for(const name of fs.readdirSync(site).filter(name=>/\.(ttf|webp)$/.test(name))){const mime=name.endsWith('.ttf')?'font/ttf':'image/webp';const uri='data:'+mime+';base64,'+fs.readFileSync(path.join(site,name)).toString('base64');html=html.replaceAll(name,uri);}
fs.writeFileSync(path.join(root,'Hafiz-Product-Launch-preview.html'),html);
console.log('Built self-contained preview:',Buffer.byteLength(html),'bytes. No production files touched.');
