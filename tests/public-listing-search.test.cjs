/* Actual TS/TSX modules with synthetic transport, hooks, history and DOM.
 * This is NOT a React DOM/browser, live Supabase, SQL or load test.
 * node --test --test-reporter=tap tests/public-listing-search.test.cjs */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const model = 'src/entities/listing/model/publicSearch.ts';
const response = 'src/entities/listing/model/publicSearchResponse.ts';
const api = 'src/entities/listing/api/searchPublicListings.ts';
const feature = 'src/features/public-listing-search/';
const clone = v => JSON.parse(JSON.stringify(v));
const pause = ms => new Promise(r => setTimeout(r, ms));
function browser() {
  const url = new URL('https://example.invalid/v2/products');
  const storage = new Map(), listeners = new Map(), scrolls = [];
  const win = {location: url, scrollY: 720, addEventListener(k,f) {const s=listeners.get(k)||new Set();s.add(f);listeners.set(k,s);},
    removeEventListener(k,f) {listeners.get(k)?.delete(f);}, scrollTo(p) {scrolls.push(p.top);this.scrollY=p.top;},
    sessionStorage: {getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    history: {state:{nextState:'preserve'}, scrollRestoration:'auto', replaceState(s,_,href) {this.state=s;win.location=new URL(href,win.location.origin);}}};
  const doc = {visibilityState:'visible',querySelectorAll:()=>[],documentElement:{style:{overflow:''}},activeElement:null};
  return {win,doc,listeners,scrolls,storage};
}
function realm(options={}) {
  const cache=new Map(), calls=[], effects=[];
  const hooks=options.hooks||{useState:v=>[typeof v==='function'?v():v,()=>{}],useRef:v=>({current:v}),
    useMemo:f=>f(),useEffect:f=>effects.push(f),Suspense:p=>p.children};
  function load(relative) {
    const file=path.resolve(root,relative), name=path.relative(root,file).split(path.sep).join('/');
    assert.ok(file.startsWith(root+path.sep));
    if (options.modules?.[name]) return options.modules[name];
    if (name==='lib/useAuth.ts') return {useAuth:()=>({user:null,loading:false})};
    if (name==='src/shared/supabase/browserClient.ts') return {supabaseBrowserClient:{rpc(name,args) {
      const call={name,args,signal:null};calls.push(call);
      return {abortSignal(signal) {call.signal=signal;return options.transport?options.transport(call):Promise.resolve({data:page(),error:null});}};}}};
    if(cache.has(file))return cache.get(file).exports;
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX}});
    assert.equal(code.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
    const m={exports:{}};cache.set(file,m);
    function local(req) {
      if(req==='react') return hooks;
      if(req==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'fragment'};
      if(req==='next/link')return {__esModule:true,default:p=>({type:'a',props:p})};
      if(req==='next/navigation')return {useSearchParams:()=>new URLSearchParams(options.browser?.routerSearch ?? options.browser?.win.location.search ?? '')};
      assert.ok(req.startsWith('.'),'Unexpected external dependency '+req);
      const base=path.resolve(path.dirname(file),req);
      const target=[base+'.ts',base+'.tsx',base].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());assert.ok(target,req);
      return load(target);
    }
    vm.runInNewContext(code.outputText,{module:m,exports:m.exports,require:local,Date,Intl,URL,URLSearchParams,
      AbortController,BigInt,setTimeout,clearTimeout,console,window:options.browser?.win,document:options.browser?.doc,
      HTMLElement:class HTMLElement{},ResizeObserver:class {observe(){} disconnect(){}}},{filename:file,timeout:2000});
    return m.exports;
  }
  return {load,calls,effects};
}
function item(id='1') {return {content_type:'listing',content_id:id,title:'Audi A4',description_preview:'Automaat',
  price:'5000 USD',price_amount:'5000.00',currency:null,category:'vehicles',subcategory:'cars',detail_category:'passenger_cars',
  condition:'used',country:'Eesti',city:'Paide',image_url:'https://example.invalid/1.jpg',seller_name:'Avaldaja',seller_slug:'seller',
  seller_avatar_url:null,seller_type:'private',created_at:'2026-09-27T10:00:00+00:00'};}
