import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runProviderControlBrowserCases} from './viewer-provider-controls-cases.mjs';

const require=createRequire(import.meta.url),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.resolve(process.env.SELQIRO_BROWSER_OUTPUT||path.join(root,'../browser-proof'));
const esbuild=require(process.env.SELQIRO_BROWSER_ESBUILD||'esbuild');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
await mkdir(output,{recursive:true});
const mocks={
  'next/link':`import React from 'react';import {navigate} from 'provider-fixture';export default function Link({href,prefetch,replace,scroll,children,onClick,...props}){
    return <a {...props} href={href} onClick={event=>{onClick?.(event);if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(href,replace);}}>{children}</a>;}`,
  'next/navigation':`import {fixture} from 'provider-fixture';export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>fixture.router;`,
  'src/shared/i18n/V2LanguageProvider.tsx':`import {fixture} from 'provider-fixture';import {getCatalogTranslation} from '${root}/lib/i18n/useTranslation.ts';
    export const useV2Language=()=>({language:fixture.language});export const useV2Translation=catalog=>({language:fixture.language,t:(key,params)=>getCatalogTranslation(fixture.language,catalog,key,params)});`,
  'src/shared/supabase/browserClient.ts':`export {client as supabaseBrowserClient} from 'provider-fixture';`,
  'src/entities/viewer-provider-controls/api/providerControlsClient.ts':`export {controlsClient as providerControlsClient} from 'provider-fixture';`,
  'src/entities/listing/api/searchPublicListings.ts':`export {searchListings as searchPublicListings} from 'provider-fixture';`,
  'src/entities/service/api/getPublicService.ts':`export {searchServices as searchPublicServices} from 'provider-fixture';export const SERVICE_SEARCH_PAGE_SIZE=24;`,
  'src/entities/service-category/api/getServiceCategories.ts':`export async function getServiceCategories(){return [];}`,
  'src/entities/profile/api/getPublicProfileBySlug.ts':`export {readProfile as getPublicProfileBySlug} from 'provider-fixture';`,
  'src/features/public-profile/components/PublicProfileListingsSection.tsx':`export default function Listings(){return null;}`,
  'src/features/public-profile/components/PublicProfileServicesSection.tsx':`export default function Services(){return null;}`,
  'src/features/public-profile/components/PublicProfileProductShowcasesSection.tsx':`export default function Showcases(){return null;}`,
  'src/shared/config/v2Integration.ts':`export const v2IntegrationEnabled=()=>true;export const v2NavigationContextEnabled=()=>true;export const localPublicationOrigin=()=>undefined;`,
};
const bundle=await esbuild.build({absWorkingDir:root,entryPoints:['tests/browser/viewer-provider-controls.jsx'],outfile:path.join(output,'app.js'),
  bundle:true,format:'iife',platform:'browser',jsx:'automatic',metafile:true,define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},
  plugins:[{name:'synthetic-provider-api-auth',setup(build){build.onResolve({filter:/.*/},args=>{
    if(args.path==='provider-fixture')return{path:path.join(root,'tests/browser/viewer-provider-controls-fixture.jsx')};
    if(Object.hasOwn(mocks,args.path))return{path:args.path,namespace:'mock'};
    const stem=args.path.startsWith('@/')?path.join(root,args.path.slice(2)):args.path.startsWith('.')?path.resolve(args.resolveDir,args.path):args.path;
    for(const suffix of['','.ts','.tsx']){const relative=path.relative(root,stem+suffix).split(path.sep).join('/');if(Object.hasOwn(mocks,relative))return{path:relative,namespace:'mock'};}
  });build.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'jsx',resolveDir:root}));}}]});
const inputs=[];
for(const name of Object.keys(bundle.metafile.inputs))if(!name.startsWith('mock:')&&!name.startsWith('<')&&!name.includes('node_modules/'))inputs.push({path:name,sha256:sha(await readFile(path.resolve(root,name)))});
const harness=[];for(const name of['viewer-provider-controls.jsx','viewer-provider-controls-fixture.jsx','viewer-provider-controls-cases.mjs','viewer-provider-controls.mjs'])
  harness.push({path:'tests/browser/'+name,sha256:sha(await readFile(path.join(root,'tests/browser',name)))});
const proof={schemaVersion:1,startedAt:new Date().toISOString(),sourceRoot:root,node:process.version,
  boundary:'Prepared Chromium fixture using React DOM in StrictMode, provider controls/session/account store, product and service discovery cards/pages/hooks, management lists, actual public profile page/header/menu/read hook, conversation block-state hook and ThreadActions, EN/ET messages. API/Auth/search/profile responses, Link/router and the three unrelated profile content sections are synthetic boundaries. No live database, full Next routing, live accounts, content writes or message sends. Browser execution is proved only by completed case results; SQL and authenticated transport are separately tested.',
  mocks:Object.keys(mocks),inputs,harness,cases:[],failures:[],bundleSha256:sha(await readFile(path.join(output,'app.js')))};
