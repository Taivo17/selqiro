'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path');
const root=process.env.PUBLICATION_NO_RELEASE_COMPILED_ROOT;
if(!root||!path.isAbsolute(root))throw Error('compiled_root_required');
const {createSettleUnreleasedSourceOne}=require(path.join(root,'server/listing-publication/final/settleUnreleasedSourceOne.js'));
const {createPrivateUploadIssuer}=require(path.join(root,'server/listing-publication/uploads/issuePrivateUpload.js'));
const {createCleanupOne}=require(path.join(root,'server/listing-publication/final/cleanupOne.js'));
const uid=n=>`${n}`.repeat(8)+'-'+`${n}`.repeat(4)+'-'+`${n}`.repeat(4)+'-'+`${n}`.repeat(4)+'-'+`${n}`.repeat(12);
const [U,I,A,S,O,G,C,D,W]=[1,2,3,4,5,6,7,8,9].map(uid);
const origin='https://abcdefghijklmnopqrst.supabase.co',config={projectOrigin:origin,serviceKey:'SYNTHETIC_SERVICE_KEY',publicKey:'SYNTHETIC_PUBLIC_KEY'};
const command={expectedUserId:U,expectedIdentityId:I,attemptId:A,slotId:S,dispatchKey:D};
const binding={schema_version:1,actor_user_id:U,identity_id:I,attempt_id:A,slot_id:S,object_id:O,dispatch_key:D,grant_id:G,
 bucket_id:'listing-publication-private',object_path:`v1/${A}/${S}/source.upload`,expected_bytes:100,expected_sha256:'a'.repeat(64)};
