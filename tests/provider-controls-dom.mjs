// Bounded React DOM integration, NOT a real-browser, native-dialog or visual test.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(process.env.SELQIRO_DOM_OUTPUT||path.join(root,'../dom-proof'));
const preparedDirectory=path.resolve(process.env.SELQIRO_BROWSER_OUTPUT||path.join(root,'../browser-proof'));
const jsdomModule=process.env.SELQIRO_DOM_JSDOM||path.join(root,'../test-tools/node_modules/jsdom');
const {JSDOM,VirtualConsole}=require(jsdomModule),jsdomVersion=require(path.join(jsdomModule,'package.json')).version;
const sha=value=>createHash('sha256').update(value).digest('hex');
const bundle=await readFile(path.join(preparedDirectory,'app.js'),'utf8');
const prepared=JSON.parse(await readFile(path.join(preparedDirectory,'prepared.json'),'utf8'));
const inventoryPath=process.env.SELQIRO_BUILD_INPUTS||path.join(root,'../build-inputs.json'),inventoryBytes=await readFile(inventoryPath),inventory=JSON.parse(inventoryBytes);
const runtime=prepared.inputs.filter(item=>/^(src|lib|components|app)\//.test(item.path));
const mismatches=[];
for(const item of runtime)if(inventory[item.path]!==item.sha256||sha(await readFile(path.join(root,item.path)))!==item.sha256)mismatches.push(item.path);
assert.deepEqual(mismatches,[]);assert.equal(sha(Buffer.from(bundle)),prepared.bundleSha256);
const proof={kind:'provider-controls-react-dom-integration-v1',startedAt:new Date().toISOString(),environment:'jsdom '+jsdomVersion,
  actualBrowser:false,nativeDialog:false,visualOrLayoutAssertions:false,networkAllowed:false,
  boundary:'Actual prepared esbuild React/ReactDOM StrictMode bundle, product/service discovery components and hooks, provider controller/account store, management lists and conversation block read. Synthetic API/Auth and Link/router fixture. showModal/close, click-to-focus, task MessageChannel, ResizeObserver and scrolling are explicit DOM environment substitutes. No Chromium, OS browser, network, live account, database, image or message operation.',
  buildAlignment:{inventoryPath,inventorySha256:sha(inventoryBytes),count:runtime.length,mismatches},runtimeInputs:runtime,
  bundleSha256:sha(Buffer.from(bundle)),harnessInputs:[...prepared.harness,{path:'tests/provider-controls-dom.mjs',sha256:sha(await readFile(fileURLToPath(import.meta.url)))}],cases:[]};
await mkdir(output,{recursive:true});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function context(route){const errors=[],warnings=[],network=[],virtualConsole=new VirtualConsole();
  const trace=value=>{if(process.env.SELQIRO_DOM_TRACE)console.log(value);};
  virtualConsole.on('jsdomError',error=>{errors.push(error.message);if(errors.length<4)trace(error.stack);});virtualConsole.on('error',(...values)=>{errors.push(values.map(String).join(' '));if(errors.length<4)trace(errors.at(-1));});virtualConsole.on('warn',(...values)=>{warnings.push(values.map(String).join(' '));if(warnings.length<4)trace(warnings.at(-1));});
  const dom=new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>',{url:'https://selqiro-fixture.invalid'+route,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
  const w=dom.window;w.structuredClone=structuredClone;
  // jsdom has no MessageChannel. React.act needs only this macrotask callback;
  // no OS channel, socket, worker or browser is created.
  w.MessageChannel=class{constructor(){this.port1={onmessage:null,close(){}};this.port2={postMessage:data=>w.setTimeout(()=>this.port1.onmessage?.({data}),0),close(){}};}};
  if(!w.crypto.randomUUID)Object.defineProperty(w.crypto,'randomUUID',{value:randomUUID});
  const forbidden=name=>(...args)=>{network.push({name,argument:String(args[0]??'')});throw Error('Network is not available in this DOM integration test');};
  w.fetch=forbidden('fetch');w.XMLHttpRequest=forbidden('XMLHttpRequest');w.WebSocket=forbidden('WebSocket');
  w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
  trace('DOM ready '+route);w.IS_REACT_ACT_ENVIRONMENT=false;w.eval(bundle);w.IS_REACT_ACT_ENVIRONMENT=true;trace('Bundle evaluated');
  // Bound a faulty effect's synthetic read loop before it can exhaust memory.
  const originalGet=w.__providerControls.controlsClient.get;let getCount=0;
  w.__providerControls.controlsClient.get=async(...args)=>{if(++getCount>20){errors.push('Synthetic GET exceeded 20 calls: '+JSON.stringify(args.slice(0,2)));return new Promise(()=>{});}return originalGet(...args);};
  const act=w.__providerReactAct;assert.equal(typeof act,'function');
  const settle=async(ms=360)=>{await act(async()=>{await delay(0);});await act(async()=>{await delay(ms);});await act(async()=>{await delay(0);});};
  trace('Initial act starts');await settle();trace('Initial act completed');
  const doc=w.document,all=selector=>[...doc.querySelectorAll(selector)],button=(scope,label)=>[...scope.querySelectorAll('button')].find(node=>{
    const dialog=node.closest('dialog'),details=node.closest('details');
    return (!dialog||dialog.open)&&(!details||details.open)&&node.textContent.trim()===label;
  });
  const click=async node=>{assert.ok(node,'Expected a rendered control');assert.notEqual(node.disabled,true,'Control must be enabled');
    // jsdom .click() dispatches activation but omits the pointer's focus step.
    // Native focus policy is still a pending real-browser check.
    await act(async()=>{node.focus();node.click();});await settle();};
  const run=async fn=>{await act(async()=>{fn(w.__providerControls);});await settle();};
  const openDialog=()=>doc.querySelector('[data-provider-dialog][open]');
  return{w,doc,errors,warnings,network,all,button,click,run,settle,openDialog,
    async close(){await act(async()=>{w.__providerUnmount();});w.close();assert.deepEqual(network,[]);assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);}};
}
async function choose(h,card,label){const url=h.w.location.href;await h.click(card.querySelector('summary'));await h.click(h.button(card,label));
  assert.equal(h.w.location.href,url,'A menu action must not navigate the surrounding card link');const dialog=h.openDialog();assert.ok(dialog);return dialog;}
