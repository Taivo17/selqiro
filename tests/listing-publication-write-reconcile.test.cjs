'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path');
const root=process.env.PUBLICATION_RECONCILE_COMPILED_ROOT;
if(!root||!path.isAbsolute(root))throw Error('reconcile_compiled_root_required');
const {createWriteReconcileOne}=require(path.join(root,'server/listing-publication/final/reconcileWriteOne.js'));
const {createCleanupOne}=require(path.join(root,'server/listing-publication/final/cleanupOne.js'));
const {webHash}=require(path.join(root,'server/listing-publication/web/webImageContract.js'));
const uuid=n=>String(n).repeat(8)+'-'+String(n).repeat(4)+'-'+String(n).repeat(4)+'-'+String(n).repeat(4)+'-'+String(n).repeat(12);
const OBJECT=uuid(1),WORK=uuid(2),ATT=uuid(3),SLOT=uuid(4),PROVIDER=uuid(5),VERSION=uuid(6),DELETEWORK=uuid(7);
const origin='https://abcdefghijklmnopqrst.supabase.co',config={projectOrigin:origin,serviceKey:'SYNTHETIC_SERVICE_SECRET'};
const bytes=()=>Buffer.from('new synthetic web bytes for reconciliation');
const task=(kind='web_commit')=>({schema_version:1,object_id:OBJECT,work_key:WORK,kind,attempt_id:ATT,slot_id:SLOT,
 bucket_id:'listing-publication-private',object_path:`v1/${ATT}/${SLOT}/${kind==='source_unsigned'?'source.upload':'web-v1.webp'}`,
 expected_sha256:kind==='web_commit'?webHash(bytes()):null,expected_bytes:kind==='web_commit'?bytes().length:null,
 storage_object_id:kind==='web_commit'?PROVIDER:null,storage_version:kind==='web_commit'?VERSION:null,
 lease_until_epoch:Math.floor(Date.now()/1000)+60,try_count:1});
