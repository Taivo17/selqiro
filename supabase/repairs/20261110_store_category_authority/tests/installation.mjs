import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {db,repair,actors as a,provenance,sha,snapshot,result} from './fixture.mjs';
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
 const before=await report();assert.equal(before.state,'absent');checks.push('exact_accepted_management_baseline_recognized');
 const drifts=[
  ['rpc_body_authority_drift',`ALTER FUNCTION public.set_my_listing_store_categories_v2(text,uuid[]) SECURITY INVOKER`,'category_functions'],
  ['rpc_granted_to_anon',`GRANT EXECUTE ON FUNCTION public.set_my_listing_store_categories_v2(text,uuid[]) TO anon`,'category_functions'],
  ['rpc_overload_drift',`CREATE FUNCTION public.set_my_listing_store_categories_v2(text,text) RETURNS boolean LANGUAGE sql AS 'SELECT true'`,'category_functions'],
  ['management_authority_drift',`ALTER FUNCTION public.manage_my_store_category_v1(uuid,uuid,text,uuid,uuid,text,text) SECURITY INVOKER`,'category_functions'],
  ['identity_helper_drift',`ALTER FUNCTION public.current_user_has_identity_access(uuid) SECURITY INVOKER`,'category_functions'],
  ['store_category_policy_drift',`ALTER POLICY "users can manage own store categories" ON public.store_categories USING(true) WITH CHECK(true)`,'retained_category_authority'],
  ['link_write_policy_drift',`ALTER POLICY "users can manage own listing store categories" ON public.listing_store_categories USING(true) WITH CHECK(true)`,null],
  ['link_read_policy_drift',`ALTER POLICY "users can read listing store categories" ON public.listing_store_categories USING(false)`,null],
  ['public_table_grant_drift',`GRANT INSERT ON public.listing_store_categories TO PUBLIC`,null],
  ['column_grant_drift',`GRANT INSERT(listing_id) ON public.listing_store_categories TO authenticated`,'api_roles_and_entrypoints'],
  ['service_role_authority_drift',`REVOKE DELETE ON public.listing_store_categories FROM service_role`,null],
  ['api_inherited_role_drift',`CREATE ROLE synthetic_category_role NOLOGIN; GRANT synthetic_category_role TO authenticated WITH INHERIT TRUE,SET TRUE`,'api_roles_and_entrypoints'],
  ['api_set_only_membership_drift',`CREATE ROLE synthetic_category_role NOLOGIN; GRANT synthetic_category_role TO authenticated WITH INHERIT FALSE,SET TRUE`,'api_roles_and_entrypoints'],
  ['api_bypass_role_drift',`SET SESSION AUTHORIZATION supabase_admin; ALTER ROLE authenticated BYPASSRLS; SET SESSION AUTHORIZATION postgres`,'api_roles_and_entrypoints'],
  ['link_column_drift',`ALTER TABLE public.listing_store_categories ADD COLUMN unexpected_field text`,'category_structure'],
  ['link_rls_disabled',`ALTER TABLE public.listing_store_categories DISABLE ROW LEVEL SECURITY`,'category_structure'],
  ['incoming_link_foreign_key_drift',`CREATE TABLE public.synthetic_link_dependant(id uuid PRIMARY KEY,listing_id bigint,category_id uuid,
   FOREIGN KEY(listing_id,category_id) REFERENCES public.listing_store_categories(listing_id,store_category_id) ON DELETE CASCADE)`,'category_delete_effects'],
  ['link_rewrite_rule_drift',`CREATE RULE unexpected_link_rule AS ON DELETE TO public.listing_store_categories DO ALSO SELECT 1`,'category_delete_effects'],
  ['link_trigger_drift',`CREATE FUNCTION public.synthetic_link_trigger() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN OLD;END$$;
   CREATE TRIGGER unexpected_delete BEFORE DELETE ON public.listing_store_categories FOR EACH ROW EXECUTE FUNCTION public.synthetic_link_trigger()`,'category_delete_effects'],
 ];
 for(const [label,sql,guard] of drifts)await refused(label,sql,before,guard);
 const marker='GRANT SELECT ON TABLE public.listing_store_categories TO anon,authenticated;';
 assert.equal(apply.split(marker).length,2);
 const injected="DO $failure$ BEGIN RAISE EXCEPTION 'synthetic_install_failure' USING ERRCODE='55000';END $failure$;\n";
 try{await assert.rejects(()=>db.exec(apply.replace(marker,injected+marker)),error=>error.code==='55000');}
 finally{await db.exec('ROLLBACK');}
 assert.deepEqual(await report(),before);checks.push('partial_revoke_rolls_back_atomically');
 await db.query(`INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,description,status,image)
  VALUES(82201,$1,$2,$1,'Preserved title','Preserved description','active','preserved-photo.webp')`,[a.owner,a.ownerIdentity]);
 await db.query(`INSERT INTO public.listing_images(listing_id,user_id,original_url,sort_order)
  VALUES(82201,$1,'preserved-photo.webp',0)`,[a.owner]);
 await db.query(`INSERT INTO public.store_categories(id,user_id,identity_id,name)
  VALUES('82200000-0000-4000-8000-000000000001',$1,$2,'Preserved category')`,[a.owner,a.ownerIdentity]);
 await db.exec("INSERT INTO public.listing_store_categories(listing_id,store_category_id) VALUES(82201,'82200000-0000-4000-8000-000000000001')");
 const rows=await snapshot();
 const applied=await result(apply);assert.equal(applied.length,1);assert.equal(applied[0].state,'applied');
 assert.deepEqual(await snapshot(),rows);checks.push('install_preserves_all_listings_images_categories_links');
 const after=await report();assert.deepEqual(after.invariants,before.invariants);
 assert.equal(after.fingerprints.dependencies,before.fingerprints.dependencies);checks.push('all_retained_invariants_are_unchanged');
 assert.deepEqual(await result(apply),applied);assert.deepEqual(await snapshot(),rows);checks.push('exact_applied_replay_changes_no_rows_or_authority');
 assert.deepEqual(await result(read('verify.sql')),applied);checks.push('separate_verify_matches_acknowledged_apply');
 await refused('applied_direct_insert_grant_drift',`GRANT INSERT ON public.listing_store_categories TO authenticated`,after,null);
 await refused('applied_column_insert_grant_drift',`GRANT INSERT(listing_id) ON public.listing_store_categories TO authenticated`,after,'api_roles_and_entrypoints');
 await refused('applied_public_update_grant_drift',`GRANT UPDATE ON public.listing_store_categories TO PUBLIC`,after,null);
 await refused('applied_inherited_write_authority_drift',`CREATE ROLE synthetic_category_role NOLOGIN;
  GRANT INSERT ON public.listing_store_categories TO synthetic_category_role;
  GRANT synthetic_category_role TO authenticated WITH INHERIT TRUE,SET TRUE`,after,'api_roles_and_entrypoints');
 await refused('applied_select_grant_option_drift',`GRANT SELECT ON public.listing_store_categories TO authenticated WITH GRANT OPTION`,after,null);
 await refused('applied_extra_write_policy_drift',`CREATE POLICY synthetic_write ON public.listing_store_categories FOR INSERT TO authenticated WITH CHECK(true)`,after,null);
 const proof={schema_version:1,kind:'store-category-authority-installation',result:'PASS',generated_at_utc:new Date().toISOString(),
  checks,check_count:checks.length,engine:'PGlite PostgreSQL/WASM',synthetic_rows:true,
  live_database:false,production_storage:false,mac_installer:false,
  inputs:Object.fromEntries([...provenance.map(p=>[p.path,p.sha256]),...['01_authority.sql','preflight.sql','apply.sql','verify.sql','tests/fixture.mjs','tests/installation.mjs'].map(name=>
   ['supabase/repairs/20261110_store_category_authority/'+name,sha(fs.readFileSync(path.join(repair,name)))])])};
 fs.writeFileSync(path.join(repair,'installation-result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({result:'PASS',check_count:checks.length}));
}catch(error){console.error(JSON.stringify({result:'FAIL',checks,error_code:error.code??null,message:error.message}));process.exitCode=1;}
finally{await db.close();}
