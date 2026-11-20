'use strict';
// Native image decoding is real. Accounts, RPCs, requests and Storage responses
// are synthetic local fixtures; these checks never touch a deployed account.
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..'), ts=require('typescript'), sharp=require('sharp');
const {createHash}=require('node:crypto');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  fileName:filename,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true},
}).outputText,filename);
const model=require('../src/entities/profile/model/profileMedia.ts');
const {canonicalProfileImage}=require('../src/server/profile-media/imageCodec.ts');
const {createProfileMediaService}=require('../src/server/profile-media/service.ts');
const {createProfileMediaHandler}=require('../src/server/profile-media/handler.ts');
const {runProfileMediaMaintenance}=require('../src/server/profile-media/maintenance.ts');
const {createMediaTransport}=require('../src/server/messaging-media/transport.ts');
const {ListingContactError}=require('../src/entities/conversation/model/listingContact.ts');
const U='10000000-0000-0000-0000-000000000001', I='20000000-0000-0000-0000-000000000002';
const A='30000000-0000-0000-0000-000000000003', R='40000000-0000-0000-0000-000000000004';
const TOKEN='synthetic.user.token', actor={expectedUserId:U,expectedIdentityId:I};
const config={appOrigin:'https://profile-test.vercel.app',projectOrigin:'https://abcdefghijklmnopqrst.supabase.co',
  publicKey:'synthetic-public',serviceKey:'synthetic-secret'};
