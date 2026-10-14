'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), http=require('node:http');
const path=require('node:path'), fs=require('node:fs');
const root=process.env.PUBLICATION_WEB_COMPILED_ROOT;
if(!root || !path.isAbsolute(root)) throw Error('new_web_compiled_root_required');
const C=require(path.join(root,'server/listing-publication/web/webImageContract.js'));
const {createPrivateWebVerifier}=require(path.join(root,'server/listing-publication/web/verifyPrivateWebImage.js'));
const {readWebObjectBytes}=require(path.join(root,'server/listing-publication/web/webObjectHttp.js'));
const {sanitizeListingImage}=require(path.join(root,'server/listing-publication/images/sanitize.cjs'));
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
 const state={phase:'none',intent:null,receipt:null,stored:null,post:0,decodes:0,requests:[],active:true,completions:0};
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
    const v=JSON.parse(bytes),name=req.url.split('/').at(-1);assert.equal(v.p_expected_user_id,A);assert.equal(v.p_expected_identity_id,I);
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
    // Updated synthetic provider/RPC fixture, not an old SQL or native-test replay.
    if(name==='record_listing_web_write_completed_v1') {
     assert.equal(state.post,1);assert.equal(v.p_job_id,JOB);assert.equal(v.p_claim_id,CLAIM);
     assert.equal(v.p_web_object_id,WEB);assert.equal(v.p_storage_object_id,'15151515-1515-1515-1515-151515151515');
     assert.equal(v.p_storage_key,b.bucket_id+'/'+b.web_path);assert.equal(v.p_sent_sha256,state.intent.web_sha256);
     assert.equal(v.p_sent_bytes,state.intent.web_bytes);state.completions++;
     json({schema_version:1,job_id:JOB,web_object_id:WEB,storage_object_id:v.p_storage_object_id,completed:true});return;
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
    if(options.loseWrite){options.loseWrite=false;res.destroy();return;}json({Id:'15151515-1515-1515-1515-151515151515',Key:b.bucket_id+'/'+b.web_path});return;
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
 return {state,source,b,verify:async(cmd=command(),signal)=>verify('SYNTHETIC_USER',cmd,signal),close:async()=>{
  server.closeAllConnections();await new Promise(r=>server.close(r));if(state.serverError)throw state.serverError;
 }};
}
async function using(options,fn){const m=await model(options);try{await fn(m);}finally{await m.close();}}

