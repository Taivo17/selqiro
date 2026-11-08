'use strict';
// Actual service session, strict model, file preparation and shared image transfer.
// Synthetic records/bytes replace only the remote storage/database boundaries.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { createHash } = require('node:crypto');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);
const { ServicePublicationSession: Session, servicePublicationReadbackMatches } = require('../src/entities/service/model/servicePublicationSession.ts');
const { bindServicePrepare, bindServicePublicationResult, bindServiceOwnerSnapshot, bindServiceOwnerPage,
  bindServiceActivityReceipt } = require('../src/entities/service/model/servicePublication.ts');
const U='11111111-1111-4111-8111-111111111111', I='22222222-2222-4222-8222-222222222222';
const S='33333333-3333-4333-8333-333333333333', A='44444444-4444-4444-8444-444444444444';
const E='55555555-5555-4555-8555-555555555555', P='66666666-6666-4666-8666-666666666666';
const Q='77777777-7777-4777-8777-777777777777', OLD='88888888-8888-4888-8888-888888888888';
const ORIGIN='https://abcdefghijklmnopqrst.supabase.co', T='2026-11-08T12:00:00.000Z';
const actor={userId:U,identityId:I}, plain=x=>JSON.parse(JSON.stringify(x));
const digest=async blob=>createHash('sha256').update(Buffer.from(await blob.arrayBuffer())).digest('hex');
const policy=[{documentId:P,version:'1',contentHash:'a'.repeat(64),accepted:true}];
function input(edit=false,mode='fixed') {
  return { content:{serviceId:edit?S:null,title:'Repair service',description:'A bounded synthetic service.',category:'vehicle_machinery',subcategory:null,
    priceType:mode,priceAmount:mode==='contact'?null:125.5,currency:'EUR',country:'Estonia',city:'Paide',location:null},
    expectedRevision:edit?'3':null,gallery:[],policySnapshot:plain(policy)};
}
function owner(command,revision,status='published',attempt=A) {
  const c={...plain(command.content),serviceId:S};c.priceAmount=c.priceAmount===null?null:c.priceAmount.toFixed(2);
  return {schema_version:1,content_type:'service',actor_user_id:U,identity_id:I,service_id:S,edit_revision:revision,status,content:c,
    images:command.gallery.map((image,n)=>({id:image.imageId||`aaaaaaaa-aaaa-4aaa-8aaa-${String(n+1).padStart(12,'0')}`,
      url:`/api/v2/service-owner-media/${attempt}/${n}`,is_primary:image.isPrimary,sort_order:n})),
    policy_snapshot:[{document_id:P,version:'1',content_hash:'a'.repeat(64)}],created_at:T,updated_at:T,published_at:status==='draft'?null:T,sort_order:0};
}
function deferred(){let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j});return{promise,resolve,reject};}
async function until(predicate){for(let n=0;n<2000&&!predicate();n++)await new Promise(r=>setImmediate(r));assert.ok(predicate(),'expected stage reached');}
function fixture({edit=false,initialStatus='published'}={}) {
  let journal=null,command=null,result=null,stored=null,allowed=true,counter=0;
  const uploaded=new Set(),calls=[],hooks={};
  const store={get journal(){return journal},set journal(v){journal=v},get result(){return result},set result(v){result=v},
    get command(){return command},get stored(){return stored},set stored(v){stored=v},set allowed(v){allowed=v}};
  const receipt=state=>({schema_version:1,content_type:'service',actor_user_id:U,identity_id:I,request_key:command.requestKey,state,
    attempt_id:A,service_id:S,edit_revision:state==='published'?String(Number(command.expectedRevision??'1')+1):(command.expectedRevision??'1'),
    publication_event_id:state==='published'?E:null,slots:command.gallery.map((image,ordinal)=>({image,ordinal})).filter(v=>v.image.clientFileId).map(({image,ordinal})=>({
      slot_id:`bbbbbbbb-bbbb-4bbb-8bbb-${String(ordinal+1).padStart(12,'0')}`,client_file_id:image.clientFileId,ordinal,expected_bytes:image.byteLength,expected_sha256:image.sha256}))});
  const deps={actor,serviceId:edit?S:null,projectOrigin:ORIGIN,readJournal:()=>journal&&plain(journal),writeJournal:j=>{journal=plain(j);calls.push({action:'persist'})},
    clearJournal:()=>{journal=null},withLock:async work=>work(),canAct:()=>allowed,uuid:()=>`cccccccc-cccc-4ccc-8ccc-${String(++counter).padStart(12,'0')}`,digest,
    putPart:async(url,headers,bytes)=>{calls.push({action:'put',url,size:bytes.size});uploaded.add(new URL(url).pathname.split('/').at(-2));if(hooks.put)await hooks.put();},
    request:async(action,body,signal)=>{calls.push({action,body:plain(body)});if(signal.aborted)throw Error('context_changed');
      if(hooks[action]){const override=await hooks[action](body);if(override!==undefined)return override;}
      if(action==='prepare'){assert.ok(journal,'intent saved before remote write');assert.deepEqual(plain(body),journal.command);command=plain(body);result=receipt('prepared');return plain(result);}
      if(action==='status'){return result?plain(result):{schema_version:1,content_type:'service',actor_user_id:U,identity_id:I,request_key:body.requestKey,state:'not_found',attempt_id:null,service_id:null,edit_revision:null,slots:[],publication_event_id:null};}
      if(action==='cancel'){command??=journal.command;result=result?.state==='published'?result:receipt('cancelled');return plain(result);}
      if(action==='image-prepare'||action==='image-verify'){
        const slot=result.slots.find(s=>s.slot_id===body.slotId);assert.equal(body.requestKey,slot.client_file_id);
        if(uploaded.has(slot.slot_id))return {kind:'ready',receipt:{schema_version:1,attempt_id:A,slot_id:slot.slot_id,receipt_id:P,job_id:Q,pipeline_version:'listing-web-v1'}};
        if(action==='image-verify')return {kind:'needs_attention',reason:'pending'};
        return {kind:'part',attemptId:A,slotId:slot.slot_id,upload:{url:`${ORIGIN}/storage/v1/s3/listing-publication-private/v1/${A}/${slot.slot_id}/source.upload?partNumber=1&uploadId=synthetic`,headers:{'content-type':'application/octet-stream'},expiresAt:Date.now()+60000,expectedBytes:slot.expected_bytes,sha256:slot.expected_sha256}};
      }
      if(action==='publish'){result=receipt('published');stored=owner(command,result.edit_revision,initialStatus==='draft'?'published':initialStatus);if(hooks.afterPublish)await hooks.afterPublish();return plain(result);}
      if(action==='owner-read')return plain(stored);
      throw Error('Unexpected remote action '+action);
    }};
  return {session:new Session(deps),deps,store,calls,hooks,receipt,uploaded};
}
for(const mode of ['fixed','from','hourly','contact'])test(mode+': one Publish commits canonical service and two ordered verified photos',async()=>{
  const f=fixture(),value=input(false,mode);value.gallery=[{file:new Blob(['first image']),isPrimary:false},{file:new Blob(['second image']),isPrimary:true}];
  await f.session.start(value);const view=f.session.getSnapshot();assert.equal(view.phase,'published');assert.equal(view.confirmed.service.id,S);
  assert.equal(view.confirmed.service.priceType,mode);assert.equal(view.confirmed.images[1].isPrimary,true);
  assert.equal(f.calls.filter(c=>c.action==='prepare').length,1);assert.equal(f.calls.filter(c=>c.action==='publish').length,1);assert.equal(f.calls.filter(c=>c.action==='put').length,2);
  assert.equal(f.store.command.serviceId,null);assert.equal(Object.hasOwn(f.store.command,'confirmations'),false);assert.equal(f.store.command.policySnapshot.length,1);
  assert.ok(f.calls.findIndex(c=>c.action==='persist')<f.calls.findIndex(c=>c.action==='prepare'));
  assert.equal(JSON.stringify(f.store.journal).includes('uploadId='),false);assert.equal(JSON.stringify(f.store.journal).includes('base64'),false);
});
test('zero-photo service creates through the same publish path',async()=>{
  const f=fixture();await f.session.start(input());assert.equal(f.session.getSnapshot().phase,'published');assert.equal(f.calls.some(c=>c.action==='put'),false);
});
for(const status of ['draft','published','archived'])test(status+': service edit retains canonical UUID, exact revision and existing gallery membership',async()=>{
  const f=fixture({edit:true,initialStatus:status}),value=input(true);value.gallery=[{imageId:OLD,isPrimary:true}];
  await f.session.start(value);const view=f.session.getSnapshot();assert.equal(view.phase,'published');assert.equal(view.confirmed.service.id,S);
  assert.equal(view.confirmed.service.status,status==='draft'?'published':status);assert.equal(view.confirmed.images[0].id,OLD);
  assert.equal(view.confirmed.editRevision,'4');assert.equal(f.store.command.expectedRevision,'3');assert.equal(f.calls.some(c=>c.action==='put'),false);
});
test('verified direct edit handoff clears exact intent and next Save uses updated revision',async()=>{
  const f=fixture({edit:true});await f.session.start(input(true));const confirmed=f.session.getSnapshot().confirmed;
  await f.session.finishEdit(plain(confirmed));assert.ok(f.store.journal,'copied snapshot cannot acknowledge form adoption');
  await f.session.finishEdit(confirmed);assert.equal(f.session.getSnapshot().phase,'editing');assert.equal(f.store.journal,null);
  const second=input(true);second.content.title='Second saved title';second.expectedRevision=confirmed.editRevision;
  await f.session.start(second);assert.equal(f.session.getSnapshot().phase,'published');assert.equal(f.session.getSnapshot().confirmed.service.title,second.content.title);
  assert.equal(f.session.getSnapshot().confirmed.editRevision,'5');assert.equal(f.calls.filter(c=>c.action==='publish').length,2);
});
test('automatic handoff waits for lock finalizer and duplicate effects retire only once',async()=>{
  const f=fixture({edit:true}),gate=deferred(),pending=[];let cleared=0;
  const clear=f.deps.clearJournal;f.deps.clearJournal=()=>{cleared++;clear()};
  f.deps.withLock=async work=>{const r=await work();if(f.store.journal)await gate.promise;return r;};
  const session=new Session(f.deps);session.subscribe(()=>{const v=session.getSnapshot();if(v.phase==='published')pending.push(session.finishEdit(v.confirmed),session.finishEdit(v.confirmed));});
  const saving=session.start(input(true));await until(()=>pending.length===2);assert.equal(cleared,0);gate.resolve();await saving;await Promise.all(pending);
  assert.equal(cleared,1);assert.equal(session.getSnapshot().phase,'editing');
});
test('inspect during initial lock acquisition cannot unlock the form or create a duplicate request',async()=>{
  const f=fixture({edit:true}),gate=deferred();f.deps.withLock=async work=>{await gate.promise;return work()};const session=new Session(f.deps);
  const save=session.start(input(true)),inspect=session.inspect();assert.equal(session.getSnapshot().phase,'busy');assert.equal(f.store.journal,null);
  gate.resolve();await Promise.all([save,inspect]);assert.equal(f.calls.filter(c=>c.action==='prepare').length,1);
});
test('captured fields and file order cannot change while acquiring the cross-tab lock',async()=>{
  const f=fixture(),gate=deferred();f.deps.withLock=async work=>{await gate.promise;return work()};const s=new Session(f.deps),v=input();
  v.gallery=[{file:new Blob(['captured']),isPrimary:true}];const save=s.start(v);v.content.title='Changed after click';v.gallery=[];v.policySnapshot[0].version='2';
  gate.resolve();await save;assert.equal(s.getSnapshot().phase,'published');assert.equal(f.store.command.content.title,'Repair service');assert.equal(f.store.command.gallery.length,1);assert.equal(f.store.command.policySnapshot[0].version,'1');
});
test('lost prepare is checked by original request key before replaying the same immutable intent',async()=>{
  const f=fixture(),v=input();f.hooks.prepare=async()=>{throw Error('outcome_unknown')};await f.session.start(v);assert.equal(f.session.getSnapshot().phase,'unknown');
  const original=plain(f.store.journal.command);v.content.title='Unrelated new text';delete f.hooks.prepare;
  const recovered=new Session(f.deps);await recovered.resume();assert.equal(recovered.getSnapshot().phase,'published');
  const calls=f.calls.filter(c=>['prepare','status'].includes(c.action));assert.deepEqual(calls.map(c=>c.action),['prepare','status','prepare']);assert.deepEqual(calls[2].body,original);
});
test('uncertain PUT is verified once on reload without sending its bytes again',async()=>{
  const f=fixture(),v=input();v.gallery=[{file:new Blob(['single upload']),isPrimary:true}];f.hooks.put=async()=>{throw Error('outcome_unknown')};
  await f.session.start(v);assert.equal(f.session.getSnapshot().phase,'unknown');assert.equal(f.store.journal.dispatched.length,1);delete f.hooks.put;
  const recovered=new Session(f.deps);await recovered.resume();assert.equal(recovered.getSnapshot().phase,'published');assert.equal(f.calls.filter(c=>c.action==='put').length,1);
  assert.ok(f.calls.some(c=>c.action==='image-verify'));
});
test('publish response loss resolves committed readback without a second publish',async()=>{
  const f=fixture();f.hooks.afterPublish=async()=>{throw Error('outcome_unknown')};await f.session.start(input());assert.equal(f.session.getSnapshot().phase,'unknown');
  delete f.hooks.afterPublish;const recovered=new Session(f.deps);await recovered.inspect();assert.equal(recovered.getSnapshot().phase,'published');assert.equal(f.calls.filter(c=>c.action==='publish').length,1);
});
test('identity change after prepare prevents image and final publish; intent remains recoverable',async()=>{
  const f=fixture(),gate=deferred(),request=f.deps.request;f.deps.request=async(a,b,s)=>{const r=await request(a,b,s);if(a==='prepare')await gate.promise;return r};
  const session=new Session(f.deps),save=session.start(input());await until(()=>f.calls.some(c=>c.action==='prepare'));f.store.allowed=false;gate.resolve();await save;
  assert.equal(session.getSnapshot().phase,'unknown');assert.ok(f.store.journal);assert.equal(f.calls.some(c=>c.action==='publish'),false);
});
test('unknown cancellation cannot discard an operation; confirmed cancellation retires only its journal',async()=>{
  const f=fixture();f.hooks.prepare=async()=>{throw Error('outcome_unknown')};await f.session.start(input());f.hooks.cancel=async()=>{throw Error('outcome_unknown')};
  await f.session.cancel();await f.session.reset();assert.ok(f.store.journal);delete f.hooks.cancel;await f.session.cancel();await f.session.reset();assert.equal(f.store.journal,null);
});
test('policy/revision rejection retains exact revision and accepted policy for explicit recovery',async()=>{
  for(const error of ['policies_changed','revision_conflict']){const f=fixture({edit:true});f.hooks.prepare=async()=>{throw Error(error)};await f.session.start(input(true));
    assert.equal(f.session.getSnapshot().phase,'needs_attention');assert.equal(f.store.journal.command.expectedRevision,'3');assert.deepEqual(f.store.journal.command.policySnapshot,policy);}
});
test('newer request, modified content or foreign attempt cannot be cleared by completed handoff',async()=>{
  for(const mutate of [j=>{j.requestKey=Q;j.command.requestKey=Q},j=>{j.command.content.title='Other draft'},j=>{j.attemptId=Q}]){
    const f=fixture({edit:true});await f.session.start(input(true));const confirmed=f.session.getSnapshot().confirmed;mutate(f.store.journal);const next=plain(f.store.journal);
    await f.session.finishEdit(confirmed);assert.deepEqual(f.store.journal,next);assert.equal(f.session.getSnapshot().phase,'unknown');}
});
test('another tab retiring the same terminal journal preserves verified form handoff',async()=>{
  const f=fixture({edit:true});await f.session.start(input(true));const confirmed=f.session.getSnapshot().confirmed;f.store.journal=null;
  await f.session.inspect();assert.equal(f.session.getSnapshot().confirmed,confirmed);await f.session.finishEdit(confirmed);assert.equal(f.session.getSnapshot().phase,'editing');
});
test('mismatched owner content/gallery cannot show successful publication at matching revision',async()=>{
  for(const mutate of [r=>{r.content.title='Wrong title'},r=>{r.content.priceAmount='75.00'},r=>{r.images[0].url=`/api/v2/service-owner-media/${Q}/0`}]){
    const f=fixture(),v=input();v.gallery=[{file:new Blob(['photo']),isPrimary:true}];f.hooks.afterPublish=async()=>mutate(f.store.stored);
    await f.session.start(v);assert.equal(f.session.getSnapshot().phase,'unknown');assert.ok(f.store.journal);}
});
test('a later verified owner revision is acknowledged without falsely claiming it matches this save',async()=>{
  const f=fixture({edit:true});f.hooks.afterPublish=async()=>{f.store.stored.edit_revision='5';f.store.stored.content.title='Later owner edit'};
  await f.session.start(input(true));assert.equal(f.session.getSnapshot().phase,'published');assert.equal(f.session.getSnapshot().message,'changedAfterSave');
  await f.session.finishEdit(f.session.getSnapshot().confirmed);assert.equal(f.session.getSnapshot().phase,'editing');
});
test('incomplete legacy drafts remain readable, but invalid new publication fields dispatch no command',async()=>{
  const v=input(true),command={...v,expectedUserId:U,expectedIdentityId:I,requestKey:Q,serviceId:S};const legacy=owner(command,'1','draft');
  legacy.content.category=null;legacy.content.priceType='fixed';legacy.content.priceAmount=null;legacy.policy_snapshot=[];
  const snapshot=bindServiceOwnerSnapshot(legacy,actor,S);assert.equal(snapshot.service.status,'draft');assert.equal(snapshot.service.category,null);
  for(const mutate of [v=>{v.content.category=''},v=>{v.content.category=null},v=>{v.content.priceAmount=null},v=>{v.content.priceAmount=1.234},v=>{v.content.priceType='contact'},v=>{v.content.image_url='https://untrusted.invalid/image'},v=>{v.policySnapshot=[]},v=>{v.policySnapshot[0].accepted=false},v=>{v.content.serviceId=Q}]){
    const f=fixture(),value=input();mutate(value);await f.session.start(value);assert.equal(f.calls.some(c=>c.action==='prepare'),false);assert.equal(f.store.journal,null);}
});
test('legacy published/paused null category and amount survive exact edit/readback and owner pagination',async()=>{
  for(const status of ['published','archived'])for(const priceType of ['fixed','from','hourly']){
    const f=fixture({edit:true,initialStatus:status}),value=input(true,priceType);
    value.content.category=null;value.content.subcategory=null;value.content.priceAmount=null;value.content.title='Changed legacy title';
    await f.session.start(value);const view=f.session.getSnapshot();assert.equal(view.phase,'published');
    assert.equal(f.store.command.content.category,null);assert.equal(f.store.command.content.priceAmount,null);
    assert.equal(view.confirmed.service.status,status);assert.equal(view.confirmed.service.priceType,priceType);
    assert.equal(view.confirmed.service.priceAmount,null);assert.equal(view.confirmed.service.category,null);
    const page={schema_version:1,actor_user_id:U,identity_id:I,items:[f.store.stored],total_count:'1',result_limit:50,result_offset:0,has_more:false,next_offset:null};
    assert.equal(bindServiceOwnerPage(page,actor,0,50).items[0].service.priceAmount,null);
    await f.session.finishEdit(view.confirmed);assert.equal(f.session.getSnapshot().phase,'editing');
    assert.equal(f.store.journal,null);
  }
});
test('strict receipt and owner list reject cross-kind, actor, gallery and pagination confusion',async()=>{
  const f=fixture();await f.session.start(input());const command=f.store.command,result=f.store.result;
  for(const mutate of [r=>{r.content_type='horse_offer'},r=>{r.identity_id=Q},r=>{r.service_id=Q;r.horse_offer_id=S},r=>{r.edit_revision='0'},r=>{r.private_token='hidden'}]){
    const r=plain(result);mutate(r);assert.throws(()=>bindServicePublicationResult(r,command,A));}
  const wire=f.store.stored,page={schema_version:1,actor_user_id:U,identity_id:I,items:[wire],total_count:'301',result_limit:1,result_offset:0,has_more:true,next_offset:1};
  assert.equal(bindServiceOwnerPage(page,actor,0,1).totalCount,'301');
  for(const bad of [{...page,next_offset:0},{...page,has_more:false,next_offset:null},{...page,actor_user_id:Q},{...page,items:[wire,wire]}])assert.throws(()=>bindServiceOwnerPage(bad,actor,0,1));
});
test('status receipt confirms exact published/archived transition and revision without expiry fields',()=>{
  const receipt={schema_version:1,content_type:'service',actor_user_id:U,identity_id:I,service_id:S,edit_revision:'4',status:'archived',changed:true};
  assert.equal(bindServiceActivityReceipt(receipt,actor,S,'3','published','archived').status,'archived');
  for(const bad of [{...receipt,edit_revision:'5'},{...receipt,changed:false},{...receipt,status:'published'},{...receipt,active_until:'2027-02-06'}])
    assert.throws(()=>bindServiceActivityReceipt(bad,actor,S,'3','published','archived'));
});
