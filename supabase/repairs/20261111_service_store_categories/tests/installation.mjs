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
  await assert.rejects(()=>db.exec(apply),error=>error.code==='55000',label+' installer fails closed');
 }finally{await db.exec('ROLLBACK');await db.exec('SET SESSION AUTHORIZATION postgres');}
 assert.deepEqual(await report(),baseline,label+' rollback');checks.push(label);console.log('PASS '+label);
}
try{
 await db.exec('SET search_path=pg_catalog,pg_temp');
 const before=await report();assert.equal(before.state,'absent');checks.push('accepted_authority_baseline_recognized');
 const drifts=[
  ['legacy_profile_v1_security_drift',`ALTER FUNCTION public.get_public_profile_marketplace_v1(text,uuid,integer,integer) SECURITY INVOKER`,'category_functions'],
  ['legacy_profile_v1_acl_drift',`GRANT EXECUTE ON FUNCTION public.get_public_profile_marketplace_v1(text,uuid,integer,integer) TO service_role`,'category_functions'],
  ['category_manager_authority_drift',`ALTER FUNCTION public.manage_my_store_category_v1(uuid,uuid,text,uuid,uuid,text,text) SECURITY INVOKER`,'category_functions'],
  ['category_setter_authority_drift',`ALTER FUNCTION public.set_my_listing_store_categories_v2(text,uuid[]) SECURITY INVOKER`,'category_functions'],
  ['ordinary_link_direct_write_reopened',`GRANT INSERT ON public.listing_store_categories TO authenticated`,'retained_link_authority'],
  ['category_owner_policy_drift',`ALTER POLICY "users can manage own store categories" ON public.store_categories USING(true) WITH CHECK(true)`,'retained_category_authority'],
  ['category_column_drift',`ALTER TABLE public.store_categories ADD COLUMN unexpected_field text`,'category_structure'],
  ['category_incoming_cascade_drift',`CREATE TABLE public.synthetic_category_dependent(id uuid PRIMARY KEY,category_id uuid REFERENCES public.store_categories(id) ON DELETE CASCADE)`,'category_delete_effects'],
  ['category_rewrite_rule_drift',`CREATE RULE unexpected_category_rule AS ON DELETE TO public.store_categories DO ALSO SELECT 1`,'category_delete_effects'],
  ['api_inherited_role_drift',`CREATE ROLE synthetic_service_category_role NOLOGIN;GRANT synthetic_service_category_role TO authenticated WITH INHERIT TRUE,SET TRUE`,'api_roles_and_entrypoints'],
  ['retained_service_visibility_drift',`ALTER FUNCTION service_publication_private.is_public(uuid) SECURITY INVOKER`,'retained_release'],
  ['retained_service_viewer_visibility_drift',`ALTER FUNCTION service_publication_private.visible_to_viewer(uuid) SECURITY INVOKER`,'retained_release'],
  ['retained_horse_category_rpc_drift',`ALTER FUNCTION public.set_my_horse_offer_store_categories_v1(uuid,uuid,uuid[]) SECURITY INVOKER`,'retained_horse_categories'],
  ['retained_marketplace_v2_drift',`ALTER FUNCTION public.get_public_profile_marketplace_v2(text,uuid,integer,integer) SECURITY INVOKER`,'retained_horse_categories'],
  ['service_parent_incoming_delete_effect_drift',`CREATE TABLE public.synthetic_service_dependent(id uuid PRIMARY KEY,service_id uuid REFERENCES public.services(id) ON DELETE CASCADE)`,'service_delete_effects'],
  ['new_table_name_collision',`CREATE VIEW public.service_store_categories AS SELECT 1 unexpected`,null],
  ['new_owner_rpc_name_collision',`CREATE FUNCTION public.get_my_service_store_categories_v1(text) RETURNS boolean LANGUAGE sql AS 'SELECT true'`,null],
  ['new_public_reader_name_collision',`CREATE FUNCTION public.get_public_profile_services_v2(text) RETURNS boolean LANGUAGE sql AS 'SELECT true'`,null],
  ['new_category_reader_name_collision',`CREATE FUNCTION public.get_public_profile_store_categories_v2(text) RETURNS boolean LANGUAGE sql AS 'SELECT true'`,null],
  ['new_index_name_collision',`CREATE TABLE public.service_store_categories_category_idx(id integer)`,null],
 ];
 for(const [label,sql,guard] of drifts)await refused(label,sql,before,guard);
 const marker='CREATE FUNCTION public.get_my_service_store_categories_v1(';
 assert.equal(apply.split(marker).length,2);
 const injected="DO $failure$ BEGIN RAISE EXCEPTION 'synthetic_install_failure' USING ERRCODE='55000';END $failure$;\n";
 try{await assert.rejects(()=>db.exec(apply.replace(marker,injected+marker)),error=>error.code==='55000');}
 finally{await db.exec('ROLLBACK');}
 assert.deepEqual(await report(),before);checks.push('partial_new_table_and_fk_install_rolls_back_atomically');
 const lateMarker='CREATE TEMP TABLE service_store_categories_after';
 assert.equal(apply.split(lateMarker).length,2);
 try{await assert.rejects(()=>db.exec(apply.replace(lateMarker,
  'GRANT INSERT ON public.service_store_categories TO authenticated;\n'+lateMarker)),error=>error.code==='55000');}
 finally{await db.exec('ROLLBACK');}
 assert.deepEqual(await report(),before);checks.push('post_install_acl_mismatch_rolls_back_all_new_objects');
 const p=await service.prepare(service.content(),[service.newImage()]);await service.readyImage(p);await service.publish(p);
 await db.query(`INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,description,status,image)
  VALUES(83201,$1,$2,$1,'Preserved title','Preserved description','active','preserved-photo.webp')`,[a.owner,a.ownerIdentity]);
 await db.query(`INSERT INTO public.listing_images(listing_id,user_id,original_url,sort_order)
  VALUES(83201,$1,'preserved-photo.webp',0)`,[a.owner]);
 await db.query(`INSERT INTO public.store_categories(id,user_id,identity_id,name)
  VALUES('83200000-0000-4000-8000-000000000001',$1,$2,'Preserved category')`,[a.owner,a.ownerIdentity]);
 await db.exec("INSERT INTO public.listing_store_categories(listing_id,store_category_id) VALUES(83201,'83200000-0000-4000-8000-000000000001')");
 const rows=await snapshot();const applied=await result(apply);
 assert.equal(applied.length,1);assert.equal(applied[0].state,'applied');assert.deepEqual(await snapshot(),rows);
 checks.push('install_preserves_services_photos_publication_ledger_existing_domains_and_category_links');
 const after=await report();assert.deepEqual(after.invariants,before.invariants);
 assert.equal(after.fingerprints.dependencies,before.fingerprints.dependencies);checks.push('all_retained_functions_authority_structure_unchanged');
 await f.setCategories(a.owner,p.service_id,a.ownerIdentity,['83200000-0000-4000-8000-000000000001']);
 const links=await f.all('public.service_store_categories');
 assert.deepEqual(await result(apply),applied);assert.deepEqual(await snapshot(),rows);
 assert.deepEqual(await f.all('public.service_store_categories'),links);checks.push('exact_replay_preserves_existing_and_new_links');
 assert.deepEqual(await result(read('verify.sql')),applied);checks.push('separate_verify_matches_acknowledged_apply');
 const appliedDrifts=[
  ['applied_owner_get_rpc_security_drift',`ALTER FUNCTION public.get_my_service_store_categories_v1(uuid,uuid) SECURITY INVOKER`,null],
  ['applied_owner_set_rpc_granted_to_anon',`GRANT EXECUTE ON FUNCTION public.set_my_service_store_categories_v1(uuid,uuid,uuid[]) TO anon`,null],
  ['applied_owner_rpc_overload',`CREATE FUNCTION public.set_my_service_store_categories_v1(text,text,text) RETURNS boolean LANGUAGE sql AS 'SELECT true'`,null],
  ['applied_category_reader_security_drift',`ALTER FUNCTION public.get_public_profile_store_categories_v2(text,text,integer,integer) SECURITY INVOKER`,null],
  ['applied_public_reader_security_drift',`ALTER FUNCTION public.get_public_profile_services_v2(text,uuid,integer,integer) SECURITY INVOKER`,null],
  ['applied_public_table_write',`GRANT INSERT ON public.service_store_categories TO PUBLIC`,null],
  ['applied_column_write_grant',`GRANT UPDATE(store_category_id) ON public.service_store_categories TO authenticated`,null],
  ['applied_service_role_table_write',`GRANT DELETE ON public.service_store_categories TO service_role`,null],
  ['applied_rls_disabled',`ALTER TABLE public.service_store_categories DISABLE ROW LEVEL SECURITY`,null],
  ['applied_new_policy',`CREATE POLICY synthetic_write ON public.service_store_categories FOR INSERT TO authenticated WITH CHECK(true)`,null],
  ['applied_wrong_fk_delete_behavior',`ALTER TABLE public.service_store_categories DROP CONSTRAINT service_store_categories_store_category_id_fkey;
   ALTER TABLE public.service_store_categories ADD CONSTRAINT service_store_categories_store_category_id_fkey FOREIGN KEY(store_category_id) REFERENCES public.store_categories(id) ON DELETE RESTRICT`,null],
  ['applied_new_table_incoming_cascade',`CREATE TABLE public.synthetic_service_link_dependent(service_id uuid,category_id uuid,
   FOREIGN KEY(service_id,category_id) REFERENCES public.service_store_categories(service_id,store_category_id) ON DELETE CASCADE)`,null],
  ['applied_new_table_trigger',`CREATE FUNCTION public.synthetic_service_link_trigger() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN OLD;END$$;
   CREATE TRIGGER unexpected_delete BEFORE DELETE ON public.service_store_categories FOR EACH ROW EXECUTE FUNCTION public.synthetic_service_link_trigger()`,null],
  ['applied_new_table_rule',`CREATE RULE unexpected_service_link_rule AS ON DELETE TO public.service_store_categories DO ALSO SELECT 1`,null],
 ];
 for(const [label,sql,guard] of appliedDrifts)await refused(label,sql,after,guard);
 const proof={schema_version:1,kind:'service-store-categories-installation',result:'PASS',generated_at_utc:new Date().toISOString(),
  checks,check_count:checks.length,engine:'PGlite PostgreSQL/WASM',synthetic_rows:true,concurrent_sessions:false,
  live_database:false,production_storage:false,mac_installer:false,
  inputs:Object.fromEntries([...provenance.map(p=>[p.path,p.sha256]),...['01_assignments.sql','02_profile_services.sql','03_public_categories.sql',
   'preflight.sql','apply.sql','verify.sql','tests/fixture.mjs','tests/installation.mjs'].map(name=>
    ['supabase/repairs/20261111_service_store_categories/'+name,sha(fs.readFileSync(path.join(repair,name)))])])};
 fs.writeFileSync(path.join(repair,'installation-result.json'),JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',check_count:checks.length}));
}catch(error){console.error(JSON.stringify({result:'FAIL',checks,error_code:error.code??null,message:error.message,stack:error.stack?.split('\n').slice(0,5)}));process.exitCode=1;}
finally{await db.close();}
