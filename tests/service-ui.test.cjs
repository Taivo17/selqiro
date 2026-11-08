'use strict';
// Render actual service components/hooks with deterministic React scheduling.
// Remote/auth boundaries are fixtures; these tests never access a live account.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),tick=()=>new Promise(resolve=>setImmediate(resolve));
const U='11111111-1111-4111-8111-111111111111',I='22222222-2222-4222-8222-222222222222';
const S='33333333-3333-4333-8333-333333333333',J='44444444-4444-4444-8444-444444444444';
const A='55555555-5555-4555-8555-555555555555',image=`/api/v2/service-media/${A}/0`,time='2026-11-08T12:00:00.000Z';
const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'?[node,...walk(node.props?.children)]:[];
const text=node=>Array.isArray(node)?node.map(text).join(' '):node&&typeof node==='object'?text(node.props?.children):typeof node==='string'||typeof node==='number'?String(node):'';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const catalogue=[{code:'vehicle_machinery',parentCode:null,labelEt:'Autoteenused',labelEn:'Vehicle services',sortOrder:1}];
const categories={categories:catalogue,loading:false,error:null,refresh(){}};
const service=(id=S,status='published',identityId=I)=>({id,identityId,title:`Service ${id.slice(0,4)}`,description:'Vehicle repair',category:'vehicle_machinery',subcategory:null,
 imageUrl:image,priceAmount:null,priceType:'contact',currency:'EUR',country:null,city:null,location:null,serviceLat:null,serviceLng:null,status,sortOrder:0,publishedAt:time,createdAt:time,updatedAt:time});
const snapshot=(id=S,status='published',identityId=I,revision='12')=>({service:service(id,status,identityId),editRevision:revision,policySnapshot:[],
 images:[{id:J,url:image,thumbnailUrl:`/api/v2/service-owner-media/${A}/0`,fullUrl:image,sortOrder:0,isPrimary:true}]});
