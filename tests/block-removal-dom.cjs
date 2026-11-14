'use strict';
// Targeted ReactDOM integration of the new removal path. This is not browser/visual QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),sha=b=>createHash('sha256').update(b).digest('hex'),inputs=new Map();
const {JSDOM,VirtualConsole}=require(process.env.SELQIRO_DOM_JSDOM||'/workspace/scratch/fa20e0c9fa19/work/selqiro-provider-controls/test-tools/node_modules/jsdom');
const React=require('react'),{act}=React;
const U='11111111-1111-4111-8111-111111111111',I='22222222-2222-4222-8222-222222222222';
const V='33333333-3333-4333-8333-333333333333',J='44444444-4444-4444-8444-444444444444',P='55555555-5555-4555-8555-555555555555';
const PHOTO='66666666-6666-4666-8666-666666666666',B='9007199254740993',T='2026-11-13T19:17:00.000001Z';
const tick=()=>new Promise(r=>setImmediate(r)),later=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
function loader(overrides,externals){
 const cache=new Map();
 return function load(name){
  const file=path.resolve(root,name),relative=path.relative(root,file).split(path.sep).join('/');
  if(Object.hasOwn(overrides,relative))return overrides[relative];if(cache.has(file))return cache.get(file).exports;
  if(file.endsWith('.css'))return new Proxy({},{get:(_o,key)=>String(key)});
  const bytes=fs.readFileSync(file),digest=sha(bytes);if(inputs.has(relative))assert.equal(inputs.get(relative),digest);inputs.set(relative,digest);
  const module={exports:{}};cache.set(file,module);
  const result=ts.transpileModule(bytes.toString(),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}});
  const local=name=>{
   if(Object.hasOwn(externals,name))return externals[name];
   if(!name.startsWith('.')&&!name.startsWith('@/'))return require(name);
   const p=name.startsWith('@/')?path.resolve(root,name.slice(2)):path.resolve(path.dirname(file),name);
   return load(fs.existsSync(p)?p:fs.existsSync(p+'.ts')?p+'.ts':p+'.tsx');
  };
  vm.runInThisContext('(function(module,exports,require){'+result.outputText+'\n})',{filename:file})(module,module.exports,local);return module.exports;
 };
}
async function fixture({language='en',own=false,peer=false}={}){
 const errors=[],warnings=[],network=[],consoleErrors=console.error,consoleWarnings=console.warn;
 const virtual=new VirtualConsole();virtual.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://fixture.invalid/v2/messages/9',pretendToBeVisual:true,virtualConsole:virtual}),w=dom.window;
 for(const name of ['window','document','HTMLElement','HTMLDialogElement','HTMLTextAreaElement','Node','Event','CustomEvent','MutationObserver'])global[name]=name==='window'?w:name==='document'?w.document:w[name];
 Object.defineProperty(global,'navigator',{value:w.navigator,configurable:true});global.CSS={supports:()=>true};global.IS_REACT_ACT_ENVIRONMENT=true;
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.confirm=()=>true;
 w.HTMLElement.prototype.scrollIntoView=function(){};
 const forbid=(...args)=>{network.push(String(args[0]));throw Error('No network in this DOM fixture');};w.fetch=forbid;global.fetch=forbid;
 console.error=(...args)=>errors.push(args.map(String).join(' '));console.warn=(...args)=>warnings.push(args.map(String).join(' '));
 const callbacks=new Set(),calls=[];
 const state={user:U,identity:I,own:own?{id:B,createdAt:T}:null,peer,holdWrite:null,lose:false,storeIdentity:P,allRows:null,photoCommitted:0};
 const token=()=>`token-${state.user}`,session=()=>({user:{id:state.user},access_token:token()});
 const client={auth:{async getSession(){return{data:{session:session()},error:null};},async getUser(){return{data:{user:{id:state.user}},error:null};},onAuthStateChange(fn){callbacks.add(fn);return{data:{subscription:{unsubscribe(){callbacks.delete(fn);}}}};}},
  from(table){assert.equal(table,'profiles');return{select(){return{eq(){return{async maybeSingle(){return{data:{active_identity_id:state.identity},error:null};}};}};}};}};
 const person={identityId:P,displayName:'Stored peer',slug:'peer',avatarUrl:null};
 function snapshot(actor,target){
  let row=state.own,available=target.type==='conversation'||target.type==='profile';
  if(target.type==='blocked_account'){
   row=state.allRows?.find(r=>r.id===target.id)??(state.own?.id===target.id?state.own:null);available=!!row;
  }
  if(actor.userId!==U){row=null;available=target.type==='conversation'||target.type==='profile';}
  return{actorUserId:actor.userId,target:{...target},targetToken:available?'a'.repeat(64):null,targetAvailable:available,
   provider:available?{...person,displayName:target.type==='profile'?'Business owner':'Stored peer'}:{identityId:null,displayName:'Selqiro',slug:null,avatarUrl:null},
   hiddenUntil:null,hidden:false,hideRevision:null,blockedByMe:!!row&&available,blockedByOther:state.peer,
   blockId:available?row?.id??null:null,blockCreatedAt:available?row?.createdAt??null:null,
   canHide:available&&target.type==='profile',canBlock:available&&target.type!=='conversation',serverNow:T};
 }
 let ErrorType;
 const controlsClient={async get(actor,target){calls.push({method:'get',user:actor.userId,target:{...target}});if(calls.length>150)throw Error('Bounded fixture call limit');return snapshot(actor,target);},
  async list(actor,kind,offset=0){calls.push({method:'list',kind,offset,user:actor.userId});const rows=state.allRows??(state.own?[state.own]:[]);
   const items=rows.slice(offset,offset+25).map(row=>snapshot(actor,{type:'blocked_account',id:row.id}));return{actorUserId:actor.userId,kind,items,totalCount:String(rows.length),limit:25,offset,hasMore:offset+25<rows.length,nextOffset:offset+25<rows.length?offset+25:null};},
  async set(actor,before,action){calls.push({method:'set',user:actor.userId,target:{...before.target},before:{...before},action});const current=snapshot(actor,before.target);
   if(!current.targetAvailable||current.blockId!==before.blockId||current.blockCreatedAt!==before.blockCreatedAt)throw new ErrorType('stale');
   if(action==='block')state.own={id:B,createdAt:T};else if(action==='unblock'){
    if(state.allRows)state.allRows=state.allRows.filter(row=>row.id!==before.blockId);else state.own=null;
   }else assert.fail('No hide preference writes in block-removal fixture');
   const result={...before,blockedByMe:action==='block',blockId:action==='block'?B:null,blockCreatedAt:action==='block'?T:null,blockedByOther:state.peer,action,changed:true};
   if(state.holdWrite)await state.holdWrite.promise;
   if(state.lose){state.lose=false;throw new ErrorType('outcome_unknown');}return result;
  }};
 const actorIdentity=id=>({identity_id:id,name:id===I?'Own identity':'Other identity',avatar_url:null});
 const messageApi={async getMessageThread(_token,c){calls.push({method:'thread',user:c.expectedUserId});return{schema_version:2,actor_user_id:c.expectedUserId,identity_id:c.expectedIdentityId,
  conversation_id:'9',actor:actorIdentity(c.expectedIdentityId),peer:{identity_id:P,name:'Stored peer',avatar_url:null},listing:null,
  can_send:!state.own&&!state.peer,blocked_by_me:!!state.own,messages:[{id:'21',mine:false,text:c.expectedUserId===U?'Existing history':'Other account history',text_truncated:false,created_at:T,listing:null,image:null}],
  next_before_message_id:null,attachment_listing_id:null,attachment_listing:null};},
  async setThreadBlocked(_token,c){assert.equal(c.blocked,true);calls.push({method:'create',command:{...c}});state.own={id:B,createdAt:T};return{};},
  async hideThread(){assert.fail('No hide thread write in removal test');},async sendMessage(){assert.fail('No messages are sent in removal test');}};
 const noop=()=>{},photo={owner:U+'/'+I,state:'ready',attachmentId:PHOTO,previewUrl:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',error:null};
 const languageModule={useV2Language:()=>({language}),useV2Translation:catalog=>({language,t:(key,params)=>String(catalog[language]?.[key]??catalog.en[key]).replace(/\{(\w+)\}/g,(_s,k)=>String(params?.[k]??''))})};
 const overrides={
  'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:client},
  'src/entities/viewer-provider-controls/api/providerControlsClient.ts':{providerControlsClient:controlsClient},
  'src/entities/conversation/api/messagingClient.ts':messageApi,
  'src/shared/i18n/V2LanguageProvider.tsx':languageModule,
  'src/shared/config/v2Integration.ts':{v2IntegrationEnabled:()=>true},
  'src/features/listing-conversation/model/useMessagePhoto.ts':{useMessagePhoto(_id,actor){const current=React.useRef(photo);const changed=!!actor&&(actor.expectedUserId+'/'+actor.expectedIdentityId!==photo.owner);return{current,changed,visiblePhoto:changed?null:photo,photo,locked:false,waitingForActor:false,selectionProblem:null,
   committed(){state.photoCommitted++;},choose:noop,retry:noop,beginSelection:()=>true,cancelSelection:noop,cancelPending:noop,remove:noop};}},
  'src/features/listing-conversation/model/useThreadReadWatermark.ts':{useThreadReadWatermark:()=>noop},
  'src/features/listing-conversation/model/useConversationViewport.ts':{useConversationViewport:()=>React.useRef(null)},
  'src/features/listing-conversation/model/useConversationScroll.ts':{useConversationScroll:()=>({historyRef:React.useRef(null),onScroll:noop,jumpToLatest:noop,prepareEarlier:noop,newMessages:false})},
 };
 const externals={'next/link':{__esModule:true,default:({children,prefetch,...props})=>React.createElement('a',props,children)},
  'next/navigation':{useRouter:()=>({push:noop}),useSearchParams:()=>new URLSearchParams()}};
 const load=loader(overrides,externals);ErrorType=load('src/entities/viewer-provider-controls/model/types.ts').ProviderControlsError;
 const Page=load('src/features/listing-conversation/components/ListingConversationPage.tsx').default;
 const Feedback=load('src/features/viewer-provider-controls/components/ProviderControlFeedback.tsx').default;
 const LegacyHook=load('src/features/listing-conversation/model/useLegacyConversationBlocks.ts').useLegacyConversationBlocks;
 const ProfileHook=load('src/features/viewer-provider-controls/model/useLegacyProfileBlocks.ts').useLegacyProfileBlocks;
 const ProfileButton=load('src/features/viewer-provider-controls/components/LegacyProfileBlockControls.tsx').LegacyProfileBlockButton;
 const LegacyList=load('src/features/viewer-provider-controls/components/LegacyBlockedAccounts.tsx').default;
 const notify=load('src/shared/provider-controls/providerControlEvents.ts').notifyProviderControlsChanged;
 let captured;
 function Legacy(){const control=LegacyHook('9',state.user,state.identity,true);captured=control;return React.createElement('section',null,
  React.createElement('span',{'data-peer-status':true},control.blockedByMe?'own':control.blocked?'unavailable':'ready'),
  React.createElement('button',{onClick:control.block,disabled:control.busy||control.blocked},'Legacy block'),
  React.createElement('button',{onClick:control.unblock,disabled:!control.canUnblock},'Legacy unblock'),React.createElement(Feedback,{controls:control.controls,language}));}
 function Store({identity=P}){const control=ProfileHook(identity,state.user);captured=control;return React.createElement('section',{'data-restricted':String(control.restricted),'data-loading':String(control.loading)},
  React.createElement(ProfileButton,{control,language}),React.createElement(Feedback,{controls:control.controls,language}));}
 const reactRoot=require('react-dom/client').createRoot(w.document.getElementById('root'));
 const render=async(component,props={})=>{await act(async()=>{reactRoot.render(React.createElement(React.StrictMode,null,React.createElement(component,props)));await tick();});await settle();};
 async function settle(){await act(async()=>{await tick();await new Promise(r=>setTimeout(r,12));});}
 const button=(scope,text)=>[...scope.querySelectorAll('button')].find(b=>b.textContent.trim()===text&&(!b.closest('dialog')||b.closest('dialog').open));
 const click=async node=>{assert.ok(node,'Control exists');assert.notEqual(node.disabled,true,'Control is enabled');await act(async()=>{node.click();await tick();});await settle();};
 const run=async fn=>{await act(async()=>{fn();await tick();});await settle();};
 const text=async(value)=>{const area=w.document.querySelector('textarea');assert.ok(area);assert.equal(area.disabled,false);
  await act(async()=>{Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype,'value').set.call(area,value);area.dispatchEvent(new w.Event('input',{bubbles:true}));});await settle();assert.equal(area.value,value);};
 const switchAccount=async()=>run(()=>{state.user=V;state.identity=J;for(const cb of callbacks)cb('SIGNED_IN',session());});
 return{state,calls,doc:w.document,render,Page,Legacy,Store,LegacyList,button,click,run,text,settle,switchAccount,notify,captured:()=>captured,
  dialog:()=>w.document.querySelector('dialog[data-provider-dialog][open]'),writes:()=>calls.filter(c=>c.method==='set'),
  async close(){try{await act(async()=>{reactRoot.unmount();await tick();});w.close();assert.deepEqual(network,[]);assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);}finally{console.error=consoleErrors;console.warn=consoleWarnings;}}
 };
}
const proof={kind:'block-removal-react-dom-v1',startedAt:new Date().toISOString(),actualBrowser:false,networkAllowed:false,
 boundary:'Actual ReactDOM StrictMode V2 conversation page, conversation draft hook, actor hook, block reader/removal adapter, ProviderControlSession/dialog/status, legacy conversation and profile adapters, legacy management component. HTTP/Auth/SQL state, language, Next Link/router, photo transport, scroll/read watermark are synthetic. Native dialog, CSS/layout and browser focus behavior are not verified.',cases:[]};