function page(offset=0,total='1') {
  const n=BigInt(total),size=Math.max(0,Math.min(24,Number(n-BigInt(offset)))),more=n>BigInt(offset+24),cap=more&&offset+24>100000;
  return {schema_version:1,content_scope:'ordinary_listings',sort:'newest',items:Array.from({length:size},(_,i)=>item(String(offset+i+1))),
    total_count:total,result_limit:24,result_offset:offset,has_more:more,next_offset:more&&!cap?offset+24:null,window_limit_reached:cap};
}
const pure=realm(), M=pure.load(model), P=pure.load(response);
test('default search and canonical URL round-trip',()=>{
  const v={...M.EMPTY_PUBLIC_SEARCH,query:'Audi A4 automaat',location:'Paide',category:'vehicles',subcategory:'cars',detailCategory:'passenger_cars',offset:24};
  const u=M.publicSearchUrl(v), result=M.parsePublicSearch(new URLSearchParams(u.split('?')[1]));
  assert.deepEqual(clone(result.input),v);assert.equal(result.error,null);assert.match(u,/offset=24/);
});
test('URL preserves unfinished text spaces while request key trims them',()=>{
  const a={...M.EMPTY_PUBLIC_SEARCH,query:'Audi '};
  assert.equal(M.parsePublicSearch(new URLSearchParams('q=Audi+')).input.query,'Audi ');
  assert.equal(M.publicSearchKey(a),M.publicSearchKey({...a,query:'Audi'}));
});
for (const q of ['offset=-1','offset=100001','offset=1.5','offset=no','q=x&q=y','category=missing',
  'subcategory=cars','category=vehicles&subcategory=furniture','category=vehicles&detail=passenger_cars',
  'category=vehicles&subcategory=cars&detail=trucks','condition=unknown','sort=nearby','min_price=10',
  'q='+ 'x'.repeat(161),'location='+ 'x'.repeat(161)]) test('invalid filter URL does not silently broaden: '+q.slice(0,60),()=>{
  assert.ok(M.parsePublicSearch(new URLSearchParams(q)).error);
});
test('global labels, hierarchy and filter count use the existing taxonomy',()=>{
  const v={...M.EMPTY_PUBLIC_SEARCH,category:'vehicles',subcategory:'cars',detailCategory:'passenger_cars',condition:'used',location:'Paide'};
  assert.equal(M.publicFilterCount(v),3);assert.equal(M.publicCategoryPath(v),'Sõidukid › Autod › Sõiduautod');
  assert.ok(M.searchCategoryChildren('vehicles','cars').some(n=>n.value==='passenger_cars'));
  assert.equal(M.formatSearchCount('9223372036854775807'),'9 223 372 036 854 775 807');
});
for(const [offset,total] of [[0,'0'],[0,'1'],[0,'24'],[0,'25'],[24,'25'],[48,'20'],[99984,'999999'],[0,'9223372036854775807']])
 test(`response count/page boundaries ${offset}/${total}`,()=>{
  const p=P.parsePublicSearchPage(page(offset,total),offset);assert.equal(p.totalCount,total);assert.equal(p.offset,offset);
  assert.equal(p.windowLimitReached,offset===99984);assert.equal(p.items.length,page(offset,total).items.length);
 });