test('model: full source -> detached web -> acknowledged intent -> POST -> full GET -> ready',async()=>using({},async m=>{
 const r=await m.verify();assert.equal(r.kind,'ready');assert.deepEqual(r.receipt,receipt());assert.equal(m.state.post,1);assert.equal(m.state.decodes,1);
 assert.deepEqual(m.state.requests.map(x=>x.path.split('/').at(-1)),['user','claim_listing_web_image_v1','source.upload','prepare_listing_web_write_v1','web-v1.webp','record_listing_web_write_completed_v1','web-v1.webp','record_listing_web_ready_v1']);
 assert.ok(!JSON.stringify(r).includes(config.serviceKey));assert.ok(!JSON.stringify(r).includes('source_path'));
}));
test('model: same ready receipt replays without source/decode/write',async()=>using({},async m=>{
 const first=await m.verify(),second=await m.verify();assert.deepEqual(second,first);assert.equal(m.state.post,1);assert.equal(m.state.decodes,1);
}));
for(const field of ['loseClaim','losePrepare','loseWrite','loseRecord'])test('model: '+field+' never automatically repeats native or POST',async()=>using({[field]:true},async m=>{
 assert.equal((await m.verify()).kind,'reconcile_same_slot');const next=await m.verify();
 const ready=['loseWrite','loseRecord'].includes(field);assert.equal(next.kind,ready?'ready':'reconcile_same_slot');
 assert.equal(m.state.post,ready?1:0);assert.equal(m.state.decodes,field==='loseClaim'?0:1);
}));
for(const status of [400,409,503])test('model: POST '+status+' retains intent and never overwrites on explicit retry',async()=>using({postStatus:status},async m=>{
 assert.equal((await m.verify()).kind,'reconcile_same_slot');assert.equal((await m.verify()).kind,'reconcile_same_slot');assert.equal(m.state.post,1);
}));
test('model: acknowledged write but missing object is not ready and causes no resend',async()=>using({dropWrite:true},async m=>{
 assert.equal((await m.verify()).kind,'reconcile_same_slot');assert.equal((await m.verify()).kind,'reconcile_same_slot');assert.equal(m.state.post,1);assert.equal(m.state.receipt,null);
}));
test('model: changed WEB bytes fail readback and never produce receipt',async()=>using({corruptWrite:true},async m=>{
 await assert.rejects(m.verify(),error('readback_mismatch'));assert.equal(m.state.receipt,null);await assert.rejects(m.verify(),error('readback_mismatch'));assert.equal(m.state.post,1);
}));
test('model: wrong WEB MIME is not ready',async()=>using({wrongMime:true},async m=>{await assert.rejects(m.verify(),error('invalid_response'));assert.equal(m.state.receipt,null);}));
test('model: source digest mismatch prevents decoder and write',async()=>using({sourceCorrupt:true},async m=>{await assert.rejects(m.verify(),error('source_mismatch'));assert.equal(m.state.decodes,0);assert.equal(m.state.post,0);}));
test('model: missing source retains same uncertain slot without decode',async()=>using({sourceMissing:true},async m=>{assert.equal((await m.verify()).kind,'reconcile_same_slot');assert.equal(m.state.decodes,0);}));
test('model: cancellation during readback prevents ready receipt',async()=>using({cancelOnReadback:true},async m=>{await assert.rejects(m.verify(),error('unauthorized'));assert.equal(m.state.receipt,null);assert.equal(m.state.post,1);}));
test('model: late WEB write after cancellation stays linked but cannot become ready',async()=>using({cancelOnPrepare:true},async m=>{await assert.rejects(m.verify(),error('unauthorized'));assert.equal(m.state.post,1);assert.ok(m.state.intent);assert.equal(m.state.receipt,null);}));
for(const [name,options,code] of [['wrong Auth actor',{otherUser:true},'context_changed'],['Auth403',{authStatus:403},'unauthorized'],
 ['native reject',{native:async()=>{throw Error('EXIF_SECRET');}},'image_rejected']])test('model: '+name+' is fixed-code failure',async()=>using(options,async m=>{await assert.rejects(m.verify(),error(code));assert.equal(m.state.post,0);}));
test('model: caller command mutation across Auth await cannot redirect',async()=>using({authDelay:20},async m=>{const cmd=command();const p=m.verify(cmd);cmd.slotId=A;assert.equal((await p).kind,'ready');}));
test('model: native output mutation during DB await cannot change sent bytes',async()=>{
 let output;await using({native:async s=>(output=sanitized(s)),onPrepared:()=>output.buffer.fill(0)},async m=>{assert.equal((await m.verify()).kind,'ready');assert.deepEqual(m.state.stored,tiny());});
});
test('model: pre-aborted request performs no network operation',async()=>using({},async m=>{const ac=new AbortController();ac.abort();await assert.rejects(m.verify(command(),ac.signal),error('aborted'));assert.equal(m.state.requests.length,0);}));
test('model: cross-factory process busy bound rejects concurrent binary work',async()=>using({authDelay:30},async m=>{
 const first=m.verify();await assert.rejects(m.verify(),error('busy'));assert.equal((await first).kind,'ready');assert.equal(m.state.decodes,1);
}));
const claimMutations={wrongPath:r=>r.binding.web_path='../escape',publicBucket:r=>r.binding.bucket_id='listing-images',
 wrongActor:r=>r.binding.actor_user_id=I,extraBinding:r=>r.binding.unsafe=true,badSize:r=>r.binding.source_bytes=26214401,
 badHash:r=>r.binding.source_sha256='x',sameObject:r=>r.binding.web_object_id=r.binding.source_object_id,
 lostClaimId:r=>r.claim_id=null,badProcessFlag:r=>r.process_allowed='true',expired:r=>r.process_before_epoch=1,
 future:r=>r.process_before_epoch=9999999999,processingIntent:r=>r.intent={},falseReceipt:r=>r.receipt={}};
