'use strict';
// Actual React DOM, hooks, parsers and navigation helpers with synthetic public RPC replies.
// jsdom is supplied by the isolated test runtime (NODE_PATH); no account, network or database writes.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const React=require('react'),{act}=React,{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),tick=()=>new Promise(resolve=>setImmediate(resolve));
const I='11111111-1111-4111-8111-111111111111',C='22222222-2222-4222-8222-222222222222';
const H='33333333-3333-4333-8333-333333333333',A='44444444-4444-4444-8444-444444444444';
const profile={identityId:I,identityType:'private',legacyUserId:null,displayName:'Garage',slug:'garage',bio:null,avatarUrl:null,bannerUrl:null,bannerDominantColor:null,country:'Estonia',city:'Paide',locationLabel:'Paide'};
const request={sellerSlug:'garage',storeCategoryId:null,offset:0,limit:24};
const clone=x=>JSON.parse(JSON.stringify(x));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
function card(index=0,kind=index%3===0?'horse_offer':'listing',slug='garage'){
 const horse=kind==='horse_offer';return{content_type:kind,content_id:horse?`a1000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`:String(100+index),offer_type:horse?'wanted':null,
  title:(horse?'Horse wanted ':'Ordinary ')+index,description_preview:'Seller text '+index,price:horse?{kind:'budget',amount:'7500.00',currency:'EUR',period:null}:{version:1,kind:'fixed',amount:'25.5',currency:'USD',legacy_text:null,legacy_amount:null},
  category:horse?'horses':'vehicles',subcategory:horse?'wanted':null,detail_category:null,condition:horse?null:'used',country:horse?'EE':'Estonia',city:'Paide',
  image_url:horse?`/api/v2/horse-media/${A}/0`:null,seller_name:'Garage',seller_slug:slug,seller_avatar_url:null,seller_type:'private',created_at:new Date(Date.UTC(2026,10,9,12,0,0)-index*1000).toISOString()};
}
const records=n=>Array.from({length:n},(_,i)=>card(i));
function page(rows,req=request,{available=true,total=rows.length}={}){
 const items=rows.slice(req.offset,req.offset+req.limit),more=total>req.offset+req.limit,capped=more&&req.offset+req.limit>100000;
 return{schema_version:1,content_scope:'public_profile_marketplace',seller_slug:req.sellerSlug,profile_available:available,store_category_id:req.storeCategoryId,sort:'newest',items,
  total_count:String(total),result_limit:req.limit,result_offset:req.offset,has_more:more,next_offset:more&&!capped?req.offset+req.limit:null,window_limit_reached:capped};
}
function runtime({language='et',rows=records(60),rpc,categoryRows=[{id:C,name:'Cars',parent_id:null,sort_order:0}],overrides={}}={}){
 const dom=new JSDOM('<!doctype html><html><body><main id="test"></main></body></html>',{url:'https://portal.invalid/v2/profile/garage?keep=1',pretendToBeVisual:true});
 const previous=new Map();
 for(const [name,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT:true})){previous.set(name,Object.getOwnPropertyDescriptor(global,name));Object.defineProperty(global,name,{configurable:true,writable:true,value})}
 dom.window.scrollTo=()=>{};
 dom.window.document.addEventListener('click',event=>event.preventDefault());
 const calls=[],routes=[],restores=[],cache=new Map(),router={push:url=>routes.push(['push',url]),back:()=>routes.push(['back'])};
 // Direct V1 parser cases above still use page(). Only the current API's transport serves V2.
 const transportReply=reply=>({...reply,data:reply.data?{...reply.data,schema_version:2}:reply.data});
 const client={rpc(name,args){assert.equal(name,'get_public_profile_marketplace_v2');return{abortSignal(signal){
  const req={sellerSlug:args.p_seller_slug,storeCategoryId:args.p_store_category_id,offset:args.p_result_offset,limit:args.p_result_limit};calls.push({name,args,signal});
  if(rpc)return Promise.resolve(rpc(req,signal,calls.length)).then(transportReply);
  const scoped=(req.storeCategoryId===null?rows:rows.filter(row=>row.content_type==='listing')).map(row=>({...row,seller_slug:req.sellerSlug}));
  return Promise.resolve(transportReply({data:page(scoped,req),error:null}));
 }}}};
 const translate=(catalog,key,params={})=>Object.entries(params).reduce((result,[name,value])=>result.replaceAll(`{${name}}`,String(value)),catalog[language]?.[key]??catalog.en?.[key]??key);
 const Link=React.forwardRef(function MockLink({prefetch:unused,...props},ref){return React.createElement('a',{...props,ref})});
 function load(name){
  const file=path.resolve(root,name),rel=path.relative(root,file).split(path.sep).join('/');assert.ok(file.startsWith(root+path.sep));
  if(Object.hasOwn(overrides,rel))return overrides[rel];
  if(rel==='src/shared/supabase/browserClient.ts')return{supabaseBrowserClient:client};
  if(rel==='src/shared/i18n/V2LanguageProvider.tsx')return{useV2Language:()=>({language}),useV2Translation:catalog=>({language,t:(key,params)=>translate(catalog,key,params)})};
  if(rel==='src/features/public-profile/model/usePublicProfileStoreCategories.ts')return{usePublicProfileStoreCategories:()=>({categories:categoryRows,loading:false,error:null})};
  if(rel==='src/features/listing-navigation/model/useListingReturnRestoration.ts')return{useListingReturnRestoration:input=>restores.push(input)};
  if(cache.has(file))return cache.get(file).exports;
  const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});
  const module={exports:{}};cache.set(file,module);
  const requireLocal=spec=>{
   if(spec==='react')return React;if(spec==='react/jsx-runtime')return require('react/jsx-runtime');
   if(spec==='next/link')return{__esModule:true,default:Link};if(spec==='next/navigation')return{useRouter:()=>router};
   assert.ok(spec.startsWith('.')||spec.startsWith('@/'),'Unexpected dependency '+spec);
   const stem=spec.startsWith('@/')?path.join(root,spec.slice(2)):path.resolve(path.dirname(file),spec);
   return load(fs.existsSync(stem)?stem:fs.existsSync(stem+'.ts')?stem+'.ts':stem+'.tsx');
  };
  vm.runInThisContext('(function(module,exports,require){'+output.outputText+'\n})',{filename:file,timeout:2000})(module,module.exports,requireLocal);
  return module.exports;
 }
 const container=dom.window.document.getElementById('test');let reactRoot=require('react-dom/client').createRoot(container);
 const render=async(Component,props={})=>{await act(async()=>{reactRoot.render(React.createElement(Component,props));await tick()});await act(tick)};
 const click=async element=>{assert.ok(element,'click target exists');await act(async()=>{element.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true,button:0}));await tick()});await act(tick)};
 return{load,calls,routes,restores,window:dom.window,container,render,click,
  button(label){return[...container.querySelectorAll('button')].find(el=>el.textContent.trim()===label)},
  async remount(){await act(()=>reactRoot.unmount());reactRoot=require('react-dom/client').createRoot(container)},
  async flush(){await act(async()=>{await tick();await tick()})},
  async close(){await act(()=>reactRoot.unmount());dom.window.close();for(const[name,descriptor]of previous){if(descriptor)Object.defineProperty(global,name,descriptor);else delete global[name]}}
 };
}
const parserPath='src/entities/listing/model/publicRead/publicProfileMarketplaceV1.ts';
const sectionPath='src/features/public-profile/components/PublicProfileListingsSection.tsx';
const navPath='src/features/listing-navigation/model/listingReturnContext.ts';
function wrapper(h){const Section=h.load(sectionPath).default;return function App(){const[expanded,setExpanded]=React.useState(false);return React.createElement(Section,{profile,showAll:expanded,onShowAllChange:setExpanded})}}

