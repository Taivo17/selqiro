/* Actual source with isolated transports, clocks and hook/JSX lifecycle.
 * No live DB, browser, image codec or production authorization is exercised. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const U='11111111-1111-4111-8111-111111111111', I='22222222-2222-4222-8222-222222222222';
const H='33333333-3333-4333-8333-333333333333', A='44444444-4444-4444-8444-444444444444';
const actor={userId:U,identityId:I};
const now=Date.parse('2026-11-08T12:00:00Z');
const until='2026-12-01T12:00:00.123456+00:00';
const nextUntil='2027-02-06T12:00:00.654321+00:00';
const pub='/api/v2/horse-media/'+A+'/0', own='/api/v2/horse-owner-media/'+A+'/0';
const plain=x=>JSON.parse(JSON.stringify(x));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function realm(overrides={}) {
 const cache=new Map(),language=overrides.language||'et';
 function load(rel) {
  const file=path.resolve(root,rel),name=path.relative(root,file).split(path.sep).join('/');
  assert.ok(file.startsWith(root+path.sep));
  if(Object.hasOwn(overrides,name))return overrides[name];
  if(name==='src/shared/i18n/V2LanguageProvider.tsx')return {
   useV2Language:()=>({language}),useV2Translation:catalog=>({language,t:(key,params)=>load('lib/i18n/useTranslation.ts').getCatalogTranslation(language,catalog,key,params)})};
  if(name==='src/shared/config/v2Integration.ts')return {v2IntegrationEnabled:()=>true};
  if(name==='src/shared/supabase/browserClient.ts')throw Error('Explicit fake transport required');
  if(cache.has(file))return cache.get(file).exports;
  const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  const module={exports:{}};cache.set(file,module);
  function requireLocal(name){
   if(name==='react/jsx-runtime')return {jsx:(type,props,key)=>({type,props:props||{},key}),jsxs:(type,props,key)=>({type,props:props||{},key}),Fragment:'fragment'};
   if(name==='next/link')return {__esModule:true,default:props=>({type:'a',props})};
   if(name==='react')return overrides.react||{useState:x=>[typeof x==='function'?x():x,()=>{}],useRef:x=>({current:x}),useEffect:()=>{},useMemo:f=>f(),useCallback:f=>f};
   assert.ok(name.startsWith('.')||name.startsWith('@/'),'Unexpected dependency '+name);
   const target=name.startsWith('@/')?path.resolve(root,name.slice(2)):path.resolve(path.dirname(file),name);
   return load(fs.existsSync(target+'.ts')?target+'.ts':target+'.tsx');
  }
  vm.runInNewContext(out.outputText,{module,exports:module.exports,require:requireLocal,
   Date,Intl,Number,String,Object,Array,Set,Map,JSON,BigInt,Promise,Error,AbortController,Blob,Uint8Array,TextEncoder,
   URL:overrides.URL||URL,fetch:overrides.fetch,window:overrides.window,queueMicrotask,
   setTimeout:overrides.setTimeout||setTimeout,clearTimeout:overrides.clearTimeout||clearTimeout,
  },{filename:file,timeout:1500});
  return module.exports;
 }return load;
}
const load=realm();
const activity=load('src/entities/horse-offer/model/horseActivity.ts');
const micros=load('src/entities/listing/model/listingActivity.ts').listingDeadlineMicros;
const media=load('src/entities/marketplace-item/model/ownerMediaUrl.ts');
const mapper=load('src/features/my-area/model/mapMyAreaMarketplaceItemRow.ts').mapMyAreaMarketplaceItemRow;
const Session=load('src/features/my-area/model/ownerListingActivitySession.ts').OwnerListingActivitySession;
function row(over={}) {return mapper({key:'horse_offer:'+H,contentId:H,contentType:'horse_offer',identityId:I,ownerUserId:U,
 sourceStatus:'published',lifecycleStatus:'active',contentVariant:'sale',title:'User title',description:'Description',
 imageUrl:pub,priceText:null,priceAmount:1200,currency:'EUR',priceType:'fixed',locationLabel:'Tartu',city:null,region:null,
 activeUntil:until,publishedAt:'2026-11-01T12:00:00.123456+00:00',createdAt:'2026-11-01T12:00:00Z',...over});}
function snapshot(over={}) {return {schema_version:1,content_type:'horse_offer',content_id:H,actor_user_id:U,identity_id:I,
 source_status:'published',status:'active',active_until:until,edit_revision:'12',changed:false,...over};}
const input={offerId:H,expectedStatus:'published',expectedActiveUntil:until,expectedActor:actor};

test('legacy deadline is exactly ninety 24-hour days with original microseconds and timezone normalized',()=>{
 const published='2026-10-25T03:30:00.123456+03:00';
 const result=activity.horseActivityDeadline(null,published);
 assert.equal(micros(result)-micros(published),90n*24n*60n*60n*1_000_000n);
 assert.match(result,/\.123456Z$/);assert.equal(activity.horseActivityDeadline(until,published),until);
 assert.equal(activity.horseActivityDeadline(null,null),null);
 assert.equal(activity.horseActivityDeadline(null,'infinity'),null);
});
test('horse mapper keeps exact stored expiry and derives legacy expiry without data mutation',()=>{
 assert.equal(row().activeUntil,until);const r=row({activeUntil:null});
 assert.equal(micros(r.activeUntil)-micros(r.publishedAt),90n*24n*60n*60n*1_000_000n);
 assert.equal(r.canChangeStatus,true);assert.equal(row({activeUntil:null,publishedAt:null}).canChangeStatus,false);
 assert.equal(row({sourceStatus:'draft',activeUntil:null,publishedAt:null}).canChangeStatus,false);
});
test('horse public WEB references survive owner validation and map only to protected horse media',()=>{
 assert.equal(media.ownerImageUrl(pub,'horse_offer'),pub);assert.equal(media.ownerImageUrl(own,'horse_offer'),own);
 assert.equal(media.ownerMediaRequestPath(pub,'horse_offer'),own);assert.equal(media.ownerMediaRequestPath(own,'horse_offer'),own);
 assert.equal(media.ownerImageUrl(pub,'listing'),null);assert.equal(media.ownerMediaRequestPath(pub,'listing'),null);
 const ordinary='/api/v2/listing-media/'+A+'/9';
 assert.equal(media.ownerImageUrl(ordinary,'listing'),ordinary);assert.equal(media.ownerImageUrl(ordinary,'horse_offer'),null);
 assert.equal(media.ownerMediaRequestPath(ordinary,'listing'),'/api/v2/listing-owner-media/'+A+'/9');
});
for(const value of [pub+'?token=secret',pub+'#x',pub.replace('/0','/10'),pub.replace(A,'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'),pub.replace(A,'00000000-0000-0000-0000-000000000000'),'/api/v2/horse-source/'+A+'/0','//evil.invalid/x','javascript:alert(1)'])
 test('invalid private media reference is rejected: '+value,()=>{assert.equal(media.ownerImageUrl(value,'horse_offer'),null);assert.equal(media.ownerMediaRequestPath(value,'horse_offer'),null);});
test('strict v3 owner page retains horse thumbnail route',()=>{
 const v3=load('src/entities/marketplace-item/model/ownerRead/ownerMarketplaceV3.ts');
 const context={actorId:U,identityId:I},request=v3.ownerReadRequest(context);
 const item={content_type:'horse_offer',content_id:H,identity_id:I,source_status:'published',lifecycle_status:'active',content_variant:'sale',
  title:'Title',title_truncated:false,description_excerpt:'Desc',description_truncated:false,image_url:pub,category:null,subcategory:null,condition:null,
  city:'Tartu',region:null,location_label:'Tartu',active_until:until,published_at:'2026-11-01T12:00:00.123456Z',created_at:'2026-11-01T12:00:00Z',sort_at:'2026-11-01T12:00:00Z',
  money:{role:'horse_offer_price',value:{version:1,kind:'fixed',amount:'1200',currency:'EUR'}}};
 const page={schema_version:3,actor_id:U,identity_id:I,result_limit:30,result_offset:0,has_more:false,next_offset:null,window_limit_reached:false,items:[item]};
 assert.equal(v3.parseOwnerReadPage(page,context,request).items[0].image_url,pub);
 item.image_url='/api/v2/listing-media/'+A+'/0';assert.equal(v3.parseOwnerReadPage(page,context,request).items[0].image_url,null);
});
test('activity snapshots bind exact actor, offer, mapped lifecycle and microsecond deadline',()=>{
 const s=activity.parseHorseActivitySnapshot(snapshot(),actor,H);assert.equal(s.activeUntil,until);assert.equal(s.editRevision,'12');
 assert.equal(activity.horseActivityMatchesRow(s,{...input,expectedActiveUntil:'2026-12-01T15:00:00.123456+03:00'}),true);
 assert.equal(activity.horseActivityMatchesRow(s,{...input,expectedActiveUntil:'2026-12-01T12:00:00.123457Z'}),false);
});
for(const over of [{actor_user_id:A},{identity_id:A},{content_id:A},{source_status:'paused'},{status:'sold'},{active_until:null},{active_until:'infinity'},
 {edit_revision:'01'},{changed:'true'},{extra:'secret'},{content_type:'listing'}])
 test('malformed activity acknowledgement is uncertain '+JSON.stringify(over),()=>assert.throws(()=>activity.parseHorseActivitySnapshot(snapshot(over),actor,H),e=>e.kind==='uncertain'));
test('draft read may have no deadline; draft never becomes an actionable mutation',()=>{
 assert.equal(activity.parseHorseActivitySnapshot(snapshot({source_status:'draft',status:null,active_until:null}),actor,H).status,null);
 assert.throws(()=>activity.validateHorseActivityInput({...input,expectedStatus:'draft'}),e=>e.kind==='invalid');
 assert.throws(()=>activity.validateHorseActivityInput({...input,expectedActiveUntil:null}),e=>e.kind==='invalid');
});
function apiHarness(response){const calls=[];const l=realm({'src/entities/horse-offer/api/horsePublicationClient.ts':{
 horsePublicationRequest:async(a,action,body,signal)=>{calls.push({actor:plain(a),action,body:plain(body)});assert.ok(signal instanceof AbortSignal);return response(action,calls.length);}}});
 return {api:l('src/entities/horse-offer/api/horseActivityClient.ts'),calls};}
test('status reads revision once then writes exact actor/status/deadline without renewing',async()=>{
 const h=apiHarness(action=>action==='owner-activity'?snapshot():snapshot({source_status:'paused',status:'paused',changed:true,edit_revision:'13'}));
 const result=await h.api.updateMyHorseStatus({...input,status:'paused'});assert.equal(result.activeUntil,until);
 assert.deepEqual(h.calls.map(c=>c.action),['owner-activity','owner-set-status']);
 assert.deepEqual(h.calls[1].body,{expectedUserId:U,expectedIdentityId:I,offerId:H,expectedRevision:'12',expectedStatus:'published',expectedActiveUntil:until,status:'paused'});
});
test('renewal uses a distinct action and accepts only a forward finite deadline',async()=>{
 const h=apiHarness(action=>action==='owner-activity'?snapshot():snapshot({changed:true,edit_revision:'13',active_until:nextUntil}));
 assert.equal((await h.api.renewMyHorseActivity(input)).activeUntil,nextUntil);
 assert.deepEqual(h.calls.map(c=>c.action),['owner-activity','owner-renew']);assert.equal('status' in h.calls[1].body,false);
});
for(const [name,read] of [['source status',snapshot({source_status:'paused',status:'paused'})],['microsecond deadline',snapshot({active_until:'2026-12-01T12:00:00.123457Z'})],['changed read',snapshot({changed:true})]])
 test('stale row '+name+' blocks mutation before dispatch',async()=>{const h=apiHarness(()=>read);await assert.rejects(h.api.updateMyHorseStatus({...input,status:'sold'}),e=>e.kind==='conflict');assert.equal(h.calls.length,1);});
for(const [name,ack] of [['status changed deadline',snapshot({source_status:'paused',status:'paused',active_until:nextUntil,changed:true,edit_revision:'13'})],
 ['revision unchanged',snapshot({source_status:'paused',status:'paused',changed:true})],['wrong actor',snapshot({actor_user_id:A,source_status:'paused',status:'paused',changed:true,edit_revision:'13'})]])
 test('unsafe status ACK '+name+' remains uncertain without replay',async()=>{const h=apiHarness(action=>action==='owner-activity'?snapshot():ack);await assert.rejects(h.api.updateMyHorseStatus({...input,status:'paused'}),e=>e.kind==='uncertain');assert.equal(h.calls.length,2);});
test('unknown write response never triggers automatic retry',async()=>{const h=apiHarness(action=>{if(action==='owner-activity')return snapshot();throw Error('network');});
 await assert.rejects(h.api.renewMyHorseActivity(input),e=>e.kind==='uncertain');assert.equal(h.calls.length,2);});
function sessionHarness(){let rows=[row()],activeActor=actor;const calls={renew:[],status:[],ordinary:0};
 const deps={actor:async()=>activeActor,read:async()=>rows,renew:async()=>{calls.ordinary++;assert.fail('ordinary renewal');},status:async()=>{calls.ordinary++;assert.fail('ordinary status');},now:()=>now,
  horseRenew:async value=>{calls.renew.push(plain(value));rows=rows.map(r=>({...r,activeUntil:nextUntil}));return {changed:true};},
  horseStatus:async value=>{calls.status.push(plain(value));rows=rows.map(r=>({...r,sourceStatus:value.status==='sold'?'closed':value.status==='active'?'published':'paused'}));return {changed:true};}};
 const session=new Session(deps);session.activate();return {session,calls,deps,setActor:value=>activeActor=value};}
test('shared owner session routes UUID horse actions separately and renewal requires confirmation',async()=>{
 const h=sessionHarness();await h.session.load({});assert.equal(h.calls.renew.length,0);h.session.requestRenewal(row().key);
 assert.equal(h.session.getSnapshot().confirmation.contentType,'horse_offer');assert.equal(h.calls.renew.length,0);
 await h.session.confirmRenewal();assert.equal(h.calls.ordinary,0);assert.equal(h.calls.renew.length,1);assert.deepEqual(h.calls.renew[0],input);
 await h.session.changeStatus(row().key,'sold');assert.equal(h.calls.status[0].expectedActiveUntil,nextUntil);assert.equal(h.calls.status[0].expectedStatus,'published');
 assert.equal(h.session.getSnapshot().listings[0].activeUntil,nextUntil);
});
test('horse actor change invalidates confirmation and sends no write',async()=>{
 const h=sessionHarness();await h.session.load({});h.session.requestRenewal(row().key);h.setActor({...actor,identityId:A});await h.session.confirmRenewal();
 assert.equal(h.calls.renew.length,0);assert.equal(h.session.getSnapshot().actor,null);assert.equal(h.session.getSnapshot().listings.length,0);
});
test('horse duplicate confirmation/status clicks cannot dispatch concurrent writes',async()=>{
 const h=sessionHarness(),q=deferred();h.deps.horseRenew=async value=>{h.calls.renew.push(value);await q.promise;return {changed:true};};
 await h.session.load({});h.session.requestRenewal(row().key);const a=h.session.confirmRenewal(),b=h.session.confirmRenewal();await tick();
 await h.session.changeStatus(row().key,'paused');assert.equal(h.calls.renew.length,1);assert.equal(h.calls.status.length,0);q.resolve();await Promise.all([a,b]);
});
function render(x){if(x==null||typeof x==='boolean')return [];if(Array.isArray(x))return x.flatMap(render);if(typeof x!=='object')return [String(x)];
 if(typeof x.type==='function')return render(x.type(x.props));return [{type:x.type,props:x.props,children:render(x.props.children)}];}
const all=nodes=>nodes.flatMap(n=>typeof n==='string'?[]:[n,...all(n.children)]);
const words=nodes=>nodes.map(n=>typeof n==='string'?n:words(n.children)).join(' ');
function view(language,over={}){const l=realm({language,'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{}}});
 return render(l('src/features/my-area/components/MyAreaHorseOfferRow.tsx').default({item:row(over),now,busy:false,disabled:false,activeIdentityId:I,ownerActor:actor,onRenew(){},onStatus(){}}));}
for(const language of ['et','en'])test(language+': active horse photo and text open public detail, shared controls and no redundant public link',()=>{
 const nodes=view(language),links=all(nodes).filter(n=>n.type==='a');
 assert.equal(links.filter(n=>n.props.href==='/v2/horse-offer/'+H).length,2);
 assert.equal(links.filter(n=>n.props.href==='/v2/my-area/horse-offers/'+H+'/edit').length,1);
 assert.deepEqual(all(nodes).filter(n=>n.type==='option').map(n=>n.props.value),['active','paused','sold']);
 assert.match(words(nodes),language==='et'?/Uuenda kuulutust/:/Renew listing/);assert.doesNotMatch(words(nodes),/Vaata avalikku kuulutust|View public listing|selqiro-ui-/);
});
for(const status of ['paused','closed'])test(status+': horse photo/text route to owner editor and renewal stays hidden',()=>{
 const nodes=view('en',{sourceStatus:status,lifecycleStatus:status}),links=all(nodes).filter(n=>n.type==='a');
 assert.equal(links.filter(n=>n.props.href==='/v2/horse-offer/'+H).length,0);
 assert.equal(links.filter(n=>n.props.href==='/v2/my-area/horse-offers/'+H+'/edit').length,3);assert.doesNotMatch(words(nodes),/Renew listing/);
});
test('expired horse is visibly expired, opens editor and still offers explicit renewal',()=>{
 const nodes=view('et',{activeUntil:'2026-11-08T12:00:00Z'});assert.match(words(nodes),/Aegunud/);assert.match(words(nodes),/Uuenda kuulutust/);
 assert.equal(all(nodes).filter(n=>n.type==='a'&&n.props.href==='/v2/horse-offer/'+H).length,0);
 assert.doesNotMatch(all(nodes).find(n=>n.type==='select').props.className,/emerald/);
});
test('ordinary thumbnail uses exactly the same active/inactive destination as its title',()=>{
 const l=realm({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{}}}),module=l('src/features/my-area/components/MyAreaListingRow.tsx');
 for(const status of ['active','paused','sold']){
  const listing=mapper({...row(),key:'listing:201',contentType:'listing',contentId:'201',sourceStatus:status,imageUrl:'https://example.invalid/photo.webp'});
  const nodes=render(module.default({listing,now,busy:false,disabled:false,activeIdentityId:I,onRenew(){},onStatus(){}}));
  const href=status==='active'?'/v2/listing/201':'/v2/my-area/listings/201/edit';
  assert.equal(all(nodes).filter(n=>n.type==='a'&&n.props.href===href).length,status==='active'?2:3);
 }
});
function imageHarness(responseStatus=200){
 const cells=[],effects=[],listeners=new Map(),calls=[],revoked=[];let cursor=0,authEvent,serial=0;
 const hooks={useState(initial){const i=cursor++;if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;return [cells[i],next=>{cells[i]=typeof next==='function'?next(cells[i]):next;}];},
  useRef(initial){const i=cursor++;return cells[i]||(cells[i]={current:initial});},useEffect:effect=>effects.push(effect)};
 class ImageURL extends URL {static createObjectURL(){return 'blob:owner-'+(++serial);}static revokeObjectURL(value){revoked.push(value);}}
 const l=realm({react:hooks,URL:ImageURL,setTimeout:()=>1,clearTimeout(){},window:{addEventListener:(name,f)=>listeners.set(name,f),removeEventListener:name=>listeners.delete(name)},
  fetch:async (url,options)=>{calls.push({url,options});return {status:responseStatus,headers:new Headers({'content-type':'image/webp'}),body:new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2,3]));c.close();}})};},
  'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{auth:{getSession:async()=>({data:{session:{user:{id:U},access_token:'synthetic'}},error:null}),
   onAuthStateChange:cb=>{authEvent=cb;return {data:{subscription:{unsubscribe(){}}}};}}}}});
 const component=l('src/features/listing-edit/components/ManagedOwnerImage.tsx').default;
 const props={source:pub,contentType:'horse_offer',actor,href:'/v2/horse-offer/'+H,compact:true};
 const bound=component(props);function tree(){cursor=0;return render(bound.type(bound.props));}
 return {component,props,tree,effects,listeners,calls,revoked,auth:()=>authEvent};
}
test('private owner preview sends bearer only to horse owner route, and account/identity change erases decoded URL',async()=>{
 const h=imageHarness();h.tree();const cleanup=h.effects[0]();await tick();await tick();
 assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,own);assert.equal(h.calls[0].options.headers['x-selqiro-identity'],I);
 let image=all(h.tree()).find(n=>n.type==='img');assert.ok(image);image.props.onLoad({currentTarget:{src:image.props.src}});
 assert.equal(all(h.tree()).find(n=>n.type==='img').props.src,'blob:owner-1');
 h.listeners.get('selqiro:active-identity-changing')();assert.equal(all(h.tree()).some(n=>n.type==='img'),false);assert.deepEqual(h.revoked,['blob:owner-1']);
 assert.notEqual(h.component(h.props).key,h.component({...h.props,actor:{...actor,identityId:A}}).key);
 cleanup();assert.equal(h.listeners.size,0);
});
test('auth logout erases an already-decoded photo before any reload',async()=>{
 const h=imageHarness();h.tree();const cleanup=h.effects[0]();await tick();await tick();const image=all(h.tree()).find(n=>n.type==='img');
 image.props.onLoad({currentTarget:{src:image.props.src}});h.auth()('SIGNED_OUT',null);assert.equal(all(h.tree()).some(n=>n.type==='img'),false);assert.equal(h.revoked.length,1);cleanup();
});
test('photo retry remains a sibling of its navigational anchor, never a nested interactive element',async()=>{
 const h=imageHarness(503);h.tree();const cleanup=h.effects[0]();await tick();await tick();const nodes=h.tree();
 assert.equal(all(nodes).filter(n=>n.type==='button').length,1);assert.equal(all(nodes).filter(n=>n.type==='a').length,1);
 assert.equal(all(nodes).filter(n=>n.type==='a').flatMap(n=>all(n.children)).some(n=>n.type==='button'),false);
 assert.equal(all(nodes).find(n=>n.type==='a').props.href,'/v2/horse-offer/'+H);cleanup();
});
