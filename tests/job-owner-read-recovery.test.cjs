'use strict';
// Actual owner RPC, wire parser and bounded read recovery; HTTP/auth/time answers are synthetic.
const {test,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const {fixture,reply,lock,owner,page,actor,T,U,I,J,P,deferred}=require('./helpers/job-owner-read-loader.cjs');
const inputs=new Map(),proof={kind:'job-owner-read-recovery-v1',startedAt:new Date().toISOString(),cases:[],
  boundary:'Actual TypeScript API, parser and read-recovery helper, plus installed Supabase/PostgREST POST transport with synthetic HTTP. No live auth, network, database, product write or browser.'};
const tick=()=>new Promise(resolve=>setImmediate(resolve)),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function setup(steps){const f=fixture(steps);for(const [name,sha] of f.load.inputs){if(inputs.has(name))assert.equal(inputs.get(name),sha);inputs.set(name,sha);}return f;}
function authority(){const pageAbort=new AbortController(),actorAbort=new AbortController(),state={current:true};
  return{pageAbort,actorAbort,state,context:{signal:actorAbort.signal,isCurrent:()=>state.current}};}
const read=(f,c=authority(),cursor=null,expected=actor)=>f.recover(expected,cursor,c.pageAbort.signal,c.context);
function scenario(name,run){test(name,async context=>{try{await run(context);proof.cases.push({name,status:'PASS'});}catch(error){proof.cases.push({name,status:'FAIL',error:error.message});throw error;}});}

scenario('owner read recovers once from a row-lock timeout and keeps closed jobs',async()=>{
  const f=setup([lock(),reply(page())]);
  const result=await read(f);
  assert.equal(result.items[0].status,'closed');assert.equal(result.items[0].job_id,J);
  assert.equal(f.calls.length,2);assert.deepEqual(f.calls[1].args,f.calls[0].args);
  assert.ok(f.calls.every(call=>call.name==='get_my_jobs_v1'));
});

scenario('only explicit owner transport failures are classified as retryable',async()=>{
  const cases=[
    {step:lock(),retry:true},
    {step:reply({message:'upstream temporarily unavailable'},503),retry:true},
    {step:reply({message:'gateway unavailable'},502),retry:true},
    {step:reply({message:'gateway timed out'},504),retry:true},
    {step:reply({message:'request timed out'},408),retry:true},
    {step:reply({message:'limited'},429),retry:true},
    {step:()=>{throw new TypeError('Failed to fetch');},retry:true},
    {step:()=>{throw new DOMException('Cancelled','AbortError');},retry:false},
    {step:reply({code:'42501',message:'identity changed'},503),retry:false},
    {step:reply({code:'22023',message:'invalid input'},503),retry:false},
    {step:reply({code:'XX000',message:'unknown server error'},500),retry:false},
    {step:reply({message:'unauthorized'},401),retry:false},
    {step:reply({message:'forbidden'},403),retry:false},
    {step:new Response('invalid json',{status:200,headers:{'content-type':'application/json'}}),retry:false},
  ];
  for(const entry of cases){const f=setup([entry.step]);await assert.rejects(f.api.getOwnerJobs(actor,null,new AbortController().signal),
      error=>f.api.isRetryableOwnerJobReadError(error)===entry.retry);assert.equal(f.calls.length,1);}
});

scenario('a failed fetch recovers through the real PostgREST response wrapper',async()=>{
  const f=setup([()=>{throw new TypeError('Failed to fetch');},reply(page())]);
  assert.equal((await read(f)).identity_id,I);assert.equal(f.calls.length,2);
});

scenario('internal read timeout retries once while external cancellation wins and writes remain single dispatch',async context=>{
  const waitForAbort=call=>new Promise((resolve,reject)=>{
    const cancel=()=>reject(new DOMException('Synthetic stalled transport aborted','AbortError'));
    if(call.signal.aborted)cancel();else call.signal.addEventListener('abort',cancel,{once:true});
  });
  context.mock.timers.enable({apis:['setTimeout']});
  try {
    const f=setup([waitForAbort,reply(page())]),pending=read(f);await tick();assert.equal(f.calls.length,1);
    context.mock.timers.tick(20000);await tick();assert.equal(f.calls[0].signal.aborted,true);assert.equal(f.calls.length,1);
    context.mock.timers.tick(350);await tick();assert.equal((await pending).items[0].status,'closed');assert.equal(f.calls.length,2);

    for(const atDeadline of [false,true]){
      const g=setup([waitForAbort]),c=authority(),result=read(g,c),checked=assert.rejects(result);await tick();
      if(atDeadline)context.mock.timers.tick(20000);
      c.actorAbort.abort();await checked;context.mock.timers.tick(40000);await tick();assert.equal(g.calls.length,1);
    }

    const write=setup([waitForAbort]),intent={actor,requestKey:P,operation:'status',input:{job_id:J,expected_revision:'3',expected_status:'published',status:'closed'}};
    const checked=assert.rejects(write.api.writeJob(intent,new AbortController().signal),error=>error.kind==='unknown'&&!write.api.isRetryableOwnerJobReadError(error));
    await tick();context.mock.timers.tick(20000);await checked;context.mock.timers.tick(350);await tick();assert.equal(write.calls.length,1);
  }finally{context.mock.timers.reset();}
});

scenario('deadline never converts late permission or malformed owner responses into retryable errors',async context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  try {
    for(const entry of [
      {response:()=>reply({code:'42501',message:'actor changed'},503),kind:'forbidden'},
      {response:()=>reply({code:'22023',message:'invalid page'},400),kind:'invalid'},
      {response:()=>reply(page({identity_id:P})),kind:'unknown'},
      {response:()=>{throw new Error('Unexpected late transport failure');},kind:'unknown'},
    ]){
      const held=deferred(),f=setup([()=>held.promise]);
      const checked=assert.rejects(read(f),error=>error.kind===entry.kind&&!f.api.isRetryableOwnerJobReadError(error));
      await tick();context.mock.timers.tick(20000);
      try{held.resolve(entry.response());}catch(error){held.reject(error);}
      await checked;context.mock.timers.tick(350);await tick();assert.equal(f.calls.length,1);
    }
    const held=deferred(),f=setup([()=>held.promise,reply(page())]),pending=read(f);
    await tick();context.mock.timers.tick(20000);held.resolve(reply(page()));await tick();
    context.mock.timers.tick(350);await tick();assert.equal((await pending).identity_id,I);assert.equal(f.calls.length,2);
  }finally{context.mock.timers.reset();}
});

