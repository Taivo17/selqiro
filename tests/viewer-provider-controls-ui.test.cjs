'use strict';
// Actual account store/session/helpers. Network and Auth responses are synthetic;
// database authorisation and query plans have a separate PostgreSQL test boundary.
const {test, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const {createHash} = require('node:crypto'), inputs = new Map();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const root = path.resolve(__dirname, '..'), tick = () => new Promise(resolve => setImmediate(resolve));
const U='11111111-1111-4111-8111-111111111111', V='22222222-2222-4222-8222-222222222222';
const I='33333333-3333-4333-8333-333333333333', R='44444444-4444-4444-8444-444444444444', R2='55555555-5555-4555-8555-555555555555';
const apiPath='src/entities/viewer-provider-controls/api/providerControlsClient.ts';
const storePath='src/shared/provider-controls/viewerAccountStore.ts', sessionPath='src/features/viewer-provider-controls/model/providerControlSession.ts';
const typesPath='src/entities/viewer-provider-controls/model/types.ts';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function loader(overrides={}) {
  const cache=new Map();
  return function load(name) {
    const file=path.resolve(root,name), relative=path.relative(root,file).split(path.sep).join('/');
    if(Object.hasOwn(overrides,relative))return overrides[relative];
    if(cache.has(file))return cache.get(file).exports;
    const source=fs.readFileSync(file),digest=sha(source);
    if(inputs.has(relative))assert.equal(inputs.get(relative),digest,'Input changed while testing: '+relative);inputs.set(relative,digest);
    const module={exports:{}};cache.set(file,module);
    const output=ts.transpileModule(source.toString(),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}});
    const requireLocal=name=>{
      if(!name.startsWith('.')&&!name.startsWith('@/'))return require(name);
      const resolved=name.startsWith('@/')?path.join(root,name.slice(2)):path.resolve(path.dirname(file),name);
      return load(fs.existsSync(resolved+'.ts')?resolved+'.ts':resolved+'.tsx');
    };
    vm.runInThisContext('(function(module,exports,require){'+output.outputText+'\n})',{filename:file})(module,module.exports,requireLocal);
    return module.exports;
  };
}
const target={type:'listing',id:'123'}, time='2026-11-13T12:00:00.000000Z';
const state=extra=>({actorUserId:U,target,targetToken:'a'.repeat(64),targetAvailable:true,
  provider:{identityId:I,displayName:'Repair Studio',slug:'repair-studio',avatarUrl:null},hiddenUntil:null,hidden:false,hideRevision:null,
  blockedByMe:false,blockedByOther:false,blockId:null,blockCreatedAt:null,canHide:true,canBlock:true,serverNow:time,...extra});
const hidden=extra=>state({hidden:true,hiddenUntil:'2026-11-14T12:00:00.000000Z',hideRevision:R,...extra});
function fixture() {
  const calls=[], events=[], stop=new AbortController(), actor={userId:U,accessToken:'token-a',generation:1,signal:stop.signal};
  const current={actor,allowed:true,read:state(),write:async(_actor,before,action)=>({...before,action,changed:true})};
  const client={async get(a,t,signal){calls.push({method:'get',actor:a,target:t,signal});return current.read;},
    async set(a,before,action,signal){calls.push({method:'set',actor:a,before,action,signal});return current.write(a,before,action);},async list(){assert.fail('session must not list providers');}};
  const load=loader({[apiPath]:{providerControlsClient:client}}), Session=load(sessionPath).ProviderControlSession;
  const session=new Session({getActor:()=>current.actor,isCurrent:a=>current.allowed&&a.userId===current.actor?.userId&&!a.signal.aborted,changed:a=>events.push(a),client});
  return{session,calls,events,current,actor,stop,Error:load(typesPath).ProviderControlsError};
}
async function open(f,action='hide'){f.session.open(target,action,'Repair Studio');await tick();assert.equal(f.session.getSnapshot().phase,'ready');}

test('one account subscription serves any number of cards; a late bootstrap cannot undo logout',async()=>{
  const first=deferred();let callback,reads=0,subscriptions=0;
  const auth={getSession(){reads++;return first.promise;},onAuthStateChange(fn){subscriptions++;callback=fn;return{data:{subscription:{unsubscribe(){}}}};}};
  const load=loader({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{auth}}});
  const store=load(storePath).createViewerAccountStore(auth), a=store.subscribe(()=>{}), b=store.subscribe(()=>{});
  await tick();assert.equal(reads,1);assert.equal(subscriptions,1);
  callback('SIGNED_OUT',null);first.resolve({data:{session:{user:{id:U},access_token:'old-token'}},error:null});await tick();
  assert.equal(store.getSnapshot().ready,true);assert.equal(store.getSnapshot().actor,null);a();b();
});

