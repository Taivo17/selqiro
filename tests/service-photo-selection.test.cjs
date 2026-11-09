'use strict';
// Real editor, owner hook, gallery, publication hook/session and identity events.
// Only React scheduling, browser resources and Auth/API boundaries are synthetic.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {File}=require('node:buffer'),{webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..'),tick=()=>new Promise(resolve=>setImmediate(resolve));
const U='11111111-1111-4111-8111-111111111111',I='22222222-2222-4222-8222-222222222222';
const S='33333333-3333-4333-8333-333333333333',P='55555555-5555-4555-8555-555555555555';
const actor={userId:U,identityId:I},time='2026-11-09T10:00:00.000Z';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'?[node,...walk(node.props?.children)]:[];
const text=node=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):String(node??'');

function harness({create=false,language='et'}={}){
  const events=new Map(),storage=new Map(),instances=new Map(),doms=new Map(),cache=new Map();
  const actorGates=[],allGates=[],requests=[],created=[],revoked=[],components=new Map();
  let activeInstance=null,cursor=0,pending=[],dirty=true,tree,seen,serial=0,authCallback,actorReads=0,chooserOpens=0;
  const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  const window={localStorage,addEventListener(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},
    removeEventListener(name,fn){events.get(name)?.delete(fn);},dispatchEvent(event){for(const fn of events.get(event.type)??[])fn(event);return true;},confirm:()=>true};
  class PreviewURL extends URL{
    static createObjectURL(file){const url=`blob:service-test-${created.length+1}`;created.push({file,url});return url;}
    static revokeObjectURL(url){revoked.push(url);}
  }
  const react={
    useState(initial){const instance=activeInstance,i=cursor++;if(!instance.cells[i])instance.cells[i]={value:typeof initial==='function'?initial():initial};
      const cell=instance.cells[i];return[cell.value,next=>{if(!instance.mounted)return;const value=typeof next==='function'?next(cell.value):next;
        if(!Object.is(value,cell.value)){cell.value=value;dirty=true;}}];},
    useRef(initial){const cells=activeInstance.cells,i=cursor++;if(!cells[i])cells[i]={current:initial};return cells[i];},
    useEffect(effect,deps){const instance=activeInstance,i=cursor++,old=instance.cells[i];
      if(!old||!deps||deps.some((value,index)=>!Object.is(value,old.deps?.[index])))pending.push(()=>{old?.cleanup?.();const cell={deps};instance.cells[i]=cell;cell.cleanup=effect();});},
    useMemo(factory,deps){const cells=activeInstance.cells,i=cursor++,old=cells[i];
      if(!old||deps.some((value,index)=>!Object.is(value,old.deps?.[index])))cells[i]={deps,value:factory()};return cells[i].value;},
    useCallback(fn,deps){return react.useMemo(()=>fn,deps);},
  };
  const jsx=(type,props,key)=>({type,props:props??{},key});
  const translate=(catalog,key,params={})=>Object.entries(params).reduce((value,[name,replacement])=>value.replaceAll(`{${name}}`,String(replacement)),catalog[language]?.[key]??catalog.en[key]);
  const policy={snapshot:[{documentId:P,version:'1',contentHash:'a'.repeat(64),accepted:true}],refresh(){}};
  const rawOwner={schema_version:1,content_type:'service',actor_user_id:U,identity_id:I,service_id:S,edit_revision:'12',status:'published',
    content:{serviceId:S,title:'Original service',description:'Saved description',category:'vehicle_machinery',subcategory:null,
      priceType:'contact',priceAmount:null,currency:'EUR',country:'Estonia',city:'Paide',location:null},
    images:[],policy_snapshot:[{document_id:P,version:'1',content_hash:'a'.repeat(64)}],created_at:time,updated_at:time,published_at:time,sort_order:0};
  let bindOwner;
  const overrides={
    'src/entities/listing/api/getListingActivityActor.ts':{getListingActivityActor:()=>{actorReads++;return actorGates.shift()?.promise??Promise.resolve({...actor});}},
    'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{auth:{onAuthStateChange(fn){authCallback=fn;return{data:{subscription:{unsubscribe(){authCallback=null;}}}};}}}},
    'src/entities/service/api/servicePublicationClient.ts':{
      readServiceOwner:async(bound,id)=>{requests.push({action:'owner-read',actor:bound,id});return bindOwner(rawOwner,bound,id);},
      servicePublicationRequest:async(_actor,action)=>{requests.push({action});throw Error('No publication is requested in this selection test');},
    },
    'src/entities/listing/api/publicationJourneyClient.ts':{putPublicationPart:()=>assert.fail('Selecting a photo must not upload it')},
    'src/entities/listing/model/listingPhotoPreparation.ts':{prepareListingPhoto:()=>assert.fail('Selecting a photo must not prepare it for upload')},
    'src/shared/config/v2Integration.ts':{publicationUploadOrigin:()=>undefined},
    'src/features/service-editor/model/useServicePolicy.ts':{useServicePolicy:()=>policy},
    'src/features/service-editor/components/ServicePolicyGate.tsx':{__esModule:true,default:()=>null},
    'src/features/service-editor/components/ServiceFields.tsx':{__esModule:true,default:({form,disabled,onChange})=>jsx('input',{
      name:'service-title',value:form.title,disabled,onChange:event=>onChange({...form,title:event.target.value})})},
    'lib/i18n/interfaceMessage.ts':{uiMessage:key=>key},
  };
  function load(name){
    const file=path.resolve(root,name),relative=path.relative(root,file).split(path.sep).join('/');assert.ok(file.startsWith(root+path.sep));
    if(Object.hasOwn(overrides,relative))return overrides[relative];
    if(relative==='src/shared/i18n/V2LanguageProvider.tsx')return{useV2Translation:catalog=>({language,t:(key,params)=>translate(catalog,key,params)})};
    if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);
    const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
    const requireLocal=name=>{
      if(name==='react')return react;
      if(name==='react/jsx-runtime')return{jsx,jsxs:jsx,Fragment:'fragment'};
      if(name==='next/link')return{__esModule:true,default:'a'};
      if(name==='next/navigation')return{useRouter:()=>({replace:()=>assert.fail('Photo selection must not navigate')})};
      assert.ok(name.startsWith('.'),'Unexpected dependency '+name);const resolved=path.resolve(path.dirname(file),name);
      return load(fs.existsSync(resolved+'.ts')?resolved+'.ts':resolved+'.tsx');
    };
    vm.runInThisContext('(function(module,exports,require,window,navigator,localStorage,process,crypto,URL,File){'+output.outputText+'\n})',{filename:file,timeout:2000})
      (module,module.exports,requireLocal,window,{locks:{request:async(_key,_options,work)=>work({})}},localStorage,
        {env:{NEXT_PUBLIC_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co'}},{...webcrypto,randomUUID:()=>`aaaaaaaa-aaaa-4aaa-8aaa-${String(++serial).padStart(12,'0')}`},PreviewURL,File);
    return module.exports;
  }
  bindOwner=load('src/entities/service/model/servicePublication.ts').bindServiceOwnerSnapshot;
  const Editor=load('src/features/service-editor/components/ServiceEditor.tsx').default;
  const identities=load('src/features/v2-shell/model/identityEvents.ts');
  function expand(node,key='root',disabled=false){
    if(Array.isArray(node))return node.map((child,index)=>expand(child,`${key}/${child?.key??index}`,disabled));
    if(!node||typeof node!=='object')return node;
    if(typeof node.type==='function'){
      const id=`${key}:${node.type.name}`;let instance=instances.get(id);
      if(!instance){instance={cells:[],mounted:true};instances.set(id,instance);}seen.add(id);
      activeInstance=instance;cursor=0;const result=node.type(node.props);components.set(node.type.name,node.props);
      return expand(result,id+'/output',disabled);
    }
    const nextDisabled=disabled||!!node.props.disabled,id=`${key}:${node.type}`;
    let element=doms.get(id);if(!element){element={value:'',files:[],click(){chooserOpens++;}};doms.set(id,element);}
    element.disabled=nextDisabled;element.props=node.props;
    if(node.props.ref)node.props.ref.current=element;
    return{...node,element,props:{...node.props,children:expand(node.props.children,id+'/children',nextDisabled)}};
  }
  function render(){let rounds=0;while(dirty){assert.ok(++rounds<50,'render settles');dirty=false;seen=new Set();pending=[];components.clear();
    tree=expand(jsx(Editor,{userId:U,serviceId:create?null:S}));
    for(const [key,instance]of instances)if(!seen.has(key)){instance.mounted=false;for(const cell of instance.cells)cell?.cleanup?.();instances.delete(key);}
    const effects=pending;pending=[];for(const effect of effects)effect();
  }}
  async function flush(){for(let i=0;i<7;i++){render();await tick();}render();}
  const nodes=()=>walk(tree),input=()=>nodes().find(node=>node.type==='input'&&node.props.type==='file');
  const button=label=>nodes().find(node=>node.type==='button'&&text(node)===label);
  const photos=()=>components.get('ServiceGalleryEditor')?.photos??[];
  function select(file,eventNode=input()){
    const element=eventNode.element,value='C:\\fakepath\\'+file.name;
    if(element.value===value&&element.files[0]===file)return false;
    element.files=[file];element.value=value;eventNode.props.onChange({currentTarget:element});return true;
  }
  return{flush,render,requests,created,revoked,photos,input,button,select,components,identities,window,
    get actorReads(){return actorReads;},get chooserOpens(){return chooserOpens;},get tree(){return tree;},
    title:()=>nodes().find(node=>node.props.name==='service-title'),save:()=>button(language==='et'?'Salvesta muudatused':create?'Publish':'Save changes')??button('Avalda'),
    focus(){window.dispatchEvent(new Event('focus'));},deferActor(){const gate=deferred();actorGates.push(gate);allGates.push(gate);return gate;},
    signOut(){authCallback('SIGNED_OUT',null);},
    close(){for(const instance of instances.values()){instance.mounted=false;for(const cell of instance.cells)cell?.cleanup?.();}instances.clear();for(const gate of allGates)gate.resolve({...actor});},
  };
}

for(const create of [false,true])for(const language of ['et','en'])test(`${language} ${create?'create':'edit'}: focus before file change retains local photo and text while save waits for the same actor`,async()=>{
  const h=harness({create,language});try{
    await h.flush();h.title().props.onChange({target:{value:'Unsaved service title'}});await h.flush();
    const picker=h.input(),session=h.components.get('ServicePublicationActions').session,reads=h.actorReads;
    h.button(language==='et'?'Lisa fotosid':'Add photos').props.onClick();assert.equal(h.chooserOpens,1);
    const gate=h.deferActor();h.focus();await h.flush();assert.equal(h.actorReads,reads+1);assert.equal(h.save().element.disabled,true);
    const file=new File(['selected photo'],'service.jpg',{type:'image/jpeg'});assert.equal(h.input().element,picker.element);
    assert.equal(h.select(file),true);await h.flush();
    assert.equal(h.photos().length,1,'the chooser change arriving during a focus check must retain its selected File');
    assert.equal(h.input().element.disabled,false);assert.equal(h.photos()[0].file,file);assert.equal(picker.element.value,'');
    assert.equal(h.title().props.value,'Unsaved service title');assert.equal(h.created.length,1);assert.equal(h.revoked.length,0);
    assert.equal(h.components.get('ServicePublicationActions').session,session);assert.equal(h.save().element.disabled,true);
    h.save().props.onClick();await h.flush();assert.ok(h.requests.every(request=>request.action==='owner-read'));
    gate.resolve({...actor});await h.flush();assert.equal(h.save().element.disabled,false);assert.equal(h.photos()[0].file,file);
    assert.equal(h.title().props.value,'Unsaved service title');assert.equal(h.created.length,1);assert.equal(h.revoked.length,0);
    h.focus();await h.flush();assert.equal(h.photos()[0].file,file);assert.equal(h.created.length,1);assert.equal(h.revoked.length,0);
  }finally{h.close();}assert.deepEqual(h.revoked,h.created.map(item=>item.url));
});

test('removing a local photo and choosing the exact same File again fires change and owns a fresh preview',async()=>{
  const h=harness();try{
    await h.flush();const file=new File(['same photo'],'same.jpg',{type:'image/jpeg'}),picker=h.input();
    assert.equal(h.select(file),true);await h.flush();assert.equal(picker.element.value,'');assert.equal(h.photos().length,1);
    h.button('Eemalda').props.onClick();await h.flush();assert.equal(h.photos().length,0);assert.deepEqual(h.revoked,[h.created[0].url]);
    assert.equal(h.select(file),true);await h.flush();assert.equal(h.photos()[0].file,file);assert.equal(h.created.length,2);
    assert.notEqual(h.created[0].url,h.created[1].url);assert.equal(h.revoked.includes(h.created[1].url),false);
  }finally{h.close();}assert.deepEqual(h.revoked,h.created.map(item=>item.url));
});

test('hard identity invalidation rejects a late chooser event and stale save callback before the next render',async()=>{
  const h=harness();try{
    await h.flush();h.title().props.onChange({target:{value:'Keep my draft'}});await h.flush();
    const picker=h.input(),staleSave=h.save().props.onClick;
    const change=h.identities.beginIdentityChange(U);
    h.select(new File(['late photo'],'late.jpg',{type:'image/jpeg'}),picker);staleSave();
    await h.flush();assert.equal(h.title(),undefined);assert.equal(picker.element.value,'');assert.equal(h.created.length,0);
    assert.ok(h.requests.every(request=>request.action==='owner-read'));
    h.identities.finishIdentityChange(change);await h.flush();assert.equal(h.title().props.value,'Keep my draft');assert.equal(h.photos().length,0);
  }finally{h.close();}
});

test('logout wins over a pending focus response and a late file selection never reopens the owner form',async()=>{
  const h=harness();try{
    await h.flush();const picker=h.input(),gate=h.deferActor();h.focus();await h.flush();h.signOut();
    h.select(new File(['late photo'],'late.jpg',{type:'image/jpeg'}),picker);gate.resolve({...actor});await h.flush();
    assert.equal(h.title(),undefined);assert.equal(h.created.length,0);assert.equal(picker.element.value,'');
    assert.ok(h.requests.every(request=>request.action==='owner-read'));
  }finally{h.close();}
});
