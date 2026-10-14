'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), http=require('node:http');
const path=require('node:path'), fs=require('node:fs');
const root=process.env.PUBLICATION_COMPLETION_COMPILED_ROOT;
if(!root || !path.isAbsolute(root)) throw Error('new_completion_compiled_root_required');
const C=require(path.join(root,'server/listing-publication/web/webImageContract.js'));
const {createPrivateWebVerifier}=require(path.join(root,'server/listing-publication/web/verifyPrivateWebImage.js'));
const {readWebObjectBytes}=require(path.join(root,'server/listing-publication/web/webObjectHttp.js'));
const {recordWebWriteCompletion}=require(path.join(root,'server/listing-publication/web/webWriteCompletion.js'));
const {createCleanupOne}=require(path.join(root,'server/listing-publication/final/cleanupOne.js'));
const PROVIDER='15151515-1515-1515-1515-151515151515',WORK='16161616-1616-1616-1616-161616161616';
const A='11111111-1111-1111-1111-111111111111',I='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ATT='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',SLOT='cccccccc-cccc-cccc-cccc-cccccccccccc';
const REQ='dddddddd-dddd-dddd-dddd-dddddddddddd',JOB='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const CLAIM='ffffffff-ffff-ffff-ffff-ffffffffffff',SRC='12121212-1212-1212-1212-121212121212';
const WEB='13131313-1313-1313-1313-131313131313',REC='14141414-1414-1414-1414-141414141414';
const origin='https://abcdefghijklmnopqrst.supabase.co';
const config={projectOrigin:origin,publicKey:'SYNTHETIC_PUBLIC',serviceKey:'SYNTHETIC_SERVICE_SECRET'};
const command=()=>({expectedUserId:A,expectedIdentityId:I,attemptId:ATT,slotId:SLOT,requestKey:REQ});
const tiny=()=>{const b=Buffer.alloc(20);b.write('RIFF');b.writeUInt32LE(12,4);b.write('WEBP',8);b.write('VP8 ',12);return b;};
const binding=(source=Buffer.from('synthetic input'))=>({schema_version:1,actor_user_id:A,identity_id:I,attempt_id:ATT,slot_id:SLOT,
 job_id:JOB,request_key:REQ,source_object_id:SRC,web_object_id:WEB,bucket_id:C.WEB_IMAGE.bucket,
 source_path:`v1/${ATT}/${SLOT}/source.upload`,web_path:`v1/${ATT}/${SLOT}/web-v1.webp`,source_bytes:source.length,source_sha256:C.webHash(source)});
const sanitized=(source=Buffer.from('synthetic input'),buf=tiny())=>({buffer:buf,contentType:'image/webp',byteLength:buf.length,width:1,height:1,
 sha256:C.webHash(buf),sourceSha256:C.webHash(source),sourceByteLength:source.length,sourceFormat:'png',pipelineVersion:'listing-web-v1',engine:{sharp:'0.34.5',libvips:'8.17.3'}});
const intent=(src=Buffer.from('synthetic input'))=>C.detachSanitizedImage(sanitized(src),binding(src)).intent;
const receipt=(i=intent())=>({schema_version:1,receipt_id:REC,job_id:JOB,attempt_id:ATT,slot_id:SLOT,
 web_sha256:i.web_sha256,web_bytes:i.web_bytes,width:i.width,height:i.height,pipeline_version:i.pipeline_version});
const error=(code)=>e=>e instanceof C.WebImageError && e.code===code && !e.message.includes('SECRET');

