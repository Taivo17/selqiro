'use strict';
// Real ReactDOM StrictMode owner section, owner/actor/page hooks, API and HTTP transport.
// DOM/auth/profile/HTTP answers are synthetic; no visual or production-browser claim.
const {test,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto'),React=require('react'),{act}=React;
if(!process.env.SELQIRO_DOM_JSDOM)throw new Error('SELQIRO_DOM_JSDOM must point to the isolated jsdom module for this required DOM suite');
const {JSDOM,VirtualConsole}=require(process.env.SELQIRO_DOM_JSDOM);
const {fixture,reply,lock,owner,page,actor,U,I,J,P,deferred}=require('./helpers/job-owner-read-loader.cjs');
const tick=()=>new Promise(resolve=>setImmediate(resolve)),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const inputs=new Map(),proof={kind:'job-owner-read-recovery-ui-v1',startedAt:new Date().toISOString(),cases:[],
  boundary:'Actual MyJobsSection, useOwnerJobs, useJobPage, useConversationActor, identity events, API/parser/recovery and Supabase POST transport in ReactDOM StrictMode/jsdom. Auth, profile, HTTP and translation boundaries are synthetic. No browser layout, live account, network or production write.'};
const language={useV2Translation:catalog=>({language:'en',t:(key,params={})=>Object.entries(params).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),catalog.en[key])})};
function scenario(name,run){test(name,async()=>{try{await run();proof.cases.push({name,status:'PASS'});}catch(error){proof.cases.push({name,status:'FAIL',error:error.message});throw error;}});}

async function mount(steps,{userFailure=false}={}) {
  const errors=[],network=[],virtual=new VirtualConsole();virtual.on('jsdomError',error=>errors.push(error.message));
  const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://owner-job-ui.invalid/v2/my-area',virtualConsole:virtual}),w=dom.window;
  const saved=new Map();for(const key of ['window','document','navigator','HTMLElement','Node','Event','CustomEvent','IS_REACT_ACT_ENVIRONMENT','fetch'])saved.set(key,Object.getOwnPropertyDescriptor(global,key));
  for(const key of ['window','document','navigator','HTMLElement','Node','Event','CustomEvent'])Object.defineProperty(global,key,{value:key==='window'?w:key==='document'?w.document:w[key],writable:true,configurable:true});
  global.IS_REACT_ACT_ENVIRONMENT=true;
  const noNetwork=(...args)=>{network.push(String(args[0]));throw Error('Unexpected network in owner read fixture');};global.fetch=noNetwork;w.fetch=noNetwork;
  const originalError=console.error;console.error=(...args)=>errors.push(args.map(String).join(' '));
  const callbacks=new Set(),state={userId:U,identityId:I,userFailure},session=()=>({user:{id:state.userId},access_token:'synthetic-session-token'});
  const f=fixture(steps,{
    auth:{async getSession(){return{data:{session:session()},error:null};},async getUser(){return{data:{user:state.userFailure?null:{id:state.userId}},error:state.userFailure?new Error('synthetic auth failure'):null};},
      onAuthStateChange(fn){callbacks.add(fn);return{data:{subscription:{unsubscribe(){callbacks.delete(fn);}}}};}},
    from(table){assert.equal(table,'profiles');return{select(column){assert.equal(column,'active_identity_id');return{eq(column,id){assert.equal(column,'id');assert.equal(id,state.userId);return{async maybeSingle(){return{data:{active_identity_id:state.identityId},error:null};}};}};}};},
  },{'src/shared/i18n/V2LanguageProvider.tsx':language});
  const Section=f.load('src/features/jobs/components/MyJobsSection.tsx').default,events=f.load('src/features/v2-shell/model/identityEvents.ts');
  const root=require('react-dom/client').createRoot(w.document.getElementById('root'));let mounted=true;
  const render=()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Section,{
    actor:{userId:state.userId,identityId:state.identityId},identity:{id:state.identityId,type:'private',displayName:'Owner',avatarUrl:null,slug:'owner'},loading:false,error:null})));
  // Auth callbacks deliberately defer verification with setTimeout(0). Flush that
  // timer turn as well as React work; setImmediate alone can precede the timer.
  const settle=async(ms=0)=>{await act(async()=>{await delay(ms);});};
  const run=async(fn)=>{await act(async()=>{fn();await tick();});await settle();};
  await run(render);
  return{...f,state,doc:w.document,settle,
    async retry(){const button=[...w.document.querySelectorAll('button')].find(node=>node.textContent==='Try again');assert.ok(button);await run(()=>button.click());},
    async identityChange(){await run(()=>{const change=events.beginIdentityChange(state.userId);state.identityId=P;render();events.finishIdentityChange(change);});},
    async accountChange(){await run(()=>{state.userId=P;state.identityId=J;render();for(const callback of callbacks)callback('SIGNED_IN',session());});},
    async unmount(){if(mounted){await run(()=>root.unmount());mounted=false;}},
    async close(){try{
      if(mounted)await run(()=>root.unmount());mounted=false;
      for(const [file,sha] of f.load.inputs){if(inputs.has(file))assert.equal(inputs.get(file),sha);inputs.set(file,sha);}
      assert.deepEqual(network,[]);assert.deepEqual(errors,[]);
    }finally{w.close();console.error=originalError;for(const [key,descriptor]of saved){if(descriptor)Object.defineProperty(global,key,descriptor);else delete global[key];}}},
  };
}