const offer=()=>({...service(),images:[{id:J,url:image}],sellerName:'Repair shop',sellerSlug:'repair-shop',sellerType:'business'});
const ownerPage=(items,nextOffset=null,totalCount=String(items.length))=>({items,totalCount,hasMore:nextOffset!==null,nextOffset,resultOffset:0,resultLimit:50});
function actorContext(identity=I){
 const abort=new AbortController();
 const actor={expectedUserId:U,expectedIdentityId:identity,generation:1,signal:abort.signal,accessToken:'fixture'};
 const context={actor,loading:false,anonymous:false,error:null,refresh(){},isCurrent:value=>context.actor===value&&!value.signal.aborted};
 return{context,switchIdentity(next){abort.abort();context.actor={...actor,expectedIdentityId:next,generation:2,signal:new AbortController().signal};}};
}
function harness(entry,{language='et',props={},overrides={},timers=false}={}){
 const cells=[],cache=new Map(),routes=[],timed=new Map();let index=0,pending=[],dirty=true,tree,renderFn,serial=0,timerSerial=0;
 const react={
  useState(initial){const i=index++;if(!cells[i])cells[i]={value:typeof initial==='function'?initial():initial};const cell=cells[i];return[cell.value,next=>{const value=typeof next==='function'?next(cell.value):next;if(!Object.is(value,cell.value)){cell.value=value;dirty=true;}}];},
  useRef(initial){const i=index++;if(!cells[i])cells[i]={current:initial};return cells[i];},
  useEffect(effect,deps){const i=index++,old=cells[i];if(!old||!deps||deps.some((v,n)=>!Object.is(v,old.deps?.[n])))pending.push(()=>{old?.cleanup?.();const cell={deps};cells[i]=cell;cell.cleanup=effect();});},
  useMemo(factory,deps){const i=index++,old=cells[i];if(!old||deps.some((v,n)=>!Object.is(v,old.deps?.[n])))cells[i]={deps,value:factory()};return cells[i].value;},
  useCallback(fn,deps){return react.useMemo(()=>fn,deps);},
 };
 const translate=(catalog,key,params={})=>Object.entries(params).reduce((out,[name,value])=>out.replaceAll(`{${name}}`,String(value)),catalog[language]?.[key]??catalog.en?.[key]??key);
 const window={setTimeout(fn){const id=++timerSerial;timed.set(id,fn);if(!timers)setImmediate(()=>{if(timed.delete(id))fn();});return id;},clearTimeout:id=>timed.delete(id)};
 const router={push:href=>routes.push(href),replace:href=>routes.push(href)};
 function load(name){
  const file=path.resolve(root,name),relative=path.relative(root,file).split(path.sep).join('/');assert.ok(file.startsWith(root+path.sep));
  if(Object.hasOwn(overrides,relative))return overrides[relative];
  if(relative==='src/shared/i18n/V2LanguageProvider.tsx')return{useV2Translation:catalog=>({language,t:(key,params)=>translate(catalog,key,params)})};
  if(relative==='lib/i18n/useTranslation.ts')return{localeForLanguage:lang=>lang==='et'?'et-EE':'en-GB',getCatalogTranslation:(_lang,catalog,key,params)=>translate(catalog,key,params)};
  if(relative==='src/shared/i18n/marketplaceMessages.ts')return{renderMarketplaceMessage:(_lang,error)=>String(error)};
  if(relative==='src/features/service-category-selection/model/useServiceCategories.ts')return{useServiceCategories:()=>categories};
  if(file.endsWith('.css'))return{__esModule:true,default:new Proxy({},{get:(_object,key)=>key})};
  if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);
  const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  const requireLocal=name=>{
   if(name==='react')return react;
   if(name==='react/jsx-runtime')return{jsx:(type,props,key)=>({type,props:props||{},key}),jsxs:(type,props,key)=>({type,props:props||{},key}),Fragment:'fragment'};
   if(name==='next/link')return{__esModule:true,default:'a'};
   if(name==='next/navigation')return{useRouter:()=>router};
   assert.ok(name.startsWith('.')||name.startsWith('@/'),'Unexpected dependency '+name);
   const resolved=name.startsWith('@/')?path.join(root,name.slice(2)):path.resolve(path.dirname(file),name);
   return load(fs.existsSync(resolved)?resolved:fs.existsSync(resolved+'.ts')?resolved+'.ts':resolved+'.tsx');
  };
  vm.runInThisContext('(function(module,exports,require,window,process,crypto){'+output.outputText+'\n})',{filename:file,timeout:2000})(module,module.exports,requireLocal,window,
   {env:{NEXT_PUBLIC_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co'}},{randomUUID:()=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(++serial).padStart(12,'0')}`});
  return module.exports;
 }
 const module=load(entry);renderFn=module.default?()=>module.default(props):()=>module[Object.keys(module).find(key=>key.startsWith('use'))](props);
 function render(){let count=0;while(dirty){assert.ok(++count<50,'render settles');dirty=false;index=0;pending=[];tree=renderFn();const effects=pending;pending=[];effects.forEach(effect=>effect());}return tree;}
 async function flush(){for(let n=0;n<5;n++){render();await tick();}render();}
 return{load,routes,flush,render,get tree(){return tree;},rerender(nextProps=props){props=nextProps;dirty=true;render();},
  nodes:()=>walk(tree),find:predicate=>walk(tree).find(predicate),fireTimers(){const work=[...timed.values()];timed.clear();work.forEach(fn=>fn());},
  close(){for(const cell of cells)cell?.cleanup?.();}};
}
const myArea='src/features/service-editor/components/MyAreaServicesSection.tsx';
const actorModule='src/features/listing-conversation/model/useConversationActor.ts';
const ownerApi='src/entities/service/api/servicePublicationClient.ts';
const OwnerImage=()=>null,Gallery=()=>null,Contact=()=>null;
function ownerHarness({language='et',api,context,props}={}){return harness(myArea,{language,props,overrides:{
 [actorModule]:{useConversationActor:()=>context},[ownerApi]:api,
 'src/features/service-editor/components/ServiceOwnerImage.tsx':{__esModule:true,default:OwnerImage}}});}

for(const language of ['et','en'])test(language+': My Area image and text share the canonical active link; paused/draft rows open editing',async()=>{
 const {context}=actorContext(),rows=[snapshot(),snapshot(J,'archived'),snapshot(A,'draft')];
 const h=ownerHarness({language,context,api:{listServiceOwners:async()=>ownerPage(rows)}});await h.flush();
 const articles=h.nodes().filter(node=>node.type==='article');assert.equal(articles.length,3);
 for(const [i,article]of articles.entries()){
  const links=walk(article).filter(node=>node.type==='a'),main=links[0],id=rows[i].service.id;
  assert.equal(main.props.href,i===0?`/v2/service/${id}`:`/v2/my-area/services/${id}/edit`);
  assert.ok(walk(main).some(node=>node.type===OwnerImage));assert.match(text(main),/Service/);
  assert.ok(links.some(node=>node.props.href===`/v2/my-area/services/${id}/edit`&&text(node)===(language==='et'?'Muuda':'Edit')));
 }
 const selects=h.nodes().filter(node=>node.type==='select');assert.equal(selects.length,2);
 assert.deepEqual(selects.map(node=>node.props.value),['published','archived']);
 assert.equal(text(h.tree).includes(language==='et'?'Uuenda kuulutust':'Renew listing'),false);
 assert.equal(h.nodes().some(node=>node.type==='a'&&node.props.href==='/v2/services/new'),true);h.close();
});
test('status change waits for a verified owner row, including a lost write reply; uncertain read locks only the affected row',async()=>{
 const {context}=actorContext(),write=deferred(),read=deferred(),calls=[];
 const h=ownerHarness({context,api:{listServiceOwners:async()=>ownerPage([snapshot(),snapshot(J)]),
  setServiceOwnerStatus:async(...args)=>{calls.push(['write',...args]);return write.promise;},readServiceOwner:async(...args)=>{calls.push(['read',...args]);return read.promise;}}});
 await h.flush();const select=()=>h.nodes().find(node=>node.type==='select');
 select().props.onChange({target:{value:'archived'}});await h.flush();assert.equal(select().props.value,'published');assert.equal(select().props.disabled,true);assert.equal(calls.length,1);
 write.reject(Error('outcome_unknown'));await h.flush();assert.equal(calls.length,2);assert.equal(select().props.value,'published');
 read.resolve(snapshot(S,'archived',I,'13'));await h.flush();assert.equal(select().props.value,'archived');assert.equal(select().props.disabled,false);
 assert.equal(calls[0][3],'12');assert.equal(calls[0][4],'published');assert.equal(calls[0][5],'archived');h.close();

 let writes=0,reads=0;const pending=ownerHarness({context,api:{listServiceOwners:async()=>ownerPage([snapshot(),snapshot(J)]),
  setServiceOwnerStatus:async()=>{writes++;throw Error('lost');},readServiceOwner:async()=>{reads++;throw Error('unavailable');}}});await pending.flush();
 const old=pending.nodes().find(node=>node.type==='select');old.props.onChange({target:{value:'archived'}});await pending.flush();
 const current=pending.nodes().filter(node=>node.type==='select');assert.equal(current[0].props.value,'published');assert.equal(current[0].props.disabled,true);assert.equal(current[1].props.disabled,false);
 current[0].props.onChange({target:{value:'archived'}});await pending.flush();assert.equal(writes,1);assert.equal(reads,1);pending.close();
});
test('My Area pagination merges overlapping pages and identity replacement hides old rows and rejects late reads',async()=>{
 const session=actorContext(),pages=[];let late=null;
 const h=ownerHarness({context:session.context,api:{listServiceOwners:async(actor,_signal,offset=0)=>{
  pages.push({actor,offset});if(actor.identityId===J)return ownerPage([snapshot(A,'published',J)]);
  if(offset===0)return ownerPage([snapshot()],1,'2');late=deferred();return late.promise;
 }}});await h.flush();const more=h.nodes().find(node=>node.type==='button'&&text(node)==='Näita rohkem');assert.ok(more);more.props.onClick();await h.flush();
 late.resolve(ownerPage([snapshot(),snapshot(J)],null,'2'));await h.flush();assert.equal(h.nodes().filter(node=>node.type==='article').length,2);assert.equal(pages[1].offset,1);
 session.switchIdentity(J);h.rerender();assert.equal(h.nodes().some(node=>node.props['data-service-id']===S),false);await h.flush();assert.equal(h.nodes().filter(node=>node.type==='article').length,1);
 assert.equal(h.nodes().find(node=>node.type==='article').props['data-service-id'],A);h.close();

 const second=actorContext(),old=deferred();const x=ownerHarness({context:second.context,api:{listServiceOwners:actor=>actor.identityId===I?old.promise:Promise.resolve(ownerPage([snapshot(A,'published',J)]))}});
 x.render();second.switchIdentity(J);x.rerender();await x.flush();old.resolve(ownerPage([snapshot()]));await x.flush();
 assert.equal(x.nodes().some(node=>node.props['data-service-id']===S),false);assert.equal(x.nodes().find(node=>node.type==='article').props['data-service-id'],A);x.close();
});
for(const language of ['et','en'])test(language+': discovery card image and title open the same public UUID service',async()=>{
 const h=harness('components/v2/services/V2ServicesPage.tsx',{language,overrides:{
  'src/features/service-detail/model/usePublicServiceSearch.ts':{usePublicServiceSearch:()=>({page:{items:[offer()],totalCount:'1',hasMore:false},loading:false,error:false,retry(){}})},
  'src/features/v2-shell/components/V2DiscoveryTypeSwitcher.tsx':{__esModule:true,default:()=>null}}});await h.flush();
 const card=h.nodes().find(node=>node.type==='a'&&node.props.href===`/v2/service/${S}`);assert.ok(card);assert.equal(walk(card).find(node=>node.type==='img').props.src,image);
 assert.equal(text(walk(card).find(node=>node.type==='h3')),service().title);assert.match(text(h.tree),language==='et'?/Teenused/:/Services/);h.close();
});
test('profile service image, title and description all use its canonical public link',async()=>{
 const row={...service(),images:[{id:J,serviceId:S,originalUrl:image,mediumUrl:image,thumbUrl:image,isPrimary:true,sortOrder:0,createdAt:time}]};
 const h=harness('src/features/public-profile/components/PublicProfileServicesSection.tsx',{props:{profile:{identityId:I},expanded:false,onExpandedChange(){}},overrides:{
  'src/features/public-profile/model/usePublicProfileServices.ts':{usePublicProfileServices:()=>({services:[row],loading:false,error:null})}}});await h.flush();
 const card=h.nodes().find(node=>typeof node.type==='function'&&node.type.name==='ServiceCard');assert.ok(card);const rendered=card.type(card.props),links=walk(rendered).filter(node=>node.type==='a');
 assert.equal(links.length,3);assert.ok(links.every(node=>node.props.href===`/v2/service/${S}`));assert.equal(walk(links[0]).find(node=>node.type==='img').props.src,image);h.close();
});
test('anonymous public detail reads only canonical public projection and reuses the shared gallery; unavailable service has no contact',async()=>{
 const calls=[];const h=harness('src/features/service-detail/components/ServiceDetailPage.tsx',{props:{serviceId:S},overrides:{
  'src/entities/service/api/getPublicService.ts':{getPublicService:async(id,signal)=>{calls.push({id,signal});return id===S?offer():null;}},
  'src/shared/media/PublicPhotoGallery.tsx':{__esModule:true,default:Gallery},
  'src/features/service-detail/components/ServiceContactButton.tsx':{__esModule:true,default:Contact}}});await h.flush();
 assert.deepEqual(calls.map(call=>call.id),[S]);const gallery=h.nodes().find(node=>node.type===Gallery);assert.deepEqual(gallery.props.photos,[{id:J,src:image}]);
 assert.equal(h.nodes().find(node=>node.type===Contact).props.serviceId,S);assert.ok(h.nodes().some(node=>node.type==='a'&&node.props.href==='/v2/profile/repair-shop'));
 h.rerender({serviceId:J});assert.equal(h.nodes().some(node=>node.type===Contact),false);await h.flush();assert.equal(h.nodes().some(node=>node.type===Gallery||node.type===Contact),false);assert.ok(text(h.tree).includes('ei ole saadaval'));h.close();
});
test('public search discards stale query responses and never pages with another query offset',async()=>{
 const requests=[],first=deferred(),second=deferred();
 const h=harness('src/features/service-detail/model/usePublicServiceSearch.ts',{timers:true,props:{query:'old',category:null},overrides:{
  'src/entities/service/api/getPublicService.ts':{searchPublicServices:async(input,offset,signal)=>{requests.push({input,offset,signal});return input.query==='old'?first.promise:second.promise;}}}});
 h.render();h.fireTimers();await h.flush();h.rerender({query:'new',category:null});assert.equal(h.tree.page,null);h.fireTimers();await h.flush();
 second.resolve({items:[offer()],totalCount:'1',hasMore:false,nextOffset:null,resultOffset:0,resultLimit:24});await h.flush();
 first.resolve({items:[{...offer(),id:J}],totalCount:'100',hasMore:true,nextOffset:24,resultOffset:0,resultLimit:24});await h.flush();
 assert.equal(h.tree.page.items[0].id,S);assert.equal(h.tree.page.totalCount,'1');await h.tree.loadMore();assert.equal(requests.length,2);assert.ok(requests[0].signal.aborted);h.close();
});
test('service contact retries one idempotent command and rejects navigation after identity changes; anonymous login returns to service',async()=>{
 const {context}=actorContext(),commands=[];let failed=true;
 const h=harness('src/features/service-detail/components/ServiceContactButton.tsx',{props:{serviceId:S},overrides:{[actorModule]:{useConversationActor:()=>context},
  'src/entities/service/api/contactServiceProvider.ts':{contactServiceProvider:async command=>{commands.push(command);if(failed){failed=false;throw Error('lost reply');}return'9007199254740993';}}}});
 await h.flush();h.nodes().find(node=>node.type==='button').props.onClick();await h.flush();assert.equal(h.routes.length,0);
 h.nodes().find(node=>node.type==='button').props.onClick();await h.flush();assert.equal(commands.length,2);assert.equal(commands[0].requestKey,commands[1].requestKey);assert.equal(commands[0].serviceId,S);
 assert.deepEqual(h.routes,['/v2/messages/9007199254740993']);h.close();
 const actor=actorContext(),pending=deferred();const x=harness('src/features/service-detail/components/ServiceContactButton.tsx',{props:{serviceId:S},overrides:{[actorModule]:{useConversationActor:()=>actor.context},
  'src/entities/service/api/contactServiceProvider.ts':{contactServiceProvider:()=>pending.promise}}});await x.flush();x.nodes().find(node=>node.type==='button').props.onClick();await x.flush();actor.switchIdentity(J);x.rerender();pending.resolve('45');await x.flush();assert.equal(x.routes.length,0);x.close();
 const anon=harness('src/features/service-detail/components/ServiceContactButton.tsx',{props:{serviceId:S},overrides:{[actorModule]:{useConversationActor:()=>({actor:null,anonymous:true})},
  'src/entities/service/api/contactServiceProvider.ts':{contactServiceProvider:()=>assert.fail('Anonymous contact must first sign in')}}});await anon.flush();assert.equal(anon.nodes().find(node=>node.type==='a').props.href,`/auth?next=${encodeURIComponent(`/v2/service/${S}`)}`);anon.close();
});
for(const language of ['et','en'])test(language+': service fields retain inactive categories and blank legacy values without writes during hydration',async()=>{
 const row={...service(),category:'retired_root',subcategory:'retired_child',priceType:'hourly'},changes=[];
 const h=harness('src/features/service-editor/components/ServiceFields.tsx',{language,props:{form:{title:row.title,description:row.description,category:row.category,subcategory:row.subcategory,
  priceType:'hourly',priceAmount:'',currency:'EUR',country:'',city:'',location:''},original:row,disabled:false,onChange:next=>changes.push(next)}});await h.flush();
 assert.equal(changes.length,0);assert.ok(h.nodes().some(node=>node.type==='option'&&node.props.value==='retired_root'));assert.ok(h.nodes().some(node=>node.type==='option'&&node.props.value==='retired_child'));
 const amount=h.nodes().find(node=>node.props.name==='service-price-amount');assert.equal(amount.props.required,false);const country=h.nodes().find(node=>node.props.name==='service-country');assert.equal(country.props.value,'');
 const title=h.nodes().find(node=>node.props.name==='service-title');title.props.onChange({target:{value:'Changed title'}});assert.equal(changes[0].country,'');assert.equal(changes[0].subcategory,'retired_child');h.close();
});
test('service message cards and conversation header link to the UUID service',async()=>{
 const listing={content_type:'service',id:S,title:'Repairs',image,price:null};
 const h=harness('src/features/listing-conversation/components/ConversationListingCard.tsx',{props:{listing}});await h.flush();assert.equal(h.tree.props.href,`/v2/service/${S}`);assert.equal(h.nodes().find(node=>node.type==='img').props.src,image);h.close();
 const x=harness('src/features/listing-conversation/components/ConversationHeader.tsx',{props:{listing,peer:null,ready:true,blocked:false,busy:false,onHide(){},onBlock(){}},overrides:{
  'src/features/listing-conversation/components/ConversationAvatar.tsx':{__esModule:true,default:()=>null},'src/features/listing-conversation/components/ThreadActions.tsx':{__esModule:true,default:()=>null}}});await x.flush();assert.ok(x.nodes().some(node=>node.type==='a'&&node.props.href===`/v2/service/${S}`));x.close();
});
test('photo progress displays the one-based session ordinal once and gives the conflict recovery path',async()=>{
 const entry='src/features/service-editor/components/ServicePublicationActions.tsx',view={phase:'busy',message:'uploadingPhoto',currentImage:1};
 const h=harness(entry,{props:{session:null,view,ready:true,canSubmit:false,publish:true,error:null,onSubmit(){}}});await h.flush();assert.match(text(h.tree),/\(1\)/);assert.doesNotMatch(text(h.tree),/\(2\)/);
 h.rerender({session:null,view:{phase:'needs_attention',message:'conflict'},ready:true,canSubmit:false,publish:false,error:null,onSubmit(){}});
 assert.match(text(h.tree),/Katkesta see toiming, naase vormi juurde/);h.close();
});
