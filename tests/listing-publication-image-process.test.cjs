'use strict';
// Actual supervisor source with SYNTHETIC process/pipes/clock, for deterministic
// crash, timeout and protocol failure tests. Real native happy/error paths are separate.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {EventEmitter}=require('node:events'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../src/server/listing-publication/images');
const C=require(path.join(dir,'image-contract.cjs')),P=C.IMAGE_POLICY;
const source=fs.readFileSync(path.join(__dirname,'fixtures/listing-publication-images-v1/alpha.png'));
const webp=fs.readFileSync(path.join(__dirname,'fixtures/listing-publication-images-v1/plain.webp'));
function frame(header,bytes=Buffer.alloc(0)) {const b=Buffer.from(JSON.stringify(header)),n=Buffer.alloc(4);n.writeUInt32BE(b.length);return Buffer.concat([n,b,bytes]);}
const success=()=>({ok:true,pipelineVersion:P.version,sourceFormat:'png',width:96,height:64,engine:{sharp:'0.34.5',libvips:'8.17.3'}});
function harness({spawnThrows=false,browser=false}={}) {
 const calls=[],timers=[];let fake;
 function spawn(...args) {
  calls.push(args);if(spawnThrows)throw new Error('SECRET spawn detail');
  fake=new EventEmitter();fake.stdin=new EventEmitter();fake.stdout=new EventEmitter();fake.stderr=new EventEmitter();
  fake.stdin.end=b=>{fake.input=Buffer.from(b);};fake.kills=[];fake.kill=signal=>{fake.kills.push(signal);return true;};return fake;
 }
 const mod={exports:{}};const sandbox={module:mod,exports:mod.exports,__dirname:dir,Buffer,Error,Promise,
  process:{execPath:process.execPath,env:{NODE_OPTIONS:'SECRET',SUPABASE_SERVICE_ROLE_KEY:'SECRET'}},
  require:name=>name==='node:child_process'?{spawn}:name==='./image-contract.cjs'?C:require(name),
  setTimeout:(fn,ms)=>{const t={fn,ms,cleared:false};timers.push(t);return t;},clearTimeout:t=>{t.cleared=true;}};
 if(browser)sandbox.window={};
 vm.runInNewContext(fs.readFileSync(path.join(dir,'sanitize.cjs'),'utf8'),sandbox,{timeout:1000});
 return {run:mod.exports.sanitizeListingImage,calls,timers,get child(){return fake;},
  finish(data,code=0,signal=null){if(data)fake.stdout.emit('data',data);fake.emit('close',code,signal);}};
}
const check=(promise,code)=>assert.rejects(promise,e=>e.code===code&&e.message===code);
test('browser import fails before native decoder or environment access',()=>assert.throws(()=>harness({browser:true}),/listing_image_server_only/));
test('server has a hard process deadline and no secret/environment/shell inheritance',async()=>{
 const h=harness(),p=h.run(source);const [exe,args,options]=h.calls[0];assert.equal(exe,process.execPath);
 assert.deepEqual(Array.from(args),[path.join(dir,'worker.cjs')]);assert.equal(options.shell,false);
 assert.deepEqual(JSON.parse(JSON.stringify(options.env)),{LANG:'C',TZ:'UTC',UV_THREADPOOL_SIZE:'1'});
 assert.equal(h.timers[0].ms,12000);h.finish(frame(success(),webp));await p;assert.equal(h.timers[0].cleared,true);
});
test('Promise timeout kills native process and holds lock until actual close',async()=>{
 const h=harness(),p=h.run(source);h.timers[0].fn();await check(p,'image_processing_timeout');
 assert.deepEqual(h.child.kills,['SIGKILL']);await check(h.run(source),'image_processor_busy');
 h.finish(null,null,'SIGKILL');const next=h.run(source);h.finish(frame(success(),webp));await next;
});
test('a late success after timeout is never accepted',async()=>{
 const h=harness(),p=h.run(source);h.timers[0].fn();h.finish(frame(success(),webp));await check(p,'image_processing_timeout');
});
test('spawn exception does not leak errors or permanently occupy local slot',async()=>{
 const h=harness({spawnThrows:true});await check(h.run(source),'image_processor_unavailable');await check(h.run(source),'image_processor_unavailable');
});
test('async spawn error rejected; only close releases busy state',async()=>{
 const h=harness(),p=h.run(source);h.child.emit('error',new Error('PRIVATE spawn'));
 await check(p,'image_processor_unavailable');await check(h.run(source),'image_processor_busy');h.finish(null,-2);
});
for(const name of ['stdin','stdout','stderr']) test(name+' pipe failure is not assumed successful',async()=>{
 const h=harness(),p=h.run(source);h.child[name].emit('error',new Error('PRIVATE pipe'));
 await check(p,'image_processor_failed');assert.deepEqual(h.child.kills,['SIGKILL']);h.finish(null,1);
});
test('oversized stdout killed while streaming, before buffering unbounded bytes',async()=>{
 const h=harness(),p=h.run(source);h.child.stdout.emit('data',Buffer.alloc(P.maxOutputBytes+P.maxHeaderBytes+5));
 await check(p,'image_processor_protocol_invalid');assert.deepEqual(h.child.kills,['SIGKILL']);h.finish(null,1);
});
test('stderr is bounded and never used as a public error',async()=>{
 const h=harness(),p=h.run(source);h.child.stderr.emit('data',Buffer.alloc(P.maxStderrBytes+1,65));
 await check(p,'image_processor_failed');h.finish(null,1);
});
for(const [code,signal] of [[1,null],[0,'SIGKILL'],[null,'SIGSEGV']]) test('native exit failure '+String(code)+' '+String(signal),async()=>{
 const h=harness(),p=h.run(source);h.finish(frame(success(),webp),code,signal);await check(p,'image_processor_failed');
});
for(const [label,bytes] of [
 ['empty',Buffer.alloc(0)],['short prefix',Buffer.from([0,0])],['huge header',Buffer.from([255,255,255,255])],
 ['truncated JSON',Buffer.from([0,0,0,4,123])],['invalid JSON',Buffer.from([0,0,0,2,120,120])],
 ['array header',frame([])],['unknown error',frame({ok:false,code:'PRIVATE EXIF'})],
 ['error with bytes',frame({ok:false,code:'image_decode_failed'},webp)],
 ['success without bytes',frame(success())],['extra field',frame({...success(),secret:'no'},webp)],
 ['source mismatch',frame({...success(),sourceFormat:'jpeg'},webp)],
 ['recipe mismatch',frame({...success(),pipelineVersion:'other'},webp)],
 ['bad width',frame({...success(),width:2049},webp)],['string height',frame({...success(),height:'64'},webp)],
 ['zero width',frame({...success(),width:0},webp)],['bad engine',frame({...success(),engine:{sharp:'path-secret',libvips:'8.17.3'}},webp)],
 ['extra engine field',frame({...success(),engine:{...success().engine,token:'secret'}},webp)],
 ['not WebP',frame(success(),source)],['missing ok',frame({pipelineVersion:P.version},webp)],
 ]) test('protocol rejects '+label,async()=>{const h=harness(),p=h.run(source);h.finish(bytes);await check(p,'image_processor_protocol_invalid');});
test('known error result maps one fixed code and releases local slot',async()=>{
 const h=harness(),p=h.run(source);h.finish(frame({ok:false,code:'image_decode_failed'}));await check(p,'image_decode_failed');
 const next=h.run(source);h.finish(frame(success(),webp));await next;
});
test('frame split across chunks gives one result with parent-computed hashes',async()=>{
 const h=harness(),p=h.run(source),b=frame(success(),webp);
 for(let i=0;i<b.length;i+=3)h.child.stdout.emit('data',b.subarray(i,i+3));h.finish(null);
 const r=await p,crypto=require('node:crypto');assert.equal(r.sha256,crypto.createHash('sha256').update(webp).digest('hex'));
 assert.equal(r.byteLength,webp.length);assert.ok(Object.isFrozen(r));assert.ok(Object.isFrozen(r.engine));
});
