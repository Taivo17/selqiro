import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as f from './fixture.mjs';
import * as service from '../../20261108_service_publication/tests/fixture.mjs';
const {db,repair,actors:a,provenance,sha,snapshot,result}=f;
const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
const preflight=read('preflight.sql'),apply=read('apply.sql');
const query=preflight.slice(preflight.indexOf('WITH retained AS ('),preflight.lastIndexOf('COMMIT;')).trim().replace(/;$/,'');
const report=async()=>(await db.query(query)).rows[0].result;
const checks=[];
async function refused(label,sql,baseline,guard){
 await db.exec('BEGIN');
 try{
  await db.exec(sql);const changed=await report();assert.equal(changed.state,'unknown',label+' recognition');
  if(guard)assert.equal(changed.guards[guard],false,label+' guard');
  await assert.rejects(()=>db.exec(apply),e=>e.code==='55000',label+' installer fails closed');
 }finally{await db.exec('ROLLBACK');await db.exec('SET SESSION AUTHORIZATION postgres');}
 assert.deepEqual(await report(),baseline,label+' rollback');checks.push(label);console.log('PASS '+label);
}
try{
 await db.exec('SET search_path=pg_catalog,pg_temp');
 const p=await service.prepare(service.content(),[service.newImage()]);await service.readyImage(p);await service.publish(p);
 const before=await report();assert.equal(before.state,'absent');assert.equal(before.transition_summary.published_count,1);
 checks.push('accepted_service_category_baseline_and_current_row_counts_recognized');
 const drifts=[
  ['changed_public_predicate_security_drift',`ALTER FUNCTION service_publication_private.is_public(uuid) SECURITY INVOKER`,null],
  ['changed_public_predicate_acl_drift',`GRANT EXECUTE ON FUNCTION service_publication_private.is_public(uuid) TO anon`,null],
  ['retained_service_command_security_drift',`ALTER FUNCTION public.publish_my_service_v1(uuid,uuid,uuid,uuid) SECURITY INVOKER`,'retained_release'],
  ['retained_viewer_visibility_security_drift',`ALTER FUNCTION service_publication_private.visible_to_viewer(uuid) SECURITY INVOKER`,'retained_release'],
  ['retained_service_category_setter_drift',`ALTER FUNCTION public.set_my_service_store_categories_v1(uuid,uuid,uuid[]) SECURITY INVOKER`,'retained_service_categories'],
  ['retained_service_profile_v2_drift',`ALTER FUNCTION public.get_public_profile_services_v2(text,uuid,integer,integer) SECURITY INVOKER`,'retained_service_categories'],
  ['retained_public_category_v2_drift',`ALTER FUNCTION public.get_public_profile_store_categories_v2(text,text,integer,integer) SECURITY INVOKER`,'retained_service_categories'],
  ['raw_service_write_reopened',`GRANT UPDATE ON public.services TO authenticated`,'retained_release'],
  ['legacy_service_rpc_reopened',`GRANT EXECUTE ON FUNCTION public.set_my_service_status_v2(uuid,text) TO authenticated`,'retained_release'],
  ['incoming_service_cascade_drift',`CREATE TABLE public.synthetic_activity_dependent(id uuid PRIMARY KEY,service_id uuid REFERENCES public.services(id) ON DELETE CASCADE)`,'service_delete_effects'],
  ['service_rewrite_rule_drift',`CREATE RULE synthetic_activity_rule AS ON DELETE TO public.services DO ALSO SELECT 1`,'service_delete_effects'],
  ['service_column_drift',`ALTER TABLE public.services ADD COLUMN fake_active_until timestamptz`,'retained_release'],
  ['API_inherited_privileged_role_drift',`CREATE ROLE synthetic_activity_role NOLOGIN;GRANT synthetic_activity_role TO authenticated WITH INHERIT TRUE,SET TRUE`,'api_roles_and_entrypoints'],
  ['activity_relation_name_collision',`CREATE VIEW service_publication_private.activity AS SELECT 1 unexpected`,null],
  ['activity_index_name_collision',`CREATE TABLE service_publication_private.service_activity_until_idx(id integer)`,null],
  ['renewal_function_overload_collision',`CREATE FUNCTION public.renew_my_service_activity_v1(text) RETURNS boolean LANGUAGE sql AS 'SELECT true'`,null],
  ['nonfinite_existing_publication_date',`UPDATE public.services SET published_at='infinity' WHERE id='${p.service_id}'`,'service_dates'],
 ];
 for(const [label,sql,guard] of drifts)await refused(label,sql,before,guard);
 const injectBefore='CREATE FUNCTION service_publication_private.start_activity()';assert.equal(apply.split(injectBefore).length,2);
 const rows=await snapshot();
 try{await assert.rejects(()=>db.exec(apply.replace(injectBefore,
  "DO $failure$ BEGIN RAISE EXCEPTION 'synthetic_failure' USING ERRCODE='55000';END $failure$;\n"+injectBefore)),e=>e.code==='55000');}
 finally{await db.exec('ROLLBACK');}
 assert.deepEqual(await snapshot(),rows);assert.deepEqual(await report(),before);
 assert.equal((await db.query("SELECT to_regclass('service_publication_private.activity') value")).rows[0].value,null);
 checks.push('backfill_and_new_objects_roll_back_atomically_on_failure');
 const late='CREATE TEMP TABLE service_activity_after';assert.equal(apply.split(late).length,2);
 try{await assert.rejects(()=>db.exec(apply.replace(late,'GRANT UPDATE ON service_publication_private.activity TO authenticated;\n'+late)),e=>e.code==='55000');}
 finally{await db.exec('ROLLBACK');}
 assert.deepEqual(await snapshot(),rows);assert.deepEqual(await report(),before);
 checks.push('post_install_privilege_mismatch_rolls_back_transition');
 const applied=await result(apply);assert.equal(applied[0].state,'applied');assert.deepEqual(await snapshot(),rows);
 const after=await report();assert.deepEqual(after.invariants,before.invariants);
 assert.equal(after.fingerprints.dependencies,before.fingerprints.dependencies);
 checks.push('install_preserves_every_retained_row_and_dependency_invariant');
 const initialActivity=await f.all('service_publication_private.activity'),rollout=await f.all('service_publication_private.activity_rollout');
 assert.deepEqual(await result(apply),applied);assert.deepEqual(await f.all('service_publication_private.activity'),initialActivity);
 assert.deepEqual(await f.all('service_publication_private.activity_rollout'),rollout);assert.deepEqual(await snapshot(),rows);
 checks.push('exact_installer_replay_does_not_extend_or_reinitialize_any_period');
 assert.deepEqual(await result(read('verify.sql')),applied);checks.push('independent_read_only_verify_matches_apply');
 const installedDrifts=[
  ['applied_renewal_security_drift',`ALTER FUNCTION public.renew_my_service_activity_v1(uuid,uuid,uuid,timestamptz) SECURITY INVOKER`],
  ['applied_renewal_anon_execute',`GRANT EXECUTE ON FUNCTION public.renew_my_service_activity_v1(uuid,uuid,uuid,timestamptz) TO anon`],
  ['applied_activity_owner_read_security_drift',`ALTER FUNCTION public.get_my_service_activity_v1(uuid,uuid,uuid) SECURITY INVOKER`],
  ['applied_owner_list_security_drift',`ALTER FUNCTION public.get_my_service_publications_v2(uuid,uuid,integer,integer) SECURITY INVOKER`],
  ['applied_activity_direct_write',`GRANT UPDATE ON service_publication_private.activity TO authenticated`],
  ['applied_activity_column_write',`GRANT UPDATE(active_until) ON service_publication_private.activity TO authenticated`],
  ['applied_activity_service_role_read',`GRANT SELECT ON service_publication_private.activity TO service_role`],
  ['applied_rollout_direct_delete',`GRANT DELETE ON service_publication_private.activity_rollout TO authenticated`],
  ['applied_activity_rls_disabled',`ALTER TABLE service_publication_private.activity DISABLE ROW LEVEL SECURITY`],
  ['applied_activity_rogue_policy',`CREATE POLICY synthetic_activity_write ON service_publication_private.activity FOR UPDATE TO authenticated USING(true) WITH CHECK(true)`],
  ['applied_start_trigger_disabled',`ALTER TABLE public.services DISABLE TRIGGER service_activity_start`],
  ['applied_start_trigger_removed',`DROP TRIGGER service_activity_start ON public.services`],
  ['applied_activity_fk_changed_to_cascade',`ALTER TABLE service_publication_private.activity DROP CONSTRAINT activity_service_id_fkey;
   ALTER TABLE service_publication_private.activity ADD CONSTRAINT activity_service_id_fkey FOREIGN KEY(service_id) REFERENCES public.services(id) ON DELETE CASCADE`],
  ['applied_activity_incoming_delete_effect',`CREATE TABLE public.synthetic_activity_row_dependent(service_id uuid REFERENCES service_publication_private.activity(service_id) ON DELETE CASCADE)`],
  ['applied_activity_rewrite_rule',`CREATE RULE synthetic_activity_delete AS ON DELETE TO service_publication_private.activity DO ALSO SELECT 1`],
 ];
 for(const [label,sql] of installedDrifts)await refused(label,sql,after,null);
 const proof={schema_version:1,kind:'service-activity-installation',result:'PASS',generated_at_utc:new Date().toISOString(),
  checks,check_count:checks.length,engine:'PGlite PostgreSQL/WASM',synthetic_rows:true,concurrent_sessions:false,
  live_database:false,production_storage:false,mac_installer:false,
  inputs:Object.fromEntries([...provenance.map(p=>[p.path,p.sha256]),...['01_state.sql','02_owner_reads.sql','03_renewal.sql',
   'preflight.sql','apply.sql','verify.sql','tests/fixture.mjs','tests/installation.mjs'].map(name=>
    ['supabase/repairs/20261111_service_activity/'+name,sha(fs.readFileSync(path.join(repair,name)))])])};
 fs.writeFileSync(path.join(repair,'installation-result.json'),JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',check_count:checks.length}));
}catch(e){console.error(JSON.stringify({result:'FAIL',checks,code:e.code,message:e.message,stack:e.stack?.split('\n').slice(0,6)}));process.exitCode=1;}
finally{await db.close();}