async function scenario(name,options,body){const h=await fixture(options);try{const details=await body(h);await h.close();proof.cases.push({name,status:'PASS',details});console.log('PASS '+name);}catch(e){try{await h.close();}catch(close){e.closeError=close.message;}proof.cases.push({name,status:'FAIL',error:e.stack,closeError:e.closeError});throw e;}}
async function openThreadRemoval(h){const menu=h.doc.querySelector('details');assert.ok(menu);await h.click(menu.querySelector('summary'));await h.click(h.button(menu,'Unblock user'));assert.ok(h.dialog());}
(async()=>{
try{
 await scenario('V2 confirmation and cancellation retain text, photo and history; removal keeps the peer block',{},async h=>{
  await h.render(h.Page,{conversationId:'9'});await h.text('Unsent draft');
  const menu=h.doc.querySelector('details');await h.click(menu.querySelector('summary'));await h.click(h.button(menu,'Block user'));
  const confirmation=[...h.doc.querySelectorAll('dialog')].find(d=>d.open);await h.click(h.button(confirmation,'Block user'));
  assert.equal(h.calls.filter(c=>c.method==='create').length,1);assert.equal(h.doc.querySelector('textarea').value,'Unsent draft');
  await openThreadRemoval(h);assert.equal(h.writes().length,0);await h.click(h.button(h.dialog(),'Cancel'));
  assert.equal(h.doc.querySelector('textarea').value,'Unsent draft');await openThreadRemoval(h);
  h.state.peer=true;await h.click(h.button(h.dialog(),'Unblock user'));
  assert.equal(h.writes().length,1);assert.deepEqual(h.writes()[0].target,{type:'blocked_account',id:B});assert.equal(h.writes()[0].before.blockCreatedAt,T);
  assert.equal(h.doc.querySelector('textarea').value,'Unsent draft');assert.equal(h.doc.querySelector('textarea').disabled,true);
  assert.match(h.doc.querySelector('[data-conversation-history]').textContent,/Existing history/);assert.ok(h.doc.querySelector('img[alt="Selected photo preview"]'));
  assert.equal(h.state.photoCommitted,0);return{draftRetained:true,photoRetained:true,historyRetained:true,noMessageSent:true,exactRow:B,otherBlockPreserved:true};
 });
 await scenario('V2 stale confirmation is refused and explicit checking never retargets the new block',{own:true},async h=>{
  await h.render(h.Page,{conversationId:'9'});await openThreadRemoval(h);h.state.own={id:'9007199254740994',createdAt:'2026-11-13T19:18:00.000001Z'};
  await h.click(h.button(h.dialog(),'Unblock user'));assert.equal(h.writes().length,1);assert.match(h.dialog().textContent,/changed|confirmed|Check/i);
  await h.click(h.button(h.dialog(),'Check saved state'));assert.equal(h.writes().length,1);assert.equal(h.state.own.id,'9007199254740994');
  assert.equal(h.dialog().querySelectorAll('button').length,1);assert.equal(h.writes()[0].before.blockId,B);
  return{oldPairOnly:true,newBlockIntact:true,noAutoReplay:true};
 });
 await scenario('Legacy conversation resolves its actual peer and reconciles a lost acknowledgement by read only',{},async h=>{
  await h.render(h.Legacy);await h.click(h.button(h.doc,'Legacy block'));assert.equal(h.calls.filter(c=>c.method==='create').length,1);
  await h.click(h.button(h.doc,'Legacy unblock'));h.state.lose=true;await h.click(h.button(h.dialog(),'Unblock user'));
  assert.equal(h.writes().length,1);assert.equal(h.state.own,null);assert.ok(!h.button(h.dialog(),'Unblock user'));
  await h.click(h.button(h.dialog(),'Check saved state'));assert.equal(h.writes().length,1);assert.ok(!h.doc.querySelector('[data-provider-notice]'));
  assert.ok(h.calls.filter(c=>c.method==='get').every(c=>['conversation','blocked_account'].includes(c.target.type)));
  return{actualPeerTarget:true,trueOnlyCreation:true,lostReceiptNotReplayed:true,missingRowNotClaimedAsSuccess:true};
 });
 await scenario('Account switch retires an in-flight confirmation and suppresses the previous account receipt',{own:true},async h=>{
  await h.render(h.Page,{conversationId:'9'});await openThreadRemoval(h);const gate=later();h.state.holdWrite=gate;
  await h.click(h.button(h.dialog(),'Unblock user'));assert.equal(h.writes().length,1);await h.switchAccount();
  await h.run(()=>gate.resolve());assert.equal(h.dialog(),null);assert.equal(h.writes().length,1);assert.ok(!h.doc.querySelector('[data-provider-notice]'));
  assert.equal(h.doc.querySelector('textarea').value,'');assert.ok(!h.doc.querySelector('img[alt="Selected photo preview"]'));
  return{oldReceiptSuppressed:true,noSecondWrite:true,newAccountDraftPrivate:true};
 });
 await scenario('Legacy profile binding and ET management use exact rows; missing identity does not hide a readable legacy view',{language:'et'},async h=>{
  await h.render(h.Store,{identity:null});assert.equal(h.doc.querySelector('[data-restricted]').dataset.restricted,'false');assert.equal(h.doc.querySelector('[data-loading]').dataset.loading,'false');assert.equal(h.calls.filter(c=>c.method==='get').length,0);
  await h.render(h.Store,{identity:P});await h.click(h.button(h.doc,'Blokeeri kasutaja'));await h.click(h.button(h.dialog(),'Blokeeri kasutaja'));
  assert.equal(h.writes()[0].target.type,'profile');await h.click(h.button(h.doc,'Eemalda blokeering'));await h.click(h.button(h.dialog(),'Eemalda blokeering'));
  assert.deepEqual(h.writes()[1].target,{type:'blocked_account',id:B});
  h.state.allRows=Array.from({length:26},(_,n)=>({id:String(700+n),createdAt:T}));
  await h.render(h.LegacyList,{userId:U,language:'et'});const list=h.doc.querySelector('[data-provider-control-list="blocked"]');assert.equal(list.querySelectorAll('[data-provider-control-row]').length,25);
  await h.click(h.button(list,'Järgmine'));assert.equal(list.querySelectorAll('[data-provider-control-row]').length,1);
  await h.click(h.button(list,'Eemalda blokeering'));assert.equal(h.writes().length,2);await h.click(h.button(h.dialog(),'Eemalda blokeering'));
  assert.equal(h.writes().length,3);assert.equal(h.writes()[2].before.blockId,'725');assert.equal(h.writes()[2].before.blockCreatedAt,T);
  assert.equal(list.querySelectorAll('[data-provider-control-row]').length,25);return{identityLessViewPreserved:true,profileOwnerBinding:true,estonianDialog:true,management25Plus1:true,exactLastRowRemoved:true};
 });
 proof.status='PASS';
}catch(e){proof.status='FAIL';proof.error=e.stack;process.exitCode=1;console.error(e.stack);}
finally{
 proof.finishedAt=new Date().toISOString();proof.sources=Object.fromEntries([...inputs].sort());proof.inputDrift=[...inputs].filter(([file,digest])=>sha(fs.readFileSync(path.join(root,file)))!==digest).map(([file])=>file);
 if(proof.inputDrift.length){proof.status='FAIL';process.exitCode=1;}
 proof.harnessSha256=sha(fs.readFileSync(__filename));const target=process.env.SELQIRO_BLOCK_REMOVAL_DOM_RESULT;
 if(target)fs.writeFileSync(target,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({status:proof.status,cases:proof.cases.length,inputDrift:proof.inputDrift}));
}
})();
