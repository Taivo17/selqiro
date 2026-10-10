/* NEW release bridge. Captures MUST come from this run's SQL. No live HTTP/RPC.
 * Preparation may inject a separately labelled synthetic file; never a runner fallback. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),cache=new Map(),copy=x=>JSON.parse(JSON.stringify(x));
function load(rel){
 const f=path.resolve(root,rel);assert.ok(f.startsWith(root+path.sep));
 if(cache.has(f))return cache.get(f).exports;
 const t=ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS}});
 assert.deepEqual(t.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
 const m={exports:{}};cache.set(f,m);
 const req=n=>{assert.ok(n.startsWith('.'),'No external runtime import: '+n);return load(path.resolve(path.dirname(f),n)+'.ts');};
 vm.runInNewContext(t.outputText,{module:m,exports:m.exports,require:req,TextEncoder,URL,Date,BigInt,JSON,Object,Number,Array,Set,Error},
  {filename:f,timeout:2000});return m.exports;
}
const oldSearch=load('src/entities/listing/model/publicSearchResponse.ts');
const snap=load('src/entities/listing/model/listingEditSnapshot.ts');
const pub='supabase/labs/listing-public-read-v1/client/';
const search=load(pub+'publicSearchV2.ts'),detail=load(pub+'publicDetailV1.ts'),profile=load(pub+'publicProfileListingsV1.ts');
const owner=load('supabase/labs/listing-owner-read-v1/client/ownerMarketplaceV3.ts');
assert.ok(process.env.SELQIRO_RELEASE_CAPTURE,'Exact SQL capture path is required');
const wire=JSON.parse(fs.readFileSync(process.env.SELQIRO_RELEASE_CAPTURE,'utf8'));
assert.equal(wire.format,'selqiro_price_release_capture_v1');const c=wire.captures;
const A='11111111-1111-4111-8111-111111111111',I='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const U='33333333-3333-4333-8333-333333333333',V='44444444-4444-4444-8444-444444444444',K='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const key={userId:A,identityId:I,listingId:'1001'},big='999999999999999999.999';
const ctx={actorId:A,identityId:I};
const pages={search:()=>search.parsePublicSearchV2(c.search_max,0,24),
 profile:()=>profile.parsePublicProfileListingsV1(c.profile_max,{sellerSlug:'release-a',storeCategoryId:null,offset:0,limit:12}),
 owner:()=>owner.parseOwnerReadPage(c.owner_max,ctx,owner.ownerReadRequest(ctx))};
test('raw editor remains raw without inferred currency',()=>{const x=snap.parseListingEditRead(c.raw_editor,key);assert.equal(x.price.kind,null);assert.equal(x.price.currency,null);assert.equal(x.price.legacy_text,'5578');});
test('new-role save is a valid exact owner snapshot',()=>{const x=snap.parseListingEditSnapshot(c.saved_max.snapshot,key);assert.equal(x.price.amount,big);assert.equal(x.price.currency,'KWD');assert.equal(c.saved_max.actor_id,A);assert.equal(c.saved_max.price_changed,true);});
test('reload sees server-confirmed snapshot',()=>assert.deepEqual(copy(snap.parseListingEditRead(c.max_editor,key)),c.saved_max.snapshot));
test('search parses newly authorized server response',()=>{const x=pages.search().items.find(x=>x.id==='1001');assert.equal(x.price.amount,big);assert.equal(x.price.currency,'KWD');});
test('detail parses newly authorized server response',()=>{const x=detail.parsePublicDetailV1(c.detail_max,'1001').item;assert.equal(x.price.amount,big);assert.equal(x.price.currency,'KWD');});
test('profile parses newly authorized server response',()=>{const x=pages.profile().items.find(x=>x.id==='1001');assert.equal(x.price.amount,big);assert.equal(x.price.currency,'KWD');});
test('owner mixed page parses same authoritative price',()=>{const x=pages.owner().items.find(x=>x.content_id==='1001');assert.equal(x.money.role,'listing_price');assert.equal(x.money.value.amount,big);});
test('four read surfaces agree without owner revision',()=>{const d=detail.parsePublicDetailV1(c.detail_max,'1001').item.price;
 for(const x of [pages.search().items.find(x=>x.id==='1001').price,pages.profile().items.find(x=>x.id==='1001').price,pages.owner().items.find(x=>x.content_id==='1001').money.value])assert.deepEqual(copy(x),copy(d));
 assert.equal(Object.hasOwn(d,'revision'),false);assert.equal(typeof c.max_editor.snapshot.price.revision,'string');});
test('omitted price retains independent later price',()=>{const x=snap.parseListingEditSnapshot(c.basics_omits_price.snapshot,key);assert.equal(x.price.amount,'91.5');assert.equal(x.price.currency,'USD');assert.equal(x.price.revision,'2');assert.equal(c.basics_omits_price.price_changed,false);assert.equal(x.basics.title,'Release revised');});
for(const kind of ['free','negotiable','unspecified'])test('new writer preserves distinct '+kind,()=>{const x=snap.parseListingEditSnapshot(c['saved_'+kind].snapshot,key);assert.equal(x.price.kind,kind);assert.equal(x.price.amount,null);assert.equal(x.price.currency,null);});
test('fixed zero remains JPY, not free',()=>{const x=snap.parseListingEditSnapshot(c.saved_zero.snapshot,key);assert.equal(x.price.kind,'fixed');assert.equal(x.price.amount,'0');assert.equal(x.price.currency,'JPY');});
test('anonymous detail uses same zero contract',()=>{const x=detail.parsePublicDetailV1(c.anonymous_zero_detail,'1001').item;assert.equal(x.price.kind,'fixed');assert.equal(x.price.amount,'0');});
test('business writer bound to actual actor',()=>{const k={userId:U,identityId:K,listingId:'1003'};assert.equal(c.business_saved.actor_id,U);assert.equal(snap.parseListingEditSnapshot(c.business_saved.snapshot,k).price.amount,'20');});
test('other authorized business member gets their own envelope',()=>{const k={userId:V,identityId:K,listingId:'1003'};assert.equal(snap.parseListingEditRead(c.business_other_member_read,k).price.amount,'20');});
test('wanted budget remains distinct from ordinary price',()=>{const x=pages.owner().items.find(x=>x.content_variant==='wanted');assert.equal(x.money.role,'wanted_budget');assert.equal(x.money.value.budget.amount,'5000.5');assert.equal(x.money.value.budget.currency,'EUR');assert.equal(x.money.value.search_area.region,'Rapla maakond');});
for(const field of ['amount','revision'])test('numeric '+field+' corruption is rejected',()=>{const x=copy(c.max_editor);x.snapshot.price[field]=Number(x.snapshot.price[field]);assert.throws(()=>snap.parseListingEditRead(x,key));});
for(const field of ['actor_id','identity_id','listing_id'])test('wrong context '+field+' rejected',()=>{const x=copy(c.max_editor);if(field==='actor_id')x.actor_id=V;else x.snapshot[field]=field==='listing_id'?'1002':K;assert.throws(()=>snap.parseListingEditRead(x,key));});
test('unexpected public owner revision rejected',()=>{const x=copy(c.detail_max);x.item.price.revision='1';assert.throws(()=>detail.parsePublicDetailV1(x,'1001'));});
test('legacy raw label never overwrites structured public truth',()=>{const x=copy(c.detail_max);x.item.price.legacy_text='rounded';assert.throws(()=>detail.parsePublicDetailV1(x,'1001'));});
test('parsers do not mutate captured SQL response',()=>{const before=JSON.stringify(c);pages.search();pages.owner();pages.profile();detail.parsePublicDetailV1(c.detail_max,'1001');assert.equal(JSON.stringify(c),before);});

test('unchanged v1 search parser retains explicit canonical raw label',()=>{const x=oldSearch.parsePublicSearchPage(c.legacy_search_max,0).items[0];assert.equal(x.price,big+' KWD');assert.equal(x.priceAmount,big);});
