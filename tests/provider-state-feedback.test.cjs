'use strict';
// Actual session + dialog/presentation + React SSR + language fallback.
// The client is synthetic; no HTTP, SQL, native dialog or browser layout is tested here.
const {test, after}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), ts=require('typescript');
const {createHash}=require('node:crypto'), React=require('react'), {renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..'), inputs=new Map(), sha=b=>createHash('sha256').update(b).digest('hex');
const feature='src/features/viewer-provider-controls/', api='src/entities/viewer-provider-controls/api/providerControlsClient.ts';
const U='11111111-1111-4111-8111-111111111111', V='22222222-2222-4222-8222-222222222222';
const I='33333333-3333-4333-8333-333333333333', B='9007199254740993', NEXT='9007199254740994';
const T='2026-11-15T13:19:00.000001Z', T2='2026-11-15T13:20:00.000002Z';
const target={type:'blocked_account',id:B}, tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const snapshot=extra=>({actorUserId:U,target,targetToken:'a'.repeat(64),targetAvailable:true,
  provider:{identityId:I,displayName:'Test provider',slug:'peer',avatarUrl:null},
  hiddenUntil:null,hidden:false,hideRevision:null,blockedByMe:true,blockedByOther:false,
  blockId:B,blockCreatedAt:T,canHide:false,canBlock:true,serverNow:T,...extra});
function loader(overrides={}) {
  const cache=new Map();
  return function load(name) {
    const file=path.resolve(root,name), relative=path.relative(root,file).split(path.sep).join('/');
    if(Object.hasOwn(overrides,relative))return overrides[relative];
    if(cache.has(file))return cache.get(file).exports;
    const bytes=fs.readFileSync(file), digest=sha(bytes);
    if(inputs.has(relative))assert.equal(inputs.get(relative),digest);inputs.set(relative,digest);
    const module={exports:{}};cache.set(file,module);
    const result=ts.transpileModule(bytes.toString(),{fileName:file,compilerOptions:{
      target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}});
    const local=name=>{
      if(name==='next/link')return{__esModule:true,default:({children,prefetch,...props})=>React.createElement('a',props,children)};
      if(!name.startsWith('.')&&!name.startsWith('@/'))return require(name);
      const resolved=name.startsWith('@/')?path.resolve(root,name.slice(2)):path.resolve(path.dirname(file),name);
      return load(fs.existsSync(resolved)?resolved:fs.existsSync(resolved+'.ts')?resolved+'.ts':resolved+'.tsx');
    };
    vm.runInThisContext('(function(module,exports,require){'+result.outputText+'\n})',{filename:file})(module,module.exports,local);
    return module.exports;
  };
}
function fixture() {
  const calls=[], events=[], abort=new AbortController();
  const actor={userId:U,accessToken:'synthetic',generation:1,signal:abort.signal};
  const current={actor,allowed:true,read:async()=>snapshot(),write:async(_actor,before,action)=>({...before,action,changed:true})};
  const client={async get(a,t,signal){calls.push({method:'get',actor:a,target:t,signal});return current.read();},
    async set(a,before,action,signal){calls.push({method:'set',actor:a,before,action,signal});return current.write(a,before,action);},
    async list(){assert.fail('No list or retarget is needed to describe an observation');}};
  const load=loader({[api]:{providerControlsClient:client},
    'src/shared/i18n/V2LanguageProvider.tsx':{useV2Language:()=>({language:'en'})}});
  const Session=load(feature+'model/providerControlSession.ts').ProviderControlSession;
  const session=new Session({getActor:()=>current.actor,isCurrent:a=>current.allowed&&a===current.actor&&!a.signal.aborted,
    changed:action=>events.push(action),client});
  const Dialog=load(feature+'components/ProviderControlDialog.tsx').default;
  const Language=load(feature+'model/providerControlLanguage.tsx').ProviderControlLanguage;
  const catalog=load(feature+'model/providerControlMessages.ts').providerControlMessages;
  const render=(language='et')=>renderToStaticMarkup(React.createElement(Language,{language},React.createElement(Dialog,{controls:{
    account:{actor:current.actor,ready:true,anonymous:false,error:false,refresh(){}},view:session.getSnapshot(),
    session:{close:()=>session.close(),check:()=>session.check(),confirm:()=>session.confirm()}}})));
  const writes=()=>calls.filter(call=>call.method==='set');
  return{session,current,actor,abort,calls,events,render,catalog,writes,
    Error:load('src/entities/viewer-provider-controls/model/types.ts').ProviderControlsError};
}
async function open(f){f.session.openBlockRemoval(snapshot());await tick();}
function previous(f){
  const html=f.render();assert.match(html,/>Varem loetud seis<\/h3>/);
  assert.match(html,/See varasem teave ei kinnita praegust seisu\./);
  assert.doesNotMatch(html,/>Seis viimase kontrolli ajal<\/h3>|Praegune salvestatud seis/);
  return html;
}
function checked(f){
  const html=f.render();assert.match(html,/>Seis viimase kontrolli ajal<\/h3>/);
  assert.doesNotMatch(html,/>Varem loetud seis<\/h3>|Praegune salvestatud seis/);return html;
}
const proof={kind:'provider-state-feedback-targeted-v1',startedAt:new Date().toISOString(),actualBrowser:false,
  boundary:'Actual ProviderControlSession, ProviderControlDialog, ProviderPreferenceState, presentation helper, React server rendering and EN/ET language lookup. Client/Auth are synthetic. No HTTP, SQL, native dialog, browser layout or application build.',cases:[]};
function scenario(name,body){test(name,async()=>{
  try{await body();proof.cases.push({name,status:'PASS'});}
  catch(error){proof.cases.push({name,status:'FAIL',error:error.message});throw error;}
});}

scenario('unknown write keeps an earlier observation through pending and failed checks; only a successful new read updates its label',async()=>{
  const f=fixture();try{
    await open(f);checked(f);const write=deferred();f.current.write=()=>write.promise;
    const sending=f.session.confirm();previous(f);await f.session.confirm();assert.equal(f.writes().length,1);
    write.reject(new f.Error('outcome_unknown'));await sending;
    assert.match(previous(f),/Muudatuse tulemust ei õnnestunud kinnitada/);
    assert.doesNotMatch(f.render(),/Seda eelistust muudeti mujal|>Eemalda blokeering<\/button>/);
    f.session.close();f.session.reopen();previous(f);
    const read=deferred();f.current.read=()=>read.promise;const checking=f.session.check();
    assert.equal(f.session.getSnapshot().phase,'loading');previous(f);await f.session.confirm();
    read.reject(new Error('synthetic failed read'));await checking;
    assert.equal(f.session.getSnapshot().phase,'uncertain');previous(f);
    assert.equal(f.session.getSnapshot().notice,null);await f.session.confirm();assert.equal(f.writes().length,1);
    f.current.read=async()=>snapshot({serverNow:T2,blockedByOther:true});await f.session.check();
    assert.equal(f.session.getSnapshot().message,'checkedUnknown');
    assert.match(checked(f),/Teine konto on sinu konto blokeerinud/);
    assert.equal(f.writes().length,1);assert.equal(f.session.getSnapshot().notice,null);
    assert.equal(f.writes()[0].before.blockId,B);assert.equal(f.writes()[0].before.blockCreatedAt,T);
  }finally{f.session.retire();}
});

scenario('known CAS conflict remains conflict and does not label the pre-write snapshot as newly checked',async()=>{
  const f=fixture();try{
    await open(f);f.current.write=async()=>{throw new f.Error('stale');};await f.session.confirm();
    assert.equal(f.session.getSnapshot().phase,'error');assert.equal(f.session.getSnapshot().message,'conflict');
    assert.match(previous(f),/Seda eelistust muudeti mujal/);
    assert.doesNotMatch(f.render(),/Muudatuse tulemust ei õnnestunud kinnitada/);
    await f.session.confirm();assert.equal(f.writes().length,1);
    assert.equal(f.session.getSnapshot().selection.blockPin.createdAt,T);
  }finally{f.session.retire();}
});

scenario('a first failed or pending read has no preference details until a successful read arrives',async()=>{
  const f=fixture();try{
    f.current.read=async()=>{throw new Error('synthetic unavailable');};await open(f);
    assert.equal(f.session.getSnapshot().phase,'error');assert.doesNotMatch(f.render(),/data-provider-saved-state/);
    const read=deferred();f.current.read=()=>read.promise;const pending=f.session.check();
    assert.doesNotMatch(f.render(),/data-provider-saved-state/);await f.session.confirm();assert.equal(f.writes().length,0);
    read.resolve(snapshot());await pending;checked(f);assert.equal(f.writes().length,0);
  }finally{f.session.retire();}
});

scenario('an older late read cannot restore a checked label after the latest read failed',async()=>{
  const f=fixture();try{
    await open(f);const first=deferred(),last=deferred();f.current.read=()=>first.promise;
    const oldRead=f.session.check();f.current.read=()=>last.promise;const latestRead=f.session.check();previous(f);
    last.reject(new Error('latest failed'));await latestRead;previous(f);
    first.resolve(snapshot({serverNow:T2,blockedByOther:true}));await oldRead;
    assert.equal(f.session.getSnapshot().phase,'error');assert.equal(f.session.getSnapshot().state.serverNow,T);
    previous(f);assert.equal(f.writes().length,0);
  }finally{f.session.retire();}
});

scenario('retiring the account discards a late read and the earlier preference details',async()=>{
  const f=fixture();try{
    await open(f);const read=deferred();f.current.read=()=>read.promise;const pending=f.session.check();
    f.abort.abort();f.current.actor={...f.actor,userId:V};f.session.retire();read.resolve(snapshot({serverNow:T2}));await pending;
    assert.equal(f.session.getSnapshot().state,null);assert.equal(f.session.getSnapshot().notice,null);
    assert.doesNotMatch(f.render(),/data-provider-saved-state|Test provider/);assert.equal(f.writes().length,0);
  }finally{f.session.retire();}
});

scenario('an unavailable old block row does not describe a replacement block as removed or absent',async()=>{
  const f=fixture();try{
    await open(f);f.current.write=async()=>{throw new f.Error('outcome_unknown');};await f.session.confirm();
    f.session.openBlockRemoval(snapshot({blockId:NEXT,blockCreatedAt:T2}));
    assert.equal(f.session.getSnapshot().selection.target.id,B);
    f.current.read=async()=>snapshot({targetAvailable:false,targetToken:null,blockedByMe:false,
      blockId:null,blockCreatedAt:null,canBlock:false,serverNow:T2});await f.session.check();
    const html=f.render();assert.equal(f.session.getSnapshot().phase,'ready');
    assert.match(html,/See toiming ei ole selle pakkuja jaoks enam saadaval/);
    assert.doesNotMatch(html,/data-provider-saved-state|Sa pole seda kasutajat blokeerinud|Sinu blokeering on eemaldatud/);
    assert.equal(f.session.getSnapshot().notice,null);await f.session.confirm();assert.equal(f.writes().length,1);
    assert.ok(f.calls.filter(call=>call.method==='get').every(call=>call.target.id===B));
  }finally{f.session.retire();}
});

scenario('dialog presentation uses the actual EN/ET catalog and English fallback for unsupported languages',async()=>{
  const f=fixture();try{
    await open(f);assert.match(f.render('en'),/>State at the last check<\/h3>/);
    assert.match(f.render('et'),/>Seis viimase kontrolli ajal<\/h3>/);
    assert.match(f.render('fr'),/>State at the last check<\/h3>/);
    f.current.write=async()=>{throw new f.Error('outcome_unknown');};await f.session.confirm();
    for(const language of ['en','fr']){
      const html=f.render(language);assert.match(html,/>Previously read state<\/h3>/);
      assert.match(html,/This earlier information does not confirm the current state\./);
      assert.doesNotMatch(html,/Current saved state|>State at the last check<\/h3>/);
    }
    previous(f);assert.deepEqual(Object.keys(f.catalog.en),Object.keys(f.catalog.et));
  }finally{f.session.retire();}
});

after(()=>{
  const drift=[...inputs].filter(([name,digest])=>sha(fs.readFileSync(path.join(root,name)))!==digest).map(([name])=>name);
  proof.finishedAt=new Date().toISOString();proof.inputDrift=drift;proof.sources=Object.fromEntries([...inputs].sort());
  proof.testSource={path:'tests/provider-state-feedback.test.cjs',sha256:sha(fs.readFileSync(__filename))};
  proof.runtime={node:process.version,typescript:ts.version,react:React.version};
  proof.status=drift.length||proof.cases.some(row=>row.status!=='PASS')?'FAIL':'PASS';
  if(process.env.SELQIRO_PROVIDER_STATE_PROOF)fs.writeFileSync(process.env.SELQIRO_PROVIDER_STATE_PROOF,JSON.stringify(proof,null,2)+'\n');
  assert.deepEqual(drift,[]);
});