const receipt=()=>({schema_version:1,object_id:O,grant_id:G,claim_id:C,proof:'source_signing_never_released',state:'settled'});
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function model(o={}){
 const s={requests:[],closed:o.closed??true,grant:o.grant??'signing',sealed:false,deleted:false,signs:0,records:0,gets:0,token:null};
 const reached=defer(),resume=defer();let error;const epoch=Math.floor(Date.now()/1000);
 const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({url:binding.bucket_id+'/'+binding.object_path,upsert:false,iat:epoch,exp:epoch+7200})).toString('base64url')+'.syntheticSignature';
 const server=http.createServer(async(req,res)=>{try{
  let body='';for await(const b of req)body+=b;assert.ok(body.length<16384);
  const p=req.url;s.requests.push({path:p,method:req.method,body});
  const json=(v,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(v));};
  if(p==='/rest/v1/rpc/settle_unreleased_listing_source_one_v1'){
   assert.equal(req.headers.authorization,'Bearer '+config.serviceKey);assert.equal(req.method,'POST');assert.equal(body,'{}');
   if(o.status){json({message:'PRIVATE_MUST_NOT_LEAK'},o.status);return;}
   let v=null;if(s.closed&&s.grant==='signing'&&!s.sealed){s.sealed=true;v=receipt();}
   if(v&&o.mutate)o.mutate(v);if(o.loseAck){res.destroy();return;}
   if(o.badJson){res.writeHead(200);res.end('PRIVATE_MUST_NOT_LEAK');return;}
   if(o.redirect){res.writeHead(307,{location:'https://outside.invalid/'});res.end();return;}
   json(v);return;
  }
  if(p==='/auth/v1/user'){assert.equal(req.headers.authorization,'Bearer USER_ACCESS');json({id:o.otherActor?W:U});return;}
  if(p==='/rest/v1/rpc/reserve_my_listing_upload_v1'){json({binding});return;}
  if(p==='/rest/v1/rpc/claim_listing_upload_sign_v1'){
   const allowed=s.grant==='reserved';if(allowed)s.grant='signing';json({binding,sign_allowed:allowed,claim_id:C,send_before_epoch:epoch+30});return;
  }
  if(p==='/storage/v1/object/upload/sign/'+binding.bucket_id+'/'+binding.object_path){
   assert.equal(req.headers.authorization,'Bearer '+config.serviceKey);assert.equal(req.headers['x-upsert'],'false');assert.equal(body,'{}');s.signs++;reached.resolve();
   if(o.holdSign)await resume.promise;if(o.loseSign){res.destroy();return;}
   json({url:'/object/upload/sign/'+binding.bucket_id+'/'+binding.object_path+'?token='+token,token});return;
  }
  if(p==='/rest/v1/rpc/record_listing_upload_grant_v1'){
   s.records++;assert.equal(JSON.parse(body).p_token,token);
   if(s.sealed){json({code:'55000',message:'publication_source_release_sealed'},400);return;}
   s.grant='recorded';s.token=token;if(o.loseRecord){res.destroy();return;}json({recorded:true});return;
  }
  if(p==='/rest/v1/rpc/get_my_listing_upload_grant_v1'){
   s.gets++;if(s.closed){json({code:'55000'},400);return;}
   json(s.grant==='recorded'?{state:'ready',grant:{...binding,token:s.token,issued_epoch:epoch,expires_epoch:epoch+7200}}:{state:'pending',grant:null});return;
  }
  if(p==='/rest/v1/rpc/claim_listing_cleanup_v1'){json(s.sealed&&!s.deleted?{schema_version:1,object_id:O,work_key:W,bucket_id:binding.bucket_id,object_path:binding.object_path,try_count:1,lease_until_epoch:Math.floor(Date.now()/1000)+60}:null);return;}
  if(p==='/storage/v1/object/'+binding.bucket_id){assert.equal(req.method,'DELETE');assert.ok(s.sealed);assert.deepEqual(JSON.parse(body),{prefixes:[binding.object_path]});s.deleted=true;json([]);return;}
  if(p==='/storage/v1/object/authenticated/'+binding.bucket_id+'/'+binding.object_path){assert.ok(s.deleted);json({},404);return;}
  if(p==='/rest/v1/rpc/record_listing_cleanup_v1'){assert.equal(JSON.parse(body).p_result,'deleted');json({object_id:O,work_key:W,state:'deleted'});return;}
  throw Error('unexpected_request');
 }catch(e){error=e;res.writeHead(500);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const fetcher=(url,init)=>{assert.ok(url.startsWith(origin+'/'));assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');return fetch(base+url.slice(origin.length),init);};
 return {s,token,reached,resume,settle:createSettleUnreleasedSourceOne(config,fetcher),issuer:createPrivateUploadIssuer(config,fetcher),clean:createCleanupOne(config,fetcher),
  async close(){resume.resolve();server.closeAllConnections();await new Promise(r=>server.close(r));if(error)throw error;}};
}
async function run(o,f){const m=await model(o);try{await f(m);}finally{await m.close();}}
test('no-release: one database call settles closed signing without Storage I/O',()=>run({},async m=>{assert.deepEqual(await m.settle(),{kind:'settled'});assert.equal(m.s.requests.length,1);assert.equal(m.s.signs,0);assert.equal(m.s.deleted,false);}));
test('no-release: open signing remains ineligible',()=>run({closed:false},async m=>{assert.deepEqual(await m.settle(),{kind:'idle'});assert.equal(m.s.sealed,false);}));
for(const grant of ['reserved','recorded','purged_recorded','missing'])test('no-release: '+grant+' is not treated as unreleased',()=>run({grant},async m=>{assert.deepEqual(await m.settle(),{kind:'idle'});assert.equal(m.s.sealed,false);}));
test('no-release: duplicate scan is idle',()=>run({},async m=>{await m.settle();assert.deepEqual(await m.settle(),{kind:'idle'});assert.equal(m.s.requests.length,2);}));
test('no-release: lost acknowledgement is reconcile with no automatic retry',()=>run({loseAck:true},async m=>{assert.deepEqual(await m.settle(),{kind:'reconcile'});assert.ok(m.s.sealed);assert.equal(m.s.requests.length,1);}));
for(const status of [202,400,401,403,500])test('no-release: HTTP '+status+' is not success',()=>run({status},async m=>{assert.deepEqual(await m.settle(),{kind:'reconcile'});assert.equal(m.s.requests.length,1);}));
for(const [name,mutate] of [['schema',v=>v.schema_version=2],['object',v=>v.object_id='00000000-0000-0000-0000-000000000000'],['grant',v=>v.grant_id=8],['claim',v=>delete v.claim_id],['proof',v=>v.proof='expired'],['state',v=>v.state='deleted'],['extra_secret',v=>v.token='PRIVATE_MUST_NOT_LEAK']])test('no-release: invalid '+name+' receipt stays reconcile',()=>run({mutate},async m=>{const r=await m.settle();assert.deepEqual(r,{kind:'reconcile'});assert.ok(!JSON.stringify(r).includes('PRIVATE'));}));
for(const flag of ['badJson','redirect'])test('no-release: '+flag+' does not succeed',()=>run({[flag]:true},async m=>{assert.deepEqual(await m.settle(),{kind:'reconcile'});assert.equal(m.s.requests.length,1);}));
test('no-release: pre-abort sends no request',async()=>{let n=0;const a=new AbortController();a.abort();const f=createSettleUnreleasedSourceOne(config,async()=>{n++;throw Error('no');});assert.deepEqual(await f(a.signal),{kind:'reconcile'});assert.equal(n,0);});
test('no-release: in-flight abort cannot become success',async()=>{let n=0;const a=new AbortController();const f=createSettleUnreleasedSourceOne(config,async()=>{n++;a.abort();return new Response(JSON.stringify(receipt()));});assert.deepEqual(await f(a.signal),{kind:'reconcile'});assert.equal(n,1);});
test('no-release: bad configuration fails before I/O',()=>{assert.throws(()=>createSettleUnreleasedSourceOne({...config,serviceKey:'bad secret'}));assert.throws(()=>createSettleUnreleasedSourceOne({...config,projectOrigin:'http://localhost:8000'}));assert.throws(()=>createSettleUnreleasedSourceOne(config,null));});
test('no-release: browser cannot construct privileged worker',()=>{global.window={};try{assert.throws(()=>createSettleUnreleasedSourceOne(config));}finally{delete global.window;}});
test('no-release: late signing response cannot escape unchanged broker after fence',()=>run({closed:false,grant:'reserved',holdSign:true},async m=>{
 const p=m.issuer('USER_ACCESS',command).then(value=>({value}),error=>({error}));await m.reached.promise;m.s.closed=true;
 assert.deepEqual(await m.settle(),{kind:'settled'});m.resume.resolve();const done=await p;
 assert.ok(done.error);assert.ok(!String(done.error).includes(m.token));assert.equal(m.s.records,1);assert.equal(m.s.gets,0);assert.equal(m.s.signs,1);assert.equal(m.s.token,null);assert.ok(m.s.requests.every(x=>x.method!=='PUT'));
}));
test('no-release: lost signing response then closure is still unreleased',()=>run({closed:false,grant:'reserved',loseSign:true},async m=>{await assert.rejects(m.issuer('USER_ACCESS',command));m.s.closed=true;assert.deepEqual(await m.settle(),{kind:'settled'});assert.equal(m.s.records,0);assert.equal(m.s.gets,0);assert.equal(m.s.signs,1);}));
test('no-release: lost record ACK stays blocked even without retrieval',()=>run({closed:false,grant:'reserved',loseRecord:true},async m=>{await assert.rejects(m.issuer('USER_ACCESS',command));assert.equal(m.s.grant,'recorded');assert.equal(m.s.gets,0);m.s.closed=true;assert.deepEqual(await m.settle(),{kind:'idle'});assert.equal(m.s.signs,1);}));
test('no-release: previously released token remains blocked after closure',()=>run({closed:false,grant:'reserved'},async m=>{const r=await m.issuer('USER_ACCESS',command);assert.equal(r.kind,'grant');assert.equal(r.grant.token,m.token);m.s.closed=true;assert.deepEqual(await m.settle(),{kind:'idle'});assert.equal(m.s.gets,1);}));
test('no-release: unchanged broker rejects another authenticated account',()=>run({closed:false,grant:'reserved',otherActor:true},async m=>{await assert.rejects(m.issuer('USER_ACCESS',command));assert.equal(m.s.requests.length,1);assert.equal(m.s.signs,0);}));
test('no-release: existing cleaner uses exact source only after proof',()=>run({},async m=>{assert.deepEqual(await m.clean(),{kind:'idle'});await m.settle();assert.deepEqual(await m.clean(),{kind:'deleted'});assert.deepEqual(await m.clean(),{kind:'idle'});assert.deepEqual(await m.settle(),{kind:'idle'});assert.equal(m.s.requests.filter(x=>x.method==='DELETE').length,1);assert.equal(m.s.signs,0);}));
test('no-release: stalled signer cannot recover a sealed grant through getter',()=>run({},async m=>{await m.settle();await assert.rejects(m.issuer('USER_ACCESS',command));assert.equal(m.s.signs,0);assert.equal(m.s.token,null);}));
