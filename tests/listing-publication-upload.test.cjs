'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { createHash } = require('node:crypto');
const path = require('node:path');
const root = process.env.PUBLICATION_UPLOAD_COMPILED_ROOT;
if (!root) throw Error('PUBLICATION_UPLOAD_COMPILED_ROOT required');
const C = require(path.join(root, 'entities/listing/model/privatePublicationUpload.js'));
const { privateUploadHttp } = require(path.join(root, 'entities/listing/api/privateUploadHttp.js'));
const { uploadPrivateListingSource } = require(path.join(root, 'entities/listing/api/uploadPrivateListingSource.js'));
const { createPrivateUploadIssuer } = require(path.join(root, 'server/listing-publication/uploads/issuePrivateUpload.js'));
const id = n => '10000000-0000-4000-8000-' + n.toString(16).padStart(12, '0');
const origin = 'https://aaaaaaaaaaaaaaaaaaaa.supabase.co';
const command = Object.freeze({ expectedUserId:id(1), expectedIdentityId:id(2), attemptId:id(3), slotId:id(4), dispatchKey:id(5) });
const body = Uint8Array.from([0,255,10,13,3,4,9,18,32,90]);
const hash = b => createHash('sha256').update(b).digest('hex');
function binding() { return {schema_version:1, actor_user_id:id(1), identity_id:id(2), attempt_id:id(3), slot_id:id(4),
  object_id:id(6), dispatch_key:id(5), grant_id:id(7), bucket_id:C.PRIVATE_UPLOAD.bucket,
  object_path:`v1/${id(3)}/${id(4)}/source.upload`, expected_bytes:body.length, expected_sha256:hash(body)}; }
const b64 = v => Buffer.from(JSON.stringify(v)).toString('base64url');
function makeToken(changes={}, head={alg:'HS256',typ:'JWT'}) {
 const at=Math.floor(Date.now()/1000);
 return b64(head)+'.'+b64({url:binding().bucket_id+'/'+binding().object_path,upsert:false,iat:at,exp:at+7200,...changes})+'.syntheticSignature';
}
function grant(token=makeToken()) {return {...binding(),token,...C.inspectUploadToken(token,binding().object_path)};}
const failCode = code => error => error instanceof C.PrivateUploadError && error.code===code;
const jsonResponse = (json,status=200) => new Response(JSON.stringify(json),{status,headers:{'content-type':'application/json'}});
function issuer(fetcher) {return createPrivateUploadIssuer({projectOrigin:origin,publicKey:'synthetic-public',serviceKey:'synthetic-service'},fetcher);}
function uploadArgs(g=grant()) {return {command,grant:g,file:new Blob([body],{type:'image/jpeg'}),projectOrigin:origin,isCurrentContext:()=>true};}

