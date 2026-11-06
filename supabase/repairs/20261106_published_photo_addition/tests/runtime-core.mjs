import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {db,actors,gallery,remove,primary,webClaim,webRecord,webStatus,asActor,asRole} from './fixture.mjs';
import {prepare,status,cancel,append,call,service,image,denied,add,readyImage,settleSources,
 familyReceipt,deleteParent,bytesFor,terminalSnapshot} from './runtime-helpers.mjs';
export const cases={
 async append_and_replay(item) {
  const old=await gallery(item);assert.equal(old.schema_version,1);
  assert.deepEqual(Object.keys(old.images[0]).sort(),['ordinal','url','is_primary'].sort());
  const oldBytes=await bytesFor(item.attempt),request=crypto.randomUUID(),descriptor=image();
  const p=await prepare(item,request,old.revision,descriptor);assert.equal(p.gallery.schema_version,2);
  assert.deepEqual(p.snapshot.payload,{schema_version:1,purpose:'listing_image_addition',parent_attempt_id:item.attempt,listing_id:String(item.id)});
  assert.equal(p.snapshot.slots.length,1);assert.equal(p.snapshot.slots[0].ordinal,0);
  const replay=await prepare(item,request,'99',descriptor);assert(replay.replayed);assert.deepEqual(replay.snapshot,p.snapshot);
  await denied(()=>prepare(item,request,old.revision,image()),'22023','publication_request_conflict');
  const ready=await readyImage(p.snapshot);
  await denied(()=>append(item,request,p.snapshot.attempt_id,crypto.randomUUID(),old.revision),'55000','publication_images_not_ready');
  const a=await append(item,request,p.snapshot.attempt_id,ready.ready,old.revision);
  assert(a.changed&&!a.replayed);assert.equal(a.gallery.images.length,3);assert.equal(a.gallery.schema_version,2);
  assert.equal(a.gallery.images.find(i=>i.is_primary).url,old.images.find(i=>i.is_primary).url);
  assert.equal(a.receipt.ordinal,2);assert.equal(a.receipt.media_ordinal,0);
  assert.equal(a.receipt.url,'/api/v2/listing-media/'+p.snapshot.attempt_id+'/0');
  assert.equal(a.snapshot.state,'published');assert.equal(a.snapshot.payload,null);
  assert.equal((await db.query('SELECT count(*)::integer n FROM listing_publication_private.publications')).rows[0].n,1);
  assert.equal(await bytesFor(item.attempt),oldBytes);
  assert.equal(await bytesFor(p.snapshot.attempt_id),26214400+4194304);
  const again=await append(item,request,p.snapshot.attempt_id,ready.ready,old.revision);
  assert(!again.changed&&again.replayed);assert.deepEqual(again.receipt,a.receipt);assert.deepEqual(again.gallery,a.gallery);
  assert.deepEqual((await cancel(item,request)).receipt,a.receipt);
  const publicBinding=await service('get_public_listing_media_binding_v1',[p.snapshot.attempt_id,0]);
  assert.equal(publicBinding.object_path,ready.web.object_path);
  const ownBinding=await call(item.author,'get_my_listing_media_binding_v2',[item.author,item.identity,p.snapshot.attempt_id,0]);
  assert.deepEqual(ownBinding,publicBinding);
  const retained=await settleSources(item);assert(retained.some(t=>t.schema_version===2));
  assert.equal((await familyReceipt(item)).files_remaining,0);assert.equal(await bytesFor(p.snapshot.attempt_id),4194304);
 },
 async concurrent_cas(item) {
  await settleSources(item);const before=await gallery(item),a=crypto.randomUUID(),b=crypto.randomUUID();
  const pa=await prepare(item,a,before.revision),pb=await prepare(item,b,before.revision);
  const wa=await readyImage(pa.snapshot),wb=await readyImage(pb.snapshot);
  const first=await append(item,a,pa.snapshot.attempt_id,wa.ready,before.revision);
  await denied(()=>append(item,b,pb.snapshot.attempt_id,wb.ready,before.revision),'40001','listing_images_conflict');
  const after=await status(item,b);assert.equal(after.snapshot.state,'open');assert.equal(after.receipt,null);
  assert.equal(after.gallery.revision,first.gallery.revision);
  const second=await append(item,b,pb.snapshot.attempt_id,wb.ready,first.gallery.revision);
  assert.equal(second.receipt.ordinal,3);assert.equal(second.gallery.images.length,4);
  assert.equal(second.gallery.images.filter(i=>i.is_primary).length,1);
 },
 async active_cap_and_monotone(item) {
  assert.equal((await gallery(item)).images.length,10);
  await denied(()=>prepare(item,crypto.randomUUID(),'0'),'22023','publication_image_count_exceeded');
  await settleSources(item);let g=await remove(item,'0',9);assert.equal(g.images.length,9);
  const first=await add(item);assert.equal(first.attached.receipt.ordinal,10);assert.equal(first.attached.gallery.images.length,10);
  assert.equal(first.attached.receipt.url,'/api/v2/listing-media/'+first.prepared.snapshot.attempt_id+'/0');
  await settleSources(item);g=await primary(item,first.attached.gallery.revision,10);
  assert.equal(g.images.find(i=>i.is_primary).ordinal,10);
  g=await remove(item,g.revision,0);const second=await add(item);
  assert.equal(second.attached.receipt.ordinal,11);assert.equal(second.attached.gallery.images.find(i=>i.is_primary).ordinal,10);
  assert.equal(await service('get_public_listing_media_binding_v1',[item.attempt,9]),null);
  assert.equal(await service('get_public_listing_media_binding_v1',[item.attempt,0]),null);
  assert.equal((await service('get_public_listing_media_binding_v1',[first.prepared.snapshot.attempt_id,0])).object_path,first.verified.web.object_path);
  assert.equal((await db.query('SELECT count(*)::integer n FROM listing_publication_private.managed_image_origins_v1($1)',[item.attempt])).rows[0].n,12);
 },
 async late_active_cap(item) {
  await settleSources(item);await remove(item,'0',9);const g=await gallery(item),a=crypto.randomUUID(),b=crypto.randomUUID();
  const pa=await prepare(item,a,g.revision),pb=await prepare(item,b,g.revision);
  const wa=await readyImage(pa.snapshot),wb=await readyImage(pb.snapshot);
  const aa=await append(item,a,pa.snapshot.attempt_id,wa.ready,g.revision);
  await denied(()=>append(item,b,pb.snapshot.attempt_id,wb.ready,aa.gallery.revision),'22023','publication_image_count_exceeded');
  assert.equal((await status(item,b)).snapshot.state,'open');
 },
 async first_photo(item) {
  const old=await gallery(item);assert.equal(old.images.length,0);assert.equal(old.schema_version,1);
  const a=await add(item);assert.equal(a.attached.receipt.ordinal,0);assert(a.attached.receipt.was_primary);
  assert.equal(a.attached.gallery.images.length,1);assert(a.attached.gallery.images[0].is_primary);
  assert.equal((await db.query('SELECT image FROM public.listings WHERE id=$1',[item.id])).rows[0].image,a.attached.receipt.url);
 },
 async retired_replay(item) {
  const a=await add(item);await settleSources(item);
  const g=await remove(item,a.attached.gallery.revision,a.attached.receipt.ordinal);assert.equal(g.images.length,2);
  assert.equal(await service('get_public_listing_media_binding_v1',[a.prepared.snapshot.attempt_id,0]),null);
  let replay=await append(item,a.request,a.prepared.snapshot.attempt_id,a.verified.ready,'0');
  assert.deepEqual(replay.receipt,a.attached.receipt);assert.equal(replay.gallery.images.length,2);
  assert.equal((await webStatus(item)).files_remaining,1);
  const work=await webClaim(item);assert.equal(work.schema_version,2);assert.equal(work.origin_attempt_id,a.prepared.snapshot.attempt_id);
  await db.query('DELETE FROM storage.objects WHERE id=$1',[a.verified.web.storageId]);await webRecord(item,work);
  assert.equal((await webStatus(item)).files_remaining,0);assert.equal(await bytesFor(a.prepared.snapshot.attempt_id),0);
  replay=await append(item,a.request,a.prepared.snapshot.attempt_id,a.verified.ready,'0');
  assert.deepEqual(replay.receipt,a.attached.receipt);assert.equal(replay.gallery.images.length,2);
  await deleteParent(item);replay=await append(item,a.request,a.prepared.snapshot.attempt_id,a.verified.ready,'0');
  assert.deepEqual(replay.receipt,a.attached.receipt);assert.equal(replay.gallery,null);assert(replay.intent_closed);
  assert.equal((await db.query('SELECT count(*)::integer n FROM public.listing_images WHERE listing_id=$1',[item.id])).rows[0].n,0);
 },
 async ordinary_publish(item) {
  const input={basics:{title:'Synthetic original listing',description:'A complete retained publication flow.',condition:'used'},
   price:{kind:'fixed',amount:'15.00',currency:'EUR'},category_path:['electronics','computers'],
   location:{country:'Estonia',city:'Paide',latitude:null,longitude:null},
   attributes:{manufacturer:'',part_number:'',oem_number:'',vehicle_brand:'',vehicle_model:'',vehicle_year:'',engine:''},
   details:{},language:'et'};
  const request=crypto.randomUUID(),descriptor=image();
  const p=await call(item.author,'prepare_my_listing_publication_v1',[item.author,item.identity,request,input,[descriptor]]);
  assert.equal(p.payload.version,1);const verified=await readyImage(p);
  const c=await call(item.author,'get_my_listing_publication_confirmation_v1',[item.author,item.identity,p.attempt_id]);
  const r=await call(item.author,'publish_my_listing_v1',[item.author,item.identity,p.attempt_id,c.confirmation.confirmation_sha256]);
  assert.equal(r.state,'published');assert.equal(r.files_remaining,1);
  const created={...item,id:Number(r.listing_id),attempt:p.attempt_id,request};
  const g=await gallery(created);assert.equal(g.schema_version,1);assert.equal(g.images.length,1);
  assert.equal(g.images[0].url,'/api/v2/listing-media/'+p.attempt_id+'/0');
  assert.equal((await service('get_public_listing_media_binding_v1',[p.attempt_id,0])).object_path,verified.web.object_path);
  assert.equal((await call(item.author,'publish_my_listing_v1',[item.author,item.identity,p.attempt_id,c.confirmation.confirmation_sha256])).replayed,true);
 },
 async sql_first_compatibility(item) {
  const g=await gallery(item);assert.equal(g.schema_version,1);
  const switched=await primary(item,g.revision,1);assert.equal(switched.schema_version,1);
  assert.deepEqual(Object.keys(switched.images[0]).sort(),['is_primary','ordinal','url'].sort());
  const snap=await terminalSnapshot(item);assert.equal(snap.schema_version,3);
  assert(snap.items.every(i=>!Object.hasOwn(i,'origin_attempt_id')&&!Object.hasOwn(i,'origin_request_key')));
  const tasks=await settleSources(item);assert(tasks.every(t=>t.schema_version===1));
  const removed=await remove(item,switched.revision,0);assert.equal(removed.schema_version,1);
  const work=await webClaim(item);assert.equal(work.schema_version,1);
  assert.deepEqual(Object.keys(work).sort(),['schema_version','object_id','work_key','bucket_id','object_path','try_count','lease_until_epoch'].sort());
 }
};
