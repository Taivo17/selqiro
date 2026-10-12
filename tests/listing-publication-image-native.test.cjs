'use strict';
// Actual native decoder + child process + encoded synthetic image fixtures.
// Not a Storage/DB/HTTP/React/Vercel test. Never uses the user's photographs.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const sharp = require('sharp');
const dir = path.join(__dirname, 'fixtures/listing-publication-images-v1');
const image = name => fs.readFileSync(path.join(dir, name));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const {sanitizeListingImage: sanitize, PublicationImageError} = require('../src/server/listing-publication/images/sanitize.cjs');
const C = require('../src/server/listing-publication/images/image-contract.cjs');
const P = C.IMAGE_POLICY;
const rejects = (fn, code) => assert.rejects(fn, e => e instanceof PublicationImageError && e.code === code && e.message === code);
const corners = ['R','G','B','Y'];
const colors = {R:[240,20,20], G:[20,220,20], B:[20,20,235], Y:[235,220,20]};
function setOrientation(bytes, value) {
  const b = Buffer.from(bytes), start = b.indexOf(Buffer.from('Exif\0\0')) + 6;
  assert.ok(start > 6); const le = b.toString('ascii', start, start+2) === 'II';
  const u16 = off => le ? b.readUInt16LE(off) : b.readUInt16BE(off);
  const u32 = off => le ? b.readUInt32LE(off) : b.readUInt32BE(off);
  const ifd = start + u32(start+4);
  for (let i=0;i<u16(ifd);i++) {
    const e=ifd+2+i*12;
    if(u16(e)===274) { if(le)b.writeUInt16LE(value,e+8); else b.writeUInt16BE(value,e+8); return b; }
  }
  assert.fail('Fixture has no orientation tag');
}
async function assertCorners(buffer, order) {
  const {data, info} = await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const pts = [[.2,.2],[.8,.2],[.2,.8],[.8,.8]];
  for(let i=0;i<4;i++) {
    const x=Math.floor(info.width*pts[i][0]),y=Math.floor(info.height*pts[i][1]);
    const at=(y*info.width+x)*info.channels, expected=colors[order[i]];
    for(let c=0;c<3;c++) assert.ok(Math.abs(data[at+c]-expected[c])<24, `corner ${i} channel ${c}`);
  }
}
function noPrivateMetadata(meta) {
  for(const k of ['exif','icc','iptc','xmp','orientation']) assert.equal(meta[k],undefined,k);
  assert.equal(meta.hasProfile,false);
}

test('fixtures are exact, encoded, synthetic and contain source GPS/ICC/description', async()=>{
  const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
  assert.equal(m.kind,'generated_synthetic_images_no_user_data');
  for(const [name,v] of Object.entries(m.files)) {const b=image(name);assert.equal(b.length,v.bytes);assert.equal(hash(b),v.sha256);}
  const meta=await sharp(image('orientation-gps.jpg')).metadata();
  assert.equal(meta.orientation,6);assert.ok(meta.exif);assert.ok(meta.icc);
  assert.ok(meta.exif.includes(Buffer.from('SYNTHETIC_PRIVATE_DESCRIPTION')));
  // The TIFF IFD0 has a GPS IFD pointer (tag 0x8825), not merely an EXIF label.
  assert.ok(meta.exif.includes(Buffer.from([0x88,0x25])) || meta.exif.includes(Buffer.from([0x25,0x88])));
});
const oriented = {1:corners,2:['G','R','Y','B'],3:['Y','B','G','R'],4:['B','Y','R','G'],
  5:['R','B','G','Y'],6:['B','R','Y','G'],7:['Y','G','B','R'],8:['G','Y','R','B']};
