/* Actual shared components and category dictionary. Hooks/effects/JSX/object URLs
 * are simulated. No React DOM, HTTP, AI, Storage or database execution. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const C='src/features/listing-create/components/',M='src/features/listing-create/model/';
const json=v=>JSON.parse(JSON.stringify(v));
function nodes(tree,pred){
 if(Array.isArray(tree))return tree.flatMap(n=>nodes(n,pred));
 if(!tree||typeof tree!=='object')return [];
 return [...(pred(tree)?[tree]:[]),...nodes(tree.props?.children,pred)];
}
function text(tree){
 if(typeof tree==='string'||typeof tree==='number')return String(tree);
 if(Array.isArray(tree))return tree.map(text).join(' ');
 return tree&&typeof tree==='object'?text(tree.props?.children):'';
}
const clean=tree=>text(tree).replace(/\s+/g,' ').trim();
function realm(){
 const cache=new Map(),state=new Map(),effects=new Map(),urls={created:[],revoked:[]};
 let instance='',cursor=0,changed=false,pending=[];
 const react={
  useState(initial){const id=instance+':'+cursor++;if(!state.has(id))state.set(id,typeof initial==='function'?initial():initial);
   return [state.get(id),value=>{const next=typeof value==='function'?value(state.get(id)):value;
    if(next!==state.get(id)){state.set(id,next);changed=true;}}];},
  useEffect(fn,deps){const id=instance+':'+cursor++,old=effects.get(id);
   if(!old||deps.length!==old.deps.length||deps.some((d,i)=>d!==old.deps[i])){
    effects.set(id,{deps,cleanup:old?.cleanup});pending.push(()=>{old?.cleanup?.();effects.get(id).cleanup=fn();});
   }}
 };
 const allow=new Set([C+'ListingCreateTextFields.tsx',C+'ListingCreateImageFields.tsx',C+'OrdinaryListingDetailFields.tsx',
 C+'OrdinaryListingPreview.tsx',M+'listingCreateTextGuidance.ts',M+'contentType.ts',M+'horseOfferType.ts',
 M+'fieldProvenance.ts',M+'imageSelection.ts',M+'ordinaryListingFields.ts',M+'ordinaryListingInput.ts',
 'lib/categories.ts','lib/categoryFields.ts','src/entities/listing/model/listingPriceInput.ts',
 'src/entities/listing/model/listingEditCommand.ts','src/entities/listing/model/listingEditSnapshot.ts',
 'src/shared/currency/listingCurrencies.generated.ts']);
 function load(name){
  const file=path.resolve(root,name),rel=path.relative(root,file).split(path.sep).join('/');
  assert.ok(allow.has(rel),'Unexpected runtime dependency: '+rel);
  if(cache.has(file))return cache.get(file).exports;
  const mod={exports:{}};cache.set(file,mod);
  const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,
   compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal(out.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  const requireLocal=spec=>{
   if(spec==='react')return react;
   if(spec==='react/jsx-runtime')return {jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})};
   assert.ok(spec.startsWith('.'),'Network/service import forbidden: '+spec);
   const base=path.resolve(path.dirname(file),spec),next=[base+'.ts',base+'.tsx'].find(fs.existsSync);
   assert.ok(next,'Missing local module: '+spec);return load(next);
  };
  vm.runInNewContext(out.outputText,{module:mod,exports:mod.exports,require:requireLocal,
   Object,Array,String,Number,Boolean,Error,TypeError,Map,Set,JSON,RegExp,Math,TextEncoder,BigInt,Date,
   URL:{createObjectURL(file){const u='blob:test-'+urls.created.length;urls.created.push({file,url:u});return u;},
    revokeObjectURL(url){urls.revoked.push(url);}}},{filename:file,timeout:1500});
  return mod.exports;
 }
 function expand(n,id){
  if(Array.isArray(n))return n.map((child,i)=>expand(child,id+':'+i));
  if(!n||typeof n!=='object')return n;
  if(typeof n.type==='function'){instance=id;cursor=0;return expand(n.type(n.props),id+':child');}
  return {...n,props:{...n.props,children:expand(n.props?.children,id+':children')}};
 }
 return {load,urls,render(name,props){let tree;
  for(let i=0;i<5;i++){changed=false;pending=[];tree=expand({type:load(C+name+'.tsx').default,props},'root');
   for(const fn of pending)fn();if(!changed)return tree;}
  assert.fail('Synthetic effect render did not settle');
 },unmount(){for(const e of effects.values())e.cleanup?.();effects.clear();state.clear();}};
}
const labels={axle_configuration:'Telgede konfiguratsioon',gross_weight:'Täismass',empty_weight:'Tühimass',
 payload:'Kandevõime',load_space_length:'Koormaruumi pikkus',load_space_width:'Koormaruumi laius',
 load_space_height:'Koormaruumi kõrgus',tachograph:'Sõidumeerik'};
function draft(h){return {...h.load(M+'ordinaryListingFields.ts').createOrdinaryListingFieldState(),
 categoryPath:['vehicles','trucks_commercial','trucks'],condition:'used',priceKind:'fixed',
 amountInput:'25.50',currencyInput:'EUR',country:'Estonia',city:'Paide'};}
for(const [key,label] of Object.entries(labels)){
 test('Estonian label is present for '+key,()=>{
  const h=realm(),dict=h.load('lib/categoryFields.ts');
  assert.equal(dict.FIELD_LABELS.et[key],label);assert.equal(dict.getFieldLabel(key,'Fallback','et'),label);
 });
 test('actual detail renderer labels and preserves free text for '+key,()=>{
  const h=realm();let value=draft(h);const raw='  90 KW / 12 in  ';value.detailValues={[key]:raw};
  const before=json(value);const tree=h.render('OrdinaryListingDetailFields',{value,onChange:v=>{value=v;}});
  const wrap=nodes(tree,n=>n.type==='label'&&n.props.htmlFor==='ordinary-detail-'+key)[0];
  assert.ok(wrap,key);assert.equal(clean(nodes(wrap,n=>n.type==='span')[0]),label);
  const field=nodes(wrap,n=>n.type==='input')[0];assert.equal(field.props.type,'text');assert.equal(field.props.value,raw);
  assert.deepEqual(json(value),before);field.props.onChange({target:{value:'  20.5 ft  '}});
  assert.equal(value.detailValues[key],'  20.5 ft  ');assert.deepEqual(json(value.categoryPath),before.categoryPath);
 });
 test('other languages retain supplied fallback for '+key,()=>{
  const dict=realm().load('lib/categoryFields.ts');
  for(const language of ['en','fi',null,undefined])assert.equal(dict.getFieldLabel(key,'Original label',language),'Original label');
 });
}
test('existing labels and unknown-key fallback remain',()=>{
 const d=realm().load('lib/categoryFields.ts');for(const [k,v] of Object.entries({power:'Võimsus',brand:'Mark',vin:'VIN',seats:'Istekohti'}))
 assert.equal(d.getFieldLabel(k,'Fallback','et'),v);assert.equal(d.getFieldLabel('unknown_copy_test','Fallback','et'),'Fallback');
});
test('detail order and identifiers match the actual truck schema',()=>{
 const h=realm(),value=draft(h),dict=h.load('lib/categoryFields.ts');
 const tree=h.render('OrdinaryListingDetailFields',{value,onChange:()=>assert.fail('No edit during render')});
 assert.deepEqual(nodes(tree,n=>n.type==='input').map(n=>n.props.id),json(dict.getCategoryFields('trucks').map(f=>'ordinary-detail-'+f.key)));
 assert.equal(nodes(tree,n=>n.type==='input').length,20);
});
test('ordinary guidance describes manual entry without a photo-only AI promise',()=>{
 const g=realm().load(M+'listingCreateTextGuidance.ts').getListingCreateTextGuidance('listing',null);
 assert.match(g.sectionDescription,/oma sõnadega/);assert.match(g.heroDescription,/vali kategooria/);
 assert.doesNotMatch(g.sectionDescription,/\bAI\b|tühjaks|analüüs/);assert.doesNotMatch(g.heroDescription,/\bAI\b/);
});
for(const content of ['','My title 90 kW'])test('actual shared text component shows truthful ordinary guidance: '+JSON.stringify(content),()=>{
 const h=realm(),g=h.load(M+'listingCreateTextGuidance.ts').getListingCreateTextGuidance('listing',null);
 const f=h.load(M+'fieldProvenance.ts');let title=f.createListingCreateTextField(content),description=f.createListingCreateTextField('Manual');
 const tree=h.render('ListingCreateTextFields',{title,description,setTitle:v=>{title=v;},setDescription:v=>{description=v;},textGuidance:g});
 assert.ok(clean(tree).includes(g.sectionDescription));assert.doesNotMatch(clean(tree),/AI|analüüsib/);
 const input=nodes(tree,n=>n.type==='input')[0];assert.equal(input.props.value,content);assert.equal(input.props.maxLength,140);
 input.props.onChange({target:{value:' User 12 in '}});assert.deepEqual(json(title),{value:' User 12 in ',source:'user'});
 assert.equal(nodes(tree,n=>n.type==='textarea')[0].props.maxLength,5000);
});
test('provenance is not falsified for a genuinely AI-sourced field',()=>{
 const h=realm(),g=h.load(M+'listingCreateTextGuidance.ts').getListingCreateTextGuidance('listing',null);
 const tree=h.render('ListingCreateTextFields',{title:{value:'Previously suggested',source:'ai'},description:{value:'',source:'empty'},
 setTitle:()=>{},setDescription:()=>{},textGuidance:g});
 assert.match(clean(tree),/AI soovitus/);assert.equal(nodes(tree,n=>n.props['data-listing-create-field-source']==='ai').length,1);
});
const photo=(name='photo.jpg')=>({name,type:'image/jpeg',size:3*1024*1024,lastModified:1234});
test('actual empty image component gives photo selection guidance, not AI claims',()=>{
 const h=realm(),tree=h.render('ListingCreateImageFields',{files:[],setFiles:()=>assert.fail('No file mutation')});
 assert.match(clean(tree),/Pilte ei ole veel valitud/);assert.match(clean(tree),/eelvaateid/);assert.doesNotMatch(clean(tree),/\bAI\b|analüüs/);
 assert.equal(nodes(tree,n=>n.type==='input'&&n.props.type==='file').length,2);
 assert.equal(nodes(tree,n=>n.props.capture==='environment').length,1);h.unmount();
});
test('actual filled image component has exactly one neutral main-photo badge and local previews',()=>{
 const h=realm(),a=photo(),b=photo('second.jpg'),files=[a,b];
 const tree=h.render('ListingCreateImageFields',{files,setFiles:()=>assert.fail('No file mutation')});
 assert.equal(nodes(tree,n=>n.type==='span'&&clean(n)==='Põhipilt').length,1);
 assert.doesNotMatch(clean(tree),/\bAI\b|analüüs/);assert.equal(nodes(tree,n=>n.type==='img').length,2);
 assert.ok(nodes(tree,n=>n.type==='img').every(n=>n.props.src.startsWith('blob:test-')));
 assert.deepEqual(h.urls.created.map(x=>x.file),files);h.unmount();assert.equal(h.urls.revoked.length,2);
});
test('image move/remove handlers and main-photo selection preserve original objects',()=>{
 const h=realm(),a=photo(),b=photo('second.jpg');let files=[a,b];const setFiles=v=>{files=typeof v==='function'?v(files):v;};
 let tree=h.render('ListingCreateImageFields',{files,setFiles});
 const first=nodes(tree,n=>n.type==='article')[0];
 nodes(first,n=>n.props['aria-label']==='Liiguta pilt tahapoole')[0].props.onClick();
 assert.equal(files[0],b);assert.equal(files[1],a);tree=h.render('ListingCreateImageFields',{files,setFiles});
 assert.ok(clean(nodes(tree,n=>n.type==='article')[0]).includes('second.jpg'));
 nodes(nodes(tree,n=>n.type==='article')[0],n=>n.type==='button'&&clean(n)==='Eemalda')[0].props.onClick();
 assert.equal(files.length,1);assert.equal(files[0],a);h.unmount();
});
test('actual file input copies files before reset and rejects unsupported files without upload',()=>{
 const h=realm(),a=photo();let files=[];const setFiles=v=>{files=typeof v==='function'?v(files):v;};
 let tree=h.render('ListingCreateImageFields',{files,setFiles});
 const target={files:[a,{...a,name:'bad.gif',type:'image/gif'}],value:'selection'};
 nodes(tree,n=>n.type==='input'&&n.props.type==='file')[0].props.onChange({target});
 assert.equal(target.value,'');assert.equal(files.length,1);assert.equal(files[0],a);
 tree=h.render('ListingCreateImageFields',{files,setFiles});assert.match(clean(nodes(tree,n=>n.props.role==='alert')[0]),/bad.gif/);
 h.unmount();
});
test('copy correction cannot enable the existing publication preview',()=>{
 const h=realm();const tree=h.render('OrdinaryListingPreview',{value:draft(h),title:'Test',description:'Manual entry'});
 const button=nodes(tree,n=>n.type==='button')[0];assert.equal(button.props.disabled,true);assert.equal(button.props.onClick,undefined);
 assert.match(clean(tree),/Andmeid ja pilte ei saadeta serverisse/);
});