test('account change aborts captured actors synchronously; token refresh and identity updates preserve the account generation',async()=>{
  let callback;const auth={async getSession(){return{data:{session:{user:{id:U},access_token:'token-1'}},error:null};},
    onAuthStateChange(fn){callback=fn;return{data:{subscription:{unsubscribe(){}}}};}};
  const store=loader({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{auth}}})(storePath).createViewerAccountStore(auth);
  const unsubscribe=store.subscribe(()=>{});await tick();const actor=store.getSnapshot().actor;
  callback('TOKEN_REFRESHED',{user:{id:U},access_token:'token-2'});assert.equal(store.isCurrent(actor),true);
  assert.equal(store.getSnapshot().actor.accessToken,'token-2');assert.equal(store.getSnapshot().generation,actor.generation);
  callback('USER_UPDATED',{user:{id:U},access_token:'token-2'});assert.equal(store.isCurrent(actor),true);
  callback('SIGNED_IN',{user:{id:V},access_token:'other-token'});assert.equal(actor.signal.aborted,true);assert.equal(store.isCurrent(actor),false);
  assert.equal(store.getSnapshot().actor.userId,V);unsubscribe();
});

test('hide is explicit, double confirmation sends once, and confirmed Undo uses the exact earlier revision',async()=>{
  const f=fixture(), gate=deferred();f.current.write=async()=>{await gate.promise;return{...hidden(),action:'hide',changed:true};};
  await open(f);assert.equal(f.calls.filter(c=>c.method==='set').length,0);
  const first=f.session.confirm();await f.session.confirm();assert.equal(f.calls.filter(c=>c.method==='set').length,1);
  gate.resolve();await first;assert.equal(f.session.getSnapshot().open,false);assert.equal(f.session.getSnapshot().notice.message,'hidden');
  f.current.write=async(_actor,before,action)=>{assert.equal(before.hideRevision,R);assert.equal(action,'unhide');return{...state({hideRevision:R2}),action,changed:true};};
  await f.session.undo();assert.deepEqual(f.events,['hide','unhide']);assert.equal(f.calls.filter(c=>c.method==='get').length,1);
  assert.equal(f.session.getSnapshot().notice.message,'unhidden');f.session.retire();
});

test('lost hide receipt blocks all replay until an explicit read confirms its attempted revision',async()=>{
  const f=fixture();f.current.write=async()=>{throw new f.Error('outcome_unknown',R);};await open(f);await f.session.confirm();
  assert.equal(f.session.getSnapshot().phase,'uncertain');await f.session.confirm();await f.session.undo();
  f.session.open({type:'service',id:I},'block','Other provider');assert.deepEqual(f.session.getSnapshot().selection.target,target);
  assert.equal(f.calls.filter(c=>c.method==='set').length,1);
  f.current.read=hidden();await f.session.check();assert.equal(f.session.getSnapshot().notice.message,'hidden');
  assert.deepEqual(f.events,['hide']);assert.equal(f.calls.filter(c=>c.method==='set').length,1);f.session.retire();
});

test('a different-tab hide is not claimed as the missing response; a verified read releases the UI without replay',async()=>{
  const f=fixture();f.current.write=async()=>{throw new f.Error('outcome_unknown',R);};await open(f);await f.session.confirm();
  f.current.read=hidden({hideRevision:R2});await f.session.check();await f.session.confirm();
  assert.equal(f.session.getSnapshot().phase,'ready');assert.equal(f.session.getSnapshot().message,'checkedUnknown');
  assert.equal(f.session.getSnapshot().notice,null);assert.deepEqual(f.events,['hide']);assert.equal(f.calls.filter(c=>c.method==='set').length,1);
  f.session.close();f.current.read=state();f.session.open({type:'service',id:I},'block','Another provider');await tick();
  assert.equal(f.session.getSnapshot().selection.target.type,'service');f.session.retire();
});

test('a removed blocked-account row after a lost unblock can be closed without falsely announcing success',async()=>{
  const f=fixture(), blockedTarget={type:'blocked_account',id:'7'};
  f.current.read=state({target:blockedTarget,blockedByMe:true,blockId:'7',blockCreatedAt:time});
  f.session.open(blockedTarget,'unblock','Provider');await tick();f.current.write=async()=>{throw new f.Error('outcome_unknown');};await f.session.confirm();
  f.current.read=state({target:blockedTarget,targetAvailable:false,targetToken:null,canHide:false,canBlock:false});
  await f.session.check();assert.equal(f.session.getSnapshot().phase,'ready');assert.equal(f.session.getSnapshot().notice,null);
  assert.equal(f.session.getSnapshot().message,'checkedUnknown');f.session.close();
  f.current.read=state();f.session.open(target,'hide','Next provider');await tick();assert.equal(f.session.getSnapshot().selection.action,'hide');
  assert.equal(f.calls.filter(c=>c.method==='set').length,1);f.session.retire();
});

