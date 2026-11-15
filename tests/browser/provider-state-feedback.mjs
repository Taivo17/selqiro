import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runProviderStateFeedbackCases} from './provider-state-feedback-cases.mjs';

const require=createRequire(import.meta.url),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.resolve(process.env.SELQIRO_BROWSER_OUTPUT||path.join(root,'../provider-state-browser-proof'));
const esbuild=require(process.env.SELQIRO_BROWSER_ESBUILD||'esbuild');
const sha=value=>createHash('sha256').update(value).digest('hex');
const fixture=path.join(root,'tests/browser/provider-state-feedback-fixture.mjs');
const mocks={
 'next/link':`import React from 'react';export default function Link({href,children,...props}){return <a {...props} href={href}>{children}</a>;}`,
 'src/shared/i18n/V2LanguageProvider.tsx':`export const useV2Language=()=>({language:'en'});`,
 'src/shared/supabase/browserClient.ts':`export {client as supabaseBrowserClient} from 'provider-state-fixture';`,
 'src/entities/viewer-provider-controls/api/providerControlsClient.ts':`export {controlsClient as providerControlsClient} from 'provider-state-fixture';`,
};
await mkdir(output,{recursive:true});
const bundle=await esbuild.build({absWorkingDir:root,entryPoints:['tests/browser/provider-state-feedback.jsx'],
 outfile:path.join(output,'app.js'),bundle:true,format:'iife',platform:'browser',jsx:'automatic',metafile:true,
 define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},plugins:[{name:'synthetic-feedback-boundaries',setup(build){
  build.onResolve({filter:/.*/},args=>{
   if(args.path==='provider-state-fixture')return{path:fixture};
   if(Object.hasOwn(mocks,args.path))return{path:args.path,namespace:'mock'};
   const stem=args.path.startsWith('@/')?path.join(root,args.path.slice(2)):args.path.startsWith('.')?path.resolve(args.resolveDir,args.path):args.path;
   for(const suffix of ['','.ts','.tsx']){const relative=path.relative(root,stem+suffix).split(path.sep).join('/');
    if(Object.hasOwn(mocks,relative))return{path:relative,namespace:'mock'};}
  });
  build.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:root}));
 }}]});
const inputs=[];
for(const name of Object.keys(bundle.metafile.inputs))if(!name.startsWith('mock:')&&!name.startsWith('<')&&!name.includes('node_modules/'))
 inputs.push({path:name,sha256:sha(await readFile(path.resolve(root,name)))});
const harness=[];
for(const name of ['provider-state-feedback.mjs','provider-state-feedback.jsx','provider-state-feedback-fixture.mjs','provider-state-feedback-cases.mjs'])
 harness.push({path:'tests/browser/'+name,sha256:sha(await readFile(path.join(root,'tests/browser',name)))});
const proof={schemaVersion:1,kind:'provider-state-feedback-browser-v1',startedAt:new Date().toISOString(),sourceRoot:root,
 node:process.version,boundary:'Browser fixture using native dialog and React DOM StrictMode with real feedback/dialog/preference presentation/session/account-store/translation modules. API results, Auth session, V2 language context and Next Link are explicit synthetic boundaries. A labeled synthetic control panel is portaled into the open native dialog so mock responses can be changed by clicks. One unconfirmed write, held and failed read, fresh read and externally replaced old row are injected. No live account, server RPC, SQL, user content, message send, full Next routing or actual two-tab timing is exercised. Actual browser execution requires completed case evidence; serving or launch alone is not a pass.',
 mocks:Object.keys(mocks),inputs,harness,bundleSha256:sha(await readFile(path.join(output,'app.js'))),cases:[],failures:[]};
const inventoryPath=process.env.SELQIRO_BUILD_INPUTS||path.join(root,'../build-inputs.json');
const inventoryBytes=await readFile(inventoryPath),inventory=JSON.parse(inventoryBytes);
const runtime=inputs.filter(item=>/^(src|lib|components|app)\//.test(item.path));
proof.buildAlignment={inventoryPath,inventorySha256:sha(inventoryBytes),count:runtime.length,
 mismatches:runtime.filter(item=>inventory[item.path]!==item.sha256).map(item=>item.path)};
assert.deepEqual(proof.buildAlignment.mismatches,[],'Browser runtime must match the completed production build');
async function files(directory){const entries=await readdir(directory,{withFileTypes:true});
 return(await Promise.all(entries.map(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):path.join(directory,entry.name)))).flat();}
