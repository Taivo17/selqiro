// Local native-image/HTTP/service tests. All identities, RPCs and object storage
// are synthetic; this never connects to a real account or sends a message.
// node --conditions=react-server --test --test-isolation=none tests/message-images.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const sharp = require('sharp');
const { createHash } = require('node:crypto');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, filename);
const { canonicalMessageImage } = require('../src/server/messaging-media/imageCodec.ts');
const { createMessageImageService } = require('../src/server/messaging-media/service.ts');
const { createMessageImageHandler } = require('../src/server/messaging-media/handler.ts');
const { createMediaTransport, boundedMediaFetch } = require('../src/server/messaging-media/transport.ts');
const { runMessageImageMaintenance } = require('../src/server/messaging-media/maintenance.ts');
const { createMessageImageClient } = require('../src/entities/conversation/api/messageImages.ts');
const model = require('../src/entities/conversation/model/messageImage.ts');
const USER='10000000-0000-0000-0000-000000000001', IDENTITY='20000000-0000-0000-0000-000000000002';
const KEY='30000000-0000-0000-0000-000000000003', ATTACHMENT='40000000-0000-0000-0000-000000000004';
const UPLOAD='50000000-0000-0000-0000-000000000005', TOKEN='synthetic.user.token';
const config={appOrigin:'https://messaging-test.vercel.app',projectOrigin:'https://abcdefghijklmnopqrst.supabase.co',
  publicKey:'synthetic-public',serviceKey:'synthetic-secret'};
