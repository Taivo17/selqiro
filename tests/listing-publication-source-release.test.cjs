'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path'),crypto=require('node:crypto');
const root=process.env.PUBLICATION_SOURCE_RELEASE_COMPILED_ROOT;
if(!root||!path.isAbsolute(root))throw Error('compiled_root_required');
const {createSettleRecordedSourceOne}=require(path.join(root,'server/listing-publication/final/settleRecordedSourceOne.js'));
const {createPrivateUploadIssuer}=require(path.join(root,'server/listing-publication/uploads/issuePrivateUpload.js'));
const {createCleanupOne}=require(path.join(root,'server/listing-publication/final/cleanupOne.js'));
const uid=n=>`${n}`.repeat(8)+'-'+`${n}`.repeat(4)+'-'+`${n}`.repeat(4)+'-'+`${n}`.repeat(4)+'-'+`${n}`.repeat(12);
const [U,I,A,S,O,G,C,D,W,R]=[1,2,3,4,5,6,7,8,9,'a'].map(uid);
const origin='https://abcdefghijklmnopqrst.supabase.co';
const config={projectOrigin:origin,serviceKey:'SYNTHETIC_SERVICE_KEY',publicKey:'SYNTHETIC_PUBLIC_KEY'};
const command={expectedUserId:U,expectedIdentityId:I,attemptId:A,slotId:S,dispatchKey:D};
const binding={schema_version:1,actor_user_id:U,identity_id:I,attempt_id:A,slot_id:S,object_id:O,dispatch_key:D,grant_id:G,
 bucket_id:'listing-publication-private',object_path:`v1/${A}/${S}/source.upload`,expected_bytes:100,expected_sha256:'a'.repeat(64)};