test('profile wire retains the server mixed order, canonical IDs and exact price semantics',async()=>{
 const h=runtime();try{const parse=h.load(parserPath).parsePublicProfileMarketplaceV1;const rows=[card(0),{...card(1),content_id:'9007199254740993'},card(2)];
  const parsed=parse(page(rows),request);assert.deepEqual(parsed.items.map(item=>item.id),rows.map(row=>row.content_id));
  assert.deepEqual(parsed.items.map(item=>item.contentType),['horse_offer','listing','listing']);assert.equal(parsed.items[0].horsePrice.kind,'budget');
  assert.equal(parsed.items[1].displayPrice.priceLabel,'25.5 USD');assert.equal(parsed.totalCount,'3');assert.equal(parsed.profileAvailable,true);
 }finally{await h.close()}
});
test('profile parser rejects another slug, category, type, pagination, duplicate or private-shaped envelope',async()=>{
 const h=runtime();try{const parse=h.load(parserPath).parsePublicProfileMarketplaceV1,wire=page([card(0),card(1)]);
  for(const change of [v=>{v.seller_slug='other'},v=>{v.items[0].seller_slug='other'},v=>{v.store_category_id=C},v=>{v.content_scope='marketplace'},
   v=>{v.items[0].content_type='service'},v=>{v.result_offset=24},v=>{v.total_count='9'},v=>{v.items[1]=clone(v.items[0])},v=>{v.owner_token='private'},v=>{v.profile_available=false}]){
   const changed=clone(wire);change(changed);assert.throws(()=>parse(changed,request));
  }
  assert.throws(()=>parse({...wire,store_category_id:C},{...request,storeCategoryId:C}));
  assert.equal(parse(page([],{...request,storeCategoryId:C}),{...request,storeCategoryId:C}).items.length,0);
  assert.equal(parse(page([],request,{available:false}),request).profileAvailable,false);
 }finally{await h.close()}
});
test('public API binds one slug, category and offset before transport and never falls back to owner or global search',async()=>{
 const h=runtime();try{const api=h.load('src/entities/listing/api/getPublicProfileMarketplace.ts').getPublicProfileMarketplace,signal=new AbortController().signal;
  const reply=await api({...request,storeCategoryId:C,offset:24},signal);assert.equal(reply.offset,24);assert.equal(h.calls.length,1);assert.equal(h.calls[0].signal,signal);
  assert.deepEqual(h.calls[0].args,{p_seller_slug:'garage',p_store_category_id:C,p_result_limit:24,p_result_offset:24});
  for(const bad of [{...request,sellerSlug:' '},{...request,offset:-1},{...request,limit:61},{...request,storeCategoryId:'not-a-uuid'}])await assert.rejects(()=>api(bad,signal));
  assert.equal(h.calls.length,1);
 }finally{await h.close()}
});
test('late profile/category/page replies cannot replace the currently requested page',async()=>{
 const held=[],h=runtime({rpc:(req,signal)=>{const d=deferred();held.push({req,signal,...d});return d.promise}});let state;
 try{const hook=h.load('src/features/public-profile/model/usePublicProfileMarketplace.ts').usePublicProfileMarketplace;
  function Observer({request,profileKey}){state=hook(request,profileKey);return React.createElement('p',null,state.page?.sellerSlug??'loading')}
  await h.render(Observer,{request,profileKey:'A'});await h.render(Observer,{request:{...request,sellerSlug:'second'},profileKey:'B'});
  assert.equal(state.page,null);assert.equal(held[0].signal.aborted,true);
  held[1].resolve({data:page([card(0,'horse_offer','second')],held[1].req),error:null});await h.flush();assert.equal(state.page.sellerSlug,'second');
  held[0].resolve({data:page([card(1)],request),error:null});await h.flush();assert.equal(state.page.sellerSlug,'second');
  const scoped={...request,sellerSlug:'second',storeCategoryId:C};await h.render(Observer,{request:scoped,profileKey:'B'});assert.equal(state.page,null);
  await h.render(Observer,{request:{...scoped,offset:24},profileKey:'B'});assert.equal(held[2].signal.aborted,true);held[2].reject(Error('late failure'));await h.flush();assert.equal(state.error,false);
  held[3].resolve({data:page(Array.from({length:25},(_,i)=>card(i,'listing','second')),{...scoped,offset:24}),error:null});await h.flush();assert.equal(state.page.offset,24);assert.equal(state.page.items.length,1);
 }finally{await h.close()}
});
for(const language of ['en','et'])test(language+': one profile section mixes horses and ordinary listings, four-card preview and canonical links',async()=>{
 const h=runtime({language});try{await h.render(wrapper(h));assert.equal(h.container.querySelectorAll('[data-profile-marketplace]').length,1);
  let cards=h.container.querySelectorAll('[data-listing-card-id]');assert.equal(cards.length,4);assert.equal(cards[0].dataset.contentType,'horse_offer');assert.equal(cards[1].dataset.contentType,'listing');
  assert.equal(cards[0].querySelector('a').getAttribute('href'),`/v2/horse-offer/${card(0).content_id}`);
  assert.equal(cards[1].querySelector('a').getAttribute('href'),'/v2/listing/101');assert.match(cards[0].textContent,language==='et'?/Eelarve kuni 7500 €/:/Budget up to 7500 €/);
  assert.match(h.container.textContent,language==='et'?/Selle profiili kuulutused/:/Listings from this profile/);
  await h.click(h.button(language==='et'?'Vaata kõiki (60)':'View all (60)'));cards=h.container.querySelectorAll('[data-listing-card-id]');assert.equal(cards.length,24);
  await h.click(h.button(language==='et'?'Järgmised':'Next'));assert.equal(h.calls.at(-1).args.p_result_offset,24);assert.equal(h.container.querySelector('[data-listing-card-id]').dataset.listingCardId,card(24).content_id);
  await h.click(h.button(language==='et'?'Eelmised':'Previous'));assert.equal(h.calls.at(-1).args.p_result_offset,0);
 }finally{await h.close()}
});
test('own category selection requests the authoritative branch and clear/collapse return to all content',async()=>{
 const h=runtime();try{await h.render(wrapper(h));await h.click(h.button('Vaata kõiki (60)'));await h.click(h.button('Cars'));
  assert.equal(h.calls.at(-1).args.p_store_category_id,C);assert.equal(h.container.querySelectorAll('[data-content-type="horse_offer"]').length,0);
  assert.equal(h.container.querySelectorAll('[data-content-type="listing"]').length,24);
  await h.click(h.button('Kõik kuulutused'));assert.equal(h.calls.at(-1).args.p_store_category_id,null);assert.ok(h.container.querySelector('[data-content-type="horse_offer"]'));
  await h.click(h.button('Cars'));await h.click(h.button('Vaata vähem'));assert.equal(h.calls.at(-1).args.p_store_category_id,null);assert.equal(h.calls.at(-1).args.p_result_offset,0);
  assert.equal(h.container.querySelectorAll('[data-listing-card-id]').length,4);
 }finally{await h.close()}
});
test('opening a second-page filtered card and returning restores that exact filter and page before scroll restoration',async()=>{
 const h=runtime();try{const App=wrapper(h);await h.render(App);await h.click(h.button('Vaata kõiki (60)'));await h.click(h.button('Cars'));await h.click(h.button('Järgmised'));
  const first=h.container.querySelector('[data-listing-card-id]');await h.click(first.querySelector('a'));
  const nav=h.load(navPath),saved=nav.readListingReturnContext();assert.equal(saved.listingId,first.dataset.listingCardId);
  assert.equal(saved.publicProfileState.resultOffset,24);assert.equal(saved.publicProfileState.selectedCategoryId,C);assert.equal(saved.publicProfileState.showAll,true);
  const before=h.calls.length;await h.remount();await h.render(App);
  assert.equal(h.calls[before].args.p_store_category_id,C);assert.equal(h.calls[before].args.p_result_offset,24);
  assert.equal(h.container.querySelector('[data-listing-card-id]').dataset.listingCardId,saved.listingId);
  assert.ok(h.restores.at(-1).ready);assert.ok(h.restores.at(-1).listingIds.includes(saved.listingId));
 }finally{await h.close()}
});
test('empty selected branch remains visible and failed public reads show retry instead of stale cards',async()=>{
 let fails=true;const h=runtime({rpc:(req)=>{if(req.storeCategoryId)return Promise.resolve({data:page([],req),error:null});if(fails)return Promise.resolve({data:null,error:{message:'private provider detail'}});return Promise.resolve({data:page(records(5),req),error:null})}});
 try{await h.render(wrapper(h));assert.equal(h.container.querySelectorAll('[data-listing-card-id]').length,0);assert.ok(h.container.querySelector('[role="alert"]'));assert.ok(!h.container.textContent.includes('private provider detail'));
  fails=false;await h.click(h.button('Proovi uuesti'));assert.equal(h.container.querySelectorAll('[data-listing-card-id]').length,4);
  await h.click(h.button('Vaata kõiki (5)'));await h.click(h.button('Cars'));assert.ok(h.container.querySelector('[data-profile-marketplace]'));assert.equal(h.container.querySelectorAll('[data-listing-card-id]').length,0);
  assert.ok(h.button('Kõik kuulutused'));assert.match(h.container.textContent,/Selles rubriigis/);
 }finally{await h.close()}
});
for(const language of ['et','en'])test(language+': shared horse back button retains profile context and rejects stale or another content ID',async()=>{
 const h=runtime({language});try{const nav=h.load(navPath),Button=h.load('src/features/listing-navigation/components/ListingReturnBackButton.tsx').default;
  nav.saveListingReturnContext({source:'public-profile',listingId:H,cardViewportTop:35,publicProfileState:{showAll:true,selectedCategoryId:C,expandedRootId:C,horizontalScrollLeft:0,resultOffset:24}});
  h.window.history.replaceState({},'',`/v2/horse-offer/${H}`);await h.render(Button,{listingId:H,className:'',fallbackHref:'/v2/products?category=horses'});
  await h.click(h.button(language==='et'?'← Tagasi profiilile':'← Back to profile'));assert.deepEqual(h.routes.at(-1),['push','/v2/profile/garage?keep=1']);
  assert.equal(nav.readListingReturnContext(H).publicProfileState.resultOffset,24);
  await h.render(Button,{listingId:A,className:'',fallbackHref:'/v2/products?category=horses'});await h.click(h.container.querySelector('button'));assert.deepEqual(h.routes.at(-1),['push','/v2/products?category=horses']);
  const stored=JSON.parse(h.window.sessionStorage.getItem('selqiro:listing-return-context:v1'));stored.createdAt=Date.now()-3*60*60*1000;h.window.sessionStorage.setItem('selqiro:listing-return-context:v1',JSON.stringify(stored));
  await h.render(Button,{listingId:H,className:'',fallbackHref:'/v2/products?category=horses'});await h.click(h.container.querySelector('button'));assert.deepEqual(h.routes.at(-1),['push','/v2/products?category=horses']);
 }finally{await h.close()}
});
test('shared return button uses browser back when history exists and old contexts default to page zero',async()=>{
 const h=runtime();try{const nav=h.load(navPath),Button=h.load('src/features/listing-navigation/components/ListingReturnBackButton.tsx').default;
  nav.saveListingReturnContext({source:'public-profile',listingId:H,cardViewportTop:0,publicProfileState:{showAll:true,selectedCategoryId:null,expandedRootId:null,horizontalScrollLeft:0}});
  assert.equal(nav.readListingReturnContext(H).publicProfileState.resultOffset,0);
  h.window.history.pushState({},'',`/v2/horse-offer/${H}`);await h.render(Button,{listingId:H,className:''});await h.click(h.container.querySelector('button'));assert.deepEqual(h.routes,[['back']]);
  const raw=JSON.parse(h.window.sessionStorage.getItem('selqiro:listing-return-context:v1'));raw.publicProfileState.resultOffset=-24;
  h.window.sessionStorage.setItem('selqiro:listing-return-context:v1',JSON.stringify(raw));assert.equal(nav.readListingReturnContext(H).publicProfileState,null);
 }finally{await h.close()}
});

