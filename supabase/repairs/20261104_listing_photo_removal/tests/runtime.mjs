import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {db,actors,asActor,asRole,withActorContext,read,here,provenance,seedCompletedListing,seal,
 gallery,remove,primary,completeSources,claim,record,removeSyntheticMetadata,accounting} from './fixture.mjs';
const checks=[];
const result={schema_version:1,scope:'One non-primary published membership removal; retained SQL with synthetic metadata.',
 checks,live_database_calls:false,provider_storage_executed:false,native_postgresql_executed:false,
 concurrent_session_execution:false,synthetic_provider_metadata:true};
async function check(label,action){try{await action();checks.push({label,passed:true});}
 catch(e){checks.push({label,passed:false,message:e.message,code:e.code});throw e;}}
async function denied(operation,code='42501',message){
 let error;try{await operation();}catch(e){error=e;}
 assert.equal(error?.code,code,error?.message??'operation unexpectedly succeeded');if(message)assert.equal(error.message,message);
}
const values=async(sql,args=[])=>(await db.query(sql,args)).rows;
async function snapshot(item){
 const q=async(table,condition='attempt_id=$1')=>values(`SELECT to_jsonb(t) value FROM ${table} t WHERE ${condition} ORDER BY to_jsonb(t)::text`,[item.attempt]);
 return {attempt:await q('listing_publication_private.attempts','id=$1'),
  publication:await q('listing_publication_private.publications'),slots:await q('listing_publication_private.slots'),
  objects:await q('listing_publication_private.objects'),ready:await q('listing_publication_private.web_images'),
  cleanup:await values(`SELECT to_jsonb(c) value FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.attempt_id=$1 ORDER BY c.object_id`,[item.attempt]),
  revision:await q('listing_publication_private.managed_image_presentations_v1'),
  listing:await values('SELECT to_jsonb(l) value FROM public.listings l WHERE id=$1',[item.id]),
  images:await values('SELECT to_jsonb(i) value FROM public.listing_images i WHERE listing_id=$1 ORDER BY sort_order,id',[item.id]),
  storage:await values('SELECT to_jsonb(s) value FROM storage.objects s WHERE name LIKE $1 ORDER BY name',[`v1/${item.attempt}/%`])};
}
async function unchangedFailure(item,operation,code='42501',message){
 const before=await snapshot(item);await denied(operation,code,message);assert.deepEqual(await snapshot(item),before);
}
const media=async(item,ordinal,owner=false)=>owner
 ?(await asActor(item.author,'SELECT public.get_my_listing_media_binding_v2($1,$2,$3,$4) value',[item.author,item.identity,item.attempt,ordinal])).rows[0].value
 :(await asRole('service_role','SELECT public.get_public_listing_media_binding_v1($1,$2) value',[item.attempt,ordinal])).rows[0].value;
const ownerRead=async(item)=>(await asActor(item.author,'SELECT public.get_my_managed_listing_v2($1,$2,$3) value',
 [item.author,item.identity,String(item.id)])).rows[0].value;
