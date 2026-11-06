// Focused append controller/model cases; no live Auth, Storage or database.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), crypto = require('node:crypto'), ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename, compilerOptions: {target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true},
}).outputText, filename);
const {ManagedPhotoAdditionSession} = require('../src/features/listing-edit/model/managedPhotoAdditionSession.ts');
const model = require('../src/entities/listing/model/managedListingPhotoAddition.ts');
const galleryModel = require('../src/entities/listing/model/managedListingImages.ts');
const U='71000000-0000-0000-0000-000000000001', I='72000000-0000-0000-0000-000000000002';
const A='73000000-0000-0000-0000-000000000003', CHILD='74000000-0000-0000-0000-000000000004';
const SLOT='75000000-0000-0000-0000-000000000005', READY='76000000-0000-0000-0000-000000000006';
const JOB='77000000-0000-0000-0000-000000000007', ORIGIN='https://abcdefghijklmnopqrst.supabase.co';
const KEY={userId:U,identityId:I,listingId:'201',attemptId:A}, STAMP='2026-11-06T12:00:00.000000Z';
const copy=v=>structuredClone(v), digest=async b=>crypto.createHash('sha256').update(Buffer.from(await b.arrayBuffer())).digest('hex');
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function original(count=2) {
  return {schema_version:2,actor_user_id:U,identity_id:I,listing_id:KEY.listingId,attempt_id:A,revision:'5',
    images:Array.from({length:count},(_,ordinal)=>({ordinal,media_attempt_id:A,media_ordinal:ordinal,
      url:`/api/v2/listing-media/${A}/${ordinal}`,is_primary:ordinal===0}))};
}
function harness(options={}) {
  const h={journal:null,requests:[],puts:[],shown:[],writes:[],uuid:0,closed:false,snapshot:null,receipt:null,
    gallery:original(options.count??2),signal:new AbortController(),busy:false,rejectJournal:false,verifyReady:true};
  h.envelope=()=>({schema_version:1,listing_id:KEY.listingId,attempt_id:A,request_key:h.requestKey,
    snapshot:copy(h.snapshot),receipt:copy(h.receipt),intent_closed:h.closed,gallery:copy(h.gallery)});
  h.ready=()=>({kind:'ready',receipt:{schema_version:1,attempt_id:CHILD,slot_id:SLOT,receipt_id:READY,job_id:JOB,pipeline_version:'listing-web-v1'}});
  h.part=()=>({kind:'part',attemptId:CHILD,slotId:SLOT,upload:{
    url:`${ORIGIN}/storage/v1/s3/listing-publication-private/v1/${CHILD}/${SLOT}/source.upload?partNumber=1&uploadId=synthetic`,
    headers:{'content-type':'application/octet-stream'},expiresAt:Date.now()+60000,
    expectedBytes:h.snapshot.slots[0].expected_bytes,sha256:h.snapshot.slots[0].expected_sha256}});
  h.server=(action,args)=>{
    if(action==='owner-images-add-prepare') {
      if(h.closed) throw Error('closed_request');
      if(!h.snapshot) {
        if(args.p_expected_revision!==h.gallery.revision) throw {code:'40001',message:'listing_images_conflict'};
        h.requestKey=args.p_request_key;
        h.snapshot={schema_version:1,attempt_id:CHILD,request_key:h.requestKey,actor_user_id:U,identity_id:I,state:'open',
          created_at:STAMP,expires_at:'2026-11-07T12:00:00.000000Z',
          payload:{schema_version:1,purpose:'listing_image_addition',parent_attempt_id:A,listing_id:KEY.listingId},
          slots:[{slot_id:SLOT,ordinal:0,client_file_id:args.p_image.client_file_id,
            expected_bytes:args.p_image.byte_length,expected_sha256:args.p_image.sha256}]};
      }
      return {...h.envelope(),replayed:false};
    }
    if(action==='owner-images-add-status') { h.requestKey=args.p_request_key;return h.envelope(); }
    if(action==='owner-images-add-cancel') {
      h.requestKey=args.p_request_key;h.closed=true;
      if(h.snapshot&&!h.receipt) h.snapshot={...h.snapshot,state:'cancelled',payload:null};
      return h.envelope();
    }
    if(action==='image-prepare')return h.part();
    if(action==='image-verify')return h.verifyReady?h.ready():{kind:'needs_attention'};
    if(action==='owner-images-add-append') {
      assert.equal(args.p_addition_attempt_id,CHILD);assert.equal(args.p_ready_id,READY);
      if(h.receipt)return {...h.envelope(),replayed:true};
      if(args.p_expected_revision!==h.gallery.revision)throw {code:'40001',message:'listing_images_conflict'};
      const revision=String(BigInt(h.gallery.revision)+1n),ordinal=12,primary=h.gallery.images.length===0;
      h.receipt={schema_version:1,listing_id:KEY.listingId,attempt_id:A,addition_attempt_id:CHILD,
        request_key:h.requestKey,actor_user_id:U,identity_id:I,slot_id:SLOT,ready_id:READY,ordinal,
        media_attempt_id:CHILD,media_ordinal:0,url:`/api/v2/listing-media/${CHILD}/0`,
        attached_at:STAMP,attached_revision:revision,was_primary:primary};
      h.gallery={...h.gallery,revision,images:[...h.gallery.images,{ordinal,media_attempt_id:CHILD,media_ordinal:0,
        url:h.receipt.url,is_primary:primary}]};
      h.snapshot={...h.snapshot,state:'published',payload:null};
      return {...h.envelope(),replayed:false};
    }
    throw Error('unexpected_action '+action);
  };
  h.deps={key:KEY,projectOrigin:ORIGIN,
    readJournal:()=>copy(h.journal),writeJournal:value=>{if(h.rejectJournal||options.writeJournal?.(value,h))throw Error('journal_denied');
      h.journal=copy(value);h.writes.push(copy(value));},clearJournal:()=>{h.journal=null;},
    runOwnerOperation:async(key,work)=>{assert.deepEqual(key,KEY);if(h.busy)throw Error('owner_busy');h.busy=true;
      try{return await work({signal:h.signal.signal,checkContext:()=>{if(h.signal.signal.aborted)throw Error('context_changed');},
        showGallery:gallery=>h.shown.push(copy(gallery))});}finally{h.busy=false;}},
    withLock:options.withLock??(async work=>work()),
    request:async(action,args,signal)=>{h.requests.push({action,args:copy(args),signal,journal:copy(h.journal)});
      const custom=await options.request?.(action,args,h);return custom===undefined?h.server(action,args):custom;},
    readGallery:async()=>{await options.readGallery?.(h);return galleryModel.parseManagedListingImages(copy(h.gallery),KEY);},
    putPart:async(url,headers,bytes,signal)=>{h.puts.push({url,headers,text:await bytes.text(),signal,journal:copy(h.journal)});await options.putPart?.(h);},
    uuid:()=>`78000000-0000-0000-0000-${String(++h.uuid).padStart(12,'0')}`,
    digest:async bytes=>{await options.digest?.(h);return digest(bytes);}};
  h.session=()=>new ManagedPhotoAdditionSession(h.deps);
  h.baseline=()=>galleryModel.parseManagedListingImages(copy(h.gallery),KEY);
  return h;
}
const photo=()=>new Blob(['captured photo bytes'],{type:'image/jpeg'});