scenario('owner section stays loading through one transient read then displays the closed job',async()=>{
  const f=await mount([lock(),reply(page())]);try{
    assert.equal(f.calls.length,1);assert.equal(f.doc.querySelector('[role="alert"]'),null);assert.match(f.doc.body.textContent,/Loading/);
    await f.settle(420);assert.equal(f.calls.length,2);assert.equal(f.doc.querySelector('[role="alert"]'),null);
    assert.match(f.doc.body.textContent,/Test engineer/);assert.match(f.doc.body.textContent,/Closed/);
  }finally{await f.close();}
});

scenario('two transient failures expose the manual retry and clicking it loads the current page',async()=>{
  const f=await mount([lock(),lock(),reply(page())]);try{
    await f.settle(420);assert.equal(f.calls.length,2);assert.match(f.doc.querySelector('[role="alert"]').textContent,/Could not load the jobs/);
    await f.retry();assert.equal(f.calls.length,3);assert.equal(f.doc.querySelector('[role="alert"]'),null);assert.match(f.doc.body.textContent,/Test engineer/);
  }finally{await f.close();}
});

scenario('real owner hook shows permission and malformed response errors without hidden retries',async()=>{
  for(const response of [reply({code:'42501',message:'identity changed'},503),reply(page({identity_id:P}))]){
    const f=await mount([response]);try{
      assert.equal(f.calls.length,1);assert.ok(f.doc.querySelector('[role="alert"]'));await f.settle(420);assert.equal(f.calls.length,1);
    }finally{await f.close();}
  }
});

scenario('identity change while waiting cancels the old retry and fetches only the newly verified identity',async()=>{
  const other=owner({identity_id:P,content:{...owner().content,title:'Other identity task'}});
  const f=await mount([lock(),reply(page({identity_id:P,items:[other]}))]);try{
    assert.equal(f.calls.length,1);await f.identityChange();await f.settle(420);
    assert.deepEqual(f.calls.map(call=>call.args.p_expected_identity_id),[I,P]);
    assert.match(f.doc.body.textContent,/Other identity task/);assert.doesNotMatch(f.doc.body.textContent,/Test engineer/);
  }finally{await f.close();}
});

scenario('unmount while waiting prevents another request and any subsequent owner UI update',async()=>{
  const f=await mount([lock()]);try{
    assert.equal(f.calls.length,1);await f.unmount();await f.settle(420);assert.equal(f.calls.length,1);assert.equal(f.doc.body.textContent,'');
  }finally{await f.close();}
});

scenario('late first and retry responses from the old account cannot replace the new account jobs',async()=>{
  for(const afterFailure of [false,true]){
    const held=deferred(),other=owner({actor_user_id:P,identity_id:J,content:{...owner().content,title:'Other account job'}});
    const wait=()=>held.promise,success=reply(page({actor_user_id:P,identity_id:J,items:[other]}));
    const f=await mount(afterFailure?[lock(),wait,success]:[wait,success]);try{
      if(afterFailure)await f.settle(420);assert.equal(f.calls.length,afterFailure?2:1);
      const old=f.calls.at(-1);await f.accountChange();await f.settle();assert.equal(old.signal.aborted,true);
      assert.match(f.doc.body.textContent,/Other account job/);held.resolve(reply(page()));await f.settle();
      assert.match(f.doc.body.textContent,/Other account job/);assert.doesNotMatch(f.doc.body.textContent,/Test engineer/);
      assert.equal(f.calls.length,afterFailure?3:2);
    }finally{held.resolve(reply(page()));await f.close();}
  }
});

scenario('actor verification errors retain manual recovery and never start automatic owner reads',async()=>{
  const f=await mount([reply(page())],{userFailure:true});try{
    assert.equal(f.calls.length,0);assert.ok(f.doc.querySelector('[role="alert"]'));await f.settle(420);assert.equal(f.calls.length,0);
    f.state.userFailure=false;await f.retry();assert.equal(f.calls.length,1);assert.equal(f.doc.querySelector('[role="alert"]'),null);assert.match(f.doc.body.textContent,/Test engineer/);
  }finally{await f.close();}
});

after(()=>{
  proof.finishedAt=new Date().toISOString();proof.status=proof.cases.every(row=>row.status==='PASS')?'PASS':'FAIL';
  proof.inputs=[...inputs].sort().map(([file,sha256])=>({path:file,sha256}));
  for(const file of ['tests/job-owner-read-recovery-ui.test.cjs','tests/helpers/job-owner-read-loader.cjs','tests/helpers/jobs-public-loader.cjs']){
    proof.inputs.push({path:file,sha256:createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',file))).digest('hex')});
  }
  if(process.env.SELQIRO_OWNER_READ_UI_PROOF)fs.writeFileSync(process.env.SELQIRO_OWNER_READ_UI_PROOF,JSON.stringify(proof,null,2)+'\n');
});