for(const [raw,order] of Object.entries(oriented)) test(`real JPEG EXIF orientation ${raw}: pixels correct; metadata absent`,async()=>{
  const n=Number(raw), source=setOrientation(image('orientation-gps.jpg'),n);
  const result=await sanitize(source);const meta=await sharp(result.buffer).metadata();
  assert.equal(result.width,n>=5?64:96);assert.equal(result.height,n>=5?96:64);
  assert.equal(meta.width,result.width);noPrivateMetadata(meta);await assertCorners(result.buffer,order);
  assert.equal(result.sourceSha256,hash(source));assert.equal(result.sha256,hash(result.buffer));
  assert.equal(result.sourceByteLength,source.length);assert.equal(result.byteLength,result.buffer.length);
  assert.equal(result.engine.sharp,sharp.versions.sharp);assert.equal(result.engine.libvips,sharp.versions.vips);
  assert.equal(result.pipelineVersion,'listing-web-v1');assert.equal(result.contentType,'image/webp');
  for(const text of ['SYNTHETIC_PRIVATE_DESCRIPTION','SYNTHETIC_CAMERA_NOT_A_PERSON']) assert.equal(result.buffer.includes(Buffer.from(text)),false);
});
for(const [name,format] of [['orientation-text.png','png'],['still.webp','webp']]) test(`real ${format} orientation + metadata stripped`,async()=>{
  const result=await sanitize(image(name));assert.equal(result.sourceFormat,format);
  assert.equal(result.width,64);assert.equal(result.height,96);noPrivateMetadata(await sharp(result.buffer).metadata());
  await assertCorners(result.buffer,oriented[6]);assert.equal(result.buffer.includes(Buffer.from('SYNTHETIC_PRIVATE_LOCATION')),false);
});
test('transparent pixels remain transparent; small photo is not enlarged',async()=>{
  const result=await sanitize(image('alpha.png'));
  const {data,info}=await sharp(result.buffer).raw().toBuffer({resolveWithObject:true});
  assert.equal(info.channels,4);assert.equal(info.width,96);assert.equal(info.height,64);
  assert.ok(Math.abs(data[3]-128)<2);noPrivateMetadata(await sharp(result.buffer).metadata());
});
test('actual 3000x2000 input is fully decoded and resized inside 2048',async()=>{
  const source=await sharp(image('plain.webp')).resize(3000,2000).jpeg({quality:95}).toBuffer();
  const result=await sanitize(source);assert.equal(result.width,2048);assert.equal(result.height,1365);
  assert.ok(result.buffer.length<=P.maxOutputBytes);await assertCorners(result.buffer,corners);
});
test('source Buffer mutation after dispatch cannot change processed source or hash',async()=>{
  const source=image('alpha.png'),expected=hash(source),saved=Buffer.from(source);
  const promise=sanitize(source);source.fill(0);const result=await promise;
  assert.equal(result.sourceSha256,expected);assert.equal(result.sourceByteLength,saved.length);
  assert.notEqual(result.sha256,hash(source));
});
test('concurrent native call fails busy without starting another decoder',async()=>{
  const first=sanitize(image('alpha.png'));
  await rejects(()=>sanitize(image('alpha.png')),'image_processor_busy');
  await first;assert.ok((await sanitize(image('alpha.png'))).width>0);
});
for(const name of ['animated.png','animated.webp']) test(`rejects actual ${name} without flattening silently`,()=>
  rejects(()=>sanitize(image(name)),'image_animation_unsupported'));
