// Execute only this new repair, including its refusal and transactional boundaries.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {db,read,here,provenance,seal,previousPreflight} from './fixture.mjs';
const checks=[];
const result={schema_version:1,scope:'Exact preflight/apply/verify SQL against composed retained declarations with accepted primary-image repair.',
 checks,live_database_calls:false,provider_storage_executed:false,native_postgresql_executed:false,concurrent_session_execution:false};
const inspect=async(file='preflight.sql')=>{
 const rows=(await db.exec(read(file))).flatMap(x=>x.rows??[]);
 assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]),['result']);return rows[0].result;
};
async function check(label,operation){try{await operation();checks.push({label,passed:true});}
 catch(e){checks.push({label,passed:false,message:e.message,code:e.code});throw e;}}
async function refuse(sql,message='LISTING_HOSTED_SOURCE_READY_ABSENT_STATE_REQUIRED'){
 let error;try{await db.exec(sql);}catch(e){error=e;}finally{await db.exec('ROLLBACK');}
 assert.equal(error?.code,'55000');assert.equal(error.message,message);
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
 await check('composed_retained_contract_is_ready_absent_without_writes',async()=>{
  assert.equal(before.state,'absent',JSON.stringify(before));assert.equal(before.recognized,true);assert.equal(before.ready_to_apply,true);
  assert(Object.values(before.guards).every(Boolean));assert.equal(before.hosted_context.cleanup_mode,'held');
  assert.equal(before.kind,'listing-hosted-completed-source-cleanup-v1');
  assert.deepEqual(Object.keys(before.guards).sort(),['functions','installer','actor_roles','core_relations','managed_triggers',
   'required_columns','hosted_context_ready','closed_private_schema','final_writer_policies'].sort());
 });
 await check('unknown_new_function_or_procedure_is_never_overwritten',async()=>{
  await changed('CREATE FUNCTION public.claim_listing_published_source_cleanup_v1() RETURNS jsonb LANGUAGE sql AS $$ SELECT NULL::jsonb $$',
   'DROP FUNCTION public.claim_listing_published_source_cleanup_v1()');
  await changed('CREATE PROCEDURE public.claim_listing_published_source_cleanup_v1() LANGUAGE plpgsql AS $$ BEGIN NULL; END $$',
   'DROP PROCEDURE public.claim_listing_published_source_cleanup_v1()');
 });
 await check('old_central_predicate_must_match_exactly_before_replacement',async()=>{
  await changed('ALTER FUNCTION listing_publication_private.multipart_object_fully_deleted(uuid) STABLE',
   'ALTER FUNCTION listing_publication_private.multipart_object_fully_deleted(uuid) VOLATILE');
 });
 await check('shared_actor_and_gallery_authority_drift_are_rejected',async()=>{
  await changed('ALTER FUNCTION listing_publication_private.lock_multipart_cleanup_context(uuid,uuid,uuid,uuid) SECURITY INVOKER',
   'ALTER FUNCTION listing_publication_private.lock_multipart_cleanup_context(uuid,uuid,uuid,uuid) SECURITY DEFINER','functions');
  await changed('ALTER FUNCTION listing_publication_private.require_managed_image_actor_v1(uuid,uuid) SECURITY INVOKER',
   'ALTER FUNCTION listing_publication_private.require_managed_image_actor_v1(uuid,uuid) SECURITY DEFINER','functions');
 });
 await check('bounded_metadata_view_cannot_be_replaced_by_an_empty_witness',async()=>{
  const signature='listing_publication_private.hosted_s3_multipart_uploads';
  const original=(await db.query('SELECT pg_get_viewdef($1::regclass,true) definition',[signature])).rows[0].definition;
  await changed(`CREATE OR REPLACE VIEW ${signature} WITH(security_barrier=true) AS SELECT s.id,s.bucket_id,s.key,s.version FROM storage.s3_multipart_uploads s WHERE false`,
   `CREATE OR REPLACE VIEW ${signature} WITH(security_barrier=true) AS ${original}`,'functions');
 });
 await check('legacy_generic_service_cleanup_exposure_is_rejected',async()=>{
  await changed('GRANT EXECUTE ON FUNCTION public.record_listing_cleanup_v1(uuid,uuid,text) TO service_role',
   'REVOKE EXECUTE ON FUNCTION public.record_listing_cleanup_v1(uuid,uuid,text) FROM service_role','functions');
 });
 await check('disabled_cleanup_or_immutable_session_guard_is_rejected',async()=>{
  for(const [table,trigger] of [['cleanup','protect_cleanup'],['multipart_sessions','protect_multipart_session']])
   await changed(`ALTER TABLE listing_publication_private.${table} DISABLE TRIGGER ${trigger}`,
    `ALTER TABLE listing_publication_private.${table} ENABLE TRIGGER ${trigger}`,'managed_triggers');
 });
 await check('weakened_private_schema_and_unexpected_writer_create_are_rejected',async()=>{
  await changed('GRANT USAGE ON SCHEMA listing_publication_private TO service_role',
   'REVOKE USAGE ON SCHEMA listing_publication_private FROM service_role','closed_private_schema');
  await changed('GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1',
   'REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1','actor_roles');
 });
 await check('wrong_project_instance_and_public_storage_bucket_are_rejected',async()=>{
  await changed("UPDATE listing_publication_private.hosted_preview_settings SET instance_id='11111111-1111-1111-1111-111111111111'",
   "UPDATE listing_publication_private.hosted_preview_settings SET instance_id='2d088814-0900-448a-a9d1-7b05470cb1d2'",'hosted_context_ready');
  await changed("UPDATE storage.buckets SET public=true WHERE id='listing-publication-private'",
   "UPDATE storage.buckets SET public=false WHERE id='listing-publication-private'",'hosted_context_ready');
 });
 await check('failed_postcheck_rolls_back_new_functions_central_replacement_and_grants',async()=>{
  assert.deepEqual(await inspect(),before);
  const sql=read('apply.sql'),at=sql.indexOf('CREATE TEMP TABLE hosted_source_install_after');assert(at>0);
  const injected=sql.slice(0,at)+'REVOKE EXECUTE ON FUNCTION public.claim_listing_published_source_cleanup_v1(uuid,uuid,uuid,uuid) FROM service_role;\n'+sql.slice(at);
  await refuse(injected,'LISTING_HOSTED_SOURCE_INSTALLED_STATE_NOT_VERIFIED');assert.deepEqual(await inspect(),before);
 });
 let after;
 await check('exact_guarded_apply_preserves_old_authority_structure_and_other_functions',async()=>{
  after=await inspect('apply.sql');assert.equal(after.state,'applied',JSON.stringify(after));assert.equal(after.ready_to_apply,false);
  assert.deepEqual(after.invariants,before.invariants);assert.equal(after.fingerprints.dependencies,before.fingerprints.dependencies);
  assert.deepEqual(after.hosted_context,before.hosted_context);assert.notEqual(after.fingerprints.capability,before.fingerprints.capability);
 });
 await check('exact_verification_is_idempotent_and_repeat_mutation_is_refused',async()=>{
  assert.deepEqual(await inspect('verify.sql'),after);await refuse(read('apply.sql'));assert.deepEqual(await inspect(),after);
 });
 await check('service_only_new_acl_and_changed_central_body_are_exactly_pinned',async()=>{
  await changed('GRANT EXECUTE ON FUNCTION public.claim_listing_published_source_cleanup_v1(uuid,uuid,uuid,uuid) TO anon',
   'REVOKE EXECUTE ON FUNCTION public.claim_listing_published_source_cleanup_v1(uuid,uuid,uuid,uuid) FROM anon');
  await changed('ALTER FUNCTION listing_publication_private.multipart_object_fully_deleted(uuid) STABLE',
   'ALTER FUNCTION listing_publication_private.multipart_object_fully_deleted(uuid) VOLATILE');
  assert.deepEqual(await inspect(),after);
 });
 await check('accepted_primary_image_capability_remains_recognized',async()=>{
  const rows=(await db.exec(previousPreflight)).flatMap(x=>x.rows??[]);assert.equal(rows.length,1);
  assert.equal(rows[0].result.state,'applied',JSON.stringify(rows[0].result));
 });
 result.passed=true;result.source_provenance=provenance;result.changes_sha256=crypto.createHash('sha256').update(read('changes.sql')).digest('hex');
 fs.writeFileSync(path.join(here,'preflight-example.json'),JSON.stringify(before,null,2)+'\n');
 fs.writeFileSync(path.join(here,'verified-example.json'),JSON.stringify(after,null,2)+'\n');
 console.log(JSON.stringify({passed:true,checks:checks.length}));
}catch(e){result.passed=false;console.error(JSON.stringify({message:e.message,code:e.code,where:e.where}));process.exitCode=1;}
finally{fs.writeFileSync(path.join(here,'installation-result.json'),JSON.stringify(result,null,2)+'\n');await db.close();}
