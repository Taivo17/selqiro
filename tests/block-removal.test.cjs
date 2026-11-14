'use strict';
// New exact-row removal and compatibility boundaries only. No remote requests.
const {test, after}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), ts=require('typescript');
const {createHash}=require('node:crypto'), root=path.resolve(__dirname,'..'), inputs=new Map();
const sha=b=>createHash('sha256').update(b).digest('hex'), tick=()=>new Promise(r=>setImmediate(r));
const U='11111111-1111-4111-8111-111111111111', I='22222222-2222-4222-8222-222222222222';
const V='33333333-3333-4333-8333-333333333333', B='9007199254740993', NEXT='9007199254740994';
const T='2026-11-13T19:17:00.000001Z', T2='2026-11-13T19:17:00.000002Z';
const api='src/entities/viewer-provider-controls/api/providerControlsClient.ts';
function loadFactory(overrides={}) {
  const cache=new Map();
  return function load(name){
    const file=path.resolve(root,name), relative=path.relative(root,file).split(path.sep).join('/');
    if(Object.hasOwn(overrides,relative))return overrides[relative];
    if(cache.has(file))return cache.get(file).exports;
    const source=fs.readFileSync(file), digest=sha(source);
    if(inputs.has(relative))assert.equal(inputs.get(relative),digest);inputs.set(relative,digest);
    const module={exports:{}};cache.set(file,module);
    const result=ts.transpileModule(source.toString(),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}});
    const local=name=>{if(name==='server-only')return{};if(!name.startsWith('.'))return require(name);
      const target=path.resolve(path.dirname(file),name);return load(fs.existsSync(target+'.ts')?target+'.ts':target+'.tsx');};
    vm.runInThisContext('(function(module,exports,require){'+result.outputText+'\n})',{filename:file})(module,module.exports,local);
    return module.exports;
  };
}
const snapshot=(patch={})=>({actorUserId:U,target:{type:'conversation',id:'9'},targetToken:'a'.repeat(64),targetAvailable:true,
 provider:{identityId:I,displayName:'Stored conversation participant',slug:'peer',avatarUrl:null},hiddenUntil:null,hidden:false,hideRevision:null,
 blockedByMe:true,blockedByOther:false,blockId:B,blockCreatedAt:T,canHide:false,canBlock:false,serverNow:T,...patch});
const management=(patch={})=>snapshot({target:{type:'blocked_account',id:B},targetToken:'b'.repeat(64),canBlock:true,...patch});
const missing=()=>management({targetAvailable:false,targetToken:null,blockedByMe:false,blockId:null,blockCreatedAt:null,canBlock:false});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
function fixture(){
 const calls=[], events=[], abort=new AbortController(), actor={userId:U,accessToken:'token',generation:1,signal:abort.signal};
 const current={actor,allowed:true,read:management(),write:async(_a,before)=>({...before,blockedByMe:false,blockId:null,blockCreatedAt:null,action:'unblock',changed:true})};
 const client={async get(a,target,signal){calls.push({method:'get',target:{...target},signal});return current.read;},
 async set(a,before,action,signal){calls.push({method:'set',before,action,signal});return current.write(a,before,action);},
 async list(){assert.fail('Exact removal must never search for a replacement block');}};
 const load=loadFactory({[api]:{providerControlsClient:client}}), Session=load('src/features/viewer-provider-controls/model/providerControlSession.ts').ProviderControlSession;
 const Error=load('src/entities/viewer-provider-controls/model/types.ts').ProviderControlsError;
 const session=new Session({getActor:()=>current.actor,isCurrent:a=>current.allowed&&a===current.actor&&!a.signal.aborted,changed:a=>events.push(a),client});
 return{session,current,calls,events,actor,abort,Error};
}
const writes=f=>f.calls.filter(c=>c.method==='set');
async function open(f,seen=snapshot()){f.session.openBlockRemoval(seen);await tick();}

