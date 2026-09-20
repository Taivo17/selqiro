/* Actual source modules; deliberately fake Supabase. No real client/env/database imported. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const entity = 'src/entities/horse-offer/';
const feature = 'src/features/listing-create/model/';
const U = '11111111-1111-4111-8111-111111111111';
const I = '22222222-2222-4222-8222-222222222222';
const J = '33333333-3333-4333-8333-333333333333';
const ID = '44444444-4444-4444-8444-444444444444';
const DATE = '2026-09-14T12:00:00.000Z';
function realm(client = {}) {
  const cache = new Map();
  function load(relative) {
    const file = path.resolve(root, relative);
    assert.ok(file.startsWith(root + path.sep));
    if (file.endsWith('/src/shared/supabase/browserClient.ts')) return { supabaseBrowserClient: client };
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const raw = fs.readFileSync(file, 'utf8');
    const result = ts.transpileModule(raw, { fileName: file, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS } });
    assert.deepEqual(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error), []);
    const req = name => {
      assert.ok(name.startsWith('.'), `No external runtime imports allowed: ${name}`);
      const candidate = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(candidate + '.ts') ? candidate + '.ts' : candidate + '/index.ts');
    };
    vm.runInNewContext(result.outputText, { exports: mod.exports, module: mod, require: req,
      Error, TypeError, Date, Number, BigInt, Object, Array, Set, Map, JSON, Promise, TextEncoder }, { filename: file });
    return mod.exports;
  }
  return load;
}
const load = realm();
const { HorseDraftSession } = load(feature + 'horseDraftSession.ts');
const { HorseDraftWriteError, horseDraftRpcError } = load(entity + 'model/draftWriteError.ts');
const { buildHorseDraftChanges } = load(feature + 'horseDraftChanges.ts');
const versions = load(entity + 'model/draftEdit.ts');
const { buildHorseOfferDraftSaveInput } = load(feature + 'horseOfferDraftSave.ts');
const factory = (file, name) => load(feature + file + '.ts')[name]();
function form(offerType = 'sale') {
  return { offerType, title: 'Testmustand', description: 'Ei ole avalik',
    basicFields: factory('horseOfferFields', 'createHorseOfferBasicFieldState'),
    useFields: factory('horseOfferUseFields', 'createHorseOfferUseFieldState'),
    disclosureFields: factory('horseOfferDisclosureFields', 'createHorseOfferDisclosureFieldState'),
    priceFields: factory('horseOfferPriceFields', 'createHorseOfferPriceFieldState'),
    locationFields: factory('horseOfferLocationFields', 'createHorseOfferLocationFieldState') };
}
function payload(kind = 'sale') {
  const f = form(kind);
  f.priceFields.lease.period = 'month'; f.priceFields.coRider.period = 'month';
  return buildHorseOfferDraftSaveInput(f);
}
function saved(input, extra = {}) { return { offerId: ID, identityId: I, createdByUserId: U,
  offerType: input.offerType, status: 'draft', title: input.title, description: input.description,
  createdAt: DATE, updatedAt: DATE, editRevision: '1', ...extra }; }
function rawRow(extra = {}) { return { id: ID, identity_id: I, created_by_user_id: U,
  offer_type: 'sale', status: 'draft', title: 'Test', description: '', created_at: DATE,
  updated_at: DATE, edit_revision: 1, market_country_code:'EE', horse_location_country_code:'EE', currency:'EUR', ...extra }; }
function deferred() { let resolve, reject; const promise = new Promise((r,j) => {resolve=r;reject=j;}); return {promise,resolve,reject}; }
const clone = x => JSON.parse(JSON.stringify(x));
async function session(overrides = {}) {
  const calls = { create: [], update: [], actor: 0 };
  const api = { actor: async () => { calls.actor++; return { userId: U, identityId: I }; },
    create: async p => { calls.create.push(clone(p)); return saved(p); },
    update: async p => { calls.update.push(clone(p)); return { offerId: ID, editRevision: String(BigInt(p.editRevision) + BigInt(1)), updatedAt: DATE }; }, ...overrides };
  const s = new HorseDraftSession(U, api); s.activate(); await s.refreshContext();
  return { s, calls, api };
}
for (const kind of ['sale','free_transfer','lease','co_rider','wanted']) {
  test(kind + ': first create then same-ID scalar revision update', async () => {
    const {s,calls} = await session(); const p = payload(kind);
    await s.save(p); await s.save({...p,title:'Changed'});
    assert.equal(calls.create.length,1); assert.equal(calls.update.length,1);
    assert.deepEqual(calls.update[0],{offerId:ID,editRevision:'1',changes:{title:'Changed'}});
    assert.equal(s.getSnapshot().draft.editRevision,'2'); assert.equal(s.getSnapshot().lockedType,kind);
  });
}
test('title-only patch excludes all private and non-form fields', () => {
  const p=payload(); p.locationText='Private';p.horseLat=58;p.horseLng=25;
  assert.deepEqual(clone(buildHorseDraftChanges(p,{...p,title:'New',locationText:null,horseLat:null,horseLng:null})),{title:'New'});
});
test('wanted budget/area are separate from horse price/location', () => {
  const f=form('wanted'); const a=buildHorseOfferDraftSaveInput(f);
  f.priceFields.wanted.mode='maximum'; f.priceFields.wanted.amount='6500';
  f.locationFields.wanted.cityOrMunicipality='Tartu';
  const b=buildHorseOfferDraftSaveInput(f);
  assert.deepEqual(clone(buildHorseDraftChanges(a,b)),{wanted_budget_mode:'maximum',wanted_budget_amount:6500,wanted_city:'Tartu'});
});
test('switching fixed price to contact clears only its amount', () => {
  const p=payload();p.priceType='fixed';p.priceAmount=100;
  assert.deepEqual(clone(buildHorseDraftChanges(p,{...p,priceType:'contact',priceAmount:null})),{price_type:'contact',price_amount:null});
});
test('explicit optional clearing is retained', () => {
  const p=payload();p.horseName='Horse'; assert.deepEqual(clone(buildHorseDraftChanges(p,{...p,horseName:null})),{horse_name:null});
});
test('hidden branch changes are ignored for wanted', () => {
  const p=payload('wanted'); assert.deepEqual(clone(buildHorseDraftChanges(p,{...p,horseName:'Hidden',city:'Hidden'})),{});
});
test('type change cannot be silently patched', () => assert.throws(()=>buildHorseDraftChanges(payload(),payload('wanted'))));
test('decimal strings preserve precision above Number safe range', () => {
  assert.equal(versions.isExpectedHorseDraftRevision('9007199254740992','9007199254740993'),true);
  assert.equal(versions.isExpectedHorseDraftRevision('9007199254740992',9007199254740993),false);
});
test('revision bounds, no leading zero, no negative or floating token', () => {
  for(const v of ['', '0','01','-1','1.0','9223372036854775808',1,null]) assert.equal(versions.isHorseDraftRevision(v),false);
  assert.equal(versions.isHorseDraftRevision('9223372036854775807'),true);
});
test('unexpected revision jumps and backwards tokens refused', () => {
  assert.equal(versions.isExpectedHorseDraftRevision('2','4'),false);
  assert.equal(versions.isExpectedHorseDraftRevision('2','1'),false);
  assert.equal(versions.isExpectedHorseDraftRevision('2','2'),true);
});
test('new RPC maps exact text revision and sends no extra parameters', async () => {
  let call;const l=realm({rpc:async(name,args)=>{call={name,args};return {data:[{offer_id:ID,edit_revision:'9007199254740993',updated_at:DATE}],error:null};}});
  const r=await l(entity+'api/updateMyHorseOfferDraft.ts').updateMyHorseOfferDraft({offerId:ID,editRevision:'9007199254740992',changes:{title:'X'}});
  assert.equal(r.editRevision,'9007199254740993');
  assert.deepEqual(clone(call),{name:'update_my_horse_offer_draft_v1',args:{p_offer_id:ID,p_expected_edit_revision:'9007199254740992',p_changes:{title:'X'}}});
});
for(const [label,changes] of [['empty',{}],['private',{horse_lat:2}],['status',{status:'published'}],['nested',{details:{}}],['invalid number',{height_cm:Infinity}]]) {
 test('update pre-dispatch rejects '+label,async()=>{
  let n=0;const l=realm({rpc:async()=>{n++;}});await assert.rejects(l(entity+'api/updateMyHorseOfferDraft.ts').updateMyHorseOfferDraft({offerId:ID,editRevision:'1',changes}));assert.equal(n,0);
 });
}
for(const [label,data] of [['empty',[]],['multiple',[rawRow(),rawRow()]],['numeric revision',[{offer_id:ID,edit_revision:2,updated_at:DATE}]],['wrong ID',[{offer_id:J,edit_revision:'2',updated_at:DATE}]]]) {
 test('unconfirmed update response '+label+' is ambiguous',async()=>{
  const l=realm({rpc:async()=>({data,error:null})});await assert.rejects(l(entity+'api/updateMyHorseOfferDraft.ts').updateMyHorseOfferDraft({offerId:ID,editRevision:'1',changes:{title:'X'}}),e=>e.outcome==='unknown');
 });
}
test('legacy browser wrapper rejects same-ID updates before dispatch', async()=>{
 let n=0;const l=realm({rpc:async()=>{n++;}});await assert.rejects(l(entity+'api/saveMyHorseOfferDraft.ts').saveMyHorseOfferDraft({...payload(),offerId:ID}));assert.equal(n,0);
});
test('creation retains returned actor and initial numeric version as text', async()=>{
 let args; const l=realm({rpc:async(n,a)=>{args=a;return{data:[rawRow()],error:null};}});
 const r=await l(entity+'api/saveMyHorseOfferDraft.ts').saveMyHorseOfferDraft(payload());
 assert.equal(r.createdByUserId,U);assert.equal(r.editRevision,'1');assert.equal(args.p_offer_id,null);
});
for(const revision of [undefined,0,2,'9007199254740993']) test('create revision '+revision+' is never guessed', async()=>{
 const l=realm({rpc:async()=>({data:[rawRow({edit_revision:revision})],error:null})});
 await assert.rejects(l(entity+'api/saveMyHorseOfferDraft.ts').saveMyHorseOfferDraft(payload()),e=>e.outcome==='unknown'&&e.knownOfferId===ID);
});
test('transport/connection/PostgREST failures are not proof of rollback',()=>{
 for(const code of ['08006','PGRST202',null])assert.equal(horseDraftRpcError({code}).outcome,'unknown');
 for(const code of ['40001','23514','P0001'])assert.equal(horseDraftRpcError({code}).outcome,'rejected');
});
test('single in-flight lock precedes first await',async()=>{
 const d=deferred();const {s,calls,api}=await session();api.actor=()=>d.promise;
 const one=s.save(payload());const two=s.save(payload());d.resolve({userId:U,identityId:I});await Promise.all([one,two]);assert.equal(calls.create.length,1);
});
test('sent snapshot survives input mutation during request',async()=>{
 const d=deferred();const {s}=await session({create:()=>d.promise});const p=payload();const run=s.save(p);await Promise.resolve();p.title='Typed while pending';d.resolve(saved({...p,title:'Testmustand'}));await run;
 assert.equal(s.getSnapshot().baseline.title,'Testmustand');
});
test('client no-op skips mutation',async()=>{
 const {s,calls}=await session();const p=payload();await s.save(p);await s.save(p);assert.equal(calls.create.length,1);assert.equal(calls.update.length,0);
});
test('type locked after saved draft',async()=>{
 const {s,calls}=await session();await s.save(payload());await s.save(payload('wanted'));assert.equal(calls.create.length,1);assert.equal(calls.update.length,0);
});
test('identity change blocks saved context, returning does not refetch revision',async()=>{
 const {s,api,calls}=await session();const p=payload();await s.save(p);
 api.actor=async()=>({userId:U,identityId:J});await s.refreshContext();await s.save({...p,title:'Must not send'});assert.equal(calls.update.length,0);assert.equal(s.getSnapshot().context,'blocked');
 api.actor=async()=>({userId:U,identityId:I});await s.refreshContext();await s.save({...p,title:'Now save'});assert.equal(calls.update[0].editRevision,'1');
});
test('identity event invalidates pre-dispatch actor read',async()=>{
 const {s,api,calls}=await session();const d=deferred();api.actor=()=>d.promise;const run=s.save(payload());
 api.actor=async()=>({userId:U,identityId:J});await s.refreshContext();d.resolve({userId:U,identityId:I});await run;assert.equal(calls.create.length,0);
});
test('late successful write retains ID but not ready context after identity change',async()=>{
 const d=deferred();const {s,api}=await session({create:()=>d.promise});const p=payload();const run=s.save(p);await new Promise(setImmediate);
 api.actor=async()=>({userId:U,identityId:J});await s.refreshContext();d.resolve(saved(p));await run;
 assert.equal(s.getSnapshot().draft.offerId,ID);assert.equal(s.getSnapshot().context,'blocked');assert.equal(s.canSave(),false);
});
test('out-of-order actor reads cannot undo newest context',async()=>{
 const {s,api}=await session();const d=deferred();api.actor=()=>d.promise;const first=s.refreshContext();api.actor=async()=>({userId:U,identityId:J});await s.refreshContext();d.resolve({userId:U,identityId:I});await first;assert.equal(s.getSnapshot().context,'blocked');
});
test('unmount prevents pre-dispatch write; effect reattach can recover without resetting draft',async()=>{
 const {s,api,calls}=await session();await s.save(payload());const d=deferred();api.actor=()=>d.promise;const run=s.save({...payload(),title:'X'});s.deactivate();d.resolve({userId:U,identityId:I});await run;assert.equal(calls.update.length,0);
 s.activate();api.actor=async()=>({userId:U,identityId:I});await s.refreshContext();assert.equal(s.getSnapshot().draft.offerId,ID);
});
test('same-user auth refresh is harmless; different user closes session permanently',async()=>{
 const {s,calls}=await session();s.authChanged(U);await s.save(payload());s.authChanged(J);s.authChanged(U);await s.refreshContext();await s.save({...payload(),title:'X'});assert.equal(calls.update.length,0);assert.equal(s.canSave(),false);
});
test('mismatching returned creator freezes known ID rather than silently rebinding',async()=>{
 const {s}=await session({create:async p=>saved(p,{createdByUserId:J})});await s.save(payload());assert.equal(s.getSnapshot().stop,'unknown');assert.equal(s.getSnapshot().recoveryId,ID);assert.equal(s.getSnapshot().draft,null);
});
test('mismatching returned identity freezes known ID',async()=>{
 const {s}=await session({create:async p=>saved(p,{identityId:J})});await s.save(payload());assert.equal(s.getSnapshot().stop,'unknown');assert.equal(s.canSave(),false);
});
test('conflict preserves baseline/token and permanently refuses same-form mutation',async()=>{
 const {s,api}=await session();await s.save(payload());let n=0;api.update=async()=>{n++;throw new HorseDraftWriteError('conflict','rejected','40001');};await s.save({...payload(),title:'Other'});await s.refreshContext();await s.save({...payload(),title:'Retry'});
 assert.equal(s.getSnapshot().draft.editRevision,'1');assert.equal(s.getSnapshot().baseline.title,'Testmustand');assert.equal(n,1);assert.equal(s.getSnapshot().stop,'conflict');
});
test('unknown update cannot become a successful no-op by reverting text',async()=>{
 const {s,api}=await session();await s.save(payload());api.update=async()=>{throw new Error('Network');};await s.save({...payload(),title:'Maybe saved'});await s.save(payload());assert.equal(s.getSnapshot().stop,'unknown');assert.equal(s.canSave(),false);
});
test('unknown create blocks repeat and locks the attempted type',async()=>{
 let n=0;const {s}=await session({create:async()=>{n++;throw new Error('Lost response');}});await s.save(payload());await s.save(payload());assert.equal(n,1);assert.equal(s.getSnapshot().lockedType,'sale');
});
test('known rejection allows explicit retry with same revision only',async()=>{
 const {s,api,calls}=await session();await s.save(payload());api.update=async p=>{calls.update.push(clone(p));throw new HorseDraftWriteError('bad field','rejected','23514');};await s.save({...payload(),title:'Bad'});await s.save({...payload(),title:'Corrected'});
 assert.deepEqual(calls.update.map(x=>x.editRevision),['1','1']);assert.equal(s.getSnapshot().stop,null);
});
test('non-draft refusal prevents retries',async()=>{
 const {s,api}=await session();await s.save(payload());api.update=async()=>{throw new HorseDraftWriteError('non-draft','rejected','55000');};await s.save({...payload(),title:'No'});assert.equal(s.getSnapshot().stop,'not_editable');
});
test('actor precheck rejects fallback identity and wrong user without writes',async()=>{
 let reads=0;const l=realm({auth:{getUser:async()=>({data:{user:{id:U}},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>{reads++;return{data:{active_identity_id:'fallback-private'},error:null};}})})})});
 await assert.rejects(l(entity+'api/getHorseDraftActor.ts').getHorseDraftActor(U));assert.equal(reads,1);
 await assert.rejects(l(entity+'api/getHorseDraftActor.ts').getHorseDraftActor(J));assert.equal(reads,1);
});
test('cached external snapshot and subscription cleanup',async()=>{
 const {s}=await session();assert.equal(s.getSnapshot(),s.getSnapshot());let n=0;const unsub=s.subscribe(()=>n++);await s.save(payload());assert.ok(n>0);const savedN=n;unsub();await s.save({...payload(),title:'X'});assert.equal(n,savedN);
});
test('React page keeps every form field under user key; old private form does not survive logout',()=>{
 const page=fs.readFileSync(path.join(root,'src/features/listing-create/components/ListingCreatePage.tsx'),'utf8');
 assert.match(page,/<ListingCreateForm key=\{user.id\} userId=\{user.id\}/);assert.match(page,/if \(!user\) return <LoginState/);
 const hook=fs.readFileSync(path.join(root,feature+'useHorseOfferDraftSave.ts'),'utf8');assert.match(hook,/removeEventListener/);assert.match(hook,/subscription.unsubscribe/);
});
test('create TSX modules transpile; owner editor delegates without a create path',()=>{
 for(const name of ['ListingCreatePage','ListingCreateForm','ListingCreateTextFields','ListingCreateImageFields','HorseOfferDraftSaveAction','HorseOfferTypeSelector']){
  const file=path.join(root,'src/features/listing-create/components',name+'.tsx');
  const result=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2017}});
  assert.deepEqual(result.diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error),[]);
 }
 const edit=fs.readFileSync(path.join(root,'src/features/horse-offer-edit/components/OwnerHorseOfferEditPage.tsx'),'utf8');assert.match(edit,/<OwnerHorseOfferEditor key=/);assert.doesNotMatch(edit,/updateMyHorseOfferDraft|saveMyHorseOfferDraft/);
});
test('strict core typecheck with explicit fake browser transport declaration',()=>{
  const options={strict:true,noEmit:true,skipLibCheck:true,target:ts.ScriptTarget.ES2017,
    module:ts.ModuleKind.CommonJS,moduleResolution:ts.ModuleResolutionKind.Node10,types:[],lib:['lib.esnext.d.ts','lib.dom.d.ts']};
  const host=ts.createCompilerHost(options);const read=host.readFile;
  const browser=path.join(root,'src/shared/supabase/browserClient.ts');
  host.readFile=f=>path.resolve(f)===browser ? `
    export declare const supabaseBrowserClient: {
      rpc(name: string, args: object): Promise<{data: any; error: {code?:string;message?:string}|null}>;
      auth: {getUser(): Promise<{data:{user:{id:string}|null};error:unknown}>};
      from(name:string): {select(fields:string): {eq(key:string,value:string): {maybeSingle(): Promise<{data:{active_identity_id:unknown}|null;error:unknown}>}}};
    };
  `:read(f);
  const names=[entity+'api/saveMyHorseOfferDraft.ts',entity+'api/updateMyHorseOfferDraft.ts',entity+'api/getHorseDraftActor.ts',
    feature+'horseDraftSession.ts',feature+'horseOfferDraftSave.ts'];
  const program=ts.createProgram(names.map(f=>path.join(root,f)),options,host);
  const errors=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,ts.formatDiagnosticsWithColorAndContext(errors,{getCurrentDirectory:()=>root,getCanonicalFileName:x=>x,getNewLine:()=> '\n'}));
});

// Shared fields also render in the read-only owner view: persistence feedback
// belongs to the page/save action, not a misleading hardcoded local-only footer.
for (const [name, snippets] of [
  ['HorseOfferBasicFields', ['Konkreetse hobuse andmed kirjeldavad pakutavat hobust.', 'soovitud hobuse eelistusi.']],
  ['HorseOfferUseFields', ['pakutavat hobust või otsija eelistusi.', 'Need ei ole Selqiro kontrollitud hinnangud.']],
  ['HorseOfferLocationFields', ['Otsingupiirkond kirjeldab, kust hobust otsitakse.', 'See ei ole ühe konkreetse hobuse tegelik asukoht.', 'Avalik asukoht jääb linna või piirkonna tasemele.']],
  ['HorseOfferPriceFields', ['Hind ja otsija eelarve on eri tähendusega.', 'Valuuta on Eesti hobusepiloodis EUR.']],
]) {
  test(name + ': helper text fits creation and read-only viewing', () => {
    const file = path.join(root, 'src/features/listing-create/components', name + '.tsx');
    const source = fs.readFileSync(file, 'utf8');
    const normalized = source.replace(/\s+/g, ' ');
    for (const snippet of snippets) assert.ok(normalized.includes(snippet), snippet);
    assert.doesNotMatch(normalized, /checkpoint|ainult lokaalne|midagi ei salvestata/i);
    const compiled = ts.transpileModule(source, { fileName: file, reportDiagnostics: true,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2017 } });
    assert.deepEqual(compiled.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error), []);
  });
}
