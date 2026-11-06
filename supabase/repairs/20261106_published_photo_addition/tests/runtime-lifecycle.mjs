import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {db,actors,gallery,remove,asActor,asRole,withActorContext} from './fixture.mjs';
import {prepare,status,cancel,append,call,service,image,denied,add,readyImage,settleSources,
 familyReceipt,deleteParent,bytesFor,terminalSnapshot,setIdentity} from './runtime-helpers.mjs';
export const cases={
 async lifetime_cleanup_page(item) {
  await settleSources(item);
  for(let n=0;n<9;n++) {
   const request=crypto.randomUUID();await prepare(item,request,'0');await cancel(item,request);
  }
  assert.equal((await familyReceipt(item)).files_remaining,0);
  const deleted=await deleteParent(item);assert.equal(deleted.files_remaining,21);
  const snapshot=await terminalSnapshot(item);assert.equal(snapshot.schema_version,4);
  assert.equal(snapshot.files_remaining,21);assert.equal(snapshot.items.length,20);
  const family=new Map((await db.query(`SELECT a.id,a.request_key FROM listing_publication_private.attempts a
   WHERE a.id IN(SELECT attempt_id FROM listing_publication_private.managed_image_family_v1($1))`,[item.attempt])).rows.map(x=>[x.id,x.request_key]));
  assert(snapshot.items.every(i=>family.get(i.origin_attempt_id)===i.origin_request_key));
 },
 async child_not_normal_publication(item) {
  const request=crypto.randomUUID(),p=await prepare(item,request,'0'),w=await readyImage(p.snapshot);
  await denied(()=>call(item.author,'get_my_listing_publication_confirmation_v1',
   [item.author,item.identity,p.snapshot.attempt_id]),'55000','publication_addition_requires_append');
  await denied(()=>call(item.author,'publish_my_listing_v1',
   [item.author,item.identity,p.snapshot.attempt_id,'d'.repeat(64)]),'55000','publication_addition_requires_append');
  await denied(()=>call(actors.peer,'get_my_listing_publication_confirmation_v1',
   [actors.peer,actors.peerIdentity,p.snapshot.attempt_id]),'P0002','publication_attempt_unavailable');
  assert.equal((await status(item,request)).snapshot.state,'open');
  const a=await append(item,request,p.snapshot.attempt_id,w.ready,'0');assert(a.changed);
 },
 async cancel_before_prepare(item) {
  const request=crypto.randomUUID(),first=await cancel(item,request);
  assert(first.intent_closed);assert.equal(first.snapshot,null);assert.equal(first.receipt,null);
  assert.equal(first.gallery.schema_version,2);
  await denied(()=>prepare(item,request,'0'),'55000','publication_request_closed');
  assert((await status(item,request)).intent_closed);
  assert.equal((await db.query('SELECT count(*)::integer n FROM listing_publication_private.managed_image_additions_v1')).rows[0].n,0);
 },
 async cancel_uncertain_upload(item) {
  const request=crypto.randomUUID(),p=await prepare(item,request,'0'),s=p.snapshot,upload=crypto.randomUUID();
  const dispatched=await service('reserve_listing_multipart_v2',[item.author,item.identity,s.attempt_id,s.slots[0].slot_id,upload,'source']);
  assert(dispatched.create_allowed);assert.equal(await bytesFor(s.attempt_id),30408704);
  const closed=await cancel(item,request);assert.equal(closed.snapshot.state,'cancelled');assert(closed.intent_closed);
  const contexts=(await db.query(`SELECT o.kind,c.reason,c.state FROM listing_publication_private.objects o
   JOIN listing_publication_private.cleanup c ON c.object_id=o.id WHERE o.attempt_id=$1 ORDER BY o.kind`,[s.attempt_id])).rows;
  assert.equal(contexts.length,2);assert(contexts.every(r=>r.reason==='cancelled'));
  assert.equal(contexts.find(r=>r.kind==='source').state,'blocked_write_settlement');
  assert.equal(await bytesFor(s.attempt_id),30408704);
  await denied(()=>service('claim_listing_multipart_part_v2',
   [item.author,item.identity,s.attempt_id,s.slots[0].slot_id,upload,'source']),'55000');
  const summary=await terminalSnapshot(item);assert.equal(summary.schema_version,4);assert(summary.blocked>=1);
  assert(summary.items.some(i=>i.origin_attempt_id===s.attempt_id&&i.origin_request_key===request));
  assert.equal((await familyReceipt(item)).files_remaining,2,'open/cancelled children do not inflate published SOURCE receipt');
 },
 async delete_parent_with_children(item) {
  const attached=await add(item),readyRequest=crypto.randomUUID(),pendingRequest=crypto.randomUUID();
  const revision=attached.attached.gallery.revision;
  const ready=await prepare(item,readyRequest,revision),web=await readyImage(ready.snapshot);
  const pending=await prepare(item,pendingRequest,revision),s=pending.snapshot,upload=crypto.randomUUID();
  await service('reserve_listing_multipart_v2',[item.author,item.identity,s.attempt_id,s.slots[0].slot_id,upload,'source']);
  const receipt=await deleteParent(item);assert(receipt.content_deleted);assert.equal(receipt.state,'deleting');
  assert.equal(receipt.files_remaining,10);
  for(const [request,state] of [[attached.request,'deleted'],[readyRequest,'cancelled'],[pendingRequest,'cancelled']]) {
   const result=await status(item,request);assert.equal(result.snapshot.state,state);assert.equal(result.gallery,null);assert(result.intent_closed);
  }
  const all=(await db.query(`SELECT o.id,c.object_id FROM listing_publication_private.objects o
   LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id IN(SELECT attempt_id FROM listing_publication_private.managed_image_family_v1($1))`,[item.attempt])).rows;
  assert.equal(all.length,10);assert(all.every(r=>r.id===r.object_id));
  await denied(()=>append(item,readyRequest,ready.snapshot.attempt_id,web.ready,revision),'55000','publication_attempt_closed');
  await denied(()=>service('claim_listing_multipart_part_v2',
   [item.author,item.identity,s.attempt_id,s.slots[0].slot_id,upload,'source']),'55000');
  await denied(()=>prepare(item,crypto.randomUUID(),revision),'55000','listing_images_unavailable');
  assert.equal(await service('get_public_listing_media_binding_v1',[attached.prepared.snapshot.attempt_id,0]),null);
  const replay=await append(item,attached.request,attached.prepared.snapshot.attempt_id,attached.verified.ready,'0');
  assert.deepEqual(replay.receipt,attached.attached.receipt);assert.equal(replay.gallery,null);
  const snap=await terminalSnapshot(item);assert.equal(snap.schema_version,4);assert.equal(snap.files_remaining,10);
  assert(snap.items.every(i=>i.session===null||i.session.attempt_id===i.origin_attempt_id));
 },
 async business_member(item) {
  await setIdentity(actors.owner,item.identity);await setIdentity(actors.member,item.identity);
  const first=await add(item,actors.member);assert.equal(first.attached.receipt.actor_user_id,actors.member);
  assert.equal(first.attached.receipt.identity_id,item.identity);
  const users=(await db.query('SELECT DISTINCT user_id FROM public.listing_images WHERE listing_id=$1',[item.id])).rows;
  assert.deepEqual(users,[{user_id:actors.owner}]);
  assert.equal((await familyReceipt(item)).actor_user_id,actors.owner);
  await settleSources(item,actors.member);assert.equal((await familyReceipt(item)).files_remaining,0);
  assert.equal((await call(actors.member,'get_my_listing_media_binding_v2',
   [actors.member,item.identity,first.prepared.snapshot.attempt_id,0])).object_path,first.verified.web.object_path);
  await db.query("UPDATE public.business_members SET status='inactive' WHERE user_id=$1 AND business_account_id=$2",[actors.member,actors.business]);
  await denied(()=>status(item,first.request,actors.member),'42501');
  const receipt=await deleteParent(item,actors.owner);assert(receipt.content_deleted);
 },
 async authority_and_stale_identity(item) {
  const request=crypto.randomUUID(),p=await prepare(item,request,'0');
  await denied(()=>call(actors.peer,'get_my_managed_listing_image_addition_v1',
   [item.author,item.identity,item.id,item.attempt,request]),'42501');
  await denied(()=>status(item,request,actors.peer),'42501');
  await denied(()=>asRole('service_role','SELECT public.prepare_my_managed_listing_image_addition_v1($1,$2,$3,$4,$5,$6,$7)',
   [item.author,item.identity,item.id,item.attempt,crypto.randomUUID(),'0',image()]),'42501');
  await denied(()=>asActor(item.author,'SELECT * FROM listing_publication_private.managed_image_additions_v1'),'42501');
  await denied(()=>db.query('UPDATE listing_publication_private.managed_image_additions_v1 SET parent_attempt_id=$1 WHERE attempt_id=$2',
   [item.attempt,p.snapshot.attempt_id]),'42501','listing_image_addition_immutable');
  await setIdentity(item.author,actors.otherIdentity);
  await denied(()=>status(item,request),'42501','listing_price_identity_changed');
  await setIdentity(item.author,item.identity);assert.equal((await status(item,request)).snapshot.attempt_id,p.snapshot.attempt_id);
 },
 async append_requires_live_verified_storage(item) {
  const request=crypto.randomUUID(),p=await prepare(item,request,'0'),w=await readyImage(p.snapshot);
  await db.query('DELETE FROM storage.objects WHERE id=$1',[w.web.storageId]);
  await denied(()=>append(item,request,p.snapshot.attempt_id,w.ready,'0'),'55000','publication_multipart_web_completion_required');
  assert.equal((await gallery(item)).images.length,2);
  await db.query('INSERT INTO storage.objects VALUES($1,$2,$3,$4)',[w.web.storageId,w.web.bucket_id,w.web.object_path,w.web.version]);
  await db.query("INSERT INTO storage.s3_multipart_uploads VALUES($1,$2,$3,$4)",[w.web.upload,w.web.bucket_id,w.web.object_path,w.web.version]);
  await denied(()=>append(item,request,p.snapshot.attempt_id,w.ready,'0'),'55000','publication_multipart_web_completion_required');
  await db.query('DELETE FROM storage.s3_multipart_uploads WHERE id=$1',[w.web.upload]);
  assert((await append(item,request,p.snapshot.attempt_id,w.ready,'0')).changed);
 },
 async expired_child(item) {
  const child=crypto.randomUUID(),request=crypto.randomUUID(),slot=crypto.randomUUID(),descriptor=image();
  const payload={schema_version:1,purpose:'listing_image_addition',parent_attempt_id:item.attempt,listing_id:String(item.id)};
  // This synthetic initial state models an interrupted attempt crossing its
  // original deadline; runtime immutability triggers are never disabled.
  await db.query(`INSERT INTO listing_publication_private.attempts(id,actor_user_id,identity_id,request_key,
   intent_sha256,payload,policy_snapshot,created_at,expires_at) VALUES($1,$2,$3,$4,decode(repeat('a',64),'hex'),
   $5,'[{}]',clock_timestamp()-interval '48 hours',clock_timestamp()-interval '24 hours')`,
   [child,item.author,item.identity,request,payload]);
  await db.query(`INSERT INTO listing_publication_private.slots(id,attempt_id,ordinal,client_file_id,
   expected_source_bytes,expected_source_sha256) VALUES($1,$2,0,$3,100,decode(repeat('b',64),'hex'))`,[slot,child,descriptor.client_file_id]);
  await db.query(`INSERT INTO listing_publication_private.objects(attempt_id,slot_id,kind,bucket_id,object_path,reserved_bytes)
   VALUES($1,$2,'source','listing-publication-private',$3,26214400),($1,$2,'web','listing-publication-private',$4,4194304)`,
   [child,slot,`v1/${child}/${slot}/source.upload`,`v1/${child}/${slot}/web-v1.webp`]);
  await asRole('selqiro_listing_final_writer_v1','INSERT INTO listing_publication_private.multipart_attempts(attempt_id) VALUES($1)',[child]);
  await asRole('selqiro_listing_final_writer_v1','INSERT INTO listing_publication_private.managed_image_additions_v1(attempt_id,parent_attempt_id) VALUES($1,$2)',[child,item.attempt]);
  const s=await status(item,request);assert.equal(s.snapshot.state,'expired');assert.equal(s.snapshot.payload,null);
  await denied(()=>append(item,request,child,crypto.randomUUID(),'0'),'55000','publication_attempt_closed');
  const c=await cancel(item,request);assert.equal(c.snapshot.state,'cancelled');assert.equal(await bytesFor(child),30408704);
  assert.equal((await db.query('SELECT count(*)::integer n FROM listing_publication_private.cleanup WHERE object_id IN(SELECT id FROM listing_publication_private.objects WHERE attempt_id=$1)',[child])).rows[0].n,2);
 }
};