const objectName=model.profileMediaObjectName(I,A), imageUrl=config.projectOrigin+'/storage/v1/object/public/identity-media/'+objectName;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const snap=(extra={})=>({user_id:U,identity_id:I,revision:null,avatar:null,cover:null,focus_x:500,focus_y:500,zoom:1000,...extra});
const update=(extra={})=>({...actor,expectedRevision:null,slot:'avatar',action:'set',assetId:A,focusX:500,focusY:500,zoom:1000,...extra});
const upload=bytes=>({...actor,expectedRevision:null,assetId:A,slot:'avatar',imageBase64:bytes.toString('base64'),sourceBytes:bytes.length,sourceSha256:hash(bytes),sourceMime:'image/webp'});
const sample=()=>sharp({create:{width:60,height:40,channels:3,background:'#226644'}}).webp().toBuffer();
function fixture(bytes,options={}) {
  const calls=[],objects=new Map(); let state='pending',current=snap(),canonical=null;
  const command=upload(bytes),binding=()=>({asset_id:A,user_id:U,identity_id:I,slot:'avatar',object_name:objectName,status:state});
  const transport={
    async authenticate(token,user){calls.push(['auth',token,user]);assert.equal(token,TOKEN);assert.equal(user,U);if(options.authFail)throw new ListingContactError('unauthorized');},
    async rpc(name,args,token){calls.push([name,args,token]);
      if(name==='get_my_profile_media_v1'){assert.equal(token,TOKEN);return options.badSnapshot?{...current,identity_id:U}:current;}
      if(name==='begin_my_profile_media_v1'){assert.equal(token,TOKEN);assert.equal(args.p_expected_identity_id,I);assert.equal(args.p_expected_revision,null);
        return options.badBinding?{...binding(),identity_id:U}:binding();}
      if(name==='finish_profile_media_upload_v1'){assert.equal(token,null);assert.equal(args.p_user_id,U);assert.equal(args.p_identity_id,I);
        canonical={sha256:args.p_sha256,byte_size:args.p_byte_size,width:args.p_width,height:args.p_height};state='ready';
        if(options.finishLost)throw new Error('lost ready acknowledgement');return{...binding(),...canonical,...(options.badFinish?{sha256:'f'.repeat(64)}:{})};}
      if(name==='update_my_profile_media_v1'){assert.equal(token,TOKEN);assert.equal(args.p_expected_identity_id,I);if(options.saveRefused)throw new ListingContactError('refused');
        assert.equal(args.p_expected_revision,current.revision);state='active';current=snap({revision:R,avatar:{asset_id:A,url:imageUrl,width:canonical.width,height:canonical.height}});
        if(options.updateLost)throw new Error('lost final acknowledgement');return current;}
      throw new Error('unexpected RPC '+name);
    },
    async writeObject(bucket,name,data){calls.push(['write',bucket,name]);assert.equal(bucket,'identity-media');assert.equal(name,objectName);
      if(!objects.has(name)&&!options.noWrite)objects.set(name,data.slice());if(options.writeLost)throw new Error('unknown object result');return{status:200,bytes:new Uint8Array()};},
    async readObject(bucket,name){calls.push(['read',bucket,name]);return{status:objects.has(name)?200:404,bytes:objects.get(name)??new Uint8Array()};},
    async deleteObject(){throw new Error('upload must not delete');},
  };
  return{calls,objects,command,transport,service:createProfileMediaService(config,{transport,...(options.canonicalize?{canonicalize:options.canonicalize}:{})}),current:()=>current};
}
test('native canonicalizer orients, resizes, strips metadata and rejects unsupported/malformed/animated/oversized inputs',async()=>{
  const source=await sharp({create:{width:1200,height:600,channels:3,background:'#778899'}}).jpeg().withMetadata({orientation:6}).toBuffer();
  const avatar=await canonicalProfileImage(source,'avatar','image/jpeg'), metadata=await sharp(avatar.bytes).metadata();
  assert.equal(metadata.format,'webp');assert.equal(metadata.width,256);assert.equal(metadata.height,512);
  for(const key of ['exif','icc','xmp','iptc','orientation'])assert.equal(metadata[key],undefined);
  assert.equal(avatar.sha256,hash(avatar.bytes));assert.ok(avatar.bytes.length<=model.PROFILE_MEDIA_LIMITS.avatarBytes);
  const wide=await sharp({create:{width:3000,height:1500,channels:3,background:'#112233'}}).png().toBuffer();
  const cover=await canonicalProfileImage(wide,'cover','image/png');assert.equal(cover.width,2560);assert.equal(cover.height,1280);
  await assert.rejects(canonicalProfileImage(source,'avatar','image/webp'),e=>e.code==='input');
  await assert.rejects(canonicalProfileImage(Buffer.from('not an image'),'cover','image/webp'),e=>e.code==='input');
  await assert.rejects(canonicalProfileImage(Buffer.alloc(model.PROFILE_MEDIA_LIMITS.sourceBytes+1),'cover','image/png'),e=>e.code==='input');
  for(const [width,height] of [[4097,1],[3000,3000]]){
    const big=await sharp({create:{width,height,channels:3,background:'#111111'}}).webp().toBuffer();
    await assert.rejects(canonicalProfileImage(big,'cover','image/webp'),e=>e.code==='input');
  }
  const frames=Buffer.alloc(32,255);frames.fill(0,16,32);for(let i=19;i<32;i+=4)frames[i]=255;
  const animation=await sharp(frames,{raw:{width:2,height:4,channels:4,pageHeight:2}}).webp({loop:0,delay:[10,10]}).toBuffer();
  await assert.rejects(canonicalProfileImage(animation,'avatar','image/webp'),e=>e.code==='input');
});
test('closed model separates legacy/managed assets, pins own paths and bounds fit commands',()=>{
  const legacy={asset_id:null,url:config.projectOrigin+'/storage/v1/object/public/identity-media/old.jpg',width:null,height:null};
  assert.equal(model.parseProfileMediaSnapshot(snap({avatar:legacy}),actor,config.projectOrigin).avatar.asset_id,null);
  for(const url of ['', 'not a URL', 'javascript:alert(1)', 'https://legacy.example/'+ 'a'.repeat(2048)])
    assert.equal(model.parseProfileMediaSnapshot(snap({avatar:{...legacy,url}}),actor,config.projectOrigin).avatar,null);
  const managed={asset_id:A,url:imageUrl,width:512,height:300};
  assert.ok(model.parseProfileMediaSnapshot(snap({revision:R,avatar:managed}),actor,config.projectOrigin));
  for(const extra of [{identity_id:U},{debug:'private'},{avatar:{...managed,url:imageUrl.replace(I,U)}},
    {avatar:{...managed,url:imageUrl.replace(config.projectOrigin,'https://foreign.example')}},{avatar:{...managed,url:'not a URL'}},{avatar:{...managed,width:513}},
    {avatar:{...legacy,width:1}},{zoom:2001}])assert.throws(()=>model.parseProfileMediaSnapshot(snap(extra),actor,config.projectOrigin),e=>e.code==='response');
  for(const extra of [{extra:true},{slot:'other'},{zoom:999},{focusX:0.1},{action:'position'},
    {action:'remove'},{action:'remove',assetId:null,focusY:0}])assert.throws(()=>model.copyProfileMediaUpdateCommand(update(extra)),e=>e.code==='input');
  assert.ok(model.copyProfileMediaUpdateCommand(update({slot:'cover',action:'position',focusX:0,focusY:1000,zoom:2000})));
});
test('unauthenticated or differently bound actor cannot reserve/read/write profile media',async()=>{
  for(const options of [{authFail:true},{badBinding:true}]){
    const f=fixture(await sample(),options);await assert.rejects(f.service.upload(TOKEN,f.command));assert.equal(f.calls.some(c=>c[0]==='write'),false);
    if(options.authFail)assert.equal(f.calls.length,1);
  }
  const bad=fixture(await sample(),{badSnapshot:true});await assert.rejects(bad.service.snapshot(TOKEN,actor),e=>e.code==='response');
  const malformed=fixture(await sample());await assert.rejects(malformed.service.upload(TOKEN,{...malformed.command,sourceSha256:'a'.repeat(64)}),e=>e.code==='input');
  assert.equal(malformed.calls.length,0);
});
test('upload independently reads canonical bytes before ready and leaves current picture unchanged until authenticated Save',async()=>{
  const f=fixture(await sample(),{writeLost:true});const ready=await f.service.upload(TOKEN,f.command);
  assert.equal(ready.status,'ready');assert.equal(ready.url,imageUrl);assert.deepEqual(f.current(),snap());
  assert.ok(f.calls.findIndex(c=>c[0]==='read')<f.calls.findIndex(c=>c[0]==='finish_profile_media_upload_v1'));
  assert.equal(f.calls.some(c=>c[0]==='update_my_profile_media_v1'),false);
  assert.deepEqual(await f.service.upload(TOKEN,f.command),ready);assert.equal(f.calls.filter(c=>c[0]==='write').length,1);
  const saved=await f.service.update(TOKEN,update());assert.equal(saved.avatar.asset_id,A);assert.equal(saved.revision,R);
  assert.equal(f.calls.filter(c=>c[0]==='auth').length,3);assert.equal(f.calls.find(c=>c[0]==='update_my_profile_media_v1')[2],TOKEN);
});
test('missing/different stored bytes and mismatched finish binding never produce a ready receipt',async()=>{
  const absent=fixture(await sample(),{noWrite:true});await assert.rejects(absent.service.upload(TOKEN,absent.command),e=>e.code==='outcome_unknown');
  assert.equal(absent.calls.some(c=>c[0]==='finish_profile_media_upload_v1'),false);
  const changed=fixture(await sample());changed.objects.set(objectName,new Uint8Array([1,2,3]));
  await assert.rejects(changed.service.upload(TOKEN,changed.command),e=>e.code==='outcome_unknown');
  assert.deepEqual([...changed.objects.get(objectName)],[1,2,3]);assert.equal(changed.calls.some(c=>c[0]==='finish_profile_media_upload_v1'),false);
  const wrong=fixture(await sample(),{badFinish:true});await assert.rejects(wrong.service.upload(TOKEN,wrong.command),e=>e.code==='response');
});
test('fresh-owner refusal keeps previous picture and an unknown final write is never retried',async()=>{
  const refused=fixture(await sample(),{saveRefused:true});await refused.service.upload(TOKEN,refused.command);
  await assert.rejects(refused.service.update(TOKEN,update()),e=>e.code==='refused');assert.deepEqual(refused.current(),snap());
  const lost=fixture(await sample(),{updateLost:true});await lost.service.upload(TOKEN,lost.command);
  await assert.rejects(lost.service.update(TOKEN,update()),e=>e.code==='outcome_unknown');
  assert.equal((await lost.service.snapshot(TOKEN,actor)).avatar.asset_id,A);
  assert.equal(lost.calls.filter(c=>c[0]==='update_my_profile_media_v1').length,1);
});
test('route rejects wrong origin/host, unknown action and oversized streamed JSON before authority IO; errors never leak exception text',async()=>{
  let guards=0,operations=0,maintenance=0;let failure=false;
  const service={snapshot:async()=>{operations++;if(failure)throw new Error('private SQL/secret details');return snap();},upload:async()=>{operations++;return{};},update:async()=>{operations++;return{};}};
  const handler=createProfileMediaHandler(config,{service,environmentGuard:async()=>{guards++;},maintenance:()=>{maintenance++;}});
  const request=(body=JSON.stringify(actor),extra={})=>new Request(config.appOrigin+'/api/v2/profile-media/snapshot',{method:'POST',headers:{host:new URL(config.appOrigin).host,
    origin:config.appOrigin,authorization:'Bearer '+TOKEN,'content-type':'application/json',...extra},body});
  assert.equal((await handler(request(undefined,{origin:'https://foreign.example'}),'snapshot')).status,403);
  assert.equal((await handler(request(undefined,{host:'foreign.example'}),'snapshot')).status,403);
  assert.equal((await handler(request(undefined,{authorization:''}),'snapshot')).status,401);
  assert.equal((await handler(request(),'toString')).status,404);
  assert.equal((await handler(request(JSON.stringify({...actor,extra:true})),'snapshot')).status,400);
  assert.equal((await handler(request(' '.repeat(model.PROFILE_MEDIA_LIMITS.requestBytes+1)),'upload')).status,400);
  assert.equal((await handler(request(undefined,{'content-length':'1'}),'snapshot')).status,400);
  assert.equal(guards,0);assert.equal(operations,0);assert.equal(maintenance,0);
  const response=await handler(request(),'snapshot');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal(response.headers.get('cross-origin-resource-policy'),'same-origin');assert.equal(maintenance,1);
  failure=true;const error=await handler(request(),'snapshot');assert.equal(error.status,503);assert.deepEqual(await error.json(),{error:'outcome_unknown'});assert.equal(maintenance,1);
  const source=fs.readFileSync(path.join(root,'src/server/profile-media/handler.ts'),'utf8');assert.equal(source.includes('assertPublicationActor'),false);
});
test('shared Storage transport sends service-only immutable writes and no-store, no redirects or ambient credentials',async()=>{
  const calls=[], transport=createMediaTransport(config,async(url,init)=>{calls.push([url,init]);return Response.json({});});
  await transport.writeObject('identity-media',objectName,new Uint8Array([1]));
  const [url,init]=calls[0];assert.equal(url,config.projectOrigin+'/storage/v1/object/identity-media/'+objectName);
  assert.equal(init.headers.authorization,'Bearer '+config.serviceKey);assert.equal(init.headers['x-upsert'],'false');assert.equal(init.method,'POST');
  assert.equal(init.cache,'no-store');assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');
});
test('profile admission rate limit is a bounded explicit429 and never retries or starts storage',async()=>{
  const calls=[], fetcher=async(url,init)=>{calls.push([url,init]);
    if(url.endsWith('/auth/v1/user'))return Response.json({id:U});
    assert.ok(url.endsWith('/rest/v1/rpc/begin_my_profile_media_v1'));
    assert.equal(init.headers.authorization,'Bearer '+TOKEN);assert.equal(init.headers.apikey,config.publicKey);
    assert.equal(init.cache,'no-store');assert.equal(init.redirect,'error');
    return Response.json({code:'PT429',message:'PROFILE_MEDIA_RATE_LIMIT'},{status:429});};
  const service=createProfileMediaService(config,{fetcher}), command=upload(await sample());
  const handler=createProfileMediaHandler(config,{service,environmentGuard:async()=>{}});
  const request=new Request(config.appOrigin+'/api/v2/profile-media/upload',{method:'POST',headers:{host:new URL(config.appOrigin).host,
    origin:config.appOrigin,authorization:'Bearer '+TOKEN,'content-type':'application/json'},body:JSON.stringify(command)});
  const response=await handler(request,'upload');assert.equal(response.status,429);assert.deepEqual(await response.json(),{error:'rate_limited'});
  assert.equal(calls.length,2);assert.equal(calls.some(c=>c[0].includes('/storage/')),false);
});
test('whole-handler deadline cancels a stalled body and forbids a storage write after late image completion',async()=>{
  let cancelled=false,guards=0;
  const headers={host:new URL(config.appOrigin).host,origin:config.appOrigin,authorization:'Bearer '+TOKEN,'content-type':'application/json'};
  const body=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{"expectedUserId":'));},cancel(){cancelled=true;}});
  const handler=createProfileMediaHandler(config,{environmentGuard:async()=>{guards++;},deadlineMs:15});
  const response=await handler(new Request(config.appOrigin+'/api/v2/profile-media/snapshot',{method:'POST',headers,body,duplex:'half'}),'snapshot');
  assert.equal(response.status,503);assert.equal((await response.json()).error,'outcome_unknown');assert.equal(cancelled,true);assert.equal(guards,0);
  const bytes=await sample(), canonical=await canonicalProfileImage(bytes,'avatar','image/webp');let finish;
  const deferred=new Promise(resolve=>{finish=resolve;});
  const f=fixture(bytes,{canonicalize:()=>deferred});
  const uploadHandler=createProfileMediaHandler(config,{service:f.service,environmentGuard:async()=>{},deadlineMs:15});
  const timed=await uploadHandler(new Request(config.appOrigin+'/api/v2/profile-media/upload',{method:'POST',headers,body:JSON.stringify(f.command)}),'upload');
  assert.equal(timed.status,503);assert.equal((await timed.json()).error,'outcome_unknown');
  finish(canonical);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.calls.some(c=>c[0]==='write'),false);assert.equal(f.calls.some(c=>c[0]==='finish_profile_media_upload_v1'),false);
});
async function cleanup(options={}) {
  const calls=[];let claimId;
  const transport={async rpc(name,args,token){calls.push([name,args,token]);assert.equal(token,null);
    if(name==='claim_profile_media_cleanup_v1'){claimId=args.p_claim_id;return options.claims?options.claims(claimId):[{asset_id:A,object_name:objectName,claim_id:claimId}];}
    if(name==='finish_profile_media_cleanup_v1')return{asset_id:A,claim_id:claimId,status:'deleted'};throw new Error('unexpected RPC');},
    async deleteObject(bucket,name){calls.push(['delete',bucket,name]);if(options.deleteLost)throw new Error('lost delete');return{status:200,bytes:new Uint8Array()};},
    async readObject(bucket,name){calls.push(['read',bucket,name]);return options.read??{status:404,bytes:new Uint8Array()};}};
  await runProfileMediaMaintenance(config,undefined,undefined,transport);return calls;
}
test('cleanup requires exact claimed managed paths and confirms absence independently of delete acknowledgement',async()=>{
  const lingering=await cleanup({read:{status:200,bytes:new Uint8Array([1])}});assert.equal(lingering.some(c=>c[0]==='finish_profile_media_cleanup_v1'),false);
  const absent=await cleanup({deleteLost:true});assert.ok(absent.some(c=>c[0]==='finish_profile_media_cleanup_v1'));
  assert.ok(absent.findIndex(c=>c[0]==='read')>absent.findIndex(c=>c[0]==='delete'));
  for(const path of ['legacy/avatar.webp','managed-profile-v1/'+I+'/../'+A+'.webp','managed-profile-v1/'+I+'/'+R+'.webp']){
    const calls=await cleanup({claims:id=>[{asset_id:A,object_name:path,claim_id:id}]});assert.equal(calls.some(c=>c[0]==='delete'),false);
  }
  const tooMany=await cleanup({claims:id=>Array.from({length:5},()=>({asset_id:A,object_name:objectName,claim_id:id}))});assert.equal(tooMany.some(c=>c[0]==='delete'),false);
  const native={statusCode:'404',code:'NoSuchKey',error:'not_found',message:'Object not found'};
  const known=await cleanup({read:{status:400,bytes:Buffer.from(JSON.stringify(native))}});assert.ok(known.some(c=>c[0]==='finish_profile_media_cleanup_v1'));
  const nativeWithoutCode={statusCode:'404',error:'not_found',message:'Object not found'};
  const compatible=await cleanup({read:{status:400,bytes:Buffer.from(JSON.stringify(nativeWithoutCode))}});assert.ok(compatible.some(c=>c[0]==='finish_profile_media_cleanup_v1'));
  const wrongCode=await cleanup({read:{status:400,bytes:Buffer.from(JSON.stringify({...native,code:'OtherError'}))}});assert.equal(wrongCode.some(c=>c[0]==='finish_profile_media_cleanup_v1'),false);
  const unknown=await cleanup({read:{status:400,bytes:Buffer.from(JSON.stringify({error:'generic failure'}))}});assert.equal(unknown.some(c=>c[0]==='finish_profile_media_cleanup_v1'),false);
});
