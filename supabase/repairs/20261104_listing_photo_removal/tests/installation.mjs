// Execute this repair's preflight/apply/verify only, against the composed fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {db,read,here,provenance,seal} from './fixture.mjs';
const checks=[];
const result={schema_version:1,scope:'Guarded membership removal install after accepted primary and completed SOURCE declarations.',
 checks,live_database_calls:false,provider_storage_executed:false,native_postgresql_executed:false,concurrent_session_execution:false};
const inspect=async(file='preflight.sql')=>{
 const rows=(await db.exec(read(file))).flatMap(x=>x.rows??[]);
 assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]),['result']);return rows[0].result;
};
async function check(label,operation){try{await operation();checks.push({label,passed:true});}
 catch(e){checks.push({label,passed:false,message:e.message,code:e.code});throw e;}}
async function refuse(sql,message='LISTING_PHOTO_REMOVAL_READY_ABSENT_STATE_REQUIRED'){
 let error;try{await db.exec(sql);}catch(e){error=e;}finally{await db.exec('ROLLBACK');}
 assert.equal(error?.code,'55000',error?.message);assert.equal(error.message,message);
}
async function changed(sql,restore,guard){
 await db.exec(sql);try{
  const r=await inspect();assert.equal(r.state,'unknown');if(guard)assert.equal(r.guards[guard],false);
  await refuse(read('apply.sql'));
 }finally{await db.exec(restore);}
}
try{
 await seal();result.engine=(await db.query('SELECT version() version')).rows[0].version;
 const before=await inspect();
 await check('accepted_source_and_primary_contracts_are_ready_absent_without_writes',async()=>{
  assert.equal(before.state,'absent',JSON.stringify(before));assert.equal(before.recognized,true);assert.equal(before.ready_to_apply,true);
  assert(Object.values(before.guards).every(Boolean));assert.equal(before.hosted_context.cleanup_mode,'held');
  assert.equal(before.kind,'listing-published-photo-removal-v1');
  assert.deepEqual(Object.keys(before.guards).sort(),['functions','installer','actor_roles','core_relations','managed_triggers',
   'required_columns','hosted_context_ready','closed_private_schema','final_writer_policies'].sort());
 });
 await check('unknown_new_rpc_overloads_or_procedures_are_not_overwritten',async()=>{
  await changed('CREATE FUNCTION public.remove_my_managed_listing_image_v1() RETURNS jsonb LANGUAGE sql AS $$ SELECT NULL::jsonb $$',
   'DROP FUNCTION public.remove_my_managed_listing_image_v1()');
  await changed('CREATE PROCEDURE public.remove_my_managed_listing_image_v1() LANGUAGE plpgsql AS $$ BEGIN NULL; END $$',
   'DROP PROCEDURE public.remove_my_managed_listing_image_v1()');
 });
 await check('all_replaced_gallery_media_and_owner_definitions_are_exactly_pinned',async()=>{
  for(const signature of ['listing_publication_private.lock_managed_listing_images_v1(uuid,uuid,bigint,uuid,boolean)',
   'public.get_public_listing_media_binding_v1(uuid,integer)','public.get_my_listing_media_binding_v2(uuid,uuid,uuid,integer)',
   'public.get_my_managed_listing_v2(uuid,uuid,text)'])
   await changed(`ALTER FUNCTION ${signature} STABLE`,`ALTER FUNCTION ${signature} VOLATILE`);
 });
 await check('only_the_exact_accepted_cleanup_reason_constraint_can_be_expanded',async()=>{
  const original=(await db.query("SELECT pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid='listing_publication_private.cleanup'::regclass AND conname='final_cleanup_reason'")).rows[0].definition;
  await changed("ALTER TABLE listing_publication_private.cleanup DROP CONSTRAINT final_cleanup_reason; ALTER TABLE listing_publication_private.cleanup ADD CONSTRAINT final_cleanup_reason CHECK(reason IN('cancelled','expired','published_source','terminal_delete','unexpected'))",
   'ALTER TABLE listing_publication_private.cleanup DROP CONSTRAINT final_cleanup_reason; ALTER TABLE listing_publication_private.cleanup ADD CONSTRAINT final_cleanup_reason '+original);
 });
 await check('completed_source_identity_and_primary_dependencies_cannot_drift',async()=>{
  for(const signature of ['listing_publication_private.hosted_completed_source_deleted_v1(uuid)',
   'listing_publication_private.multipart_object_fully_deleted(uuid)',
   'public.set_my_managed_listing_primary_image_v1(uuid,uuid,bigint,uuid,text,integer)'])
   await changed(`ALTER FUNCTION ${signature} STABLE`,`ALTER FUNCTION ${signature} VOLATILE`,'functions');
  await changed('ALTER FUNCTION listing_publication_private.require_managed_image_actor_v1(uuid,uuid) SECURITY INVOKER',
   'ALTER FUNCTION listing_publication_private.require_managed_image_actor_v1(uuid,uuid) SECURITY DEFINER','functions');
 });
 await check('source_primary_and_generic_api_grant_drift_is_rejected',async()=>{
  for(const [signature,role] of [
   ['public.record_listing_cleanup_v1(uuid,uuid,text)','service_role'],
   ['public.claim_listing_published_source_cleanup_v1(uuid,uuid,uuid,uuid)','authenticated'],
   ['public.set_my_managed_listing_primary_image_v1(uuid,uuid,bigint,uuid,text,integer)','anon']])
   await changed(`GRANT EXECUTE ON FUNCTION ${signature} TO ${role}`,`REVOKE EXECUTE ON FUNCTION ${signature} FROM ${role}`,'functions');
  await changed('REVOKE DELETE ON public.listing_images FROM selqiro_listing_final_writer_v1',
   'GRANT DELETE ON public.listing_images TO selqiro_listing_final_writer_v1','functions');
 });
 await check('cleanup_insert_revision_and_immutable_session_guards_must_be_enabled',async()=>{
  for(const [table,trigger] of [['cleanup','protect_cleanup'],['cleanup','guard_cleanup_web_fence'],
   ['managed_image_presentations_v1','protect_managed_image_presentation_v1'],['multipart_sessions','protect_multipart_session']])
   await changed(`ALTER TABLE listing_publication_private.${table} DISABLE TRIGGER ${trigger}`,
    `ALTER TABLE listing_publication_private.${table} ENABLE TRIGGER ${trigger}`,'managed_triggers');
 });
 await check('private_schema_and_writer_role_boundary_cannot_be_widened',async()=>{
  await changed('GRANT USAGE ON SCHEMA listing_publication_private TO service_role',
   'REVOKE USAGE ON SCHEMA listing_publication_private FROM service_role','closed_private_schema');
  await changed('GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1',
   'REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1','actor_roles');
 });
 await check('wrong_instance_or_public_storage_bucket_is_rejected',async()=>{
  await changed("UPDATE listing_publication_private.hosted_preview_settings SET instance_id='11111111-1111-1111-1111-111111111111'",
   "UPDATE listing_publication_private.hosted_preview_settings SET instance_id='2d088814-0900-448a-a9d1-7b05470cb1d2'",'hosted_context_ready');
  await changed("UPDATE storage.buckets SET public=true WHERE id='listing-publication-private'",
   "UPDATE storage.buckets SET public=false WHERE id='listing-publication-private'",'hosted_context_ready');
 });
 await check('failed_postcheck_rolls_back_function_replacements_new_rpc_and_constraint',async()=>{
  assert.deepEqual(await inspect(),before);
  const sql=read('apply.sql'),at=sql.indexOf('CREATE TEMP TABLE photo_removal_install_after');assert(at>0);
  const injected=sql.slice(0,at)+'GRANT EXECUTE ON FUNCTION public.remove_my_managed_listing_image_v1(uuid,uuid,bigint,uuid,text,integer) TO anon;\n'+sql.slice(at);
  await refuse(injected,'LISTING_PHOTO_REMOVAL_INSTALLED_STATE_NOT_VERIFIED');assert.deepEqual(await inspect(),before);
 });
 await check('unexpected_structure_change_also_rolls_back_the_complete_install',async()=>{
  const sql=read('apply.sql'),at=sql.indexOf('CREATE TEMP TABLE photo_removal_install_after');
  const injected=sql.slice(0,at)+'ALTER TABLE public.listing_images ADD COLUMN unexpected integer;\n'+sql.slice(at);
  await refuse(injected,'LISTING_PHOTO_REMOVAL_INSTALLED_STATE_NOT_VERIFIED');assert.deepEqual(await inspect(),before);
 });
 let after;
 await check('guarded_apply_changes_only_exact_capability_slots_preserving_old_authority_and_data_structure',async()=>{
  after=await inspect('apply.sql');assert.equal(after.state,'applied',JSON.stringify(after));assert.equal(after.ready_to_apply,false);
  assert.deepEqual(after.invariants,before.invariants);assert.equal(after.fingerprints.dependencies,before.fingerprints.dependencies);
  assert.deepEqual(after.hosted_context,before.hosted_context);assert.notEqual(after.fingerprints.capability,before.fingerprints.capability);
 });
 await check('verify_is_read_only_repeatable_and_repeated_apply_is_refused',async()=>{
  assert.deepEqual(await inspect('verify.sql'),after);await refuse(read('apply.sql'));assert.deepEqual(await inspect(),after);
 });
 await check('installed_authenticated_only_rpc_and_media_replacements_are_pinned',async()=>{
  await changed('GRANT EXECUTE ON FUNCTION public.remove_my_managed_listing_image_v1(uuid,uuid,bigint,uuid,text,integer) TO service_role',
   'REVOKE EXECUTE ON FUNCTION public.remove_my_managed_listing_image_v1(uuid,uuid,bigint,uuid,text,integer) FROM service_role');
  await changed('ALTER FUNCTION public.get_public_listing_media_binding_v1(uuid,integer) STABLE',
   'ALTER FUNCTION public.get_public_listing_media_binding_v1(uuid,integer) VOLATILE');
  assert.deepEqual(await inspect(),after);
 });
 result.passed=true;result.source_provenance=provenance;result.changes_sha256=crypto.createHash('sha256').update(read('changes.sql')).digest('hex');
 fs.writeFileSync(path.join(here,'preflight-example.json'),JSON.stringify(before,null,2)+'\n');
 fs.writeFileSync(path.join(here,'verified-example.json'),JSON.stringify(after,null,2)+'\n');
 console.log(JSON.stringify({passed:true,checks:checks.length}));
}catch(e){result.passed=false;console.error(JSON.stringify({message:e.message,code:e.code,where:e.where}));process.exitCode=1;}
finally{fs.writeFileSync(path.join(here,'installation-result.json'),JSON.stringify(result,null,2)+'\n');await db.close();}