scenario('second transient failure stops and a later manual read starts a fresh bounded attempt',async()=>{
  const f=setup([lock(),lock(),reply(page())]);
  await assert.rejects(read(f),error=>f.api.isRetryableOwnerJobReadError(error));assert.equal(f.calls.length,2);
  await delay(400);assert.equal(f.calls.length,2,'There is no background third attempt');
  assert.equal((await read(f)).items[0].status,'closed');assert.equal(f.calls.length,3);
});

scenario('permission, identity, input, policy, conflict and malformed-page failures are not retried',async()=>{
  for(const step of [
    reply({code:'42501',message:'job_identity_forbidden'},403),
    reply({code:'22023',message:'job_page_invalid'},400),
    reply({code:'23514',message:'invalid content'},400),
    reply({code:'40001',message:'identity changed'},409),
    reply({code:'55000',message:'job_policy_changed'},400),
    reply(page({identity_id:P})),reply(page({items:[owner({actor_user_id:P})]})),
    reply(page({items:[owner({content:{...owner().content,title:''}})]})),
    reply(page({unexpected:'private data'})),
    new Response('not JSON',{status:200,headers:{'content-type':'application/json'}}),
    ()=>{throw new DOMException('Cancelled','AbortError');},
  ]){const f=setup([step]);await assert.rejects(read(f),error=>!f.api.isRetryableOwnerJobReadError(error));assert.equal(f.calls.length,1);}
  const f=setup([]);await assert.rejects(read(f,authority(),{created_at:'invalid',id:J}));assert.equal(f.calls.length,0);
});

