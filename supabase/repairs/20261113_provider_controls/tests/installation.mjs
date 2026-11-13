import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as f from './fixture.mjs';
import {queryOnly,guardNames} from './catalog.mjs';
const {db,repair,actors:a,provenance,sha,snapshot,result,all,get,action}=f;
const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
const preflight=read('preflight.sql'),apply=read('apply.sql'),query=queryOnly(preflight);
const report=async()=>(await db.query(query)).rows[0].result;
const checks=[];
async function refused(label,sql,baseline,guard){
 await db.exec('BEGIN');
 try{await db.exec(sql);const changed=await report();assert.equal(changed.state,'unknown',label+' recognition');
  if(guard)assert.equal(changed.guards[guard],false,label+' guard');
  await assert.rejects(()=>db.exec(apply),e=>e.code==='55000',label+' installer fails closed');
 }finally{await db.exec('ROLLBACK');await db.exec('SET SESSION AUTHORIZATION postgres');}
 assert.deepEqual(await report(),baseline,label+' rollback');checks.push(label);console.log('PASS '+label);
}
try{
 await db.exec('SET search_path=pg_catalog,pg_temp');
 const before=await report();assert.equal(before.state,'absent',JSON.stringify(before));
 assert.deepEqual(Object.keys(before.guards).sort(),guardNames.slice().sort());checks.push('current_activity_baseline_and_all_16_guards_recognized');
 const drifts=[
  ['ordinary_v1_original_definition_drift',"ALTER FUNCTION public.search_public_listings_v1(text,text,text,text,text,text,integer,integer) SECURITY INVOKER"],
  ['ordinary_v2_original_acl_drift',"GRANT EXECUTE ON FUNCTION public.search_public_listings_v2(text,text,text,text,text,text,integer,integer) TO service_role"],
  ['marketplace_original_definition_drift',"ALTER FUNCTION public.search_public_marketplace_v1(text,text,text,text,text,text,integer,integer,uuid) SECURITY INVOKER"],
  ['service_search_original_definition_drift',"ALTER FUNCTION public.search_public_services_v1(text,text,text,text,text,integer,integer) SECURITY INVOKER"],
  ['legacy_marketplace_original_definition_drift',"ALTER FUNCTION public.get_marketplace_listings(integer,integer) SECURITY INVOKER"],
  ['legacy_nearby_original_definition_drift',"ALTER FUNCTION public.get_marketplace_listings_nearby(double precision,double precision,integer,integer) SECURITY INVOKER"],
  ['profile_original_definition_drift',"ALTER FUNCTION public.get_store_by_slug(text) SECURITY INVOKER"],
  ['retained_activity_predicate_drift',"ALTER FUNCTION service_publication_private.is_public(uuid) SECURITY INVOKER",'retained_activity'],
  ['retained_message_account_guard_drift',"ALTER FUNCTION messaging_private_v2.guard_account_block() SECURITY INVOKER",'retained_activity'],
  ['retained_thread_authority_drift',"ALTER FUNCTION messaging_private_v2.exact_thread(bigint,uuid,uuid) VOLATILE",'retained_activity'],
  ['provider_schema_collision',"CREATE SCHEMA provider_controls_private"],
  ['provider_public_rpc_overload_collision',"CREATE FUNCTION public.get_my_provider_control_v1(text) RETURNS boolean LANGUAGE sql AS 'SELECT true'"],
  ['provider_view_name_collision',"CREATE TABLE public.discovery_listings_v1(id integer)"],
  ['reverse_block_index_name_collision',"CREATE TABLE public.user_blocks_blocked_blocker_idx_v1(id integer)"],
  ['API_inherited_role_drift',"CREATE ROLE synthetic_control_role NOLOGIN;GRANT synthetic_control_role TO authenticated WITH INHERIT TRUE,SET TRUE",'api_roles_and_entrypoints'],
  ['canonical_account_block_rls_disabled',"ALTER TABLE public.user_blocks DISABLE ROW LEVEL SECURITY",'account_block_authority'],
  ['canonical_account_block_wide_policy',"CREATE POLICY synthetic_control_wide ON public.user_blocks FOR ALL TO authenticated USING(true) WITH CHECK(true)",'account_block_authority'],
  ['canonical_account_block_pair_index_removed',"ALTER TABLE public.user_blocks DROP CONSTRAINT user_blocks_blocker_id_blocked_id_key",'account_block_authority'],
  ['canonical_account_block_rule_side_effect',"CREATE RULE synthetic_control_rule AS ON DELETE TO public.user_blocks DO ALSO SELECT 1",'account_block_authority'],
  ['canonical_account_block_incoming_cascade',"CREATE TABLE public.synthetic_control_dependent(block_id bigint REFERENCES public.user_blocks(id) ON DELETE CASCADE)",'account_block_authority'],
 ];
 for(const [label,sql,guard] of drifts)await refused(label,sql,before,guard);
 const rows=await snapshot(),point='-- COMPONENT 02_target.sql';assert.equal(apply.split(point).length,2);
 const interrupted=apply.replace(point,()=>"DO $failure$ BEGIN RAISE EXCEPTION 'synthetic_failure' USING ERRCODE='55000';END $failure$;\n"+point);
 try{await assert.rejects(()=>db.exec(interrupted),e=>e.code==='55000');}finally{await db.exec('ROLLBACK');}
 assert.deepEqual(await report(),before);assert.deepEqual(await snapshot(),rows);
 assert.equal((await db.query("SELECT to_regnamespace('provider_controls_private') value")).rows[0].value,null);
 checks.push('new_schema_table_and_functions_roll_back_atomically');
 const late='CREATE TEMP TABLE provider_controls_after';assert.equal(apply.split(late).length,2);
 try{await assert.rejects(()=>db.exec(apply.replace(late,()=>"GRANT UPDATE ON provider_controls_private.hidden_providers TO authenticated;\n"+late)),e=>e.code==='55000');}
 finally{await db.exec('ROLLBACK');}
 assert.deepEqual(await report(),before);assert.deepEqual(await snapshot(),rows);checks.push('post_install_authority_mismatch_rolls_back_every_change');
 const applied=await result(apply);assert.equal(applied.length,1);assert.equal(applied[0].state,'applied');
 const after=await report();assert.deepEqual(after.invariants,before.invariants);assert.deepEqual(await snapshot(),rows);
 assert.equal(after.fingerprints.dependencies,before.fingerprints.dependencies);assert.deepEqual(after.hosted_context,before.hosted_context);
 checks.push('install_preserves_all_retained_rows_authority_functions_and_hosted_context');
 const hidden=await action(a.peer,await get(a.peer,'profile',a.ownerIdentity),'hide',crypto.randomUUID());
 await action(a.peer,await get(a.peer,'profile',a.ownerIdentity),'block');
 const preference=await all('provider_controls_private.hidden_providers'),blocks=await all('public.user_blocks'),stateRows=await snapshot();
 assert.deepEqual(await result(apply),applied);assert.deepEqual(await all('provider_controls_private.hidden_providers'),preference);
 assert.deepEqual(await all('public.user_blocks'),blocks);assert.deepEqual(await snapshot(),stateRows);assert.equal(preference[0].revision,hidden.hide_revision);
 checks.push('installer_replay_keeps_existing_hide_deadline_revision_and_account_block');
 assert.deepEqual(await result(read('verify.sql')),applied);checks.push('independent_read_only_verifier_matches_apply');
 const installedDrifts=[
  ['applied_SET_security_drift',"ALTER FUNCTION public.set_my_provider_control_v1(uuid,text,text,text,text,uuid,uuid,text,timestamptz) SECURITY INVOKER"],
  ['applied_GET_anon_execution',"GRANT EXECUTE ON FUNCTION public.get_my_provider_control_v1(uuid,text,text) TO anon"],
  ['applied_LIST_service_role_execution',"GRANT EXECUTE ON FUNCTION public.list_my_provider_controls_v1(uuid,text,integer,integer) TO service_role"],
  ['applied_private_table_direct_write',"GRANT UPDATE ON provider_controls_private.hidden_providers TO authenticated"],
  ['applied_private_column_write',"GRANT UPDATE(hidden_until) ON provider_controls_private.hidden_providers TO authenticated"],
  ['applied_private_table_service_read',"GRANT SELECT ON provider_controls_private.hidden_providers TO service_role"],
  ['applied_private_schema_usage',"GRANT USAGE ON SCHEMA provider_controls_private TO authenticated"],
  ['applied_private_rls_disabled',"ALTER TABLE provider_controls_private.hidden_providers DISABLE ROW LEVEL SECURITY"],
  ['applied_private_rogue_policy',"CREATE POLICY synthetic_control_update ON provider_controls_private.hidden_providers FOR ALL TO authenticated USING(true) WITH CHECK(true)"],
  ['applied_private_new_helper',"CREATE FUNCTION provider_controls_private.synthetic() RETURNS boolean LANGUAGE sql AS 'SELECT true'"],
  ['applied_private_new_type',"CREATE TYPE provider_controls_private.synthetic_type AS ENUM('rogue')"],
  ['applied_private_index_removed',"DROP INDEX provider_controls_private.hidden_providers_active_idx"],
  ['applied_reverse_block_index_removed',"DROP INDEX public.user_blocks_blocked_blocker_idx_v1"],
  ['applied_reverse_block_index_wrong_column_order',"DROP INDEX public.user_blocks_blocked_blocker_idx_v1;CREATE INDEX user_blocks_blocked_blocker_idx_v1 ON public.user_blocks(blocker_id,blocked_id)"],
  ['applied_private_incoming_cascade',"CREATE TABLE public.synthetic_control_hidden(viewer uuid,identity_id uuid,FOREIGN KEY(viewer,identity_id) REFERENCES provider_controls_private.hidden_providers(viewer_user_id,provider_identity_id) ON DELETE CASCADE)"],
  ['applied_private_rewrite_side_effect',"CREATE RULE synthetic_control_hidden_delete AS ON DELETE TO provider_controls_private.hidden_providers DO ALSO SELECT 1"],
  ['applied_feed_owner_security',"ALTER VIEW public.discovery_listings_v1 SET(security_invoker=false)"],
  ['applied_feed_write_grant',"GRANT INSERT ON public.discovery_listings_v1 TO authenticated"],
  ['applied_feed_column_grant',"GRANT UPDATE(title) ON public.discovery_listings_v1 TO authenticated"],
  ['applied_feed_image_definer',"ALTER FUNCTION public.listing_images(public.discovery_listings_v1) SECURITY DEFINER"],
  ['applied_feed_translation_definer',"ALTER FUNCTION public.listing_translations(public.discovery_listings_v1) SECURITY DEFINER"],
  ['applied_hidden_helper_rogue_overload',"CREATE FUNCTION public.hidden_provider_ids_for_viewer_v1(uuid) RETURNS SETOF uuid LANGUAGE sql AS 'SELECT $1'"],
  ['applied_private_default_grant',"ALTER DEFAULT PRIVILEGES IN SCHEMA provider_controls_private GRANT SELECT ON TABLES TO authenticated"],
 ];
 for(const [label,sql] of installedDrifts)await refused(label,sql,after);
 const inputs=Object.fromEntries([...provenance.map(p=>[p.path,p.sha256]),...[...f.modules,'preflight.sql','apply.sql','verify.sql',
  'tests/fixture.mjs','tests/catalog.mjs','tests/installation.mjs'].map(n=>['supabase/repairs/20261113_provider_controls/'+n,sha(fs.readFileSync(path.join(repair,n)))])]);
 fs.writeFileSync(path.join(repair,'installation-result.json'),JSON.stringify({schema_version:1,kind:'provider-controls-installation',result:'PASS',
  generated_at_utc:new Date().toISOString(),checks,check_count:checks.length,engine:'PGlite PostgreSQL/WASM',synthetic_rows:true,
  concurrent_sessions:false,live_database:false,production_storage:false,mac_installer:false,inputs},null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',check_count:checks.length}));
}catch(e){console.error(JSON.stringify({result:'FAIL',checks,code:e.code,message:e.message,where:e.where,position:e.position,
 stack:e.stack?.split('\n').slice(0,7)}));process.exitCode=1;}
finally{await db.close();}