if(process.argv.includes('--prepare')){await writeFile(path.join(output,'prepared.json'),JSON.stringify({...proof,status:'PREPARED_NOT_RUN'},null,2)+'\n');console.log('PREPARED '+output);process.exit(0);}
const inventoryPath=process.env.SELQIRO_BUILD_INPUTS||path.join(root,'../build-inputs.json'),inventoryBytes=await readFile(inventoryPath),inventory=JSON.parse(inventoryBytes);
const runtime=inputs.filter(item=>/^(src|lib|components|app)\//.test(item.path));
proof.buildAlignment={inventoryPath,inventorySha256:sha(inventoryBytes),count:runtime.length,mismatches:runtime.filter(item=>inventory[item.path]!==item.sha256).map(item=>item.path)};
assert.deepEqual(proof.buildAlignment.mismatches,[],'Browser runtime source must match the completed production build inventory');
async function files(directory){const entries=await readdir(directory,{withFileTypes:true});return(await Promise.all(entries.map(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):path.join(directory,entry.name)))).flat();}
const staticRoot=path.join(root,'.next/static'),css=(await files(staticRoot)).filter(file=>file.endsWith('.css'));assert.ok(css.length);
proof.productionCss=await Promise.all(css.map(async file=>({path:path.relative(root,file),sha256:sha(await readFile(file))})));
const cssLinks=css.map(file=>`<link rel="stylesheet" href="/_next/static/${path.relative(staticRoot,file)}">`).join('');
const appCss=await stat(path.join(output,'app.css')).then(()=>true).catch(()=>false);
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+cssLinks+(appCss?'<link rel="stylesheet" href="/app.css">':'')+'</head><body class="bg-neutral-50"><div id="root"></div><script src="/app.js"></script></body></html>';
const server=createServer(async(request,response)=>{try{const url=new URL(request.url,'http://localhost');
  if(url.pathname==='/app.js'||url.pathname==='/app.css'){response.setHeader('content-type',url.pathname.endsWith('.css')?'text/css':'application/javascript');response.end(await readFile(path.join(output,url.pathname.slice(1))));}
  else if(url.pathname.startsWith('/_next/static/')){const file=path.resolve(staticRoot,url.pathname.slice('/_next/static/'.length));assert.ok(file.startsWith(staticRoot+path.sep));response.setHeader('content-type',file.endsWith('.css')?'text/css':file.endsWith('.woff2')?'font/woff2':'application/octet-stream');response.end(await readFile(file));}
  else if(url.pathname.startsWith('/v2/')){response.setHeader('content-type','text/html');response.end(html);}else{response.statusCode=204;response.end();}
}catch{response.statusCode=404;response.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
if(process.argv.includes('--serve')) {
  const manual={...proof,status:'SERVING_FOR_MANUAL_UI_REVIEW',origin,pid:process.pid,
    note:'No automated Chromium cases have run. Use the explicit synthetic test controls and document each observed result separately.'};
  await writeFile(path.join(output,'manual-ui-server.json'),JSON.stringify(manual,null,2)+'\n');
  console.log(JSON.stringify({status:manual.status,origin,productionCss:proof.productionCss.length,runtimeInputs:runtime.length,mismatches:proof.buildAlignment.mismatches}));
  await new Promise(resolve=>{process.once('SIGTERM',resolve);process.once('SIGINT',resolve);});
  await new Promise(resolve=>server.close(resolve));process.exit(0);
}
const {chromium}=require(process.env.SELQIRO_BROWSER_PLAYWRIGHT||'playwright');let browser;
try{browser=await chromium.launch({headless:true,executablePath:process.env.SELQIRO_BROWSER_EXECUTABLE||undefined,args:['--disable-dev-shm-usage']});proof.browser=browser.version();
  await runProviderControlBrowserCases({browser,origin,output,proof});proof.status='PASS';
}catch(error){proof.status='FAIL';proof.failures.push({message:error.message,stack:error.stack});console.error(error);process.exitCode=1;}
finally{proof.inputDrift=[];for(const item of [...inputs,...harness])if(sha(await readFile(path.resolve(root,item.path)))!==item.sha256)proof.inputDrift.push(item.path);
  if(proof.inputDrift.length){proof.status='FAIL';process.exitCode=1;}proof.testCount=proof.cases.length;proof.passed=proof.cases.filter(item=>item.status==='PASS').length;proof.failed=proof.cases.filter(item=>item.status==='FAIL').length;
  proof.finishedAt=new Date().toISOString();await writeFile(path.join(output,'browser-result.json'),JSON.stringify(proof,null,2)+'\n');
  await browser?.close();await new Promise(resolve=>server.close(resolve));console.log(`${proof.status}: ${proof.passed}/${proof.testCount}; ${output}/browser-result.json`);}
