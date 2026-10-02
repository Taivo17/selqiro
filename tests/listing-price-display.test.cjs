/* Real source modules and JSX trees with synthetic hooks/transport, not React DOM/HTTP.
 * No network, writes, currency rates or package installation. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const E='src/entities/listing/', M='src/entities/marketplace-item/', F='src/features/';
const copy = v => JSON.parse(JSON.stringify(v));
const N='Valuuta täpsustamata';
const cases=[
  ['bare', {price:'5578',priceAmount:3}, '5578',N],
  ['text euro', {price:'2345 €',priceAmount:3,currency:'USD'},'2345 €',null],
  ['text SEK', {price:'1000 SEK',currency:'EUR'},'1000 SEK',null],
  ['agreed', {price:'Hind kokkuleppel',priceAmount:123},'Hind kokkuleppel',null],
  ['free', {price:'Tasuta',priceAmount:123},'Tasuta',null],
  ['unit price', {price:'alates 50 €/h'},'alates 50 €/h',null],
  ['dollar ambiguous', {price:'$50',currency:'EUR'},'$50',null],
  ['kr ambiguous', {price:'50 kr'},'50 kr',null],
  ['range', {price:'100–200'},'100–200',null],
  ['spaces', {price:'  1 234,500  ',priceAmount:1234.5},'1 234,500',N],
  ['NBSP', {price:'1\u00a0234,50'},'1\u00a0234,50',N],
  ['narrow space', {price:'1\u202f234.50'},'1\u202f234.50',N],
  ['comma grouping', {price:'1,234.5678'},'1,234.5678',N],
  ['dot grouping', {price:'1.234,5678'},'1.234,5678',N],
  ['trailing dot', {price:'130.'},'130.',N],
  ['small', {price:'0.00000001'},'0.00000001',N],
  ['zero text', {price:'0',priceAmount:99},'0',N],
  ['zero amount', {price:null,priceAmount:0},'0',N],
  ['fraction', {price:'.50'},'.50',N],
  ['negative', {price:'-5.25'},'-5.25',N],
  ['explicit EUR', {price:'1234.50',currency:' EUR '},'1234.50 €',null],
  ['explicit SEK', {price:'1000',currency:'SEK'},'1000 SEK',null],
  ['original EUR token', {price:'1000 EUR'},'1000 EUR',null],
  ['high precision original', {price:'9007199254740993.123450',priceAmount:9007199254740992},'9007199254740993.123450',N],
  ['high precision fallback', {price:null,priceAmount:'9007199254740993.123450'},'9007199254740993.123450',N],
  ['amount trailing zeros', {price:' ',priceAmount:'5.1200'},'5.1200',N],
  ['amount with currency', {priceAmount:'0.00010',currency:'SEK'},'0.00010 SEK',null],
  ['empty', {},'Küsi hinda',null],
  ['null', {price:null,priceAmount:null},'Küsi hinda',null],
  ['empty strings', {price:'   ',priceAmount:' '},'Küsi hinda',null],
  ['invalid fallback', {priceAmount:'five'},'Küsi hinda',null],
  ['NaN fallback', {priceAmount:NaN},'Küsi hinda',null],
  ['infinite fallback', {priceAmount:Infinity},'Küsi hinda',null],
  ['prose digits', {price:'Set 2 x 50'},'Set 2 x 50',null],
  ['markup stays text', {price:'<script>1</script>'},'<script>1</script>',null],
  ['other-language text', {price:'Цена договорная'},'Цена договорная',null],
];
function sourceRow(input={}) {
  return {id:'195',identity_id:'identity-a',user_id:'user-a',title:'Gaz 53',description:'V8 72 in',
    price:input.price ?? null,price_amount:input.priceAmount ?? null,currency:input.currency ?? null,
    status:'active',active_until:'2099-11-13T17:50:00Z',created_at:'2026-01-01T00:00:00Z',
    category:'vehicles',subcategory:'trucks_commercial',city:'Paide',country:'Estonia',
    image:'https://example.test/truck.jpg',details:{power:'90KW'},listing_images:[]};
}
function ownerRow(input={}) {
  return {content_type:'listing',content_id:'195',identity_id:'identity-a',owner_user_id:'user-a',
    title:'Gaz 53',description:'V8 72 in',price_text:input.price ?? null,price_amount:input.priceAmount ?? null,
    currency:input.currency ?? null,price_type:null,source_status:'active',lifecycle_status:'active',
    active_until:'2099-11-13T17:50:00Z',created_at:'2026-01-01T00:00:00Z',sort_at:'2026-01-01T00:00:00Z',
    search_text:'unchanged',category:'vehicles',city:'Paide'};
}
const pureReact={useState:init=>[typeof init==='function'?init():init,()=>{}],useRef:v=>({current:v}),
  useEffect:()=>{},useMemo:f=>f(),useCallback:f=>f};
function realm(overrides={}) {
  const cache=new Map();
  function load(rel) {
    const file=path.resolve(root,rel), name=path.relative(root,file).split(path.sep).join('/');
    assert.ok(file.startsWith(root+path.sep));
    if (Object.hasOwn(overrides,name)) return overrides[name];
    if (name==='src/shared/supabase/browserClient.ts') throw Error('Explicit fake transport required');
    if (cache.has(file)) return cache.get(file).exports;
    const result=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,
      compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
    assert.deepEqual(result.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
    const module={exports:{}};cache.set(file,module);
    const req=spec=>{
      if(spec==='react') return overrides.react || pureReact;
      if(spec==='react/jsx-runtime') return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
      if(spec==='next/link') return {__esModule:true,default:props=>({type:'a',props})};
      if(spec==='next/navigation') return {useRouter:()=>({push:()=>{},back:()=>{}})};
      assert.ok(spec.startsWith('.'),'Unknown external import: '+spec);
      const stem=path.resolve(path.dirname(file),spec);
      return load(fs.existsSync(stem+'.ts')?stem+'.ts':stem+'.tsx');
    };
    vm.runInNewContext(result.outputText,{module,exports:module.exports,require:req,Date,Intl,Number,String,
      Object,Array,JSON,Set,Map,Promise,Error,console},{filename:file,timeout:1500});
    return module.exports;
  }
  return load;
}
const load=realm(), price=load(E+'model/priceDisplay.ts').getListingPriceDisplay;
const map=load(E+'api/mappers.ts'), owner=load(M+'api/mappers.ts').mapOwnerMarketplaceItemRow;
const ownerCard=load(F+'my-area/model/mapMyAreaMarketplaceItemRow.ts').mapMyAreaMarketplaceItemRow;
for(const [name,input,label,note] of cases) test('one display rule: '+name,()=>{
  const expected={priceLabel:label,priceNote:note};
  assert.deepEqual(copy(price(Object.freeze(input))),expected);
  const raw=sourceRow(input), before=copy(raw);
  const listing=map.mapListingDetailRow(raw), card=ownerCard(owner(ownerRow(input)));
  for(const result of [listing,card]) {
    assert.equal(result.priceLabel,label);assert.equal(result.priceNote,note);
    assert.equal(result.title,'Gaz 53');assert.equal(result.description,'V8 72 in');
  }
  assert.deepEqual(copy(raw),before);assert.equal(listing.rawPrice,raw.price);
  assert.equal(load(E+'model/format.ts').formatPriceLabel(input),label);
});
test('fallback decimal string survives ordinary owner mapper without changing legacy numeric field',()=>{
  const result=owner(ownerRow({priceAmount:'9007199254740993.123450'}));
  assert.equal(result.priceAmountText,'9007199254740993.123450');
  assert.equal(typeof result.priceAmount,'number'); // No writer migration is smuggled in.
  assert.equal(ownerCard(result).priceLabel,'9007199254740993.123450');
});
test('viewer/country/type hints never infer EUR or free price',()=>{
  for(const country of ['Estonia','United States','Japan','']) {
    const result=map.mapListingDetailRow({...sourceRow({price:'5578'}),country});
    assert.equal(result.priceLabel,'5578');assert.equal(result.currency,null);assert.equal(result.priceNote,N);
  }
  assert.equal(ownerCard(owner({...ownerRow(),price_type:'free'})).priceLabel,'Küsi hinda');
});
function render(el) {
  if(el==null || typeof el==='boolean')return [];
  if(Array.isArray(el))return el.flatMap(render);
  if(typeof el!=='object')return [String(el)];
  if(typeof el.type==='function')return render(el.type(el.props));
  return [{type:el.type,props:el.props||{},children:render(el.props?.children)}];
}
const nodes=tree=>tree.flatMap(n=>typeof n==='string'?[]:[n,...nodes(n.children)]);
const text=tree=>tree.map(n=>typeof n==='string'?n:text(n.children)).join('');
function renderedPrices(tree) {
  return nodes(render(tree)).filter(n=>Object.hasOwn(n.props,'data-listing-price')).map(n=>({
    label:text(n.children[0].children),note:n.children[1]?text(n.children[1].children):null}));
}
const uiFiles={
  search:F+'public-listing-search/components/SearchResultCard.tsx',
  detail:F+'listing-detail/components/ListingDetailPage.tsx',
  profile:F+'public-profile/components/PublicProfileListingsSection.tsx',
  owner:F+'my-area/components/MyAreaListingRow.tsx',
  discovery:F+'product-discovery/components/ProductListingCard.tsx',
};
for(const [name,input,label,note] of cases.filter((_,i)=>[0,1,2,3,4,17,24,27,34].includes(i))) {
  for(const [surface,file] of Object.entries(uiFiles)) test(surface+' JSX renders original and note: '+name,()=>{
    const listing=map.mapListingDetailRow(sourceRow(input));
    const l=realm({
      [F+'listing-detail/model/useListingDetail.ts']:{useListingDetail:()=>({listing,loading:false,error:null})},
      [F+'public-profile/model/usePublicProfileListings.ts']:{usePublicProfileListings:()=>({listings:[listing],loading:false,error:null})},
      [F+'public-profile/model/usePublicProfileStoreCategories.ts']:{usePublicProfileStoreCategories:()=>({categories:[],loading:false,error:null})},
      [F+'listing-navigation/model/useListingReturnRestoration.ts']:{useListingReturnRestoration:()=>{}},
    });
    const props=surface==='search'?{item:{id:'195',title:'Gaz 53',price:input.price??null,
      priceAmount:input.priceAmount===undefined?null:String(input.priceAmount),description:null}}
      :surface==='detail'?{listingId:'195'}
      :surface==='profile'?{profile:{identityId:'identity-a',slug:'seller'},showAll:false,onShowAllChange:()=>{}}
      :surface==='owner'?{listing:ownerCard(owner(ownerRow(input))),now:0,busy:false,disabled:false,
        activeIdentityId:'identity-a',onRenew:()=>{},onStatus:()=>{}}
      :{listing};
    const tree=l(file).default(props);
    assert.deepEqual(renderedPrices(tree),[{label,note}]);
    const prices=nodes(render(tree)).filter(n=>Object.hasOwn(n.props,'data-listing-price'));
    assert.ok(prices.every(n=>!n.props.dangerouslySetInnerHTML));
    assert.ok(prices.every(n=>!n.children[0].props.className.includes('truncate')));
  });
}
function detailTransport(raw,snapshot,viewer=null) {
  const calls=[];
  return {calls,client:{
    auth:{getUser:async()=>({data:{user:viewer}})},
    from(table){calls.push(['from',table]);assert.equal(table,'listings');
      return {select:()=>({eq:()=>({maybeSingle:async()=>({data:raw,error:null})})})};},
    rpc:async(name,args)=>{calls.push(['rpc',name,copy(args)]);assert.equal(name,'get_marketplace_listings');
      return {data:snapshot?[snapshot]:[],error:null};},
  }};
}
for(const [name,input,label,note] of cases.filter((_,i)=>[0,1,17,24,27].includes(i))) {
  test('detail seller snapshot cannot replace money: '+name,async()=>{
    const raw=sourceRow(input), before=copy(raw);
    const snapshot={...sourceRow({price:'999 USD',priceAmount:999,currency:'USD'}),listing_id:'195',
      seller_name:'Snapshot seller',seller_slug:'seller',seller_avatar_url:'https://example.test/avatar.jpg'};
    const t=detailTransport(raw,snapshot);
    const l=realm({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:t.client}});
    const result=await l(E+'api/getListingById.ts').getListingById('195');
    assert.equal(result.priceLabel,label);assert.equal(result.priceNote,note);assert.equal(result.rawPrice,before.price);
    assert.equal(raw.price_amount,before.price_amount);assert.equal(raw.currency,before.currency);
    assert.equal(result.sellerName,'Snapshot seller');assert.equal(result.sellerSlug,'seller');
    assert.equal(result.activeUntil,before.active_until);assert.equal(result.createdAt,before.created_at);
    assert.deepEqual(t.calls.map(c=>c.slice(0,2)),[['from','listings'],['rpc','get_marketplace_listings']]);
  });
}
test('anonymous inactive detail still excluded before enrichment',async()=>{
  const t=detailTransport({...sourceRow(),status:'sold'},null);
  const l=realm({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:t.client}});
  assert.equal(await l(E+'api/getListingById.ts').getListingById('195'),null);
  assert.deepEqual(t.calls,[['from','listings']]);
});
test('profile identity/category/active/expiry filters stay in its query',async()=>{
  const calls=[], raw=sourceRow({price:'5578'});
  const query={then:resolve=>resolve({data:[raw],error:null})};
  for(const key of ['select','order','limit','eq','gt','in'])query[key]=(...args)=>{calls.push([key,...args]);return query;};
  const client={from:table=>{assert.equal(table,'listings');return query;}};
  const l=realm({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:client}});
  const api=l(E+'api/getListingsBySeller.ts').getListingsBySeller;
  const result=await api({identityId:'profile-owner',sellerName:'Seller',storeCategoryScopeIds:['category-a']});
  assert.equal(result[0].priceLabel,'5578');assert.equal(result[0].priceNote,N);
  assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='identity_id'&&c[2]==='profile-owner'));
  assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='status'&&c[2]==='active'));
  assert.ok(calls.some(c=>c[0]==='gt'&&c[1]==='active_until'));
  assert.ok(calls.some(c=>c[0]==='in'&&c[1]==='listing_store_categories.store_category_id'));
  calls.length=0;assert.deepEqual(copy(await api({identityId:'profile-owner',storeCategoryScopeIds:[]})),[]);
  assert.deepEqual(calls,[]);
});
test('legacy owner read adapter shares display rule with one unchanged RPC',async()=>{
  const calls=[],input=ownerRow({price:null,priceAmount:'9007199254740993.123450'});
  const client={rpc:async(name,args)=>{calls.push([name,copy(args)]);return{data:[input],error:null};}};
  const l=realm({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:client}});
  const api=l(F+'my-area/model/getMyAreaOrdinaryListings.ts').getMyAreaOrdinaryListings;
  const result=await api({limit:24,offset:0,statusFilter:'all',searchQuery:'truck',storeCategoryFilter:'cat'});
  assert.equal(result[0].priceLabel,'9007199254740993.123450');assert.equal(result[0].priceNote,N);
  assert.deepEqual(calls,[['get_my_marketplace_items_v2',{p_result_limit:24,p_result_offset:0,
    p_status_filter:'all',p_search_query:'truck',p_store_category_filter:'cat'}]]);
});
test('price display is never a form hydration source',()=>{
  const l=realm();const f=l(F+'listing-edit/model/listingBasicsForm.ts');
  for(const raw of ['5578','Hind kokkuleppel','',null]) {
    const listing=map.mapListingDetailRow(sourceRow({price:raw,priceAmount:'0.012300'}));
    listing.priceLabel='999 EUR';listing.priceNote='DISPLAY ONLY';
    const form=f.buildInitialListingBasicsForm(listing);
    assert.equal(form.price,raw===null?'0.012300':raw);
    assert.deepEqual(copy(f.listingPriceEditPatch(form.price,form.price)),{});
  }
});
test('strict typecheck of affected read models and existing price form with fake transport declaration',()=>{
  const options={strict:true,noEmit:true,skipLibCheck:true,target:ts.ScriptTarget.ES2017,
    module:ts.ModuleKind.CommonJS,moduleResolution:ts.ModuleResolutionKind.Node10,types:[],lib:['lib.esnext.d.ts','lib.dom.d.ts']};
  const host=ts.createCompilerHost(options),read=host.readFile;
  host.readFile=f=>path.resolve(f)===path.join(root,'src/shared/supabase/browserClient.ts')
    ?'export declare const supabaseBrowserClient:any;':read(f);
  const names=[E+'api/getListingById.ts',E+'api/getListingsBySeller.ts',E+'api/getProductListings.ts',
    F+'my-area/model/mapMyAreaMarketplaceItemRow.ts',F+'my-area/model/getMyAreaOrdinaryListings.ts',
    F+'listing-edit/model/listingBasicsForm.ts'];
  const errors=ts.getPreEmitDiagnostics(ts.createProgram(names.map(n=>path.join(root,n)),options,host))
    .filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,ts.formatDiagnosticsWithColorAndContext(errors,
    {getCurrentDirectory:()=>root,getCanonicalFileName:x=>x,getNewLine:()=> '\n'}));
});
