'use strict';
// Real editor + publication hook + session + strict model. Only React scheduling,
// actor/read boundaries and remote operations are synthetic; no live data is used.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),plain=value=>JSON.parse(JSON.stringify(value));
const U='11111111-1111-4111-8111-111111111111',I='22222222-2222-4222-8222-222222222222';
const S='33333333-3333-4333-8333-333333333333',E='44444444-4444-4444-8444-444444444444',P='55555555-5555-4555-8555-555555555555';
const actor={userId:U,identityId:I},time='2026-11-08T12:00:00.000Z';
const policies=[{documentId:P,version:'1',contentHash:'a'.repeat(64),accepted:true}];
function owner(status='archived'){return {schema_version:1,content_type:'service',actor_user_id:U,identity_id:I,service_id:S,edit_revision:'12',status,
 content:{serviceId:S,title:'Repair service',description:'Saved description',category:'vehicle_machinery',subcategory:null,priceType:'contact',priceAmount:null,currency:'EUR',country:'Estonia',city:'Paide',location:null},
 images:[],policy_snapshot:[{document_id:P,version:'1',content_hash:'a'.repeat(64)}],created_at:time,updated_at:time,published_at:status==='draft'?null:time,sort_order:0};}
const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'?[node,...walk(node.props?.children)]:[];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness({completed=false,staleInitialRead=false,failedRead=false,create=false,status='archived',language='et',legacy=false}={}){
 const cells=[],events=new Map(),storage=new Map(),requests=[],adopted=[],frames=[],routes=[];
 let cursor=0,pendingEffects=[],needsRender=true,tree=null,serial=0,lockHeld=false,permitted=true,row=owner(status);
 if(legacy)row.content={...row.content,category:null,subcategory:null,priceType:'hourly',priceAmount:null};
 const results=new Map(),uuid=()=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(++serial).padStart(12,'0')}`;
 const key=`selqiro:v2:service-publication:1:${U}:${I}:${create?'create':S}`;
 const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const react={
  useState(initial){const i=cursor++;if(!cells[i])cells[i]={value:typeof initial==='function'?initial():initial};const cell=cells[i];return[cell.value,next=>{const value=typeof next==='function'?next(cell.value):next;if(!Object.is(value,cell.value)){cell.value=value;needsRender=true;}}];},
  useRef(initial){const i=cursor++;if(!cells[i])cells[i]={current:initial};return cells[i];},
  useEffect(effect,deps){const i=cursor++,old=cells[i];if(!old||!deps||deps.some((v,n)=>!Object.is(v,old.deps?.[n])))pendingEffects.push(()=>{old?.cleanup?.();const cell={deps};cells[i]=cell;cell.cleanup=effect();});},
  useMemo(factory,deps){const i=cursor++,old=cells[i];if(!old||deps.some((v,n)=>!Object.is(v,old.deps?.[n])))cells[i]={deps,value:factory()};return cells[i].value;},
  useCallback(fn,deps){return react.useMemo(()=>fn,deps);},
 };
 const context={actor,active:true,ready:true,snapshot:null,canAct:()=>permitted,
  adopt(next){adopted.push(next);context.snapshot=next;needsRender=true;},reload(){context.snapshot=bindSnapshot(row,actor,S);needsRender=true;},retry(){}};
 const window={addEventListener(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},removeEventListener(name,fn){events.get(name)?.delete(fn);},confirm(){return true;}};
 const navigator={locks:{async request(_key,_options,work){if(lockHeld)return work(null);lockHeld=true;try{return await work({name:_key});}finally{lockHeld=false;}}}};
 const router={replace:href=>routes.push(href)};
 const receipt=(command,state,attemptId,revision)=>({schema_version:1,content_type:'service',actor_user_id:U,identity_id:I,request_key:command.requestKey,
  state,attempt_id:attemptId,service_id:S,edit_revision:revision,publication_event_id:state==='published'?E:null,slots:[]});
 const request=async(_actor,action,body,signal)=>{
  assert.deepEqual(plain(_actor),actor);requests.push({action,body:plain(body)});if(signal.aborted)throw Error('context_changed');
  if(action==='owner-read'){if(failedRead)throw Error('outcome_unknown');return plain(row);}
  if(action==='status')return plain(results.get(body.requestKey));
  if(action==='prepare'){if(!create&&body.expectedRevision!==row.edit_revision)throw Error('revision_conflict');const result=receipt(body,'prepared',uuid(),create?'1':row.edit_revision);results.set(body.requestKey,result);return plain(result);}
  if(action==='publish'){
   const command=JSON.parse(storage.get(key)).command,previous=results.get(body.requestKey);
   if(!create)assert.equal(command.expectedRevision,row.edit_revision);
   row={...row,content:{...command.content,serviceId:S,priceAmount:command.content.priceAmount===null?null:command.content.priceAmount.toFixed(2)},status:create||row.status==='draft'?'published':row.status,
    published_at:time,edit_revision:String(BigInt(create?'1':row.edit_revision)+BigInt(1))};
   const result=receipt(command,'published',previous.attempt_id,row.edit_revision);results.set(body.requestKey,result);return plain(result);
  }
  throw Error('Unexpected action '+action);
 };
 const Fields=()=>null,Gallery=()=>null,Gate=()=>null,Action=()=>null,Categories=()=>null,Activity=()=>null;
 const policy={snapshot:policies,loading:false,refresh(){}};
 const overrides={
  'src/features/service-editor/model/useServiceOwnerContext.ts':{useServiceOwnerContext:()=>context},
  'src/features/service-editor/model/useServicePolicy.ts':{useServicePolicy:()=>policy},
  'src/entities/service/api/servicePublicationClient.ts':{servicePublicationRequest:request},
  'src/entities/listing/api/publicationJourneyClient.ts':{putPublicationPart(){assert.fail('No new photo in fixture');}},
  'src/entities/listing/model/listingPhotoPreparation.ts':{prepareListingPhoto(){assert.fail('No new photo in fixture');}},
  'src/shared/config/v2Integration.ts':{publicationUploadOrigin:()=>undefined},
  'src/features/service-editor/components/ServiceFields.tsx':{__esModule:true,default:Fields},
  'src/features/service-editor/components/ServiceGalleryEditor.tsx':{__esModule:true,default:Gallery,serviceEditorPhotos:()=>[],serviceGalleryDirty:(_original,photos)=>photos.length>0},
  'src/features/service-editor/components/ServicePolicyGate.tsx':{__esModule:true,default:Gate},
  'src/features/service-editor/components/ServicePublicationActions.tsx':{__esModule:true,default:Action},
  'src/features/service-editor/components/ServiceStoreCategoryCard.tsx':{__esModule:true,default:Categories},
  'src/features/service-activity/components/ServiceActivityCard.tsx':{__esModule:true,default:Activity},
 };
 const cache=new Map();
 function load(name){
  const file=path.resolve(root,name),relative=path.relative(root,file).split(path.sep).join('/');assert.ok(file.startsWith(root+path.sep));
  if(Object.hasOwn(overrides,relative))return overrides[relative];
  if(relative==='src/shared/i18n/V2LanguageProvider.tsx')return{useV2Translation:catalog=>({language,t:key=>catalog[language][key]})};
  if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);
  const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  const requireLocal=name=>{
   if(name==='react')return react;
   if(name==='react/jsx-runtime')return{jsx:(type,props,key)=>({type,props:props||{},key}),jsxs:(type,props,key)=>({type,props:props||{},key}),Fragment:'fragment'};
   if(name==='next/link')return{__esModule:true,default:props=>({type:'a',props})};if(name==='next/navigation')return{useRouter:()=>router};
   assert.ok(name.startsWith('.'),'Unexpected dependency '+name);const resolved=path.resolve(path.dirname(file),name);return load(fs.existsSync(resolved+'.ts')?resolved+'.ts':resolved+'.tsx');
  };
  vm.runInThisContext('(function(module,exports,require,window,navigator,localStorage,process,crypto){'+output.outputText+'\n})',{filename:file,timeout:2000})
   (module,module.exports,requireLocal,window,navigator,localStorage,{env:{NEXT_PUBLIC_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co'}},{randomUUID:uuid});
  return module.exports;
 }
 const {bindServiceOwnerSnapshot:bindSnapshot,bindServicePrepare}=load('src/entities/service/model/servicePublication.ts');
 const {serviceEditorForm,buildServiceContent}=load('src/features/service-editor/model/serviceEditorForm.ts');
 const seedCompleted=title=>{
  const content={...buildServiceContent(serviceEditorForm(bindSnapshot(row,actor,S).service),S),title};
  const command=bindServicePrepare({expectedUserId:U,expectedIdentityId:I,requestKey:uuid(),serviceId:S,expectedRevision:row.edit_revision,content,gallery:[],policySnapshot:policies},actor,S);
  const attemptId=uuid();row={...row,content:{...row.content,title},edit_revision:String(BigInt(row.edit_revision)+BigInt(1))};
  results.set(command.requestKey,receipt(command,'published',attemptId,row.edit_revision));storage.set(key,JSON.stringify({version:1,requestKey:command.requestKey,command,attemptId,dispatched:[],preparation:[]}));return command;
 };
 context.snapshot=create?null:bindSnapshot(row,actor,S);
 if(completed){seedCompleted('Verified latest title');if(!staleInitialRead)context.snapshot=bindSnapshot(row,actor,S);}
 const Editor=load('src/features/service-editor/components/ServiceEditor.tsx').default;
 const componentNode=type=>walk(tree).find(node=>node.type===type);
 function render(){let count=0;while(needsRender){assert.ok(++count<40,'render settles');needsRender=false;cursor=0;pendingEffects=[];tree=Editor({userId:U,serviceId:create?null:S});
  const fields=componentNode(Fields),action=componentNode(Action);frames.push({disabled:fields?.props.disabled,title:fields?.props.form.title,revision:context.snapshot?.editRevision,phase:action?.props.view.phase,hasSession:!!action?.props.session});
  const effects=pendingEffects;pendingEffects=[];effects.forEach(effect=>effect());}}
 async function flush(){let idle=0;for(let n=0;n<80&&idle<3;n++){render();await tick();if(needsRender)idle=0;else idle++;}render();}
 return {flush,context,requests,adopted,frames,storage,key,routes,
  get action(){return componentNode(Action);},get fields(){return componentNode(Fields);},get row(){return row;},
  get activity(){return componentNode(Activity);},get gallery(){return componentNode(Gallery);},get categories(){return componentNode(Categories);},
  async change(patch){assert.equal(componentNode(Fields).props.disabled,false);componentNode(Fields).props.onChange({...componentNode(Fields).props.form,...patch});await flush();},
  async save(){componentNode(Action).props.onSubmit();await flush();},
  async foreignSave(title){seedCompleted(title);for(const f of events.get('storage')||[])f({key});await flush();},
  async reload(){walk(tree).find(node=>node.type==='button'&&node.props.children===(language==='et'?'Laadi salvestatud versioon':'Load saved version')).props.onClick();await flush();},
  async recoverRead(){failedRead=false;await componentNode(Action).props.session.inspect();await flush();},
  async revoke(){permitted=false;context.active=false;context.ready=false;context.error='contextChanged';needsRender=true;await flush();},
  close(){for(const cell of cells)cell?.cleanup?.();},
 };
}
for(const language of ['et','en'])test(language+': edit opens writable, uses existing policy and waits for changed fields',async()=>{
 const h=harness({language});await h.flush();assert.equal(h.fields.props.disabled,false);assert.equal(h.action.props.canSubmit,false);assert.equal(h.action.props.publish,false);
 await h.change({title:'First edit'});assert.equal(h.action.props.canSubmit,true);assert.equal(h.requests.length,0);assert.ok(h.frames.every(f=>f.disabled!==false||f.hasSession));h.close();
});
test('two consecutive saves adopt fresh revisions and keep a paused service paused',async()=>{
 const h=harness();await h.flush();await h.change({title:'First saved edit'});await h.save();
 assert.equal(h.row.status,'archived');assert.equal(h.fields.props.disabled,false);assert.equal(h.context.snapshot.editRevision,'13');assert.equal(h.action.props.canSubmit,false);assert.equal(h.action.props.view.message,'changesSaved');assert.equal(h.storage.has(h.key),false);
 await h.change({title:'Second saved edit'});assert.equal(h.action.props.view.message,'');await h.save();
 assert.equal(h.fields.props.form.title,'Second saved edit');assert.equal(h.context.snapshot.editRevision,'14');assert.equal(h.row.status,'archived');assert.equal(h.action.key,'form');
 const writes=h.requests.filter(r=>r.action==='prepare').map(r=>r.body);assert.equal(writes.length,2);assert.equal(writes[0].expectedRevision,'12');assert.equal(writes[1].expectedRevision,'13');assert.notEqual(writes[0].requestKey,writes[1].requestKey);
 assert.ok(writes.every(w=>w.policySnapshot.length===1&&!Object.hasOwn(w,'confirmations')));h.close();
});
test('completed historical save opens its verified snapshot immediately, without Edit Again',async()=>{
 const h=harness({completed:true,staleInitialRead:true});await h.flush();assert.equal(h.fields.props.form.title,'Verified latest title');assert.equal(h.context.snapshot.editRevision,'13');
 assert.equal(h.fields.props.disabled,false);assert.equal(h.storage.has(h.key),false);assert.equal(h.adopted.length,1);assert.deepEqual(h.requests.map(r=>r.action),['status','owner-read']);
 assert.ok(h.frames.filter(f=>f.disabled===false).every(f=>f.title==='Verified latest title'&&f.revision==='13'));h.close();
});
test('foreign completion preserves unsaved text and blocks save until explicit reload',async()=>{
 const h=harness();await h.flush();await h.change({title:'My unsaved edit'});await h.foreignSave('Other tab saved title');
 assert.equal(h.fields.props.form.title,'My unsaved edit');assert.equal(h.context.snapshot.editRevision,'12');assert.equal(h.action.props.canSubmit,false);assert.equal(h.action.props.view.message,'savedElsewhere');
 await h.save();assert.equal(h.requests.some(r=>r.action==='prepare'),false);await h.reload();assert.equal(h.fields.props.form.title,'Other tab saved title');assert.equal(h.context.snapshot.editRevision,'13');
 await h.change({title:'Fresh edit'});await h.save();assert.equal(h.row.content.title,'Fresh edit');assert.equal(h.context.snapshot.editRevision,'14');h.close();
});
test('unknown historical save cannot unlock fields until confirmed owner readback',async()=>{
 const h=harness({completed:true,failedRead:true});await h.flush();assert.equal(h.fields.props.disabled,true);assert.equal(h.action.props.view.phase,'unknown');assert.ok(h.storage.has(h.key));
 await h.recoverRead();assert.equal(h.fields.props.disabled,false);assert.equal(h.fields.props.form.title,'Verified latest title');assert.equal(h.storage.has(h.key),false);assert.equal(h.requests.some(r=>r.action==='publish'),false);h.close();
});
test('old unpublished service publishes using the same editor and then saves normally',async()=>{
 const h=harness({status:'draft'});await h.flush();assert.equal(h.action.props.publish,true);assert.equal(h.action.props.canSubmit,true);await h.save();assert.equal(h.row.status,'published');assert.equal(h.action.props.publish,false);
 await h.change({description:'Later edit'});await h.save();assert.equal(h.row.status,'published');assert.equal(h.row.content.description,'Later edit');h.close();
});
test('new service publishes once and hands off to its canonical owner edit route',async()=>{
 const h=harness({create:true});await h.flush();await h.change({title:'Created service',category:'vehicle_machinery'});await h.save();
 assert.deepEqual(h.routes,[`/v2/my-area/services/${S}/edit`],JSON.stringify({phase:h.action?.props.view.phase,message:h.action?.props.view.message,calls:h.requests.map(r=>r.action)}));assert.equal(h.row.status,'published');assert.equal(h.storage.has(h.key),false);assert.equal(h.action.props.canSubmit,false);
 await h.save();assert.equal(h.requests.filter(r=>r.action==='prepare').length,1);h.close();
});
test('identity invalidation hides the owner form and prevents further writes',async()=>{
 const h=harness();await h.flush();await h.change({title:'Unsaved owner text'});const priorAction=h.action;await h.revoke();assert.equal(h.fields,undefined);priorAction.props.onSubmit();await h.flush();
 assert.equal(h.requests.some(r=>r.action==='prepare'||r.action==='publish'),false);h.close();
});

for(const status of ['published','archived'])test(status+': unrelated text edits retain legacy missing category and amount',async()=>{
 const h=harness({status,legacy:true});await h.flush();assert.equal(h.fields.props.form.category,'');assert.equal(h.fields.props.form.priceAmount,'');
 await h.change({description:'Edited description only'});await h.save();assert.equal(h.row.content.category,null);assert.equal(h.row.content.priceAmount,null);assert.equal(h.row.content.priceType,'hourly');assert.equal(h.row.status,status);
 assert.equal(h.context.snapshot.editRevision,'13');assert.equal(h.fields.props.disabled,false);h.close();
});

test('independent activity busy/read feedback preserves unsaved title, local photo and category draft',async()=>{
 const f=harness();await f.flush();await f.change({title:'Unsaved owner title'});
 const photo={id:'local-photo',file:new Blob(['synthetic photo']),previewUrl:'blob:synthetic-photo',isPrimary:true};
 f.gallery.props.onChange([photo]);f.categories.props.onPendingChange(true);await f.flush();
 assert.equal(f.activity.props.blocked,true);assert.equal(f.activity.props.pendingChanges,true);
 const fields=f.fields.props.form,photos=f.gallery.props.photos;
 f.activity.props.onBusyChange(true);await f.flush();assert.equal(f.action.props.canSubmit,false);
 assert.equal(f.fields.props.form,fields);assert.equal(f.gallery.props.photos,photos);
 f.activity.props.onBusyChange(false);f.activity.props.onCheckRequired(true);await f.flush();
 f.activity.props.onCheckRequired(false);await f.flush();
 assert.equal(f.fields.props.form.title,'Unsaved owner title');assert.equal(f.gallery.props.photos[0],photo);
 assert.equal(f.activity.props.pendingChanges,true);assert.equal(f.adopted.length,0);
 assert.equal(f.requests.some(call=>call.action==='publish'),false);
});
