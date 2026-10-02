/* Actual source modules with an isolated fake Supabase transport and hook lifecycle.
 * No network, database, React DOM, full application build or browser is exercised. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const E = 'src/entities/listing/';
const F = 'src/features/listing-edit/model/';
const U = 'user-a', I = 'identity-a';
const plain = value => JSON.parse(JSON.stringify(value));
function realm(overrides = {}) {
  const cache = new Map();
  function load(rel) {
    const file = path.resolve(root, rel), name = path.relative(root, file).split(path.sep).join('/');
    assert.ok(file.startsWith(root + path.sep));
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === 'src/shared/supabase/browserClient.ts') throw Error('An explicit fake transport is required');
    if (cache.has(file)) return cache.get(file).exports;
    const source = fs.readFileSync(file, 'utf8');
    const out = ts.transpileModule(source, { fileName: file, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS } });
    assert.deepEqual(out.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error), []);
    const module = { exports: {} }; cache.set(file, module);
    const requireLocal = spec => {
      if (spec === 'react') { assert.ok(overrides.react, 'Hook fixture required'); return overrides.react; }
      assert.ok(spec.startsWith('.'), 'External import blocked: ' + spec);
      return load(path.resolve(path.dirname(file), spec) + '.ts');
    };
    vm.runInNewContext(out.outputText, { module, exports: module.exports, require: requireLocal,
      Intl, Number, String, Object, Array, Set, Map, JSON, Promise, Error }, { filename: file, timeout: 1500 });
    return module.exports;
  }
  return load;
}
function hooks() {
  const cells = [], effects = [], deps = [];
  let index = 0;
  const equal = (a,b) => a && b && a.length === b.length && a.every((v,i) => Object.is(v,b[i]));
  const react = {
    useState(init) { const i=index++; if (!(i in cells)) cells[i]=typeof init==='function'?init():init;
      return [cells[i], next => { cells[i]=typeof next==='function'?next(cells[i]):next; }]; },
    useMemo(fn, d) { const i=index++; if (!equal(deps[i],d)) { cells[i]=fn(); deps[i]=d; } return cells[i]; },
    useEffect(fn, d) { const i=index++; if (!equal(deps[i],d)) { deps[i]=d; effects.push(fn); } },
  };
  return { react, render(fn) { index=0; const result=fn(); while(effects.length) effects.shift()(); return result; } };
}
function transport(values = {}) {
  let row = { id:'123', identity_id:I, user_id:U, title:'Algne pealkiri', description:'Algne tekst',
    price:'5578', price_amount:5578, condition:'used', category:'tools', subcategory:null,
    details:{ brand:'Katse' }, status:'active', active_until:'2026-12-28T15:29:00Z',
    created_at:'2026-01-01T00:00:00Z', image:'unchanged.jpg', ...values };
  const calls = { reads:0, updates:[], equalities:[] };
  let readError=null, writeError=null;
  const client = { from(table) {
    assert.equal(table, 'listings');
    return { select() { return { eq(key,id) { assert.equal(key,'id'); assert.equal(id,'123');
      return { maybeSingle:async()=>{ calls.reads++; return { data:row,error:readError }; } }; } }; },
      update(payload) { calls.updates.push(plain(payload)); return { eq:async(key,id)=>{
        calls.equalities.push([key,id]); if (!writeError) row={...row,...plain(payload)}; return {error:writeError}; } }; } };
  } };
  return { client, calls, getRow:()=>row, setRow:v=>{row=v;}, readError:v=>{readError=v;}, writeError:v=>{writeError=v;} };
}
function input(extra={}) { return {listingId:'123',userId:U,activeIdentityId:I,title:'Parandatud pealkiri',
  description:'Parandatud tekst',condition:'used',category:'tools',subcategory:null,details:{brand:'Katse'},...extra}; }
function setup(values={}) {
  const db=transport(values), h=hooks();
  const load=realm({react:h.react,'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:db.client}});
  const api=load(E+'api/updateListingBasics.ts').updateListingBasics;
  const read=load(E+'api/getEditableListingById.ts').getEditableListingById;
  const hook=load(F+'useListingBasicsForm.ts').useListingBasicsForm;
  let listing=load(E+'api/mappers.ts').mapListingDetailRow(db.getRow());
  const render=()=>h.render(()=>hook({listing,userId:U,activeIdentityId:I})); render();
  return {db,api,read,load,render,setListing:x=>{listing=x;}};
}
const load=realm(), mapper=load(E+'api/mappers.ts').mapListingDetailRow;
const model=load(F+'listingBasicsForm.ts');
const rawCases=['5578','130.','0','00012.3400','  5\u00a0578,12 SEK  ','Hind kokkuleppel','Tasuta','100 USD','1.234,56 EUR','0.00000001 BTC',''];
for(const raw of rawCases) test('raw text survives mapper and form exactly: '+JSON.stringify(raw),()=>{
  const detail=mapper({id:'123',price:raw,price_amount:999,currency:null});
  assert.equal(detail.rawPrice,raw);
  detail.priceLabel='≈ 90 €'; // Viewer display can NEVER be the input source.
  assert.equal(model.buildInitialListingBasicsForm(detail).price,raw);
  assert.deepEqual(plain(model.listingPriceEditPatch(raw,raw)),{});
});
for(const [amount,want] of [[1200,'1200'],[0,'0'],['9007199254740993.123456','9007199254740993.123456'],[null,''],[undefined,''],[NaN,''],[Infinity,'']])
 test('amount-only fallback is unformatted; untouched patch is absent: '+String(amount),()=>{
  const detail=mapper({id:'123',price:null,price_amount:amount});
  const f=model.buildInitialListingBasicsForm(detail);
  assert.equal(detail.rawPrice,null);assert.equal(f.price,want);
  assert.deepEqual(plain(model.listingPriceEditPatch(f.price,f.price)),{});
 });
test('explicit empty price text is not replaced by numeric fallback',()=>{
  assert.equal(model.buildInitialListingBasicsForm(mapper({id:'123',price:'',price_amount:1200})).price,'');
});
test('missing listing has honest empty inputs',()=>{
  assert.deepEqual(plain(model.buildInitialListingBasicsForm(null)),{title:'',description:'',price:'',condition:'used'});
});
for(const [before,after] of [['5578','6000'],['5578',''],['','0'],['100 USD','100 SEK'],['100',' 100 ']])
 test('only explicit text change includes the legacy price field: '+before+' -> '+after,()=>{
  assert.deepEqual(plain(model.listingPriceEditPatch(after,before)),{price:after});
 });
for(const raw of rawCases) test('real hook title-only save preserves both original price columns: '+JSON.stringify(raw),async()=>{
  const s=setup({price:raw,price_amount:'9007199254740993.123456'});
  const before=plain(s.db.getRow()); let form=s.render();
  assert.equal(form.form.price,raw);assert.equal(form.dirty,false);
  form.setField('title','Uus pealkiri');form=s.render();await form.save();
  assert.equal(s.db.calls.updates.length,1);
  assert.ok(!Object.hasOwn(s.db.calls.updates[0],'price'));
  assert.ok(!Object.hasOwn(s.db.calls.updates[0],'price_amount'));
  for(const key of ['price','price_amount','status','active_until','created_at','identity_id','image']) assert.equal(s.db.getRow()[key],before[key]);
  assert.equal(s.render().dirty,false);assert.equal(s.render().saved,true);
});
for(const amount of [0,1200,'9007199254740993.123456',null])test('amount-only row title save does not invent stored price text: '+String(amount),async()=>{
  const s=setup({price:null,price_amount:amount});let f=s.render();f.setField('title','Uus pealkiri');await s.render().save();
  assert.equal(s.db.getRow().price,null);assert.equal(s.db.getRow().price_amount,amount);
});
test('change then revert is not a price mutation even when description changes',async()=>{
  const s=setup();let f=s.render();f.setField('price','6000');f=s.render();f.setField('price','5578');
  f=s.render();f.setField('description','Ainult tekst');await s.render().save();
  assert.ok(!Object.hasOwn(s.db.calls.updates[0],'price'));
});
test('explicit price change keeps the existing parser and price-only column semantics',async()=>{
  const s=setup();s.render().setField('price','  125,50 USD  ');await s.render().save();
  assert.equal(s.db.getRow().price,'125,50 USD');assert.equal(s.db.getRow().price_amount,125.5);
  assert.ok(!Object.hasOwn(s.db.calls.updates[0],'currency'));assert.equal(s.db.getRow().status,'active');
});
test('explicit clearing remains clearing, not zero or a fabricated currency',async()=>{
  const s=setup();s.render().setField('price','');await s.render().save();
  assert.equal(s.db.getRow().price,'');assert.equal(s.db.getRow().price_amount,null);
});
test('a successful price edit becomes the comparison base for the next unrelated save',async()=>{
  const s=setup();s.render().setField('price','6000');await s.render().save();
  s.render().setField('title','Veel üks pealkiri');await s.render().save();
  assert.equal(s.db.calls.updates[0].price,'6000');assert.ok(!Object.hasOwn(s.db.calls.updates[1],'price'));
});
test('another writer can change price before a title-only save without this hook overwriting it',async()=>{
  const s=setup();s.render().setField('title','Uus pealkiri');
  s.db.setRow({...s.db.getRow(),price:'8000 SEK',price_amount:'8000'});await s.render().save();
  assert.equal(s.db.getRow().price,'8000 SEK');assert.equal(s.db.getRow().price_amount,'8000');
});
test('editable owner read exposes exact source text rather than the formatted display',async()=>{
  const s=setup({price:'0005578.0000'});const result=await s.read({listingId:'123',userId:U,activeIdentityId:I});
  assert.equal(result.status,'ok');assert.equal(result.listing.rawPrice,'0005578.0000');
});
for(const values of [{identity_id:'other'},{identity_id:null,user_id:'other'}])test('existing ownership rejection prevents writes: '+JSON.stringify(values),async()=>{
  const s=setup(values);await assert.rejects(s.api(input()),/õigust/);assert.equal(s.db.calls.updates.length,0);
});
test('existing genuine legacy user ownership still works without a price write',async()=>{
  const s=setup({identity_id:null});await s.api(input());assert.equal(s.db.calls.updates.length,1);
  assert.ok(!Object.hasOwn(s.db.calls.updates[0],'price'));
});
for(const bad of [null,12,{},[]])test('present non-string price fails before transport: '+JSON.stringify(bad),async()=>{
  const s=setup();await assert.rejects(s.api(input({price:bad})),/Hinna tekst/);assert.equal(s.db.calls.reads,0);assert.equal(s.db.calls.updates.length,0);
});
test('missing user and short title still fail before transport',async()=>{
  const s=setup();await assert.rejects(s.api(input({userId:null})),/Sisselogimine/);
  await assert.rejects(s.api(input({title:'x'})),/vähemalt/);assert.equal(s.db.calls.reads,0);
});
test('missing row and read errors do not dispatch a write',async()=>{
  const s=setup();s.db.setRow(null);await assert.rejects(s.api(input()),/ei leitud/);
  s.db.readError({message:'read failed'});await assert.rejects(s.api(input()),/read failed/);assert.equal(s.db.calls.updates.length,0);
});
test('write failure stays an error without retry or marking the form saved',async()=>{
  const s=setup();s.db.writeError({message:'write failed'});s.render().setField('title','Uus pealkiri');await s.render().save();
  const f=s.render();assert.equal(f.saved,false);assert.equal(f.dirty,true);assert.equal(f.saveError,'write failed');assert.equal(s.db.calls.updates.length,1);
});
test('numeric source is not regenerated by the API when price is absent',async()=>{
  const s=setup({price:'Hind kokkuleppel',price_amount:0});await s.api(input());
  assert.deepEqual(Object.keys(s.db.calls.updates[0]).sort(),['condition','description','search_text','title']);
  assert.equal(s.db.calls.updates[0].search_text,'parandatud pealkiri parandatud tekst tools used katse');
});
