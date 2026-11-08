/* Actual publication/controller modules. Synthetic identities, bytes and transport only. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const U='11111111-1111-4111-8111-111111111111', I='22222222-2222-4222-8222-222222222222';
const H='33333333-3333-4333-8333-333333333333', A='44444444-4444-4444-8444-444444444444';
const E='55555555-5555-4555-8555-555555555555', P='66666666-6666-4666-8666-666666666666';
const Q='77777777-7777-4777-8777-777777777777', OLD='88888888-8888-4888-8888-888888888888';
const ORIGIN='https://abcdefghijklmnopqrst.supabase.co', T='2026-11-08T12:00:00.000Z';
const plain=x=>JSON.parse(JSON.stringify(x));
function realm(){
 const cache=new Map();
 function load(rel){const file=path.resolve(root,rel);assert.ok(file.startsWith(root+path.sep));if(cache.has(file))return cache.get(file).exports;
  const source=fs.readFileSync(file,'utf8'),out=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  assert.deepEqual(out.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
  const m={exports:{}};cache.set(file,m);const req=name=>{assert.ok(name.startsWith('.'),'No external imports: '+name);const p=path.resolve(path.dirname(file),name);return load(fs.existsSync(p+'.ts')?p+'.ts':p+'.tsx');};
  vm.runInThisContext('(function(module,exports,require){'+out.outputText+'\n})',{filename:file,timeout:2000})(m,m.exports,req);return m.exports;
 }return load;
}
const load=realm();
const {HorsePublicationSession:Session}=load('src/entities/horse-offer/model/horsePublicationSession.ts');
const {bindHorsePrepare,bindHorsePublicationResult,bindHorseOwnerSnapshot}=load('src/entities/horse-offer/model/publication.ts');
const {createListingCreateDraft}=load('src/features/listing-create/model/listingCreateDraft.ts');
const {buildHorseOfferDraftSaveInput:build}=load('src/features/listing-create/model/horseOfferDraftSave.ts');
const {applyHorseOfferPublicationConfirmationGroupChange:confirm}=load('src/features/listing-create/model/horseOfferPublicationGate.ts');
const catalog=load('src/features/horse-publication/model/horsePublicationMessages.ts').horsePublicationMessages;
const policies=[{documentId:P,version:'1',contentHash:'a'.repeat(64),accepted:true},{documentId:Q,version:'1',contentHash:'b'.repeat(64),accepted:true}];
const digest=async blob=>createHash('sha256').update(Buffer.from(await blob.arrayBuffer())).digest('hex');
function input(kind='sale',edit=false){const d=createListingCreateDraft();
 if(kind==='wanted'){d.horseOfferFields.sex='unknown';d.horseOfferPriceFields.wanted={mode:'maximum',amount:'9500,50',currency:'EUR'};d.horseOfferLocationFields.wanted.cityOrMunicipality='Tartu';}
 else {d.horseOfferFields.horseName='Example horse';d.horseOfferFields.birthYear='2018';d.horseOfferFields.heightCm='165.5';d.horseOfferLocationFields.specific.cityOrMunicipality='Paide';}
 const content=build({offerId:edit?H:null,offerType:kind,title:'A synthetic horse offer',description:'Description for the synthetic listing.',basicFields:d.horseOfferFields,useFields:d.horseOfferUseFields,disclosureFields:d.horseOfferDisclosureFields,priceFields:d.horseOfferPriceFields,locationFields:d.horseOfferLocationFields});
 return {content,expectedRevision:edit?'3':null,gallery:[],confirmations:confirm(kind,true),policySnapshot:plain(policies)};
}
function owner(command,revision,attempt=A){const c=command.content, r={content_type:'horse_offer',content_id:H,offer_id:H,identity_id:I,offer_type:c.offerType,status:'published',market_country_code:'EE',horse_location_country_code:'EE',currency:'EUR',edit_revision:revision,
 image_url:null,published_at:T,held_at:null,paused_at:null,closed_at:null,rejected_at:null,archived_at:null,active_until:null,created_at:T,updated_at:T,
 details:{schema_version:1,branch:c.offerType==='wanted'?'wanted':'specific'},images:[]};
 const fields={title:'title',description:'description',priceAmount:'price_amount',priceType:'price_type',horseName:'horse_name',birthYear:'birth_year',sex:'sex',breed:'breed',color:'color',heightCm:'height_cm',discipline:'discipline',trainingLevel:'training_level',suitability:'suitability',healthNotes:'health_notes',behaviorNotes:'behavior_notes',city:'city',region:'region',locationText:'location_text',horseLat:'horse_lat',horseLng:'horse_lng'};
 for(const [key,dest]of Object.entries(fields))r[dest]=c[key];
 if(c.offerType==='lease'||c.offerType==='co_rider')r.details.recurring_fee={period:c.recurringFeePeriod};
 if(c.offerType==='wanted')r.details.wanted={preferred_sex:c.wantedPreferredSex,preferred_breed:c.wantedPreferredBreed,preferred_discipline:c.wantedPreferredDiscipline,preferred_training_level:c.wantedPreferredTrainingLevel,intended_use:c.wantedIntendedUse,health_preferences:c.wantedHealthPreferences,behavior_preferences:c.wantedBehaviorPreferences,budget:{mode:c.wantedBudgetMode,amount:c.wantedBudgetAmount,currency:'EUR'},search_area:{country_code:'EE',city_or_municipality:c.wantedCity,region:c.wantedRegion}};
 r.images=command.gallery.map((im,n)=>{const url=`/api/v2/horse-owner-media/${attempt}/${n}`;return{id:im.imageId||`aaaaaaaa-aaaa-4aaa-8aaa-${String(n+1).padStart(12,'0')}`,url,original_url:url,medium_url:null,thumb_url:null,is_primary:im.isPrimary,sort_order:n};});r.image_url=r.images.find(im=>im.is_primary)?.url||null;return r;
}
async function until(predicate){for(let n=0;n<2000&&!predicate();n++)await new Promise(r=>setImmediate(r));assert.ok(predicate(),'expected stage reached');}
function deferred(){let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return{promise,resolve,reject};}
function fixture({edit=false}={}){
 let journal=null, counter=0, command=null, result=null, stored=null, allowed=true;
 const calls=[], uploaded=new Set(), hooks={};
 const store={get journal(){return journal},set journal(v){journal=v},get stored(){return stored},set stored(v){stored=v},get result(){return result},set result(v){result=v},get command(){return command},set allowed(v){allowed=v}};
 function receipt(state){return{schema_version:1,content_type:'horse_offer',actor_user_id:U,identity_id:I,request_key:command.requestKey,state,attempt_id:A,horse_offer_id:H,edit_revision:state==='published'?(edit?'5':'2'):(edit?'3':'1'),publication_event_id:state==='published'?E:null,slots:command.gallery.map((im,ordinal)=>({...im,ordinal})).filter(im=>im.clientFileId).map(im=>({slot_id:`bbbbbbbb-bbbb-4bbb-8bbb-${String(im.ordinal+1).padStart(12,'0')}`,client_file_id:im.clientFileId,ordinal:im.ordinal,expected_bytes:im.byteLength,expected_sha256:im.sha256}))};}
 const deps={actor:{userId:U,identityId:I},offerId:edit?H:null,projectOrigin:ORIGIN,readJournal:()=>journal&&plain(journal),writeJournal:j=>{journal=plain(j);calls.push({action:'persist'});},clearJournal:()=>{journal=null},withLock:async fn=>fn(),canAct:()=>allowed,uuid:()=>`cccccccc-cccc-4ccc-8ccc-${String(++counter).padStart(12,'0')}`,digest,
  putPart:async(url,headers,bytes)=>{calls.push({action:'put',url,size:bytes.size});uploaded.add(new URL(url).pathname.split('/').at(-2));if(hooks.put)await hooks.put();},
  request:async(action,body,signal)=>{calls.push({action,body:plain(body)});if(signal.aborted)throw new Error('context_changed');if(hooks[action]){const override=await hooks[action](body);if(override!==undefined)return override;}
    if(action==='prepare'){assert.ok(journal,'intent must be durable before first prepare');assert.deepEqual(plain(body),journal.command);command=plain(body);result=receipt('prepared');return plain(result);}
    if(action==='status'){if(!result)return{schema_version:1,content_type:'horse_offer',actor_user_id:U,identity_id:I,request_key:body.requestKey,state:'not_found',attempt_id:null,horse_offer_id:null,edit_revision:null,publication_event_id:null,slots:[]};return plain(result);}
    if(action==='cancel'){if(!command){command=journal.command;}result=result?.state==='published'?result:receipt('cancelled');return plain(result);}
    if(action==='image-prepare'||action==='image-verify'){const slot=result.slots.find(s=>s.slot_id===body.slotId);assert.equal(body.requestKey,slot.client_file_id);
      if(uploaded.has(slot.slot_id))return{kind:'ready',receipt:{schema_version:1,attempt_id:A,slot_id:slot.slot_id,receipt_id:P,job_id:Q,pipeline_version:'listing-web-v1'}};
      if(action==='image-verify')return{kind:'needs_attention',reason:'pending'};
      return{kind:'part',attemptId:A,slotId:slot.slot_id,upload:{url:`${ORIGIN}/storage/v1/s3/listing-publication-private/v1/${A}/${slot.slot_id}/source.upload?partNumber=1&uploadId=test`,headers:{'content-type':'application/octet-stream'},expiresAt:Date.now()+60000,expectedBytes:slot.expected_bytes,sha256:slot.expected_sha256}};
    }
    if(action==='publish'){result=receipt('published');stored=owner(command,result.edit_revision);if(hooks.afterPublish)await hooks.afterPublish();return plain(result);}
    if(action==='owner-read')return plain(stored);
    throw new Error('unexpected action '+action);
  }};
 const session=new Session(deps);return{session,deps,store,calls,hooks,receipt,uploaded};
}
for(const kind of ['sale','free_transfer','lease','co_rider','wanted'])test(kind+': one publish creates canonical horse, then confirms content and gallery',async()=>{
 const f=fixture(), value=input(kind);value.gallery=[{file:new Blob(['synthetic-image'],{type:'image/jpeg'}),isPrimary:true}];
 await f.session.start(value);assert.equal(f.session.getSnapshot().phase,'published');assert.equal(f.session.getSnapshot().confirmed.detail.offerId,H);
 assert.equal(f.calls.filter(c=>c.action==='prepare').length,1);assert.equal(f.calls.filter(c=>c.action==='put').length,1);assert.equal(f.calls.filter(c=>c.action==='publish').length,1);
 assert.equal(f.store.command.content.offerType,kind);assert.equal(f.store.command.offerId,null);assert.ok(f.calls.findIndex(c=>c.action==='persist')<f.calls.findIndex(c=>c.action==='prepare'));
 assert.ok(f.store.journal.preparation[0].originalSha256);assert.equal(JSON.stringify(f.store.journal).includes('uploadId='),false);
});
for(const kind of ['sale','free_transfer','lease','co_rider','wanted'])test(kind+': zero-photo publication is allowed with branch-specific confirmations',async()=>{
 const f=fixture();await f.session.start(input(kind));assert.equal(f.session.getSnapshot().phase,'published');assert.equal(f.calls.some(c=>c.action==='put'),false);
 assert.equal(f.store.command.confirmations.publisher_is_owner_or_authorized,kind!=='wanted');
});
test('published edit preserves UUID, expected revision, private location and ordered existing/new gallery',async()=>{
 const f=fixture({edit:true}),value=input('sale',true);value.content.locationText='Private stable';value.content.horseLat=58.1;value.content.horseLng=25.2;
 value.gallery=[{imageId:OLD,isPrimary:false},{file:new Blob(['new image']),isPrimary:true}];
 const before={publicTitle:'Old published title'};f.store.stored=before;
 f.hooks['image-prepare']=async()=>{assert.deepEqual(f.store.stored,before)};
 await f.session.start(value);assert.equal(f.session.getSnapshot().phase,'published');assert.equal(f.store.command.offerId,H);assert.equal(f.store.command.expectedRevision,'3');
 assert.equal(f.store.result.slots[0].ordinal,1);assert.equal(f.session.getSnapshot().confirmed.detail.images[0].id,OLD);
 assert.equal(f.session.getSnapshot().confirmed.detail.horseLat,58.1);assert.equal(f.session.getSnapshot().confirmed.editRevision,'5');
});
for(const status of ['paused','closed'])test(status+' edit confirms saved content without assuming reactivation',async()=>{
 const f=fixture({edit:true}),value=input('sale',true);
 value.gallery=[{imageId:OLD,isPrimary:true}];
 f.hooks.afterPublish=async()=>{f.store.stored.status=status;f.store.stored[status==='paused'?'paused_at':'closed_at']=T;};
 await f.session.start(value);assert.equal(f.session.getSnapshot().phase,'published');
 assert.equal(f.session.getSnapshot().confirmed.detail.status,status);assert.equal(f.session.getSnapshot().confirmed.editRevision,'5');
 assert.equal(f.session.getSnapshot().confirmed.detail.images[0].id,OLD);assert.equal(f.calls.filter(c=>c.action==='publish').length,1);
});
for(const status of ['paused','closed'])test('new publication cannot infer success from '+status+' readback',async()=>{
 const f=fixture();f.hooks.afterPublish=async()=>{f.store.stored.status=status;f.store.stored[status==='paused'?'paused_at':'closed_at']=T;};
 await f.session.start(input());assert.equal(f.session.getSnapshot().phase,'unknown');assert.equal(f.session.getSnapshot().confirmed,null);
 assert.equal(f.calls.filter(c=>c.action==='publish').length,1);
});
test('paused edit still refuses content mismatch at the acknowledged revision',async()=>{
 const f=fixture({edit:true});f.hooks.afterPublish=async()=>{f.store.stored.status='paused';f.store.stored.paused_at=T;f.store.stored.title='Other edit';};
 await f.session.start(input('sale',true));assert.equal(f.session.getSnapshot().phase,'unknown');assert.equal(f.session.getSnapshot().confirmed,null);
});
test('a later paused revision uses changed-after-save feedback and adopts actual current state',async()=>{
 const f=fixture({edit:true});f.hooks.afterPublish=async()=>{f.store.stored.status='paused';f.store.stored.paused_at=T;f.store.stored.edit_revision='6';f.store.stored.title='Other edit';};
 await f.session.start(input('sale',true));assert.equal(f.session.getSnapshot().phase,'published');assert.equal(f.session.getSnapshot().message,'changedAfterSave');
 assert.equal(f.session.getSnapshot().confirmed.detail.status,'paused');assert.equal(f.session.getSnapshot().confirmed.detail.title,'Other edit');
 assert.equal(f.calls.filter(c=>c.action==='publish').length,1);
});
test('input is captured before asynchronous lock; duplicate clicks dispatch only once',async()=>{
 const f=fixture(),lock=deferred();f.deps.withLock=async work=>{await lock.promise;return work()};const s=new Session(f.deps),value=input();
 const first=s.start(value),second=s.start(value);value.content.title='Mutated after click';value.confirmations.publisher_confirms_age_18_or_over=false;
 lock.resolve();await Promise.all([first,second]);assert.equal(f.store.command.content.title,'A synthetic horse offer');assert.equal(f.calls.filter(c=>c.action==='prepare').length,1);
});
test('uncertain multipart PUT is verified on resume and never replayed',async()=>{
 const f=fixture(),value=input();value.gallery=[{file:new Blob(['photo']),isPrimary:true}];f.hooks.put=async()=>{throw new Error('outcome_unknown')};
 await f.session.start(value);assert.equal(f.session.getSnapshot().phase,'unknown');assert.equal(f.store.journal.dispatched.length,1);
 delete f.hooks.put;const reloaded=new Session(f.deps);await reloaded.inspect();assert.equal(reloaded.getSnapshot().phase,'resume');await reloaded.resume();
 assert.equal(reloaded.getSnapshot().phase,'published');assert.equal(f.calls.filter(c=>c.action==='put').length,1);
});
test('lost prepare response is recovered by request key without another prepare',async()=>{
 const f=fixture();let once=true;f.hooks.prepare=async body=>{if(once){once=false;f.store.journal.command=plain(body);return undefined}};
 const real=f.deps.request;f.deps.request=async(a,b,s)=>{const r=await real(a,b,s);if(a==='prepare')throw new Error('outcome_unknown');return r};
 const s=new Session(f.deps);await s.start(input());assert.equal(s.getSnapshot().phase,'unknown');assert.equal(f.store.journal.attemptId,null);
 await s.resume();assert.equal(s.getSnapshot().phase,'published');assert.equal(f.calls.filter(c=>c.action==='prepare').length,1);
});
test('not-found recovery explicitly sends the same persisted immutable request',async()=>{
 const f=fixture();f.hooks.prepare=async()=>{throw new Error('outcome_unknown')};await f.session.start(input());const original=plain(f.store.journal.command);
 delete f.hooks.prepare;await f.session.resume();assert.equal(f.session.getSnapshot().phase,'published');const sent=f.calls.filter(c=>c.action==='prepare');assert.equal(sent.length,2);assert.deepEqual(sent[0].body,sent[1].body);assert.deepEqual(sent[1].body,original);
});
test('lost publish acknowledgement reads terminal result; never republishes',async()=>{
 const f=fixture();f.hooks.afterPublish=async()=>{throw new Error('outcome_unknown')};await f.session.start(input());assert.equal(f.session.getSnapshot().phase,'unknown');
 delete f.hooks.afterPublish;await f.session.inspect();assert.equal(f.session.getSnapshot().phase,'published');assert.equal(f.calls.filter(c=>c.action==='publish').length,1);
});
test('owner read failure after publish remains unknown until exact readback succeeds',async()=>{
 const f=fixture();f.hooks['owner-read']=async()=>{throw new Error('outcome_unknown')};await f.session.start(input());assert.equal(f.session.getSnapshot().phase,'unknown');assert.equal(f.session.getSnapshot().confirmed,null);
 delete f.hooks['owner-read'];await f.session.resume();assert.equal(f.session.getSnapshot().phase,'published');assert.equal(f.calls.filter(c=>c.action==='publish').length,1);
});
test('HTTP success with missing new gallery membership cannot show published success',async()=>{
 const f=fixture(),value=input();value.gallery=[{file:new Blob(['new-photo']),isPrimary:true}];f.hooks['owner-read']=async()=>({...f.store.stored,images:[],image_url:null});
 await f.session.start(value);assert.equal(f.session.getSnapshot().phase,'unknown');assert.equal(f.session.getSnapshot().confirmed,null);
});
test('incorrect actor, request, horse, byte hash or ordinal acknowledgement stops before upload',async()=>{
 for(const mutate of [r=>r.actor_user_id=Q,r=>r.identity_id=Q,r=>r.request_key=Q,r=>r.horse_offer_id=Q,r=>r.slots[0].expected_sha256='f'.repeat(64),r=>r.slots[0].ordinal=9]){
  const f=fixture({edit:true}),original=f.deps.request;f.deps.request=async(a,b,s)=>{const r=await original(a,b,s);if(a==='prepare')mutate(r);return r};const session=new Session(f.deps),value=input('sale',true);value.gallery=[{file:new Blob(['x']),isPrimary:true}];
  await session.start(value);assert.equal(session.getSnapshot().phase,'unknown');assert.equal(f.calls.some(c=>c.action==='put'||c.action==='publish'),false);
 }
});
test('reselected wrong file sends no PUT; exact original can resume',async()=>{
 const f=fixture(),block=deferred(),value=input();value.gallery=[{file:new Blob(['correct original']),isPrimary:true}];f.hooks['image-prepare']=async()=>{await block.promise;throw new Error('outcome_unknown')};
 const p=f.session.start(value);await until(()=>f.calls.some(c=>c.action==='image-prepare'));block.resolve();await p;delete f.hooks['image-prepare'];
 const next=new Session(f.deps);await next.resume([new Blob(['wrong original'])]);assert.equal(next.getSnapshot().phase,'needs_files');assert.equal(f.calls.some(c=>c.action==='put'),false);
 await next.resume([new Blob(['correct original'])]);assert.equal(next.getSnapshot().phase,'published');assert.equal(f.calls.filter(c=>c.action==='put').length,1);
});
test('identity changes after prepare invalidate further image/publication actions',async()=>{
 const f=fixture(),block=deferred(),real=f.deps.request;f.deps.request=async(a,b,s)=>{const r=await real(a,b,s);if(a==='prepare')await block.promise;return r};const session=new Session(f.deps);
 const p=session.start(input());await until(()=>f.calls.some(c=>c.action==='prepare'));f.store.allowed=false;block.resolve();await p;
 assert.equal(session.getSnapshot().phase,'unknown');assert.equal(f.calls.some(c=>c.action==='publish'),false);assert.ok(f.store.journal);
});
test('stale revision is retained for explicit cancel/reload; current public data is untouched',async()=>{
 const f=fixture({edit:true}),value=input('sale',true);f.store.stored={publicTitle:'Newer writer'};f.hooks.prepare=async()=>{throw new Error('revision_conflict')};
 await f.session.start(value);assert.equal(f.session.getSnapshot().phase,'needs_attention');assert.equal(f.store.journal.command.expectedRevision,'3');assert.deepEqual(f.store.stored,{publicTitle:'Newer writer'});
});
test('unknown cancellation cannot clear journal; confirmed cancellation can reset exact request',async()=>{
 const f=fixture();f.hooks.prepare=async()=>{throw new Error('outcome_unknown')};await f.session.start(input());f.hooks.cancel=async()=>{throw new Error('outcome_unknown')};
 await f.session.cancel();await f.session.reset();assert.ok(f.store.journal);delete f.hooks.cancel;
 await f.session.cancel();assert.equal(f.session.getSnapshot().phase,'closed');await f.session.reset();assert.equal(f.store.journal,null);assert.equal(f.session.getSnapshot().phase,'editing');
});
test('missing factual or current policy consent prevents every server mutation',async()=>{
 for(const mutate of [v=>v.confirmations.publisher_confirms_age_18_or_over=false,v=>v.policySnapshot[0].accepted=false,v=>v.policySnapshot=[]]){
  const f=fixture(),value=input();mutate(value);await f.session.start(value);assert.equal(f.session.getSnapshot().phase,'editing');assert.equal(f.calls.some(c=>c.action==='prepare'),false);assert.equal(f.store.journal,null);
 }
});
test('published terminal reset cannot clear another tab newer intent',async()=>{
 const f=fixture();await f.session.start(input());f.store.journal.requestKey=Q;f.store.journal.command.requestKey=Q;
 await f.session.reset();assert.equal(f.store.journal.requestKey,Q);assert.equal(f.session.getSnapshot().phase,'unknown');
});
test('all runtime feedback exists in English and Estonian without changing retained operation',async()=>{
 assert.deepEqual(Object.keys(catalog.en).sort(),Object.keys(catalog.et).sort());const f=fixture();await f.session.start(input());const before=plain(f.store.journal);
 assert.equal(catalog.en[f.session.getSnapshot().message],'Your horse listing is published.');assert.equal(catalog.et[f.session.getSnapshot().message],'Hobuse kuulutus on avaldatud.');assert.deepEqual(f.store.journal,before);
});

/* Render the actual action/field components with only language/auth boundaries
 * injected. This is SSR coverage; no browser engine is installed here. */