for(const [name,mutation] of Object.entries(claimMutations))test('contract: claim '+name+' fails before source/write',async()=>using({claimMutation:mutation},async m=>{
 await assert.rejects(m.verify(),e=>e instanceof C.WebImageError);assert.equal(m.state.decodes,0);assert.equal(m.state.post,0);
}));
for(const [name,mutation] of Object.entries({wrongBinding:r=>r.binding.job_id=A,changedIntent:r=>r.intent.width=200,
 badFlag:r=>r.write_allowed=1,expired:r=>r.write_before_epoch=1,farFuture:r=>r.write_before_epoch=9999999999}))
 test('contract: prepare '+name+' fails before POST',async()=>using({prepareMutation:mutation},async m=>{await assert.rejects(m.verify(),e=>e instanceof C.WebImageError);assert.equal(m.state.post,0);}));
test('contract: mismatched ready receipt cannot be reported as success',async()=>using({receiptMutation:r=>r.web_sha256='0'.repeat(64)},async m=>{await assert.rejects(m.verify(),error('invalid_response'));}));
for(const [name,mutate] of Object.entries({extra:r=>r.url='https://evil.invalid',blank:r=>r.requestKey='',zero:r=>r.requestKey='00000000-0000-0000-0000-000000000000',wrongCase:r=>r.slotId=SLOT.toUpperCase()}))
 test('contract: command '+name,()=>{const r=command();mutate(r);assert.throws(()=>C.copyWebCommand(r),error('invalid_input'));});
test('contract: accessor command is not evaluated',()=>{const r=command();Object.defineProperty(r,'requestKey',{enumerable:true,get(){throw Error('called');}});assert.throws(()=>C.copyWebCommand(r),error('invalid_input'));});
for(const host of ['http://abcdefghijklmnopqrst.supabase.co','https://evil.invalid','https://abcdefghijklmnopqrst.supabase.co/x','https://abcdefghijklmnopqrst.supabase.co:443','https://a@abcdefghijklmnopqrst.supabase.co'])
 test('contract: fixed deployment origin rejects '+host,()=>assert.throws(()=>createPrivateWebVerifier({...config,projectOrigin:host},async()=>{}),error('configuration')));
for(const [name,mutate] of Object.entries({digest:r=>r.sha256='0'.repeat(64),sourceDigest:r=>r.sourceSha256='0'.repeat(64),size:r=>r.byteLength++,width:r=>r.width=2049,
 type:r=>r.contentType='image/jpeg',version:r=>r.pipelineVersion='v2',format:r=>r.sourceFormat='svg',engine:r=>r.engine.sharp='anything',container:r=>r.buffer[0]=0}))
 test('contract: detached output rejects '+name,()=>{const r=sanitized();mutate(r);assert.throws(()=>C.detachSanitizedImage(r,binding()),error('invalid_response'));});
test('contract: returned buffer copy is isolated from mutable sanitizer Buffer',()=>{const r=sanitized(),d=C.detachSanitizedImage(r,binding());r.buffer.fill(0);assert.equal(C.webHash(d.bytes),d.intent.web_sha256);});

const get=(response,signal,limit=20,timeout=200)=>readWebObjectBytes(async()=>response,'https://model.invalid/object',{},limit,'image/webp',signal,timeout);
for(const [name,response] of [
 ['oversized_header',()=>new Response(tiny(),{headers:{'content-length':'21','content-type':'image/webp'}})],
 ['oversized_stream',()=>new Response(Buffer.alloc(21),{headers:{'content-type':'image/webp'}})],
 ['short_body',()=>new Response(Buffer.alloc(19),{headers:{'content-length':'20','content-type':'image/webp'}})],
 ['encoded',()=>new Response(tiny(),{headers:{'content-encoding':'gzip','content-type':'image/webp'}})],
 ['wrong_type',()=>new Response(tiny(),{headers:{'content-type':'image/png'}})],
 ['range_header',()=>new Response(tiny(),{headers:{'content-range':'bytes 0-19/20','content-type':'image/webp'}})],
 ['zero_body',()=>new Response(Buffer.alloc(0),{headers:{'content-type':'image/webp'}})],
 ['malformed_length',()=>new Response(tiny(),{headers:{'content-length':'+20','content-type':'image/webp'}})]])
 test('binary: rejects '+name,async()=>assert.rejects(get(response()),error('invalid_response')));
