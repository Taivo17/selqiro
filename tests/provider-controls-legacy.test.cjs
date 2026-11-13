'use strict';
// Real legacy paging, account/revision guards and installed PostgREST builders;
// only auth events and remote responses are synthetic. No live service access.
const {test, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const {createHash} = require('node:crypto'), {createClient} = require('@supabase/supabase-js');
const root = path.resolve(__dirname, '..'), inputs = new Map();
const hash = value => createHash('sha256').update(value).digest('hex');
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
const I='33333333-3333-4333-8333-333333333333', F='44444444-4444-4444-8444-444444444444';
const token = id => 'synthetic.'+id, tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {let resolve, reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function loader(client) {
  const cache=new Map();
  function load(name) {
    const file=path.resolve(root,name), relative=path.relative(root,file).split(path.sep).join('/');
    if(cache.has(file)) return cache.get(file).exports;
    const source=fs.readFileSync(file);inputs.set(relative,hash(source));const module={exports:{}};cache.set(file,module);
    const output=ts.transpileModule(source.toString(),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS}});
    const localRequire=spec=>{
      if(spec.endsWith('/shared/supabase/browserClient') || spec==='../supabase/browserClient') return {supabaseBrowserClient:client};
      if(!spec.startsWith('.')) return require(spec);
      const stem=path.resolve(path.dirname(file),spec);return load(fs.existsSync(stem)?stem:fs.existsSync(stem+'.ts')?stem+'.ts':stem+'.tsx');
    };
    vm.runInThisContext('(function(module,exports,require){'+output.outputText+'\n})',{filename:file})(module,module.exports,localRequire);
    return module.exports;
  }
  return load;
}
const feature='src/features/legacy-discovery/model/', api='src/entities/listing/api/';
async function fixture(initial=A) {
  let callback, current=initial;
  const session=()=>current?{user:{id:current},access_token:token(current)}:null;
  const load=loader({auth:{getSession:async()=>({data:{session:session()},error:null}),
    onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}};}}});
  const store=load('src/shared/provider-controls/viewerAccountStore.ts').viewerAccountStore;
  const stop=store.subscribe(()=>{});await tick();
  const events=load('src/shared/provider-controls/providerControlEvents.ts');
  const check=load(feature+'useLegacyDiscoveryScope.ts').isLegacyDiscoveryScopeCurrent;
  const pager=load(feature+'legacyDiscoveryPager.ts').createLegacyDiscoveryPager();
  let identity=0;
  const scope=(key,read)=>{
    const account={...store.getSnapshot(),revision:events.providerControlRevision('discovery')}, captured=identity;
    return {key,ready:account.ready,signal:account.actor?.signal,
      isCurrent:()=>check(account,captured,identity),load:read};
  };
  return {pager,scope,events,store,identity:()=>{identity++;},switch:id=>{current=id;callback(id?'SIGNED_IN':'SIGNED_OUT',session());},
    refreshToken:()=>callback('TOKEN_REFRESHED',session()),stop:()=>{pager.retire();stop();}};
}
const page=(items,offset=0,more=false,metadata={profile:{id:A}})=>({items,metadata,hasMore:more,nextOffset:offset+items.length});
test('account change retires a late first page and its profile before another account can render',async()=>{
  const f=await fixture(), old=deferred(), next=deferred();let oldSignal;
  const before=f.scope('A',(offset,signal)=>{oldSignal=signal;return old.promise;});f.pager.reset(before);
  f.switch(B);assert.equal(before.isCurrent(),false);assert.equal(oldSignal.aborted,true);
  f.pager.reset(f.scope('B',()=>next.promise));assert.deepEqual(f.pager.getSnapshot().items,[]);
  next.resolve(page(['B row'],0,false,{profile:{id:B}}));await tick();old.resolve(page(['A private row']));await tick();
  assert.deepEqual(f.pager.getSnapshot().items,['B row']);assert.equal(f.pager.getSnapshot().metadata.profile.id,B);f.stop();
});
test('same-account hide/block revision rejects late data before React effect cleanup',async()=>{
  const f=await fixture(), pending=deferred(), before=f.scope('revision0',()=>pending.promise);f.pager.reset(before);
  f.events.notifyProviderControlsChanged('hidden');assert.equal(before.isCurrent(),false);
  pending.resolve(page(['now hidden']));await tick();assert.deepEqual(f.pager.getSnapshot().items,[]);
  f.pager.reset(f.scope('revision1',async()=>page(['visible'])));await tick();
  assert.deepEqual(f.pager.getSnapshot().items,['visible']);
  const active=f.scope('revision1',async()=>page([]));f.events.notifyProviderControlsChanged('blocked');assert.equal(active.isCurrent(),false);f.stop();
});
test('query reset retires a slow next page, even when its promise ignores abort',async()=>{
  const f=await fixture(), pending=deferred();let signal;
  f.pager.reset(f.scope('old query',async(offset,nextSignal)=>offset===0?page(Array.from({length:30},(_,i)=>i),0,true):(signal=nextSignal,pending.promise)));
  await tick();const loading=f.pager.loadMore();await tick();
  f.pager.reset(f.scope('new query',async()=>page(['new'])));await tick();assert.equal(signal.aborted,true);
  pending.resolve(page(['old next'],30));await loading;await tick();assert.deepEqual(f.pager.getSnapshot().items,['new']);f.stop();
});
test('serial paging keeps server offsets, rejects duplicate loadMore, and refresh starts at zero',async()=>{
  const f=await fixture(), pending=deferred(), offsets=[];
  f.pager.reset(f.scope('page',async(offset)=>{offsets.push(offset);return offset===0?page(Array.from({length:30},(_,i)=>i),0,true):pending.promise;}));
  await tick();const one=f.pager.loadMore();const two=f.pager.loadMore();assert.deepEqual(offsets,[0,30]);
  pending.resolve(page(['last'],30));await Promise.all([one,two]);assert.equal(f.pager.getSnapshot().nextOffset,31);
  assert.equal(f.pager.getSnapshot().hasMore,false);await f.pager.loadMore();assert.deepEqual(offsets,[0,30]);
  await f.pager.refresh();assert.deepEqual(offsets,[0,30,0]);assert.equal(f.pager.getSnapshot().items.length,30);f.stop();
});
test('failed next page retains only accepted rows and cannot loop the observer',async()=>{
  const f=await fixture();f.pager.reset(f.scope('error',async offset=>{if(offset)throw Error('synthetic failure');return page([1],0,true);}));
  await tick();await f.pager.loadMore();assert.deepEqual(f.pager.getSnapshot().items,[1]);
  assert.equal(f.pager.getSnapshot().error,true);assert.equal(f.pager.getSnapshot().hasMore,false);assert.equal(f.pager.getSnapshot().loadingMore,false);f.stop();
});
test('token refresh preserves the account scope; sign-out and anonymous-to-account do not',async()=>{
  const f=await fixture(), own=f.scope('A',async()=>page([]));f.refreshToken();assert.equal(own.isCurrent(),true);
  f.switch(null);assert.equal(own.isCurrent(),false);const anonymous=f.scope('anon',async()=>page([]));assert.equal(anonymous.isCurrent(),true);
  f.switch(B);assert.equal(anonymous.isCurrent(),false);f.stop();
});
test('identity changes invalidate feed follows without changing account-owned preference revision',async()=>{
  const f=await fixture(), original=f.scope('identity1',async()=>page([]));const revision=f.events.providerControlRevision('discovery');
  f.identity();assert.equal(original.isCurrent(),false);assert.equal(f.events.providerControlRevision('discovery'),revision);
  assert.equal(f.scope('identity2',async()=>page([])).isCurrent(),true);f.stop();
});
function transport(respond) {
  const requests=[];
  const client=createClient('https://abcdefghijklmnopqrst.supabase.co','synthetic-public-key',{accessToken:async()=>token(B),
    global:{fetch:async(url,init)=>{
      const request={url:new URL(String(url)),headers:new Headers(init.headers),body:init.body?JSON.parse(init.body):null,signal:init.signal};requests.push(request);
      return new Response(JSON.stringify(await respond(request)),{status:200,headers:{'content-type':'application/json'}});
    }}});
  const load=loader(client), abort=new AbortController();let current=true;
  return {load,requests,context:{actor:{userId:A,accessToken:token(A),generation:1,signal:abort.signal},signal:abort.signal,isCurrent:()=>current},
    retire:()=>{current=false;abort.abort();}};
}
test('feed reads the discovery view before paging and retains follows, embeds and identity enrichment',async()=>{
  const t=transport(request=>{
    if(request.url.pathname.endsWith('/profiles')) return [{id:A,language:'et',active_identity_id:I}];
    if(request.url.pathname.endsWith('/store_follows')) {assert.equal(request.url.searchParams.get('follower_identity_id'),'eq.'+I);return [{store_identity_id:F}];}
    if(request.url.pathname.endsWith('/discovery_listings_v1')) return Array.from({length:30},(_,id)=>({id,user_id:B,identity_id:F,title:'row',description:'',price:'2'}));
    if(request.url.pathname.endsWith('/rpc/get_feed_identity_profiles')) return [{identity_id:F,display_name:'Followed',slug:'followed',avatar_url:null}];
    assert.fail(request.url.pathname);
  });
  const read=t.load(api+'legacyDiscoveryFeed.ts').loadLegacyFeedPage;
  const first=await read(t.context,0,null);assert.equal(first.hasMore,true);assert.equal(first.nextOffset,30);assert.equal(first.items[0].seller_profile.store_name,'Followed');
  const second=await read(t.context,30,first.metadata);assert.equal(second.nextOffset,60);
  const selects=t.requests.filter(r=>r.url.pathname.endsWith('/discovery_listings_v1'));
  assert.equal(selects[0].url.searchParams.get('offset'),'0');assert.equal(selects[1].url.searchParams.get('offset'),'30');
  assert.equal(selects[0].url.searchParams.get('limit'),'30');assert.match(selects[0].url.searchParams.get('select'),/listing_images\(.+listing_translations\(/);
  assert.equal(t.requests.filter(r=>r.url.pathname.endsWith('/profiles')).length,1);
  for(const request of t.requests) {assert.equal(request.headers.get('authorization'),'Bearer '+token(A));assert.ok(!request.url.pathname.includes('user_blocks'));}
});
test('marketplace keeps the ordinary/nearby server readers and maps zero coordinates safely',async()=>{
  const t=transport(request=>{
    if(request.url.pathname.endsWith('/profiles'))return [{id:A,language:'et'}];
    if(request.url.pathname.endsWith('/get_marketplace_identity_location'))return [{country:'Example',city:'Equator',lat:0,lng:0}];
    if(request.url.pathname.endsWith('/get_marketplace_listings_nearby')) {assert.equal(request.body.center_lat,0);assert.equal(request.body.center_lng,0);return [{listing_id:7,title:'zero',description:'',price:'1'}];}
    if(request.url.pathname.endsWith('/get_marketplace_listings'))return [{listing_id:8,title:'global',description:'',price:'1'}];
    assert.fail(request.url.pathname);
  });
  const read=t.load(api+'legacyDiscoveryMarketplace.ts').loadLegacyMarketplacePage;
  const nearby=await read(t.context,{nearOnly:true,searchNearCity:''},0,null);assert.equal(nearby.items[0].id,7);assert.equal(nearby.metadata.profile.home_lat,0);
  const global=await read(t.context,{nearOnly:false,searchNearCity:''},30,null);assert.equal(global.items[0].id,8);
  assert.ok(t.requests.every(r=>!r.url.pathname.endsWith('/listings')));assert.ok(t.requests.every(r=>r.headers.get('authorization')==='Bearer '+token(A)));
});
test('anonymous legacy requests use the public bearer, never the SDK current account',async()=>{
  const previous=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='synthetic-public-key';
  try {
    const t=transport(()=>[]);t.context.actor=null;
    await t.load(api+'legacyDiscoveryMarketplace.ts').loadLegacyMarketplacePage(t.context,{nearOnly:false,searchNearCity:''},0,null);
    assert.equal(t.requests.length,1);assert.equal(t.requests[0].headers.get('authorization'),'Bearer synthetic-public-key');
  } finally {if(previous===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=previous;}
});
test('late feed profile cannot dispatch follow or listing reads after its account retires',async()=>{
  const gate=deferred(), t=transport(async()=>{await gate.promise;return [{id:A,active_identity_id:I}];});
  const pending=t.load(api+'legacyDiscoveryFeed.ts').loadLegacyFeedPage(t.context,0,null);await tick();t.retire();gate.resolve();
  await assert.rejects(pending,/Discovery context changed/);assert.equal(t.requests.length,1);
});
after(()=>{
  for(const [name,digest] of inputs)assert.equal(hash(fs.readFileSync(path.join(root,name))),digest,'Source unchanged during check: '+name);
  if(process.env.SELQIRO_LEGACY_INPUTS)fs.writeFileSync(process.env.SELQIRO_LEGACY_INPUTS,
    JSON.stringify({kind:'provider-controls-legacy-inputs-v1',sources:Object.fromEntries([...inputs].sort())},null,2)+'\n');
});
