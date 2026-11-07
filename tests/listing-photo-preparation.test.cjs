// Local bytes only: header resource guards and journal proof contract. Browser
// pixel/alpha/orientation output is additionally covered by the real UI fixture.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),sharp=require('sharp');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  fileName:filename,compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,esModuleInterop:true},
}).outputText,filename);
const shared=require('../src/shared/media/localImageHeader.ts');
const message=require('../src/entities/conversation/model/messageImageSelection.ts');
const {prepareListingPhoto}=require('../src/entities/listing/model/listingPhotoPreparation.ts');
const proofs=require('../src/entities/listing/model/publicationFilePreparation.ts');
const fixtures=path.join(__dirname,'fixtures/listing-publication-images-v1');
const source=name=>new Blob([fs.readFileSync(path.join(fixtures,name))],{type:'application/octet-stream'});
const noop=()=>{};
async function raster(width=4000,height=3000,orientation=1){return new Blob([await sharp({create:{width,height,channels:3,background:'#765432'}})
  .jpeg({quality:96}).withMetadata({orientation}).toBuffer()]);}
function browserStub(t,options={}){
  const prior={bitmap:global.createImageBitmap,document:global.document};let calls=0,closed=0,encoding;
  const transforms=[],canvas={width:0,height:0,getContext:()=>({transform:(...a)=>transforms.push(a),drawImage:noop}),
    toBlob:callback=>{encoding={width:canvas.width,height:canvas.height};
      if(options.encode)options.encode(callback);else callback(options.output??new Blob([new Uint8Array(1000)],{type:'image/webp'}));}};
  global.document={createElement:()=>canvas};
  global.createImageBitmap=async(file,args)=>{calls++;await options.decode?.();return {width:args.resizeWidth,height:args.resizeHeight,close:()=>closed++};};
  t.after(()=>{if(prior.bitmap===undefined)delete global.createImageBitmap;else global.createImageBitmap=prior.bitmap;
    if(prior.document===undefined)delete global.document;else global.document=prior.document;});
  return {canvas,transforms,get calls(){return calls;},get closed(){return closed;},get encoding(){return encoding;}};
}
test('messaging keeps the exact shared header function/error API and its independent original limits',()=>{
  assert.equal(message.readSelectedImageInfo,shared.readSelectedImageInfo);
  assert.equal(message.SelectedImageHeaderError,shared.SelectedImageHeaderError);
  assert.equal(message.MESSAGE_IMAGE_SELECTION_LIMITS.bytes,32*1024*1024);assert.equal(message.MESSAGE_IMAGE_SELECTION_LIMITS.pixels,64000000);
  assert.equal(message.MESSAGE_IMAGE_SELECTION_LIMITS.edge,32768);assert.equal(message.MESSAGE_IMAGE_SELECTION_LIMITS.chunks,8192);
});
for(const name of ['orientation-gps.jpg','orientation-text.png','still.webp'])test('shared bounded parser preserves orientation and strips local EXIF for '+name,async()=>{
  const original=source(name),before=Buffer.from(await original.arrayBuffer());
  const info=await shared.readSelectedImageInfo(original,noop),metadata=await sharp(Buffer.from(await info.source.arrayBuffer())).metadata();
  assert.equal(info.orientation,6);assert.equal(metadata.orientation,undefined);assert.equal(metadata.exif,undefined);
  assert.deepEqual(Buffer.from(await original.arrayBuffer()),before);
});
test('small photo keeps exact source bytes without decoding or lossy re-encoding',async t=>{
  const b=browserStub(t),original=source('plain.webp'),result=await prepareListingPhoto(original);
  assert.equal(result.recipe,'original-v1');assert.equal(result.bytes,original);assert.equal(b.calls,0);
});
test('prepared dimensions are bounded, orientation applied once, and bitmap/canvas released',async t=>{
  const b=browserStub(t),original=await raster(4000,3000,6),result=await prepareListingPhoto(original);
  assert.equal(result.recipe,'webp-2048-q90-v1');assert.ok(result.bytes.size<original.size);
  assert.deepEqual(b.encoding,{width:1536,height:2048});assert.deepEqual(b.transforms,[[0,1,-1,0,1536,0]]);
  assert.equal(b.closed,1);assert.equal(b.canvas.width,0);assert.equal(b.canvas.height,0);
});
for(const reason of ['larger output','unsupported WebP encoder'])test('preparation retains the original for '+reason,async t=>{
  const original=await raster(),output=reason==='larger output'?new Blob([new Uint8Array(original.size+1)],{type:'image/webp'}):new Blob(['png'],{type:'image/png'});
  const b=browserStub(t,{output}),result=await prepareListingPhoto(original);assert.equal(result.recipe,'original-v1');assert.equal(result.bytes,original);assert.equal(b.closed,1);
});
test('source dimension budget rejects before allocating browser pixels',async t=>{
  const b=browserStub(t),bytes=Buffer.from(await source('alpha.png').arrayBuffer());bytes.writeUInt32BE(16385,16);
  await assert.rejects(prepareListingPhoto(new Blob([bytes])),/image_rejected/);assert.equal(b.calls,0);
});
test('unsupported image signatures reject before pixel allocation',async t=>{
  const b=browserStub(t);await assert.rejects(prepareListingPhoto(new Blob(['GIF89a'])),/unsupported/);assert.equal(b.calls,0);
});
test('animated WebP cannot become an accepted still photo through canvas preprocessing',async t=>{
  const b=browserStub(t),bytes=await sharp({create:{width:3000,height:2,channels:4,background:'#ff000080'}}).webp().toBuffer();
  assert.equal(bytes.toString('ascii',12,16),'VP8X');bytes[20]|=0x02;
  await assert.rejects(prepareListingPhoto(new Blob([bytes])),/image_rejected/);assert.equal(b.calls,0);
});
test('cancellation after asynchronous decode releases pixels without encoding',async t=>{
  let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r),controller=new AbortController();
  const b=browserStub(t,{decode:async()=>{entered();await gate;}}),original=await raster(),pending=prepareListingPhoto(original,controller.signal);
  await started;controller.abort();release();await assert.rejects(pending);assert.equal(b.closed,1);assert.equal(b.encoding,undefined);
});
test('cancellation during encoding releases canvas and prevents prepared result',async t=>{
  let callback,entered;const started=new Promise(r=>entered=r),controller=new AbortController();
  const b=browserStub(t,{encode:cb=>{callback=cb;entered();}}),pending=prepareListingPhoto(await raster(),controller.signal);
  await started;controller.abort();callback(new Blob(['encoded'],{type:'image/webp'}));await assert.rejects(pending,/context_changed/);
  assert.equal(b.closed,1);assert.equal(b.canvas.width,0);assert.equal(b.canvas.height,0);
});
test('preparation journal metadata rejects unsupported versions, hidden fields and inconsistent raw/transfer binding',()=>{
  const good={version:1,clientFileId:'79000000-0000-0000-0000-000000000001',recipe:'webp-2048-q90-v1',
    originalBytes:100,originalSha256:'a'.repeat(64),uploadBytes:50,uploadSha256:'b'.repeat(64)};
  assert.ok(proofs.bindFilePreparation(good));
  for(const change of [r=>r.version=2,r=>r.recipe='original-v1',r=>r.uploadBytes=100,r=>r.originalSha256+='\n',r=>r.filename='secret',r=>r.uploadBytes=0]){
    const value=structuredClone(good);change(value);assert.throws(()=>proofs.bindFilePreparation(value));
  }
  assert.throws(()=>proofs.bindFilePreparations([good,good]));assert.throws(()=>proofs.bindFilePreparations(new Array(1)));
});
