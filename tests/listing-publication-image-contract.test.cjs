'use strict';
// Closed value/byte-boundary tests. Native decoding is in the separate native suite.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../src/server/listing-publication/images/image-contract.cjs'),P=C.IMAGE_POLICY;
const image=name=>fs.readFileSync(path.join(__dirname,'fixtures/listing-publication-images-v1',name));
const throws=(fn,code)=>assert.throws(fn,e=>e instanceof C.PublicationImageError&&e.code===code);
test('closed immutable recipe matches existing 25 MiB source and bounded new output',()=>{
 assert.ok(Object.isFrozen(P));assert.equal(P.maxSourceBytes,25*1024*1024);assert.equal(P.maxSourcePixels,40_000_000);
 assert.equal(P.maxSourceEdge,16384);assert.equal(P.maxOutputEdge,2048);assert.equal(P.maxOutputBytes,4*1024*1024);
 assert.equal(P.nativeTimeoutSeconds,6);assert.equal(P.processTimeoutMs,12000);
 assert.throws(()=>{P.maxSourcePixels=Infinity;},TypeError);
});
for(const name of ['orientation-gps.jpg','alpha.png','plain.webp']) test('real magic type, independent of filename: '+name,()=>{
 assert.equal(C.preflightImage(image(name)),name.endsWith('jpg')?'jpeg':name.endsWith('png')?'png':'webp');
});
for(const [label,patch,code] of [
 ['absent width',{width:undefined},'image_decode_failed'],['zero width',{width:0},'image_decode_failed'],
 ['negative height',{height:-1},'image_decode_failed'],['string width',{width:'96'},'image_decode_failed'],
 ['infinite height',{height:Infinity},'image_decode_failed'],['fraction width',{width:1.1},'image_decode_failed'],
 ['wrong format',{format:'svg'},'image_type_unsupported'],['multiple frames',{pages:2},'image_animation_unsupported'],
 ['zero frames',{pages:0},'image_animation_unsupported'],['page height',{pageHeight:64},'image_animation_unsupported'],
 ['delay list',{delay:[100]},'image_animation_unsupported'],['40M+ pixels',{width:8001,height:5000},'image_pixels_exceeded'],
 ['edge too tall',{height:16385},'image_pixels_exceeded'],['edge too wide',{width:16385},'image_pixels_exceeded'],
 ['orientation zero',{orientation:0},'image_decode_failed'],['orientation nine',{orientation:9},'image_decode_failed'],
 ['orientation text',{orientation:'6'},'image_decode_failed'],
]) test('metadata rejects '+label,()=>throws(()=>C.validateSourceMetadata({format:'jpeg',width:96,height:64,...patch},'jpeg'),code));
test('inclusive pixel/edge boundaries accepted as values, not proof of native decode',()=>{
 C.validateSourceMetadata({format:'jpeg',width:8000,height:5000},'jpeg');
 C.validateSourceMetadata({format:'png',width:16384,height:1,pages:1},'png');
});
for(const key of ['exif','icc','iptc','xmp','orientation']) test('actual output metadata contract forbids '+key,()=>{
 const good={format:'webp',width:96,height:64};
 throws(()=>C.validateOutputMetadata({...good,[key]:key==='orientation'?1:Buffer.from('PRIVATE')},good,image('plain.webp')),'image_output_invalid');
});
for(const [label,meta,info,code] of [
 ['wrong container',{format:'jpeg',width:96,height:64},{format:'webp',width:96,height:64},'image_output_invalid'],
 ['mismatched width',{format:'webp',width:97,height:64},{format:'webp',width:96,height:64},'image_output_invalid'],
 ['oversized edge',{format:'webp',width:2049,height:64},{format:'webp',width:2049,height:64},'image_output_invalid'],
 ['fractional edge',{format:'webp',width:96.5,height:64},{format:'webp',width:96.5,height:64},'image_output_invalid'],
 ['zero height',{format:'webp',width:96,height:0},{format:'webp',width:96,height:0},'image_output_invalid'],
 ['animation',{format:'webp',width:96,height:64,pages:2},{format:'webp',width:96,height:64},'image_output_invalid'],
 ['comments',{format:'webp',width:96,height:64,comments:['PRIVATE']},{format:'webp',width:96,height:64},'image_output_invalid'],
]) test('output validation rejects '+label,()=>throws(()=>C.validateOutputMetadata(meta,info,image('plain.webp')),code));
test('actual output byte cap enforced before interpreting metadata',()=>{
 throws(()=>C.validateOutputMetadata({}, {}, Buffer.alloc(P.maxOutputBytes+1)),'image_output_too_large');
});
test('WebP advertised container length cannot hide trailing bytes',()=>{
 throws(()=>C.preflightImage(Buffer.concat([image('plain.webp'),Buffer.from('hidden')])),'image_structure_invalid');
});
test('WebP chunk cannot overflow available bytes',()=>{
 const b=image('plain.webp');b.writeUInt32LE(0xffffffff,16);throws(()=>C.preflightImage(b),'image_structure_invalid');
});
test('WebP short chunk header is rejected',()=>{
 const b=Buffer.concat([image('plain.webp'),Buffer.from('bad')]);b.writeUInt32LE(b.length-8,4);
 throws(()=>C.preflightImage(b),'image_structure_invalid');
});
test('PNG must end at its IEND, not before appended text',()=>{
 throws(()=>C.preflightImage(Buffer.concat([image('alpha.png'),Buffer.from('hidden')])),'image_structure_invalid');
});
test('PNG must have an IEND',()=>{
 const b=image('alpha.png');throws(()=>C.preflightImage(b.subarray(0,b.length-12)),'image_structure_invalid');
});
test('PNG declared chunk length cannot overflow or wrap',()=>{
 const b=image('alpha.png');b.writeUInt32BE(0xffffffff,8);throws(()=>C.preflightImage(b),'image_structure_invalid');
});
test('PNG IHDR must be first and fixed length',()=>{
 const b=image('alpha.png');b.write('IDAT',12,'ascii');throws(()=>C.preflightImage(b),'image_structure_invalid');
});
test('unknown/native error codes never become user-visible arbitrary text',()=>{
 for(const message of ['SECRET /tmp/photo.jpg','ENOENT',null,{},undefined]) assert.equal(new C.PublicationImageError(message).message,'image_processor_failed');
});
test('no network, persistence, publishing or cleanup is hidden in image modules',()=>{
 const root=path.resolve(__dirname,'../src/server/listing-publication/images');
 for(const name of ['sanitize.cjs','worker.cjs','image-contract.cjs']) {
  const s=fs.readFileSync(path.join(root,name),'utf8');
  assert.doesNotMatch(s,/require\(['"](?:https?|net|tls|@supabase|node:fs)/);
  assert.doesNotMatch(s,/\b(?:fetch|unlink|writeFile|createSignedUploadUrl|rpc)\s*\(/);
 }
});
test('PNG preflight bounds total chunks, not just bytes',()=>{
 const input=image('alpha.png'),end=input.length-12,chunk=Buffer.alloc(12);chunk.write('tEXt',4,'ascii');
 const bytes=Buffer.concat([input.subarray(0,end),...Array(P.maxContainerChunks).fill(chunk),input.subarray(end)]);
 throws(()=>C.preflightImage(bytes),'image_structure_invalid');
});
test('WebP preflight bounds total chunks, not just bytes',()=>{
 const input=image('plain.webp'),chunk=Buffer.alloc(8);chunk.write('JUNK',0,'ascii');
 const bytes=Buffer.concat([input,...Array(P.maxContainerChunks).fill(chunk)]);bytes.writeUInt32LE(bytes.length-8,4);
 throws(()=>C.preflightImage(bytes),'image_structure_invalid');
});