for(const [name,mutate] of [
  ['scope',r=>r.content_scope='horse_offers'],['version',r=>r.schema_version=2],['sort',r=>r.sort='price'],
  ['extra field',r=>r.details={}],['missing field',r=>delete r.total_count],['numeric count',r=>r.total_count=1],
  ['count overflow',r=>r.total_count='9223372036854775808'],['negative count',r=>r.total_count='-1'],
  ['leading-zero count',r=>r.total_count='01'],['page echo',r=>r.result_offset=24],['page size',r=>r.result_limit=60],
  ['false next',r=>r.next_offset=24],['false more',r=>r.has_more=true],['false cap',r=>r.window_limit_reached=true],
  ['item count',r=>r.items=[]],['private payload',r=>r.items[0].details={}],['currency guess',r=>r.items[0].currency='EUR'],
  ['numeric ID',r=>r.items[0].content_id=1],['wrong type',r=>r.items[0].content_type='horse_offer'],
  ['negative amount',r=>r.items[0].price_amount='-1'],['number amount',r=>r.items[0].price_amount=1],
  ['malformed timestamp',r=>r.items[0].created_at='bad'],['null item',r=>r.items[0]=null],
]) test('strict response rejects '+name,()=>{const p=page();mutate(p);assert.throws(()=>P.parsePublicSearchPage(p,0));});
test('duplicate IDs reject the response',()=>{const p=page(0,'2');p.items[1].content_id='1';assert.throws(()=>P.parsePublicSearchPage(p,0));});
test('IDs remain exact decimal strings beyond Number precision',()=>{const p=page();p.items[0].content_id='9007199254740993';assert.equal(P.parsePublicSearchPage(p,0).items[0].id,'9007199254740993');});
for(const bad of ['javascript:alert(1)','data:text/html,test','https://user:pass@example.com/p','/relative.jpg'])
 test('unsafe or unqualified image URL becomes an explicit placeholder: '+bad,()=>{const p=page();p.items[0].image_url=bad;assert.equal(P.parsePublicSearchPage(p,0).items[0].imageUrl,null);});
