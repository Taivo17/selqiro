import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {db,read,here,actors,asActor,asRole,withActorContext,seedListing,immutableSnapshot,provenance} from './fixture.mjs';
const checks=[];
const results={schema_version:1,scope:'Actual SQL in isolated PGlite with synthetic hosted-like roles and retained declarations.',checks,
 native_postgresql_17_executed:false,provider_storage_executed:false,live_database_calls:false,parallel_sessions_executed:false};
const gallery=async(l,user=actors.owner)=>(await asActor(user,
 'SELECT public.get_my_managed_listing_images_v1($1,$2,$3,$4) result',[user,l.identity,l.id,l.attempt])).rows[0].result;
const set=async(l,revision,ordinal,user=actors.owner)=>(await asActor(user,
 'SELECT public.set_my_managed_listing_primary_image_v1($1,$2,$3,$4,$5,$6) result',[user,l.identity,l.id,l.attempt,revision,ordinal])).rows[0].result;
const rows=async()=>Number((await db.query('SELECT count(*) count FROM listing_publication_private.managed_image_presentations_v1')).rows[0].count);
async function check(label,operation,code,message){
 try{await operation();assert.equal(code,undefined,'expected SQLSTATE '+code);checks.push({label,passed:true});}
 catch(e){if(code&&e.code===code&&(!message||e.message===message)){checks.push({label,passed:true,observed_sqlstate:e.code});return;}
  checks.push({label,passed:false,code:e.code,message:e.message});throw e;}
}
async function sameAfterFailure(operation,code,message){
 const presentation=async()=>({
  listings:(await db.query('SELECT id,image FROM public.listings ORDER BY id')).rows,
  images:(await db.query('SELECT id,is_primary FROM public.listing_images ORDER BY id')).rows,
  revisions:(await db.query('SELECT * FROM listing_publication_private.managed_image_presentations_v1 ORDER BY attempt_id')).rows
 });
 const before=await immutableSnapshot();const beforePresentation=await presentation();let error;
 try{await operation();}catch(e){error=e;}
 assert.equal(error?.code,code);if(message)assert.equal(error.message,message);
 assert.deepEqual(await immutableSnapshot(),before);assert.deepEqual(await presentation(),beforePresentation);
}
try{
 results.engine=(await db.query('SELECT version() version')).rows[0].version;
 await db.exec(read('changes.sql'));
 const l=await seedListing(101);const empty=await seedListing(102,{count:0});const other=await seedListing(103);
 const business=await seedListing(104,{identity:actors.businessIdentity});
 await check('read_returns_exact_envelope_stable_ordinals_revision_zero_without_writes',async()=>{
  const before=await immutableSnapshot();const out=await gallery(l);
  assert.deepEqual(Object.keys(out).sort(),['actor_user_id','attempt_id','identity_id','images','listing_id','revision','schema_version']);
  assert.equal(out.actor_user_id,actors.owner);assert.equal(out.listing_id,'101');assert.equal(out.attempt_id,l.attempt);
  assert.equal(out.revision,'0');assert.equal(await rows(),0);
  assert.deepEqual(out.images,[0,1,2].map(ordinal=>({ordinal,url:`/api/v2/listing-media/${l.attempt}/${ordinal}`,is_primary:ordinal===0})));
  assert.deepEqual(await immutableSnapshot(),before);
 });
 await check('cover_change_updates_exactly_primary_mirror_revision_and_no_immutable_data',async()=>{
  const before=await immutableSnapshot();const out=await set(l,'0',2);
  assert.equal(out.changed,true);assert.equal(out.revision,'1');assert.deepEqual(out.images.map(i=>i.ordinal),[0,1,2]);
  assert.deepEqual(out.images.filter(i=>i.is_primary).map(i=>i.ordinal),[2]);
  const row=(await db.query('SELECT image,status,price_revision FROM public.listings WHERE id=101')).rows[0];
  assert.equal(row.image,`/api/v2/listing-media/${l.attempt}/2`);assert.equal(row.status,'active');assert.equal(row.price_revision,0);
  assert.deepEqual(await immutableSnapshot(),before);assert.deepEqual(await gallery(l),Object.fromEntries(Object.entries(out).filter(([k])=>k!=='changed')));
 });
 await check('same_primary_with_current_revision_is_noop_without_revision_increment',async()=>{
  const n=await rows();const out=await set(l,'1',2);assert.equal(out.changed,false);assert.equal(out.revision,'1');assert.equal(await rows(),n);
 });
 await check('stale_same_target_is_conflict_even_after_uncertain_previous_success',async()=>{
  await sameAfterFailure(()=>set(l,'0',2),'40001','listing_images_conflict');assert.equal((await gallery(l)).revision,'1');
 });
 await check('two_editors_same_revision_first_wins_second_conflicts_then_explicit_refresh_succeeds',async()=>{
  const tabA=await gallery(l);const tabB=await gallery(l);
  const first=await set(l,tabA.revision,1);assert.equal(first.revision,'2');
  await sameAfterFailure(()=>set(l,tabB.revision,0),'40001','listing_images_conflict');
  const fresh=await gallery(l);const accepted=await set(l,fresh.revision,0);assert.equal(accepted.revision,'3');
 });
 await check('empty_gallery_read_is_valid_and_does_not_initialize_revision',async()=>{
  const n=await rows();const out=await gallery(empty);assert.deepEqual(out.images,[]);assert.equal(out.revision,'0');assert.equal(await rows(),n);
  await sameAfterFailure(()=>set(empty,'0',0),'22023');
 });
 await check('bad_revision_and_ordinal_commands_are_rejected_before_mutation',async()=>{
  for(const revision of [null,'','01','-1','1.0','1e0','NaN','9223372036854775808','9'.repeat(100)])await sameAfterFailure(()=>set(l,revision,0),'22023');
  for(const ordinal of [null,-1,3,10])await sameAfterFailure(()=>set(l,'3',ordinal),'22023');
  await sameAfterFailure(()=>set(l,'9223372036854775807',1),'40001','listing_images_conflict');
 });
 await check('failure_after_primary_flags_update_rolls_back_the_complete_change',async()=>{
  await db.query(`ALTER TABLE public.listings ADD CONSTRAINT synthetic_cover_failure
   CHECK(id<>101 OR image IS DISTINCT FROM '/api/v2/listing-media/${l.attempt}/2')`);
  try{await sameAfterFailure(()=>set(l,'3',2),'23514');}
  finally{await db.exec('ALTER TABLE public.listings DROP CONSTRAINT synthetic_cover_failure');}
 });
 await check('wrong_actor_spoof_cannot_read_another_users_gallery',async()=>{
  await asActor(actors.peer,'SELECT public.get_my_managed_listing_images_v1($1,$2,$3,$4)',[actors.owner,l.identity,l.id,l.attempt]);
 },'42501');
 await check('wrong_identity_cannot_read_or_write_managed_gallery',async()=>{
  await sameAfterFailure(()=>set({...l,identity:actors.peerIdentity},'3',1,actors.peer),'42501');
 });
 await check('changed_active_identity_invalidates_existing_edit_session',async()=>{
  await db.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[actors.otherIdentity,actors.owner]);
  try{await sameAfterFailure(()=>set(l,'3',1),'42501');}finally{await db.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[actors.ownerIdentity,actors.owner]);}
 });
 await check('unlisted_hosted_actor_is_rejected',async()=>{
  const outsider=await seedListing(105,{identity:actors.outsiderIdentity,author:actors.outsider});
  await sameAfterFailure(()=>set(outsider,'0',1,actors.outsider),'42501');
 });
 await check('wrong_attempt_listing_binding_is_rejected',async()=>{
  await sameAfterFailure(()=>set({...l,attempt:other.attempt},'3',1),'42501');
 });
 await check('business_active_member_can_edit_without_becoming_original_creator',async()=>{
  await db.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[actors.businessIdentity,actors.member]);
  try{
   const before=await immutableSnapshot();const out=await set(business,'0',1,actors.member);
   assert.equal(out.actor_user_id,actors.member);assert.equal(out.identity_id,actors.businessIdentity);assert.equal(out.revision,'1');
   assert.deepEqual(await immutableSnapshot(),before);
  }finally{await db.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[actors.memberIdentity,actors.member]);}
 });
 await check('revoked_business_membership_is_rechecked_before_mutation',async()=>{
  await db.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[actors.businessIdentity,actors.member]);
  await db.query("UPDATE public.business_members SET status='removed' WHERE user_id=$1",[actors.member]);
  try{await sameAfterFailure(()=>set(business,'1',0,actors.member),'42501');}
  finally{await db.query("UPDATE public.business_members SET status='active' WHERE user_id=$1",[actors.member]);await db.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[actors.memberIdentity,actors.member]);}
 });
 await check('original_public_writer_policies_filter_another_identity_even_for_internal_writer',async()=>{
  const before=await immutableSnapshot();
  const listings=await withActorContext(actors.peer,()=>asRole('selqiro_listing_final_writer_v1',
   'UPDATE public.listings SET image=image WHERE id=$1 RETURNING id',[l.id]));
  const images=await withActorContext(actors.peer,()=>asRole('selqiro_listing_final_writer_v1',
   'UPDATE public.listing_images SET is_primary=is_primary WHERE listing_id=$1 RETURNING id',[l.id]));
  assert.deepEqual(listings.rows,[]);assert.deepEqual(images.rows,[]);
  assert.deepEqual(await immutableSnapshot(),before);
 });
 await check('retained_identity_policy_helper_is_closed_to_public_and_explicitly_granted_to_writer',async()=>{
  const rights=(await db.query(`SELECT
   has_function_privilege('anon','public.current_user_has_identity_access(uuid)','EXECUTE') anonymous,
   has_function_privilege('authenticated','public.current_user_has_identity_access(uuid)','EXECUTE') authenticated,
   has_function_privilege('service_role','public.current_user_has_identity_access(uuid)','EXECUTE') service,
   has_function_privilege('selqiro_listing_final_writer_v1','public.current_user_has_identity_access(uuid)','EXECUTE') writer,
   has_function_privilege('authenticated','listing_publication_private.multipart_object_fully_deleted(uuid)','EXECUTE') api_receipt_helper,
   has_function_privilege('selqiro_listing_final_writer_v1','listing_publication_private.multipart_object_fully_deleted(uuid)','EXECUTE') writer_receipt_helper`)).rows[0];
  assert.deepEqual(rights,{anonymous:false,authenticated:true,service:true,writer:true,api_receipt_helper:false,writer_receipt_helper:true});
 });
 await check('paused_and_sold_listing_cover_edit_preserves_lifecycle_status',async()=>{
  for(const [id,status] of [[110,'paused'],[111,'sold']]){const item=await seedListing(id,{status});await set(item,'0',1);assert.equal((await db.query('SELECT status FROM public.listings WHERE id=$1',[id])).rows[0].status,status);}
 });
 await check('gallery_corruption_and_missing_ready_receipts_fail_closed_without_partial_change',async()=>{
  let id=120;for(const bad of ['ordinal-gap','invalid-intent','missing-ready','web-cleanup','missing-image','extra-image','wrong-url','multiple-primary','wrong-mirror']){
   const invalid=await seedListing(id++,{bad});await sameAfterFailure(()=>set(invalid,'0',1),'55000','listing_images_unavailable');
  }
  const invalid=await seedListing(id++,{bad:'wrong-creator'});await sameAfterFailure(()=>set(invalid,'0',1),'42501');
 });
 await check('legacy_primary_writer_remains_blocked_for_managed_listings',async()=>{
  const image=(await db.query('SELECT id FROM public.listing_images WHERE listing_id=101 AND sort_order=1')).rows[0].id;
  await sameAfterFailure(()=>asActor(actors.owner,'SELECT public.set_listing_primary_image_v2($1,$2)',['101',image]),'42501','publication_managed_image_immutable');
 });
 await check('direct_authenticated_private_table_and_helpers_are_forbidden',async()=>{
  for(const sql of [
   'SELECT * FROM listing_publication_private.managed_image_presentations_v1',
   "SELECT listing_publication_private.require_managed_image_actor_v1(NULL,NULL)",
   "SELECT listing_publication_private.validate_managed_image_intent_v1(NULL,NULL)"
  ]){let error;try{await asActor(actors.owner,sql);}catch(e){error=e;}assert.equal(error?.code,'42501');}
 });
 await check('api_permission_matrix_is_authenticated_only_and_writer_role_is_closed',async()=>{
  for(const role of ['anon','service_role'])await sameAfterFailure(()=>asRole(role,'SELECT public.get_my_managed_listing_images_v1($1,$2,$3,$4)',[actors.owner,l.identity,l.id,l.attempt]),'42501');
  const rights=(await db.query(`SELECT
   has_function_privilege('selqiro_listing_final_writer_v1','public.require_listing_create_keys_v1(jsonb,text[])','EXECUTE') pure_helper,
   has_schema_privilege('selqiro_listing_final_writer_v1','public','CREATE') schema_create,
   has_schema_privilege('authenticated','listing_publication_private','USAGE') private_usage,
   has_table_privilege('authenticated','listing_publication_private.managed_image_presentations_v1','SELECT') private_read,
   has_table_privilege('selqiro_listing_final_writer_v1','listing_publication_private.managed_image_presentations_v1','DELETE') private_delete`)).rows[0];
  assert.deepEqual(rights,{pure_helper:false,schema_create:false,private_usage:false,private_read:false,private_delete:false});
  const role=(await db.query("SELECT rolcanlogin,rolsuper,rolinherit,rolbypassrls FROM pg_roles WHERE rolname='selqiro_listing_final_writer_v1'")).rows[0];
  assert.deepEqual(role,{rolcanlogin:false,rolsuper:false,rolinherit:false,rolbypassrls:false});
 });
 await check('immutable_slot_updates_are_still_rejected',async()=>{
  await db.query('UPDATE listing_publication_private.slots SET ordinal=8 WHERE attempt_id=$1 AND ordinal=0',[l.attempt]);
 },'55000','publication_slot_immutable');
 await check('terminal_deletion_tombstone_blocks_new_gallery_actions_and_retains_revision',async()=>{
  const terminal=await seedListing(140);await set(terminal,'0',2);
  // Existing terminal-delete logic is exercised on a zero-object listing below.
  // For this imageful fixture, seed only the legitimate terminal tombstone under
  // the exact final-writer trigger; do not run any cleanup worker or fabricate IO.
  await withActorContext(actors.owner,()=>asRole('selqiro_listing_final_writer_v1',
   "UPDATE listing_publication_private.publications SET state='deleting',deleted_at=clock_timestamp() WHERE attempt_id=$1",[terminal.attempt]));
  await sameAfterFailure(()=>set(terminal,'1',0),'55000','listing_images_unavailable');
  assert.equal((await db.query('SELECT revision FROM listing_publication_private.managed_image_presentations_v1 WHERE attempt_id=$1',[terminal.attempt])).rows[0].revision,1);
 });
 await check('latest_receipt_keeps_seeded_terminal_images_pending_without_multipart_auxiliary_proof',async()=>{
  // Receipt-semantic fixture only: seed the terminal SQL state and synthetic
  // incomplete multipart sessions. This is not a Storage cleanup execution.
  const terminal=await seedListing(142,{count:1});
  await db.query(`INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
   SELECT id,bucket_id,object_path,'terminal_delete','blocked_write_settlement',clock_timestamp()
   FROM listing_publication_private.objects WHERE attempt_id=$1 ON CONFLICT(object_id) DO NOTHING`,[terminal.attempt]);
  await db.query(`INSERT INTO listing_publication_private.multipart_sessions(object_id,request_key)
   SELECT id,gen_random_uuid() FROM listing_publication_private.objects WHERE attempt_id=$1`,[terminal.attempt]);
  await withActorContext(actors.owner,async()=>{
   await asRole('selqiro_listing_final_writer_v1',"UPDATE listing_publication_private.publications SET state='deleting',deleted_at=clock_timestamp() WHERE attempt_id=$1",[terminal.attempt]);
   await asRole('selqiro_listing_final_writer_v1','DELETE FROM public.listing_images WHERE listing_id=$1',[terminal.id]);
   await asRole('selqiro_listing_final_writer_v1','DELETE FROM public.listings WHERE id=$1',[terminal.id]);
   await asRole('selqiro_listing_final_writer_v1',"UPDATE listing_publication_private.attempts SET state='deleted' WHERE id=$1",[terminal.attempt]);
  });
  assert.equal((await db.query('SELECT count(*) count FROM public.listings WHERE id=$1',[terminal.id])).rows[0].count,0);
  const receipt=async()=>(await withActorContext(actors.owner,()=>asRole('selqiro_listing_final_writer_v1',
   'SELECT listing_publication_private.final_receipt($1) result',[terminal.attempt]))).rows[0].result;
  const pending=await receipt();assert.equal(pending.content_deleted,true);assert.equal(pending.state,'deleting');assert.equal(pending.files_remaining,2);
  // Even a synthetic claimed final-object deletion cannot stand in for the
  // missing multipart auxiliary proof. The obsolete core receipt fails this.
  await db.query(`UPDATE listing_publication_private.cleanup SET state='deleted',work_key=gen_random_uuid(),
   lease_until=clock_timestamp(),try_count=1,deleted_at=clock_timestamp()
   WHERE object_id IN(SELECT id FROM listing_publication_private.objects WHERE attempt_id=$1)`,[terminal.attempt]);
  const before=await immutableSnapshot();const incomplete=await receipt();
  assert.equal(incomplete.state,'deleting');assert.equal(incomplete.files_remaining,2);assert.equal(incomplete.content_deleted,true);
  assert.deepEqual(await immutableSnapshot(),before);
  assert.equal((await db.query('SELECT count(*) count FROM listing_publication_private.multipart_auxiliary_receipts')).rows[0].count,0);
 });
 await check('actual_existing_delete_of_empty_listing_remains_compatible',async()=>{
  // apply_delete only invokes object_cleanup_state for existing objects. This
  // empty fixture therefore tests real tombstone/listing deletion without IO.
  const terminal=await seedListing(141,{count:0});
  // Supply the retained helper dependency as a closed SQL function for compilation;
  // there are no rows and it is never evaluated in this test.
  await db.exec("CREATE FUNCTION listing_publication_private.object_cleanup_state(uuid) RETURNS text LANGUAGE sql AS $$ SELECT 'blocked_write_settlement'::text $$; GRANT EXECUTE ON FUNCTION listing_publication_private.object_cleanup_state(uuid) TO selqiro_listing_final_writer_v1");
  await asActor(actors.owner,'SELECT public.delete_my_published_listing_v1($1,$2,$3)',[actors.owner,terminal.identity,String(terminal.id)]);
  assert.equal((await db.query('SELECT count(*) count FROM public.listings WHERE id=$1',[terminal.id])).rows[0].count,0);
  await sameAfterFailure(()=>gallery(terminal),'55000','listing_images_unavailable');
 });
 results.passed=true;results.source_provenance=provenance;
 results.changes_sha256=crypto.createHash('sha256').update(read('changes.sql')).digest('hex');
 console.log(JSON.stringify({passed:true,checks:checks.length}));
}catch(error){results.passed=false;console.error(error.message,error.code,error.where);process.exitCode=1;}
finally{fs.writeFileSync(path.join(here,'runtime-result.json'),JSON.stringify(results,null,2)+'\n');await db.close();}
