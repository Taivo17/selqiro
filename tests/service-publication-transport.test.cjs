'use strict';
// Real request handler, HTTP bounding, receipt parsers and private-byte/media
// workers. Synthetic fetch endpoints replace remote database/auth/storage only.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const {createHash}=require('node:crypto');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{
 fileName:filename,compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);
const {createServicePublicationRequestHandler}=require('../src/server/service-publication/createServicePublicationHandler.ts');
const {createServiceMediaHandler}=require('../src/server/service-publication/serveServiceMedia.ts');
const {createManagedMediaHandler}=require('../src/server/listing-publication/final/serveListingMedia.ts');
const {createServiceCleanupPass}=require('../src/server/service-publication/settleServiceCleanup.ts');
const U='11000000-0000-4000-8000-000000000001',I='12000000-0000-4000-8000-000000000002',R='13000000-0000-4000-8000-000000000003';
const A='14000000-0000-4000-8000-000000000004',SLOT='15000000-0000-4000-8000-000000000005',F='16000000-0000-4000-8000-000000000006';
const S='17000000-0000-4000-8000-000000000007',E='18000000-0000-4000-8000-000000000008',RUN='19000000-0000-4000-8000-000000000009';
const APP='http://127.0.0.1:3100',API='https://abcdefghijklmnopqrst.supabase.co',HASH='ab'.repeat(32),TIME='2026-11-08T12:34:56.123456Z';
const config={appOrigin:APP,projectOrigin:API,publicKey:'public-key',serviceKey:'service-key',runId:RUN};
const actor={expectedUserId:U,expectedIdentityId:I},scope={...actor,attemptId:A,requestKey:R};
const content={serviceId:null,title:'Repair service',description:'Service details',category:'vehicle_machinery',subcategory:null,
 priceType:'fixed',priceAmount:25.5,currency:'EUR',country:'Estonia',city:'Paide',location:null};
const prepare={...actor,requestKey:R,serviceId:null,expectedRevision:null,content,
 gallery:[{clientFileId:F,byteLength:123,sha256:HASH,isPrimary:true}],policySnapshot:[{documentId:E,version:'1',contentHash:HASH,accepted:true}]};
const slot={slot_id:SLOT,client_file_id:F,ordinal:0,expected_bytes:123,expected_sha256:HASH};
const receipt=(patch={})=>({schema_version:1,content_type:'service',state:'prepared',actor_user_id:U,identity_id:I,request_key:R,
 attempt_id:A,service_id:S,edit_revision:'1',publication_event_id:null,slots:[slot],...patch});
const owner=(patch={})=>({schema_version:1,content_type:'service',actor_user_id:U,identity_id:I,service_id:S,edit_revision:'5',status:'published',
 content:{...content,serviceId:S,priceAmount:'25.50'},images:[{id:F,url:`/api/v2/service-owner-media/${A}/0`,is_primary:true,sort_order:0}],
 policy_snapshot:[{document_id:E,version:'1',content_hash:HASH}],created_at:TIME,updated_at:TIME,published_at:TIME,sort_order:0,...patch});
const request=(body,headers={})=>new Request(APP+'/api/v2/service-publication/prepare',{method:'POST',headers:{host:new URL(APP).host,
 origin:APP,authorization:'Bearer user-token','content-type':'application/json',...headers},body:JSON.stringify(body)});