// Real loopback HTTP; only the destination is remapped by the explicit test fetch.
// Auth/PostgREST/Storage responses and persistent state below are SYNTHETIC, not Supabase.
async function model(t, hooks={}) {
 const state={calls:[],signs:0,claimed:false,token:null,stored:null,recordCalls:0,closed:false};
 const server=createServer(async (req,res)=>{
  try {
   const chunks=[];for await(const chunk of req) chunks.push(chunk);
   const raw=Buffer.concat(chunks), p=new URL(req.url,'http://localhost').pathname;
   state.calls.push({p,method:req.method,headers:req.headers,raw});
   const reply=(v,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(v));};
   const hook=hooks[p.split('/').pop()] ?? (req.method==='PUT'?hooks.PUT:undefined);
   if(hook && await hook({state,req,res,reply,raw,p})) return;
   if(p==='/auth/v1/user') {assert.equal(req.headers.authorization,'Bearer synthetic-user');reply({id:command.expectedUserId});return;}
   if(p.includes('/rest/v1/rpc/')) {
    const cmd=JSON.parse(raw.toString()); const method=p.split('/').pop();
    const service=method.startsWith('claim_')||method.startsWith('record_');
    assert.equal(req.headers.authorization,service?'Bearer synthetic-service':'Bearer synthetic-user');
    assert.equal(req.headers.apikey,service?'synthetic-service':'synthetic-public');
    if(method==='reserve_my_listing_upload_v1') {reply({binding:binding()});return;}
    if(method==='claim_listing_upload_sign_v1') {const yes=!state.claimed;state.claimed=true;
     reply({binding:binding(),sign_allowed:yes,claim_id:id(8),send_before_epoch:Math.floor(Date.now()/1000)+30});return;}
    if(method==='record_listing_upload_grant_v1') {state.recordCalls++;state.token=cmd.p_token;reply({recorded:true});return;}
    if(method==='get_my_listing_upload_grant_v1') {
     if(state.closed){reply({},403);return;}
     reply(state.token?{state:'ready',grant:grant(state.token)}:{state:'pending',grant:null});return;
    }
   }
   if(req.method==='POST' && p.includes('/storage/v1/object/upload/sign/')) {
    assert.equal(req.headers.authorization,'Bearer synthetic-service');assert.equal(req.headers['x-upsert'],'false');
    state.signs++;const token=makeToken();reply({url:'/object/upload/sign/'+binding().bucket_id+'/'+binding().object_path+'?token='+token,token});return;
   }
   if(req.method==='PUT' && p.includes('/storage/v1/object/upload/sign/')) {
    assert.equal(req.headers.authorization,undefined);assert.equal(req.headers.apikey,undefined);
    assert.equal(req.headers['x-upsert'],'false');assert.equal(req.headers['content-type'],'application/octet-stream');
    const token=new URL(req.url,'http://localhost').searchParams.get('token');assert.equal(token,state.token);
    if(state.stored){reply({message:'synthetic duplicate'},409);return;}
    state.stored=raw;reply({Key:binding().bucket_id+'/'+binding().object_path});return;
   }
   reply({},404);
  }catch(error){state.error=error;res.writeHead(500);res.end('{}');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));if(state.error)throw state.error;});
 const port=server.address().port;
 const fetcher=(url,init)=>{assert.equal(new URL(url).origin,origin);assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');
  assert.equal(init.credentials,'omit');assert.equal(init.referrerPolicy,'no-referrer');
  return fetch('http://127.0.0.1:'+port+new URL(url).pathname+new URL(url).search,init);};
 return {state,fetcher};
}

test('command is exact immutable copied JSON',()=>{const input={...command};const result=C.copyUploadCommand(input);input.slotId=id(20);assert.equal(result.slotId,id(4));assert.ok(Object.isFrozen(result));});
for(const [name,value] of Object.entries({null:null,array:[],extra:{...command,path:'evil'},missing:{...command,slotId:undefined},zero:{...command,slotId:'00000000-0000-0000-0000-000000000000'},uppercase:{...command,slotId:'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'},number:{...command,dispatchKey:1}}))
 test('command rejects '+name,()=>assert.throws(()=>C.copyUploadCommand(value),C.PrivateUploadError));
test('command getter never executes',()=>{let called=false;const v={...command};Object.defineProperty(v,'slotId',{get(){called=true;throw Error('secret');},enumerable:true});assert.throws(()=>C.copyUploadCommand(v));assert.equal(called,false);});
test('command symbol rejected',()=>assert.throws(()=>C.copyUploadCommand({...command,[Symbol()]:1})));
test('command nonenumerable rejected',()=>{const v={...command};Object.defineProperty(v,'x',{value:1});assert.throws(()=>C.copyUploadCommand(v));});
for(const value of ['http://aaaaaaaaaaaaaaaaaaaa.supabase.co',origin+'/',origin+':443',origin+'/evil',origin+'?x=1','https://a@aaaaaaaaaaaaaaaaaaaa.supabase.co','https://aaaaaaaaaaaaaaaaaaaa.supabase.co.evil','https://localhost','',null])
 test('origin rejects '+String(value),()=>assert.throws(()=>C.publicationStorageOrigin(value),failCode('configuration')));
for(const [key,value] of Object.entries({schema_version:2,actor_user_id:id(20),identity_id:id(20),attempt_id:id(20),slot_id:id(20),object_id:'x',dispatch_key:id(20),grant_id:null,bucket_id:'listing-images',object_path:'../evil',expected_bytes:0,expected_sha256:'f'.repeat(63)}))
 test('binding rejects '+key,()=>assert.throws(()=>C.copyUploadBinding({...binding(),[key]:value},command)));
