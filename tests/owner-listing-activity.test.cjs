/* Actual source modules; isolated fake transports, clocks, JSX and hook lifecycle.
 * No DB, network, real React DOM, browser, or HTTP authorization is exercised. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const E = 'src/entities/listing/';
const F = 'src/features/my-area/';
const U = '11111111-1111-4111-8111-111111111111';
const I = '22222222-2222-4222-8222-222222222222';
const J = '33333333-3333-4333-8333-333333333333';
const actorA = { userId: U, identityId: I };
const now = Date.parse('2026-09-29T09:00:00Z');
const oldDeadline = '2026-09-28T10:00:00.123456+03:00';
const newDeadline = '2026-12-28T09:00:00.654321+00:00';
const plain = x => JSON.parse(JSON.stringify(x));
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b;});return {promise,resolve,reject}; };
function realm(overrides = {}) {
  const cache = new Map();
  function load(rel) {
    const file = path.resolve(root, rel);
    assert.ok(file.startsWith(root + path.sep));
    const name = path.relative(root, file).split(path.sep).join('/');
    if (Object.hasOwn(overrides,name)) return overrides[name];
    if (name === 'src/shared/supabase/browserClient.ts') throw Error('Transport requires an explicit fake');
    if (cache.has(file)) return cache.get(file).exports;
    const source = fs.readFileSync(file,'utf8');
    const out = ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
    assert.deepEqual(out.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
    const module={exports:{}};cache.set(file,module);
    const requireLocal = name => {
      if (name==='react/jsx-runtime') return {jsx:(type,props,key)=>({type,props:props||{},key}),jsxs:(type,props,key)=>({type,props:props||{},key})};
      if (name==='next/link') return {__esModule:true,default:props=>({type:'a',props})};
      if (name==='react') return overrides.react || {useState:x=>[typeof x==='function'?x():x,()=>{}],useRef:x=>({current:x}),useEffect:()=>{},useMemo:f=>f()};
      assert.ok(name.startsWith('.'),'Forbidden external dependency '+name);
      const target=path.resolve(path.dirname(file),name);
      return load(fs.existsSync(target+'.ts')?target+'.ts':target+'.tsx');
    };
    vm.runInNewContext(out.outputText,{module,exports:module.exports,require:requireLocal,
      Date,Intl,Number,String,Object,Array,Set,Map,BigInt,JSON,Promise,Error,AbortController,
      setTimeout:overrides.setTimeout||setTimeout,clearTimeout:overrides.clearTimeout||clearTimeout,
      window:overrides.window,document:overrides.document,HTMLElement:overrides.HTMLElement}, {filename:file,timeout:1500});
    return module.exports;
  }
  return load;
}
const load=realm();
const M=load(E+'model/listingActivity.ts');
const R=load(E+'model/listingRenewal.ts');
const Session=load(F+'model/ownerListingActivitySession.ts').OwnerListingActivitySession;
const mapper=load('src/entities/marketplace-item/api/mappers.ts').mapOwnerMarketplaceItemRow;
const card=load(F+'model/mapMyAreaMarketplaceItemRow.ts').mapMyAreaMarketplaceItemRow;
function row(overrides={}) {
  return card(mapper({content_type:'listing',content_id:'9007199254740993',identity_id:I,owner_user_id:U,
    source_status:'active',lifecycle_status:'active',title:'Katse kuulutus',description:'Sisu',price_text:'hind',price_amount:null,
    category:'tools',active_until:oldDeadline,created_at:'2025-09-29T09:00:00Z',sort_at:'2025-09-29T09:00:00Z',search_text:'katse',...overrides}));
}
function harness(overrides={}) {
  let rows=[row()],actor=actorA;
  const calls={read:[],renew:[],status:[],actor:0};
  const deps={actor:async()=>{calls.actor++;return actor;},read:async f=>{calls.read.push(plain(f));return rows;},
    renew:async input=>{calls.renew.push(plain(input));rows=rows.map(r=>({...r,activeUntil:newDeadline}));return {listingId:input.listingId,status:'active',activeUntil:newDeadline,changed:true};},
    status:async input=>{calls.status.push(plain(input));rows=rows.map(r=>({...r,status:input.status}));},now:()=>now,...overrides};
  const session=new Session(deps);session.activate();
  return {session,calls,setRows:v=>{rows=v;},setActor:v=>{actor=v;},deps};
}
for(const [a,b] of [
 ['2026-09-29T09:00:00.123456Z','2026-09-29T12:00:00.123456+03:00'],
 ['2026-09-29 09:00:00.1+00','2026-09-29T04:00:00.100000-05:00'],
 ['0001-01-01T00:00:00Z','0001-01-01T00:00:00.000000+00:00'],
])test('exact timestamp offsets agree: '+a,()=>{assert.equal(M.listingDeadlineMicros(a),M.listingDeadlineMicros(b));assert.notEqual(M.listingDeadlineMicros(a),null);});
for(const bad of [null,undefined,1,'','Infinity','infinity','-infinity','2026-02-29T09:00:00Z','2026-13-01T00:00:00Z','2026-09-31T00:00:00Z',
 '2026-09-29','2026-09-29T09:00:00','2026-09-29T24:00:00Z','2026-09-29T09:00:60Z','2026-09-29T09:00:00.1234567Z','2026-09-29T09:00:00+16:00','2026-09-29T09:00:00+01:60',' 2026-09-29T09:00:00Z','0000-01-01T00:00:00Z'])
 test('malformed/nonfinite deadline fails closed '+String(bad),()=>assert.equal(M.listingDeadlineMicros(bad),null));
test('microsecond after boundary stays active, exact equality is expired',()=>{
 assert.equal(M.getListingActivity('active','2026-09-29T09:00:00.000001Z',now).state,'active');
 assert.equal(M.getListingActivity('active','2026-09-29T09:00:00Z',now).state,'expired');
});
for(const status of ['paused','sold','draft','unknown'])test('status precedes deadline: '+status,()=>{
 const a=M.getListingActivity(status,oldDeadline,now);assert.equal(a.canRenew,false);assert.notEqual(a.state,'expired');
});
test('NULL deadline is not inferred expired or silently renewed',()=>{const a=M.getListingActivity('active',null,now);assert.equal(a.label,'Aktiivne');assert.equal(a.canRenew,false);assert.match(a.deadlineLabel,/määramata/);});
test('invalid deadline is never green active',()=>{assert.equal(M.getListingActivity('active','bad',now).state,'unknown');});
test('90-day and longer periods do not offer shortening',()=>{
 for(const days of [90,91,365]) assert.equal(M.getListingActivity('active',new Date(now+days*86400000).toISOString(),now).canRenew,false);
 assert.equal(M.getListingActivity('active',new Date(now+89*86400000).toISOString(),now).canRenew,true);
});
for(const bad of ['0','01','-1','1.2','1e3','9223372036854775808',9007199254740992,' 1'])test('invalid renewal bigint ID '+String(bad),()=>assert.equal(M.isRenewableListingId(bad),false));
test('large bigint identifier stays exact text',()=>assert.equal(M.isRenewableListingId('9223372036854775807'),true));
const input={listingId:'9007199254740993',expectedActiveUntil:oldDeadline};
const response=()=>[{listing_id:input.listingId,status:'active',active_until:newDeadline,changed:true}];
test('response validates one changed row and preserves original fractional seconds',()=>{
 assert.equal(R.parseListingRenewalResult(response(),input).activeUntil,newDeadline);assert.equal(input.expectedActiveUntil,oldDeadline);
});
test('no-op handles equivalent differently formatted timestamps and NULL',()=>{
 const n=[{listing_id:input.listingId,status:'active',active_until:'2026-09-28T07:00:00.123456Z',changed:false}];
 assert.equal(R.parseListingRenewalResult(n,input).changed,false);
 n[0].active_until=null;assert.equal(R.parseListingRenewalResult(n,{...input,expectedActiveUntil:null}).activeUntil,null);
});
for(const [name,mutate] of [
 ['wrong ID',r=>r[0].listing_id='1'],['numeric ID',r=>r[0].listing_id=9007199254740992],['wrong status',r=>r[0].status='paused'],
 ['string changed',r=>r[0].changed='true'],['false changed deadline',r=>r[0].changed=false],['old deadline',r=>r[0].active_until=oldDeadline],
 ['shortened deadline',r=>r[0].active_until='2020-01-01T00:00:00Z'],['null changed',r=>r[0].active_until=null],['bad deadline',r=>r[0].active_until='bad'],
 ['extra payload',r=>r[0].details={}],['empty',r=>r.pop()],['multiple rows',r=>r.push({...r[0]})],['missing key',r=>delete r[0].changed],
])test('invalid acknowledgement remains uncertain: '+name,()=>{const r=response();mutate(r);assert.throws(()=>R.parseListingRenewalResult(r,input),e=>e.kind==='uncertain');});
for(const value of [undefined,0,{},''])test('owner mapper refuses to turn missing/wrong deadline into NULL: '+String(value),()=>assert.throws(()=>row({active_until:value})));
test('owner mapper keeps exact deadline bytes; horse NULL remains valid',()=>{
 assert.equal(row().activeUntil,oldDeadline);assert.equal(row({content_type:'horse_offer',active_until:null}).activeUntil,null);
});
for(const [code,message,kind] of [['40001','listing_activity_conflict','conflict'],['55000','listing_activity_active_status_required','status'],
 ['42501','listing_activity_identity_required','forbidden'],['22023','listing_activity_deadline_invalid','invalid'],
 ['','Failed to fetch','uncertain'],['40001','unrecognized diagnostic','uncertain']])test('safe error mapping '+message,()=>{
 const err=R.listingRenewalError({code,message,details:'PRIVATE DATA'});assert.equal(err.kind,kind);assert.doesNotMatch(err.message,/PRIVATE DATA/);
});
test('RPC sends only exact ID and ORIGINAL deadline once, with abort signal',async()=>{
 const calls=[];const l=realm({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{rpc:(name,args)=>{calls.push({name,args});return {abortSignal:async signal=>{assert.ok(signal instanceof AbortSignal);return {data:response(),error:null};}};}}}});
 const result=await l(E+'api/renewMyListingActivity.ts').renewMyListingActivity(input);
 assert.equal(result.listingId,input.listingId);assert.deepEqual(plain(calls),[{name:'renew_my_listing_activity_v1',args:{p_listing_id:input.listingId,p_expected_active_until:oldDeadline}}]);
});
test('malformed input never dispatches RPC',async()=>{
 const l=realm({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{rpc:()=>assert.fail('write')}}});
 await assert.rejects(l(E+'api/renewMyListingActivity.ts').renewMyListingActivity({...input,listingId:'01'}),e=>e.kind==='invalid');
});
test('client timeout abort is uncertain, never retries',async()=>{
 let abort,n=0;const l=realm({setTimeout:f=>{abort=f;return 1;},clearTimeout:()=>{},'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{rpc:()=>{
   n++;return {abortSignal:signal=>new Promise(resolve=>{signal.addEventListener('abort',()=>resolve({data:null,error:{message:'Aborted'}}));abort();})};}}}});
 await assert.rejects(l(E+'api/renewMyListingActivity.ts').renewMyListingActivity(input),e=>e.kind==='uncertain');assert.equal(n,1);
});
test('actor read uses authenticated user and one exact profile field, no fallback', async () => {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: U } }, error: null }) },
    from(name) {
      calls.push(name);
      return { select(fields) {
        calls.push(fields);
        return { eq(key, id) {
          calls.push(key, id);
          return { maybeSingle: async () => ({ data: { active_identity_id: I }, error: null }) };
        } };
      } };
    },
  };
  const l = realm({ 'src/shared/supabase/browserClient.ts': { supabaseBrowserClient: client } });
  assert.deepEqual(plain(await l(E+'api/getListingActivityActor.ts').getListingActivityActor()), actorA);
  assert.deepEqual(calls, ['profiles', 'active_identity_id', 'id', U]);
});
test('explicit open/cancel does not perform a write',async()=>{const h=harness();await h.session.load({});h.session.requestRenewal(row().key);assert.ok(h.session.getSnapshot().confirmation);h.session.cancelRenewal();assert.equal(h.calls.renew.length,0);});
test('single confirmation has synchronous double-submit protection and canonical refresh',async()=>{
 const q=deferred(),h=harness({renew:async x=>{h.calls.renew.push(plain(x));await q.promise;h.setRows([{...row(),activeUntil:newDeadline}]);return {listingId:x.listingId,status:'active',activeUntil:newDeadline,changed:true};}});
 await h.session.load({searchQuery:'same'});const before=plain(h.session.getSnapshot().listings[0]);h.session.requestRenewal(row().key);
 const a=h.session.confirmRenewal(),b=h.session.confirmRenewal();await tick();assert.equal(h.calls.renew.length,1);q.resolve();await Promise.all([a,b]);
 const after=plain(h.session.getSnapshot().listings[0]);assert.equal(after.activeUntil,newDeadline);
 delete before.activeUntil;delete after.activeUntil;assert.deepEqual(after,before);
 assert.equal(h.session.getSnapshot().confirmation,null);assert.match(h.session.getSnapshot().notice,/uuendatud/);assert.equal(h.calls.read.length,2);
});
test('no hidden write on loading, focus-like invalidation or reload',async()=>{
 const h=harness();await h.session.load({});h.session.invalidate();await h.session.reload();assert.equal(h.calls.renew.length,0);assert.equal(h.calls.status.length,0);
});
for(const [name,over] of [['paused',{source_status:'paused'}],['sold',{source_status:'sold'}],['NULL',{active_until:null}],
 ['invalid',{active_until:'bad'}],['long',{active_until:'2030-01-01T00:00:00Z'}],['legacy',{identity_id:null}],['horse',{content_type:'horse_offer'}]])
 test('no renewal action for '+name,async()=>{const h=harness();h.setRows([row(over)]);await h.session.load({});h.session.requestRenewal(row().key);await h.session.confirmRenewal();assert.equal(h.calls.renew.length,0);assert.equal(h.session.getSnapshot().confirmation,null);});
test('changed actor before dispatch blocks write and hides old rows',async()=>{
 const h=harness();await h.session.load({});h.session.requestRenewal(row().key);h.setActor({...actorA,identityId:J});await h.session.confirmRenewal();assert.equal(h.calls.renew.length,0);assert.equal(h.session.getSnapshot().actor,null);assert.equal(h.session.getSnapshot().listings.length,0);
});
test('A-B-A invalidation during precheck cannot revive an old confirmation',async()=>{
 const q=deferred(),h=harness();await h.session.load({});h.session.requestRenewal(row().key);h.deps.actor=()=>q.promise;
 const pending=h.session.confirmRenewal();h.session.invalidate();h.session.invalidate();q.resolve(actorA);await pending;
 assert.equal(h.calls.renew.length,0);assert.equal(h.session.getSnapshot().confirmation,null);
});
test('identity change after dispatch never displays stale success or row',async()=>{
 const q=deferred(),h=harness({renew:async()=>{await q.promise;return {listingId:input.listingId,status:'active',activeUntil:newDeadline,changed:true};}});
 await h.session.load({});h.session.requestRenewal(row().key);const p=h.session.confirmRenewal();await tick();h.session.invalidate();q.resolve();await p;
 assert.equal(h.session.getSnapshot().listings.length,0);assert.equal(h.session.getSnapshot().notice,null);
});
test('logout invalidates synchronously; same-user token event does not erase context',async()=>{
 const h=harness();await h.session.load({});assert.equal(h.session.authChanged(U),false);h.session.requestRenewal(row().key);
 assert.equal(h.session.authChanged(null),true);assert.equal(h.session.getSnapshot().listings.length,0);assert.equal(h.session.getSnapshot().confirmation,null);
});
test('deactivate/reactivate rejects pre-StrictMode-cleanup read',async()=>{
 const a=deferred(),b=deferred();let n=0;const h=harness({read:()=>++n===1?a.promise:b.promise});
 const old=h.session.load({searchQuery:'old'});await tick();h.session.deactivate();h.session.activate();const fresh=h.session.load({searchQuery:'new'});await tick();
 b.resolve([row({title:'NEW'})]);await fresh;a.resolve([row({title:'OLD'})]);await old;assert.equal(h.session.getSnapshot().listings[0].title,'NEW');
});
test('filter change ignores stale read even when the old request rejects',async()=>{
 const a=deferred(),b=deferred();let n=0;const h=harness({read:()=>++n===1?a.promise:b.promise});
 const old=h.session.load({searchQuery:'old'});await tick();const fresh=h.session.load({searchQuery:'new'});await tick();b.resolve([row({title:'NEW'})]);await fresh;
 a.reject(Error('OLD'));await old;assert.equal(h.session.getSnapshot().error,null);assert.equal(h.session.getSnapshot().listings[0].title,'NEW');
});
test('mixed rows from wrong identity fail closed rather than showing other owner data',async()=>{
 const h=harness();h.setRows([row({identity_id:J})]);await h.session.load({});assert.equal(h.session.getSnapshot().listings.length,0);assert.ok(h.session.getSnapshot().error);
});
for(const kind of ['conflict','uncertain','forbidden','status','invalid'])test('failure '+kind+' blocks replay until fresh read and fresh confirmation',async()=>{
 let n=0;const h=harness({renew:async()=>{n++;throw new R.ListingRenewalError(kind);}});await h.session.load({});h.session.requestRenewal(row().key);await h.session.confirmRenewal();
 assert.equal(h.session.getSnapshot().needsReload,true);assert.ok(h.session.getSnapshot().problem);h.session.requestRenewal(row().key);await h.session.confirmRenewal();assert.equal(n,1);
 await h.session.reload();assert.equal(h.session.getSnapshot().confirmation,null);assert.equal(n,1);
});
test('server acknowledgement and failed refresh are not reported as a failed mutation',async()=>{
 const h=harness();await h.session.load({});h.session.requestRenewal(row().key);h.deps.read=async()=>{throw Error('refresh failed');};await h.session.confirmRenewal();
 assert.match(h.session.getSnapshot().problem,/Server kinnitas/);assert.equal(h.session.getSnapshot().needsReload,true);assert.equal(h.calls.renew.length,1);
});
test('status and renewal cannot run concurrently or silently reactivate',async()=>{
 const q=deferred();const h=harness({renew:async x=>{h.calls.renew.push(x);await q.promise;return {listingId:x.listingId,status:'active',activeUntil:newDeadline,changed:true};}});
 await h.session.load({});h.session.requestRenewal(row().key);await h.session.changeStatus(row().key,'paused');assert.equal(h.calls.status.length,0);
 const p=h.session.confirmRenewal();await tick();await h.session.changeStatus(row().key,'sold');assert.equal(h.calls.status.length,0);q.resolve();await p;
});
test('status remains separate and uses fresh read without client expiry write',async()=>{
 const h=harness();await h.session.load({statusFilter:'all'});await h.session.changeStatus(row().key,'paused');
 assert.deepEqual(h.calls.status,[{listingId:input.listingId,status:'paused'}]);assert.equal(h.calls.renew.length,0);
 assert.equal(h.session.getSnapshot().listings[0].activeUntil,oldDeadline);assert.equal(h.session.getSnapshot().listings[0].status,'paused');
});
test('all/active filters keep expired rows: no false complete page filtering',async()=>{
 const h=harness();await h.session.load({limit:500,offset:0,statusFilter:'active',searchQuery:'x',storeCategoryFilter:I});
 assert.equal(h.session.getSnapshot().listings.length,1);assert.equal(h.calls.read[0].statusFilter,'active');assert.equal(h.calls.read[0].limit,500);
});
function render(x) {
 if(x===null||x===undefined||typeof x==='boolean')return [];
 if(Array.isArray(x))return x.flatMap(render);if(typeof x!=='object')return [String(x)];
 if(typeof x.type==='function')return render(x.type(x.props));return [{type:x.type,props:x.props,children:render(x.props.children)}];
}
function all(nodes){return nodes.flatMap(n=>typeof n==='string'?[]:[n,...all(n.children)]);}
function text(nodes){return nodes.map(n=>typeof n==='string'?n:text(n.children)).join(' ');}
function renderRow(over={},props={}) {return render(load(F+'components/MyAreaListingRow.tsx').default({listing:row(over),now,busy:false,disabled:false,activeIdentityId:I,onRenew:()=>{},onStatus:()=>{},...props}));}
test('expired row is labelled Aegunud, not green active, with explicit button',()=>{
 const nodes=renderRow();assert.match(text(nodes),/Aegunud/);assert.match(text(nodes),/Uuenda kuulutust/);
 const select=all(nodes).find(n=>n.type==='select');assert.equal(select.props.value,'active');assert.doesNotMatch(select.props.className,/emerald/);
 assert.equal(all(nodes).find(n=>n.type==='a').props.href,row().href);
});
for(const status of ['paused','sold'])test('UI hides renewal for '+status,()=>assert.doesNotMatch(text(renderRow({source_status:status})),/Uuenda kuulutust/));
test('UI blocks action controls while operation pending',()=>{
 const nodes=all(renderRow({}, {disabled:true,busy:true}));assert.ok(nodes.filter(n=>n.type==='button'||n.type==='select').every(n=>n.props.disabled));
});
test('confirmation names ONE listing, cost and duration; cancel is separate',()=>{
 const nodes=render(load(F+'components/ListingRenewalConfirmation.tsx').default({confirmation:{key:row().key,title:'AINULT SEE',input},busy:false,onConfirm:()=>{},onCancel:()=>{}}));
 assert.match(text(nodes),/AINULT SEE/);assert.match(text(nodes),/90 päeva/);assert.match(text(nodes),/tasuta/);assert.match(text(nodes),/Tühista/);
 assert.equal(all(nodes).filter(n=>n.type==='dialog').length,1);assert.equal(all(nodes).filter(n=>n.type==='button').length,2);
});
test('hook subscribes, invalidates auth synchronously and defers network out of callback; cleanup pairs',()=>{
 const effects=[],timers=[],events=new Map();let authCallback,unsubscribed=0,deactivated=0,reads=0;
 const fake={getSnapshot:()=>({listings:[],loading:true,filterKey:'',confirmation:null}),subscribe:()=>()=>{},activate:()=>{},deactivate:()=>deactivated++,
   load:async()=>{},reload:async()=>{reads++;},invalidate:()=>{},authChanged:()=>true};
 const l=realm({react:{useState:()=>[fake,()=>{}],useSyncExternalStore:(_s,g)=>g(),useEffect:f=>effects.push(f)},
   setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout:()=>{},
   window:{addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)},
   'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{auth:{onAuthStateChange:cb=>{authCallback=cb;return {data:{subscription:{unsubscribe:()=>unsubscribed++}}};}}}},
   [E+'api/getListingActivityActor.ts']:{getListingActivityActor:()=>assert.fail('direct network')},
   [E+'api/renewMyListingActivity.ts']:{renewMyListingActivity:()=>assert.fail('direct write')},
   [E+'api/updateListingStatus.ts']:{updateListingStatus:()=>assert.fail('direct write')},
   [F+'model/getMyAreaMarketplaceItemRows.ts']:{getMyAreaMarketplaceItemRows:()=>assert.fail('direct read')},
   'src/features/v2-shell/model/useV2IdentitySwitcher.ts':{ACTIVE_IDENTITY_CHANGED_EVENT:'selqiro:active-identity-changed'}});
 l(F+'model/useMyAreaListings.ts').useMyAreaListings({});const cleanup=effects[0]();
 authCallback('SIGNED_OUT',null);assert.equal(reads,0);timers.at(-1)();assert.equal(reads,1);
 cleanup();assert.equal(unsubscribed,1);assert.equal(deactivated,1);assert.equal(events.size,0);
});
test('pure models and session pass strict TypeScript with only existing API transport stubbed',()=>{
 const opts={strict:true,noEmit:true,skipLibCheck:true,target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,moduleResolution:ts.ModuleResolutionKind.Node10,types:[],lib:['lib.esnext.d.ts','lib.dom.d.ts']};
 const host=ts.createCompilerHost(opts),read=host.readFile;
 host.readFile=f=>path.resolve(f)===path.join(root,'src/shared/supabase/browserClient.ts')?'export declare const supabaseBrowserClient: any;':read(f);
 const files=[E+'model/listingActivity.ts',E+'model/listingRenewal.ts',E+'api/getListingActivityActor.ts',E+'api/renewMyListingActivity.ts',F+'model/ownerListingActivitySession.ts'];
 const errors=ts.getPreEmitDiagnostics(ts.createProgram(files.map(f=>path.join(root,f)),opts,host)).filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.equal(errors.length,0,ts.formatDiagnosticsWithColorAndContext(errors,{getCurrentDirectory:()=>root,getCanonicalFileName:x=>x,getNewLine:()=> '\n'}));
});
test('captured obsolete confirmation cannot submit a different later dialog',async()=>{
 const h=harness();await h.session.load({});h.session.requestRenewal(row().key);const old=h.session.getSnapshot().confirmation;
 h.session.cancelRenewal();h.session.requestRenewal(row().key);await h.session.confirmRenewal(old);assert.equal(h.calls.renew.length,0);
});
test('cached snapshots and subscriber cleanup are stable',async()=>{
 const h=harness();const s=h.session.getSnapshot();assert.equal(s,h.session.getSnapshot());let n=0;
 const off=h.session.subscribe(()=>n++);await h.session.load({});assert.ok(n>0);const previous=n;off();h.session.cancelRenewal();assert.equal(n,previous);
});
test('no-op acknowledgement is not reported as a new 90-day extension',async()=>{
 const h=harness({renew:async x=>({listingId:x.listingId,status:'active',activeUntil:x.expectedActiveUntil,changed:false})});
 await h.session.load({});h.session.requestRenewal(row().key);await h.session.confirmRenewal();assert.match(h.session.getSnapshot().notice,/säilis/);
});
test('new-filter read queued behind writer waits for settlement and rejects old success',async()=>{
 const q=deferred(),h=harness({renew:async()=>{await q.promise;return {listingId:input.listingId,status:'active',activeUntil:newDeadline,changed:true};}});
 await h.session.load({searchQuery:'old'});h.session.requestRenewal(row().key);const write=h.session.confirmRenewal();await tick();
 await h.session.load({searchQuery:'new'});assert.equal(h.calls.read.length,1);assert.equal(h.session.getSnapshot().listings.length,0);
 q.resolve();await write;assert.equal(h.calls.read.at(-1).searchQuery,'new');assert.equal(h.session.getSnapshot().notice,null);assert.equal(h.session.getSnapshot().busyKey,null);
});
test('actual section renders mixed wanted/ordinary rows and no invented total at cap',()=>{
 const rows=[row(),row({content_type:'horse_offer',content_id:J,source_status:'draft',active_until:null,content_variant:'wanted'})];
 const base={listings:rows,loading:false,error:null,actor:actorA,confirmation:null,busyKey:null,problem:null,notice:null,needsReload:false,
   session:{requestRenewal:()=>{},changeStatus:()=>{},reload:()=>{}}};
 const options={
  [F+'model/useMyAreaListings.ts']:{useMyAreaListings:()=>base},
  [F+'model/useMyAreaStoreCategories.ts']:{useMyAreaStoreCategories:()=>({categories:[],loading:false,error:null})},
  [F+'model/useListingActivityClock.ts']:{useListingActivityClock:()=>now},
 };
 let nodes=render(realm(options)(F+'components/MyAreaListingsSection.tsx').default());
 assert.match(text(nodes),/Hind \/ eelarve/);assert.match(text(nodes),/Aktiivsed ja aegunud/);assert.match(text(nodes),/Aegunud/);
 base.listings=Array.from({length:500},(_,i)=>row({content_id:String(i+1)}));
 nodes=render(realm(options)(F+'components/MyAreaListingsSection.tsx').default());
 assert.match(text(nodes),/esimesed 500/);assert.doesNotMatch(text(nodes),/500 tulemust|Vaata kõiki \(500\)/);
});