const staticRoot=path.join(root,'.next/static'),css=(await files(staticRoot)).filter(name=>name.endsWith('.css'));assert.ok(css.length);
proof.productionCss=await Promise.all(css.map(async name=>({path:path.relative(root,name),sha256:sha(await readFile(name))})));
const links=css.map(name=>`<link rel="stylesheet" href="/_next/static/${path.relative(staticRoot,name)}">`).join('');
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+links+'</head><body class="bg-neutral-50"><div id="root"></div><script src="/app.js"></script></body></html>';
const server=createServer(async(request,response)=>{try{const url=new URL(request.url,'http://localhost');
 if(url.pathname==='/app.js'){response.setHeader('content-type','application/javascript');response.end(await readFile(path.join(output,'app.js')));}
 else if(url.pathname.startsWith('/_next/static/')){const name=path.resolve(staticRoot,url.pathname.slice('/_next/static/'.length));
  assert.ok(name.startsWith(staticRoot+path.sep));response.setHeader('content-type',name.endsWith('.css')?'text/css':name.endsWith('.woff2')?'font/woff2':'application/octet-stream');response.end(await readFile(name));}
 else if(url.pathname==='/provider-state-feedback'){response.setHeader('content-type','text/html');response.end(html);}
 else{response.statusCode=204;response.end();}
 }catch{response.statusCode=404;response.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
if(process.argv.includes('--serve')){
 const serving={...proof,status:'SERVING_FOR_MANUAL_BROWSER_REVIEW',origin,pid:process.pid,
  browserExecuted:false,note:'No automated browser cases have run. A permitted browser surface must observe the result separately.'};
 await writeFile(path.join(output,'manual-ui-server.json'),JSON.stringify(serving,null,2)+'\n');
 console.log(JSON.stringify({status:serving.status,origin,pid:process.pid,runtimeInputs:runtime.length,
  buildAlignment:proof.buildAlignment,productionCss:proof.productionCss.length}));
 await new Promise(resolve=>{process.once('SIGTERM',resolve);process.once('SIGINT',resolve);});
 const inputDrift=[];for(const item of [...inputs,...harness])
  if(sha(await readFile(path.resolve(root,item.path)))!==item.sha256)inputDrift.push(item.path);
 await writeFile(path.join(output,'manual-ui-server-stop.json'),JSON.stringify({status:'STOPPED',
  finishedAt:new Date().toISOString(),inputDrift,browserExecuted:false},null,2)+'\n');
 await new Promise(resolve=>server.close(resolve));process.exit(inputDrift.length?1:0);
}
const {chromium}=require(process.env.SELQIRO_BROWSER_PLAYWRIGHT||'playwright');let browser;
try{browser=await chromium.launch({headless:true,executablePath:process.env.SELQIRO_BROWSER_EXECUTABLE||undefined,args:['--disable-dev-shm-usage']});
 proof.browser=browser.version();await runProviderStateFeedbackCases({browser,origin,output,proof});proof.status='PASS';
}catch(error){proof.status='FAIL';proof.failures.push({message:error.message,stack:error.stack});console.error(error);process.exitCode=1;}
finally{proof.inputDrift=[];for(const item of [...inputs,...harness])
 if(sha(await readFile(path.resolve(root,item.path)))!==item.sha256)proof.inputDrift.push(item.path);
 if(proof.inputDrift.length){proof.status='FAIL';process.exitCode=1;}
 proof.testCount=proof.cases.length;proof.passed=proof.cases.filter(item=>item.status==='PASS').length;
 proof.failed=proof.cases.filter(item=>item.status==='FAIL').length;proof.finishedAt=new Date().toISOString();
 await writeFile(path.join(output,'browser-result.json'),JSON.stringify(proof,null,2)+'\n');
 await browser?.close();await new Promise(resolve=>server.close(resolve));
 console.log(`${proof.status}: ${proof.passed}/${proof.testCount}; ${output}/browser-result.json`);}