test('one addition reuses private image transfer and appends at a stable gallery ordinal without changing primary',async()=>{
  const h=harness(),s=h.session(),before=copy(h.gallery.images);await s.start(h.baseline(),photo());
  assert.equal(s.view.phase,'added');assert.deepEqual(h.gallery.images.slice(0,2),before);
  assert.equal(h.gallery.images[2].ordinal,12);assert.equal(h.gallery.images[2].media_ordinal,0);
  assert.equal(h.gallery.images[2].is_primary,false);assert.equal(h.puts.length,1);
  assert.equal(h.puts[0].text,'captured photo bytes');assert.deepEqual(h.puts[0].journal.dispatched,[SLOT]);
  assert.deepEqual(h.requests.map(r=>r.action),['owner-images-add-prepare','image-prepare','image-verify','owner-images-add-status','owner-images-add-append']);
  assert.equal(h.requests.at(-1).journal.readyId,READY);assert.equal(h.shown.at(-1).images.length,3);
  const journal=JSON.stringify(h.journal);assert.ok(!journal.includes('captured photo bytes')&&!journal.includes('uploadId')&&!journal.includes('filename'));
});

test('the first added photo becomes primary only for an empty existing gallery',async()=>{
  const h=harness({count:0}),s=h.session();await s.start(h.baseline(),photo());
  assert.equal(s.view.phase,'added');assert.equal(h.gallery.images[0].is_primary,true);assert.equal(h.gallery.images.length,1);
});
test('ten active photos stop a new addition before any journal or network write',async()=>{
  const h=harness({count:10}),s=h.session();await s.start(h.baseline(),photo());
  assert.equal(s.view.phase,'idle');assert.equal(h.journal,null);assert.equal(h.requests.length,0);assert.equal(h.puts.length,0);
});
test('double click shares one operation and captures the displayed baseline before cross-tab await',async()=>{
  const gate=defer(),h=harness({withLock:async work=>{await gate.promise;return work();}}),s=h.session();
  const baseline=copy(h.baseline()),first=s.start(baseline,photo()),second=s.start(h.baseline(),new Blob(['other']));
  assert.equal(first,second);baseline.images[0].url='/changed';baseline.revision='999';
  gate.resolve();await first;assert.equal(s.view.phase,'added');assert.equal(h.puts.length,1);
  assert.equal(h.requests[0].args.p_expected_revision,'5');assert.equal(h.puts[0].text,'captured photo bytes');
});
test('a lost PUT is never repeated: reload verifies the original child slot before attaching',async()=>{
  const h=harness({putPart:async()=>{throw Error('lost_put');}}),s=h.session();await s.start(h.baseline(),photo());
  assert.equal(s.view.phase,'unknown');const before=h.requests.length,reloaded=h.session();await reloaded.resume();
  assert.equal(reloaded.view.phase,'added');assert.equal(h.puts.length,1);
  assert.deepEqual(h.requests.slice(before).map(r=>r.action),['owner-images-add-status','image-verify','owner-images-add-status','owner-images-add-append']);
});
test('uncertain verification cannot attach; cancellation preserves every active photo',async()=>{
  const h=harness();h.verifyReady=false;const before=copy(h.gallery),s=h.session();await s.start(h.baseline(),photo());
  assert.equal(s.view.phase,'needs_attention');assert.ok(!h.requests.some(r=>r.action==='owner-images-add-append'));
  await s.cancel();assert.equal(s.view.phase,'closed');assert.deepEqual(h.gallery,before);assert.equal(h.puts.length,1);
});
test('a lost attach response is recovered by exact receipt and readback without another append',async()=>{
  const h=harness({request:async(action,args,state)=>{if(action==='owner-images-add-append'){state.server(action,args);throw Error('lost_append');}}});
  const s=h.session();await s.start(h.baseline(),photo());assert.equal(s.view.phase,'unknown');
  const reloaded=h.session();await reloaded.inspect();assert.equal(reloaded.view.phase,'added');
  assert.equal(h.requests.filter(r=>r.action==='owner-images-add-append').length,1);assert.equal(h.puts.length,1);
});
test('an immutable attachment receipt after later retirement or primary change does not resurrect the photo',async()=>{
  const h=harness({request:async(action,args,state)=>{if(action==='owner-images-add-append'){state.server(action,args);throw Error('lost_append');}}});
  await h.session().start(h.baseline(),photo());
  h.gallery={...h.gallery,revision:'8',images:h.gallery.images.filter(i=>i.ordinal!==12).map(i=>({...i,is_primary:i.ordinal===1}))};
  const reloaded=h.session();await reloaded.inspect();assert.equal(reloaded.view.phase,'added');
  assert.match(reloaded.view.message,/pärast seda muudetud/);assert.equal(h.shown.at(-1).images.length,2);
  assert.equal(h.requests.filter(r=>r.action==='owner-images-add-append').length,1);
});
test('final success wording follows fresh readback when the just-added photo is retired after ACK',async()=>{
  const h=harness({readGallery:async state=>{state.gallery={...state.gallery,revision:'7',images:state.gallery.images.filter(i=>i.ordinal!==12)};}});
  const s=h.session();await s.start(h.baseline(),photo());assert.equal(s.view.phase,'added');assert.match(s.view.message,/pärast seda muudetud/);
});
test('explicit resume recovers an unobserved prepare using the same request and image descriptor',async()=>{
  let lose=true;const h=harness({request:async(action)=>{if(action==='owner-images-add-prepare'&&lose){lose=false;throw Error('prepare_not_observed');}}});
  const s=h.session();await s.start(h.baseline(),photo());assert.equal(s.view.phase,'unknown');assert.equal(h.snapshot,null);
  const first=copy(h.requests[0].args);await s.resume();assert.equal(s.view.phase,'added');
  const prepares=h.requests.filter(r=>r.action==='owner-images-add-prepare');assert.equal(prepares.length,2);
  assert.equal(prepares[1].args.p_request_key,first.p_request_key);assert.deepEqual(prepares[1].args.p_image,first.p_image);assert.equal(h.puts.length,1);
});
test('cancel before a missing prepare closes that request and cannot delete an existing gallery member',async()=>{
  let delayed;const h=harness({request:async(action,args,state)=>{if(action==='owner-images-add-prepare'){delayed=()=>state.server(action,args);throw Error('lost_prepare');}}});
  const before=copy(h.gallery),s=h.session();await s.start(h.baseline(),photo());await s.cancel();
  assert.equal(s.view.phase,'closed');assert.throws(delayed,/closed_request/);assert.deepEqual(h.gallery,before);assert.equal(h.puts.length,0);
});
for(const message of ['publication_open_attempt_limit','publication_daily_attempt_limit','publication_retained_bytes_limit'])
  test('known temporary capacity '+message+' keeps the exact journal and offers cancellation without another prepare',async()=>{
    const h=harness({request:async action=>{if(action==='owner-images-add-prepare')throw {code:'54000',message};}});
    const before=copy(h.gallery),s=h.session();await s.start(h.baseline(),photo());
    assert.equal(s.view.phase,'needs_attention');assert.match(s.view.message,/ajutiselt piiratud/);
    const journal=copy(h.journal);assert.ok(journal);assert.equal(h.puts.length,0);assert.equal(h.requests.length,1);
    assert.deepEqual(h.gallery,before);await s.cancel();assert.equal(s.view.phase,'closed');
    assert.deepEqual(h.journal,journal);assert.deepEqual(h.gallery,before);
    assert.equal(h.requests.filter(r=>r.action==='owner-images-add-prepare').length,1);
    assert.equal(h.requests.filter(r=>r.action==='owner-images-add-cancel').length,1);
    assert.equal(h.requests.at(-1).args.p_request_key,journal.requestKey);
  });
