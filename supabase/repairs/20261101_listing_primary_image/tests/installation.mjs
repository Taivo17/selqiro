import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {db,read,here,provenance,previousPreflight,originalPublicWriterPolicies,originalCoreReceipt,latestMultipartReceipt} from './fixture.mjs';
const checks=[];const results={schema_version:1,scope:'Actual generated preflight/apply/verify SQL in isolated hosted-like nonsuperuser PostgreSQL.',
 checks,live_database_calls:false,provider_storage_executed:false,native_postgresql_17_executed:false};
const inspect=async(file='preflight.sql')=>{
 const rows=(await db.exec(read(file))).flatMap(x=>x.rows??[]);assert.equal(rows.length,1,'exactly one result row');
 assert.deepEqual(Object.keys(rows[0]),['result']);return rows[0].result;
};
async function check(label,action){try{await action();checks.push({label,passed:true});}catch(error){checks.push({label,passed:false,message:error.message,code:error.code});throw error;}}
async function refused(sql,message){
 let error;try{await db.exec(sql);}catch(e){error=e;}finally{await db.exec('ROLLBACK');}
 assert.equal(error?.code,'55000');assert.equal(error.message,message);
}
const requireAbsent='LISTING_PRIMARY_IMAGE_READY_ABSENT_STATE_REQUIRED';
const restoreWriterPolicies=()=>db.exec(`
 DROP POLICY final_writer_listings ON public.listings;
 DROP POLICY final_writer_images ON public.listing_images;
 ${originalPublicWriterPolicies.join('\n')}
`);
try{
 results.engine=(await db.query('SELECT version() version')).rows[0].version;
 const before=await inspect();
 await check('fresh_required_hosted_dependency_contract_is_recognized_without_mutation',async()=>{
  assert.equal(before.state,'absent',JSON.stringify(before));assert.equal(before.dependencies_ok,true);assert.equal(before.capability_absent,true);
  assert.equal(before.capability_present,false);assert.equal(before.ready_to_apply,true);assert.equal(before.recognized,true);
  assert(Object.values(before.guards).every(Boolean));assert(Object.values(before.invariants).every(x=>/^[a-f0-9]{64}$/.test(x)));
 });
 await check('previous_delivered_preflight_reproduces_only_two_false_guards_on_exact_retained_hosted_contract',async()=>{
  const rows=(await db.exec(previousPreflight)).flatMap(x=>x.rows??[]);assert.equal(rows.length,1);
  const previous=rows[0].result;
  assert.equal(previous.state,'unknown');assert.equal(previous.capability_absent,true);assert.equal(previous.capability_present,false);
  assert.deepEqual(Object.keys(previous.guards).filter(key=>!previous.guards[key]).sort(),['final_writer_policies','functions']);
  assert.equal(previous.fingerprints.dependencies,before.fingerprints.dependencies);
  assert.deepEqual(previous.invariants,before.invariants);assert.deepEqual(await inspect(),before);
 });
 await check('obsolete_core_final_receipt_is_rejected_and_final_multipart_declaration_is_required',async()=>{
  await db.exec(originalCoreReceipt.replace(/^CREATE FUNCTION /,'CREATE OR REPLACE FUNCTION '));
  try{
   const stale=await inspect();assert.equal(stale.state,'unknown');assert.equal(stale.guards.functions,false);
   assert.equal(stale.guards.final_writer_policies,true);await refused(read('apply.sql'),requireAbsent);
  }finally{await db.exec(latestMultipartReceipt);}
  assert.deepEqual(await inspect(),before);
 });
 await check('unconditional_public_writer_policies_are_rejected_without_rewriting_them',async()=>{
  for(const [relation,name] of [['public.listings','final_writer_listings'],['public.listing_images','final_writer_images']]){
   await db.exec(`ALTER POLICY ${name} ON ${relation} USING(true) WITH CHECK(true)`);
   try{
    const weakened=await inspect();assert.equal(weakened.state,'unknown');assert.equal(weakened.guards.final_writer_policies,false);
    assert.equal(weakened.guards.functions,true);await refused(read('apply.sql'),requireAbsent);
    assert.equal((await db.query('SELECT pg_get_expr(polqual,polrelid) expression FROM pg_policy WHERE polname=$1',[name])).rows[0].expression,'true');
   }finally{await restoreWriterPolicies();}
   assert.deepEqual(await inspect(),before);
  }
 });
 await check('public_writer_policy_role_expansion_is_rejected',async()=>{
  await db.exec('ALTER POLICY final_writer_images ON public.listing_images TO PUBLIC');
  try{
   const changed=await inspect();assert.equal(changed.state,'unknown');assert.equal(changed.guards.final_writer_policies,false);
   await refused(read('apply.sql'),requireAbsent);
  }finally{await restoreWriterPolicies();}
  assert.deepEqual(await inspect(),before);
 });
 await check('unexpected_new_function_overload_is_unknown_and_never_overwritten',async()=>{
  await db.exec('CREATE FUNCTION public.get_my_managed_listing_images_v1() RETURNS jsonb LANGUAGE sql AS $$ SELECT NULL::jsonb $$');
  assert.equal((await inspect()).state,'unknown');await refused(read('apply.sql'),requireAbsent);
  await db.exec('DROP FUNCTION public.get_my_managed_listing_images_v1()');assert.deepEqual(await inspect(),before);
 });
 await check('procedure_collision_is_unknown_too',async()=>{
  await db.exec('CREATE PROCEDURE public.get_my_managed_listing_images_v1() LANGUAGE plpgsql AS $$ BEGIN NULL; END $$');
  assert.equal((await inspect()).state,'unknown');await refused(read('apply.sql'),requireAbsent);
  await db.exec('DROP PROCEDURE public.get_my_managed_listing_images_v1()');
 });
 await check('changed_retained_security_definer_boundary_is_rejected',async()=>{
  await db.exec('ALTER FUNCTION public.listing_actor_uid_hosted_v1() SECURITY INVOKER');
  const changed=await inspect();assert.equal(changed.state,'unknown');assert.equal(changed.guards.functions,false);
  await refused(read('apply.sql'),requireAbsent);await db.exec('ALTER FUNCTION public.listing_actor_uid_hosted_v1() SECURITY DEFINER');
  assert.deepEqual(await inspect(),before);
 });
 await check('disabled_managed_image_guard_is_rejected',async()=>{
  await db.exec('ALTER TABLE public.listing_images DISABLE TRIGGER guard_managed_image');
  const changed=await inspect();assert.equal(changed.state,'unknown');assert.equal(changed.guards.managed_triggers,false);
  await refused(read('apply.sql'),requireAbsent);await db.exec('ALTER TABLE public.listing_images ENABLE TRIGGER guard_managed_image');
 });
 await check('weakened_existing_private_schema_or_writer_policy_is_rejected',async()=>{
  await db.exec('GRANT USAGE ON SCHEMA listing_publication_private TO authenticated');
  assert.equal((await inspect()).state,'unknown');await refused(read('apply.sql'),requireAbsent);
  await db.exec('REVOKE USAGE ON SCHEMA listing_publication_private FROM authenticated');
  await db.exec('ALTER POLICY final_writer_images ON public.listing_images USING(false)');
  assert.equal((await inspect()).state,'unknown');await refused(read('apply.sql'),requireAbsent);
  await restoreWriterPolicies();assert.deepEqual(await inspect(),before);
 });
 await check('unexpected_final_writer_create_privilege_is_rejected_and_not_silently_removed',async()=>{
  await db.exec('GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1');
  assert.equal((await inspect()).state,'unknown');await refused(read('apply.sql'),requireAbsent);
  assert.equal((await db.query("SELECT has_schema_privilege('selqiro_listing_final_writer_v1','public','CREATE') allowed")).rows[0].allowed,true);
  await db.exec('REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1');
 });
 await check('invalid_hosted_storage_contract_is_rejected_without_bucket_writes',async()=>{
  await db.exec("UPDATE storage.buckets SET public=true WHERE id='listing-publication-private'");
  assert.equal((await inspect()).state,'unknown');await refused(read('apply.sql'),requireAbsent);
  await db.exec("UPDATE storage.buckets SET public=false WHERE id='listing-publication-private'");
 });
 await check('failed_postcheck_rolls_back_every_new_object_and_temporary_grant',async()=>{
  const sql=read('apply.sql');const marker='CREATE TEMP TABLE primary_image_install_after';const at=sql.indexOf(marker);assert(at>0);
  const injected=sql.slice(0,at)+"REVOKE EXECUTE ON FUNCTION public.get_my_managed_listing_images_v1(uuid,uuid,bigint,uuid) FROM authenticated;\n"+sql.slice(at);
  await refused(injected,'LISTING_PRIMARY_IMAGE_INSTALLED_STATE_NOT_VERIFIED');assert.deepEqual(await inspect(),before);
 });
 let after;
 await check('exact_guarded_apply_installs_and_preserves_all_observed_invariants',async()=>{
  after=await inspect('apply.sql');assert.equal(after.state,'applied',JSON.stringify(after));assert.equal(after.capability_present,true);
  assert.equal(after.capability_absent,false);assert.equal(after.ready_to_apply,false);assert.equal(after.recognized,true);
  assert.deepEqual(after.invariants,before.invariants);assert.equal(after.fingerprints.dependencies,before.fingerprints.dependencies);
  assert.deepEqual(after.hosted_context,before.hosted_context);
 });
 await check('verify_recognizes_exact_install_and_reapply_is_refused',async()=>{
  assert.deepEqual(await inspect('verify.sql'),after);await refused(read('apply.sql'),requireAbsent);assert.deepEqual(await inspect(),after);
 });
 await check('new_function_acl_drift_is_unknown',async()=>{
  await db.exec('GRANT EXECUTE ON FUNCTION public.get_my_managed_listing_images_v1(uuid,uuid,bigint,uuid) TO anon');
  assert.equal((await inspect()).state,'unknown');
  await db.exec('REVOKE EXECUTE ON FUNCTION public.get_my_managed_listing_images_v1(uuid,uuid,bigint,uuid) FROM anon');assert.deepEqual(await inspect(),after);
 });
 await check('new_revision_schema_or_rls_drift_is_unknown',async()=>{
  await db.exec('ALTER TABLE listing_publication_private.managed_image_presentations_v1 DISABLE ROW LEVEL SECURITY');
  assert.equal((await inspect()).state,'unknown');
  await db.exec('ALTER TABLE listing_publication_private.managed_image_presentations_v1 ENABLE ROW LEVEL SECURITY');
  await db.exec('ALTER TABLE listing_publication_private.managed_image_presentations_v1 ALTER COLUMN revision DROP NOT NULL');
  assert.equal((await inspect()).state,'unknown');
  await db.exec('ALTER TABLE listing_publication_private.managed_image_presentations_v1 ALTER COLUMN revision SET NOT NULL');assert.deepEqual(await inspect(),after);
 });
 await check('nonstandard_pg18_not_null_validation_is_not_normalized_away',async()=>{
  await db.exec('ALTER TABLE listing_publication_private.managed_image_presentations_v1 DROP CONSTRAINT managed_image_presentations_v1_revision_not_null; ALTER TABLE listing_publication_private.managed_image_presentations_v1 ADD CONSTRAINT managed_image_presentations_v1_revision_not_null NOT NULL revision NOT VALID');
  assert.equal((await inspect()).state,'unknown');
  await db.exec('ALTER TABLE listing_publication_private.managed_image_presentations_v1 VALIDATE CONSTRAINT managed_image_presentations_v1_revision_not_null');assert.deepEqual(await inspect(),after);
 });
 await check('unknown_new_procedure_next_to_installed_functions_is_rejected',async()=>{
  await db.exec('CREATE PROCEDURE public.get_my_managed_listing_images_v1() LANGUAGE plpgsql AS $$ BEGIN NULL; END $$');
  assert.equal((await inspect()).state,'unknown');await db.exec('DROP PROCEDURE public.get_my_managed_listing_images_v1()');assert.deepEqual(await inspect(),after);
 });
 results.passed=true;results.source_provenance=provenance;results.changes_sha256=crypto.createHash('sha256').update(read('changes.sql')).digest('hex');
 fs.writeFileSync(path.join(here,'preflight-example.json'),JSON.stringify(before,null,2)+'\n');
 fs.writeFileSync(path.join(here,'verified-example.json'),JSON.stringify(after,null,2)+'\n');
 console.log(JSON.stringify({passed:true,checks:checks.length}));
}catch(error){results.passed=false;console.error(error.message,error.code,error.where);process.exitCode=1;}
finally{fs.writeFileSync(path.join(here,'installation-result.json'),JSON.stringify(results,null,2)+'\n');await db.close();}