scenario('page unmount or actor abort during the wait cancels the extra owner read',async()=>{
  for(const source of ['pageAbort','actorAbort']){
    const f=setup([lock()]),c=authority();const pending=read(f,c);const checked=assert.rejects(pending);
    await tick();assert.equal(f.calls.length,1);c[source].abort();await checked;
    await delay(400);assert.equal(f.calls.length,1);
  }
  const f=setup([]),c=authority();c.actorAbort.abort();await assert.rejects(read(f,c));assert.equal(f.calls.length,0);
});

scenario('loss of current actor blocks retry even before its abort event arrives',async()=>{
  const f=setup([lock()]),c=authority();const pending=read(f,c),checked=assert.rejects(pending);
  await tick();assert.equal(f.calls.length,1);c.state.current=false;await checked;assert.equal(f.calls.length,1);
});

scenario('late first and retry responses cannot publish an obsolete owner page',async()=>{
  for(const afterFailure of [false,true]){
    const held=deferred(),started=deferred(),c=authority();
    const step=()=>{started.resolve();return held.promise;},f=setup(afterFailure?[lock(),step]:[step]);
    const pending=read(f,c),checked=assert.rejects(pending);await started.promise;
    c.state.current=false;c.actorAbort.abort();held.resolve(reply(page()));await checked;
    assert.equal(f.calls.length,afterFailure?2:1);
  }
});

scenario('successful reads use one dispatch and a retry preserves the exact actor and cursor snapshot',async()=>{
  const first=setup([reply(page())]);assert.equal((await read(first)).items.length,1);assert.equal(first.calls.length,1);
  const held=deferred(),started=deferred(),expected={...actor},cursor={created_at:'2026-11-23T10:00:00Z',id:P};
  const f=setup([()=>{started.resolve();return held.promise;},reply(page())]);
  const pending=read(f,authority(),cursor,expected);await started.promise;
  expected.userId=P;expected.identityId=P;cursor.created_at=T;cursor.id=J;
  held.resolve(lock());const result=await pending;assert.equal(result.identity_id,I);
  assert.deepEqual(f.calls[0].args,f.calls[1].args);assert.equal(f.calls[1].args.p_expected_user_id,U);
  assert.deepEqual(f.calls[1].args.p_cursor,{created_at:'2026-11-23T10:00:00Z',id:P});
});

scenario('write and contact RPCs remain one dispatch and never gain owner-read recovery',async()=>{
  const intent={actor,requestKey:P,operation:'status',input:{job_id:J,expected_revision:'3',expected_status:'published',status:'closed'}};
  const f=setup([lock(),lock()]),signal=new AbortController().signal;
  await assert.rejects(f.api.writeJob(intent,signal),error=>!f.api.isRetryableOwnerJobReadError(error));
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].name,'set_my_job_status_v1');
  await assert.rejects(f.api.contactJob({actor,requestKey:P,jobId:J},signal),error=>!f.api.isRetryableOwnerJobReadError(error));
  assert.equal(f.calls.length,2);assert.equal(f.calls[1].name,'contact_my_job_provider_v1');
});

after(()=>{
  proof.finishedAt=new Date().toISOString();proof.status=proof.cases.every(row=>row.status==='PASS')?'PASS':'FAIL';
  proof.inputs=[...inputs].sort().map(([file,sha256])=>({path:file,sha256}));
  for(const file of ['tests/job-owner-read-recovery.test.cjs','tests/helpers/job-owner-read-loader.cjs','tests/helpers/jobs-public-loader.cjs']){
    proof.inputs.push({path:file,sha256:createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',file))).digest('hex')});
  }
  if(process.env.SELQIRO_OWNER_READ_PROOF)fs.writeFileSync(process.env.SELQIRO_OWNER_READ_PROOF,JSON.stringify(proof,null,2)+'\n');
});
