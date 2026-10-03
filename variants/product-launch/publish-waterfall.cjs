// Preserve owner-approved V4 UI and existing canonical SEO; never deploy here.
const fs=require('node:fs'),path=require('node:path');
module.exports=function publish(root){
 const file=path.join(root,'index.html'),seoPage=fs.readFileSync(file,'utf8');
 let seoHead=seoPage.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<link rel="(?:preload|stylesheet)"[^>]*>/g,'')
  .replace(/<script src="[^"]+" defer><\/script>/g,'')
  .replace('name="color-scheme" content="light"','name="color-scheme" content="dark"');
 if(!seoHead.includes('google-site-verification')||!seoHead.includes('content="index,follow"')||!seoHead.includes('rel="canonical"'))throw Error('Canonical homepage SEO missing');
 const approved=require('../waterfall-preview/build.cjs')();
 const style=approved.match(/<style>([\s\S]*?)<\/style>/)[1];
 let html=approved.replace(/<head>[\s\S]*?<\/head>/,`<head>${seoHead}<meta name="portfolio-surface" content="waterfall-v4"><style>${style}</style></head>`)
  .replace(/(<a\b[^>]*\bhref=")https:\/\/portfolio\.wasabietech\.com\//g,'$1/')
  .replace(/href="data:application\/pdf;base64,[^"]+"/g,'href="/resume/Resume-Hafiz-Jamali.pdf"')
  .replace('Still-image preview.','Still image.');
 if(/noindex|Waterfall motion preview|Review preview\./.test(html))throw Error('Review-only metadata leaked into publication');
 fs.writeFileSync(file,html);
 console.log('PASS canonical V4 homepage: approved UI, same-origin projects/PDF, inherited Search Console/schema/social metadata');
};