for(const [label,value,code] of [
  ['null',null,'image_input_required'],['empty',Buffer.alloc(0),'image_input_required'],
  ['Uint8Array',new Uint8Array([255,216,255]),'image_input_required'],['file path','/tmp/private.jpg','image_input_required'],
  ['SVG',Buffer.from('<svg width="10" height="10"/>'),'image_type_unsupported'],
  ['GIF',Buffer.from('GIF89a'),'image_type_unsupported'],['HTML',Buffer.from('<html>not a jpeg</html>'),'image_type_unsupported'],
  ['PDF',Buffer.from('%PDF-1.7'),'image_type_unsupported'],['gzip SVG',Buffer.from([31,139,8,0]),'image_type_unsupported'],
  ['fake MIME bytes',Buffer.from('image/jpeg'),'image_type_unsupported'],
]) test(`untrusted ${label} is not an image authorization`,()=>rejects(()=>sanitize(value),code));
test('25 MiB + 1 bytes rejected before native spawn',()=>rejects(()=>sanitize(Buffer.alloc(P.maxSourceBytes+1)),'image_source_too_large'));
test('boundary 25 MiB still requires actual image decoding',()=>{
  const bytes=Buffer.alloc(P.maxSourceBytes);bytes.set([255,216,255]);
  return rejects(()=>sanitize(bytes),'image_decode_failed');
});
test('truncated JPEG header is rejected by actual decoder',()=>rejects(()=>sanitize(Buffer.from([255,216,255])),'image_decode_failed'));
test('truncated JPEG scan is not accepted just because metadata parses',()=>{
  const b=image('orientation-gps.jpg'); return rejects(()=>sanitize(b.subarray(0,b.length-24)),'image_decode_failed');
});
test('corrupt PNG chunk CRC/data is rejected by actual decoder',()=>{
  const b=image('alpha.png');const at=b.indexOf(Buffer.from('IDAT'));b[at+9]^=255;
  return rejects(()=>sanitize(b),'image_decode_failed');
});
test('actual over-wide JPEG rejected even below pixel-count ceiling',async()=>{
  const b=await sharp({create:{width:P.maxSourceEdge+1,height:1,channels:3,background:'white'}}).jpeg().toBuffer();
  await rejects(()=>sanitize(b),'image_pixels_exceeded');
});
test('output is a real single-frame WebP, not original image bytes',async()=>{
  const source=image('plain.webp'),result=await sanitize(source);
  assert.notDeepEqual(result.buffer,source);const m=await sharp(result.buffer).metadata();
  assert.equal(m.format,'webp');assert.equal(m.pages,undefined);assert.equal(m.space,'srgb');
  assert.deepEqual(Object.keys(result).sort(),['buffer','byteLength','contentType','engine','height','pipelineVersion',
    'sha256','sourceByteLength','sourceFormat','sourceSha256','width'].sort());
});
test('failure contains no native error, file path or photograph metadata',async()=>{
  const b=Buffer.concat([Buffer.from([255,216,255]),Buffer.from('PRIVATE_FILENAME GPS TOKEN')]);
  try{await sanitize(b);assert.fail('must reject');}catch(e){assert.equal(e.code,'image_decode_failed');
    assert.equal(e.message,e.code);assert.equal(e.cause,undefined);assert.equal(JSON.stringify(e).includes('PRIVATE_'),false);}
});
test('actual JPEG XMP block is recognized in source and absent from output',async()=>{
 const source=image('orientation-gps.jpg');
 const xmp=Buffer.from('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta xmlns:x="adobe:ns:meta/">SYNTHETIC_PRIVATE_XMP</x:xmpmeta>');
 const marker=Buffer.alloc(4);marker[0]=255;marker[1]=225;marker.writeUInt16BE(xmp.length+2,2);
 const bytes=Buffer.concat([source.subarray(0,2),marker,xmp,source.subarray(2)]);
 assert.ok((await sharp(bytes).metadata()).xmp);
 const result=await sanitize(bytes);noPrivateMetadata(await sharp(result.buffer).metadata());
 assert.equal(result.buffer.includes(Buffer.from('SYNTHETIC_PRIVATE_XMP')),false);
});
test('real supervisor kills a hung child at deadline; fake worker is ONLY in exclusive temp fixture',async()=>{
 const os=require('node:os');const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'selqiro-image-process-test-'));
 try {
  for(const name of ['sanitize.cjs','image-contract.cjs']) fs.copyFileSync(path.resolve(__dirname,'../src/server/listing-publication/images',name),path.join(tmp,name));
  const pidfile=path.join(tmp,'child.pid');
  fs.writeFileSync(path.join(tmp,'worker.cjs'),
   `require('node:fs').writeFileSync(${JSON.stringify(pidfile)},String(process.pid),{flag:'wx'}); process.stdin.resume(); setInterval(()=>{},1000);`);
  const isolated=require(path.join(tmp,'sanitize.cjs')),started=Date.now();
  await assert.rejects(isolated.sanitizeListingImage(image('alpha.png')),e=>e.code==='image_processing_timeout');
  assert.ok(Date.now()-started>=P.processTimeoutMs-100);
  const pid=Number(fs.readFileSync(pidfile,'utf8'));assert.ok(Number.isSafeInteger(pid)&&pid>0);
  let gone=false;
  for(let i=0;i<60;i++) {try{process.kill(pid,0);}catch(e){if(e.code==='ESRCH'){gone=true;break;}throw e;}await new Promise(r=>setTimeout(r,25));}
  assert.ok(gone,'The child process must actually stop; a rejected promise is insufficient.');
 } finally {fs.rmSync(tmp,{recursive:true,force:true});} // only this test's exclusive fixture
});