for(const size of [-1,0,1.1,25*1024*1024+1,Infinity,'10']) test('binding rejects bytes '+size,()=>assert.throws(()=>C.copyUploadBinding({...binding(),expected_bytes:size},command)));
test('binding accepts full source capacity but no web path',()=>{assert.equal(C.copyUploadBinding({...binding(),expected_bytes:25*1024*1024},command).expected_bytes,25*1024*1024);assert.throws(()=>C.copyUploadBinding({...binding(),object_path:`v1/${id(3)}/${id(4)}/web-v1.webp`},command));});
for(const [name,changes] of Object.entries({wrongPath:{url:'other/path'},upsert:{upsert:true},missingUpsert:{upsert:null},shortTTL:{exp:Math.floor(Date.now()/1000)+60},stringEpoch:{iat:'1'},floatEpoch:{iat:1.1},nullEpoch:{iat:null},unsafeEpoch:{exp:1e20}}))
 test('token rejects '+name,()=>assert.throws(()=>C.inspectUploadToken(makeToken(changes),binding().object_path)));
for(const token of ['', 'a.b.c?x=1','a.b.c&x=y','a..c','%61.b.c','a.b.','a'.repeat(4097),b64({alg:'none'})+'.'+b64({})+'.x'])
 test('token rejects format '+hash(token).slice(0,8),()=>assert.throws(()=>C.inspectUploadToken(token,binding().object_path)));
test('token inspection is not a signature verifier',()=>{assert.ok(C.inspectUploadToken(makeToken(),binding().object_path).expires_epoch>0);});
test('grant expires and has no lenient clock guess',()=>{const at=Math.floor(Date.now()/1000);assert.throws(()=>C.copyPrivateUploadGrant(grant(makeToken({iat:at-7200,exp:at})),command,Date.now()),failCode('grant_unavailable'));});
test('grant future issue refused',()=>{const at=Math.floor(Date.now()/1000)+120;assert.throws(()=>C.copyPrivateUploadGrant(grant(makeToken({iat:at,exp:at+7200})),command,Date.now()),failCode('grant_unavailable'));});
test('grant inconsistent expiration refused',()=>assert.throws(()=>C.copyPrivateUploadGrant({...grant(),expires_epoch:1},command,Date.now())));
test('grant token expires field does not authorize arbitrary URL',()=>assert.throws(()=>C.copyPrivateUploadGrant({...grant(),signedUrl:'https://evil'},command,Date.now())));
test('hash owns source bytes before await',async()=>{const b=Uint8Array.from(body);const p=C.uploadSha256(b);b.fill(0);assert.equal(await p,hash(body));});