const actor={expectedUserId:USER,expectedIdentityId:IDENTITY,conversationId:'38'};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function bytes() { return sharp({ create:{width:40,height:30,channels:3,background:'#99aabb'} }).webp().toBuffer(); }
function input(bytes) { return {...actor,requestKey:KEY,imageBase64:bytes.toString('base64'),sourceSha256:hash(bytes),sourceBytes:bytes.length,sourceMime:'image/webp'}; }
function fixture(source, options={}) {
  const calls=[], objects=new Map(); let state='reserved', web=null, uploadKey=null;
  const command=input(source), path='38/'+ATTACHMENT+'.webp';
  const envelope=()=>({schema_version:2,actor_user_id:USER,identity_id:IDENTITY,conversation_id:'38',request_key:KEY,
    attachment_id:ATTACHMENT,state,bucket:'message-attachments-v2',path,upload_key:uploadKey,
    source_sha256:command.sourceSha256,source_bytes:source.length,source_mime:'image/webp',
    web_sha256:web?.hash??null,web_bytes:web?.bytes??null,width:web?.width??null,height:web?.height??null,
    expires_at:'2026-11-01T00:00:00Z'});
  const transport={
    async authenticate(token,user) { calls.push(['auth',token,user]); if(options.authFail) throw new Error('auth'); assert.equal(user,USER); },
    async rpc(name,args,token) {
      calls.push([name,args,token]);
      if(name==='reserve_my_message_photo_v2') {assert.equal(token,TOKEN); return envelope();}
      if(name==='claim_message_photo_upload_v2') {
        assert.equal(token,null);
        if(!web) {web={hash:args.p_web_sha256,bytes:args.p_web_bytes,width:args.p_width,height:args.p_height};uploadKey=args.p_claim_key;}
        else assert.equal(args.p_web_sha256,web.hash);
        if(state==='reserved') state='uploading'; return envelope();
      }
      if(name==='finish_message_photo_upload_v2') {
        assert.equal(args.p_claim_key,uploadKey); if(options.finishLost) {state='ready';throw new Error('ack lost');}
        if(state==='tombstoned') return envelope(); state='ready';return envelope();
      }
      if(name==='get_my_message_photo_binding_v2') return options.binding??{schema_version:2,actor_user_id:USER,identity_id:IDENTITY,
        conversation_id:'38',message_id:'45',kind:'v2',attachment_id:ATTACHMENT,bucket:'message-attachments-v2',path,
        web_sha256:web.hash,web_bytes:web.bytes,width:web.width,height:web.height};
      if(name==='cancel_my_message_photo_v2') {state='tombstoned';return{schema_version:2,actor_user_id:USER,identity_id:IDENTITY,
        conversation_id:'38',attachment_id:ATTACHMENT,state};}
      throw new Error('unexpected rpc '+name);
    },
    async writeObject(bucket,p,data) {calls.push(['write',bucket,p]);assert.equal(p,path);
      if(options.writeUnknown) throw new Error('unknown');
      if(!objects.has(p)) objects.set(p,data.slice()); if(options.cancelDuringWrite) state='tombstoned';
      return{status:objects.has(p)?200:409,bytes:new Uint8Array()};},
    async readObject(bucket,p) {calls.push(['read',bucket,p]);return{status:objects.has(p)?200:404,bytes:objects.get(p)??new Uint8Array()};},
    async deleteObject(){throw new Error('unexpected delete');},
  };
  const service=createMessageImageService(config,{transport,uuid:()=>UPLOAD,maintenance:async()=>{calls.push(['maintenance']);}});
  return{service,calls,objects,command,transport,path,getState:()=>state};
}
test('native codec strips metadata, checks formats and dimensions, rejects malformed and animated input', async()=>{
  const withExif=await sharp({create:{width:100,height:60,channels:3,background:'#112233'}}).webp().withExif({IFD0:{Artist:'private synthetic metadata'}}).toBuffer();
  const canonical=await canonicalMessageImage(withExif);const metadata=await sharp(canonical.bytes).metadata();
  assert.equal(metadata.exif,undefined);assert.equal(metadata.icc,undefined);assert.equal(metadata.width,100);assert.equal(canonical.sha256,hash(canonical.bytes));
  const jpeg=await sharp(await bytes()).jpeg().toBuffer();await assert.rejects(canonicalMessageImage(jpeg),e=>e.code==='input');
  assert.ok((await canonicalMessageImage(jpeg,true)).bytes.length>0);
  const png=await sharp(await bytes()).png().toBuffer();assert.ok((await canonicalMessageImage(png,true)).bytes.length>0);
  await assert.rejects(canonicalMessageImage(Buffer.from('RIFFnot-a-real-imageWEBP')),e=>e.code==='input');
  const wide=await sharp({create:{width:1601,height:1,channels:3,background:'#aabbcc'}}).webp().toBuffer();
  await assert.rejects(canonicalMessageImage(wide),e=>e.code==='input');
  const frames=Buffer.alloc(32,255);frames.fill(0,16,32);for(let i=19;i<32;i+=4)frames[i]=255;
  const anim=await sharp(frames,{raw:{width:2,height:4,channels:4,pageHeight:2}}).webp({loop:0,delay:[10,10]}).toBuffer();
  await assert.rejects(canonicalMessageImage(anim),e=>e.code==='input');
});
test('upload freezes source digest, only service writes immutable path, verifies object and same-key replay does not write again', async()=>{
  const f=fixture(await bytes());const r=await f.service.upload(TOKEN,f.command);
  assert.equal(r.state,'ready');assert.equal(r.attachment_id,ATTACHMENT);assert.equal(r.actor_user_id,USER);
  assert.equal(f.calls.filter(c=>c[0]==='write').length,1);
  assert.deepEqual(await f.service.upload(TOKEN,f.command),r);assert.equal(f.calls.filter(c=>c[0]==='write').length,1);
  assert.equal(f.calls.find(c=>c[0]==='claim_message_photo_upload_v2')[2],null);
  const read=await f.service.read(TOKEN,{...actor,messageId:'45'});assert.equal(hash(read),f.objects.get(f.path)&&hash(f.objects.get(f.path)));
});
test('wrong source digest and unauthenticated actor cause no reservation/storage writes', async()=>{
  const f=fixture(await bytes());await assert.rejects(f.service.upload(TOKEN,{...f.command,sourceSha256:'a'.repeat(64)}),e=>e.code==='input');assert.equal(f.calls.length,0);
  const bad=fixture(await bytes(),{authFail:true});await assert.rejects(bad.service.upload(TOKEN,bad.command));assert.equal(bad.calls.length,1);
});
test('unknown upload stays recoverable; lost ready acknowledgement replays exact record', async()=>{
  const unknown=fixture(await bytes(),{writeUnknown:true});await assert.rejects(unknown.service.upload(TOKEN,unknown.command),e=>e.code==='outcome_unknown');
  assert.equal(unknown.getState(),'uploading');assert.equal(unknown.calls.some(c=>c[0]==='finish_message_photo_upload_v2'),false);
  const lost=fixture(await bytes(),{finishLost:true});await assert.rejects(lost.service.upload(TOKEN,lost.command));
  assert.equal((await lost.service.upload(TOKEN,lost.command)).state,'ready');assert.equal(lost.calls.filter(c=>c[0]==='write').length,1);
});
test('unexpected preexisting bytes are not overwritten and cannot become ready', async()=>{
  const f=fixture(await bytes());f.objects.set(f.path,new Uint8Array([1,2,3]));
  await assert.rejects(f.service.upload(TOKEN,f.command),e=>e.code==='outcome_unknown');assert.deepEqual([...f.objects.get(f.path)],[1,2,3]);
  assert.equal(f.calls.some(c=>c[0]==='finish_message_photo_upload_v2'),false);
});
test('a late write after cancellation cannot produce a usable receipt; cancel performs no direct deletion', async()=>{
  const f=fixture(await bytes(),{cancelDuringWrite:true});await assert.rejects(f.service.upload(TOKEN,f.command),e=>e.code==='response');
  assert.equal(f.getState(),'tombstoned');assert.ok(f.objects.size>0);
  const r=await f.service.cancel(TOKEN,{...actor,attachmentId:ATTACHMENT});assert.equal(r.state,'tombstoned');
});
test('legacy read requires authoritative exact conversation path, converts JPEG privately, rejects arbitrary URLs', async()=>{
  const binding={schema_version:2,actor_user_id:USER,identity_id:IDENTITY,conversation_id:'38',message_id:'45',kind:'legacy',attachment_id:null,
    bucket:'messages',path:'38/legacy-photo.jpg',web_sha256:null,web_bytes:null,width:null,height:null};
  const f=fixture(await bytes(),{binding});f.objects.set(binding.path,await sharp(await bytes()).jpeg().toBuffer());
  const result=await f.service.read(TOKEN,{...actor,messageId:'45'});assert.equal((await sharp(result).metadata()).format,'webp');
  for(const path of ['39/legacy-photo.jpg','38/../legacy-photo.jpg','https://foreign.example/photo.jpg','38/a%2fphoto.jpg']) {
    const bad=fixture(await bytes(),{binding:{...binding,path}});await assert.rejects(bad.service.read(TOKEN,{...actor,messageId:'45'}),e=>e.code==='response');
    assert.equal(bad.calls.some(c=>c[0]==='read'),false);
  }
});
test('maintenance is bounded and accepts only new-bucket tombstones; delete acknowledgement never removes ledger', async()=>{
  const calls=[];let claimKey;
  const transport={async rpc(name,args){calls.push([name,args]);if(name==='claim_message_photo_cleanup_v2'){claimKey=args.p_claim_key;return{schema_version:2,claims:[
    {attachment_id:ATTACHMENT,bucket:'message-attachments-v2',path:'38/'+ATTACHMENT+'.webp',cleanup_key:claimKey},
    {attachment_id:ATTACHMENT,bucket:'messages',path:'38/'+ATTACHMENT+'.webp',cleanup_key:claimKey},
  ]};}return{schema_version:2,attachment_id:ATTACHMENT,state:'tombstoned',next_cleanup_at:'2026-11-01T00:00:00Z'};},
  async deleteObject(bucket,path){calls.push(['delete',bucket,path]);return{status:200,bytes:new Uint8Array()};}};
  await runMessageImageMaintenance(config,undefined,undefined,transport);
  assert.equal(calls.filter(c=>c[0]==='delete').length,1);assert.equal(calls[0][1].p_limit,3);
  assert.equal(calls.find(c=>c[0]==='finish_message_photo_cleanup_v2')[1].p_removed,true);
});
test('HTTP route bounds streamed bodies before actor/storage IO and rejects cross-origin/missing-token requests', async()=>{
  let guard=0,uploads=0;const handler=createMessageImageHandler(config,{actorGuard:async()=>{guard++;},service:{
    upload:async()=>{uploads++;return{};},read:async()=>new Uint8Array([1]),cancel:async()=>({})}});
  const request=(body,extra={})=>new Request(config.appOrigin+'/api/v2/message-images/upload',{method:'POST',headers:{host:new URL(config.appOrigin).host,
    origin:config.appOrigin,authorization:'Bearer '+TOKEN,'content-type':'application/json',...extra},body});
  assert.equal((await handler(request('{}',{origin:'https://foreign.example'}),'upload')).status,403);
  assert.equal((await handler(request('{}',{authorization:''}),'upload')).status,401);
  assert.equal((await handler(request(' '.repeat(2000001)),'upload')).status,400);
  assert.equal(guard,0);assert.equal(uploads,0);
  const image=await handler(request(JSON.stringify({...actor,messageId:'45'})),'read');assert.equal(image.status,200);
  assert.equal(image.headers.get('cache-control'),'private, no-store');assert.equal(image.headers.get('cross-origin-resource-policy'),'same-origin');
});
test('browser upload parser binds full actor/context and private read returns Blob, not a storage URL', async()=>{
  const source=await bytes(), f=fixture(source),ready=await f.service.upload(TOKEN,f.command);
  const prepared={imageBase64:f.command.imageBase64,sourceSha256:f.command.sourceSha256,sourceBytes:source.length,sourceMime:'image/webp',
    preview:new Blob([source],{type:'image/webp'}),width:40,height:30};
  const c={...actor,requestKey:KEY};
  for(const patch of [{actor_user_id:IDENTITY},{identity_id:USER},{conversation_id:'39'},{request_key:ATTACHMENT}]) {
    const client=createMessageImageClient(async()=>Response.json({...ready,...patch}));await assert.rejects(client.upload(TOKEN,c,prepared),e=>e.code==='response');
  }
  const client=createMessageImageClient(async(url,init)=>{assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');assert.ok(url.startsWith('/api/v2/message-images/'));
    return new Response(source,{headers:{'content-type':'image/webp'}});});
  const blob=await client.read(TOKEN,{...actor,messageId:'45'});assert.ok(blob instanceof Blob);assert.equal(blob.type,'image/webp');
});
test('storage writes use service credentials and explicit no-overwrite, bounded stream cancels on overflow', async()=>{
  const calls=[];const transport=createMediaTransport(config,async(url,init)=>{calls.push([url,init]);return Response.json({});});
  await transport.writeObject('message-attachments-v2','38/'+ATTACHMENT+'.webp',new Uint8Array([1]));
  assert.equal(calls[0][1].headers.authorization,'Bearer '+config.serviceKey);assert.equal(calls[0][1].headers['x-upsert'],'false');assert.equal(calls[0][1].method,'POST');
  let cancelled=false;await assert.rejects(boundedMediaFetch(async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(10));},cancel(){cancelled=true;}})),
    'http://127.0.0.1/test',{},5),e=>e.code==='response');assert.equal(cancelled,true);
});