const sourceAt=(item,ordinal)=>item.source.find(o=>o.ordinal===ordinal);
const webAt=(item,ordinal)=>item.web.find(o=>o.ordinal===ordinal);
const writer=(item,sql,args)=>withActorContext(item.author,()=>asRole('selqiro_listing_final_writer_v1',sql,args));
try{
 result.engine=(await db.query('SELECT version() version')).rows[0].version;
 const cases={};let id=2100;
 for(const name of ['happy','race','rollback','pending','sourceContinues','missing','activeMarker','wrongReason','wrongPath','business','paused','sold','deleteLater'])
  cases[name]=await seedCompletedListing(++id,{count:3,...(name==='business'?{identity:actors.businessIdentity}:{}),
   ...(['paused','sold'].includes(name)?{status:name}:{})});
 const empty=await seedCompletedListing(++id,{count:0}),one=await seedCompletedListing(++id,{count:1});
 const outsider=await seedCompletedListing(++id,{count:2,identity:actors.outsiderIdentity,author:actors.outsider});
 const corrupted=[];
 for(const bad of ['ordinal-gap','invalid-intent','missing-ready','web-cleanup','missing-image','extra-image','wrong-url','multiple-primary','wrong-mirror','wrong-creator'])
  corrupted.push(await seedCompletedListing(++id,{count:3,bad}));
 // Place exactly the chosen source first, so later sources remain pending after
 // its accepted cleanup. Metadata deletion below is synthetic fixture activity.
 await db.query("UPDATE listing_publication_private.cleanup SET enqueued_at=enqueued_at-interval '1 hour' WHERE object_id=$1",[sourceAt(cases.sourceContinues,1).id]);
 await seal();await db.exec(read('changes.sql'));
 for(const [name,item] of Object.entries(cases)){
  if(['pending','sourceContinues'].includes(name))continue;
  if(name==='business')await db.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[actors.businessIdentity,actors.owner]);
  await completeSources(item);
  if(name==='business')await db.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[actors.ownerIdentity,actors.owner]);
 }
 await completeSources(one);
 await check('sql_first_preserves_original_gallery_primary_api_and_owner_fallback',async()=>{
  const item=cases.happy,read=await gallery(item),owner=await ownerRead(item);
  assert.deepEqual(read.images.map(i=>i.ordinal),[0,1,2]);assert.equal(read.revision,'0');
  assert.deepEqual(owner.images,read.images.map(i=>i.url));assert.equal(owner.receipt.files_remaining,0);
  assert.equal((await primary(item,'0',0)).changed,false);
  for(const ordinal of [0,1,2])assert.deepEqual(await media(item,ordinal),await media(item,ordinal,true));
 });
 let saved,beforeHappy,previousMedia;
 await check('middle_photo_removal_is_atomic_keeps_original_urls_primary_and_publication_proof',async()=>{
  const item=cases.happy;beforeHappy=await snapshot(item);previousMedia=[await media(item,0),await media(item,1),await media(item,2)];
  saved=await remove(item,'0',1);
  assert.deepEqual(Object.keys(saved).sort(),['schema_version','actor_user_id','identity_id','listing_id','attempt_id','revision','images','changed'].sort());
  assert.equal(saved.changed,true);assert.equal(saved.revision,'1');assert.equal(saved.actor_user_id,item.author);
  assert.deepEqual(saved.images,[0,2].map(ordinal=>({ordinal,url:`/api/v2/listing-media/${item.attempt}/${ordinal}`,is_primary:ordinal===0})));
  const after=await snapshot(item);
  for(const field of ['attempt','publication','slots','objects','ready','listing','storage'])assert.deepEqual(after[field],beforeHappy[field],field);
  assert.equal(after.images.length,2);assert.equal(after.cleanup.length,beforeHappy.cleanup.length+1);
  const retired=after.cleanup.find(row=>row.value.object_id===webAt(item,1).id).value;
  assert.equal(retired.reason,'published_image_removed');assert.equal(retired.object_path,webAt(item,1).object_path);
  assert.equal(retired.state,'pending');assert.equal(retired.try_count,0);assert.equal(retired.work_key,null);
 });
 await check('removed_public_and_owner_urls_are_revoked_while_remaining_bindings_unchanged',async()=>{
  const item=cases.happy;
  for(const owner of [false,true]){
   assert.equal(await media(item,1,owner),null);
   for(const ordinal of [0,2])assert.deepEqual(await media(item,ordinal,owner),previousMedia[ordinal]);
  }
  const current=await ownerRead(item);assert.deepEqual(current.images,saved.images.map(i=>i.url));
  assert.deepEqual(current.receipt,(await accounting(item)).receipt);
 });
 await check('queued_web_is_retained_and_charged_without_source_receipt_count_or_new_cleanup_capability',async()=>{
  const item=cases.happy,a=await accounting(item);assert.equal(Number(a.bytes),3*4*1024*1024);
  assert.equal(a.receipt.files_remaining,0);assert.equal(a.receipt.state,'published');assert.equal(await claim(item),null);
  assert.equal((await values('SELECT count(*)::int n FROM storage.objects WHERE id=$1',[webAt(item,1).storageId]))[0].n,1);
  assert.equal((await values('SELECT listing_publication_private.multipart_object_fully_deleted($1) removed',[webAt(item,1).id]))[0].removed,false);
  await denied(()=>asRole('service_role','SELECT public.claim_listing_cleanup_v1()'));
 });
 await check('sparse_gallery_still_supports_primary_change_and_removal_to_one_remaining_photo',async()=>{
  const item=cases.happy,next=await primary(item,'1',2);assert.equal(next.revision,'2');
  assert.deepEqual(next.images.filter(i=>i.is_primary).map(i=>i.ordinal),[2]);
  const last=await remove(item,'2',0);assert.equal(last.revision,'3');assert.deepEqual(last.images.map(i=>i.ordinal),[2]);
  assert.equal((await primary(item,'3',2)).changed,false);assert.equal((await ownerRead(item)).images[0],last.images[0].url);
  await unchangedFailure(item,()=>remove(item,'3',2),'22023');
 });
 await check('primary_only_empty_and_unknown_targets_fail_without_any_write',async()=>{
  await unchangedFailure(cases.race,()=>remove(cases.race,'0',0),'22023');
  await unchangedFailure(one,()=>remove(one,'0',0),'22023');
  await unchangedFailure(empty,()=>remove(empty,'0',0),'22023');
  await unchangedFailure(cases.race,()=>remove(cases.race,'0',9),'22023');
 });
 await check('stale_remove_primary_and_lost_ack_replay_conflict_without_repeated_effects',async()=>{
  const item=cases.race,tabA=await gallery(item),tabB=await gallery(item);
  await remove(item,tabA.revision,1);
  await unchangedFailure(item,()=>remove(item,tabB.revision,2),'40001','listing_images_conflict');
  await unchangedFailure(item,()=>primary(item,tabB.revision,2),'40001','listing_images_conflict');
  await unchangedFailure(item,()=>remove(item,tabA.revision,1),'40001','listing_images_conflict');
  assert.deepEqual((await gallery(item)).images.map(i=>i.ordinal),[0,2]);
 });
 await check('invalid_revision_or_ordinal_is_rejected_before_mutation',async()=>{
  for(const revision of [null,'','01','-1','1.0','1e0','9223372036854775808','9'.repeat(100)])
   await unchangedFailure(cases.pending,()=>remove(cases.pending,revision,1),'22023');
  for(const ordinal of [null,-1,10])await unchangedFailure(cases.pending,()=>remove(cases.pending,'0',ordinal),'22023');
 });
 await check('revision_failure_rolls_back_web_enqueue_and_public_membership_delete',async()=>{
  const item=cases.rollback;
  await db.exec(`ALTER TABLE listing_publication_private.managed_image_presentations_v1 ADD CONSTRAINT synthetic_reject_revision CHECK(attempt_id<>'${item.attempt}'::uuid)`);
  try{await unchangedFailure(item,()=>remove(item,'0',1),'23514');}
  finally{await db.exec('ALTER TABLE listing_publication_private.managed_image_presentations_v1 DROP CONSTRAINT synthetic_reject_revision');}
 });
 await check('target_source_still_pending_cannot_be_stranded_by_web_retirement',async()=>{
  const item=cases.pending;await unchangedFailure(item,()=>remove(item,'0',1),'55000','listing_images_unavailable');
  assert.equal((await accounting(item)).receipt.files_remaining,3);
 });
 await check('other_sources_continue_accepted_cleanup_after_one_completed_source_photo_is_removed',async()=>{
  const item=cases.sourceContinues,work=await claim(item);assert.equal(work.object_id,sourceAt(item,1).id);
  await removeSyntheticMetadata(sourceAt(item,1));await record(item,work);
  assert.equal((await accounting(item)).receipt.files_remaining,2);
  await remove(item,'0',1);assert.equal((await accounting(item)).receipt.files_remaining,2);
  await completeSources(item);assert.equal(Number((await accounting(item)).bytes),3*4*1024*1024);
  assert.deepEqual((await gallery(item)).images.map(i=>i.ordinal),[0,2]);
 });
 await check('each_missing_original_slot_needs_exact_retirement_reason_path_and_no_active_row',async()=>{
  for(const name of ['missing','activeMarker','wrongReason','wrongPath']){
   const item=cases[name],object=webAt(item,1);
   if(name!=='missing')await db.query(`INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
    VALUES($1,$2,$3,$4,'pending',clock_timestamp())`,[object.id,object.bucket_id,
    name==='wrongPath'?object.object_path+'-wrong':object.object_path,name==='wrongReason'?'terminal_delete':'published_image_removed']);
   if(name!=='activeMarker')await writer(item,'DELETE FROM public.listing_images WHERE listing_id=$1 AND sort_order=1',[item.id]);
   await unchangedFailure(item,()=>remove(item,'0',2),'55000','listing_images_unavailable');
  }
 });
 await check('existing_gallery_corruption_guards_are_retained',async()=>{
  for(const [index,item] of corrupted.entries())await unchangedFailure(item,()=>remove(item,'0',1),index===corrupted.length-1?'42501':'55000');
 });
 await check('malformed_gallery_keeps_owner_management_readable_without_reopening_retired_media',async()=>{
  for(const item of corrupted.slice(0,-1)){
   const owner=await ownerRead(item);assert.equal(owner.receipt.state,'published');assert.equal(owner.activity.status,'active');
   assert(owner.images.length<=10);assert.equal(new Set(owner.images).size,owner.images.length);
   assert(owner.images.every(url=>url.startsWith(`/api/v2/listing-media/${item.attempt}/`)));
  }
  const inconsistent=cases.activeMarker,owner=await ownerRead(inconsistent);
  assert.equal(owner.receipt.state,'published');assert.equal(owner.activity.status,'active');
  assert(!owner.images.includes(`/api/v2/listing-media/${inconsistent.attempt}/1`));
  await unchangedFailure(inconsistent,()=>remove(inconsistent,'0',2),'55000');
  assert.equal(await media(inconsistent,1),null);assert.equal(await media(inconsistent,1,true),null);
  // Existing terminal removal remains available even with a missing public image.
  const missing=corrupted[4];
  await asActor(missing.author,'SELECT public.delete_my_published_listing_v1($1,$2,$3)',[missing.author,missing.identity,String(missing.id)]);
  const terminal=await ownerRead(missing);assert.equal(terminal.receipt.state,'deleting');assert.equal(terminal.activity,null);assert.deepEqual(terminal.images,[]);
 });
 await check('changed_account_identity_listing_attempt_or_preview_access_cannot_remove',async()=>{
  const item=cases.pending;
  await unchangedFailure(item,()=>asActor(actors.peer,'SELECT public.remove_my_managed_listing_image_v1($1,$2,$3,$4,$5,$6)',
   [item.author,item.identity,item.id,item.attempt,'0',1]));
  await unchangedFailure(item,()=>remove({...item,identity:actors.peerIdentity},'0',1,actors.peer));
  await unchangedFailure(item,()=>remove({...item,attempt:cases.race.attempt},'0',1));
  await db.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[actors.otherIdentity,actors.owner]);
  try{await unchangedFailure(item,()=>remove(item,'0',1));}
  finally{await db.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[actors.ownerIdentity,actors.owner]);}
  await unchangedFailure(outsider,()=>remove(outsider,'0',1));
 });
 await check('active_business_member_can_remove_without_rewriting_publisher_and_revocation_is_rechecked',async()=>{
  const item=cases.business,before=await snapshot(item);
  await db.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[actors.businessIdentity,actors.member]);
  try{
   const ack=await remove(item,'0',1,actors.member);assert.equal(ack.actor_user_id,actors.member);
   const after=await snapshot(item);assert.deepEqual(after.attempt,before.attempt);assert.deepEqual(after.publication,before.publication);
   await db.query("UPDATE public.business_members SET status='inactive' WHERE user_id=$1",[actors.member]);
   await unchangedFailure(item,()=>remove(item,'1',2,actors.member));
  }finally{
   await db.query("UPDATE public.business_members SET status='active' WHERE user_id=$1",[actors.member]);
   await db.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[actors.memberIdentity,actors.member]);
  }
 });
 await check('paused_sold_and_expired_public_visibility_rules_remain_distinct_from_owner_access',async()=>{
  for(const name of ['paused','sold']){
   const item=cases[name];await remove(item,'0',1);assert.equal(await media(item,0),null);assert(await media(item,0,true));
   assert.equal((await ownerRead(item)).activity.status,name);
  }
  const item=cases.rollback;await writer(item,"UPDATE public.listings SET active_until=clock_timestamp()-interval '1 minute' WHERE id=$1",[item.id]);
  assert.equal(await media(item,0),null);assert(await media(item,0,true));
 });
 await check('later_whole_listing_delete_retains_removed_web_lineage_and_completed_source_quota',async()=>{
  const item=cases.deleteLater;await remove(item,'0',1);
  const retired=(await values('SELECT to_jsonb(c) value FROM listing_publication_private.cleanup c WHERE object_id=$1',[webAt(item,1).id]))[0].value;
  await asActor(item.author,'SELECT public.delete_my_published_listing_v1($1,$2,$3)',[item.author,item.identity,String(item.id)]);
  assert.deepEqual((await values('SELECT to_jsonb(c) value FROM listing_publication_private.cleanup c WHERE object_id=$1',[webAt(item,1).id]))[0].value,retired);
  const a=await accounting(item);assert.equal(a.receipt.state,'deleting');assert.equal(a.receipt.files_remaining,3);assert.equal(Number(a.bytes),3*4*1024*1024);
  await unchangedFailure(item,()=>remove(item,'1',2),'55000');assert.equal(await media(item,0),null);assert.equal(await media(item,0,true),null);
  assert.deepEqual((await ownerRead(item)).images,[]);
 });
 await check('new_rpc_is_authenticated_only_and_private_tables_helpers_and_worker_stay_closed',async()=>{
  const item=cases.pending,signature='public.remove_my_managed_listing_image_v1(uuid,uuid,bigint,uuid,text,integer)';
  for(const role of ['anon','service_role']){
   assert.equal((await values('SELECT has_function_privilege($1,$2,\'EXECUTE\') allowed',[role,signature]))[0].allowed,false);
   await denied(()=>asRole(role,'SELECT public.remove_my_managed_listing_image_v1($1,$2,$3,$4,$5,$6)',[item.author,item.identity,item.id,item.attempt,'0',1]));
  }
  assert.equal((await values('SELECT has_function_privilege(\'authenticated\',$1,\'EXECUTE\') allowed',[signature]))[0].allowed,true);
  await denied(()=>asActor(item.author,'SELECT * FROM listing_publication_private.cleanup'));
  await denied(()=>asRole('service_role','SELECT public.record_listing_cleanup_v1($1,$2,$3)',[webAt(item,1).id,crypto.randomUUID(),'deleted']));
  assert.equal((await values('SELECT count(*)::int n FROM listing_publication_private.multipart_auxiliary_receipts'))[0].n,0);
 });
 await check('published_slot_object_ready_and_cleanup_lineage_remain_immutable',async()=>{
  const item=cases.happy;
  await denied(()=>db.query('UPDATE listing_publication_private.slots SET ordinal=8 WHERE attempt_id=$1 AND ordinal=1',[item.attempt]),'55000');
  await denied(()=>db.query('DELETE FROM listing_publication_private.objects WHERE id=$1',[webAt(item,1).id]),'55000');
  await denied(()=>db.query('DELETE FROM listing_publication_private.cleanup WHERE object_id=$1',[webAt(item,1).id]),'55000');
 });
 result.passed=true;result.source_provenance=provenance;result.changes_sha256=crypto.createHash('sha256').update(read('changes.sql')).digest('hex');
 console.log(JSON.stringify({passed:true,checks:checks.length}));
}catch(e){result.passed=false;console.error(JSON.stringify({message:e.message,code:e.code,where:e.where,stack:e.stack}));process.exitCode=1;}
finally{fs.writeFileSync(path.join(here,'runtime-result.json'),JSON.stringify(result,null,2)+'\n');await db.close();}
