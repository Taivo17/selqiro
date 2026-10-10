/* Actual TypeScript modules; injectable transport and timers. No live Supabase/browser.
 * SELQIRO_LISTING_EDIT_CAPTURE optionally adds exact SQL-capture parity; the installer requires it. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const E = 'src/entities/listing/', F = 'src/features/listing-edit/model/';
const U = '11111111-1111-4111-8111-111111111111', I = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const V = '22222222-2222-4222-8222-222222222222', J = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const key = { userId:U, identityId:I, listingId:'1001' };
const copy = x => JSON.parse(JSON.stringify(x));
const defer = () => { let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; };
const tick = async () => { for(let n=0;n<6;n++) await Promise.resolve(); };
function realm(extra={}) {
 const cache = new Map();
 function load(rel) {
  const file=path.resolve(root,rel), name=path.relative(root,file).split(path.sep).join('/');
  assert.ok(file.startsWith(root+path.sep));
  if(name==='src/shared/supabase/browserClient.ts') return {supabaseBrowserClient:{rpc(){throw Error('No live transport allowed');}}};
  if(name===E+'api/getListingActivityActor.ts') return {getListingActivityActor:async()=>{throw Error('No live actor allowed');}};
  if(cache.has(file)) return cache.get(file).exports;
  const source=fs.readFileSync(file,'utf8');
  const built=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
  assert.deepEqual(built.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
  const mod={exports:{}};cache.set(file,mod);
  const localRequire=spec=>{assert.ok(spec.startsWith('.'),'No external imports: '+spec);return load(path.resolve(path.dirname(file),spec)+'.ts');};
  vm.runInNewContext(built.outputText,{module:mod,exports:mod.exports,require:localRequire,AbortController,TextEncoder,
    setTimeout,clearTimeout,Promise,BigInt,Error,Map,Set,JSON,Object,Array,String,Number,...extra},{filename:file,timeout:1500});
  return mod.exports;
 }
 return { load, snapshot:load(E+'model/listingEditSnapshot.ts'),command:load(E+'model/listingEditCommand.ts'),
   draft:load(F+'listingEditDraft.ts'),client:load(E+'api/listingEditClient.ts'),Session:load(F+'listingEditSession.ts').ListingEditSession };
}
const R=realm();
function snapshot(kind=null,amount=null,currency=null,revision=kind===null?'0':'1') {
 return {schema_version:1,content_type:'listing',listing_id:'1001',identity_id:I,
  basics:{title:'Original A',description:null,condition:null},
  price:{version:1,kind,amount,currency,revision,legacy_text:kind===null?'5578':null}};
}
const read = s => ({schema_version:1,actor_id:U,snapshot:s});
function command(baseline=snapshot(), extra={}) {
 return {key:copy(key),baseline,basics:{title:'Changed title',description:'',condition:null},...extra};
}
function saved(c) {
 const args=R.command.listingEditRpcArguments(c), out=copy(c.baseline);
 out.basics=copy(args.p_basics);
 let priceChanged=false;
 if(c.priceChange!==undefined){
  const p=args.p_price_change, before=out.price;
  priceChanged=p.kind!==before.kind || (p.kind==='fixed' && (p.amount!==before.amount||p.currency!==before.currency));
  out.price={version:1,...copy(p),legacy_text:null,revision:String(BigInt(before.revision)+(priceChanged?1n:0n))};
 }
 return {schema_version:1,actor_id:U,snapshot:out,
  basics_changed:JSON.stringify(out.basics)!==JSON.stringify(c.baseline.basics),price_changed:priceChanged};
}
for(const [k,a,c] of [[null,null,null],['fixed','0','EUR'],['fixed','999999999999999999.999','KWD'],['free',null,null],['negotiable',null,null],['unspecified',null,null]])
 test('read exact stored kind '+k,()=>{const s=snapshot(k,a,c);assert.deepEqual(copy(R.snapshot.parseListingEditRead(read(s),key)),s);});
for(const raw of [null,'','5578','Hind kokkuleppel','  100 kr  ','0.01 BTC','1,000','😀'.repeat(600)])
 test('legacy label retained without currency inference '+String(raw).slice(0,24),()=>{const s=snapshot();s.price.legacy_text=raw;assert.equal(R.snapshot.parseListingEditRead(read(s),key).price.legacy_text,raw);});
test('stored historical code not invalidated by new-input eligibility',()=>{
 const s=snapshot('fixed','100','BGN');const parsed=R.snapshot.parseListingEditRead(read(s),key);
 const d=copy(R.draft.buildListingEditDraft(parsed));d.title='New title';
 assert.equal(Object.hasOwn(R.command.listingEditRpcArguments(R.draft.buildListingEditCommand(key,parsed,d)),'p_price_change'),false);
});
test('post-write actor lookup failure is unknown, not a proven rejected write',async()=>{
 let calls=0;const c=command();const api=R.client.createListingEditApi(async()=>({data:saved(c),error:null}),async()=>{
  if(calls++===0)return copy(key);throw {code:'42501',message:'profile read forbidden'};
 });
 await assert.rejects(api.save(c),e=>e.code==='unknown');assert.equal(calls,2);
});
const malformed=[
 ['schema',x=>x.schema_version=2],['actor',x=>x.actor_id=V],['identity',x=>x.snapshot.identity_id=J],['id',x=>x.snapshot.listing_id='1002'],
 ['type',x=>x.snapshot.content_type='horse_offer'],['extra',x=>x.snapshot.private='leak'],['missing',x=>delete x.snapshot.basics.title],
 ['amount number',x=>x.snapshot.price.amount=1],['revision number',x=>x.snapshot.price.revision=1],
 ['revision newline',x=>x.snapshot.price.revision='1\n'],['revision overflow',x=>x.snapshot.price.revision='9223372036854775808'],
 ['negative revision',x=>x.snapshot.price.revision='-1'],['nonfixed amount',x=>x.snapshot.price.kind='free'],
 ['unknown kind',x=>x.snapshot.price.kind='auction'],['currency sign',x=>x.snapshot.price.currency='€'],
 ['amount exponent',x=>x.snapshot.price.amount='1e3'],['amount newline',x=>x.snapshot.price.amount='2\n'],
 ['amount trailing zero',x=>x.snapshot.price.amount='2.00'],['four decimals',x=>x.snapshot.price.amount='1.2345'],
 ['max overflow',x=>x.snapshot.price.amount='1000000000000000000'],['structured legacy',x=>x.snapshot.price.legacy_text='other'],
 ['structured zero revision',x=>x.snapshot.price.revision='0'],['object description',x=>x.snapshot.basics.description={}],
];
for(const [name,mutate] of malformed) test('reject malformed snapshot: '+name,()=>{const x=read(snapshot('fixed','2','EUR'));mutate(x);assert.throws(()=>R.snapshot.parseListingEditRead(x,key));});
for(const listingId of ['0','01','-1','1001\n','9223372036854775808','1e3',''])
 test('reject write/read key '+JSON.stringify(listingId),()=>assert.throws(()=>R.snapshot.validateListingEditKey({...key,listingId})));
test('raw null baseline distinct from new empty description; null condition retained',()=>{
 const c=command(),args=R.command.listingEditRpcArguments(c);
 assert.deepEqual(copy(args.p_expected_basics),c.baseline.basics);assert.equal(args.p_basics.description,'');assert.equal(args.p_basics.condition,null);
 assert.deepEqual(Object.keys(args).sort(),['p_basics','p_expected_actor_id','p_expected_basics','p_expected_identity_id','p_listing_id']);
});
test('exact baseline whitespace not normalized',()=>{const c=command();c.baseline.basics.title=' Raw\n title ';assert.equal(R.command.listingEditRpcArguments(c).p_expected_basics.title,c.baseline.basics.title);});
test('normalized basics uses ASCII space and Unicode codepoint limits',()=>{
 const b=R.command.normalizeListingEditableBasics({title:'  Test\t title\n',description:'\n desc\t',condition:null});
 assert.deepEqual(copy(b),{title:'Test title',description:'desc',condition:null});
 assert.equal(Array.from(R.command.normalizeListingEditableBasics({title:'😀'.repeat(140),description:'',condition:null}).title).length,140);
});
for(const [name,b] of [['short',{title:'x'}],['long',{title:'x'.repeat(141)}],['desc long',{description:'x'.repeat(5001)}],
 ['NUL',{description:'a\0b'}],['surrogate',{description:'\ud800'}],['condition',{condition:'unknown'}]])
 test('reject basics '+name,()=>assert.throws(()=>R.command.normalizeListingEditableBasics({title:'Good title',description:'',condition:null,...b})));
for(const priceChange of [{kind:'fixed',amount:'999999999999999999.999',currency:'KWD'},{kind:'fixed',amount:'0',currency:'JPY'},
 {kind:'fixed',amount:'12.50',currency:'AED'},{kind:'free',amount:null,currency:null},{kind:'negotiable',amount:null,currency:null},{kind:'unspecified',amount:null,currency:null}])
 test('one command uses price/revision pair '+priceChange.kind+priceChange.currency,()=>{
 const c=command(snapshot(),{priceChange}),args=R.command.listingEditRpcArguments(c);
 assert.equal(args.p_expected_price_revision,'0');assert.equal(args.p_expected_actor_id,U);
 assert.equal(typeof args.p_price_change.amount,priceChange.kind==='fixed'?'string':'object');
 assert.ok(R.command.parseListingEditSaved(saved(c),c));
});
test('price change and exact revert omits both price and revision',()=>{
 const baseline=R.snapshot.parseListingEditRead(read(snapshot('fixed','12','EUR')),key),d=R.draft.buildListingEditDraft(baseline);
 const reverted={...d,title:'Other title',price:{...d.price,amountInput:'12'}};
 assert.equal(Object.hasOwn(R.command.listingEditRpcArguments(R.draft.buildListingEditCommand(key,baseline,reverted)),'p_expected_price_revision'),false);
});
test('normalized no-op keeps revision while price was explicitly supplied',()=>{
 const c=command(snapshot('fixed','12.5','EUR'),{priceChange:{kind:'fixed',amount:'12.50',currency:'EUR'}});
 const result=R.command.parseListingEditSaved(saved(c),c);assert.equal(result.priceChanged,false);assert.equal(result.snapshot.price.revision,'1');
});
test('omitted price accepts concurrently changed authoritative price',()=>{
 const c=command(snapshot('fixed','12','EUR')),r=saved(c);r.snapshot.price={...snapshot('fixed','7.5','USD','9').price};
 assert.equal(R.command.parseListingEditSaved(r,c).snapshot.price.revision,'9');
});
for(const [name,mutate] of [['wrong normalized title',r=>r.snapshot.basics.title='Not requested'],['wrong flag',r=>r.basics_changed=false],
 ['wrong actor',r=>r.actor_id=V],['numeric revision',r=>r.snapshot.price.revision=2],['revision skipped',r=>r.snapshot.price.revision='3'],
 ['wrong amount',r=>r.snapshot.price.amount='100'],['missing price_changed',r=>delete r.price_changed]])
 test('reject unacknowledged save '+name,()=>{const c=command(snapshot(),{priceChange:{kind:'fixed',amount:'5','EUR':'unused',currency:'EUR'}});delete c.priceChange.EUR;
 const r=saved(c);mutate(r);assert.throws(()=>R.command.parseListingEditSaved(r,c));});
for(const [code,message,want] of [['40001','listing_basics_conflict','conflict'],['40001','listing_price_conflict','conflict'],['40001','other','unknown'],
 ['42501','denied','forbidden'],['22023','bad','invalid'],['22P05','bad','invalid'],['PGRST202','missing','unavailable'],['42883','missing','unavailable'],['500','server','unknown']])
 test('error boundary '+code+message,()=>assert.equal(R.snapshot.classifyListingEditError({code,message}).code,want));
function apiFixture(r=R) {
 let actor={userId:U,identityId:I}, row=snapshot(),failure=null,after=null;
 const calls=[];
 const api=r.client.createListingEditApi(async(name,args,signal)=>{
  calls.push({name,args:copy(args),signal});if(failure) return {data:null,error:failure};
  let data;
  if(name==='get_my_listing_edit_v1') data=read(copy(row));
  else {const c={key,baseline:{...copy(row),basics:args.p_expected_basics},basics:args.p_basics,
   ...(Object.hasOwn(args,'p_price_change')?{priceChange:args.p_price_change}:{})};
   if(JSON.stringify(args.p_expected_basics)!==JSON.stringify(row.basics)) return {data:null,error:{code:'40001',message:'listing_basics_conflict'}};
   data=saved(c);row=copy(data.snapshot);
  }
  if(after) after(data);
  return {data,error:null};
 },async()=>actor);
 return {api,calls,get row(){return row;},set row(x){row=x;},set actor(x){actor=x;},set failure(x){failure=x;},set after(x){after=x;}};
}
test('API performs one read and one atomic save, never direct table fallback',async()=>{const f=apiFixture();const base=await f.api.read(key);await f.api.save(command(base));assert.deepEqual(f.calls.map(x=>x.name),['get_my_listing_edit_v1','save_my_listing_edit_v1']);});
test('wrong actor precheck sends no RPC',async()=>{const f=apiFixture();f.actor={userId:V,identityId:I};await assert.rejects(()=>f.api.read(key),e=>e.code==='context');assert.equal(f.calls.length,0);});
test('wrong identity precheck sends no RPC',async()=>{const f=apiFixture();f.actor={userId:U,identityId:J};await assert.rejects(()=>f.api.save(command()),e=>e.code==='context');assert.equal(f.calls.length,0);});
test('write response after account change is unknown, not retryable success',async()=>{const f=apiFixture();f.after=()=>{f.actor={userId:V,identityId:I};};await assert.rejects(()=>f.api.save(command()),e=>e.code==='unknown');assert.equal(f.calls.length,1);});
test('missing endpoint never tries the old update',async()=>{const f=apiFixture();f.failure={code:'PGRST202'};await assert.rejects(()=>f.api.save(command()),e=>e.code==='unavailable');assert.equal(f.calls.length,1);});
test('command mutation after dispatch cannot replace request or acknowledgement baseline',async()=>{
 const gate=defer(),calls=[];const c=command();let n=0;
 const api=R.client.createListingEditApi(async(name,args)=>{calls.push(copy(args));return {data:saved(command()),error:null};},async()=>{if(n++===0)await gate.promise;return {userId:U,identityId:I};});
 const p=api.save(c);c.basics.title='Attacker replacement';c.key.listingId='1009';c.baseline.basics.title='Changed baseline';gate.resolve();
 const result=await p;assert.equal(calls[0].p_basics.title,'Changed title');assert.equal(result.snapshot.listing_id,'1001');
});
test('abort before preflight settles prevents late RPC dispatch',async()=>{const gate=defer(),abort=new AbortController();let calls=0;
 const api=R.client.createListingEditApi(async()=>{calls++;return {data:null,error:null};},()=>gate.promise);
 const p=api.save(command(),abort.signal);abort.abort();await assert.rejects(()=>p,e=>e.code==='context');gate.resolve({userId:U,identityId:I});await tick();assert.equal(calls,0);
});
test('abort after dispatch stays unknown and does not resend',async()=>{const gate=defer(),abort=new AbortController();let calls=0;
 const api=R.client.createListingEditApi(async()=>{calls++;return gate.promise;},async()=>({userId:U,identityId:I}));
 const p=api.save(command(),abort.signal);await tick();abort.abort();await assert.rejects(()=>p,e=>e.code==='unknown');gate.resolve({data:saved(command()),error:null});await tick();assert.equal(calls,1);
});
test('whole-operation timeout includes actor lookup and prevents late send',async()=>{let fire,calls=0;const gate=defer();const r=realm({setTimeout:fn=>{fire=fn;return 1;},clearTimeout:()=>{}});
 const api=r.client.createListingEditApi(async()=>{calls++;return {data:null,error:null};},()=>gate.promise);const p=api.save(command());fire();await assert.rejects(()=>p);gate.resolve({userId:U,identityId:I});await tick();assert.equal(calls,0);
});
async function sessionFixture() { const f=apiFixture(),s=new R.Session(key,f.api);s.setContext({userId:U,identityId:I});await s.load();return {f,s}; }
const changeTitle=(s,title='New title')=>s.change({...copy(s.getSnapshot().draft),title});
test('session initially blocked until context, loads full baseline and explicit null condition',async()=>{const f=apiFixture(),s=new R.Session(key,f.api);await s.load();assert.equal(f.calls.length,0);s.setContext({userId:U,identityId:I});await s.load();assert.equal(s.getSnapshot().draft.condition,null);assert.equal(s.isDirty(),false);assert.equal(s.canSave(),false);});
test('canonical server values replace form after single save',async()=>{const {s}=await sessionFixture();changeTitle(s,'  Good\t title  ');await s.save();assert.equal(s.getSnapshot().draft.title,'Good title');assert.equal(s.isDirty(),false);assert.equal(s.getSnapshot().saved,true);});
test('routine load cannot overwrite unsaved input',async()=>{const {s,f}=await sessionFixture();changeTitle(s);await s.load();assert.equal(s.getSnapshot().draft.title,'New title');assert.equal(f.calls.length,1);});
test('two simultaneous save calls dispatch once and lock inputs',async()=>{const {s,f}=await sessionFixture();const gate=defer();let writes=0;const api={read:f.api.read,save:async c=>{writes++;await gate.promise;return f.api.save(c);}};
 const q=new R.Session(key,api);q.setContext({userId:U,identityId:I});await q.load();changeTitle(q);const a=q.save(),b=q.save();changeTitle(q,'Forbidden edit');assert.equal(q.getSnapshot().draft.title,'New title');assert.equal(q.hasUnsettledWork(),true);gate.resolve();await Promise.all([a,b]);assert.equal(writes,1);
});
test('identity A B A retains input and does not save under B',async()=>{const {s,f}=await sessionFixture();changeTitle(s);s.setContext({userId:U,identityId:J});await s.save();assert.equal(s.canSave(),false);assert.equal(f.calls.length,1);s.setContext({userId:U,identityId:I});assert.equal(s.getSnapshot().draft.title,'New title');assert.equal(s.canSave(),true);});
test('account transition drops form and late callbacks cannot restore it',async()=>{const {s}=await sessionFixture();changeTitle(s);s.setContext({userId:V,identityId:I});assert.equal(s.getSnapshot().draft,null);s.setContext({userId:U,identityId:I});await s.load();assert.equal(s.getSnapshot().closed,true);});
for(const failure of [{code:'40001',message:'listing_basics_conflict'},{code:'40001',message:'listing_price_conflict'},new Error('lost response')])
 test('unsettled save cannot auto-retry or reset around gate '+failure.message,async()=>{const {s,f}=await sessionFixture();changeTitle(s);f.failure=failure;await s.save();const n=f.calls.length;await s.save();s.resetToLoaded();assert.equal(f.calls.length,n);assert.equal(s.getSnapshot().draft.title,'New title');assert.equal(s.hasUnsettledWork(),true);});
test('review keeps draft and revision unchanged until explicit discard',async()=>{const {s,f}=await sessionFixture();changeTitle(s);f.failure=new Error('lost');await s.save();f.failure=null;f.row=snapshot('fixed','4','EUR','2');f.row.basics.title='Server title';await s.reviewSaved();assert.equal(s.getSnapshot().draft.title,'New title');assert.equal(s.getSnapshot().snapshot.price.revision,'0');assert.equal(s.canSave(),false);s.useReviewed(false);assert.equal(s.getSnapshot().draft.title,'New title');s.useReviewed(true);assert.equal(s.getSnapshot().draft.title,'Server title');assert.equal(s.getSnapshot().snapshot.price.revision,'2');assert.equal(s.isDirty(),false);});
test('editing after a review invalidates reviewed choice, not conflict gate',async()=>{const {s,f}=await sessionFixture();changeTitle(s);f.failure=new Error('lost');await s.save();f.failure=null;await s.reviewSaved();changeTitle(s,'Even newer local');s.useReviewed(true);assert.equal(s.getSnapshot().draft.title,'Even newer local');assert.equal(s.canSave(),false);});
test('failed review preserves unknown state',async()=>{const {s,f}=await sessionFixture();changeTitle(s);f.failure=new Error('lost');await s.save();await s.reviewSaved();assert.equal(s.getSnapshot().problem,'unknown');assert.equal(s.getSnapshot().draft.title,'New title');});
test('stale read cannot repopulate identity-invalidated session',async()=>{const gate=defer();const s=new R.Session(key,{read:()=>gate.promise,save:()=>{throw Error('unexpected');}});s.setContext({userId:U,identityId:I});const p=s.load();s.setContext({userId:U,identityId:J});s.setContext({userId:U,identityId:I});gate.resolve(R.snapshot.parseListingEditRead(read(snapshot()),key));await p;assert.equal(s.getSnapshot().snapshot,null);});
test('late acknowledged save after A B A stays unknown and retains input',async()=>{const gate=defer(),f=apiFixture();let c;
 const s=new R.Session(key,{read:f.api.read,save:x=>{c=x;return gate.promise;}});s.setContext({userId:U,identityId:I});await s.load();changeTitle(s);const p=s.save();s.setContext({userId:U,identityId:J});s.setContext({userId:U,identityId:I});gate.resolve(R.command.parseListingEditSaved(saved(c),c));await p;assert.equal(s.getSnapshot().problem,'unknown');assert.equal(s.getSnapshot().draft.title,'New title');assert.equal(s.getSnapshot().saved,false);assert.equal(s.canSave(),false);
});
test('dispose clears private state and listeners',async()=>{const {s}=await sessionFixture();let n=0;s.subscribe(()=>n++);s.dispose();assert.equal(s.getSnapshot().draft,null);await s.save();s.setContext({userId:U,identityId:I});assert.equal(n,0);});
test('invalid price blocks dispatch, correction remains possible',async()=>{const {s,f}=await sessionFixture();let d=copy(s.getSnapshot().draft);d.price={...d.price,kind:'fixed',amountInput:'1.01',currencyInput:'JPY'};s.change(d);await s.save();assert.equal(s.getSnapshot().problem,'invalid');assert.equal(f.calls.length,1);d.price.currencyInput='EUR';s.change(d);await s.save();assert.equal(s.getSnapshot().snapshot.price.currency,'EUR');assert.equal(s.getSnapshot().saved,true);});
test('snapshot and draft objects cannot be mutated behind dirty tracking',async()=>{const {s}=await sessionFixture();const q=s.getSnapshot();assert.ok(Object.isFrozen(q));assert.ok(Object.isFrozen(q.draft));assert.ok(Object.isFrozen(q.draft.price));assert.ok(Object.isFrozen(q.snapshot.basics));});
test('entity/model layer has no feature import; no existing route activates candidate',()=>{
 const model=fs.readFileSync(path.join(root,E+'model/listingEditSnapshot.ts'),'utf8');assert.doesNotMatch(model,/from ["'][^"']*features\//);
 const page=fs.readFileSync(path.join(root,'src/features/listing-edit/components/ListingEditPage.tsx'),'utf8');assert.doesNotMatch(page,/listingEditSession|listingEditClient/);
});
const capture=process.env.SELQIRO_LISTING_EDIT_CAPTURE;
if(process.env.SELQIRO_LISTING_EDIT_REQUIRE_SQL==='1' && !capture) throw Error('Actual same-run SQL capture required');
if(capture) test('same-run PostgreSQL capture matches exact client parsers and commands',()=>{
 const c=JSON.parse(fs.readFileSync(capture,'utf8'));
 assert.equal(c.format,'listing_edit_client_capture_v1');assert.equal(c.entries.length,10);
 assert.deepEqual(c.entries.map(e=>e.name),['read_legacy','save_fixed','read_fixed','save_omitted','save_free','save_negotiable','save_unspecified','save_zero','save_aed','read_business']);
 for(const e of c.entries){
  if(e.type==='read') { const out=R.snapshot.parseListingEditRead(e.response,e.key);assert.equal(out.listing_id,e.key.listingId); }
  else { const args=R.command.listingEditRpcArguments(e.command),out=R.command.parseListingEditSaved(e.response,e.command);
   assert.equal(args.p_expected_actor_id,e.command.key.userId);assert.equal(out.snapshot.listing_id,e.command.key.listingId); }
 }
 assert.equal(c.entries[1].response.snapshot.price.amount,'999999999999999999.999');
 assert.equal(c.entries[3].response.price_changed,false);assert.equal(c.entries[3].response.snapshot.price.currency,'USD');
});
