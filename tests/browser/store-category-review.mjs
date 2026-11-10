import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runReviewBrowserCases} from './store-category-review-cases.mjs';

const require=createRequire(import.meta.url), root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.resolve(process.env.SELQIRO_BROWSER_OUTPUT || path.join(root,'.store-category-review-proof'));
const inventoryPath=process.env.SELQIRO_BUILD_INPUTS;
assert.ok(inventoryPath,'The completed fresh build input inventory is required');
const esbuild=require(process.env.SELQIRO_BROWSER_ESBUILD || 'esbuild'), sha=b=>createHash('sha256').update(b).digest('hex');
await mkdir(output,{recursive:true});
const mocks={
  'next/link':`export default function Link({prefetch,scroll,...props}){return <a {...props}/>;}`,
  'components/v2/layout/V2Shell.tsx':`export default function Shell({children}){return <main className="min-h-screen bg-[#f7f8f6] px-4 py-6 text-neutral-950">{children}</main>;}`,
  'src/shared/i18n/V2LanguageProvider.tsx':`import {fixture} from 'selqiro-review-fixture';import {getCatalogTranslation} from '${root}/lib/i18n/useTranslation.ts';
    export const useV2Language=()=>({language:fixture.language});export const useV2Translation=catalog=>({language:fixture.language,t:(key,params)=>getCatalogTranslation(fixture.language,catalog,key,params)});`,
  'src/shared/supabase/browserClient.ts':`import {fixture} from 'selqiro-review-fixture';export const supabaseBrowserClient=fixture.client;`,
};
const bundle=await esbuild.build({absWorkingDir:root,entryPoints:[path.join(root,'tests/browser/store-category-review.jsx')],
  outfile:path.join(output,'app.js'),bundle:true,format:'iife',platform:'browser',jsx:'automatic',metafile:true,
  define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},
  plugins:[{name:'bounded-review-adapters',setup(build){
    build.onResolve({filter:/.*/},args=>{
      if(args.path==='selqiro-review-fixture')return {path:path.join(root,'tests/browser/store-category-review-fixture.mjs')};
      if(Object.hasOwn(mocks,args.path))return {path:args.path,namespace:'mock'};
      const stem=args.path.startsWith('@/')?path.join(root,args.path.slice(2)):args.path.startsWith('.')?path.resolve(args.resolveDir,args.path):args.path;
      for(const suffix of ['','.ts','.tsx']){const relative=path.relative(root,stem+suffix).split(path.sep).join('/');if(Object.hasOwn(mocks,relative))return {path:relative,namespace:'mock'};}
    });
    build.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:root}));
  }}]});
const inputs=[],harness=[];
for(const name of Object.keys(bundle.metafile.inputs))if(!name.startsWith('mock:')&&!name.startsWith('<')&&!name.includes('node_modules/'))
  inputs.push({path:name,sha256:sha(await readFile(path.resolve(root,name)))});
for(const name of ['store-category-review.mjs','store-category-review-cases.mjs'])harness.push({path:'tests/browser/'+name,sha256:sha(await readFile(path.join(root,'tests/browser',name)))});
const bytes=await readFile(inventoryPath),inventory=JSON.parse(bytes),runtime=inputs.filter(item=>/^(app|src|lib)\//.test(item.path));
const proof={schemaVersion:1,startedAt:new Date().toISOString(),sourceRoot:root,node:process.version,
  boundary:'Actual Chromium, React DOM, async destination route, receipt-independent review page, real active-identity hook/readers and category card/selector/hook/API/parser. Synthetic Auth/PostgREST, language context, Next Link and shell; no full Next server or live service writes. CSS comes from the completed production build.',
  inputs,harness,mocks:Object.keys(mocks),cases:[],failures:[],bundleSha256:sha(await readFile(path.join(output,'app.js'))),
  buildAlignment:{inventoryPath,inventorySha256:sha(bytes),count:runtime.length,mismatches:runtime.filter(item=>inventory[item.path]!==item.sha256).map(item=>item.path)}};
assert.deepEqual(proof.buildAlignment.mismatches,[],'Browser runtime and actual destination route must equal the completed build inputs');
async function files(directory){const entries=await readdir(directory,{withFileTypes:true});return(await Promise.all(entries.map(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):path.join(directory,entry.name)))).flat();}
const staticRoot=path.join(root,'.next/static'),cssFiles=(await files(staticRoot)).filter(file=>file.endsWith('.css'));
assert.ok(cssFiles.length);proof.productionCss=await Promise.all(cssFiles.map(async file=>({path:path.relative(root,file),sha256:sha(await readFile(file))})));
const css=cssFiles.map(file=>'<link rel="stylesheet" href="/_next/static/'+path.relative(staticRoot,file)+'">').join('');
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+css+'</head><body><div id="root"></div><script src="/app.js"></script></body></html>';
const js=await readFile(path.join(output,'app.js'));
const server=createServer(async(request,response)=>{
  try{const url=new URL(request.url,'http://localhost');
    if(url.pathname==='/app.js'){response.setHeader('content-type','application/javascript');response.end(js);}
    else if(url.pathname.startsWith('/v2/')){response.setHeader('content-type','text/html');response.end(html);}
    else if(url.pathname.startsWith('/_next/static/')){const file=path.resolve(staticRoot,url.pathname.slice('/_next/static/'.length));assert.ok(file.startsWith(staticRoot+path.sep));response.setHeader('content-type',file.endsWith('.css')?'text/css':'application/octet-stream');response.end(await readFile(file));}
    else{response.statusCode=204;response.end();}
  }catch{response.statusCode=404;response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const {chromium}=require(process.env.SELQIRO_BROWSER_PLAYWRIGHT || 'playwright');let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.SELQIRO_BROWSER_EXECUTABLE || undefined,args:['--disable-dev-shm-usage']});proof.browser=browser.version();
  await runReviewBrowserCases({browser,origin,output,proof});proof.status='PASS';
}catch(error){proof.status='FAIL';proof.failures.push({message:error.message,stack:error.stack});console.error(error);process.exitCode=1;}
finally{
  proof.inputDrift=[];for(const item of [...inputs,...harness])if(sha(await readFile(path.resolve(root,item.path)))!==item.sha256)proof.inputDrift.push(item.path);
  if(proof.inputDrift.length){proof.status='FAIL';process.exitCode=1;}
  proof.testCount=proof.cases.length;proof.passed=proof.cases.filter(item=>item.status==='PASS').length;proof.finishedAt=new Date().toISOString();
  await writeFile(path.join(output,'browser-result.json'),JSON.stringify(proof,null,2)+'\n');await browser?.close();await new Promise(resolve=>server.close(resolve));
  console.log(`${proof.status}: ${proof.passed}/${proof.testCount}; ${output}/browser-result.json`);
}