const noImages={prepare:async()=>{throw Error('unexpected image transfer')},verify:async()=>{throw Error('unexpected image transfer')}};
function setup(result,images=noImages,after){
 const calls=[];
 const fetcher=async(url,init)=>{calls.push({url,args:init.body?JSON.parse(init.body):null});assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');
  if(url.endsWith('/assert_selqiro_disposable_v2'))return Response.json({scope:'disposable-v2',run_id:RUN});
  assert.equal(init.headers.get('authorization'),'Bearer user-token');return typeof result==='function'?result(url,init):Response.json(result);};
 return {calls,handle:createServicePublicationRequestHandler(config,images,fetcher,after)};
}
test('prepare binds only canonical service content and a single accepted general policy',async()=>{
 const f=setup(receipt()),r=await f.handle(request(prepare),'prepare');assert.equal(r.status,200);assert.deepEqual(await r.json(),receipt());
 assert.deepEqual(f.calls[1].args,{p_expected_user_id:U,p_expected_identity_id:I,p_request_key:R,p_service_id:null,p_expected_revision:null,
  p_content:content,p_gallery:prepare.gallery,p_policy_snapshot:prepare.policySnapshot});assert.match(f.calls[1].url,/\/prepare_my_service_publication_v1$/);
 assert.equal(f.calls.some(c=>/listing|horse/.test(c.url)),false);assert.match(r.headers.get('cache-control'),/private, no-store/);
});
test('nullable legacy edit tuples reach the revision-checked SQL boundary but cannot create incomplete services',async()=>{
 for(const priceType of ['fixed','from','hourly']){
  const legacy={...content,serviceId:S,category:null,subcategory:null,priceType,priceAmount:null};
  const edit={...prepare,serviceId:S,expectedRevision:'2',content:legacy},f=setup(receipt());
  assert.equal((await f.handle(request(edit),'prepare')).status,200);
  assert.equal(f.calls[1].args.p_expected_revision,'2');assert.deepEqual(f.calls[1].args.p_content,legacy);
  const create=setup(receipt());assert.notEqual((await create.handle(request({...prepare,content:{...legacy,serviceId:null}}),'prepare')).status,200);
  assert.equal(create.calls.length,0);
 }
});
test('extra domain fields, stale revision formats, unaccepted policy and unbound origins make zero remote calls',async()=>{
 const invalid=[{...prepare,horseOfferId:S},{...prepare,confirmations:{}},{...prepare,content:{...content,image_url:'https://evil.invalid/a'}},
  {...prepare,serviceId:S,expectedRevision:'0',content:{...content,serviceId:S}}, {...prepare,policySnapshot:[]},
  {...prepare,policySnapshot:[{...prepare.policySnapshot[0],accepted:false}]}, {...prepare,content:{...content,priceAmount:1.234}},
  {...scope,attemptId:null}];
 for(const body of invalid){const f=setup(receipt());assert.notEqual((await f.handle(request(body),Object.hasOwn(body,'attemptId')?'publish':'prepare')).status,200);assert.equal(f.calls.length,0);}
 for(const headers of [{origin:'https://another.invalid'},{host:'another.invalid'},{authorization:''},{'content-type':'text/plain'}]){
  const f=setup(receipt());assert.notEqual((await f.handle(request(prepare,headers),'prepare')).status,200);assert.equal(f.calls.length,0);}
 for(const action of ['save-draft','owner-renew','listing-publish','horse-publication']){const f=setup(receipt());assert.equal((await f.handle(request(prepare),action)).status,404);assert.equal(f.calls.length,0);}
});
test('bounded body rejects oversized or malformed UTF-8 JSON without remote work',async()=>{
 for(const body of [new Uint8Array([123,34,97,34,58,34,255,34,125]),new TextEncoder().encode(JSON.stringify({...prepare,padding:'x'.repeat(131073)}))]){
  const f=setup(receipt()),r=new Request(APP+'/api/v2/service-publication/prepare',{method:'POST',headers:{host:new URL(APP).host,origin:APP,authorization:'Bearer user-token','content-type':'application/json'},body});
  assert.equal((await f.handle(r,'prepare')).status,409);assert.equal(f.calls.length,0);}
});
test('a 200 with foreign domain, actor, request, policy-bound attempt or bytes is never a commit receipt',async()=>{
 for(const bad of [receipt({content_type:'listing'}),receipt({content_type:'horse_offer'}),receipt({actor_user_id:F}),receipt({request_key:F}),
  receipt({slots:[{...slot,expected_sha256:'cd'.repeat(32)}]}),receipt({slots:[]}),receipt({private_path:'never forward'})]){
  const r=await setup(bad).handle(request(prepare),'prepare');assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'outcome_unknown'});}
});
test('lost prepare status uses exact request key without any replay',async()=>{
 const notFound=receipt({state:'not_found',attempt_id:null,service_id:null,edit_revision:null,publication_event_id:null,slots:[]}),f=setup(notFound);
 const r=await f.handle(request({...scope,attemptId:null}),'status');assert.equal(r.status,200);assert.deepEqual(await r.json(),notFound);
 assert.match(f.calls[1].url,/\/get_my_service_publication_attempt_v1$/);assert.equal(f.calls[1].args.p_attempt_id,null);assert.equal(f.calls.length,2);
});
test('image capability follows authenticated service/slot/client-file binding only',async()=>{
 const image={...actor,attemptId:A,slotId:SLOT,requestKey:F},bound={schema_version:1,content_type:'service',actor_user_id:U,identity_id:I,attempt_id:A,
  slot_id:SLOT,client_file_id:F,expected_bytes:123,expected_sha256:HASH};let count=0;
 const images={...noImages,prepare:async(token,command)=>{count++;assert.equal(token,'user-token');assert.deepEqual(command,image);return{kind:'pending'}}};
 const good=setup(bound,images);assert.equal((await good.handle(request(image),'image-prepare')).status,200);assert.equal(count,1);assert.match(good.calls[1].url,/get_my_service_publication_image_binding_v1$/);
 for(const bad of [{...bound,content_type:'horse_offer'},{...bound,identity_id:F},{...bound,client_file_id:R},{...bound,expected_bytes:26214401},null])
  assert.equal((await setup(bad,images).handle(request(image),'image-prepare')).status,503);
 assert.equal(count,1);
});
test('publish schedules cleanup only after exact event-bound commit and never blocks its ACK',async()=>{
 const jobs=[],published=receipt({state:'published',publication_event_id:E,edit_revision:'3'}),good=setup(published,noImages,work=>jobs.push(work));
 assert.equal((await good.handle(request(scope),'publish')).status,200);assert.equal(jobs.length,1);assert.equal(good.calls.length,2);
 for(const bad of [receipt(),{...published,publication_event_id:null},{...published,identity_id:F},{...published,attempt_id:F}])
  assert.equal((await setup(bad,noImages,work=>jobs.push(work)).handle(request(scope),'publish')).status,503);
 assert.equal(jobs.length,1);
});
test('owner read parses canonical content, typed gallery and revision, including private paused services',async()=>{
 for(const status of ['published','archived','draft']){const wire=owner({status}),f=setup(wire),r=await f.handle(request({...actor,serviceId:S}),'owner-read');
  assert.equal(r.status,200);assert.deepEqual(await r.json(),wire);assert.match(f.calls[1].url,/get_my_service_publication_snapshot_v1$/);}
 for(const bad of [owner({actor_user_id:F}),owner({service_id:F}),owner({edit_revision:'0'}),owner({private_token:'notreturned'}),owner({images:[{id:F,url:'/api/v2/horse-owner-media/'+A+'/0',is_primary:true,sort_order:0}]})]){
  const r=await setup(bad).handle(request({...actor,serviceId:S}),'owner-read');assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'outcome_unknown'});}
 assert.equal((await setup(null).handle(request({...actor,serviceId:S}),'owner-read')).status,200);
});
test('owner list preserves hundreds of services with explicit authoritative pagination',async()=>{
 const wire={schema_version:1,actor_user_id:U,identity_id:I,items:[owner()],total_count:'301',result_limit:1,result_offset:200,has_more:true,next_offset:201};
 const f=setup(wire),r=await f.handle(request({...actor,resultLimit:1,resultOffset:200}),'owner-list');assert.equal(r.status,200);assert.deepEqual(await r.json(),wire);
 assert.deepEqual(f.calls[1].args,{p_expected_user_id:U,p_expected_identity_id:I,p_result_limit:1,p_result_offset:200});
 for(const bad of [{...wire,next_offset:200},{...wire,has_more:false,next_offset:null},{...wire,result_offset:0},{...wire,identity_id:F}])
  assert.equal((await setup(bad).handle(request({...actor,resultLimit:1,resultOffset:200}),'owner-list')).status,503);
});
test('pause/reactivate confirms exact status/revision without publication or expiry changes',async()=>{
 const cmd={...actor,serviceId:S,expectedRevision:'5',expectedStatus:'published',status:'archived'};
 const valid={schema_version:1,content_type:'service',actor_user_id:U,identity_id:I,service_id:S,edit_revision:'6',status:'archived',changed:true};
 const jobs=[],f=setup(valid,noImages,work=>jobs.push(work));assert.equal((await f.handle(request(cmd),'owner-set-status')).status,200);
 assert.deepEqual(f.calls[1].args,{p_expected_user_id:U,p_expected_identity_id:I,p_service_id:S,p_expected_revision:'5',p_expected_status:'published',p_status:'archived'});
 assert.match(f.calls[1].url,/set_my_service_activity_v1$/);assert.equal(jobs.length,0);
 for(const bad of [{...valid,status:'published'},{...valid,changed:false},{...valid,edit_revision:'7'},{...valid,active_until:TIME}])
  assert.equal((await setup(bad).handle(request(cmd),'owner-set-status')).status,503);
 for(const status of ['draft','active','paused','sold']){const h=setup(valid);assert.notEqual((await h.handle(request({...cmd,status}),'owner-set-status')).status,200);assert.equal(h.calls.length,0);}
});
test('safe failures expose bounded codes; uncertain writes are never repeated or treated as rollback',async()=>{
 for(const [failure,code,expected] of [[{code:'40001',message:'private context'},409,{error:'conflict',code:'40001',message:'service_edit_conflict'}],
  [{code:'42501',message:'publication_policy_changed'},409,{error:'policy_changed',code:'42501',message:'publication_policy_changed'}],
  [{code:'42501',message:'private context'},403,{error:'context_changed',code:'42501'}],
  [{code:'XX000',message:'secret-token',details:'private-path'},503,{error:'outcome_unknown'}]]){
  const f=setup(()=>Response.json(failure,{status:500})),r=await f.handle(request(scope),'publish');assert.equal(r.status,code);assert.deepEqual(await r.json(),expected);assert.equal(f.calls.length,2);}
});
const bytes=Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA','base64');
const media={schema_version:1,attempt_id:A,ordinal:0,bucket_id:'listing-publication-private',object_path:`v1/${A}/${SLOT}/web-v1.webp`,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
test('service media and existing listing/horse public+owner branches retain exact bytes and post-read revocation',async()=>{
 const domains={listing:['get_public_listing_media_binding_v1','get_my_listing_media_binding_v2'],horse_offer:['get_public_horse_media_binding_v1','get_my_horse_media_binding_v1'],service:['get_public_service_media_binding_v1','get_my_service_media_binding_v1']};
 for(const [kind,names] of Object.entries(domains))for(const own of [false,true])for(const mode of ['valid','bad-hash','revoked']){
  let reads=0;const calls=[];const bindingName=names[own?1:0];const fetcher=async(url,init)=>{calls.push(url);
   if(url.endsWith('/'+bindingName)){assert.equal(init.headers.get('authorization'),own?'Bearer owner-token':'Bearer service-key');
    assert.deepEqual(JSON.parse(init.body),{p_attempt_id:A,p_ordinal:0,...own?{p_expected_user_id:U,p_expected_identity_id:I}:{}});
    reads++;return Response.json(mode==='revoked'&&reads===2?null:media);}
   assert.equal(url,API+'/storage/v1/object/authenticated/'+media.bucket_id+'/'+media.object_path);assert.equal(init.headers.get('authorization'),'Bearer service-key');
   return new Response(mode==='bad-hash'?Buffer.alloc(bytes.length):bytes,{headers:{'content-type':'image/webp'}});
  };
  const owner=own?{userId:U,identityId:I,accessToken:'owner-token',publicKey:'public-key'}:undefined;
  const handler=kind==='service'?createServiceMediaHandler(config,fetcher,owner):createManagedMediaHandler(kind,config,fetcher,owner);
  const r=await handler(A,'0');assert.equal(r.status,mode==='valid'?200:mode==='revoked'?404:503,kind+'/'+own+'/'+mode);
  if(mode==='valid')assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);
  assert.ok(calls[0].endsWith('/'+bindingName));assert.ok(calls.every(url=>!url.includes('/get_')||url.endsWith('/'+bindingName)));
  assert.match(r.headers.get('cache-control'),/no-store/);
 }
 assert.throws(()=>createManagedMediaHandler('unknown',config,async()=>{throw Error('must not fallback')}));
});
test('service media rejects paths, source objects and ordinal confusion before bytes can be read',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return Response.json(media)};const handler=createServiceMediaHandler(config,fetcher);
 for(const [attempt,ordinal] of [[A,'10'],[A,'00'],[A,'-1'],['../'+A,'0'],[A,'0?token=x']])assert.equal((await handler(attempt,ordinal)).status,404);
 assert.equal(calls,0);
 const source=createServiceMediaHandler(config,async()=>{calls++;return Response.json({...media,object_path:`v1/${A}/${SLOT}/source.upload`})});
 assert.equal((await source(A,'0')).status,503);assert.equal(calls,1);
});
test('service cleanup authenticates its exact lineage and uses its own claim/record authority',async()=>{
 const calls=[];const fetcher=async(url,init)=>{calls.push({url,args:init.body?JSON.parse(init.body):null});
  if(url.endsWith('/auth/v1/user'))return Response.json({id:U});
  assert.ok(url.endsWith('/claim_service_publication_cleanup_v1'));assert.equal(init.headers.get('authorization'),'Bearer service-key');
  assert.deepEqual(JSON.parse(init.body),{p_expected_user_id:U,p_expected_identity_id:I,p_attempt_id:A,p_request_key:R});
  return Response.json(null);
 };
 await createServiceCleanupPass(config,fetcher)('owner-token',{...actor,attemptId:A,requestKey:R});assert.equal(calls.length,2);
 const before=calls.length;await createServiceCleanupPass(config,fetcher)('owner-token',{...actor,attemptId:A,requestKey:'invalid'});assert.equal(calls.length,before);
});