test('one RPC with exact filters/offset/signal, raw price preserved and no enrichment',async()=>{
  const r=realm(), c=new AbortController();const input={...M.EMPTY_PUBLIC_SEARCH,query:' Audi ',location:' Paide ',condition:'used'};
  const p=await r.load(api).searchPublicListings(input,c.signal);
  assert.equal(r.calls.length,1);assert.equal(r.calls[0].name,'search_public_listings_v1');assert.equal(r.calls[0].signal,c.signal);
  assert.deepEqual(clone(r.calls[0].args),{p_search_query:'Audi',p_category:null,p_subcategory:null,p_detail_category:null,p_condition:'used',p_location_query:'Paide',p_result_limit:24,p_result_offset:0});
  assert.equal(p.items[0].price,'5000 USD');
});
test('invalid input issues no RPC',async()=>{const r=realm();await assert.rejects(r.load(api).searchPublicListings({...M.EMPTY_PUBLIC_SEARCH,condition:'bad'},new AbortController().signal));assert.equal(r.calls.length,0);});
test('transport failure is not replaced by a broad feed and does not expose SQL details',async()=>{
  const r=realm({transport:()=>Promise.resolve({data:null,error:{message:'private SQL secret'}})});
  await assert.rejects(r.load(api).searchPublicListings(M.EMPTY_PUBLIC_SEARCH,new AbortController().signal),e=>!e.message.includes('secret'));assert.equal(r.calls.length,1);
});
function render(element) {
  if(element==null||typeof element==='boolean')return [];
  if(Array.isArray(element))return element.flatMap(render);
  if(typeof element!=='object')return [String(element)];
  if(typeof element.type==='function')return render(element.type(element.props||{}));
  return [{type:element.type,props:element.props||{},children:render(element.props?.children)}];
}
const all=nodes=>nodes.flatMap(n=>typeof n==='string'?[]:[n,...all(n.children)]);
const text=nodes=>nodes.map(n=>typeof n==='string'?n:text(n.children)).join(' ').replace(/\s+/g,' ').trim();
function view(file,props={},options={}) {const r=realm(options),nodes=render(r.load(file).default(props));return {...r,nodes,elements:all(nodes),text:text(nodes)};}
test('search page has a compact real input and only supported scope',()=>{
  const v=view(feature+'components/ListingSearchPage.tsx',{}, {browser:browser()});
  assert.equal(text(v.elements.find(e=>e.type==='h1').children),'Kuulutused');
  assert.ok(v.elements.some(e=>e.type==='input'&&e.props.type==='search'));assert.ok(v.text.includes('Audi A4 automaat'));
  assert.doesNotMatch(v.text,/Esiletõstetud|Cub Cadet|Sinu lähedal|API|skeleton/);
  assert.equal(v.calls.length,0);
});
test('dialog semantics and closing are presentation only',()=>{
  const b=browser();let closed=0,changed=0;
  const v=view(feature+'components/SearchFilters.tsx',{input:{...M.EMPTY_PUBLIC_SEARCH,category:'vehicles',subcategory:'cars'},onChange:()=>changed++,onClose:()=>closed++,onClear:()=>{}},{browser:b});
  const d=v.elements.find(e=>e.type==='dialog');assert.equal(d.props['aria-labelledby'],'listing-filter-title');
  assert.equal(v.elements.filter(e=>e.type==='select').length,4);
  v.elements.find(e=>e.props['aria-label']==='Sulge filtrid').props.onClick();assert.equal(closed,1);assert.equal(changed,0);
  let prevented=false;d.props.onCancel({preventDefault(){prevented=true;}});assert.ok(prevented);assert.equal(closed,2);
  assert.equal(v.calls.length,0);assert.doesNotMatch(v.text,/Hinnavahemik|Kaugus|Rendi/);
});
test('changing a parent explicitly clears child selectors',()=>{
  const changes=[];const v=view(feature+'components/SearchFilters.tsx',{input:{...M.EMPTY_PUBLIC_SEARCH,category:'vehicles',subcategory:'cars',detailCategory:'passenger_cars'},onChange:v=>changes.push(clone(v)),onClose:()=>{},onClear:()=>{}},{browser:browser()});
  v.elements.filter(e=>e.type==='select')[0].props.onChange({target:{value:'electronics'}});
  assert.deepEqual(changes,[{category:'electronics',subcategory:'',detailCategory:''}]);
});
for(const [name,p,loading,error,expected] of [
 ['empty',P.parsePublicSearchPage(page(0,'0'),0),false,null,'Kuulutusi ei leitud'],
 ['loading',null,true,null,'Otsin…'],['error',null,false,'Ühenduse viga','Proovi uuesti'],
 ['results',P.parsePublicSearchPage(page(),0),false,null,'1 kuulutus'],
])test('search result '+name+' view',()=>{
 const v=view(feature+'components/SearchResults.tsx',{page:p,loading,error,offset:0,onPage:()=>{},onRetry:()=>{},onReset:()=>{}},{browser:browser()});assert.ok(v.text.includes(expected));
});
test('search card is a real non-prefetched link, no fake save or currency',()=>{
  const b=browser(),v=view(feature+'components/SearchResultCard.tsx',{item:P.parsePublicSearchPage(page(),0).items[0]},{browser:b});
  const a=v.elements.find(e=>e.type==='a');assert.equal(a.props.href,'/v2/listing/1');assert.equal(a.props.prefetch,false);
  assert.ok(v.text.includes('5000 USD'));assert.doesNotMatch(v.text,/€|Esiletõstetud/);assert.equal(v.elements.filter(e=>e.type==='button').length,0);
  a.props.onClick({button:0,ctrlKey:true});assert.equal(b.storage.size,0);
  a.props.onClick({button:0});assert.equal(b.win.history.state.nextState,'preserve');assert.ok(b.storage.size>0);
});
test('URL updates preserve framework history, reset pages, retain closed filter selection',()=>{
  const b=routedBrowser('?q=Audi&offset=24');
  const r=realm({browser:b});const state=r.load(feature+'model/usePublicSearchUrl.ts').usePublicSearchUrl();
  state.change({condition:'used'});assert.equal(b.win.history.state.__NA,true);
  assert.equal(b.win.location.search,'?q=Audi&condition=used');
  state.change({location:'Paide'});assert.ok(b.win.location.search.includes('condition=used'));assert.ok(b.win.location.search.includes('location=Paide'));assert.equal(r.calls.length,0);
});
// Minimal hook lifecycle harness: dependencies, cleanups, state/ref slots. No React DOM.
function host() {
 const slots=[],deps=[],cleanups=[],pending=[];let cursor=0;
 const hooks={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;
   return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v}];},
  useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
  useEffect(fn,d){const i=cursor++;if(!deps[i]||d.some((v,j)=>!Object.is(v,deps[i][j]))){deps[i]=d;pending.push(()=>{cleanups[i]?.();cleanups[i]=fn();});}},
  useMemo(fn){cursor++;return fn();}};
 return {hooks,render(fn){cursor=0;const out=fn();pending.splice(0).forEach(f=>f());return out;},unmount(){cleanups.forEach(f=>f?.());}};
}
test('debounce, aborted stale replies, query and account isolation, and unmount cleanup',async()=>{
 const h=host(),b=browser(),pending=[];
 const r=realm({hooks:h.hooks,browser:b,transport:call=>new Promise(resolve=>pending.push({call,resolve}))});
 const hook=r.load(feature+'model/usePublicListingSearch.ts').usePublicListingSearch;
 let query={...M.EMPTY_PUBLIC_SEARCH,query:'Audi'},who='A';const draw=()=>h.render(()=>hook(query,who,true));
 draw();await pause(325);assert.equal(pending.length,1);
 query={...query,query:'BMW'};let result=draw();assert.equal(result.page,null);assert.ok(pending[0].call.signal.aborted);
 query={...query,query:'BMW automaat'};draw();await pause(325);assert.equal(pending.length,2);
 const good=page();good.items[0].title='BMW automaat';pending[1].resolve({data:good,error:null});await pause(0);
 assert.equal(draw().page.items[0].title,'BMW automaat');
 pending[0].resolve({data:page(),error:null});await pause(0);assert.equal(draw().page.items[0].title,'BMW automaat');
 who='B';result=draw();assert.equal(result.page,null);await pause(325);assert.equal(pending.length,3);
 h.unmount();assert.ok(pending[2].call.signal.aborted);pending[2].resolve({data:page(),error:null});await pause(0);
});
test('disabled or invalid input never starts a request',async()=>{
 const h=host(),r=realm({hooks:h.hooks,browser:browser()});const hook=r.load(feature+'model/usePublicListingSearch.ts').usePublicListingSearch;
 h.render(()=>hook(M.EMPTY_PUBLIC_SEARCH,'anonymous',false));await pause(325);assert.equal(r.calls.length,0);h.unmount();
});
test('matching history return restores once and clears context; wrong URL does not restore',async()=>{
 const b=browser(),r=realm({browser:b});
 const shared=r.load('src/features/listing-navigation/model/listingReturnContext.ts');
 shared.saveListingReturnContext({source:'products',listingId:'1',cardViewportTop:100});
 b.doc.querySelectorAll=()=>[{dataset:{listingCardId:'1'},getBoundingClientRect:()=>({top:100})}];
 const ret=r.load(feature+'model/usePublicSearchReturn.ts');ret.usePublicSearchReturn(true,['1'],'scope');
 const cleanup=r.effects.pop()();await pause(385);assert.ok(b.scrolls.length>=1);assert.equal(shared.readListingReturnContext(),null);assert.equal(b.win.history.scrollRestoration,'auto');cleanup();
 shared.saveListingReturnContext({source:'products',listingId:'1',cardViewportTop:100});b.win.location.search='?q=other';
 const n=b.scrolls.length;ret.usePublicSearchReturn(true,['1'],'other');r.effects.pop()();await pause(20);assert.equal(b.scrolls.length,n);
});
test('return alignment yields to actual user interaction',async()=>{
 const b=browser(),r=realm({browser:b}),shared=r.load('src/features/listing-navigation/model/listingReturnContext.ts');
 shared.saveListingReturnContext({source:'products',listingId:'1',cardViewportTop:100});
 r.load(feature+'model/usePublicSearchReturn.ts').usePublicSearchReturn(true,['1'],'scope');const clean=r.effects.pop()();
 [...b.listeners.get('wheel')][0]();const n=b.scrolls.length;await pause(385);assert.equal(b.scrolls.length,n);assert.equal(shared.readListingReturnContext(),null);clean();
});