const React=require('react'), {renderToStaticMarkup}=require('react-dom/server');
const translate=load('lib/i18n/useTranslation.ts').getCatalogTranslation;
const renderMessage=load('src/shared/i18n/marketplaceMessages.ts').renderMarketplaceMessage;
function renderRealm(language){
 const cache=new Map();
 const loader=rel=>{const file=path.resolve(root,rel);
  if(file.endsWith('/src/shared/i18n/V2LanguageProvider.tsx'))return{useV2Translation:catalog=>({language,t:(key,params)=>translate(language,catalog,key,params)}),useV2Language:()=>({language})};
  if(file.endsWith('/src/shared/i18n/useMarketplaceTranslation.ts'))return{useMarketplaceTranslation:()=>({language,r:value=>renderMessage(language,value)})};
  if(cache.has(file))return cache.get(file).exports;
  const m={exports:{}};cache.set(file,m);const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  const req=name=>{if(!name.startsWith('.')){assert.ok(['react','react/jsx-runtime','next/link'].includes(name));return require(name)}const p=path.resolve(path.dirname(file),name);return loader(fs.existsSync(p+'.ts')?p+'.ts':p+'.tsx')};
  vm.runInThisContext('(function(module,exports,require){'+out.outputText+'\n})',{filename:file,timeout:2000})(m,m.exports,req);return m.exports;
 };return loader;
}
for(const language of ['en','et'])test(language+': create and published-edit action have one clear primary action, with recovery separate',()=>{
 const loadUi=renderRealm(language),Action=loadUi('src/features/horse-publication/components/HorsePublicationAction.tsx').default;
 const initial={phase:'editing',message:'',result:null,confirmed:null,currentImage:null,intent:null};
 const html=renderToStaticMarkup(React.createElement(Action,{session:{},view:initial,canSubmit:true,onSubmit(){}}));
 assert.ok(html.includes(catalog[language].publish));assert.equal(html.includes(catalog[language].save),false);assert.doesNotMatch(html,/Save draft|Salvesta mustand/);
 const edit=renderToStaticMarkup(React.createElement(Action,{session:{},view:initial,editing:true,canSubmit:true,onSubmit(){}}));assert.ok(edit.includes(catalog[language].save));
 const unknown=renderToStaticMarkup(React.createElement(Action,{session:{},view:{...initial,phase:'unknown',message:'unknown'},canSubmit:false,onSubmit(){}}));
 assert.ok(unknown.includes(catalog[language].checkResult));assert.ok(unknown.includes(catalog[language].cancel));assert.ok(unknown.includes('role="alert"'));assert.equal(unknown.includes(catalog[language].publish),false);
});
for(const language of ['en','et'])test(language+': final action links use exact horse UUID and no ordinary listing route',async()=>{
 const f=fixture();await f.session.start(input());const Action=renderRealm(language)('src/features/horse-publication/components/HorsePublicationAction.tsx').default;
 const html=renderToStaticMarkup(React.createElement(Action,{session:{},view:f.session.getSnapshot(),canSubmit:false,onSubmit(){}}));
 assert.ok(html.includes(`/v2/horse-offer/${H}`));assert.ok(html.includes(`/v2/my-area/horse-offers/${H}`));assert.equal(html.includes('/v2/listing/'),false);assert.ok(html.includes(catalog[language].published));
});
for(const kind of ['sale','free_transfer','lease','co_rider','wanted'])test(kind+': recovered intent review round-trips all visible branch values',()=>{
 const value=input(kind),form=load('src/features/horse-publication/model/horsePublicationReviewForm.ts').horsePublicationReviewForm(value.content);
 const rebuilt=build({...form,offerId:null});assert.deepEqual(plain(rebuilt),plain(value.content));
 const Fields=renderRealm('en')('src/features/horse-offer-edit/components/OwnerHorseOfferEditFields.tsx').default;
 const html=renderToStaticMarkup(React.createElement(Fields,{form,disabled:true,locationLocked:false,onChange(){}}));
 assert.ok(html.includes('disabled=""'));assert.ok(html.includes(value.content.title));assert.ok(html.includes(value.content.description));
 if(kind==='wanted'){assert.ok(html.includes('9500.5'));assert.ok(html.includes('Tartu'));assert.equal(html.includes('Example horse'),false);}
});