async function model(options={}){
 const state={requests:[],task:task(options.kind),stored:bytes(),settled:false,deleted:false,recordCalls:0,deleteCalls:0};
 if(options.mutateTask)options.mutateTask(state.task);let err;
 const server=http.createServer(async(req,res)=>{try{
  let body=Buffer.alloc(0);for await(const b of req)body=Buffer.concat([body,b]);
  state.requests.push({method:req.method,path:req.url,body:body.toString()});
  assert.equal(req.headers.authorization,'Bearer SYNTHETIC_SERVICE_SECRET');
  const json=(v,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(v));};
  if(req.url==='/rest/v1/rpc/claim_listing_write_reconcile_v1'){
   assert.equal(req.method,'POST');assert.equal(body.toString(),'{}');
   if(options.loseClaim){res.destroy();return;}if(options.claimStatus){json({},options.claimStatus);return;}
   json(options.idle||state.settled?null:state.task);return;
  }
  if(req.url==='/rest/v1/rpc/record_listing_write_reconcile_v1'){
   state.recordCalls++;assert.equal(req.method,'POST');const r=JSON.parse(body);
   assert.equal(r.p_object_id,OBJECT);assert.equal(r.p_work_key,WORK);
   if(options.recordStatus){json({},options.recordStatus);return;}
   if(options.rowChanged){json({code:'22023'},400);return;}
   if(r.p_outcome==='observed'){
    if(state.task.kind==='web_commit'){
     assert.equal(r.p_storage_object_id,PROVIDER);assert.equal(r.p_storage_version,VERSION);
     assert.equal(r.p_observed_sha256,webHash(bytes()));assert.equal(r.p_observed_bytes,bytes().length);
    }else for(const k of ['p_storage_object_id','p_storage_version','p_observed_sha256','p_observed_bytes'])assert.equal(r[k],null);
    state.settled=true;
   }else for(const k of ['p_storage_object_id','p_storage_version','p_observed_sha256','p_observed_bytes'])assert.equal(r[k],null);
   const saved={object_id:OBJECT,work_key:WORK,state:r.p_outcome==='observed'?'settled':r.p_outcome==='mismatch'?'needs_attention':'retry_wait'};
   if(options.mutateReceipt)options.mutateReceipt(saved);
   if(options.loseRecord){res.destroy();return;}json(saved);return;
  }
  if(req.url==='/storage/v1/object/authenticated/'+state.task.bucket_id+'/'+state.task.object_path){
   assert.equal(req.method,'GET');assert.equal(req.headers['accept-encoding'],'identity');
   if(options.readReject){res.destroy();return;}
   if(options.readStatus||state.deleted||options.absent){json({},state.deleted||options.absent?404:options.readStatus);return;}
   const b=options.corrupt?Buffer.alloc(bytes().length):state.stored;
   if(options.redirect){res.writeHead(302,{location:'https://outside.invalid/'});res.end();return;}
   res.writeHead(200,{'content-type':options.wrongMime?'image/jpeg':'image/webp','content-length':b.length,...(options.headers||{})});
   if(options.truncated){res.write(b.subarray(0,4));setImmediate(()=>res.destroy());return;}
   if(options.onRead)await options.onRead(state);res.end(b);return;
  }
  if(req.url==='/rest/v1/rpc/claim_listing_cleanup_v1'){
   json(!state.settled||state.deleted?null:{schema_version:1,object_id:OBJECT,work_key:DELETEWORK,bucket_id:state.task.bucket_id,
    object_path:state.task.object_path,try_count:1,lease_until_epoch:Math.floor(Date.now()/1000)+60});return;
  }
  if(req.url==='/storage/v1/object/'+state.task.bucket_id){
   assert.equal(req.method,'DELETE');assert.ok(state.settled);state.deleteCalls++;state.deleted=true;json([{name:state.task.object_path}]);return;
  }
  if(req.url==='/rest/v1/rpc/record_listing_cleanup_v1'){
   const r=JSON.parse(body);assert.equal(r.p_result,'deleted');json({object_id:OBJECT,work_key:DELETEWORK,state:'deleted'});return;
  }
  throw Error('unexpected_endpoint '+req.url);
 }catch(e){err=e;if(!res.headersSent)res.writeHead(500);res.end('{}');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const fetcher=(url,init)=>{
  assert.ok(url.startsWith(origin+'/'));assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');
  assert.equal(init.cache,'no-store');assert.equal(init.referrerPolicy,'no-referrer');
  return fetch('http://127.0.0.1:'+server.address().port+url.slice(origin.length),init);
 };
 return {state,run:createWriteReconcileOne(config,fetcher),cleanup:createCleanupOne(config,fetcher),close:async()=>{
  server.closeAllConnections();await new Promise(r=>server.close(r));if(err)throw err;
 }};
}
const using=async(opts,fn)=>{const m=await model(opts);try{await fn(m);}finally{await m.close();}};
const names=s=>s.requests.map(r=>r.method+' '+r.path.split('/').at(-1));
test('reconcile: committed WEB plus matching full bytes settles without a POST ACK',async()=>using({},async m=>{
 assert.equal((await m.run()).kind,'settled');assert.deepEqual(names(m.state),['POST claim_listing_write_reconcile_v1','GET web-v1.webp','POST record_listing_write_reconcile_v1']);
 assert.equal(m.state.recordCalls,1);assert.equal(m.state.deleteCalls,0);
}));
test('reconcile: unsigned SOURCE requires no binary or provider request',async()=>using({kind:'source_unsigned'},async m=>{
 assert.equal((await m.run()).kind,'settled');assert.deepEqual(names(m.state),['POST claim_listing_write_reconcile_v1','POST record_listing_write_reconcile_v1']);
}));
test('reconcile: lost WEB acknowledgement recovers then existing cleaner deletes exactly once',async()=>using({},async m=>{
 assert.equal((await m.cleanup()).kind,'idle');assert.equal((await m.run()).kind,'settled');assert.equal((await m.cleanup()).kind,'deleted');
 assert.equal((await m.cleanup()).kind,'idle');assert.equal(m.state.deleteCalls,1);assert.equal((await m.run()).kind,'idle');assert.equal(m.state.recordCalls,1);
}));
test('reconcile: absent primary metadata is waiting, not proof of no write',async()=>using({mutateTask:t=>{t.storage_object_id=null;t.storage_version=null;}},async m=>{
 assert.equal((await m.run()).kind,'retry_wait');assert.equal(m.state.settled,false);assert.equal(names(m.state).some(x=>x.startsWith('GET ')),false);assert.equal((await m.cleanup()).kind,'idle');
}));
test('reconcile: 404 read after primary metadata stays blocked',async()=>using({absent:true},async m=>{
 assert.equal((await m.run()).kind,'retry_wait');assert.equal(m.state.settled,false);assert.equal((await m.cleanup()).kind,'idle');
}));
test('reconcile: wrong bytes require attention, never deletion',async()=>using({corrupt:true},async m=>{
 assert.equal((await m.run()).kind,'needs_attention');assert.equal(m.state.settled,false);assert.equal((await m.cleanup()).kind,'idle');
}));
for(const opts of [{wrongMime:true},{headers:{'content-range':'bytes 0-40/41'}},{headers:{'content-encoding':'gzip'}},{truncated:true},{readReject:true},{redirect:true}])
 test('reconcile: unsafe binary response '+JSON.stringify(opts),async()=>using(opts,async m=>{
  assert.equal((await m.run()).kind,'retry_wait');assert.equal(m.state.settled,false);assert.equal(m.state.recordCalls,1);
 }));
for(const status of [401,403,500,202])test('reconcile: Storage HTTP '+status+' is not finality',async()=>using({readStatus:status},async m=>{
 assert.equal((await m.run()).kind,'retry_wait');assert.equal(m.state.settled,false);
}));
test('reconcile: generation changed between claim and receipt is not accepted',async()=>using({rowChanged:true},async m=>{
 assert.equal((await m.run()).kind,'reconcile');assert.equal(m.state.settled,false);assert.equal(m.state.recordCalls,1);
}));
test('reconcile: lost claim never reads bytes or sends receipt',async()=>using({loseClaim:true},async m=>{
 assert.equal((await m.run()).kind,'reconcile');assert.deepEqual(names(m.state),['POST claim_listing_write_reconcile_v1']);
}));
test('reconcile: lost receipt response is not auto-retried and later claim is idle',async()=>using({loseRecord:true},async m=>{
 assert.equal((await m.run()).kind,'reconcile');assert.equal(m.state.settled,true);assert.equal(m.state.recordCalls,1);assert.equal((await m.run()).kind,'idle');
}));
for(const status of [401,403,400,500])test('reconcile: rejected claim HTTP '+status+' sends no binary request',async()=>using({claimStatus:status},async m=>{
 assert.equal((await m.run()).kind,'reconcile');assert.equal(m.state.requests.length,1);
}));
const bad={source_path:t=>t.object_path=`v1/${ATT}/${SLOT}/source.upload`,other_bucket:t=>t.bucket_id='public',external_url:t=>t.object_path='https://evil.invalid/x',
 traversal:t=>t.object_path=`v1/${ATT}/../web-v1.webp`,nil_id:t=>t.object_id=uuid(0),extra_field:t=>t.verified=true,
 missing_version:t=>t.storage_version=null,bad_version:t=>t.storage_version='not-a-uuid',too_big:t=>t.expected_bytes=4194305,
 bad_hash:t=>t.expected_sha256='a'.repeat(63),expired:t=>t.lease_until_epoch=0,inflated_lease:t=>t.lease_until_epoch+=100,
 too_many_attempts:t=>t.try_count=9,unknown_kind:t=>t.kind='signed_source'};
for(const [name,mutateTask]of Object.entries(bad))test('reconcile: invalid target '+name+' cannot read or settle',async()=>using({mutateTask},async m=>{
 assert.equal((await m.run()).kind,'reconcile');assert.equal(m.state.requests.length,1);assert.equal(m.state.recordCalls,0);
}));
test('reconcile: SOURCE target with provider claim fields is rejected',async()=>using({kind:'source_unsigned',mutateTask:t=>t.storage_object_id=PROVIDER},async m=>{
 assert.equal((await m.run()).kind,'reconcile');assert.equal(m.state.requests.length,1);
}));
for(const key of ['object_id','work_key','state'])test('reconcile: mismatching saved receipt '+key+' is not success',async()=>using({mutateReceipt:r=>r[key]='wrong'},async m=>{
 assert.equal((await m.run()).kind,'reconcile');assert.equal(m.state.recordCalls,1);
}));
test('reconcile: fake settled result for missing object is not accepted',async()=>using({absent:true,mutateReceipt:r=>r.state='settled'},async m=>{
 assert.equal((await m.run()).kind,'reconcile');assert.equal(m.state.settled,false);
}));
test('reconcile: pre-aborted call sends no request',async()=>using({},async m=>{
 const c=new AbortController();c.abort();assert.equal((await m.run(c.signal)).kind,'reconcile');assert.equal(m.state.requests.length,0);
}));
test('reconcile: bad service configuration cannot construct worker',()=>{
 for(const c of [{...config,projectOrigin:'http://localhost:1234'},{...config,serviceKey:''},{...config,serviceKey:'bad key'}])assert.throws(()=>createWriteReconcileOne(c));
});
test('reconcile: browser environment cannot create privileged worker',()=>{
 global.window={};try{assert.throws(()=>createWriteReconcileOne(config));}finally{delete global.window;}
});
test('reconcile: signed SOURCE is not returned by the private eligibility model',async()=>using({idle:true,kind:'source_unsigned'},async m=>{
 assert.equal((await m.run()).kind,'idle');assert.equal(m.state.requests.length,1);assert.equal(m.state.deleteCalls,0);
}));
// Counterexamples are deliberately synthetic protocol models, NOT Supabase acceptance tests.
test('reconcile boundary model: a reusable token can recreate a deleted key',()=>{
 const provider={tokenValid:true,file:null};const put=b=>{if(provider.tokenValid)provider.file=b;};put('first');provider.file=null;put('late replay');assert.equal(provider.file,'late replay');
});
test('reconcile boundary model: token expiry does not finish a previously admitted write',async()=>{
 let tokenValid=true,file=null;const admitted=tokenValid;tokenValid=false;file=null;await Promise.resolve();if(admitted)file='late completion';assert.equal(file,'late completion');assert.equal(tokenValid,false);
});
