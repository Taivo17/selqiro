/* Actual model/editor/gate with synthetic auth, policy reads and React lifecycle.
 * Database authority and original-event provenance are covered by the SQL suite. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const U='11111111-1111-4111-8111-111111111111',I='22222222-2222-4222-8222-222222222222';
const H='33333333-3333-4333-8333-333333333333',E='44444444-4444-4444-8444-444444444444';
const P='55555555-5555-4555-8555-555555555555',Q='66666666-6666-4666-8666-666666666666';
const actor={userId:U,identityId:I},time='2026-11-08T12:00:00.123456+00:00';
const plain=value=>JSON.parse(JSON.stringify(value));
function realm(overrides={}) {
 const cache=new Map(),language=overrides.language||'et';
 function load(name) {
  const file=path.resolve(root,name),relative=path.relative(root,file).split(path.sep).join('/');
  assert.ok(file.startsWith(root+path.sep));
  if(Object.hasOwn(overrides,relative))return overrides[relative];
  if(relative==='src/shared/i18n/V2LanguageProvider.tsx')return {useV2Translation:catalog=>({language,t:(key,params)=>load('lib/i18n/useTranslation.ts').getCatalogTranslation(language,catalog,key,params)})};
  if(relative==='src/shared/i18n/useMarketplaceTranslation.ts')return {useMarketplaceTranslation:()=>({language,r:value=>load('src/shared/i18n/marketplaceMessages.ts').renderMarketplaceMessage(language,value)})};
  if(relative==='src/shared/supabase/browserClient.ts')throw Error('Unexpected live transport');
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal(output.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  const requireLocal=name=>{
   if(name==='react')return overrides.react||{useState:value=>[typeof value==='function'?value():value,()=>{}],useEffect:()=>{},useRef:value=>({current:value}),useCallback:fn=>fn};
   if(name==='react/jsx-runtime')return {jsx:(type,props,key)=>({type,props:props||{},key}),jsxs:(type,props,key)=>({type,props:props||{},key}),Fragment:'fragment'};
   if(name==='next/link')return {__esModule:true,default:props=>({type:'a',props})};
   assert.ok(name.startsWith('.'),'Unexpected dependency '+name);
   const resolved=path.resolve(path.dirname(file),name);return load(fs.existsSync(resolved+'.ts')?resolved+'.ts':resolved+'.tsx');
  };
  vm.runInNewContext(output.outputText,{module,exports:module.exports,require:requireLocal,Date,Intl,Number,String,Object,Array,Set,Map,JSON,BigInt,Promise,Error,URL,Blob,AbortController,Uint8Array,TextEncoder},{filename:file,timeout:2000});
  return module.exports;
 }return load;
}
const load=realm();
const savedModel=load('src/entities/horse-offer/model/savedConfirmation.ts');
const publication=load('src/entities/horse-offer/model/publication.ts');
const confirmation=load('src/features/listing-create/model/horseOfferPublicationGate.ts');
const catalog=load('src/features/horse-publication/model/horsePublicationMessages.ts').horsePublicationMessages;
const build=load('src/features/listing-create/model/horseOfferDraftSave.ts').buildHorseOfferDraftSaveInput;
const prepareForm=load('src/features/horse-offer-edit/model/ownerHorseDraftForm.ts').prepareOwnerHorseDraftForm;
function evidence(over={}) {return {schema_version:1,offer_id:H,identity_id:I,actor_user_id:U,offer_type:'sale',publication_event_id:E,confirmed_at:time,...over};}
function ownerRow(over={}) {return {content_type:'horse_offer',content_id:H,offer_id:H,identity_id:I,offer_type:'sale',status:'paused',
 title:'Saved title',description:'Saved description',price_amount:null,price_type:'contact',currency:'EUR',market_country_code:'EE',horse_location_country_code:'EE',
 horse_name:'Horse',birth_year:2018,sex:null,breed:null,color:null,height_cm:null,discipline:null,training_level:null,suitability:null,
 health_notes:null,behavior_notes:null,city:null,region:null,location_text:null,horse_lat:null,horse_lng:null,
 image_url:null,images:[],details:{schema_version:1,branch:'specific'},published_at:time,active_until:'2027-02-06T12:00:00+00:00',
 created_at:time,updated_at:time,held_at:null,paused_at:time,closed_at:null,rejected_at:null,archived_at:null,edit_revision:'12',
 saved_confirmation:evidence(),...over};}
function snapshot(over={}) {return publication.bindHorseOwnerSnapshot(ownerRow(over),actor,H);}

for(const status of ['published','paused','closed'])test(status+' atomic owner snapshot keeps original confirmation and revision together',()=>{
 const s=snapshot({status});assert.equal(s.editRevision,'12');assert.equal(s.savedConfirmation.publicationEventId,E);
 assert.equal(s.savedConfirmation.confirmedAt,time);assert.equal(s.savedConfirmation.actorUserId,U);
 assert.equal(savedModel.applicableHorseSavedConfirmation(s,actor,'sale'),s.savedConfirmation);
 assert.ok(Object.isFrozen(s.savedConfirmation));
});
test('an old or missing owner snapshot never infers a confirmation from published status',()=>{
 for(const value of [undefined,null])assert.equal(snapshot({status:'published',saved_confirmation:value}).savedConfirmation,null);
});
for(const [name,change]of Object.entries({offer:{offer_id:P},identity:{identity_id:P},user:{actor_user_id:P},type:{offer_type:'wanted'},event:{publication_event_id:'bad'},time:{confirmed_at:'infinity'},version:{schema_version:2},extra:{accepted:true}}))
 test('foreign or malformed saved '+name+' rejects the entire owner evidence read',()=>assert.throws(()=>snapshot({saved_confirmation:evidence(change)}),/response/));
test('saved evidence is not accepted on a draft, held or archived listing',()=>{
 for(const status of ['draft','held_for_review','archived'])assert.throws(()=>snapshot({status}),/response/);
});
test('changing identity, user or listing type cannot carry a saved confirmation into another form',()=>{
 const s=snapshot();for(const a of [null,{userId:P,identityId:I},{userId:U,identityId:P}])assert.equal(savedModel.applicableHorseSavedConfirmation(s,a,'sale'),null);
 assert.equal(savedModel.applicableHorseSavedConfirmation(s,actor,'wanted'),null);
 const foreign=plain(s);foreign.detail.offerId=P;assert.equal(savedModel.applicableHorseSavedConfirmation(foreign,actor,'sale'),null);
});
test('editing title, price or photos of the same listing does not manufacture new facts',()=>{
 const s=snapshot(),before=plain(s.savedConfirmation);s.detail.title='Edited title';s.detail.priceAmount=500;
 assert.deepEqual(plain(savedModel.applicableHorseSavedConfirmation(s,actor,'sale')),before);
 assert.equal('publisher_confirms_information_accurate' in s.savedConfirmation,false);
});

const render=element=>element===null||element===undefined||typeof element==='boolean'?[]:Array.isArray(element)?element.flatMap(render):typeof element!=='object'?[String(element)]:typeof element.type==='function'?render(element.type(element.props)):[{...element,children:render(element.props.children)}];
const all=nodes=>nodes.flatMap(n=>typeof n==='string'?[]:[n,...all(n.children)]);
const words=nodes=>nodes.map(n=>typeof n==='string'?n:words(n.children)).join(' ');
function policies(accepted=true) {return [{policyKey:'marketplace-general',policyDocumentId:P,policyVersion:'1',contentHash:'a'.repeat(64),accepted,acceptedAt:accepted?time:null},
 {policyKey:'horse-offer-ee',policyDocumentId:Q,policyVersion:'1',contentHash:'b'.repeat(64),accepted,acceptedAt:accepted?time:null}];}
function gate(language,{saved=true,accepted=true,offerType='sale'}={}) {
 const effects=[],emitted=[];let acceptCalls=0;
 const l=realm({language,react:{useState:v=>[typeof v==='function'?v():v,()=>{}],useEffect:fn=>effects.push(fn)},
  'src/features/listing-create/model/useHorseOfferPublicationPolicyStatus.ts':{useHorseOfferPublicationPolicyStatus:()=>({phase:'ready',policies:policies(accepted),acceptancePhase:'idle',acceptanceMessage:null,acceptanceErrorMessage:null,errorMessage:null,isAccepting:false,retry(){},acceptMissingPolicies(){acceptCalls++;}})}});
 const Gate=l('src/features/listing-create/components/HorseOfferPublicationGate.tsx').default;
 const nodes=render(Gate({offerType,value:confirmation.createHorseOfferPublicationConfirmationState(),savedConfirmation:saved?snapshot().savedConfirmation:null,
  onPoliciesChange:value=>emitted.push(value),onConfirmAllChange(){assert.fail('No confirmation on render');}}));
 effects.forEach(effect=>effect());return {nodes,emitted,acceptCalls};
}
for(const language of ['en','et'])test(language+': saved confirmation is readable with no fabricated checked checkbox',()=>{
 const {nodes,emitted,acceptCalls}=gate(language);assert.ok(words(nodes).includes(catalog[language].savedConfirmationsTitle));
 assert.ok(words(nodes).includes(catalog[language].savedConfirmationsHelp));assert.ok(all(nodes).some(n=>n.type==='details'));
 assert.equal(all(nodes).filter(n=>n.type==='input'&&n.props.name==='horse-offer-publication-confirm-all').length,0);
 assert.ok(words(nodes).includes(catalog[language].readyToSave));assert.equal(acceptCalls,0);assert.equal(emitted.at(-1).length,2);
});
for(const language of ['en','et'])test(language+': missing saved evidence still shows an unchecked factual confirmation',()=>{
 const {nodes}=gate(language,{saved:false});const boxes=all(nodes).filter(n=>n.type==='input'&&n.props.name==='horse-offer-publication-confirm-all');
 assert.equal(boxes.length,1);assert.equal(boxes[0].props.checked,false);assert.equal(words(nodes).includes(catalog[language].savedConfirmationsTitle),false);
});
test('a saved factual confirmation never accepts changed policy documents',()=>{
 const {nodes,emitted,acceptCalls}=gate('et',{accepted:false});assert.equal(acceptCalls,0);assert.equal(emitted.at(-1),null);
 assert.equal(words(nodes).includes(catalog.et.readyToSave),false);
 const boxes=all(nodes).filter(n=>n.type==='input'&&n.props.type==='checkbox');assert.ok(boxes.length>0);assert.ok(boxes.every(n=>n.props.checked===false));
});

function editor({saved=true,accepted=true,dirty=true,status='paused',active=true}={}) {
 const s=snapshot({status,saved_confirmation:saved?evidence():null}),base=prepareForm(s.detail),form=plain(base);
 if(dirty)form.title='Updated title';const calls=[];
 const states=[base,form,[],confirmation.createHorseOfferPublicationConfirmationState(),accepted?policies().map(p=>({documentId:p.policyDocumentId,version:p.policyVersion,contentHash:p.contentHash,accepted:true})):null,''];
 let cursor=0;const Action=()=>null;
 const l=realm({react:{useState:()=>[states[cursor++],()=>{}],useEffect:()=>{},useRef:v=>({current:v})},
  'src/features/horse-offer-edit/model/useHorseOwnerContext.ts':{useHorseOwnerContext:()=>({actor,active,ready:active,snapshot:s,canAct:()=>active,reload(){},adopt(){}})},
  'src/features/horse-publication/model/useHorsePublication.ts':{useHorsePublication:()=>({view:{phase:'editing'},session:{start:input=>calls.push(plain(input))}})},
  'src/features/horse-offer-edit/components/OwnerHorseOfferEditFields.tsx':{__esModule:true,default:()=>null},
  'src/features/horse-offer-edit/components/OwnerHorseGalleryEditor.tsx':{__esModule:true,default:()=>null,horseEditorPhotos:()=>[],horseEditorGalleryDirty:()=>false},
  'src/features/horse-publication/components/HorsePublicationAction.tsx':{__esModule:true,default:Action},
  'src/features/listing-create/components/HorseOfferPublicationGate.tsx':{__esModule:true,default:()=>null}});
 const el=l('src/features/horse-offer-edit/components/OwnerHorseOfferEditor.tsx').default({userId:U,offerId:H});
 const children=[];function walk(node){if(Array.isArray(node))node.forEach(walk);else if(node&&typeof node==='object'){children.push(node);walk(node.props?.children);}}walk(el);
 return {action:children.find(n=>n.type===Action),calls,base,form};
}
for(const status of ['published','paused','closed'])test(status+' editor saves with stored evidence without requiring a fresh checkbox',()=>{
 const h=editor({status});assert.equal(h.action.props.canSubmit,true);h.action.props.onSubmit();assert.equal(h.calls.length,1);
 assert.deepEqual(h.calls[0].confirmations,{reusePublicationEventId:E});assert.equal(h.calls[0].expectedRevision,'12');
 assert.equal(h.calls[0].content.title,'Updated title');assert.equal(h.calls[0].policySnapshot.length,2);
});
test('the editor still blocks Save for absent evidence, missing current policies or no changes',()=>{
 for(const options of [{saved:false},{accepted:false},{dirty:false}])assert.equal(editor(options).action.props.canSubmit,false);
 const missing=editor({accepted:false});missing.action.props.onSubmit();assert.equal(missing.calls.length,0);
 assert.equal(editor({active:false}).action,undefined);
});
test('new saved-confirmation feedback has exact English and Estonian key parity',()=>{
 assert.deepEqual(Object.keys(catalog.en).sort(),Object.keys(catalog.et).sort());
 for(const key of ['savedConfirmationsTitle','savedConfirmationsHelp','savedConfirmationsAt','savedConfirmationsDetails','readyToSave','reviewBeforeSave'])
  for(const language of ['en','et'])assert.ok(catalog[language][key]);
 assert.ok(build(prepareForm(snapshot().detail)));
});