test('actual horse detail composes the shared profile return action and retains the horse fallback without context',async()=>{
 const detail={id:H,offerType:'wanted',title:'Wanted horse',description:'Seller description',price:{kind:'budget',amount:'7500',currency:'EUR',period:null},
  country:'EE',city:'Paide',region:null,fields:{},images:[],sellerName:'Garage',sellerSlug:'garage',sellerType:'private',publishedAt:'2026-11-09T12:00:00Z',activeUntil:null};
 const h=runtime({overrides:{
  'src/entities/horse-offer/api/getPublicHorse.ts':{getPublicHorse:async()=>detail},
  'src/shared/media/PublicPhotoGallery.tsx':{__esModule:true,default:()=>null},
  'src/features/horse-offer-public/components/HorseContactButton.tsx':{__esModule:true,default:()=>null},
 }});try{
  const nav=h.load(navPath),Page=h.load('src/features/horse-offer-public/components/PublicHorsePage.tsx').default;
  nav.saveListingReturnContext({source:'public-profile',listingId:H,cardViewportTop:0,publicProfileState:{showAll:true,selectedCategoryId:null,expandedRootId:null,horizontalScrollLeft:0,resultOffset:24}});
  h.window.history.replaceState({},'',`/v2/horse-offer/${H}`);await h.render(Page,{offerId:H});await h.click(h.button('← Tagasi profiilile'));
  assert.deepEqual(h.routes.at(-1),['push','/v2/profile/garage?keep=1']);assert.equal(nav.readListingReturnContext(H).publicProfileState.resultOffset,24);
  h.window.sessionStorage.clear();await h.remount();await h.render(Page,{offerId:H});await h.click(h.button('← Tagasi kuulutuste juurde'));
  assert.deepEqual(h.routes.at(-1),['push','/v2/products?category=horses']);
 }finally{await h.close()}
});