test('HTTP reads a real streamed bounded JSON response',async()=>{const r=await privateUploadHttp(async()=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{"x":'));c.enqueue(new TextEncoder().encode('1}'));c.close();}})),origin,{});assert.deepEqual(r.json,{x:1});});
test('HTTP bounds decoded response even without length',async()=>await assert.rejects(privateUploadHttp(async()=>jsonResponse({x:'z'.repeat(200)}),origin,{}, {responseBytes:100}),failCode('invalid_response')));
test('HTTP refuses excessive declared length',async()=>await assert.rejects(privateUploadHttp(async()=>new Response('{}',{headers:{'content-length':'99999999'}}),origin,{}),failCode('invalid_response')));
test('HTTP refuses missing declared bytes',async()=>await assert.rejects(privateUploadHttp(async()=>new Response('{}',{headers:{'content-length':'3'}}),origin,{}),failCode('invalid_response')));
test('HTTP nonJSON failure never includes server text',async()=>{const r=await privateUploadHttp(async()=>new Response('TOP SECRET',{status:500}),origin,{});assert.deepEqual(r,{status:500,json:null});});
test('HTTP thrown network errors are redacted',async()=>{await assert.rejects(privateUploadHttp(async()=>{throw Error('TOP SECRET');},origin,{}),e=>e.code==='outcome_unknown'&&!JSON.stringify(e).includes('TOP SECRET')&&!e.message.includes('TOP SECRET'));});
test('HTTP malformed successful JSON is not accepted',async()=>await assert.rejects(privateUploadHttp(async()=>new Response('{'),origin,{}),C.PrivateUploadError));
test('HTTP cannot wait forever on fetch ignoring AbortSignal',async()=>{const start=Date.now();await assert.rejects(privateUploadHttp(()=>new Promise(()=>{}),origin,{}, {timeoutMs:20}),failCode('outcome_unknown'));assert.ok(Date.now()-start<1500);});
test('HTTP deadline also bounds body reads',async()=>{await assert.rejects(privateUploadHttp(async()=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));}})),origin,{}, {timeoutMs:20}),failCode('outcome_unknown'));});
test('HTTP preaborted request makes zero calls',async()=>{let calls=0;const c=new AbortController();c.abort();await assert.rejects(privateUploadHttp(async()=>{calls++;return jsonResponse({});},origin,{}, {signal:c.signal}),failCode('aborted'));assert.equal(calls,0);});
test('HTTP cancellation does not wait for ignored signal',async()=>{const c=new AbortController();const p=privateUploadHttp(()=>new Promise(()=>{}),origin,{}, {signal:c.signal,timeoutMs:1000});c.abort();await assert.rejects(p,failCode('aborted'));});
for(const setting of [{timeoutMs:0},{timeoutMs:Infinity},{timeoutMs:120001},{responseBytes:0},{responseBytes:65537}])
 test('HTTP closed limits '+JSON.stringify(setting),async()=>await assert.rejects(privateUploadHttp(async()=>jsonResponse({}),origin,{},setting),failCode('configuration')));

