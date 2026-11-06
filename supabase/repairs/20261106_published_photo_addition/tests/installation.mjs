// This repair only: exact catalog compatibility and atomic installation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {db,read,here,provenance,seal} from './fixture.mjs';
const checks=[];
const result={schema_version:1,scope:'Exact published-photo addition SQL installation after the accepted cleanup capability.',
 checks,live_database_calls:false,provider_storage_executed:false,native_postgresql_executed:false,concurrent_session_execution:false};
const contract=JSON.parse(read('change-contract.json'));
const binding='listing_publication_private.managed_image_additions_v1';
const prepare=contract.new_functions.find(name=>name.startsWith('public.prepare_my_managed_listing_image_addition_v1('));
const priorGallery=contract.changed_functions.find(name=>name.startsWith('listing_publication_private.lock_managed_listing_images_v1('));
const inspect=async(file='preflight.sql')=>{
 const rows=(await db.exec(read(file))).flatMap(value=>value.rows??[]);
 assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]),['result']);return rows[0].result;
};
async function check(label,operation){try{await operation();checks.push({label,passed:true});}
 catch(error){checks.push({label,passed:false,message:error.message,code:error.code});throw error;}}
async function refuse(sql,message='LISTING_PUBLISHED_PHOTO_ADDITION_READY_ABSENT_STATE_REQUIRED'){
 let error;try{await db.exec(sql);}catch(value){error=value;}finally{await db.exec('ROLLBACK');}
 assert.equal(error?.code,'55000',error?.message);assert.equal(error.message,message);
}
async function changed(sql,restore,guard){
 await db.exec(sql);try{
  const report=await inspect();assert.equal(report.state,'unknown');
  if(guard) assert.equal(report.guards[guard],false);
  await refuse(read('apply.sql'));
 }finally{await db.exec(restore);}
}
try{
 await seal();result.engine=(await db.query('SELECT version() version')).rows[0].version;
 const before=await inspect();
 await check('exact_retained_release_is_ready_absent_without_mutation',async()=>{
  assert.equal(before.state,'absent',JSON.stringify(before));assert.equal(before.recognized,true);
  assert.equal(before.ready_to_apply,true);assert.equal(before.kind,'listing-published-photo-addition-v1');
  assert(Object.values(before.guards).every(Boolean));assert.equal(before.hosted_context.cleanup_mode,'held');
  assert.equal((await db.query('SELECT to_regclass($1) relation',[binding])).rows[0].relation,null);
 });
 await check('unknown_new_function_overload_or_procedure_is_not_overwritten',async()=>{
  const name=prepare.slice(0,prepare.indexOf('('));
  await changed(`CREATE FUNCTION ${name}() RETURNS jsonb LANGUAGE sql AS $$ SELECT NULL::jsonb $$`,
   `DROP FUNCTION ${name}()`);
  await changed(`CREATE PROCEDURE ${name}() LANGUAGE plpgsql AS $$ BEGIN NULL; END $$`,
   `DROP PROCEDURE ${name}()`);
 });
 await check('a_preexisting_relation_of_any_kind_cannot_be_replaced',async()=>{
  await changed(`CREATE VIEW ${binding} AS SELECT 1 AS id`,`DROP VIEW ${binding}`);
 });
 await check('the_exact_old_replaced_function_body_is_required',async()=>{
  assert(priorGallery,'gallery replacement must be explicitly reviewed');
  const value=(await db.query('SELECT provolatile FROM pg_proc WHERE oid=to_regprocedure($1)',[priorGallery])).rows[0].provolatile;
  const names={v:'VOLATILE',s:'STABLE',i:'IMMUTABLE'};
  await changed(`ALTER FUNCTION ${priorGallery} ${value==='v'?'STABLE':'VOLATILE'}`,
   `ALTER FUNCTION ${priorGallery} ${names[value]}`);
 });
 await check('unchanged_actor_function_and_private_schema_authority_remain_pinned',async()=>{
  const signature='listing_publication_private.require_managed_image_actor_v1(uuid,uuid)';
  assert(!contract.changed_functions.some(value=>value.replaceAll(' ','')===signature));
  await changed(`ALTER FUNCTION ${signature} SECURITY INVOKER`,`ALTER FUNCTION ${signature} SECURITY DEFINER`,'functions');
  await changed('GRANT USAGE ON SCHEMA listing_publication_private TO authenticated',
   'REVOKE USAGE ON SCHEMA listing_publication_private FROM authenticated','closed_private_schema');
 });
 await check('failed_new_capability_postcheck_rolls_back_binding_and_all_function_changes',async()=>{
  const sql=read('apply.sql'),at=sql.indexOf('CREATE TEMP TABLE photo_addition_install_after');assert(at>0);
  const poisoned=sql.slice(0,at)+`GRANT EXECUTE ON FUNCTION ${prepare} TO anon;\n`+sql.slice(at);
  await refuse(poisoned,'LISTING_PUBLISHED_PHOTO_ADDITION_INSTALLED_STATE_NOT_VERIFIED');
  assert.deepEqual(await inspect(),before);
  assert.equal((await db.query('SELECT to_regclass($1) relation',[binding])).rows[0].relation,null);
 });
 await check('an_unreviewed_existing_table_change_rolls_back_the_complete_install',async()=>{
  const sql=read('apply.sql'),at=sql.indexOf('CREATE TEMP TABLE photo_addition_install_after');
  const poisoned=sql.slice(0,at)+'ALTER TABLE public.listing_images ADD COLUMN unreviewed integer;\n'+sql.slice(at);
  await refuse(poisoned,'LISTING_PUBLISHED_PHOTO_ADDITION_INSTALLED_STATE_NOT_VERIFIED');
  assert.deepEqual(await inspect(),before);
 });
 let after;
 await check('one_atomic_apply_adds_only_reviewed_capability_and_binding',async()=>{
  after=await inspect('apply.sql');assert.equal(after.state,'applied',JSON.stringify(after));
  assert.equal(after.ready_to_apply,false);assert.deepEqual(after.invariants,before.invariants);
  assert.equal(after.fingerprints.dependencies,before.fingerprints.dependencies);
  assert.deepEqual(after.hosted_context,before.hosted_context);
  assert.notEqual(after.fingerprints.capability,before.fingerprints.capability);
  assert.notEqual((await db.query('SELECT to_regclass($1) relation',[binding])).rows[0].relation,null);
 });
 await check('binding_rls_grants_policy_and_immutable_trigger_are_part_of_capability_pin',async()=>{
  await changed(`ALTER TABLE ${binding} DISABLE ROW LEVEL SECURITY`,`ALTER TABLE ${binding} ENABLE ROW LEVEL SECURITY`);
  await changed(`GRANT SELECT ON ${binding} TO authenticated`,`REVOKE SELECT ON ${binding} FROM authenticated`);
  await changed(`ALTER POLICY managed_image_addition_writer ON ${binding} USING(false)`,
   `ALTER POLICY managed_image_addition_writer ON ${binding} USING(true)`);
  await changed(`ALTER TABLE ${binding} DISABLE TRIGGER protect_managed_image_addition_v1`,
   `ALTER TABLE ${binding} ENABLE TRIGGER protect_managed_image_addition_v1`);
  await changed(`GRANT EXECUTE ON FUNCTION ${prepare} TO anon`,`REVOKE EXECUTE ON FUNCTION ${prepare} FROM anon`);
  assert.deepEqual(await inspect(),after);
 });
 await check('verification_is_read_only_repeatable_and_apply_is_not_replayed',async()=>{
  assert.deepEqual(await inspect('verify.sql'),after);await refuse(read('apply.sql'));
  assert.deepEqual(await inspect(),after);
 });
 result.passed=true;result.source_provenance=provenance;
 result.changes_sha256=crypto.createHash('sha256').update(read('changes.sql')).digest('hex');
 fs.writeFileSync(path.join(here,'preflight-example.json'),JSON.stringify(before,null,2)+'\n');
 fs.writeFileSync(path.join(here,'verified-example.json'),JSON.stringify(after,null,2)+'\n');
 console.log(JSON.stringify({passed:true,checks:checks.length}));
}catch(error){result.passed=false;console.error(JSON.stringify({message:error.message,code:error.code,where:error.where}));process.exitCode=1;}
finally{fs.writeFileSync(path.join(here,'installation-result.json'),JSON.stringify(result,null,2)+'\n');await db.close();}
