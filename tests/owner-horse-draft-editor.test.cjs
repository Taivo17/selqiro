/* Actual TypeScript modules with a deliberately fake API. No .env, server or DB is imported. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const E = 'src/entities/horse-offer/';
const F = 'src/features/horse-offer-edit/';
const U = '11111111-1111-4111-8111-111111111111';
const I = '22222222-2222-4222-8222-222222222222';
const J = '33333333-3333-4333-8333-333333333333';
const ID = '44444444-4444-4444-8444-444444444444';
const T = '2026-09-19T05:00:00.000Z';
const plain = x => JSON.parse(JSON.stringify(x));
function realm(client = {}) {
  const cache = new Map();
  function load(rel) {
    const file = path.resolve(root, rel);
    assert.ok(file.startsWith(root + path.sep));
    if (file.endsWith('/src/shared/supabase/browserClient.ts')) return {supabaseBrowserClient: client};
    if (cache.has(file)) return cache.get(file).exports;
    const source = fs.readFileSync(file, 'utf8');
    const out = ts.transpileModule(source, {fileName: file, reportDiagnostics: true,
      compilerOptions: {target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}});
    assert.deepEqual(out.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error), []);
    const m = {exports: {}}; cache.set(file, m);
    const req = name => {
      assert.ok(name.startsWith('.'), 'No application external imports: ' + name);
      const p = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(p + '.ts') ? p + '.ts' : p + '.tsx');
    };
    vm.runInNewContext(out.outputText, {module:m, exports:m.exports, require:req, Error, TypeError,
      Date, Number, BigInt, Object, Array, Set, Map, JSON, Promise, TextEncoder}, {filename:file, timeout:1500});
    return m.exports;
  }
  return load;
}
function row(kind = 'sale', extra = {}) {
  const r = {content_type:'horse_offer', content_id:ID, offer_id:ID, identity_id:I,
    offer_type:kind, status:'draft', market_country_code:'EE', horse_location_country_code:'EE',
    title:'Test', description:'Synthetic only', price_type:'contact', price_amount:null, currency:'EUR',
    image_url:null, horse_name:null, birth_year:null, sex:null, breed:null, color:null, height_cm:null,
    discipline:null, training_level:null, suitability:null, health_notes:null, behavior_notes:null,
    city:'Paide', region:null, location_text:null, horse_lat:null, horse_lng:null,
    details:{schema_version:1, branch:kind==='wanted'?'wanted':'specific', unrelated:{keep:null}},
    published_at:null, held_at:null, paused_at:null, closed_at:null, rejected_at:null, archived_at:null,
    active_until:null, created_at:T, updated_at:T, images:[]};
  if (kind==='free_transfer') r.price_type='free';
  if (kind==='lease'||kind==='co_rider') r.details.recurring_fee={period:'week',keep:null};
  if (kind==='wanted') r.details.wanted={preferred_sex:'unknown',keep:null,
    budget:{mode:'contact',currency:'EUR',keep:null},search_area:{country_code:'EE',city_or_municipality:'Paide',keep:null}};
  return {...r,...extra};
}
const load = realm();
const {mapOwnerHorseOfferDetail:map} = load(E+'api/mappers.ts');
const {OwnerHorseDraftSession:Session} = load(F+'model/ownerHorseDraftSession.ts');
const {HorseDraftWriteError:WriteError} = load(E+'model/draftWriteError.ts');
const model = load(F+'model/ownerHorseDraftForm.ts');
const {prepareOwnerHorseDraftForm:form,buildOwnerHorseDraftChanges:diff} = model;
const snap = (kind='sale', extra={}) => ({detail:map(row(kind,extra)),editRevision:'1'});
function deferred() { let resolve,reject; const promise=new Promise((r,j)=>{resolve=r;reject=j;});return {promise,resolve,reject}; }
const tick = async () => {for(let i=0;i<12;i++) await Promise.resolve();};
async function session(kind='sale', patch={}) {
  let stored=snap(kind);const calls={read:0,write:[]};
  const api={actor:async()=>({userId:U,identityId:I}),read:async()=>{calls.read++;return plain(stored);},
    update:async input=>{calls.write.push(plain(input));stored={detail:{...stored.detail,...input.changes},editRevision:String(BigInt(stored.editRevision)+BigInt(1))};
      return {offerId:ID,editRevision:stored.editRevision,updatedAt:T};},...patch};
  const s=new Session(U,ID,api);s.activate();await s.refreshContext();
  return {s,api,calls,store:x=>{stored=x;}};
}
const changeTitle = (s,t='Changed') => s.change(f=>({...f,title:t}));

test('atomic adapter uses one RPC and retains a large decimal revision', async()=>{
  const calls=[]; const reader=realm({rpc:async(n,a)=>{calls.push({n,a});return{data:[{offer:row(),edit_revision:'9007199254740993'}],error:null};}})(E+'api/getMyHorseOfferEditSnapshot.ts');
  const result=await reader.getMyHorseOfferEditSnapshot(ID);
  assert.equal(result.editRevision,'9007199254740993'); assert.equal(result.detail.offerId,ID);
  assert.deepEqual(plain(calls),[{n:'get_my_horse_offer_edit_snapshot_v1',a:{p_offer_id:ID}}]);
});
test('atomic adapter empty array is a neutral not-found',async()=>{
  const r=realm({rpc:async()=>({data:[],error:null})})(E+'api/getMyHorseOfferEditSnapshot.ts');
  assert.equal(await r.getMyHorseOfferEditSnapshot(ID),null);
});
for(const [label,data] of [
  ['non-array',{}], ['null',null], ['multiple',[{offer:row(),edit_revision:'1'},{offer:row(),edit_revision:'1'}]],
  ['numeric revision',[{offer:row(),edit_revision:1}]],['missing revision',[{offer:row()}]],
  ['leading zero',[{offer:row(),edit_revision:'01'}]],['overflow',[{offer:row(),edit_revision:'9223372036854775808'}]],
  ['wrong ID',[{offer:row('sale',{offer_id:J,content_id:J}),edit_revision:'1'}]],
  ['bad identity',[{offer:row('sale',{identity_id:'fallback-private'}),edit_revision:'1'}]],
  ['wrong content ID',[{offer:row('sale',{content_id:J}),edit_revision:'1'}]],
]) test('atomic adapter rejects '+label,async()=>{
  const r=realm({rpc:async()=>({data,error:null})})(E+'api/getMyHorseOfferEditSnapshot.ts');
  await assert.rejects(r.getMyHorseOfferEditSnapshot(ID));
});
test('invalid requested ID never dispatches',async()=>{
  let calls=0;const r=realm({rpc:async()=>{calls++;}})(E+'api/getMyHorseOfferEditSnapshot.ts');
  await assert.rejects(r.getMyHorseOfferEditSnapshot('not-an-id'));assert.equal(calls,0);
});
for(const kind of ['sale','free_transfer','lease','co_rider','wanted']) test(kind+': title-only edit excludes every other field',()=>{
  const d=snap(kind).detail;d.locationText='Private stable';d.horseLat=58;d.details.extra={nested:null};
  const before=plain(d), f=form(d);
  assert.deepEqual(plain(diff(d,f,{...f,title:'Only title'})),{title:'Only title'});
  assert.deepEqual(plain(d),before);assert.equal(f.offerId,ID);assert.equal(f.offerType,kind);
});
test('wanted unknown stays distinct and is preserved or explicitly cleared',()=>{
  const d=snap('wanted').detail,f=form(d);assert.equal(f.basicFields.sex,'unknown');
  const cleared={...f,basicFields:{...f.basicFields,sex:''}};
  assert.deepEqual(plain(diff(d,f,cleared)),{wanted_preferred_sex:null});
});
test('untouched optional null and unrelated nested JSON never enter a patch',()=>{
  const d=snap('wanted').detail;d.details.wanted.preferred_breed=null;d.details.wanted.budget.extra=null;
  const f=form(d);assert.deepEqual(plain(diff(d,f,{...f,description:'New'})),{description:'New'});
  assert.equal(d.details.wanted.preferred_breed,null);assert.equal(d.details.wanted.budget.extra,null);
});
for(const [label,mutate] of [
  ['wrong schema',d=>{d.details.schema_version=2;}],['wrong branch',d=>{d.details.branch='specific';}],
  ['budget missing',d=>{delete d.details.wanted.budget;}],['budget string number',d=>{d.details.wanted.budget={mode:'maximum',currency:'EUR',amount:'5'};}],
  ['budget precision',d=>{d.details.wanted.budget={mode:'maximum',currency:'EUR',amount:0.001};}],
  ['unknown sex',d=>{d.details.wanted.preferred_sex='unexpected';}],['bad nested text',d=>{d.details.wanted.preferred_breed={};}],
  ['wrong area country',d=>{d.details.wanted.search_area.country_code='FI';}],
]) test('unsupported wanted shape is not an editable fallback: '+label,()=>{
  const d=snap('wanted').detail;mutate(d);assert.equal(form(d),null);
});
test('unknown recurring period does not silently become editable month',()=>{
  const d=snap('lease').detail;d.details.recurring_fee.period='fortnight';assert.equal(form(d),null);
});
test('price mode changes include correct amount clearing, buyer budget remains separate',()=>{
  for(const kind of ['sale','wanted']){
    const d=snap(kind).detail;
    if(kind==='sale'){d.priceType='fixed';d.priceAmount=6500;}
    else d.details.wanted.budget={mode:'maximum',amount:6500,currency:'EUR'};
    const f=form(d),n=plain(f),branch=kind==='sale'?'sale':'wanted';n.priceFields[branch].mode='contact';
    assert.deepEqual(plain(diff(d,f,n)),kind==='sale'?{price_type:'contact',price_amount:null}:{wanted_budget_mode:'contact',wanted_budget_amount:null});
  }
});
test('wanted area and lease period use only their designated scalar keys',()=>{
  const d=snap('wanted').detail,f=form(d),n=plain(f);n.locationFields.wanted.cityOrMunicipality='Tartu';n.locationFields.wanted.region='Tartumaa';
  assert.deepEqual(plain(diff(d,f,n)),{wanted_city:'Tartu',wanted_region:'Tartumaa'});
  const lease=snap('lease').detail,a=form(lease),b=plain(a);b.priceFields.lease.period='day';
  assert.deepEqual(plain(diff(lease,a,b)),{recurring_fee_period:'day'});
});
test('private location blocks locality edit but not price edit',()=>{
  const d=snap().detail;d.horseLat=0;const f=form(d),n=plain(f);n.locationFields.specific.region='Tartu';
  assert.equal(model.hasPrivateHorseLocation(d),true);assert.throws(()=>diff(d,f,n));
  const price=plain(f);price.priceFields.sale={...price.priceFields.sale,mode:'fixed',amount:'25,50'};
  assert.deepEqual(plain(diff(d,f,price)),{price_type:'fixed',price_amount:25.5});
});
for(const [label,field,value] of [['fractional year','birthYear','2000.5'],['height precision','heightCm','168.55'],['year range','birthYear','2200'],['height negative','heightCm','-1']]) test('changed numeric validation: '+label,()=>{
 const d=snap().detail,f=form(d),n=plain(f);n.basicFields[field]=value;assert.throws(()=>diff(d,f,n));
});
test('title length and empty non-contact price are rejected',()=>{
 const d=snap().detail,f=form(d);assert.throws(()=>diff(d,f,{...f,title:'x'.repeat(141)}));
 const n=plain(f);n.priceFields.sale.mode='fixed';assert.throws(()=>diff(d,f,n));
});
test('no-op and inactive branch changes cause no patch',()=>{
 const d=snap().detail,f=form(d),n=plain(f);n.priceFields.wanted.amount='99';n.locationFields.wanted.region='X';
 assert.deepEqual(plain(diff(d,f,n)),{});
});
test('offer type, ID and non-draft are never editable via patch builder',()=>{
 const d=snap().detail,f=form(d);assert.throws(()=>diff(d,f,{...f,offerId:J}));assert.throws(()=>diff(d,f,{...f,offerType:'wanted'}));
 assert.throws(()=>diff({...d,status:'rejected'},f,{...f,title:'X'}));
});

for(const kind of ['sale','free_transfer','lease','co_rider','wanted']) test(kind+': reopen snapshot then update same ID, read canonical server values',async()=>{
 const {s,calls}=await session(kind);changeTitle(s);await s.save();
 assert.equal(calls.write.length,1);assert.deepEqual(calls.write[0],{offerId:ID,editRevision:'1',changes:{title:'Changed'}});
 assert.equal(s.getSnapshot().snapshot.editRevision,'2');assert.equal(s.isDirty(),false);assert.equal(calls.read,2);
});
test('normalized no-op ACK keeps exact version and rereads canonical input',async()=>{
 const {s,api}=await session();changeTitle(s,'  Test  ');api.update=async()=>({offerId:ID,editRevision:'1',updatedAt:T});await s.save();
 assert.equal(s.getSnapshot().form.title,'Test');assert.equal(s.getSnapshot().snapshot.editRevision,'1');assert.equal(s.canSave(),false);
});
test('later entire snapshot is adopted with notice, never merged with old input',async()=>{
 const {s,api}=await session();changeTitle(s);api.update=async()=>({offerId:ID,editRevision:'2',updatedAt:T});
 api.read=async()=>({...snap(),detail:{...snap().detail,title:'Other writer'},editRevision:'3'});await s.save();
 assert.equal(s.getSnapshot().form.title,'Other writer');assert.equal(s.getSnapshot().snapshot.editRevision,'3');assert.match(s.getSnapshot().message,/veel muudetud/);
});
test('acknowledged write plus failed reread retries only reading',async()=>{
 const {s,api,calls}=await session();changeTitle(s);const realRead=api.read;api.read=async()=>{throw new Error('read unavailable');};await s.save();
 assert.equal(s.getSnapshot().acknowledgement.editRevision,'2');assert.equal(s.getSnapshot().snapshot.editRevision,'1');assert.equal(s.getSnapshot().form.title,'Changed');
 await s.save();assert.equal(calls.write.length,1);api.read=realRead;await s.reload();assert.equal(calls.write.length,1);assert.equal(s.getSnapshot().acknowledgement,null);
});
test('post-ACK backward snapshot is not paired with new revision',async()=>{
 const {s,api}=await session();changeTitle(s);api.update=async()=>({offerId:ID,editRevision:'2',updatedAt:T});await s.save();
 assert.equal(s.getSnapshot().snapshot.editRevision,'1');assert.equal(s.getSnapshot().acknowledgement.editRevision,'2');assert.equal(s.canSave(),false);
});
for(const [name,error,problem] of [
 ['conflict',()=>new WriteError('conflict','rejected','40001'),'conflict'],
 ['non-draft',()=>new WriteError('not draft','rejected','55000'),'not_editable'],
 ['transport',()=>new Error('network'),'unknown'],
 ['unknown ACK',()=>new WriteError('bad ACK','unknown'),'unknown'],
]) test(name+' preserves local input and refuses automatic write retry',async()=>{
 const {s,api,calls}=await session();changeTitle(s);api.update=async x=>{calls.write.push(x);throw error();};await s.save();await s.save();
 assert.equal(s.getSnapshot().problem,problem);assert.equal(s.getSnapshot().form.title,'Changed');assert.equal(s.getSnapshot().snapshot.editRevision,'1');assert.equal(calls.write.length,1);
 await s.reload();assert.equal(calls.read,1);await s.reload(true);assert.equal(calls.read,2);assert.equal(s.getSnapshot().form.title,'Test');
});
test('known server validation rejection permits explicit same-version retry',async()=>{
 const {s,api,calls}=await session();changeTitle(s);api.update=async x=>{calls.write.push(x);throw new WriteError('validation','rejected','23514');};await s.save();await s.save();
 assert.equal(calls.write.length,2);assert.ok(calls.write.every(x=>x.editRevision==='1'));
});
test('single in-flight guard locks fields before actor await',async()=>{
 const {s,api,calls}=await session();changeTitle(s);const d=deferred();api.actor=()=>d.promise;
 const p=s.save();assert.equal(s.canEdit(),false);changeTitle(s,'NOT ACCEPTED');const q=s.save();
 d.resolve({userId:U,identityId:I});await Promise.all([p,q]);assert.equal(calls.write.length,1);assert.equal(calls.write[0].changes.title,'Changed');
});
test('no-op never sends a write',async()=>{const {s,calls}=await session();await s.save();assert.equal(calls.write.length,0);});
test('read-only statuses stay read-only',async()=>{
 for(const status of ['published','paused','rejected','closed','held_for_review','archived']){
  const {s,calls}=await session('sale',{read:async()=>snap('sale',{status})});assert.equal(s.canEdit(),false);changeTitle(s);await s.save();assert.equal(calls.write.length,0);
 }
});
test('A to B to A keeps input and original snapshot without new revision read',async()=>{
 const {s,api,calls}=await session();changeTitle(s);api.actor=async()=>({userId:U,identityId:J});await s.refreshContext();
 assert.equal(s.getSnapshot().context,'blocked');await s.save();assert.equal(calls.write.length,0);assert.equal(s.getSnapshot().form.title,'Changed');
 api.actor=async()=>({userId:U,identityId:I});await s.refreshContext();assert.equal(calls.read,1);assert.equal(s.getSnapshot().snapshot.editRevision,'1');await s.save();assert.equal(calls.write.length,1);
});
test('identity event invalidates pre-dispatch actor read',async()=>{
 const {s,api,calls}=await session();changeTitle(s);const d=deferred();api.actor=()=>d.promise;const p=s.save();
 api.actor=async()=>({userId:U,identityId:J});await s.refreshContext();d.resolve({userId:U,identityId:I});await p;assert.equal(calls.write.length,0);assert.equal(s.getSnapshot().context,'blocked');
});
test('late acknowledged write after identity change is retained; only read allowed on return',async()=>{
 const d=deferred();const {s,api,calls}=await session('sale',{update:()=>d.promise});changeTitle(s);const p=s.save();await tick();
 api.actor=async()=>({userId:U,identityId:J});await s.refreshContext();d.resolve({offerId:ID,editRevision:'2',updatedAt:T});await p;
 assert.equal(s.getSnapshot().acknowledgement.editRevision,'2');assert.equal(s.getSnapshot().context,'blocked');assert.equal(calls.read,1);
 api.actor=async()=>({userId:U,identityId:I});await s.refreshContext();assert.equal(s.canSave(),false);assert.equal(calls.read,1);
 api.read=async()=>({...snap(),editRevision:'2'});await s.reload();assert.equal(s.getSnapshot().acknowledgement,null);
});
test('out-of-order actor completions never undo newest blocked context',async()=>{
 const {s,api}=await session();const a=deferred(),b=deferred();api.actor=()=>a.promise;const p=s.refreshContext();api.actor=()=>b.promise;const q=s.refreshContext();
 b.resolve({userId:U,identityId:J});await q;a.resolve({userId:U,identityId:I});await p;assert.equal(s.getSnapshot().context,'blocked');
});
test('logout purges data and ignores late ACK',async()=>{
 const d=deferred();const {s}=await session('sale',{update:()=>d.promise});changeTitle(s);const p=s.save();await tick();s.authChanged(null);
 d.resolve({offerId:ID,editRevision:'2',updatedAt:T});await p;assert.equal(s.getSnapshot().closed,true);assert.equal(s.getSnapshot().snapshot,null);assert.equal(s.getSnapshot().form,null);assert.equal(s.getSnapshot().acknowledgement,null);
});
test('same-user token refresh does not erase input; other account permanently closes session',async()=>{
 const {s}=await session();changeTitle(s);s.authChanged(U);assert.equal(s.getSnapshot().form.title,'Changed');s.authChanged(J);s.authChanged(U);s.activate();await s.refreshContext();assert.equal(s.getSnapshot().form,null);
});
test('effect setup cleanup setup can load, while stale initial responses are ignored',async()=>{
 const pending=deferred();let n=0;const api={actor:async()=>({userId:U,identityId:I}),read:async()=>++n===1?pending.promise:snap(),update:async()=>{throw Error('must not write');}};
 const s=new Session(U,ID,api);s.activate();const p=s.refreshContext();await tick();s.deactivate();s.activate();await s.refreshContext();
 pending.resolve({...snap(),detail:{...snap().detail,title:'Stale'}});await p;assert.equal(s.getSnapshot().form.title,'Test');assert.equal(s.getSnapshot().work,'idle');
});
test('wrong identity snapshot is not shown and no baseline is bound',async()=>{
 const {s}=await session('sale',{read:async()=>snap('sale',{identity_id:J})});assert.equal(s.getSnapshot().snapshot,null);assert.equal(s.getSnapshot().problem,'load');
});
test('identity changes during initial snapshot read are checked again',async()=>{
 let actorCount=0;const {s}=await session('sale',{actor:async()=>({userId:U,identityId:++actorCount>=3?J:I})});assert.equal(s.getSnapshot().snapshot,null);assert.equal(s.getSnapshot().context,'blocked');
});
test('not-found can be retried after choosing correct identity',async()=>{
 const {s,api}=await session('sale',{read:async()=>null});assert.equal(s.getSnapshot().problem,'not_found');api.read=async()=>snap();await s.reload();assert.equal(s.getSnapshot().snapshot.detail.offerId,ID);
});
test('snapshot is cached and immutable; reset does not write or fetch',async()=>{
 const {s,calls}=await session();const state=s.getSnapshot();assert.equal(state,s.getSnapshot());assert.ok(Object.isFrozen(state.form.basicFields));
 let notifications=0;const off=s.subscribe(()=>notifications++);changeTitle(s);s.resetToLoaded();off();assert.ok(notifications>=2);assert.equal(s.isDirty(),false);assert.equal(calls.write.length,0);assert.equal(calls.read,1);
});
test('invalid acknowledged UUID or revision freezes rather than guesses',async()=>{
 for(const ack of [{offerId:J,editRevision:'2',updatedAt:T},{offerId:ID,editRevision:'8',updatedAt:T},{offerId:ID,editRevision:2,updatedAt:T}]){
  const {s}=await session('sale',{update:async()=>ack});changeTitle(s);await s.save();assert.equal(s.getSnapshot().problem,'unknown');
 }
});
test('strict core typecheck with explicit fake Supabase transport only',()=>{
 const options={strict:true,noEmit:true,skipLibCheck:true,target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,
   moduleResolution:ts.ModuleResolutionKind.Node10,types:[],lib:['lib.esnext.d.ts','lib.dom.d.ts']};
 const host=ts.createCompilerHost(options),read=host.readFile,browser=path.join(root,'src/shared/supabase/browserClient.ts');
 host.readFile=f=>path.resolve(f)===browser?'export declare const supabaseBrowserClient: unknown;':read(f);
 const names=[E+'api/getMyHorseOfferEditSnapshot.ts',F+'model/ownerHorseDraftForm.ts',F+'model/ownerHorseDraftSession.ts'];
 const errors=ts.getPreEmitDiagnostics(ts.createProgram(names.map(f=>path.join(root,f)),options,host)).filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.equal(errors.length,0,ts.formatDiagnosticsWithColorAndContext(errors,{getCurrentDirectory:()=>root,getCanonicalFileName:x=>x,getNewLine:()=> '\n'}));
});
test('reload exception is only the exact UUID owner edit route; other routes preserved',()=>{
 const r=load('src/features/v2-shell/model/identityRouteReload.ts').shouldReloadIdentityScopedRoute;
 assert.equal(r('/v2/my-area/horse-offers/'+ID+'/edit'),false);assert.equal(r('/v2/my-area/horse-offers/'+ID+'/edit/'),false);
 for(const p of ['/v2/my-area','/v2/my-area/horse-offers/'+ID,'/v2/my-area/horse-offers/wrong/edit','/v2/my-area/listings/1/edit','/v2/energy','/v2/listing/1','/v2/service/1','/v2/showcase/1']) assert.equal(r(p),true,p);
 for(const p of [null,'/v2/sell','/v2/profile/test','/v2/products']) assert.equal(r(p),false,p);
});
test('UI and hook wiring: user/ID key, subscriptions cleanup, disabled form, explicit discard',()=>{
 const source=p=>fs.readFileSync(path.join(root,p),'utf8');
 const page=source(F+'components/OwnerHorseOfferEditPage.tsx');assert.match(page,/key=\{`\$\{user.id\}:\$\{id\}`\}/);assert.match(page,/if \(!user\)/);
 const hook=source(F+'model/useOwnerHorseOfferEditForm.ts');assert.match(hook,/subscription.unsubscribe/);assert.match(hook,/removeEventListener\("beforeunload"/);assert.match(hook,/window.confirm/);assert.doesNotMatch(hook,/localStorage|sessionStorage/);
 const fields=source(F+'components/OwnerHorseOfferEditFields.tsx');assert.match(fields,/<fieldset disabled=\{disabled\}/);assert.match(fields,/<fieldset disabled=\{locationLocked\}/);
 const session=source(F+'model/ownerHorseDraftSession.ts');assert.doesNotMatch(session,/saveMyHorseOfferDraft|api\.create|localStorage|sessionStorage/);
 const basic=source('src/features/listing-create/components/HorseOfferBasicFields.tsx');assert.match(basic,/value="unknown">Pole teada \(salvestatud väärtus\)/);
});
test('new and changed TSX plus hook transpile without syntax errors (not React rendering)',()=>{
 for(const file of [F+'components/OwnerHorseOfferEditPage.tsx',F+'components/OwnerHorseOfferEditor.tsx',F+'components/OwnerHorseOfferEditFields.tsx',F+'components/OwnerHorseOfferEditImages.tsx',
   F+'model/useOwnerHorseOfferEditForm.ts','src/features/v2-shell/components/V2IdentityBadge.tsx','src/features/horse-offer-detail/components/OwnerHorseOfferDetailPage.tsx',
   'src/features/listing-create/components/HorseOfferBasicFields.tsx']){
  const out=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{fileName:file,reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS}});
  assert.deepEqual(out.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error),[],file);
 }
});