for (const id of ['0', '-1', '-9223372036854775808', '9223372036854775807']) test('canonical PostgreSQL bigint ID stays exact: '+id,()=>{
 const p=page();p.items[0].content_id=id;assert.equal(P.parsePublicSearchPage(p,0).items[0].id,id);
});
test('closing/reopening UI and an unchanged query do not refetch the page',async()=>{
 const h=host(),r=realm({hooks:h.hooks,browser:browser()}),hook=r.load(feature+'model/usePublicListingSearch.ts').usePublicListingSearch;
 const draw=()=>h.render(()=>hook({...M.EMPTY_PUBLIC_SEARCH},'anonymous',true));
 draw();await pause(325);draw();draw();await pause(325);assert.equal(r.calls.length,1);h.unmount();
});

// A router snapshot is not window.location: real App Router updates can lag.
// Model Next's internal-marker bypass and automatic router-state copying, instead
// of letting useSearchParams read the URL directly as the original test did.
function routedBrowser(search='') {
  const b=browser(); b.win.location=new URL('https://example.invalid/v2/products'+search);
  b.routerSearch=b.win.location.search.replace(/^\?/, '');
  b.routerWrites=[];
  const nativeReplace=b.win.history.replaceState;
  b.win.history.state={__NA:true,__PRIVATE_NEXTJS_INTERNALS_TREE:{fixture:'tree'}};
  b.win.history.replaceState=function(data,unused,href) {
    if (data?.__NA || data?._N) return nativeReplace.call(this,data,unused,href);
    const copied={...(data||{}),__NA:this.state.__NA,
      __PRIVATE_NEXTJS_INTERNALS_TREE:this.state.__PRIVATE_NEXTJS_INTERNALS_TREE};
    b.routerWrites.push(String(href));
    return nativeReplace.call(this,copied,unused,href);
  };
  b.flushRouter=(href=b.win.location.href)=>{b.routerSearch=new URL(href,b.win.location.origin).search.replace(/^\?/, '');};
  b.pop=href=>{b.win.location=new URL(href,b.win.location.origin);
    for(const fn of b.listeners.get('popstate')||[])fn({state:b.win.history.state});};
  return b;
}
function urlHost(search='') {
  const b=routedBrowser(search),h=host(),r=realm({browser:b,hooks:h.hooks});
  const hook=r.load(feature+'model/usePublicSearchUrl.ts').usePublicSearchUrl;
  return {b,h,r,draw:()=>h.render(hook)};
}
test('router fixture separates a changed address from a bypassed router notification',()=>{
  const b=routedBrowser();
  b.win.history.replaceState(b.win.history.state,'','/v2/products?q=old');
  assert.equal(b.win.location.search,'?q=old');assert.equal(b.routerSearch,'');assert.equal(b.routerWrites.length,0);
  b.win.history.replaceState(null,'','/v2/products?q=new');
  assert.equal(b.routerWrites.length,1);assert.equal(b.routerSearch,'');
  assert.equal(b.win.history.state.__NA,true);
  b.flushRouter();assert.equal(b.routerSearch,'q=new');
});
test('typing updates controlled value before Next router acknowledgement',()=>{
  const {b,h,draw}=urlHost();let state=draw();state.change({query:'Audi'});
  state=draw();assert.equal(state.input.query,'Audi');assert.equal(b.routerSearch,'');
  assert.equal(b.win.location.search,'?q=Audi');assert.equal(b.routerWrites.length,1);
  assert.equal(b.win.history.state.__NA,true);h.unmount();
});
test('typing spaces, pasting unicode, editing and clearing preserve exact input',()=>{
  const {b,h,draw}=urlHost();let state=draw();
  for(const query of ['A','Au','Audi','Audi ','Audi A4','Audi A4 automaat','  Käru + haagis  ','']) {
    state.change({query});state=draw();assert.equal(state.input.query,query);
    assert.equal(new URLSearchParams(b.win.location.search).get('q')||'',query);
  }
  h.unmount();
});
test('category, subcategories, condition and location compose without router acknowledgement',()=>{
  const {h,draw}=urlHost('?q=Audi&offset=24');let state=draw();
  for(const field of [{category:'vehicles',subcategory:'',detailCategory:''},
    {subcategory:'cars',detailCategory:''},{detailCategory:'passenger_cars'},
    {condition:'used'},{location:'P'},{location:'Paide'}]){state.change(field);state=draw();}
  assert.deepEqual(clone(state.input),{...M.EMPTY_PUBLIC_SEARCH,query:'Audi',category:'vehicles',
    subcategory:'cars',detailCategory:'passenger_cars',condition:'used',location:'Paide'});
  assert.equal(state.error,null);h.unmount();
});
test('several field changes in one event retain preceding changes',()=>{
  const {h,draw}=urlHost();const state=draw();state.change({query:'Audi '});
  state.change({location:'Paide'});state.change({condition:'used'});
  const current=draw();assert.equal(current.input.query,'Audi ');assert.equal(current.input.location,'Paide');
  assert.equal(current.input.condition,'used');h.unmount();
});
test('stale router echoes and unrelated renders cannot erase the newer input',()=>{
  const {b,h,draw}=urlHost();let state=draw();state.change({query:'A'});state=draw();
  const older=b.win.location.href;state.change({query:'Audi'});draw();
  b.flushRouter(older);draw();state=draw();assert.equal(state.input.query,'Audi');
  b.flushRouter();draw();assert.equal(draw().input.query,'Audi');h.unmount();
});
test('external same-route URL navigation is read when it matches the live address',()=>{
  const {b,h,draw}=urlHost('?q=Audi');draw();
  b.win.history.replaceState(null,'','/v2/products?q=BMW&location=Tartu&condition=used&offset=24');
  b.flushRouter();draw();const current=draw();assert.equal(current.input.query,'BMW');
  assert.equal(current.input.location,'Tartu');assert.equal(current.input.offset,24);h.unmount();
});
test('Back and Forward update input even before the router snapshot catches up',()=>{
  const {b,h,draw}=urlHost('?q=Audi');let state=draw();state.change({query:'BMW'});draw();
  b.pop('/v2/products?q=Audi&condition=used&offset=24');state=draw();
  assert.equal(state.input.query,'Audi');assert.equal(state.input.condition,'used');assert.equal(state.input.offset,24);
  b.pop('/v2/products?q=BMW&location=Paide');state=draw();assert.equal(state.input.query,'BMW');
  assert.equal(state.input.location,'Paide');h.unmount();
});
test('pagination, location editing and filter reset preserve the search query',()=>{
  const {h,draw}=urlHost('?q=Audi&category=vehicles&condition=used&location=Paide');let state=draw();
  state.goToOffset(24);state=draw();assert.equal(state.input.offset,24);
  state.change({location:'Tartu'});state=draw();assert.equal(state.input.offset,0);
  state.change({category:'',subcategory:'',detailCategory:'',condition:'',location:''});state=draw();
  assert.deepEqual(clone(state.input),{...M.EMPTY_PUBLIC_SEARCH,query:'Audi'});h.unmount();
});
test('unchanged state does not replace history again',()=>{
  const {b,h,draw}=urlHost('?q=Audi');let state=draw();state.change({query:'Audi'});state=draw();
  state.change({query:'Audi'});assert.equal(b.routerWrites.length,0);assert.equal(state.input.query,'Audi');h.unmount();
});
test('an invalid incoming URL stays an error until explicit valid editing or reset',()=>{
  const {b,h,draw}=urlHost('?q=Audi&radius=50');let state=draw();assert.ok(state.error);
  state.change({condition:'used'});state=draw();assert.equal(state.error,null);assert.equal(state.input.query,'Audi');
  b.pop('/v2/products?category=missing');state=draw();assert.ok(state.error);
  state.replace({...M.EMPTY_PUBLIC_SEARCH});state=draw();assert.equal(state.error,null);h.unmount();
});
test('history failure retains typed text and reports a recoverable error',()=>{
  const {b,h,draw}=urlHost();let state=draw();const replace=b.win.history.replaceState;
  b.win.history.replaceState=()=>{throw new Error('synthetic denied history');};
  state.change({query:'Audi'});state=draw();assert.equal(state.input.query,'Audi');assert.ok(state.error);
  b.win.history.replaceState=replace;state.change({query:'Audi '});state=draw();
  assert.equal(state.input.query,'Audi ');assert.equal(state.error,null);h.unmount();
});
test('unmount removes the local history listener',()=>{
  const {b,h,draw}=urlHost();draw();assert.equal(b.listeners.get('popstate')?.size,1);
  h.unmount();assert.equal(b.listeners.get('popstate')?.size,0);
});
test('URL state reaches the existing debounced RPC without waiting for the router',async()=>{
  const b=routedBrowser(),h=host(),r=realm({browser:b,hooks:h.hooks});
  const url=r.load(feature+'model/usePublicSearchUrl.ts').usePublicSearchUrl;
  const search=r.load(feature+'model/usePublicListingSearch.ts').usePublicListingSearch;
  const draw=()=>h.render(()=>{const u=url();return {u,data:search(u.input,'anonymous',!u.error)};});
  let result=draw();result.u.change({query:'Audi'});result=draw();result.u.change({location:'Paide'});
  result=draw();result.u.change({category:'vehicles',condition:'used'});draw();
  await pause(325);assert.equal(r.calls.length,1);
  assert.deepEqual(clone(r.calls[0].args),{p_search_query:'Audi',p_category:'vehicles',p_subcategory:null,
    p_detail_category:null,p_condition:'used',p_location_query:'Paide',p_result_limit:24,p_result_offset:0});
  assert.equal(b.routerSearch,'');assert.ok(draw().data.page);
  h.unmount();
});
test('restored invalid history cancels pending request and never broadens it',async()=>{
  const b=routedBrowser(),h=host(),r=realm({browser:b,hooks:h.hooks});
  const url=r.load(feature+'model/usePublicSearchUrl.ts').usePublicSearchUrl;
  const search=r.load(feature+'model/usePublicListingSearch.ts').usePublicListingSearch;
  const draw=()=>h.render(()=>{const u=url();return {u,data:search(u.input,'anonymous',!u.error)};});
  draw().u.change({query:'Audi'});draw();b.pop('/v2/products?category=missing');
  const state=draw();assert.ok(state.u.error);assert.equal(state.data.page,null);
  await pause(325);assert.equal(r.calls.length,0);h.unmount();
});

test('navigation away from the search route does not reset its input before unmount',()=>{
  const {b,h,draw}=urlHost('?q=Audi&location=Paide');draw();
  b.pop('/v2/listing/1');b.flushRouter();draw();const state=draw();
  assert.equal(state.input.query,'Audi');assert.equal(state.input.location,'Paide');h.unmount();
});