test('real HTTP model: reserve -> claim -> sign -> record -> read -> direct PUT',async t=>{
 const {state,fetcher}=await model(t);const r=await issuer(fetcher)('synthetic-user',command);assert.equal(r.kind,'grant');
 assert.deepEqual(state.calls.map(c=>c.p.split('/').pop()),['user','reserve_my_listing_upload_v1','claim_listing_upload_sign_v1','source.upload','record_listing_upload_grant_v1','get_my_listing_upload_grant_v1']);
 const out=await uploadPrivateListingSource(uploadArgs(r.grant),fetcher);assert.equal(out.kind,'upload_acknowledged_needs_verification');assert.deepEqual(state.stored,Buffer.from(body));
 assert.equal(state.signs,1);assert.equal(state.recordCalls,1);assert.equal(state.calls.at(-1).method,'PUT');
});
test('real HTTP model: repeat returns SAME token without resigning',async t=>{const {state,fetcher}=await model(t);const fn=issuer(fetcher);const one=await fn('synthetic-user',command),two=await fn('synthetic-user',command);assert.deepEqual(one,two);assert.equal(state.signs,1);assert.equal(state.recordCalls,1);});
test('real HTTP model: lost record ACK recovers token without another sign',async t=>{
 let dropped=false;const {state,fetcher}=await model(t,{record_listing_upload_grant_v1({state,req,res,raw}){if(!dropped){dropped=true;state.token=JSON.parse(raw).p_token;state.recordCalls++;res.destroy();return true;}}});
 const fn=issuer(fetcher);await assert.rejects(fn('synthetic-user',command),failCode('outcome_unknown'));const r=await fn('synthetic-user',command);assert.equal(r.kind,'grant');assert.equal(state.signs,1);
});
test('real HTTP model: lost claim ACK never mints on replay',async t=>{
 let dropped=false;const {state,fetcher}=await model(t,{claim_listing_upload_sign_v1({state,res}){if(!dropped){dropped=true;state.claimed=true;res.destroy();return true;}}});
 const fn=issuer(fetcher);await assert.rejects(fn('synthetic-user',command));assert.equal((await fn('synthetic-user',command)).kind,'reconcile_same_slot');assert.equal(state.signs,0);
});
test('real HTTP model: unknown signing response never triggers another signer',async t=>{
 const {state,fetcher}=await model(t,{ 'source.upload'({req,res,state}){if(req.method==='POST'){state.signs++;res.destroy();return true;}} });
 const fn=issuer(fetcher);await assert.rejects(fn('synthetic-user',command));assert.equal((await fn('synthetic-user',command)).kind,'reconcile_same_slot');assert.equal(state.signs,1);
});
test('real HTTP model: concurrent brokers have one external signer',async t=>{const {state,fetcher}=await model(t);const fn=issuer(fetcher);const results=await Promise.all(Array.from({length:12},()=>fn('synthetic-user',command)));assert.equal(state.signs,1);assert.equal(state.recordCalls,1);assert.ok(results.some(x=>x.kind==='grant'));assert.ok(results.every(x=>['grant','reconcile_same_slot'].includes(x.kind)));});
test('real HTTP model: changed identity after sign records but does not release',async t=>{
 const {state,fetcher}=await model(t,{record_listing_upload_grant_v1({state}){state.closed=true;}});
 await assert.rejects(issuer(fetcher)('synthetic-user',command),failCode('unauthorized'));assert.equal(state.signs,1);assert.ok(state.token);assert.equal(state.stored,null);
});
test('real HTTP model: prior reservation without new receipt stays unresolved',async t=>{const {state,fetcher}=await model(t,{reserve_my_listing_upload_v1({reply}){reply({binding:null});return true;}});assert.equal((await issuer(fetcher)('synthetic-user',command)).kind,'reconcile_same_slot');assert.equal(state.signs,0);assert.equal(state.calls.length,2);});
test('real HTTP model: Auth mismatch causes no DB or Storage request',async t=>{const {state,fetcher}=await model(t,{user({reply}){reply({id:id(99)});return true;}});await assert.rejects(issuer(fetcher)('synthetic-user',command),failCode('context_changed'));assert.equal(state.calls.length,1);});
for(const phase of ['reserve_my_listing_upload_v1','claim_listing_upload_sign_v1']) test('real HTTP model: no sign on denied '+phase,async t=>{const {state,fetcher}=await model(t,{[phase]({reply}){reply({message:'secret'},403);return true;}});await assert.rejects(issuer(fetcher)('synthetic-user',command),failCode('unauthorized'));assert.equal(state.signs,0);});
for(const [name,url] of Object.entries({absolute:'https://evil/path?token=x',wrongPath:'/object/upload/sign/listing-images/x?token=x',extraQuery:'/object/upload/sign/'+binding().bucket_id+'/'+binding().object_path+'?token='+makeToken()+'&x=y'}))
 test('real HTTP model: signing URL rejects '+name,async t=>{const {state,fetcher}=await model(t,{'source.upload'({req,reply,state}){if(req.method==='POST'){state.signs++;reply({url});return true;}}});await assert.rejects(issuer(fetcher)('synthetic-user',command),failCode('invalid_response'));assert.equal(state.recordCalls,0);});