test('an unrecognized 54000 failure remains unknown and never claims capacity or clears the journal',async()=>{
  const h=harness({request:async action=>{if(action==='owner-images-add-prepare')throw {code:'54000',message:'private_internal_failure'};}});
  const s=h.session();await s.start(h.baseline(),photo());assert.equal(s.view.phase,'unknown');
  assert.ok(h.journal);assert.equal(h.requests.length,1);assert.equal(h.puts.length,0);
  assert.ok(!s.view.message.includes('ajutiselt piiratud'));assert.ok(!s.view.message.includes('private_internal_failure'));
});
test('reload before PUT requires the same original bytes and never uploads a newly selected different photo',async()=>{
  const h=harness({request:async action=>{if(action==='image-prepare')throw Error('grant_lost');}});
  await h.session().start(h.baseline(),photo());h.deps.request=async(action,args,signal)=>{h.requests.push({action,args,signal});return h.server(action,args);};
  const reloaded=h.session();await reloaded.resume(new Blob(['different bytes']));assert.equal(reloaded.view.phase,'needs_file');assert.equal(h.puts.length,0);
  await reloaded.resume(photo());assert.equal(reloaded.view.phase,'added');assert.equal(h.puts.length,1);
});
test('concurrent gallery changes reject one append; explicit same-request resume preserves the new primary',async()=>{
  let race=true;const h=harness({request:async(action,args,state)=>{if(action==='owner-images-add-append'&&race){race=false;
    state.gallery={...state.gallery,revision:'6',images:state.gallery.images.map(i=>({...i,is_primary:i.ordinal===1}))};
  }}}),s=h.session();await s.start(h.baseline(),photo());assert.equal(s.view.phase,'resume');
  await s.resume();assert.equal(s.view.phase,'added');assert.equal(h.gallery.images.find(i=>i.ordinal===1).is_primary,true);assert.equal(h.puts.length,1);
});
for(const stage of ['digest','owner-images-add-prepare','image-prepare','image-verify','owner-images-add-append','readback']){
  test('actor invalidation during '+stage+' prevents late display or follow-on writes',async()=>{
    const entered=defer(),gate=defer(),block=async()=>{entered.resolve();await gate.promise;};
    const h=harness({digest:stage==='digest'?block:undefined,request:async action=>{if(action===stage)await block();},
      readGallery:stage==='readback'?block:undefined}),s=h.session(),seen=[];s.subscribe(v=>seen.push(v));
    const pending=s.start(h.baseline(),photo());await entered.promise;
    const counts={seen:seen.length,requests:h.requests.length,puts:h.puts.length,shown:h.shown.length};
    s.invalidate();h.signal.abort();gate.resolve();await pending;
    assert.equal(seen.length,counts.seen);assert.equal(h.requests.length,counts.requests);assert.equal(h.puts.length,counts.puts);assert.equal(h.shown.length,counts.shown);
  });
}
test('journal failure before prepare prevents any remote intent',async()=>{
  const h=harness();h.rejectJournal=true;const s=h.session();await s.start(h.baseline(),photo());
  assert.equal(s.view.phase,'idle');assert.equal(h.requests.length,0);assert.equal(h.journal,null);
});
test('journal failure before dispatch prevents PUT; persisting ready receipt is also required before append',async()=>{
  for(const boundary of ['dispatch','ready']){
    let reject=true;const h=harness({writeJournal:j=>reject&&(boundary==='dispatch'?j.dispatched.length>0:j.readyId!==null)}),s=h.session();
    await s.start(h.baseline(),photo());assert.equal(s.view.phase,'unknown');assert.equal(h.puts.length,boundary==='dispatch'?0:1);
    assert.ok(!h.requests.some(r=>r.action==='owner-images-add-append'));reject=false;await s.resume();assert.equal(s.view.phase,'added');assert.equal(h.puts.length,1);
  }
});
test('cross-tab lock rejection cannot create an addition journal or send bytes',async()=>{
  const h=harness({withLock:async()=>{throw Error('busy_elsewhere');}}),s=h.session();await s.start(h.baseline(),photo());
  assert.equal(s.view.phase,'idle');assert.equal(h.journal,null);assert.equal(h.requests.length,0);
});
test('a malformed ready receipt never reaches append',async()=>{
  const h=harness({request:async(action,args,state)=>{if(action==='image-verify'){const ready=state.ready();ready.receipt.slot_id=A;return ready;}}});
  const s=h.session();await s.start(h.baseline(),photo());assert.equal(s.view.phase,'unknown');assert.ok(!h.requests.some(r=>r.action==='owner-images-add-append'));
});
for(const [name,change] of [
  ['another parent',r=>r.attempt_id=CHILD],['wrong ready',r=>r.ready_id=A],['changed primary',r=>r.was_primary=true],
  ['old ordinal',r=>r.ordinal=0],['other media origin',r=>r.media_attempt_id=A],['wrong revision',r=>r.attached_revision='7'],
  ['invalid calendar timestamp',r=>r.attached_at='2026-02-30T12:00:00.000000Z'],['timestamp newline',r=>r.attached_at+='\n'],
])test('attachment acknowledgement rejects '+name,async()=>{
  const h=harness({request:async(action,args,state)=>{if(action==='owner-images-add-append'){const result=state.server(action,args);change(result.receipt);return result;}}});
  const s=h.session();await s.start(h.baseline(),photo());assert.equal(s.view.phase,'unknown');assert.equal(h.requests.filter(r=>r.action==='owner-images-add-append').length,1);
});
test('journal rejects newline UUID/hash and a different actor baseline',async()=>{
  const h=harness();await h.session().start(h.baseline(),photo());
  for(const change of [j=>j.requestKey+='\n',j=>j.image.client_file_id+='\n',j=>j.image.sha256+='\n',j=>j.readyId+='\n',j=>j.baseline.key.userId=CHILD]){
    const j=copy(h.journal);change(j);assert.throws(()=>model.bindPhotoAdditionJournal(j,KEY));
  }
});
test('terminal reset clears only its exact request and allows a new local selection',async()=>{
  const h=harness(),s=h.session();await s.start(h.baseline(),photo());assert.ok(h.journal);await s.reset();
  assert.equal(s.view.phase,'idle');assert.equal(h.journal,null);assert.equal(h.puts.length,1);
});

test('cleanup count projection can exceed ten historical photos while keeping exact WEB reservations',()=>{
  const cleanup=require('../src/entities/listing/model/retiredListingImageCleanup.ts');
  const key={userId:U,identityId:I,attemptId:A,requestKey:CHILD};
  for(const count of [11,2147483647]){
    const row={schema_version:1,attempt_id:A,request_key:CHILD,files_remaining:count,needs_attention:0,reserved_bytes:count*4194304};
    const parsed=cleanup.retiredImageCleanupStatus(row,key);assert.equal(parsed.filesRemaining,count);assert.equal(parsed.reservedBytes,count*4194304);
    assert.throws(()=>cleanup.retiredImageCleanupStatus({...row,reserved_bytes:row.reserved_bytes-1},key));
  }
  assert.throws(()=>cleanup.retiredImageCleanupStatus({schema_version:1,attempt_id:A,request_key:CHILD,
    files_remaining:2147483648,needs_attention:0,reserved_bytes:2147483648*4194304},key));
});
