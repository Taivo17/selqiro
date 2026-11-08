/* The real owner editor, publication hook and session run together. React
 * lifecycle, actor reads, Web Locks, storage and HTTP are synthetic boundaries;
 * no live account, database or browser is used. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const U='11111111-1111-4111-8111-111111111111',I='22222222-2222-4222-8222-222222222222';
const H='33333333-3333-4333-8333-333333333333',E='44444444-4444-4444-8444-444444444444';
const P='55555555-5555-4555-8555-555555555555',Q='66666666-6666-4666-8666-666666666666';
const actor={userId:U,identityId:I},time='2026-11-08T12:00:00.000Z';
const plain=value=>JSON.parse(JSON.stringify(value));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const policies=[{documentId:P,version:'1',contentHash:'a'.repeat(64),accepted:true},
 {documentId:Q,version:'1',contentHash:'b'.repeat(64),accepted:true}];
function ownerRow(){return {content_type:'horse_offer',content_id:H,offer_id:H,identity_id:I,offer_type:'sale',status:'paused',
 title:'Saved title',description:'Saved description',price_amount:null,price_type:'contact',currency:'EUR',market_country_code:'EE',horse_location_country_code:'EE',
 horse_name:'Horse',birth_year:2018,sex:null,breed:null,color:null,height_cm:null,discipline:null,training_level:null,suitability:null,
 health_notes:null,behavior_notes:null,city:null,region:null,location_text:null,horse_lat:null,horse_lng:null,
 image_url:null,images:[],details:{schema_version:1,branch:'specific'},published_at:time,active_until:'2027-02-06T12:00:00+00:00',
 created_at:time,updated_at:time,held_at:null,paused_at:time,closed_at:null,rejected_at:null,archived_at:null,edit_revision:'12',
 saved_confirmation:{schema_version:1,offer_id:H,identity_id:I,actor_user_id:U,offer_type:'sale',publication_event_id:E,confirmed_at:time}};}
const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'?[node,...walk(node.props?.children)]:[];

function harness({completed=false,staleInitialRead=false,failedRead=false}={}){
 const cells=[],events=new Map(),storage=new Map(),requests=[],adopted=[],frames=[];
 let cursor=0,pendingEffects=[],needsRender=true,tree=null,serial=0,lockHeld=false,permitted=true;
 let row=ownerRow();const results=new Map();
 const uuid=()=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(++serial).padStart(12,'0')}`;
 const key=`selqiro:v2:horse-publication:1:${U}:${I}:${H}`;
 const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const react={
  useState(initial){const i=cursor++;if(!cells[i])cells[i]={value:typeof initial==='function'?initial():initial};
   const cell=cells[i];return [cell.value,next=>{const value=typeof next==='function'?next(cell.value):next;if(!Object.is(value,cell.value)){cell.value=value;needsRender=true;}}];},
  useRef(initial){const i=cursor++;if(!cells[i])cells[i]={current:initial};return cells[i];},
  useEffect(effect,deps){const i=cursor++,old=cells[i];if(!old||!deps||deps.some((value,n)=>!Object.is(value,old.deps?.[n]))){
   pendingEffects.push(()=>{old?.cleanup?.();const cell={deps};cells[i]=cell;cell.cleanup=effect();});}},
 };
 const context={actor,active:true,ready:true,snapshot:null,canAct:()=>permitted,
  adopt(next){adopted.push(next);context.snapshot=next;needsRender=true;},
  reload(){context.snapshot=bindSnapshot(row,actor,H);needsRender=true;},retry(){}};
 const window={addEventListener(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},
  removeEventListener(name,fn){events.get(name)?.delete(fn);},confirm(){return true;}};
 const navigator={locks:{async request(_key,_options,work){if(lockHeld)return work(null);lockHeld=true;try{return await work({name:_key});}finally{lockHeld=false;}}}};
 const receipt=(command,state,attemptId,revision)=>({schema_version:1,content_type:'horse_offer',actor_user_id:U,identity_id:I,
  request_key:command.requestKey,state,attempt_id:attemptId,horse_offer_id:H,edit_revision:revision,
  publication_event_id:state==='published'?E:null,slots:[]});
 const request=async(_actor,action,body,signal)=>{
  assert.deepEqual(plain(_actor),actor);requests.push({action,body:plain(body)});
  if(signal.aborted)throw Error('context_changed');
  if(action==='owner-read'){if(failedRead)throw Error('outcome_unknown');return plain(row);}
  if(action==='status')return plain(results.get(body.requestKey));
  if(action==='prepare'){
   if(body.expectedRevision!==row.edit_revision)throw Error('revision_conflict');
   const result=receipt(body,'prepared',uuid(),row.edit_revision);results.set(body.requestKey,result);return plain(result);
  }
  if(action==='publish'){
   const journal=JSON.parse(storage.get(key)),previous=results.get(body.requestKey),command=journal.command;
   assert.equal(command.expectedRevision,row.edit_revision);
   row={...row,title:command.content.title,description:command.content.description,edit_revision:String(BigInt(row.edit_revision)+1n)};
   const result=receipt(command,'published',previous.attempt_id,row.edit_revision);results.set(body.requestKey,result);return plain(result);
  }
  throw Error('Unexpected action '+action);
 };
 const Fields=()=>null,Gallery=()=>null,Gate=()=>null,Action=()=>null;
 const overrides={
  'src/features/horse-offer-edit/model/useHorseOwnerContext.ts':{useHorseOwnerContext:()=>context},
  'src/entities/horse-offer/api/horsePublicationClient.ts':{horsePublicationRequest:request},
  'src/entities/listing/api/publicationJourneyClient.ts':{putPublicationPart(){assert.fail('No new photo in this fixture');}},
  'src/entities/listing/model/listingPhotoPreparation.ts':{prepareListingPhoto(){assert.fail('No new photo in this fixture');}},
  'src/shared/config/v2Integration.ts':{publicationUploadOrigin:()=>undefined},
  'src/features/horse-offer-edit/components/OwnerHorseOfferEditFields.tsx':{__esModule:true,default:Fields},
  'src/features/horse-offer-edit/components/OwnerHorseGalleryEditor.tsx':{__esModule:true,default:Gallery,horseEditorPhotos:()=>[],horseEditorGalleryDirty:()=>false},
  'src/features/listing-create/components/HorseOfferPublicationGate.tsx':{__esModule:true,default:Gate},
  'src/features/horse-publication/components/HorsePublicationAction.tsx':{__esModule:true,default:Action},
 };
 const cache=new Map();
 function load(name){
  const file=path.resolve(root,name),relative=path.relative(root,file).split(path.sep).join('/');assert.ok(file.startsWith(root+path.sep));
  if(Object.hasOwn(overrides,relative))return overrides[relative];
  if(relative==='src/shared/i18n/V2LanguageProvider.tsx')return {useV2Translation:catalog=>({language:'et',t:key=>catalog.et[key]})};
  if(cache.has(file))return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  assert.equal(output.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  const requireLocal=name=>{
   if(name==='react')return react;
   if(name==='react/jsx-runtime')return {jsx:(type,props,key)=>({type,props:props||{},key}),jsxs:(type,props,key)=>({type,props:props||{},key}),Fragment:'fragment'};
   if(name==='next/link')return {__esModule:true,default:props=>({type:'a',props})};
   assert.ok(name.startsWith('.'),'Unexpected dependency '+name);const resolved=path.resolve(path.dirname(file),name);
   return load(fs.existsSync(resolved+'.ts')?resolved+'.ts':resolved+'.tsx');
  };
  vm.runInThisContext('(function(module,exports,require,window,navigator,localStorage,process,crypto){'+output.outputText+'\n})',{filename:file,timeout:2000})
   (module,module.exports,requireLocal,window,navigator,localStorage,{env:{NEXT_PUBLIC_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co'}},{randomUUID:uuid});
  return module.exports;
 }
 const {bindHorseOwnerSnapshot:bindSnapshot,bindHorsePrepare}=load('src/entities/horse-offer/model/publication.ts');
 const prepareForm=load('src/features/horse-offer-edit/model/ownerHorseDraftForm.ts').prepareOwnerHorseDraftForm;
 const build=load('src/features/listing-create/model/horseOfferDraftSave.ts').buildHorseOfferDraftSaveInput;
 const seedCompleted=title=>{
  const content={...build(prepareForm(bindSnapshot(row,actor,H).detail)),title};
  const command=bindHorsePrepare({expectedUserId:U,expectedIdentityId:I,requestKey:uuid(),offerId:H,expectedRevision:row.edit_revision,
   content,gallery:[],confirmations:{reusePublicationEventId:E},policySnapshot:policies},actor,H);
  const attemptId=uuid();row={...row,title,edit_revision:String(BigInt(row.edit_revision)+1n)};
  results.set(command.requestKey,receipt(command,'published',attemptId,row.edit_revision));
  storage.set(key,JSON.stringify({version:1,requestKey:command.requestKey,command,attemptId,dispatched:[],preparation:[]}));
  return command;
 };
 context.snapshot=bindSnapshot(row,actor,H);
 if(completed){seedCompleted('Verified latest title');if(!staleInitialRead)context.snapshot=bindSnapshot(row,actor,H);}
 const Editor=load('src/features/horse-offer-edit/components/OwnerHorseOfferEditor.tsx').default;
 const componentNode=type=>walk(tree).find(node=>node.type===type);
 function render(){
  let count=0;
  while(needsRender){assert.ok(++count<30,'effect/render cycle settles');needsRender=false;cursor=0;pendingEffects=[];
   tree=Editor({userId:U,offerId:H});const fields=componentNode(Fields),action=componentNode(Action);
   frames.push({disabled:fields?.props.disabled,title:fields?.props.form.title,revision:context.snapshot.editRevision,
    phase:action?.props.view.phase,hasSession:!!action?.props.session,actionKey:action?.key});
   const effects=pendingEffects;pendingEffects=[];effects.forEach(effect=>effect());
  }
 }
 async function flush(){let idle=0;for(let n=0;n<60&&idle<3;n++){render();await tick();if(needsRender)idle=0;else idle++;}render();}
 const event=()=>{for(const listener of events.get('storage')||[])listener({key});};
 return {flush,context,requests,adopted,frames,storage,key,
  get action(){return componentNode(Action);},get fields(){return componentNode(Fields);},get gate(){return componentNode(Gate);},get row(){return row;},
  async acceptPolicies(){componentNode(Gate).props.onPoliciesChange(policies);await flush();},
  async title(value){assert.equal(componentNode(Fields).props.disabled,false);componentNode(Fields).props.onChange(form=>({...form,title:value}));await flush();},
  async save(){componentNode(Action).props.onSubmit();await flush();},
  async foreignSave(title){seedCompleted(title);event();await flush();},
  async clearStorage(){storage.delete(key);event();await flush();},
  async recoverRead(){failedRead=false;await componentNode(Action).props.session.inspect();await flush();},
  revoke(){permitted=false;},
  close(){for(const cell of cells)cell?.cleanup?.();},
 };
}

test('the loaded owner edit form is immediately writable and Save waits for changes',async()=>{
 const h=harness();await h.flush();assert.equal(h.fields.props.disabled,false);assert.equal(h.action.props.ownerEdit,true);
 assert.equal(h.action.props.canSubmit,false);assert.equal(h.action.props.view.phase,'editing');
 assert.ok(h.frames.every(frame=>frame.disabled!==false||frame.hasSession),'no editable frame before the controller is ready');
 await h.acceptPolicies();await h.title('First edit');assert.equal(h.action.props.canSubmit,true);
 assert.equal(h.gate.props.savedConfirmation.publicationEventId,E);assert.equal(h.requests.length,0);h.close();
});
test('a completed historical journal adopts the latest whole snapshot and opens editing without another button',async()=>{
 const h=harness({completed:true,staleInitialRead:true});await h.flush();await h.acceptPolicies();
 assert.equal(h.fields.props.disabled,false);assert.equal(h.fields.props.form.title,'Verified latest title');
 assert.equal(h.context.snapshot.editRevision,'13');assert.equal(h.action.props.view.phase,'editing');assert.equal(h.action.props.canSubmit,false);
 assert.equal(h.storage.has(h.key),false);assert.equal(h.adopted.length,1);
 assert.ok(h.frames.filter(frame=>frame.disabled===false).every(frame=>frame.title==='Verified latest title'&&frame.revision==='13'));
 assert.deepEqual(h.requests.map(call=>call.action),['status','owner-read']);h.close();
});
test('two consecutive edits save with fresh keys and the adopted current revision',async()=>{
 const h=harness();await h.flush();await h.acceptPolicies();await h.title('First saved edit');await h.save();
 assert.equal(h.fields.props.disabled,false);assert.equal(h.fields.props.form.title,'First saved edit');
 assert.equal(h.context.snapshot.editRevision,'13');assert.equal(h.action.props.canSubmit,false);assert.equal(h.action.props.view.message,'changesSaved');
 assert.equal(h.storage.has(h.key),false);const first=h.requests.find(call=>call.action==='prepare').body;
 await h.title('Second saved edit');assert.equal(h.action.props.view.message,'','old success does not describe new unsaved text');
 await h.save();assert.equal(h.fields.props.disabled,false);assert.equal(h.fields.props.form.title,'Second saved edit');
 assert.equal(h.context.snapshot.editRevision,'14');assert.equal(h.row.title,'Second saved edit');assert.equal(h.storage.has(h.key),false);
 const commands=h.requests.filter(call=>call.action==='prepare').map(call=>call.body);assert.equal(commands.length,2);
 assert.equal(first.expectedRevision,'12');assert.equal(commands[1].expectedRevision,'13');assert.notEqual(first.requestKey,commands[1].requestKey);
 assert.ok(commands.every(command=>h.frames.some(frame=>frame.actionKey===command.requestKey)));
 assert.equal(h.action.key,'form','retirement remounts recovery-local file selection before the next edit');
 assert.ok(commands.every(command=>command.confirmations.reusePublicationEventId===E));
 assert.equal(h.requests.filter(call=>call.action==='publish').length,2);h.close();
});
test('a foreign completion preserves unsaved values and their old revision instead of silently overwriting',async()=>{
 const h=harness();await h.flush();await h.acceptPolicies();await h.title('My unsaved edit');await h.foreignSave('Other tab saved title');
 assert.equal(h.fields.props.disabled,false);assert.equal(h.fields.props.form.title,'My unsaved edit');assert.equal(h.context.snapshot.editRevision,'12');
 assert.equal(h.adopted.length,0);assert.equal(h.action.props.view.message,'savedElsewhere');assert.equal(h.storage.has(h.key),false);
 await h.save();const sent=h.requests.find(call=>call.action==='prepare').body;
 assert.equal(sent.expectedRevision,'12');assert.equal(sent.content.title,'My unsaved edit');assert.equal(h.row.title,'Other tab saved title');
 assert.equal(h.action.props.view.phase,'needs_attention');assert.equal(h.fields.props.form.title,'My unsaved edit');assert.ok(h.storage.has(h.key));h.close();
});
test('explicit reload after a foreign completion replaces values and revision together',async()=>{
 const h=harness();await h.flush();await h.acceptPolicies();await h.title('My unsaved edit');await h.foreignSave('Other tab saved title');
 h.context.reload();await h.flush();assert.equal(h.fields.props.form.title,'Other tab saved title');assert.equal(h.context.snapshot.editRevision,'13');
 assert.equal(h.action.props.canSubmit,false);assert.equal(h.action.props.view.message,'');assert.equal(h.fields.props.disabled,false);h.close();
});
test('a storage removal event does not attach a newer revision to an unchanged local draft',async()=>{
 const h=harness();await h.flush();await h.acceptPolicies();await h.title('My unsaved edit');const snapshot=h.context.snapshot;
 await h.clearStorage();assert.equal(h.fields.props.form.title,'My unsaved edit');assert.equal(h.context.snapshot,snapshot);
 assert.equal(h.context.snapshot.editRevision,'12');assert.equal(h.fields.props.disabled,false);assert.equal(h.adopted.length,0);h.close();
});
test('unknown historical save stays protected until its saved result can actually be read',async()=>{
 const h=harness({completed:true,failedRead:true});await h.flush();assert.equal(h.fields.props.disabled,true);
 assert.equal(h.action.props.view.phase,'unknown');assert.ok(h.storage.has(h.key));assert.equal(h.adopted.length,0);
 await h.recoverRead();assert.equal(h.fields.props.disabled,false);assert.equal(h.action.props.view.phase,'editing');assert.equal(h.storage.has(h.key),false);
 assert.equal(h.requests.some(call=>call.action==='prepare'||call.action==='publish'),false);h.close();
});