test('stale Undo does not remove a newer hide; a fresh read requires another explicit confirmation',async()=>{
  const f=fixture();f.current.write=async()=>({...hidden(),action:'hide',changed:true});await open(f);await f.session.confirm();
  f.current.write=async()=>{throw new f.Error('stale',R2);};await f.session.undo();assert.equal(f.session.getSnapshot().message,'conflict');
  f.current.read=hidden({hideRevision:R2});await f.session.check();assert.equal(f.session.getSnapshot().phase,'ready');
  assert.equal(f.session.getSnapshot().state.hideRevision,R2);assert.equal(f.calls.filter(c=>c.method==='set').length,2);f.session.retire();
});

test('unblocking adopts the complete receipt: other-person block and temporary hide remain',async()=>{
  const f=fixture();f.current.read=hidden({blockedByMe:true,blockedByOther:true,blockId:'7',blockCreatedAt:time});
  f.current.write=async()=>({...hidden({blockedByOther:true}),action:'unblock',changed:true});await open(f,'unblock');await f.session.confirm();
  const notice=f.session.getSnapshot().notice;assert.equal(notice.state.blockedByOther,true);assert.equal(notice.state.hidden,true);
  assert.equal(notice.message,'unblocked');assert.deepEqual(f.events,['unblock']);f.session.retire();
});

test('account replacement retires late write results without exposing confirmation to the next account',async()=>{
  const f=fixture(), gate=deferred();f.current.write=()=>gate.promise;await open(f);const pending=f.session.confirm();
  f.current.actor={...f.actor,userId:V};f.stop.abort();f.session.retire();gate.resolve({...hidden(),action:'hide',changed:true});await pending;
  assert.equal(f.session.getSnapshot().notice,null);assert.deepEqual(f.events,[]);await f.session.confirm();assert.equal(f.calls.filter(c=>c.method==='set').length,1);
});

test('a failed preflight never enables a write; checking again performs only a read',async()=>{
  const f=fixture();f.current.read=Promise.reject(new Error('offline'));f.current.read.catch(()=>{});f.session.open(target,'block','Provider');await tick();
  assert.equal(f.session.getSnapshot().phase,'error');await f.session.confirm();assert.equal(f.calls.filter(c=>c.method==='set').length,0);
  f.current.read=state({blockedByOther:true});await f.session.check();await f.session.confirm();assert.equal(f.calls.filter(c=>c.method==='set').length,0);f.session.retire();
});

test('legacy block reader sees both directions and keeps the peer block after the own row is removed',async()=>{
  const rows=[{blocker_id:V,blocked_id:U},{blocker_id:U,blocked_id:V}], calls=[];
  const client={from(name){calls.push(name);return{select(){return{async or(query){calls.push(query);return{data:[...rows],error:null};}};}};}};
  const read=loader({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:client}})('src/shared/provider-controls/readLegacyAccountBlocks.ts').readLegacyAccountBlocks;
  assert.deepEqual(await read(U,V),{blockedByMe:true,blockedByOther:true,blocked:true});rows.pop();
  assert.deepEqual(await read(U,V),{blockedByMe:false,blockedByOther:true,blocked:true});assert.equal(calls.filter(c=>c==='user_blocks').length,2);
});

test('EN and ET provide the same complete provider-control vocabulary with the agreed 24-hour duration',()=>{
  const catalog=loader()('src/features/viewer-provider-controls/model/providerControlMessages.ts').providerControlMessages;
  assert.deepEqual(Object.keys(catalog.en),Object.keys(catalog.et));
  for(const language of ['en','et'])for(const value of Object.values(catalog[language]))assert.ok(value.trim());
  assert.match(catalog.en.hide,/24 hours/);assert.match(catalog.et.hide,/24 tunniks/);assert.doesNotMatch(JSON.stringify(catalog),/7 days|7 päeva/);
});
after(()=>{
  for(const [name,digest] of inputs)assert.equal(sha(fs.readFileSync(path.join(root,name))),digest,'No runtime source drift: '+name);
  if(process.env.SELQIRO_PROVIDER_UI_INPUTS)fs.writeFileSync(process.env.SELQIRO_PROVIDER_UI_INPUTS,
    JSON.stringify({kind:'provider-controls-ui-inputs-v1',sources:Object.fromEntries([...inputs].sort())},null,2)+'\n');
});