const cases=[
  ['ET product menu, provider-wide hide and independent Undo', '/v2/products?lang=et',async h=>{
    assert.equal(h.all('[data-listing-card-id]').length,3);assert.equal(h.w.__providerControls.calls.filter(c=>c.method==='get').length,0);
    let box=await choose(h,h.doc.querySelector('[data-listing-card-id="101"]'),'Peida pakkuja 24 tunniks');
    assert.ok(h.doc.activeElement===h.button(box,'Loobu'),'Cancel receives DOM focus');await h.click(h.button(box,'Loobu'));
    assert.ok(h.doc.activeElement===h.doc.querySelector('[data-listing-card-id="101"] summary'),'Cancel restores DOM focus');
    box=await choose(h,h.doc.querySelector('[data-listing-card-id="101"]'),'Peida pakkuja 24 tunniks');await h.click(h.button(box,'Peida pakkuja 24 tunniks'));
    assert.equal(h.all('[data-listing-card-id]').length,1);assert.equal(h.all('[data-listing-card-id]')[0].dataset.listingCardId,'102');
    const notice=h.doc.querySelector('[data-provider-notice]');assert.match(notice.textContent,/24 tunniks peidetud/);
    assert.ok(h.doc.activeElement===notice,'Removed card focus moves to notice');await h.click(h.button(notice,'Võta tagasi'));assert.equal(h.all('[data-listing-card-id]').length,3);
    return{noPerCardRead:true,menuDidNotNavigate:true,ordinaryAndHorseProviderRowsRemoved:true,undoSurvivesCardRemoval:true,DOMFocusRestored:true};
  }],
  ['EN service lost acknowledgement, explicit read and Undo','/v2/services?lang=en',async h=>{
    assert.equal(h.all('[data-service-card-id]').length,3);await h.run(f=>f.loseNextAcknowledgement());
    const box=await choose(h,h.doc.querySelector('[data-service-card-id="66666666-6666-4666-8666-666666666666"]'),'Hide provider for 24 hours');
    await h.click(h.button(box,'Hide provider for 24 hours'));assert.match(box.textContent,/The change could not be confirmed/);
    assert.ok(!h.button(box,'Hide provider for 24 hours'),'Unknown outcome has no repeat-write button');assert.equal(h.w.__providerControls.calls.filter(c=>c.method==='set').length,1);
    await h.click(h.button(box,'Check saved state'));assert.equal(h.all('[data-service-card-id]').length,1);
    assert.equal(h.w.__providerControls.calls.filter(c=>c.method==='set').length,1);assert.equal(h.w.__providerControls.calls.filter(c=>c.method==='get').length,2);
    await h.click(h.button(h.doc.querySelector('[data-provider-notice]'),'Undo'));assert.equal(h.all('[data-service-card-id]').length,3);
    return{actualServiceSearchHooks:true,lostResponseNotReplayed:true,explicitReadConfirmsRevision:true,undoRestoresProvider:true};
  }],
  ['ET management server pages 25 + 1 and Show again','/v2/my-area?lang=et',async h=>{
    await h.run(f=>f.seedHidden());const list=h.doc.querySelector('[data-provider-control-list="hidden"]');
    assert.equal(list.querySelectorAll('[data-provider-control-row]').length,25);await h.click(h.button(list,'Järgmine'));
    assert.equal(list.querySelectorAll('[data-provider-control-row]').length,1);assert.match(list.textContent,/Hidden provider 26/);
    await h.click(h.button(list,'Näita uuesti'));await h.click(h.button(h.openDialog(),'Näita uuesti'));
    assert.equal(list.querySelectorAll('[data-provider-control-row]').length,25);
    const offsets=h.w.__providerControls.calls.filter(c=>c.method==='list'&&c.kind==='hidden').map(c=>c.offset);
    assert.ok(offsets.includes(25));assert.equal(offsets.at(-1),0);assert.ok(h.doc.activeElement===h.doc.querySelector('[data-provider-notice]'),'Removed row focus moves to notice');
    return{boundedManagementReads:true,nextPageContainsOne:true,lastRowRemovalRereadsValidPage:true,showAgainExplicit:true};
  }],
  ['Conversation target distinguishes incoming block and own Unblock','/v2/messages/9?lang=en&scenario=incoming',async h=>{
    await h.click(h.doc.querySelector('section summary'));let button=h.button(h.doc,'User blocked');assert.ok(button);assert.equal(button.disabled,true);
    assert.ok(!h.button(h.doc,'Unblock user'),'Incoming-only block has no visible Unblock action');const getTargets=h.w.__providerControls.calls.filter(c=>c.method==='get').map(c=>c.target.type);
    assert.ok(getTargets.length>0&&getTargets.every(target=>target==='conversation'));
    await h.run(f=>f.ownBlock());button=h.button(h.doc,'Unblock user');assert.ok(button);assert.equal(button.disabled,false);
    assert.equal(h.w.__providerControls.calls.filter(c=>c.method==='set').length,0);assert.ok(h.doc.querySelector('[data-test-history]'));
    return{exactConversationTargetRead:true,verifiedIncomingLabel:true,incomingCannotUnblock:true,ownBlockShowsUnblock:true,noMessageOrBlockMutation:true};
  }],
  ['Lost unblock can close after unavailable read and continue safely','/v2/my-area?lang=en&scenario=lost-unblock',async h=>{
    const list=h.doc.querySelector('[data-provider-control-list="blocked"]');assert.equal(list.querySelectorAll('[data-provider-control-row]').length,1);
    await h.run(f=>f.loseNextAcknowledgement());await h.click(h.button(list,'Unblock user'));let box=h.openDialog();await h.click(h.button(box,'Unblock user'));
    assert.match(box.textContent,/The change could not be confirmed/);await h.click(h.button(box,'Check saved state'));
    assert.match(box.textContent,/The saved state was read, but this change still cannot be confirmed/);assert.ok(!h.doc.querySelector('[data-provider-notice]'),'No unproved success notice');
    await h.click(h.button(box,'Cancel'));assert.ok(h.doc.activeElement===h.doc.querySelector('[data-provider-controls-surface]'),'Removed row falls back to connected surface');
    await h.run(f=>f.navigate('/v2/products?lang=en'));box=await choose(h,h.doc.querySelector('[data-listing-card-id="101"]'),'Hide provider for 24 hours');
    assert.ok(h.button(box,'Hide provider for 24 hours'));assert.equal(h.w.__providerControls.calls.filter(c=>c.method==='set').length,1);
    return{noFalseSuccessClaim:true,explicitReadReleasesLock:true,removedTriggerDOMFocusFallback:true,newActionNeedsSeparateConfirmation:true};
  }],
];
for(const [name,route,run] of cases.filter(([name])=>!process.env.SELQIRO_DOM_CASE||name.toLowerCase().includes(process.env.SELQIRO_DOM_CASE.toLowerCase()))){let h;const evidence={name,status:'FAIL'};
  try{h=await context(route);evidence.observed=await run(h);await h.close();h=null;evidence.status='PASS';console.log('PASS '+name);}
  catch(error){evidence.error=error.stack;console.error('FAIL '+name+'\n'+error.stack);if(h){evidence.errors=h.errors;evidence.warnings=h.warnings;evidence.network=h.network;try{await h.close();}catch{};}}
  proof.cases.push(evidence);
}
proof.inputDrift=[];for(const item of [...runtime,...proof.harnessInputs])if(sha(await readFile(path.join(root,item.path)))!==item.sha256)proof.inputDrift.push(item.path);
proof.passed=proof.cases.filter(item=>item.status==='PASS').length;proof.failed=proof.cases.length-proof.passed;proof.status=proof.failed||proof.inputDrift.length?'FAIL':'PASS';proof.finishedAt=new Date().toISOString();
await writeFile(path.join(output,'dom-result.json'),JSON.stringify(proof,null,2)+'\n');console.log(`${proof.status}: ${proof.passed}/${proof.cases.length}; ${output}/dom-result.json`);
if(proof.status!=='PASS')process.exitCode=1;