async function model(options={}) {
 const source=options.source || Buffer.from('synthetic input'), b=binding(source);
 const state={phase:'none',intent:null,receipt:null,stored:null,post:0,decodes:0,requests:[],active:true,completed:false,completions:0,deleteCalls:0,deleted:false,sourceKept:true};
 let n=0;
 const server=http.createServer(async(req,res)=>{
  const data=[];for await(const chunk of req)data.push(chunk);const bytes=Buffer.concat(data);
  const entry={method:req.method,path:req.url,headers:req.headers,bytes};state.requests.push(entry);
  const json=(x,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(x));};
  const object=(buf,type)=>{if(!buf){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':type,'content-length':String(buf.length)});res.end(buf);};
  try {
   if(req.url==='/auth/v1/user') {
    assert.equal(req.headers.authorization,'Bearer SYNTHETIC_USER');assert.equal(req.headers.apikey,config.publicKey);
    if(options.authDelay)await new Promise(r=>setTimeout(r,options.authDelay));
    json({id:options.otherUser ? I : A},options.authStatus || 200);return;
   }
   assert.equal(req.headers.authorization,'Bearer '+config.serviceKey);assert.equal(req.headers.apikey,config.serviceKey);
   if(req.url.startsWith('/rest/v1/rpc/')) {
    const v=JSON.parse(bytes),name=req.url.split('/').at(-1);
    if(name==='claim_listing_cleanup_v1') {
     json(!state.active&&state.completed&&!state.deleted ? {schema_version:1,object_id:WEB,work_key:WORK,
      bucket_id:b.bucket_id,object_path:b.web_path,try_count:1,lease_until_epoch:Math.floor(Date.now()/1000)+60}:null);return;
    }
    if(name==='record_listing_cleanup_v1'){
     assert.equal(v.p_object_id,WEB);assert.equal(v.p_work_key,WORK);assert.equal(v.p_result,'deleted');
     assert.equal(state.stored,null);state.deleted=true;json({object_id:WEB,work_key:WORK,state:'deleted'});return;
    }
    assert.equal(v.p_expected_user_id,A);assert.equal(v.p_expected_identity_id,I);
    assert.equal(v.p_attempt_id,ATT);assert.equal(v.p_slot_id,SLOT);
    if(!state.active&&name!=='record_listing_web_write_completed_v1'){json({error:'SYNTHETIC_PRIVATE_DETAILS'},403);return;}
    if(name==='claim_listing_web_image_v1') {
     assert.equal(v.p_request_key,REQ);let allow=false;
     if(state.phase==='none'){state.phase='processing';allow=true;}
     const r={binding:{...b},state:state.phase,process_allowed:allow,claim_id:allow?CLAIM:null,
       process_before_epoch:Math.floor(Date.now()/1000)+120,intent:state.intent,receipt:state.receipt};
     if(options.claimMutation)options.claimMutation(r,state);
     if(options.loseClaim && n++===0){res.destroy();return;}json(r);return;
    }
    if(name==='prepare_listing_web_write_v1') {
     assert.equal(v.p_job_id,JOB);assert.equal(v.p_claim_id,CLAIM);assert.equal(state.phase,'processing');
     state.intent=v.p_intent;state.phase='prepared';if(options.onPrepared)options.onPrepared(state);
     if(options.cancelOnPrepare)state.active=false;
     if(options.losePrepare){options.losePrepare=false;res.destroy();return;}
     const r={binding:{...b},intent:state.intent,write_allowed:true,write_before_epoch:Math.floor(Date.now()/1000)+30};
     if(options.prepareMutation)options.prepareMutation(r);json(r);return;
    }
    if(name==='record_listing_web_write_completed_v1') {
     state.completions++;
     assert.equal(state.post,1);assert.equal(v.p_job_id,JOB);assert.equal(v.p_claim_id,CLAIM);
     assert.equal(v.p_web_object_id,WEB);assert.equal(v.p_storage_object_id,PROVIDER);
     assert.equal(v.p_storage_key,b.bucket_id+'/'+b.web_path);assert.equal(v.p_sent_sha256,state.intent.web_sha256);
     assert.equal(v.p_sent_bytes,state.intent.web_bytes);
     if(options.failCompletion){json({error:'synthetic'},503);return;}
     state.completed=true;
     if(options.loseCompletion){options.loseCompletion=false;res.destroy();return;}
     const r={schema_version:1,job_id:JOB,web_object_id:WEB,storage_object_id:PROVIDER,completed:true};
     if(options.completionMutation)options.completionMutation(r);json(r);return;
    }
    if(name==='record_listing_web_ready_v1') {
     assert.ok(state.stored);assert.equal(v.p_job_id,JOB);assert.equal(v.p_observed_sha256,C.webHash(state.stored));
     assert.equal(v.p_observed_sha256,state.intent.web_sha256);assert.equal(v.p_observed_bytes,state.stored.length);
     state.phase='ready';state.receipt=receipt(state.intent);
     if(options.loseRecord){options.loseRecord=false;res.destroy();return;}
     const r={receipt:{...state.receipt}};if(options.receiptMutation)options.receiptMutation(r.receipt);json(r);return;
    }
    throw Error('unexpected_rpc');
   }
   if(req.method==='DELETE'){
    assert.equal(req.url,'/storage/v1/object/'+b.bucket_id);assert.equal(state.active,false);assert.equal(state.completed,true);
    assert.deepEqual(JSON.parse(bytes),{prefixes:[b.web_path]});state.deleteCalls++;state.stored=null;
    json([{name:b.web_path}]);return;
   }
   assert.equal(req.headers['x-upsert'],req.method==='POST'?'false':undefined);
   assert.ok(!req.url.includes('?') && !req.url.includes('/public/') && !req.url.includes('/render/'));
   if(req.method==='GET' && req.url==='/storage/v1/object/authenticated/'+b.bucket_id+'/'+b.source_path) {
    assert.equal(req.headers.range,undefined);assert.equal(req.headers['accept-encoding'],'identity');
    object(options.sourceMissing?null:(options.sourceCorrupt?Buffer.alloc(source.length):source),'application/octet-stream');return;
   }
   if(req.method==='POST' && req.url==='/storage/v1/object/'+b.bucket_id+'/'+b.web_path) {
    assert.equal(state.phase,'prepared');assert.equal(req.headers['content-type'],'image/webp');state.post++;
    assert.equal(C.webHash(bytes),state.intent.web_sha256);assert.equal(bytes.length,state.intent.web_bytes);
    if(options.postStatus){json({},options.postStatus);return;}
    if(!options.dropWrite)state.stored=options.corruptWrite?Buffer.alloc(bytes.length):Buffer.from(bytes);
    if(options.cancelOnPost)state.active=false;
    if(options.loseWrite){options.loseWrite=false;res.destroy();return;}
    const ack={Id:PROVIDER,Key:b.bucket_id+'/'+b.web_path};
    if(options.ackMutation)options.ackMutation(ack);
    if(options.truncateAck){res.writeHead(200,{'content-type':'application/json'});res.write('{"Id":');setImmediate(()=>res.destroy());return;}
    json(ack);return;
   }
   if(req.method==='GET' && req.url==='/storage/v1/object/authenticated/'+b.bucket_id+'/'+b.web_path) {
    if(options.cancelOnReadback)state.active=false;
    object(state.stored,options.wrongMime?'application/octet-stream':'image/webp');return;
   }
   throw Error('unexpected_path');
  } catch(e){state.serverError=e;json({message:'test_model_assertion'},500);}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port;
 const fetcher=(url,init)=>{assert.ok(url.startsWith(origin+'/'));assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');
  return fetch(`http://127.0.0.1:${port}`+url.slice(origin.length),init);};
 const native=options.native || (async source=>sanitized(source));
 const verify=createPrivateWebVerifier(config,async source=>{state.decodes++;return native(source);},fetcher);
 const cleanup=createCleanupOne({projectOrigin:origin,serviceKey:config.serviceKey},fetcher);
 return {state,source,b,cleanup,verify:async(cmd=command(),signal)=>verify('SYNTHETIC_USER',cmd,signal),close:async()=>{
  server.closeAllConnections();await new Promise(r=>server.close(r));if(state.serverError)throw state.serverError;
 }};
}
async function using(options,fn){const m=await model(options);try{await fn(m);}finally{await m.close();}}


// NEW cases only. The transport fixture above is adapted from the prior WEB tests;
// none of that suite's test bodies or native-worker invocation are executed.
test('completion: successful POST is recorded before readback and readiness',async()=>using({},async m=>{
 const r=await m.verify();assert.equal(r.kind,'ready');assert.equal(m.state.completed,true);assert.equal(m.state.completions,1);
 const names=m.state.requests.map(x=>x.path.split('/').at(-1));
 assert.deepEqual(names,['user','claim_listing_web_image_v1','source.upload','prepare_listing_web_write_v1','web-v1.webp',
  'record_listing_web_write_completed_v1','web-v1.webp','record_listing_web_ready_v1']);
 assert.equal(m.state.post,1);assert.equal(m.state.decodes,1);
}));
test('completion: ready replay never invents a second completion or POST',async()=>using({},async m=>{
 const a=await m.verify(),b=await m.verify();assert.deepEqual(a,b);assert.equal(m.state.completions,1);assert.equal(m.state.post,1);
}));
test('completion: cancel during POST permits evidence but never readiness',async()=>using({cancelOnPost:true},async m=>{
 await assert.rejects(()=>m.verify(),error('unauthorized'));assert.equal(m.state.completed,true);assert.equal(m.state.phase,'prepared');
 assert.equal((await m.cleanup()).kind,'deleted');assert.equal(m.state.deleteCalls,1);assert.equal(m.state.sourceKept,true);
 await assert.rejects(()=>m.verify(),error('unauthorized'));assert.equal(m.state.post,1);
}));
test('completion: active WEB is never claimed despite completion',async()=>using({},async m=>{
 await m.verify();assert.equal((await m.cleanup()).kind,'idle');assert.equal(m.state.deleteCalls,0);assert.ok(m.state.stored);
}));
test('completion: acknowledged WEB deletes once after cancel, SOURCE remains',async()=>using({},async m=>{
 await m.verify();m.state.active=false;assert.equal((await m.cleanup()).kind,'deleted');assert.equal((await m.cleanup()).kind,'idle');
 assert.equal(m.state.deleteCalls,1);assert.equal(m.state.sourceKept,true);
}));
test('completion: lost POST acknowledgement may become ready but stays unsettled',async()=>using({loseWrite:true},async m=>{
 assert.equal((await m.verify()).kind,'reconcile_same_slot');assert.equal(m.state.completions,0);
 assert.equal((await m.verify()).kind,'ready');assert.equal(m.state.completed,false);assert.equal(m.state.post,1);
 m.state.active=false;assert.equal((await m.cleanup()).kind,'idle');assert.equal(m.state.deleteCalls,0);
}));
test('completion: truncated successful HTTP body is not a terminal acknowledgement',async()=>using({truncateAck:true},async m=>{
 assert.equal((await m.verify()).kind,'reconcile_same_slot');assert.equal(m.state.completed,false);assert.equal(m.state.completions,0);
 assert.equal((await m.verify()).kind,'ready');assert.equal(m.state.completions,0);assert.equal(m.state.post,1);
}));
test('completion: record rejected before persistence does not retry from readback',async()=>using({failCompletion:true},async m=>{
 assert.equal((await m.verify()).kind,'reconcile_same_slot');assert.equal(m.state.completed,false);
 assert.equal((await m.verify()).kind,'ready');assert.equal(m.state.completions,1);assert.equal(m.state.post,1);
 m.state.active=false;assert.equal((await m.cleanup()).kind,'idle');
}));
test('completion: lost receipt response after persistence does not repeat POST',async()=>using({loseCompletion:true},async m=>{
 assert.equal((await m.verify()).kind,'reconcile_same_slot');assert.equal(m.state.completed,true);
 assert.equal((await m.verify()).kind,'ready');assert.equal(m.state.completions,1);assert.equal(m.state.post,1);
 m.state.active=false;assert.equal((await m.cleanup()).kind,'deleted');
}));
for(const status of [201,202,204,400,409,500])test('completion: HTTP '+status+' never supplies completion evidence',async()=>using({postStatus:status},async m=>{
 if(status===204)await assert.rejects(()=>m.verify(),error('invalid_response'));else assert.equal((await m.verify()).kind,'reconcile_same_slot');assert.equal(m.state.completions,0);assert.equal(m.state.completed,false);
 assert.equal((await m.verify()).kind,'reconcile_same_slot');assert.equal(m.state.post,1);
}));
const badAcks={missingId:a=>delete a.Id,wrongId:a=>a.Id='not-a-uuid',missingKey:a=>delete a.Key,
 sourceKey:a=>a.Key=binding().bucket_id+'/'+binding().source_path,otherBucket:a=>a.Key='public/'+binding().web_path,
 extra:a=>a.metadata={verified:true},url:a=>a.Key=origin+'/storage/v1/object/'+a.Key};
for(const [name,mutate]of Object.entries(badAcks))test('completion: rejects POST acknowledgement '+name,async()=>using({ackMutation:mutate},async m=>{
 await assert.rejects(()=>m.verify(),error('invalid_response'));assert.equal(m.state.completions,0);assert.equal(m.state.completed,false);
 assert.equal((await m.verify()).kind,'ready');assert.equal(m.state.completions,0);assert.equal(m.state.post,1);
}));
for(const key of ['schema_version','job_id','web_object_id','storage_object_id','completed'])test('completion: rejects persisted receipt mismatch '+key,async()=>using({completionMutation:r=>r[key]=null},async m=>{
 await assert.rejects(()=>m.verify(),error('invalid_response'));assert.equal(m.state.completions,1);assert.equal(m.state.phase,'prepared');
}));
test('completion: settlement never substitutes for matching image bytes',async()=>using({corruptWrite:true},async m=>{
 await assert.rejects(()=>m.verify(),error('readback_mismatch'));assert.equal(m.state.completed,true);assert.equal(m.state.phase,'prepared');
 m.state.active=false;assert.equal((await m.cleanup()).kind,'deleted');
}));
test('completion: prepare uncertainty sends no WEB POST and no completion',async()=>using({losePrepare:true},async m=>{
 assert.equal((await m.verify()).kind,'reconcile_same_slot');assert.equal((await m.verify()).kind,'reconcile_same_slot');
 assert.equal(m.state.post,0);assert.equal(m.state.completions,0);
}));
test('completion: acknowledgement validation invokes only bound cleanup-evidence RPC',async()=>{
 const b=binding(),i=intent();let count=0;
 await recordWebWriteCompletion(async(name,args)=>{count++;assert.equal(name,'record_listing_web_write_completed_v1');
  assert.deepEqual(args,{p_expected_user_id:A,p_expected_identity_id:I,p_attempt_id:ATT,p_slot_id:SLOT,p_job_id:JOB,p_claim_id:CLAIM,
   p_web_object_id:WEB,p_storage_object_id:PROVIDER,p_storage_key:b.bucket_id+'/'+b.web_path,p_sent_sha256:i.web_sha256,p_sent_bytes:i.web_bytes});
  return {schema_version:1,job_id:JOB,web_object_id:WEB,storage_object_id:PROVIDER,completed:true};
 },{Id:PROVIDER,Key:b.bucket_id+'/'+b.web_path},b,i,CLAIM);assert.equal(count,1);
});
test('completion: direct malformed acknowledgement cannot call evidence RPC',async()=>{
 for(const ack of [null,[],{}, {Id:PROVIDER}, {Id:PROVIDER,Key:'bad'}, {Id:PROVIDER,Key:binding().bucket_id+'/'+binding().web_path,extra:1}]){
  let calls=0;await assert.rejects(()=>recordWebWriteCompletion(async()=>{calls++;},ack,binding(),intent(),CLAIM));assert.equal(calls,0);
 }
});
// The prior suite's fixture is extracted before its first test declaration.
// These three NEW checks exercise only that fixture; none of its 85 test bodies run.
for(const mode of ['acknowledged','lost-post','active-cancel'])test('completion fixture compatibility: '+mode,async()=>{
 const filename=process.env.COMPLETION_COMPAT_FIXTURE;
 assert.ok(filename&&path.isAbsolute(filename));const {model}=require(filename);
 const m=await model(mode==='lost-post'?{loseWrite:true}:{});
 try{
  const first=await m.verify();
  if(mode==='lost-post'){
   assert.equal(first.kind,'reconcile_same_slot');assert.equal((await m.verify()).kind,'ready');assert.equal(m.state.completions,0);
  }else{
   assert.equal(first.kind,'ready');assert.equal(m.state.completions,1);
   if(mode==='active-cancel'){m.state.active=false;await assert.rejects(()=>m.verify(),error('unauthorized'));}
   else assert.equal((await m.verify()).kind,'ready');
  }
  assert.equal(m.state.post,1);
 }finally{await m.close();}
});
