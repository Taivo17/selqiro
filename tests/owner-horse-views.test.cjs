/* Read-only view regression checks. Actual TS/TSX modules; synthetic rows, hooks and
 * JSX element interpreter, NOT React DOM, browser, Supabase or a production test. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const ID = '11111111-1111-4111-8111-111111111111';
const I = '22222222-2222-4222-8222-222222222222';
const U = '33333333-3333-4333-8333-333333333333';
const plain = value => JSON.parse(JSON.stringify(value));
const normal = value => value.replace(/\s+/g, ' ');
function detail(kind='wanted') {
  return {offerId:ID,contentId:ID,contentType:'horse_offer',identityId:I,offerType:kind,
    status:'draft',title:'Test title',description:'Test description',currency:'EUR',priceType:'contact',priceAmount:null,
    horseName:null,birthYear:null,sex:null,breed:null,color:null,heightCm:null,discipline:null,trainingLevel:null,
    suitability:null,healthNotes:null,behaviorNotes:null,city:null,region:null,locationText:null,horseLat:null,horseLng:null,
    imageUrl:null,images:[],activeUntil:null,createdAt:'2026-09-19T00:00:00Z',updatedAt:'2026-09-19T01:00:00Z',
    details:{schema_version:1,branch:kind==='wanted'?'wanted':'specific',wanted:{preferred_sex:'unknown',
      budget:{mode:'maximum',amount:5000,currency:'EUR'},search_area:{country_code:'EE',city_or_municipality:'Rapla maakond',region:'Rapla maakond'}}}};
}
function realm({row=detail(),pathname='/v2/my-area/horse-offers/'+ID,detailState,auth={user:{id:U,email:'test@example.invalid'},loading:false},editorState}={}) {
 const cache=new Map();
 function load(rel) {
  const file=path.resolve(root,rel); assert.ok(file.startsWith(root+path.sep));
  if(file.endsWith('/lib/useAuth.ts')) return {useAuth:()=>auth};
  if(file.endsWith('/src/shared/supabase/browserClient.ts')) return {supabaseBrowserClient:{auth:{signOut:()=>{throw Error('write is not expected');}}}};
  if(file.endsWith('/src/features/horse-offer-detail/model/useOwnerHorseOfferDetail.ts')) return {useOwnerHorseOfferDetail:()=>detailState||{detail:row,isLoading:false,isNotFound:false,errorMessage:null,reload:()=>{}}};
  if(file.endsWith('/src/features/v2-shell/model/useV2IdentitySwitcher.ts')) return {useV2IdentitySwitcher:()=>({activeIdentity:{id:I,type:'private',displayName:'Test identity'},identities:[],loading:false,switchIdentity:()=>{throw Error('not a switch test');}})};
  if(file.endsWith('/src/features/horse-offer-edit/model/useOwnerHorseOfferEditForm.ts')) return {useOwnerHorseOfferEditForm:()=>editorState||{
    state:{context:'checking',work:'idle',snapshot:null,closed:false},session:{canEdit:()=>false,contextMessage:()=> 'Blocked'},reload:()=>{},reset:()=>{},confirmLeave:()=>true}};
  if(cache.has(file)) return cache.get(file).exports;
  const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  assert.deepEqual(out.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
  const m={exports:{}};cache.set(file,m);
  const requireLocal=name=>{
    if(name==='react/jsx-runtime') return {jsx:(type,props,key)=>({type,props:props||{},key}),jsxs:(type,props,key)=>({type,props:props||{},key}),Fragment:'fragment'};
    if(name==='react') return {useState:x=>[typeof x==='function'?x():x,()=>{}],useRef:x=>({current:x}),useEffect:()=>{},useMemo:f=>f(),useCallback:f=>f};
    if(name==='next/link') return {__esModule:true,default:props=>({type:'a',props})};
    if(name==='next/navigation') return {usePathname:()=>pathname,useRouter:()=>({push:()=>{},refresh:()=>{}})};
    assert.ok(name.startsWith('.'),'Unexpected external dependency: '+name);
    const base=path.resolve(path.dirname(file),name);
    return load(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx');
  };
  vm.runInNewContext(out.outputText,{module:m,exports:m.exports,require:requireLocal,Date,Intl,Number,String,Object,Array,Set,Map,JSON,BigInt,Promise,Error,TextEncoder},{filename:file,timeout:1500});
  return m.exports;
 }
 return load;
}
const load=realm();const present=load('src/entities/horse-offer/model/ownerPresentation.ts').getOwnerHorsePresentation;
function render(element) {
 if(element===null||element===undefined||element===false||element===true)return [];
 if(Array.isArray(element))return element.flatMap(render);
 if(typeof element!=='object')return [String(element)];
 if(typeof element.type==='function')return render(element.type(element.props));
 return [{type:element.type,props:element.props,children:render(element.props.children)}];
}
function all(nodes){return nodes.flatMap(n=>typeof n==='string'?[]:[n,...all(n.children)]);}
function text(nodes){return nodes.map(n=>typeof n==='string'?n:text(n.children)).join(' ');}
function tree(module,opts){const l=realm(opts);return render(l(module).default({offerId:ID}));}

test('wanted uses nested budget and deduplicated search area; source remains unchanged',()=>{
 const d=detail();const before=plain(d);const p=present(d);assert.equal(normal(p.priceLabel),'Eelarve kuni 5 000 €');
 assert.equal(p.priceHeading,'Ostueelarve');assert.equal(p.locationHeading,'Otsingupiirkond');assert.equal(p.locationLabel,'Rapla maakond');assert.equal(p.warning,null);assert.deepEqual(plain(d),before);
});
test('flexible budget is not a seller price agreement',()=>{const d=detail();d.details.wanted.budget={mode:'contact',currency:'EUR'};assert.equal(present(d).priceLabel,'Eelarve on paindlik');});
test('maximum zero is a budget, not free horse transfer',()=>{const d=detail();d.details.wanted.budget.amount=0;assert.equal(normal(present(d).priceLabel),'Eelarve kuni 0 €');});
for(const amount of [null,undefined,'5000',-1,Infinity,NaN,1.001,10000000000]) test('invalid budget amount is not guessed: '+String(amount),()=>{
 const d=detail();d.details.wanted.budget.amount=amount;d.priceAmount=999;d.priceType='fixed';assert.equal(present(d).priceLabel,'Eelarve vajab kontrollimist');assert.ok(present(d).warning);
});
for(const mutation of [d=>{d.details.schema_version=2;},d=>{d.details.branch='specific';},d=>{d.details.wanted=[];},d=>{d.details.wanted.budget.currency='USD';},d=>{d.details.wanted.budget.mode='anything';}]) test('unsupported nested shape/currency/mode is visibly unsupported',()=>{
 const d=detail();mutation(d);assert.ok(present(d).warning);assert.equal(present(d).priceLabel,'Eelarve vajab kontrollimist');
});
test('contact plus stale amount is not silently displayed as flexible',()=>{const d=detail();d.details.wanted.budget.mode='contact';assert.ok(present(d).warning);});
for(const [area,expected] of [
 [{country_code:'EE',region:'Rapla maakond'},'Rapla maakond'],
 [{country_code:'EE',city_or_municipality:'  Rapla  ',region:'Rapla maakond'},'Rapla · Rapla maakond'],
 [{country_code:'EE'},'Otsingupiirkond lisamata'],
 [{country_code:'FI',city_or_municipality:'Helsinki'},'Otsingupiirkond vajab kontrollimist'],
 [{country_code:'EE',region:{}},'Otsingupiirkond vajab kontrollimist'],
]) test('search area presentation: '+expected,()=>{const d=detail();d.details.wanted.search_area=area;assert.equal(present(d).locationLabel,expected);});
test('wanted never falls back to seller facts, exact location, seller price or health',()=>{
 const d=detail();Object.assign(d,{horseName:'SECRET HORSE',city:'SECRET CITY',region:'SECRET REGION',locationText:'SECRET ADDRESS',horseLat:99,horseLng:999,healthNotes:'SECRET HEALTH',behaviorNotes:'SECRET BEHAVIOR',priceAmount:7777,priceType:'fixed'});
 d.details.wanted.preferred_breed='Soovitud tõug';d.details.wanted.preferred_discipline='harrastus';d.details.wanted.preferred_training_level='algõpe';d.details.wanted.intended_use='matkad';d.details.wanted.health_preferences='otsija terviseeelistus';d.details.wanted.behavior_preferences='rahulik';
 const p=present(d);assert.doesNotMatch(JSON.stringify(p),/SECRET|7777/);assert.ok(p.basics.some(x=>x.value==='Soovitud tõug'));assert.ok(p.use.some(x=>x.value==='matkad'));assert.ok(p.disclosures.some(x=>x.value==='rahulik'));
});
test('seller branch still reads seller fields even with unrelated nested wanted data',()=>{
 const d=detail('sale');Object.assign(d,{priceAmount:20000,priceType:'fixed',city:'Tartu linn',region:'Tartu maakond',horseName:'Hobune',healthNotes:'Avaldaja kirjeldus'});
 const p=present(d);assert.equal(normal(p.priceLabel),'20 000 €');assert.equal(p.locationLabel,'Tartu linn · Tartu maakond');assert.equal(p.isWanted,false);assert.equal(p.basics[0].value,'Hobune');
});
test('free transfer stays free; from-price is labelled',()=>{const d=detail('free_transfer');assert.equal(present(d).priceLabel,'Tasuta');d.offerType='sale';d.priceType='from';d.priceAmount=500;assert.equal(normal(present(d).priceLabel),'Alates 500 €');});
test('pure read presentation passes strict TypeScript checking',()=>{
 const opts={strict:true,noEmit:true,skipLibCheck:true,target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,types:[],lib:['lib.esnext.d.ts','lib.dom.d.ts']};
 const program=ts.createProgram([path.join(root,'src/entities/horse-offer/model/ownerPresentation.ts')],opts);
 const errors=ts.getPreEmitDiagnostics(program).filter(x=>x.category===ts.DiagnosticCategory.Error);
 assert.equal(errors.length,0,ts.formatDiagnostics(errors,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));
});
for(const kind of ['Detail','Edit'])test(kind+' wrapper composes actual shared shell once, with identity button and one main (synthetic hooks/JSX)',()=>{
 const pathname='/v2/my-area/horse-offers/'+ID+(kind==='Edit'?'/edit':'');
 const nodes=tree('components/v2/my-area/V2HorseOffer'+kind+'Page.tsx',{pathname});
 assert.equal(all(nodes).filter(n=>n.type==='main').length,1);
 assert.equal(all(nodes).filter(n=>n.type==='button'&&n.props['aria-label']==='Vaheta aktiivset identiteeti').length,1);
 assert.match(text(nodes),/Test identity/);
});
test('wanted detail element tree displays nested summary and no future-edit claim',()=>{
 const nodes=tree('components/v2/my-area/V2HorseOfferDetailPage.tsx',{});const words=normal(text(nodes));
 assert.match(words,/Eelarve kuni 5 000 €/);assert.match(words,/Ostueelarve/);assert.match(words,/Otsingupiirkond: Rapla maakond/);
 assert.doesNotMatch(words,/Hind kokkuleppel|Asukoht lisamata|Muutmine, avaldamine/);assert.match(words,/Muuda mustandit/);
});
for(const state of [{detail:null,isLoading:true},{detail:null,isLoading:false,isNotFound:true},{detail:null,isLoading:false,isNotFound:false,errorMessage:'Read failed'}])test('detail loading/not-found/error retains one shared identity button',()=>{
 const nodes=tree('components/v2/my-area/V2HorseOfferDetailPage.tsx',{detailState:{reload:()=>{},...state}});
 assert.equal(all(nodes).filter(n=>n.type==='main').length,1);assert.equal(all(nodes).filter(n=>n.props['aria-label']==='Vaheta aktiivset identiteeti').length,1);
});
test('editor blocked identity presentation does not display saved title and fields',()=>{
 const state={context:'blocked',work:'idle',snapshot:{detail:detail()},closed:false};
 const nodes=tree('components/v2/my-area/V2HorseOfferEditPage.tsx',{pathname:'/v2/my-area/horse-offers/'+ID+'/edit',editorState:{state,session:{canEdit:()=>false,contextMessage:()=> 'Õige identiteet vajalik'},confirmLeave:()=>true}});
 assert.doesNotMatch(text(nodes),/Test title|Test description/);assert.match(text(nodes),/Õige identiteet vajalik/);assert.equal(all(nodes).filter(n=>n.type==='main').length,1);
});
test('list read model explicitly says detail-only, without copying nonexistent budget/location',()=>{
 const mapper=load('src/features/my-area/model/mapMyAreaMarketplaceItemRow.ts').mapMyAreaMarketplaceItemRow;
 const item={contentType:'horse_offer',contentVariant:'wanted',contentId:ID,title:'Wanted',sourceStatus:'draft',lifecycleStatus:'draft',priceAmount:null,priceType:'contact',priceText:null,currency:'EUR',locationLabel:null,city:null,region:null,activeUntil:null};
 const before=plain(item);const row=mapper(item);assert.equal(row.priceLabel,'Eelarve detailvaates');assert.equal(row.locationLabel,'Otsingupiirkond detailvaates');assert.equal(row.priceAmount,null);assert.deepEqual(plain(item),before);
 const nodes=render(load('src/features/my-area/components/MyAreaHorseOfferRow.tsx').default({item:row}));assert.match(text(nodes),/Muutmine detailis/);assert.doesNotMatch(text(nodes),/Ainult vaade|Hind kokkuleppel|Asukoht täpsustamata/);
});
test('ordinary listing mapping and horse sale mapping retain prices, location and action boundaries',()=>{
 const mapper=load('src/features/my-area/model/mapMyAreaMarketplaceItemRow.ts').mapMyAreaMarketplaceItemRow;
 const base={contentId:'7',priceAmount:1234,priceType:'fixed',priceText:null,currency:'EUR',locationLabel:'Tartu',activeUntil:null,sourceStatus:'active'};
 const listing=mapper({...base,contentType:'listing'});const horse=mapper({...base,contentId:ID,contentType:'horse_offer',contentVariant:'sale'});
 const expected=normal(new Intl.NumberFormat('et-EE',{maximumFractionDigits:2}).format(1234)+' €');assert.equal(normal(listing.priceLabel),expected);assert.equal(normal(horse.priceLabel),expected);assert.equal(listing.locationLabel,'Tartu');assert.equal(horse.locationLabel,'Tartu');assert.equal(listing.canChangeStatus,true);assert.equal(horse.canChangeStatus,false);
});
test('non-draft horse list does not advertise editing',()=>{
 const nodes=render(load('src/features/my-area/components/MyAreaHorseOfferRow.tsx').default({item:{contentId:ID,sourceStatus:'published',lifecycleStatus:'active',title:'Published',priceLabel:'1 €',daysLeft:null}}));assert.match(text(nodes),/Ainult vaade/);assert.doesNotMatch(text(nodes),/Muutmine detailis/);
});
test('targeted view modules have no new RPC, mutation, local storage or per-row fetching',()=>{
 for(const file of ['src/entities/horse-offer/model/ownerPresentation.ts','src/features/horse-offer-detail/components/OwnerHorseDetailCard.tsx','src/features/horse-offer-detail/components/OwnerHorseOfferDetailPage.tsx','src/features/my-area/components/MyAreaHorseOfferRow.tsx','src/features/my-area/model/mapMyAreaMarketplaceItemRow.ts']) {
  const text=fs.readFileSync(path.join(root,file),'utf8');assert.doesNotMatch(text,/\.rpc\(|\.from\(|\.insert\(|\.update\(|\.delete\(|\bfetch\(|localStorage|sessionStorage/);
 }
});