test('real HTTP model: receipt ACK must be exactly true',async t=>{const {state,fetcher}=await model(t,{record_listing_upload_grant_v1({reply}){reply({recorded:'true'});return true;}});await assert.rejects(issuer(fetcher)('synthetic-user',command),failCode('outcome_unknown'));assert.equal(state.calls.some(x=>x.p.endsWith('get_my_listing_upload_grant_v1')),false);});
test('real HTTP model: claim window expired prevents signing',async t=>{const {state,fetcher}=await model(t,{claim_listing_upload_sign_v1({reply}){reply({binding:binding(),sign_allowed:true,claim_id:id(8),send_before_epoch:1});return true;}});await assert.rejects(issuer(fetcher)('synthetic-user',command),failCode('grant_unavailable'));assert.equal(state.signs,0);});
test('real HTTP model: reordered JSON binding is accepted by value',async t=>{const {fetcher}=await model(t,{claim_listing_upload_sign_v1({reply,state}){state.claimed=true;reply({binding:Object.fromEntries(Object.entries(binding()).reverse()),sign_allowed:true,claim_id:id(8),send_before_epoch:Math.floor(Date.now()/1000)+30});return true;}});assert.equal((await issuer(fetcher)('synthetic-user',command)).kind,'grant');});
test('real HTTP model: upload conflict does not delete or mark ready',async t=>{const {state,fetcher}=await model(t);const r=await issuer(fetcher)('synthetic-user',command);await uploadPrivateListingSource(uploadArgs(r.grant),fetcher);await assert.rejects(uploadPrivateListingSource(uploadArgs(r.grant),fetcher),failCode('outcome_unknown'));assert.equal(state.calls.filter(x=>x.method==='DELETE').length,0);assert.deepEqual(state.stored,Buffer.from(body));});
test('real HTTP model: lost upload response preserves exact uploaded bytes',async t=>{const {state,fetcher}=await model(t,{PUT({state,raw,res}){state.stored=raw;res.destroy();return true;}});const r=await issuer(fetcher)('synthetic-user',command);await assert.rejects(uploadPrivateListingSource(uploadArgs(r.grant),fetcher),failCode('outcome_unknown'));assert.deepEqual(state.stored,Buffer.from(body));assert.equal(state.calls.filter(x=>x.method==='PUT').length,1);});
test('browser detects wrong hash before any PUT',async()=>{let count=0;await assert.rejects(uploadPrivateListingSource({...uploadArgs(),file:new Blob([new Uint8Array(body.length)])},async()=>{count++;return jsonResponse({});}),failCode('file_mismatch'));assert.equal(count,0);});
test('browser detects wrong length before any PUT',async()=>{let count=0;await assert.rejects(uploadPrivateListingSource({...uploadArgs(),file:new Blob([body,body])},async()=>{count++;return jsonResponse({});}),failCode('file_mismatch'));assert.equal(count,0);});
test('browser rejects stale context before PUT',async()=>{let count=0;await assert.rejects(uploadPrivateListingSource({...uploadArgs(),isCurrentContext:()=>false},async()=>{count++;return jsonResponse({});}),failCode('context_changed'));assert.equal(count,0);});
test('browser context change during digest prevents PUT',async()=>{let checks=0,count=0;await assert.rejects(uploadPrivateListingSource({...uploadArgs(),isCurrentContext:()=>++checks<3},async()=>{count++;return jsonResponse({});}),failCode('context_changed'));assert.equal(count,0);});
test('browser stale successful response is suppressed',async()=>{let current=true;await assert.rejects(uploadPrivateListingSource({...uploadArgs(),isCurrentContext:()=>current},async()=>{current=false;return jsonResponse({Key:binding().bucket_id+'/'+binding().object_path});}),failCode('context_changed'));});
test('browser requires matching Key, not just status200',async()=>await assert.rejects(uploadPrivateListingSource(uploadArgs(),async()=>jsonResponse({Key:'wrong'})),failCode('outcome_unknown')));
test('browser never sends caller MIME/name as authority',async()=>{await uploadPrivateListingSource({...uploadArgs(),file:new Blob([body],{type:'evil/type'})},async(url,init)=>{assert.equal(new Headers(init.headers).get('content-type'),'application/octet-stream');assert.equal(new Headers(init.headers).get('authorization'),null);assert.deepEqual(Buffer.from(init.body),Buffer.from(body));return jsonResponse({Key:binding().bucket_id+'/'+binding().object_path});});});
test('browser copies the grant before asynchronous work',async()=>{const g=grant(),args=uploadArgs(g);const p=uploadPrivateListingSource(args,async(url)=>{assert.equal(new URL(url).searchParams.get('token'),original);return jsonResponse({Key:binding().bucket_id+'/'+binding().object_path});});const original=g.token;g.token='evil';await p;});
test('broker copies command before authentication',async t=>{const {fetcher}=await model(t);const c={...command};const p=issuer(fetcher)('synthetic-user',c);c.slotId=id(99);assert.equal((await p).kind,'grant');});
test('broker rejects invalid access token without calls',async()=>{let count=0;await assert.rejects(issuer(async()=>{count++;return jsonResponse({});})('secret\nX: yes',command),failCode('unauthorized'));assert.equal(count,0);});
test('broker config keys cannot contain header breaks',()=>assert.throws(()=>createPrivateUploadIssuer({projectOrigin:origin,publicKey:'ok',serviceKey:'bad\nheader'}),failCode('configuration')));