test('binary: full unencoded bytes are owned and returned',async()=>assert.deepEqual(await get(new Response(tiny(),{headers:{'content-type':'image/webp'}})),tiny()));
test('binary: 404 is only absence observation, not settlement',async()=>assert.equal(await get(new Response(null,{status:404})),null));
for(const status of [206,304,500])test('binary: status '+status+' is not full byte proof',async()=>assert.rejects(get(new Response(null,{status})),error('outcome_unknown')));
test('binary: deadline bounds a fetch that ignores AbortSignal',async()=>{const t=Date.now();await assert.rejects(readWebObjectBytes(()=>new Promise(()=>{}),'https://model.invalid',{},20,null,undefined,15),error('outcome_unknown'));assert.ok(Date.now()-t<1000);});
test('binary: deadline bounds a response body that never completes',async()=>{const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array([1]));}});await assert.rejects(get(new Response(stream,{headers:{'content-type':'image/webp'}}),undefined,20,15),error('outcome_unknown'));});
test('binary: explicit abort is propagated without raw error text',async()=>{const ac=new AbortController();const p=readWebObjectBytes(()=>new Promise(()=>{}),'https://model.invalid',{},20,null,ac.signal,200);ac.abort();await assert.rejects(p,error('aborted'));});

const fixtures=path.resolve(__dirname,'fixtures/listing-publication-images-v1');
for(const file of ['orientation-gps.jpg','alpha.png','still.webp'])test('native integration: actual existing worker -> HTTP WEB readback -> receipt: '+file,async()=>{
 const source=fs.readFileSync(path.join(fixtures,file));
 await using({source,native:sanitizeListingImage},async m=>{
  const r=await m.verify();assert.equal(r.kind,'ready');assert.equal(m.state.post,1);assert.equal(m.state.decodes,1);
  assert.equal(r.receipt.web_sha256,C.webHash(m.state.stored));assert.equal(r.receipt.web_bytes,m.state.stored.length);
  const meta=await require('sharp')(m.state.stored).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,r.receipt.width);assert.equal(meta.height,r.receipt.height);
  for(const key of ['exif','icc','iptc','xmp','orientation'])assert.equal(meta[key],undefined);
  assert.deepEqual((await m.verify()).receipt,r.receipt);assert.equal(m.state.decodes,1);
 });
});
test('native integration: actual worker rejects animated source without WEB write',async()=>using({source:fs.readFileSync(path.join(fixtures,'animated.webp')),native:sanitizeListingImage},async m=>{
 await assert.rejects(m.verify(),error('image_rejected'));assert.equal(m.state.post,0);assert.equal(m.state.receipt,null);
}));
test('dormant bridge: imports existing sanitizer and server-only; no route activation in this package',()=>{
 const p=path.join(process.env.PUBLICATION_WEB_SOURCE_ROOT,'src/server/listing-publication/web/supabaseWebVerifier.ts');const s=fs.readFileSync(p,'utf8');
 assert.match(s,/import "server-only"/);assert.match(s,/import \{ sanitizeListingImage \} from "\.\.\/images\/sanitize\.cjs"/);assert.ok(!s.includes('export const POST'));
});

for(const code of ['image_processor_unavailable','image_processing_timeout']) test('native infrastructure '+code+' is pending, not bad photo',async()=>{
 const {PublicationImageError}=require(path.join(root,'server/listing-publication/images/sanitize.cjs'));
 await using({native:async()=>{throw new PublicationImageError(code);}},async m=>{
  assert.equal((await m.verify()).kind,'reconcile_same_slot');
  assert.equal((await m.verify()).kind,'reconcile_same_slot');
  assert.equal(m.state.decodes,1);assert.equal(m.state.post,0);
 });
});
