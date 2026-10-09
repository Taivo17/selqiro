/* Behaviour-preserving extraction regression. Real TS/TSX modules, synthetic hook
 * cells, DOM-shaped JSX and injected APIs. No React DOM, network or database. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const crypto = require('node:crypto'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
const C = 'src/features/listing-edit/components/', M = 'src/features/listing-edit/model/';
const E = 'src/entities/listing/api/';
const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const plain = v => JSON.parse(JSON.stringify(v));
function listing(extra={}) {
  return {id:'195',title:'Gaz 53',description:'Originaal kirjeldus',rawPrice:'  5578 SEK  ',
    priceLabel:'5578 SEK',priceAmount:'5578',currency:null,imageUrl:'https://example.test/fallback.jpg',
    images:[],details:{detailCategory:'trucks',power:'90KW',seats:2},activeUntil:'2026-11-13T17:50:00Z',
    status:'active',identityId:'identity-a',userId:'user-a',category:'vehicles',subcategory:'trucks_commercial',
    country:'Estonia',city:'Paide',...extra};
}
const image = (i=0,extra={})=>({id:'image-'+i, original_url:'https://example.test/'+i+'.jpg',
  medium_url:null,thumb_url:null,is_primary:i===0,sort_order:i,...extra});
function basics(extra={}) {
  return {form:{title:'Gaz 53',description:'Originaal kirjeldus',price:'  5578 SEK  ',condition:'used'},
    dirty:false,saving:false,saveError:null,saved:false,canSave:false,...extra};
}
function cells() {
  const values=[]; let index=0;
  return {reset(){index=0;}, values,
    react:{useState(init){const n=index++; if(!(n in values)) values[n]=typeof init==='function'?init():init;
      return [values[n],v=>{values[n]=typeof v==='function'?v(values[n]):v;}];}}};
}
function harness(input={}) {
  const h=cells(); const calls={primary:[],delete:[],upload:[],reload:0,confirm:[],field:[],save:0};
  const ctx={state:{listing:listing(),activeIdentity:{id:'identity-a',displayName:'Testprofiil'},
    userId:'user-a',loading:false,error:null,status:'ok',...(input.state||{})},
    basics:basics(input.basics),confirm:true,primary:async()=>{},delete:async()=>{},upload:async()=>{}};
  ctx.basics.setField=(k,v)=>calls.field.push([k,v]); ctx.basics.save=()=>{calls.save++;};
  const mocks={
    [M+'useEditableListing.ts']:{useEditableListing:id=>{assert.equal(id,'195');return ctx.state;}},
    [M+'useListingBasicsForm.ts']:{useListingBasicsForm:v=>{assert.equal(v.listing,ctx.state.listing);return ctx.basics;}},
    [E+'setListingPrimaryImage.ts']:{setListingPrimaryImage:async v=>{calls.primary.push(plain(v));return ctx.primary(v);}},
    [E+'deleteListingImage.ts']:{deleteListingImage:async v=>{calls.delete.push(plain(v));return ctx.delete(v);}},
    [E+'uploadListingImage.ts']:{uploadListingImage:async v=>{calls.upload.push(v);return ctx.upload(v);}},
    [C+'ListingStoreCategoryAssignmentCard.tsx']:{__esModule:true,default:props=>({type:'StoreCategoryCard',props})},
    [C+'ListingClassificationLocationCard.tsx']:{__esModule:true,default:props=>({type:'ClassificationLocationCard',props})},
  };
  const cache=new Map();
  function load(relative) {
    const filename=path.resolve(root,relative), rel=path.relative(root,filename).split(path.sep).join('/');
    assert.ok(filename.startsWith(root+path.sep),'Only local source may load');
    if(Object.hasOwn(mocks,rel))return mocks[rel];
    assert.ok(rel.startsWith(C)||rel===M+'useListingEditImages.ts','Unexpected runtime dependency: '+rel);
    if(cache.has(rel))return cache.get(rel).exports;
    const text=fs.readFileSync(filename,'utf8');
    const compiled=ts.transpileModule(text,{fileName:filename,reportDiagnostics:true,
      compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
    assert.deepEqual(compiled.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
    const module={exports:{}};cache.set(rel,module);
    const req=specifier=>{
      if(specifier==='react')return h.react;
      if(specifier==='react/jsx-runtime')return {jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})};
      if(specifier==='next/link')return {__esModule:true,default:props=>({type:'NextLink',props})};
      assert.ok(specifier.startsWith('.'),'External runtime dependency forbidden: '+specifier);
      const stem=path.resolve(path.dirname(filename),specifier);
      return load(fs.existsSync(stem+'.ts')?stem+'.ts':stem+'.tsx');
    };
    const intl={DateTimeFormat:function(locale,options){return new Intl.DateTimeFormat(locale,{...options,timeZone:'UTC'});}};
    vm.runInNewContext(compiled.outputText,{exports:module.exports,module,require:req,Date,Intl:intl,
      JSON,Object,Array,String,Number,Boolean,Error,Promise,console,
      window:{location:{reload(){calls.reload++;}},confirm:message=>{calls.confirm.push(message);return ctx.confirm;}}},
      {filename,timeout:1500});
    return module.exports;
  }
  function expand(node) {
    if(node===null||node===undefined||typeof node==='boolean')return null;
    if(Array.isArray(node))return node.map(expand);
    if(typeof node!=='object')return node;
    if(typeof node.type==='function')return expand(node.type(node.props));
    const props={...node.props}; if(Object.hasOwn(props,'children'))props.children=expand(props.children);
    return {type:node.type,props,key:node.key};
  }
  return {ctx,calls,load,cells:h.values,render(){h.reset();return expand(load(C+'ListingEditPage.tsx').default({listingId:'195'}));},
    hook(){h.reset();return load(M+'useListingEditImages.ts').useListingEditImages(ctx.state.listing);}};
}
function canonical(v) {
  if(typeof v==='function')return '[handler]';
  if(v===undefined)return '[undefined]';
  if(Array.isArray(v))return v.map(canonical);
  if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));
  return v;
}
function digest(tree){return sha(JSON.stringify(canonical(tree)));}
function all(tree,predicate) {
  if(Array.isArray(tree))return tree.flatMap(n=>all(n,predicate));
  if(!tree||typeof tree!=='object')return [];
  return [...(predicate(tree)?[tree]:[]),...all(tree.props?.children,predicate)];
}
function text(tree) {
  if(typeof tree==='string'||typeof tree==='number')return String(tree);
  if(Array.isArray(tree))return tree.map(text).join('');
  return tree&&typeof tree==='object'?text(tree.props?.children):'';
}
const button=(tree,label)=>{const found=all(tree,n=>n.type==='button'&&text(n)===label);assert.equal(found.length,1,label);return found[0];};
const inputNode=(tree,value)=>{const found=all(tree,n=>n.type==='input'&&n.props.value===value);assert.equal(found.length,1,value);return found[0];};
const scenarios={
  loading:{state:{loading:true,listing:null,status:'loading'}},
  error:{state:{error:'Sünteetiline laadimisviga',status:'ok'}},
  unauthenticated:{state:{listing:null,userId:null,status:'not_authenticated'}},
  forbidden:{state:{listing:null,status:'forbidden'}},
  notFound:{state:{listing:null,status:'not_found'}},
  missingListing:{state:{listing:null,status:'ok'}},
  noImages:{state:{listing:listing({imageUrl:null,details:{}})}},
  oneImage:{state:{listing:listing({images:[image()]})}},
  twoImages:{state:{listing:listing({images:[image(),image(1)],details:{detailCategory:'trucks',power:'90KW',year:1989,seats:2,nested:{a:'b'},zero:0,missing:null}})}},
  tenImages:{state:{listing:listing({images:Array.from({length:10},(_,i)=>image(i))})}},
  saving:{basics:{dirty:true,saving:true,canSave:false}},
  saved:{basics:{saved:true}},
  validationError:{basics:{dirty:true,saveError:'Testi veateade',canSave:true}},
  pendingPrice:{basics:{form:{title:'Muudetud pealkiri',description:'uus tekst',price:'0.00000001 BTC',condition:'damaged'},dirty:true,canSave:true}},
  fallbackURLs:{state:{listing:listing({images:[image(0,{original_url:null,medium_url:'https://example.test/medium.jpg'}),image(1,{original_url:null,thumb_url:'https://example.test/thumb.jpg'})],activeUntil:'not-a-date'})}},
};

// Snapshots captured from unmodified f8a6241; update only for an intentional UI change.
const expectedSnapshots={
  "loading": "7cd87dfa556ca6c7d08c8adc6376387c6a0ddf72f88cc586287fba2a71c7ab9c",
  "error": "577e3647022488c2c3ebc4f53b04e22a7ca78efaffcae7a73425dd84c766566a",
  "unauthenticated": "d358580b091ac5fbf2242764d2ca7b77f240535e6545f2f4a271950496963c6f",
  "forbidden": "ed91c9fff934253ff3a55d75bb8535a7486f8bed9ede068d66b14c2e85fd7faa",
  "notFound": "bc5e14b8332a076ea0c94d26d9073c6255df57d2f71dd2f26c03c2ee09aedaa8",
  "missingListing": "6fb15546ce89aee43debfcfe02c0bf005ef9d747af710beedd4deb9e57a12d57",
  "noImages": "28d7f44d8def956183797ab49d2edfb978321b102925b201ca9ab1e5c33c31cc",
  "oneImage": "f338cb4bc1db597e5053f4f3400fd9b3ff2d43b9ef338f8dd19423e39a56aace",
  "twoImages": "a42bcc2a09fad8b78eaa17d8daee9a8b6d171010d7813cef4238248e347635ec",
  "tenImages": "d00f440775edf43103ab3762b04bc4cd2a7dc21f03e0169e97cf24fd361249dd",
  "saving": "063538a706335aabef8e67ce09ee35fa6a6fceda8ddff6511c6b6aedd981ee22",
  "saved": "c3a76eac2a3eb4c39d83bf1e14b171992cd6d4a39bb3e3878e02fa88ef341dc5",
  "validationError": "3151317b6ee345a328ce2c06be83f5dc0e73365e0bd4ded871c7c6830e824bff",
  "pendingPrice": "eaed27e9a77b9c6e7f00a3acacecddb08e8aedcefcda0049efc4a66a31128f6d",
  "fallbackURLs": "b22efa2f3215ae2bcb0058cd10a2d2b738a94ac6849a43fc7eaa8b3eab18bf92"
};
const expectedBodies={
  "getImageUrl": {
    "file": "src/features/listing-edit/components/ListingEditImages.tsx",
    "sha256": "566cd10f89b201d1a14e7835f878b9bae4743963ec0eb79b04e9d25a0f51a0f0"
  },
  "PlaceholderImage": {
    "file": "src/features/listing-edit/components/ListingEditPrimitives.tsx",
    "sha256": "b54f7702e843c96c170e34e6082cdf9b548d6c590332cc0cd35359caaf8c91ec"
  },
  "FieldPreview": {
    "file": "src/features/listing-edit/components/ListingEditPrimitives.tsx",
    "sha256": "e58ade38927861d4f4eee2b51753c5699091cfbf353c7b9f7986f83d2768bfee"
  },
  "TextField": {
    "file": "src/features/listing-edit/components/ListingEditPrimitives.tsx",
    "sha256": "d2a6e5c3339a4b9b0bdbdd87064acf10e2d19afc2f086896d532632b30c6cb68"
  },
  "SelectField": {
    "file": "src/features/listing-edit/components/ListingEditPrimitives.tsx",
    "sha256": "02f6e4b238e4b0d3297bbacd80e41ebed33efc4cc9f05e101e33522dc515cf70"
  },
  "TextAreaField": {
    "file": "src/features/listing-edit/components/ListingEditPrimitives.tsx",
    "sha256": "c1c660b870d929126fd155c59e0031b242222f0681d23a7169ff72d1a63938ea"
  },
  "LoadingState": {
    "file": "src/features/listing-edit/components/ListingEditStates.tsx",
    "sha256": "515448264b047f3ed5a4ca3c950d372ac0080d7b48fc91350c51ef86ac1e87c7"
  },
  "MessageState": {
    "file": "src/features/listing-edit/components/ListingEditStates.tsx",
    "sha256": "4fa998a7743341612030d585f8250c29330f5104f355350bb60e43fffba90931"
  },
  "formatDateTimeLabel": {
    "file": "src/features/listing-edit/components/ListingEditBasicsCard.tsx",
    "sha256": "367031e0b22b4bfdd3d53d4df6b67a99bb9fcaa875773692a48dfb0c19e6d867"
  },
  "DetailsPreview": {
    "file": "src/features/listing-edit/components/ListingEditDetailsCard.tsx",
    "sha256": "25a8537a0aeb5f5af150c78be0284abe8c309a5b4d07b181e747e829121695f8"
  },
  "handleSetPrimaryImage": {
    "file": "src/features/listing-edit/model/useListingEditImages.ts",
    "sha256": "5d7287dbe1a966348f21e6b192b01512d97e97d12c74b7ac9e85057028f3b4fe"
  },
  "handleDeleteImage": {
    "file": "src/features/listing-edit/model/useListingEditImages.ts",
    "sha256": "15d0ce3de4f3cf350e65f474fa40941817b7268ca15c6fdfb6677ff20bd12101"
  },
  "handleUploadImages": {
    "file": "src/features/listing-edit/model/useListingEditImages.ts",
    "sha256": "7f708949c3b1a198076a8614aa70a79421cb6c4d1ff6d821e6f03ddbdc9a6c78"
  }
};
for(const [name,scenario] of Object.entries(scenarios))test('same expanded JSX as f8a6241: '+name,()=>{
  assert.equal(digest(harness(scenario).render()),expectedSnapshots[name]);
});
for(const [name,entry] of Object.entries(expectedBodies))test('unchanged extracted function body: '+name,()=>{
  const source=fs.readFileSync(path.join(root,entry.file),'utf8');
  const ast=ts.createSourceFile(entry.file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const matches=[];const walk=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.text===name)matches.push(node);ts.forEachChild(node,walk);};walk(ast);
  assert.equal(matches.length,1); assert.equal(sha(matches[0].body.getText(ast)),entry.sha256);
});
test('page is composition-only and all image states remain before return gates',()=>{
  const src=fs.readFileSync(path.join(root,C+'ListingEditPage.tsx'),'utf8');
  assert.ok(src.split('\n').length<=160);assert.ok(!src.includes('useState'));
  assert.ok(src.indexOf('const imageActions = useListingEditImages(listing);')<src.indexOf('if (loading'));
  assert.ok(!/setListingPrimaryImage|deleteListingImage|uploadListingImage|\.from\(|\.rpc\(/.test(src));
  const h=harness(scenarios.loading);h.render();assert.equal(h.cells.length,4);
  h.ctx.state={...h.ctx.state,listing:listing(),loading:false,status:'ok'};h.render();assert.equal(h.cells.length,4);
});
test('rendering does not invoke save, confirmation, image API or reload',()=>{
  const h=harness(scenarios.twoImages);h.render();assert.deepEqual(h.calls,{primary:[],delete:[],upload:[],reload:0,confirm:[],field:[],save:0});
});
test('original title, raw price, description and condition callbacks forward verbatim',()=>{
  const h=harness(), tree=h.render();
  inputNode(tree,'Gaz 53').props.onChange({target:{value:'  Muudetud pealkiri  '}});
  inputNode(tree,'  5578 SEK  ').props.onChange({target:{value:'  001,50 €  '}});
  all(tree,n=>n.type==='textarea')[0].props.onChange({target:{value:'  Kirjeldus\n\n  '}});
  all(tree,n=>n.type==='select')[0].props.onChange({target:{value:'damaged'}});
  assert.deepEqual(h.calls.field,[['title','  Muudetud pealkiri  '],['price','  001,50 €  '],['description','  Kirjeldus\n\n  '],['condition','damaged']]);
});
test('one existing save action, exact callback and disabled state',()=>{
  const h=harness({basics:{dirty:true,canSave:true}}); const b=button(h.render(),'Salvesta muudatused');
  assert.equal(b.props.onClick,h.ctx.basics.save);assert.equal(b.props.disabled,false);b.props.onClick();assert.equal(h.calls.save,1);
  h.ctx.basics.canSave=false;assert.equal(button(h.render(),'Salvesta muudatused').props.disabled,true);
});
test('public detail, back, classification and category props are unchanged',()=>{
  const h=harness(),tree=h.render();
  assert.deepEqual(all(tree,n=>n.type==='NextLink').map(n=>n.props.href),['/v2/listing/195','/v2/my-area']);
  assert.equal(all(tree,n=>n.type==='ClassificationLocationCard')[0].props.listing,h.ctx.state.listing);
  assert.equal(all(tree,n=>n.type==='StoreCategoryCard')[0].props.listingId,'195');
});
test('primary thumbnail and action call existing API then reload once',async()=>{
  const h=harness(scenarios.twoImages),tree=h.render();
  const t=all(tree,n=>n.type==='button'&&n.props['aria-label']==='Tee pilt 2 esimeseks')[0];
  await t.props.onClick();assert.deepEqual(h.calls.primary,[{listingId:'195',imageId:'image-1'}]);assert.equal(h.calls.reload,1);
  assert.equal(all(h.render(),n=>n.type==='button'&&n.props['aria-label']==='Pilt 1 on esimene')[0].props.disabled,true);
});
test('pending primary state and error message preserve original behaviour',async()=>{
  const h=harness(scenarios.twoImages);let fail;
  h.ctx.primary=()=>new Promise((_,reject)=>{fail=reject;});
  const p=h.hook().handleSetPrimaryImage(image(1));
  assert.equal(h.hook().primarySavingId,'image-1');assert.equal(button(h.render(),'Muudan...').props.disabled,true);
  fail(new Error('primary failure'));await p;
  assert.equal(h.hook().primarySavingId,null);assert.equal(h.hook().imageError,'primary failure');assert.equal(h.calls.reload,0);
});
test('missing listing/image IDs cause no primary/delete/upload requests',async()=>{
  const h=harness({state:{listing:null}}),a=h.hook();
  await a.handleSetPrimaryImage(image());await a.handleDeleteImage(image());await a.handleUploadImages([{name:'a'}]);
  assert.equal(h.calls.primary.length+h.calls.delete.length+h.calls.upload.length,0);
  h.ctx.state.listing=listing({images:[image(),image(1)]});const b=h.hook();
  await b.handleSetPrimaryImage({});await b.handleDeleteImage({});assert.equal(h.calls.confirm.length,0);
});
test('delete cancellation is read-only and preserves image state',async()=>{
  const h=harness(scenarios.twoImages);h.ctx.confirm=false;await h.hook().handleDeleteImage(image(1));
  assert.deepEqual(h.calls.confirm,['Kas kustutada see pilt kuulutuselt?']);assert.equal(h.calls.delete.length,0);assert.equal(h.calls.reload,0);
});
test('last-image protection does not even ask confirmation',async()=>{
  const h=harness(scenarios.oneImage);await h.hook().handleDeleteImage(image());
  assert.equal(h.hook().imageError,'Viimast pilti ei saa kustutada.');assert.equal(h.calls.confirm.length,0);
  assert.equal(button(h.render(),'Viimane pilt').props.disabled,true);
});
test('confirmed delete forwards IDs and reloads once after completion',async()=>{
  const h=harness(scenarios.twoImages);await h.hook().handleDeleteImage(image(1));
  assert.deepEqual(h.calls.delete,[{listingId:'195',imageId:'image-1'}]);assert.equal(h.calls.reload,1);
});
test('delete failure clears pending state without reload or retry',async()=>{
  const h=harness(scenarios.twoImages);h.ctx.delete=async()=>{throw new Error('delete failure');};
  await h.hook().handleDeleteImage(image(1));assert.equal(h.hook().deletingImageId,null);
  assert.equal(h.hook().imageError,'delete failure');assert.equal(h.calls.delete.length,1);assert.equal(h.calls.reload,0);
});
for(const [count,files,want] of [[10,1,'Kuulutusele saab lisada kuni 10 pilti.'],[9,2,'Saad lisada veel 1 pilti.']])
 test('upload rejects over-limit batch '+count+'/'+files,async()=>{
  const h=harness({state:{listing:listing({images:Array.from({length:count},(_,i)=>image(i))})}});
  await h.hook().handleUploadImages(Array.from({length:files},(_,i)=>({name:'file-'+i})));
  assert.equal(h.hook().imageError,want);assert.equal(h.calls.upload.length,0);assert.equal(h.calls.reload,0);
 });
test('empty upload causes no work',async()=>{
  const h=harness();await h.hook().handleUploadImages([]);assert.equal(h.calls.upload.length,0);assert.equal(h.hook().uploadingImage,false);
});
test('multi-image batch uploads in order and reloads once',async()=>{
  const h=harness(),batch=[{name:'a'},{name:'b'}];await h.hook().handleUploadImages(batch);
  assert.equal(h.calls.upload.length,2);assert.equal(h.calls.upload[0].file,batch[0]);assert.equal(h.calls.upload[1].file,batch[1]);
  assert.equal(h.calls.upload[0].listingId,'195');assert.equal(h.calls.reload,1);assert.equal(h.hook().uploadingImage,false);
});
test('partial upload error reports count, preserves uploaded result and does not retry',async()=>{
  const h=harness();h.ctx.upload=async v=>{if(v.file.name==='b')throw new Error('upload failure');};
  await h.hook().handleUploadImages([{name:'a'},{name:'b'},{name:'c'}]);
  assert.equal(h.calls.upload.length,2);assert.equal(h.calls.reload,0);assert.equal(h.hook().uploadingImage,false);
  assert.equal(h.hook().imageError,'1 pilti lisatud, aga järgmise pildi lisamine ebaõnnestus: upload failure');
});
test('rendered pending upload remains disabled; no new synchronous-lock promise',async()=>{
  const h=harness();let finish;h.ctx.upload=()=>new Promise(resolve=>{finish=resolve;});
  const p=h.hook().handleUploadImages([{name:'a'}]);assert.equal(h.hook().uploadingImage,true);
  assert.equal(all(h.render(),n=>n.type==='input'&&n.props.type==='file')[0].props.disabled,true);
  await h.hook().handleUploadImages([{name:'b'}]);assert.equal(h.calls.upload.length,1);finish();await p;
});
test('file change copies FileList before reset clears it',async()=>{
  const h=harness(),tree=h.render();const files=[{name:'a'},{name:'b'}];
  const target={files};let reset=false;Object.defineProperty(target,'value',{set(v){assert.equal(v,'');reset=true;files.length=0;}});
  const picker=all(tree,n=>n.type==='input'&&n.props.type==='file')[0];
  assert.equal(picker.props.accept,'image/jpeg,image/png,image/webp');assert.equal(picker.props.multiple,true);
  picker.props.onChange({currentTarget:target});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(reset,true);assert.deepEqual(h.calls.upload.map(c=>c.file.name),['a','b']);assert.equal(h.calls.reload,1);
});
test('details remain read-only and limited to original eight values',()=>{
  const h=harness({state:{listing:listing({details:{detailCategory:'do-not-show',...Object.fromEntries(Array.from({length:10},(_,i)=>['field_'+i,'value-'+i]))}})}});
  const t=text(h.render());assert.ok(!t.includes('do-not-show'));assert.ok(t.includes('value-7'));assert.ok(!t.includes('value-8'));
});
