import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as f from './fixture.mjs';
const {db,repair,actors:a}=f;
const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
const preflight=read('preflight.sql'),apply=read('apply.sql');
const retainedBaseline=fs.readFileSync(path.join(f.root,'supabase/migrations/20260722173530_baseline_20260722.sql'),'utf8');
const flattenedNameCheck=[...retainedBaseline.matchAll(/^alter table "public"\."store_categories" (?:drop|add|validate) constraint "store_categories_name_valid_check"[^;]*;/gm)].map(x=>x[0]);
assert.equal(flattenedNameCheck.length,3);
const query=preflight.slice(preflight.indexOf('WITH retained AS ('),preflight.lastIndexOf('COMMIT;')).trim().replace(/;$/,'');
const report=async()=>(await db.query(query)).rows[0].result;
const checks=[];
const snapshot=async()=>(await db.query(`SELECT jsonb_build_object(
 'services',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id),'[]') FROM public.services s),
 'service_images',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id),'[]') FROM public.service_images s),
 'listings',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id),'[]') FROM public.listings s),
 'categories',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id),'[]') FROM public.store_categories s),
 'assignments',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.listing_id,s.store_category_id),'[]') FROM public.listing_store_categories s)
 ) value`)).rows[0].value;
async function refused(label,sql,baseline){
 await db.exec('BEGIN');
 try{
  await db.exec(sql);assert.equal((await report()).state,'unknown',label+' recognition');
  await assert.rejects(()=>db.exec(apply),error=>error.code==='55000',label+' apply fails closed');
 }finally{await db.exec('ROLLBACK');}
 assert.deepEqual(await report(),baseline,label+' isolated drift rollback');checks.push(label);
}
try{
 await db.exec('SET search_path=pg_catalog,pg_temp');
 const before=await report();assert.equal(before.state,'absent');checks.push('retained_r2_reader_baseline_recognized');
 for(const [label,sql] of [
  ['owner_reader_definition_drift',`ALTER FUNCTION public.get_my_service_publications_v1(uuid,uuid,integer,integer) SECURITY INVOKER`],
  ['owner_reader_anon_execute_drift',`GRANT EXECUTE ON FUNCTION public.get_my_service_publications_v1(uuid,uuid,integer,integer) TO anon`],
  ['public_profile_reader_acl_drift',`REVOKE EXECUTE ON FUNCTION public.get_public_profile_services_v1(text,integer) FROM anon`],
  ['old_profile_dependency_drift',`ALTER FUNCTION public.get_public_profile_listings_v1(text,uuid,integer,integer) SECURITY INVOKER`],
  ['retained_prepare_trigger_public_execute_drift',`REVOKE EXECUTE ON FUNCTION public.prepare_store_category_name() FROM PUBLIC`],
  ['retained_parent_trigger_public_execute_drift',`REVOKE EXECUTE ON FUNCTION public.validate_store_category_parent() FROM PUBLIC`],
  ['store_category_flattened_check_reparse_drift',flattenedNameCheck.join('\n')],
  ['store_category_weakened_name_check_drift',`ALTER TABLE public.store_categories DROP CONSTRAINT store_categories_name_valid_check;
   ALTER TABLE public.store_categories ADD CONSTRAINT store_categories_name_valid_check CHECK (true)`],
  ['store_category_structure_drift',`ALTER TABLE public.store_categories ADD COLUMN unexpected_field text`],
  ['store_category_acl_drift',`REVOKE SELECT ON public.store_categories FROM anon`],
  ['store_assignment_policy_drift',`ALTER POLICY "users can read listing store categories" ON public.listing_store_categories USING(false)`],
  ['retained_service_writer_reopened_drift',`GRANT EXECUTE ON FUNCTION public.set_my_service_status_v2(uuid,text) TO anon`],
  ['unknown_profile_reader_overload_drift',`CREATE FUNCTION public.get_public_profile_marketplace_v1(text) RETURNS jsonb LANGUAGE sql AS 'SELECT NULL::jsonb'`],
 ])await refused(label,sql,before);
 const fault="DO $injected_failure$ BEGIN RAISE EXCEPTION 'injected_reader_module_failure' USING ERRCODE='55000';END $injected_failure$;\n";
 assert.equal(apply.split('-- COMPONENT 02_profile_marketplace.sql').length,2);
 try{await assert.rejects(()=>db.exec(apply.replace('-- COMPONENT 02_profile_marketplace.sql',fault+'-- COMPONENT 02_profile_marketplace.sql')),error=>error.code==='55000');}
 finally{await db.exec('ROLLBACK');}
 assert.deepEqual(await report(),before);checks.push('partial_two_reader_replacement_rolls_back_atomically');
 await db.query(`INSERT INTO public.services(id,identity_id,title,description,category,status,created_at,published_at)
 VALUES('62000000-0000-4000-8000-000000000001',$1,'Preserved service','Existing text','transport_roadside','published','2024-01-01Z','2024-01-01Z')`,[a.ownerIdentity]);
 await db.query(`INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,status,active_until)
 VALUES(72001,$1,$2,$1,'Preserved listing','active',now()+interval '30 days')`,[a.owner,a.ownerIdentity]);
 await db.query(`INSERT INTO public.store_categories(id,user_id,identity_id,name)
 VALUES('62000000-0000-4000-8000-000000000002',$1,$2,'Preserved category');
 `,[a.owner,a.ownerIdentity]);
 await db.exec("INSERT INTO public.listing_store_categories(listing_id,store_category_id) VALUES(72001,'62000000-0000-4000-8000-000000000002')");
 const dataBefore=await snapshot();
 const result=(await db.exec(apply)).flatMap(r=>r.rows).filter(r=>r.result);assert.equal(result.length,1);assert.equal(result[0].result.state,'applied');
 assert.deepEqual(await snapshot(),dataBefore);checks.push('install_preserves_existing_rows_and_category_assignments');
 const after=await report();assert.deepEqual(after.invariants,before.invariants);assert.equal(after.fingerprints.dependencies,before.fingerprints.dependencies);checks.push('all_retained_catalog_invariants_unchanged');
 const replay=(await db.exec(apply)).flatMap(r=>r.rows).filter(r=>r.result);assert.deepEqual(replay,result);assert.deepEqual(await snapshot(),dataBefore);checks.push('applied_reader_replay_is_noop');
 await refused('applied_new_reader_acl_drift',`GRANT EXECUTE ON FUNCTION public.get_public_profile_marketplace_v1(text,uuid,integer,integer) TO service_role`,after);
 await refused('applied_service_reader_definition_drift',`ALTER FUNCTION public.get_public_profile_services_v1(text,integer) SECURITY INVOKER`,after);
 const evidence={schema_version:1,kind:'service-profile-polish-installation',result:'PASS',generated_at_utc:new Date().toISOString(),
  checks,check_count:checks.length,scope:'corrected source-reconstructed guards; targeted drift, rollback, apply and replay',
  original_runtime_suite_rerun:false,live_database:false,production_storage:false,mac_installer:false};
 fs.writeFileSync(path.join(repair,'installation-result.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}catch(error){console.error(JSON.stringify({result:'FAIL',checks,error_code:error.code??null,message:error.message}));process.exitCode=1;}
finally{await db.close();}