const receipt=()=>({schema_version:1,object_id:O,grant_id:G,claim_id:C,proof:'source_recorded_never_released',state:'settled'});
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function model(o={}){
 const s={requests:[],closed:o.closed??true,grant:o.grant??'recorded',covered:o.covered??true,intent:o.intent??false,
 sealed:false,deleted:false,signs:0,records:0,gets:0,confirms:0};
 const reached=defer(),resume=defer();let error;const epoch=Math.floor(Date.now()/1000);
 const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({url:binding.bucket_id+'/'+binding.object_path,upsert:false,iat:epoch,exp:epoch+7200})).toString('base64url')+'.syntheticSignature';
 const tokenHash=crypto.createHash('sha256').update(token).digest('hex');
 const server=http.createServer(async(req,res)=>{try{
  let body='';for await(const b of req)body+=b;assert.ok(body.length<16384);
  const p=req.url;s.requests.push({path:p,method:req.method,body});
  const json=(v,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(v));};
  if(p==='/rest/v1/rpc/settle_recorded_unreleased_source_one_v1'){
   assert.equal(req.headers.authorization,'Bearer '+config.serviceKey);assert.equal(req.method,'POST');assert.equal(body,'{}');
   if(o.status){json({message:'PRIVATE_MUST_NOT_LEAK'},o.status);return;}
   let v=null;if(s.closed&&s.grant==='recorded'&&s.covered&&!s.intent&&!s.sealed){s.sealed=true;v=receipt();}
   if(v&&o.mutate)o.mutate(v);if(o.loseAck){res.destroy();return;}
   if(o.badJson){res.writeHead(200);res.end('PRIVATE_MUST_NOT_LEAK');return;}
   if(o.redirect){res.writeHead(307,{location:'https://outside.invalid/'});res.end();return;}
   json(v);return;
  }
  if(p==='/auth/v1/user'){assert.equal(req.headers.authorization,'Bearer USER_ACCESS');json({id:o.otherActor?W:U});return;}
  if(p==='/rest/v1/rpc/reserve_my_listing_upload_v1'){assert.equal(req.headers.authorization,'Bearer USER_ACCESS');json({binding});return;}
  if(p==='/rest/v1/rpc/claim_listing_upload_sign_v1'){
   assert.equal(req.headers.authorization,'Bearer '+config.serviceKey);
   const allowed=s.grant==='reserved';if(allowed)s.grant='signing';json({binding,sign_allowed:allowed,claim_id:C,send_before_epoch:epoch+30});return;
  }
  if(p==='/storage/v1/object/upload/sign/'+binding.bucket_id+'/'+binding.object_path){
   assert.equal(req.headers.authorization,'Bearer '+config.serviceKey);assert.equal(req.headers['x-upsert'],'false');assert.equal(body,'{}');s.signs++;
   json({url:'/object/upload/sign/'+binding.bucket_id+'/'+binding.object_path+'?token='+token,token});return;
  }
  if(p==='/rest/v1/rpc/record_listing_upload_grant_v1'){
   s.records++;assert.equal(JSON.parse(body).p_token,token);s.grant='recorded';
   if(o.loseRecord){res.destroy();return;}json({recorded:true});return;
  }
  if(p==='/rest/v1/rpc/get_my_listing_upload_grant_v1'){
   s.gets++;assert.equal(req.headers.authorization,'Bearer '+config.serviceKey);
   assert.equal(req.headers.prefer,undefined); // no client-controlled rollback preference forwarded
   if(s.closed){json({code:'55000'},400);return;}
   if(s.grant!=='recorded'){json({state:s.grant==='expired'?'expired':'pending',grant:null,release_id:null});return;}
   if(!o.rollbackRead)s.intent=true;
   reached.resolve();if(o.holdRead)await resume.promise;
   if(o.loseRead){res.destroy();return;}
   const v={state:'ready',grant:{...binding,token,issued_epoch:epoch,expires_epoch:epoch+7200},release_id:R};
   if(o.mutateRead)o.mutateRead(v);json(v);return;
  }
  if(p==='/rest/v1/rpc/confirm_listing_upload_release_v1'){
   s.confirms++;assert.equal(req.headers.authorization,'Bearer '+config.serviceKey);assert.equal(req.headers.prefer,undefined);
   assert.deepEqual(JSON.parse(body),{p_expected_user_id:U,p_expected_identity_id:I,p_attempt_id:A,p_slot_id:S,p_dispatch_key:D,p_grant_id:G,p_release_id:R,p_token_sha256:tokenHash});
   if(o.closeAtConfirm)s.closed=true;
   if(!s.intent||s.closed){json({code:'55000'},400);return;}
   if(o.loseConfirm){res.destroy();return;}
   if(o.confirmStatus){json({},o.confirmStatus);return;}
   const v={release_id:R,grant_id:G,confirmed:true};if(o.mutateConfirm)o.mutateConfirm(v);json(v);return;
  }
  if(p==='/rest/v1/rpc/claim_listing_cleanup_v1'){json(s.sealed&&!s.deleted?{schema_version:1,object_id:O,work_key:W,bucket_id:binding.bucket_id,object_path:binding.object_path,try_count:1,lease_until_epoch:Math.floor(Date.now()/1000)+60}:null);return;}
  if(p==='/storage/v1/object/'+binding.bucket_id){assert.equal(req.method,'DELETE');assert.ok(s.sealed);assert.deepEqual(JSON.parse(body),{prefixes:[binding.object_path]});s.deleted=true;json([]);return;}
  if(p==='/storage/v1/object/authenticated/'+binding.bucket_id+'/'+binding.object_path){assert.ok(s.deleted);json({},404);return;}
  if(p==='/rest/v1/rpc/record_listing_cleanup_v1'){assert.equal(JSON.parse(body).p_result,'deleted');json({object_id:O,work_key:W,state:'deleted'});return;}
  throw Error('unexpected_request');
 }catch(e){error=e;res.writeHead(500);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const fetcher=(url,init)=>{assert.ok(url.startsWith(origin+'/'));assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');return fetch(base+url.slice(origin.length),init);};
 return {s,token,reached,resume,settle:createSettleRecordedSourceOne(config,fetcher),issuer:createPrivateUploadIssuer(config,fetcher),clean:createCleanupOne(config,fetcher),
 async close(){resume.resolve();server.closeAllConnections();await new Promise(r=>server.close(r));if(error)throw error;}};
}
async function run(o,f){const m=await model(o);try{await f(m);}finally{await m.close();}}
test('release-ledger: one DB call settles tracked closed recorded grant',()=>run({},async m=>{assert.deepEqual(await m.settle(),{kind:'settled'});assert.equal(m.s.requests.length,1);assert.equal(m.s.signs,0);assert.equal(m.s.deleted,false);}));
for(const [name,options] of [['open',{closed:false}],['untracked',{covered:false}],['possible_release',{intent:true}],['missing',{grant:'missing'}],['reserved',{grant:'reserved'}],['signing',{grant:'signing'}]])test('release-ledger: '+name+' is not proof of no exposure',()=>run(options,async m=>{assert.deepEqual(await m.settle(),{kind:'idle'});assert.equal(m.s.sealed,false);}));
test('release-ledger: duplicate scan stays idle',()=>run({},async m=>{await m.settle();assert.deepEqual(await m.settle(),{kind:'idle'});}));
test('release-ledger: lost settlement ACK is not retried',()=>run({loseAck:true},async m=>{assert.deepEqual(await m.settle(),{kind:'reconcile'});assert.ok(m.s.sealed);assert.equal(m.s.requests.length,1);}));
for(const status of [202,400,401,403,500])test('release-ledger: HTTP '+status+' is not settlement',()=>run({status},async m=>{assert.deepEqual(await m.settle(),{kind:'reconcile'});assert.equal(m.s.requests.length,1);}));
for(const [name,mutate] of [['schema',v=>v.schema_version=2],['object',v=>v.object_id='00000000-0000-0000-0000-000000000000'],['grant',v=>v.grant_id=8],['claim',v=>delete v.claim_id],['proof',v=>v.proof='expired'],['state',v=>v.state='deleted'],['extra_secret',v=>v.token='PRIVATE_MUST_NOT_LEAK']])test('release-ledger: invalid '+name+' receipt fails closed',()=>run({mutate},async m=>{const r=await m.settle();assert.deepEqual(r,{kind:'reconcile'});assert.ok(!JSON.stringify(r).includes('PRIVATE'));}));
for(const flag of ['badJson','redirect'])test('release-ledger: '+flag+' is not success',()=>run({[flag]:true},async m=>{assert.deepEqual(await m.settle(),{kind:'reconcile'});assert.equal(m.s.requests.length,1);}));
test('release-ledger: pre-abort sends nothing',async()=>{let n=0;const a=new AbortController();a.abort();assert.deepEqual(await createSettleRecordedSourceOne(config,async()=>{n++;throw Error('no');})(a.signal),{kind:'reconcile'});assert.equal(n,0);});
test('release-ledger: in-flight abort never succeeds',async()=>{let n=0;const a=new AbortController();assert.deepEqual(await createSettleRecordedSourceOne(config,async()=>{n++;a.abort();return new Response(JSON.stringify(receipt()));})(a.signal),{kind:'reconcile'});assert.equal(n,1);});
test('release-ledger: bad config fails before I/O',()=>{assert.throws(()=>createSettleRecordedSourceOne({...config,serviceKey:'bad secret'}));assert.throws(()=>createSettleRecordedSourceOne({...config,projectOrigin:'http://localhost:8000'}));assert.throws(()=>createSettleRecordedSourceOne(config,null));});
test('release-ledger: browser cannot construct worker',()=>{global.window={};try{assert.throws(()=>createSettleRecordedSourceOne(config));}finally{delete global.window;}});
test('release-ledger: lost record ACK becomes safely unexposed only with coverage',()=>run({closed:false,grant:'reserved',loseRecord:true},async m=>{await assert.rejects(m.issuer('USER_ACCESS',command));assert.equal(m.s.records,1);assert.equal(m.s.gets,0);m.s.closed=true;assert.deepEqual(await m.settle(),{kind:'settled'});assert.equal(m.s.signs,1);}));
test('release-ledger: normal broker confirms committed exact intent before returning token',()=>run({closed:false,grant:'reserved'},async m=>{const r=await m.issuer('USER_ACCESS',command);assert.equal(r.grant.token,m.token);assert.equal(r.release_id,undefined);assert.equal(r.grant.release_id,undefined);assert.equal(m.s.confirms,1);assert.equal(m.s.gets,1);assert.equal(m.s.signs,1);m.s.closed=true;assert.deepEqual(await m.settle(),{kind:'idle'});}));
test('release-ledger: rolled-back read cannot escape through broker',()=>run({closed:false,rollbackRead:true},async m=>{await assert.rejects(m.issuer('USER_ACCESS',command),e=>!String(e).includes(m.token));assert.equal(m.s.gets,1);assert.equal(m.s.confirms,1);assert.equal(m.s.intent,false);m.s.closed=true;assert.deepEqual(await m.settle(),{kind:'settled'});}));
test('release-ledger: lost read ACK conservatively retains possible-release intent',()=>run({closed:false,loseRead:true},async m=>{await assert.rejects(m.issuer('USER_ACCESS',command));assert.ok(m.s.intent);assert.equal(m.s.confirms,0);m.s.closed=true;assert.deepEqual(await m.settle(),{kind:'idle'});}));
test('release-ledger: lost confirmation ACK returns no token and never retries',()=>run({closed:false,loseConfirm:true},async m=>{await assert.rejects(m.issuer('USER_ACCESS',command));assert.equal(m.s.confirms,1);assert.equal(m.s.gets,1);m.s.closed=true;assert.deepEqual(await m.settle(),{kind:'idle'});}));
test('release-ledger: closure between read and confirmation returns no token',()=>run({closed:false,closeAtConfirm:true},async m=>{await assert.rejects(m.issuer('USER_ACCESS',command));assert.equal(m.s.confirms,1);assert.deepEqual(await m.settle(),{kind:'idle'});}));
test('release-ledger: closure while successful read response is delayed returns no token',()=>run({closed:false,holdRead:true},async m=>{const p=m.issuer('USER_ACCESS',command).then(value=>({value}),error=>({error}));await m.reached.promise;m.s.closed=true;assert.deepEqual(await m.settle(),{kind:'idle'});m.resume.resolve();assert.ok((await p).error);assert.equal(m.s.confirms,1);}));
for(const status of [202,401,403,500])test('release-ledger: confirm HTTP '+status+' never releases token',()=>run({closed:false,confirmStatus:status},async m=>{await assert.rejects(m.issuer('USER_ACCESS',command));assert.equal(m.s.confirms,1);}));
for(const [name,mutateRead] of [['absent',v=>delete v.release_id],['invalid',v=>v.release_id=0],['nil',v=>v.release_id='00000000-0000-0000-0000-000000000000']])test('release-ledger: '+name+' intent ID stops before confirm',()=>run({closed:false,mutateRead},async m=>{await assert.rejects(m.issuer('USER_ACCESS',command));assert.equal(m.s.confirms,0);}));
for(const [name,mutateConfirm] of [['different_id',v=>v.release_id=W],['different_grant',v=>v.grant_id=W],['false',v=>v.confirmed=false],['string_true',v=>v.confirmed='true'],['extra_secret',v=>v.token='PRIVATE_MUST_NOT_LEAK']])test('release-ledger: malformed confirmation '+name+' cannot release',()=>run({closed:false,mutateConfirm},async m=>{await assert.rejects(m.issuer('USER_ACCESS',command),e=>!String(e).includes('PRIVATE')&&!String(e).includes(m.token));assert.equal(m.s.confirms,1);}));
test('release-ledger: repeated explicit issuer call does not sign again',()=>run({closed:false,grant:'reserved'},async m=>{const a=await m.issuer('USER_ACCESS',command),b=await m.issuer('USER_ACCESS',command);assert.deepEqual(a,b);assert.equal(m.s.signs,1);assert.equal(m.s.gets,2);assert.equal(m.s.confirms,2);}));
test('release-ledger: pending has no extra confirmation or secret',()=>run({closed:false,grant:'signing'},async m=>{assert.equal((await m.issuer('USER_ACCESS',command)).kind,'reconcile_same_slot');assert.equal(m.s.confirms,0);assert.equal(m.s.signs,0);}));
test('release-ledger: expired grant is not a release receipt',()=>run({closed:false,grant:'expired'},async m=>{await assert.rejects(m.issuer('USER_ACCESS',command));assert.equal(m.s.intent,false);assert.equal(m.s.confirms,0);}));
test('release-ledger: Auth rejects another account before signing or secret reads',()=>run({closed:false,grant:'reserved',otherActor:true},async m=>{await assert.rejects(m.issuer('USER_ACCESS',command));assert.equal(m.s.requests.length,1);assert.equal(m.s.signs,0);assert.equal(m.s.gets,0);}));
test('release-ledger: existing cleaner removes only proved exact SOURCE',()=>run({},async m=>{assert.deepEqual(await m.clean(),{kind:'idle'});await m.settle();assert.deepEqual(await m.clean(),{kind:'deleted'});assert.deepEqual(await m.clean(),{kind:'idle'});assert.deepEqual(await m.settle(),{kind:'idle'});assert.equal(m.s.requests.filter(x=>x.method==='DELETE').length,1);assert.equal(m.s.signs,0);}));
test('release-ledger: possible-release intent cannot authorize cleaner',()=>run({intent:true},async m=>{assert.deepEqual(await m.settle(),{kind:'idle'});assert.deepEqual(await m.clean(),{kind:'idle'});assert.equal(m.s.deleted,false);}));