test('conversation peer snapshot opens only its exact bigint block row and confirms the displayed microsecond version once',async()=>{
 const f=fixture();await open(f);assert.equal(f.session.getSnapshot().phase,'ready');assert.equal(writes(f).length,0);
 assert.deepEqual(f.calls[0].target,{type:'blocked_account',id:B});assert.equal(f.session.getSnapshot().state.blockCreatedAt,T);
 const gate=deferred();f.current.write=async()=>{await gate.promise;return management({blockedByMe:false,blockId:null,blockCreatedAt:null,action:'unblock',changed:true});};
 const pending=f.session.confirm();await f.session.confirm();assert.equal(writes(f).length,1);
 assert.equal(writes(f)[0].before.blockId,B);assert.equal(writes(f)[0].before.blockCreatedAt,T);assert.equal(writes(f)[0].before.targetToken,'b'.repeat(64));
 gate.resolve();await pending;assert.equal(f.session.getSnapshot().notice.message,'unblocked');f.session.retire();
});
test('a changed timestamp between the visible snapshot and management read refuses confirmation without adopting that newer version',async()=>{
 const f=fixture();f.current.read=management({blockCreatedAt:T2});await open(f);
 assert.equal(f.session.getSnapshot().phase,'error');assert.equal(f.session.getSnapshot().message,'conflict');
 await f.session.confirm();await f.session.check();await f.session.confirm();assert.equal(writes(f).length,0);
 assert.ok(f.calls.every(c=>c.target.id===B));assert.equal(f.session.getSnapshot().selection.blockPin.createdAt,T);f.session.retire();
});
test('a disappeared old row does not select a newly inserted row; only a new explicit opening may select it',async()=>{
 const f=fixture();f.current.read=missing();await open(f);await f.session.confirm();assert.equal(writes(f).length,0);
 assert.ok(f.calls.every(c=>c.target.id===B));f.session.close();
 f.current.read=management({target:{type:'blocked_account',id:NEXT},blockId:NEXT,blockCreatedAt:T2});
 await open(f,snapshot({blockId:NEXT,blockCreatedAt:T2}));assert.equal(f.session.getSnapshot().state.blockId,NEXT);
 assert.equal(writes(f).length,0);await f.session.confirm();assert.equal(writes(f).length,1);assert.equal(writes(f)[0].before.blockId,NEXT);f.session.retire();
});
test('server CAS conflict after confirmation never auto-replays or replaces the captured pair',async()=>{
 const f=fixture();await open(f);f.current.write=async()=>{throw new f.Error('stale');};await f.session.confirm();
 f.current.read=missing();await f.session.check();await f.session.confirm();assert.equal(writes(f).length,1);
 assert.equal(writes(f)[0].before.blockId,B);assert.equal(writes(f)[0].before.blockCreatedAt,T);assert.equal(f.session.getSnapshot().notice,null);f.session.retire();
});
test('lost acknowledgement permits only an explicit read, and a missing row is not claimed as proved success',async()=>{
 const f=fixture();await open(f);f.current.write=async()=>{throw new f.Error('outcome_unknown');};await f.session.confirm();
 assert.equal(f.session.getSnapshot().phase,'uncertain');await f.session.confirm();
 f.session.openBlockRemoval(snapshot({blockId:NEXT,blockCreatedAt:T2}));assert.equal(f.session.getSnapshot().selection.target.id,B);
 f.current.read=missing();await f.session.check();assert.equal(writes(f).length,1);
 assert.equal(f.session.getSnapshot().message,'checkedUnknown');assert.equal(f.session.getSnapshot().notice,null);f.session.close();f.session.retire();
});
test('account invalidation blocks confirmation and retires a late completed removal without a new-account notice',async()=>{
 const f=fixture();await open(f);f.current.allowed=false;await f.session.confirm();assert.equal(writes(f).length,0);f.current.allowed=true;
 const gate=deferred();f.current.write=()=>gate.promise;const pending=f.session.confirm();f.abort.abort();f.current.actor={...f.actor,userId:V};f.session.retire();
 gate.resolve(management({blockedByMe:false,blockId:null,blockCreatedAt:null,action:'unblock',changed:true}));await pending;
 assert.equal(f.session.getSnapshot().notice,null);assert.deepEqual(f.events,[]);assert.equal(writes(f).length,1);
});
test('the confirmed receipt preserves the other account block and separate temporary hiding preference',async()=>{
 const f=fixture(), receipt=management({blockedByMe:false,blockId:null,blockCreatedAt:null,blockedByOther:true,hidden:true,
 hiddenUntil:'2026-11-14T19:17:00.000001Z',hideRevision:I,action:'unblock',changed:true});
 await open(f);f.current.write=async()=>receipt;await f.session.confirm();assert.equal(f.session.getSnapshot().notice.state,receipt);
 assert.equal(f.session.getSnapshot().notice.state.blockedByOther,true);assert.equal(f.session.getSnapshot().notice.state.hidden,true);f.session.retire();
});
const command=blocked=>({expectedUserId:U,expectedIdentityId:I,conversationId:'9',blocked});
const receipt={schema_version:2,actor_user_id:U,identity_id:I,conversation_id:'9',action:'block',blocked_by_me:true,can_send:false};
const json=value=>new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
test('browser messaging boundary refuses false before transport while true retains its exact creation contract',async()=>{
 const calls=[], load=loadFactory({'src/shared/config/v2Integration.ts':{v2IntegrationEnabled:()=>true}});
 const client=load('src/entities/conversation/api/messagingClient.ts').createMessagingClient(async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return json(receipt);});
 await assert.rejects(client.setThreadBlocked('token',command(false)),error=>error.code==='refused');assert.equal(calls.length,0);
 await client.setThreadBlocked('token',command(true));assert.equal(calls.length,1);assert.equal(calls[0].body.blocked,true);
});
test('server compatibility boundary refuses false before auth or RPC; true still verifies caller and creates only',async()=>{
 const calls=[], load=loadFactory(), service=load('src/server/messaging/service.ts').createMessagingService({projectOrigin:'https://abcdefghijklmnopqrst.supabase.co',publicKey:'public'},async(url,init)=>{
  calls.push({url,body:init.body?JSON.parse(init.body):null});return json(url.endsWith('/auth/v1/user')?{id:U}:receipt);
 });
 await assert.rejects(service.block('token',command(false)),error=>error.code==='refused');assert.equal(calls.length,0);
 await service.block('token',command(true));assert.equal(calls.length,2);assert.match(calls[1].url,/set_my_thread_block_v2$/);
 assert.deepEqual(calls[1].body,{p_expected_user_id:U,p_expected_identity_id:I,p_conversation_id:'9',p_blocked:true});
});
test('all known page writers and the latent inbox path compose the shared controls without direct table deletion or upsert',()=>{
 for(const name of ['app/messages/[conversationId]/page.tsx','app/store/[slug]/page.tsx','app/my-page/page.tsx']){
  const bytes=fs.readFileSync(path.join(root,name));inputs.set(name,sha(bytes));const source=bytes.toString();
  assert.doesNotMatch(source,/user_blocks|unblockUser|block_store_identity_owner/);
 }
 const inbox='src/features/listing-conversation/model/useMessageInbox.ts',bytes=fs.readFileSync(path.join(root,inbox));inputs.set(inbox,sha(bytes));
 assert.doesNotMatch(bytes.toString(),/setThreadBlocked|block:\s*\(/);
 const list='src/features/viewer-provider-controls/components/ProviderControlList.tsx',body=fs.readFileSync(path.join(root,list));inputs.set(list,sha(body));
 assert.match(body.toString(),/openBlockRemoval\(item, name\)/);
});
after(()=>{
 const drift=[...inputs].filter(([file,digest])=>sha(fs.readFileSync(path.join(root,file)))!==digest).map(([file])=>file);assert.deepEqual(drift,[]);
 if(process.env.SELQIRO_BLOCK_REMOVAL_INPUTS)fs.writeFileSync(process.env.SELQIRO_BLOCK_REMOVAL_INPUTS,JSON.stringify({kind:'block-removal-unit-inputs-v1',sources:Object.fromEntries([...inputs].sort()),inputDrift:drift},null,2)+'\n');
});
