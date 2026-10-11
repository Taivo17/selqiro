/* Actual source, no network. Pure model + synthetic React cells/JSX; not React DOM or SQL. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const M = 'src/features/listing-create/model/', C = 'src/features/listing-create/components/';
const json = v => JSON.parse(JSON.stringify(v));
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(text).join(' ') : node && typeof node === 'object' ? text(node.props?.children) : '';
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(n => nodes(n, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
function realm() {
  const cache = new Map(), cells = [], calls = { horse: [], confirm: [] };
  let cell = 0, confirm = true;
  const mocks = new Set(['ListingCreateContentTypeSelector','HorseOfferTypeSelector','HorseOfferBasicFields',
    'HorseOfferUseFields','HorseOfferDisclosureFields','HorseOfferPriceFields','HorseOfferLocationFields',
    'HorseOfferDraftSaveAction','HorseOfferPublicationGate','ListingCreateAiAnalysisCard','ListingCreateTextFields','ListingCreateImageFields']);
  function load(name) {
    const file = path.resolve(root, name), rel = path.relative(root, file).split(path.sep).join('/');
    assert.ok(file.startsWith(root + path.sep));
    if (rel === M+'useHorseOfferDraftSave.ts') return {useHorseOfferDraftSave:(user, input)=>{ calls.horse.push(json([user,input])); return {typeLocked:false}; }};
    if (rel.startsWith(C) && mocks.has(path.basename(rel,'.tsx'))) return {__esModule:true,default:props=>({type:path.basename(rel,'.tsx'),props})};
    assert.ok(rel.startsWith(M) || rel.startsWith(C) || rel.startsWith('lib/categories') || rel.startsWith('lib/categoryFields')
      || rel==='lib/geography/countries.ts' || rel.startsWith('src/entities/listing/model/')
      || rel==='src/shared/currency/listingCurrencies.generated.ts' || rel.startsWith('src/entities/horse-offer/model/'), rel);
    if (cache.has(file)) return cache.get(file).exports;
    const module={exports:{}}; cache.set(file,module);
    const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,
      compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
    assert.equal(output.diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
    function req(spec) {
      if(spec==='react')return {useState(initial){const i=cell++; if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;
        return[cells[i],v=>{cells[i]=typeof v==='function'?v(cells[i]):v;}];}};
      if(spec==='react/jsx-runtime')return{jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})};
      assert.ok(spec.startsWith('.'),'No runtime service allowed: '+spec);
      const base=path.resolve(path.dirname(file),spec), next=[base+'.ts',base+'.tsx'].find(p=>fs.existsSync(p));
      assert.ok(next,spec);return load(next);
    }
    vm.runInNewContext(output.outputText,{module,exports:module.exports,require:req,Object,Array,String,Number,Boolean,
      Error,TypeError,Map,Set,JSON,RegExp,Math,TextEncoder,BigInt,Date,
      window:{confirm:message=>{calls.confirm.push(message);return confirm;}}},{filename:file,timeout:1500});
    return module.exports;
  }
  function expand(node) {
    if(Array.isArray(node))return node.map(expand);
    if(!node || typeof node!=='object')return node;
    if(typeof node.type==='function')return expand(node.type(node.props));
    return {...node,props:{...node.props,children:expand(node.props?.children)}};
  }
  return{load,calls,setConfirm:v=>{confirm=v;},render(name,props){cell=0;return expand(load(C+name+'.tsx').default(props));}};
}
const r=realm(), m=r.load(M+'ordinaryListingFields.ts'), input=r.load(M+'ordinaryListingInput.ts');
const price=r.load('src/entities/listing/model/listingPriceInput.ts');
function draft(extra={}) {return {...m.createOrdinaryListingFieldState(),categoryPath:['vehicles','trucks_commercial','trucks'],
  condition:'used',priceKind:'fixed',amountInput:'123,40',currencyInput:'EUR',country:'Estonia',city:'Paide',...extra};}
const prepare=(state=draft(),title='Test title',description='Test description')=>input.buildOrdinaryListingInput(state,title,description);
const paths=JSON.parse(fs.readFileSync(path.join(root,'supabase/labs/listing-price-integration-v1/creation-category-paths.v1.json'),'utf8')).paths;
for (const p of paths) test('exact taxonomy path and applicable input: '+p.join('/'),()=>{
  assert.ok(m.ordinaryCategoryNodes(p));
  const complete=m.ordinaryCategoryIsComplete(p);
  if(!complete) {assert.throws(()=>prepare(draft({categoryPath:p})));return;}
  const fields=m.ordinaryDetailFields(p); assert.equal(new Set(fields.map(f=>f.key)).size,fields.length);
  const values=Object.fromEntries(fields.map(f=>[f.key,'test 12 in']));
  const out=prepare(draft({categoryPath:p,detailValues:values}));
  assert.deepEqual(json(out.category_path),p);assert.ok(Object.keys(out.details).length<=64);
  for(const f of fields) assert.equal(out.attributes[f.key] ?? out.details[f.key],'test 12 in',f.key);
  assert.ok(!Object.hasOwn(out.details,'condition'));
});
test('frozen server path inventory still matches the current tree exactly',()=>{
  const actual=[];function walk(items,p=[]){for(const n of items){const a=[...p,n.value];actual.push(a);walk(n.children??[],a);}}
  walk(m.ORDINARY_CATEGORY_TREE);assert.deepEqual(json(actual),paths);
});
for(const p of [[],['vehicles','trucks'],['vehicles','cars','trucks'],['horse'],['constructor'],['__proto__'],[null],['vehicles','cars','passenger_cars','bad']]) {
 test('reject incomplete or foreign path '+JSON.stringify(p),()=>assert.throws(()=>prepare(draft({categoryPath:p}))));
}
test('wire shape matches the existing row contract with no status, actor or URLs',()=>{
 const out=json(prepare());const old=JSON.parse(fs.readFileSync(path.join(root,'supabase/labs/listing-price-integration-v1/tests/creation/valid-input.json'),'utf8'));
 assert.deepEqual(Object.keys(out).sort(),Object.keys(old).sort());
 assert.deepEqual(Object.keys(out.attributes).sort(),Object.keys(old.attributes).sort());
 assert.deepEqual(out.basics,old.basics);assert.deepEqual(out.price,{kind:'fixed',amount:'123.4',currency:'EUR'});
 assert.deepEqual(out.location,{country:'Estonia',city:'Paide',latitude:null,longitude:null});
 for(const key of ['id','user_id','identity_id','status','created_at','active_until','image','ai_status','request_key','policy_acceptance'])assert.ok(!Object.hasOwn(out,key));
 assert.equal(out.language,'et');
});
test('huge amount stays exact; country never sets or changes currency',()=>{
 const out=prepare(draft({amountInput:'999999999999999999,999',currencyInput:'KWD',country:'Japan'}));
 assert.equal(out.price.amount,'999999999999999999.999');assert.equal(out.price.currency,'KWD');
 assert.throws(()=>prepare(draft({currencyInput:''})));
});
for(const [kind,label] of [['free','Tasuta'],['negotiable','Hind kokkuleppel'],['unspecified','Hinda ei lisa']]) test('explicit '+kind+' is not zero or an inferred currency',()=>{
 const state=m.selectOrdinaryPriceKind(draft(),kind);const out=prepare(state);
 assert.deepEqual(json(out.price),{kind,amount:null,currency:null});
 assert.equal(state.amountInput,'');assert.equal(state.currencyInput,'');
 const view=realm().render('OrdinaryListingPriceFields',{value:state,onChange:()=>{}});
 assert.ok(text(view).includes(label));assert.equal(nodes(view,n=>n.type==='input').length,0);
});
test('fixed zero remains fixed and precision errors never round',()=>{
 assert.deepEqual(json(prepare(draft({amountInput:'0',currencyInput:'JPY'})).price),{kind:'fixed',amount:'0',currency:'JPY'});
 assert.throws(()=>prepare(draft({amountInput:'25,50',currencyInput:'JPY'})));
 assert.throws(()=>prepare(draft({amountInput:'1,234.56'})));
});
test('prose/details retain units; mirrored attributes have one source',()=>{
 const state=draft({detailValues:{engine:' V8 ',power:'90 kW',mileage:'120000 mi',model:'Gaz 53'}});
 const out=prepare(state,'A 12 inch item','Size 120 cm, text stays');
 assert.equal(out.basics.title,'A 12 inch item');assert.equal(out.basics.description,'Size 120 cm, text stays');
 assert.equal(out.details.power,'90 kW');assert.equal(out.details.mileage,'120000 mi');
 assert.equal(out.attributes.engine,' V8 ');assert.ok(!Object.hasOwn(out.details,'engine'));
 assert.equal(state.detailValues.engine,' V8 ');
});
for(const key of ['bogus','detailCategory','__proto__','constructor','price','identity_id'])test('reject foreign detail '+key,()=>{
 const detailValues=JSON.parse('{"'+key+'":"x"}');assert.throws(()=>prepare(draft({detailValues})));
});
test('category change clears only confirmed category-specific details',()=>{
 const before=draft({detailValues:{power:'90KW'}}), copy=json(before);
 const changed=m.selectOrdinaryCategory(before,1,'cars');
 assert.deepEqual(json(changed.categoryPath),['vehicles','cars']);assert.deepEqual(json(changed.detailValues),{});
 for(const key of ['priceKind','amountInput','currencyInput','country','city','condition'])assert.equal(changed[key],before[key]);
 assert.deepEqual(json(before),copy);assert.equal(m.selectOrdinaryCategory(before,2,'trucks'),before);
 assert.throws(()=>m.selectOrdinaryCategory(before,2,'constructor'));assert.throws(()=>m.selectOrdinaryCategory(before,3,'bad'));
});
test('category cancellation keeps the controlled selection and field text',()=>{
 const harness=realm();let state=draft({detailValues:{power:'90 kW'}});harness.setConfirm(false);
 let tree=harness.render('OrdinaryListingCategoryFields',{value:state,onChange:v=>{state=v;}});
 nodes(tree,n=>n.props.id==='ordinary-category-1')[0].props.onChange({target:{value:'cars'}});
 assert.equal(state.categoryPath[1],'trucks_commercial');assert.equal(state.detailValues.power,'90 kW');assert.equal(harness.calls.confirm.length,1);
 harness.setConfirm(true);nodes(tree,n=>n.props.id==='ordinary-category-1')[0].props.onChange({target:{value:'cars'}});
 assert.equal(state.categoryPath[1],'cars');assert.deepEqual(json(state.detailValues),{});
});
for(const [extra,title,description] of [
 [{condition:''},'Valid','Description'],[{country:''},'Valid','Description'],[{city:' \n'},'Valid','Description'],
 [{},'x','Description'],[{},'x'.repeat(141),'Description'],[{},'Valid',''],[{},'Valid','x'.repeat(5001)],
 [{},'ab\0','Description'],[{},'Valid','bad\ud800'],[{detailValues:{power:'bad\0'}},'Valid','Description'],
 [{detailValues:{engine:'a'.repeat(161)}},'Valid','Description'],[{detailValues:{power:'a'.repeat(1001)}},'Valid','Description'],
 [{country:'a'.repeat(121)},'Valid','Description'],[{city:'a'.repeat(161)},'Valid','Description'],
]) test('input rejects bad field set '+JSON.stringify(extra).slice(0,48)+' '+title.slice(0,12)+' '+description.slice(0,12),()=>{
 assert.throws(()=>prepare(draft(extra),title,description));
});
test('preparing input never mutates source draft or raw user prose',()=>{
 const state=draft(), before=json(state), title='  Test\t title ',description='  Test\n description  ';
 const out=prepare(state,title,description);assert.deepEqual(json(state),before);
 assert.equal(out.basics.title,'Test title');assert.equal(out.basics.description,'Test\n description');
});
test('all generated currencies and exact field event values are offered',()=>{
 const h=realm();let state=draft();let tree=h.render('OrdinaryListingPriceFields',{value:state,onChange:v=>{state=v;}});
 const currency=nodes(tree,n=>n.props.id==='ordinary-price-currency')[0];assert.equal(nodes(currency,n=>n.type==='option').length,155);
 const amount=nodes(tree,n=>n.props.id==='ordinary-price-amount')[0];assert.equal(amount.props.type,'text');assert.equal(amount.props.inputMode,'decimal');
 amount.props.onChange({target:{value:'1,'}});assert.equal(state.amountInput,'1,');
 tree=h.render('OrdinaryListingPriceFields',{value:state,onChange:v=>{state=v;}});
 assert.equal(nodes(tree,n=>n.props['data-price-preview']!==undefined).length,0);assert.ok(text(tree).includes('Sisesta summa'));
});
test('currency change shows precision error without mutating amount; valid preview is explicit',()=>{
 const h=realm();let state=draft({amountInput:'25,50'});
 let tree=h.render('OrdinaryListingPriceFields',{value:state,onChange:v=>{state=v;}});assert.ok(text(tree).includes('25,5 EUR'));
 nodes(tree,n=>n.props.id==='ordinary-price-currency')[0].props.onChange({target:{value:'JPY'}});
 assert.equal(state.amountInput,'25,50');tree=h.render('OrdinaryListingPriceFields',{value:state,onChange:v=>{state=v;}});
 assert.ok(text(tree).includes('liiga palju komakohti'));assert.ok(!text(tree).includes('25 JPY'));
});
test('country suggestions do not restrict a manually entered country or trigger geocoding',()=>{
 const h=realm();let state=draft();let tree=h.render('OrdinaryListingLocationFields',{value:state,onChange:v=>{state=v;}});
 nodes(tree,n=>n.props.id==='ordinary-country')[0].props.onChange({target:{value:'New Zealand'}});
 assert.equal(state.country,'New Zealand');assert.equal(state.currencyInput,'EUR');
 assert.equal(prepare(state).location.latitude,null);
});
test('detail fields stay free text and labels are actual registry labels',()=>{
 const h=realm();let state=draft();const tree=h.render('OrdinaryListingDetailFields',{value:state,onChange:v=>{state=v;}});
 assert.ok(text(tree).includes('Võimsus'));const power=nodes(tree,n=>n.props.id==='ordinary-detail-power')[0];
 assert.equal(power.props.type,'text');power.props.onChange({target:{value:'90KW'}});assert.equal(state.detailValues.power,'90KW');
 assert.equal(prepare(state).details.power,'90KW');
});
for(const valid of [false,true])test('publication button remains explicitly disabled even when input is valid: '+valid,()=>{
 const tree=realm().render('OrdinaryListingPreview',{value:valid?draft():m.createOrdinaryListingFieldState(),title:'Test title',description:'Test description'});
 const button=nodes(tree,n=>n.type==='button')[0];assert.equal(button.props.disabled,true);assert.equal(button.props.type,'button');
 assert.equal(button.props.onClick,undefined);assert.ok(text(tree).includes('Andmeid ja pilte ei saadeta serverisse'));
 assert.equal(nodes(tree,n=>n.props['data-ordinary-input-valid']!==undefined)[0].props['data-ordinary-input-valid'],String(valid));
});
test('ordinary form has no legacy CTA or paid category-helper card; controlled horse branch is preserved',()=>{
 const h=realm();const render=()=>h.render('ListingCreateForm',{userId:'user-a'});
 let tree=render();assert.ok(nodes(tree,n=>n.props['data-ordinary-listing-fields']!==undefined).length);
 assert.ok(!text(tree).includes('25 Energy'));assert.equal(nodes(tree,n=>n.props.href==='/sell').length,0);
 const get=(type)=>nodes(tree,n=>n.type===type)[0];
 const props={value:'Original text',source:'user'};
 get('ListingCreateTextFields').props.setTitle(props);
 nodes(tree,n=>n.props.id==='ordinary-price-amount')[0].props.onChange({target:{value:'250'}});
 tree=render();get('ListingCreateContentTypeSelector').props.onChange('horse_offer');tree=render();
 assert.equal(nodes(tree,n=>n.props['data-ordinary-listing-fields']!==undefined).length,0);
 assert.ok(get('ListingCreateAiAnalysisCard'));assert.equal(get('ListingCreateTextFields').props.title.value,'Original text');
 get('HorseOfferTypeSelector').props.onChange('wanted');tree=render();
 assert.equal(get('HorseOfferPriceFields').props.offerType,'wanted');assert.ok(get('HorseOfferDraftSaveAction'));assert.ok(get('HorseOfferPublicationGate'));
 assert.ok(!JSON.stringify(h.calls.horse.at(-1)).includes('250'));
 get('ListingCreateContentTypeSelector').props.onChange('listing');tree=render();
 assert.equal(nodes(tree,n=>n.props.id==='ordinary-price-amount')[0].props.value,'250');
 assert.equal(get('ListingCreateTextFields').props.title.value,'Original text');assert.equal(h.calls.horse.at(-1)[1],null);
});
test('strict actual pure-model typecheck; no declarations replacing implementation',()=>{
 const options={strict:true,noEmit:true,target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,
   moduleResolution:ts.ModuleResolutionKind.Node10,skipLibCheck:true,types:[],lib:['lib.esnext.d.ts','lib.dom.d.ts']};
 const program=ts.createProgram([M+'ordinaryListingFields.ts',M+'ordinaryListingInput.ts',
   'src/entities/listing/model/listingCreationInput.ts'].map(f=>path.join(root,f)),options);
 const errors=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.equal(errors.length,0,ts.formatDiagnosticsWithColorAndContext(errors,{getCurrentDirectory:()=>root,getCanonicalFileName:x=>x,getNewLine:()=> '\n'}));
});
test('oversized escaped basics and multi-byte detail payload are refused before any command',()=>{
 assert.throws(()=>prepare(draft(),'Title','\u001a'.repeat(5000)));
 const fields=m.ordinaryDetailFields(['vehicles','trucks_commercial','trucks']);
 const detailValues=Object.fromEntries(fields.map(f=>[f.key,'😀'.repeat(input.ordinaryDetailMaxLength(f.key))]));
 assert.throws(()=>prepare(draft({detailValues})),/kogumaht/);
});
test('new field modules have no transport, storage, AI, automatic ID or persisted-draft implementation',()=>{
 const modules=['ordinaryListingFields','ordinaryListingInput'].map(n=>M+n+'.ts')
   .concat(['OrdinaryListingFields','OrdinaryListingCategoryFields','OrdinaryListingPriceFields','OrdinaryListingLocationFields',
     'OrdinaryListingDetailFields','OrdinaryListingPreview'].map(n=>C+n+'.tsx'));
 for(const f of modules) assert.doesNotMatch(fs.readFileSync(path.join(root,f),'utf8'),
   /supabaseBrowserClient|\bfetch\s*\(|\.rpc\s*\(|\.storage\b|\blocalStorage\b|\bsessionStorage\b|randomUUID\s*\(/,f);
});