test('a full 50-service page above 64KiB passes only the dedicated bounded owner read transport',async()=>{
 const items=Array.from({length:50},(_,n)=>{const id=`aaaaaaaa-aaaa-4aaa-8aaa-${String(n+1).padStart(12,'0')}`;
  return owner({service_id:id,content:{...content,serviceId:id,priceAmount:'25.50',description:'x'.repeat(5000)},images:[]});});
 const wire={schema_version:1,actor_user_id:U,identity_id:I,items,total_count:'501',result_limit:50,result_offset:0,has_more:true,next_offset:50};
 assert.ok(Buffer.byteLength(JSON.stringify(wire))>65536);const f=setup(wire),r=await f.handle(request({...actor,resultLimit:50,resultOffset:0}),'owner-list');
 assert.equal(r.status,200);assert.equal((await r.json()).items.length,50);
 const tooMany=setup(wire);assert.notEqual((await tooMany.handle(request({...actor,resultLimit:51,resultOffset:0}),'owner-list')).status,200);assert.equal(tooMany.calls.length,0);
});
test('owner-page large-envelope support does not loosen command or image grant limits',async()=>{
 const {serviceOwnerPageHttp}=require('../src/entities/service/api/serviceOwnerPageHttp.ts');
 const {privateUploadHttp}=require('../src/entities/listing/api/privateUploadHttp.ts');
 const data={value:'x'.repeat(70000)},fetcher=async()=>Response.json(data);
 assert.deepEqual((await serviceOwnerPageHttp(fetcher,API+'/rest/v1/rpc/read',{method:'POST',body:'{}'})).json,data);
 await assert.rejects(()=>privateUploadHttp(fetcher,API+'/rest/v1/rpc/write',{method:'POST',body:'{}'},{responseBytes:70001}));
 await assert.rejects(()=>serviceOwnerPageHttp(async()=>Response.json({value:'x'.repeat(4*1024*1024)}),API+'/rest/v1/rpc/read',{method:'POST',body:'{}'}));
 const controller=new AbortController();controller.abort();let requests=0;
 await assert.rejects(()=>serviceOwnerPageHttp(async()=>{requests++;return Response.json({})},API+'/rest/v1/rpc/read',{method:'POST',body:'{}'},{signal:controller.signal}));assert.equal(requests,0);
});
