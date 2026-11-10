import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {db,repair,actors as a,provenance} from './fixture.mjs';
const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
const preflight=read('preflight.sql'),apply=read('apply.sql');
const query=preflight.slice(preflight.indexOf('WITH retained AS ('),preflight.lastIndexOf('COMMIT;')).trim().replace(/;$/,'');
const report=async()=>(await db.query(query)).rows[0].result;
const checks=[];
const all=async(table)=>(await db.query('SELECT to_jsonb(t) value FROM '+table+' t ORDER BY to_jsonb(t)::text')).rows.map(r=>r.value);
const snapshot=async()=>({listings:await all('public.listings'),images:await all('public.listing_images'),
 categories:await all('public.store_categories'),links:await all('public.listing_store_categories')});
async function refused(label,sql,baseline,guard){
 await db.exec('BEGIN');
 try{
  await db.exec(sql);const changed=await report();assert.equal(changed.state,'unknown',label+' recognition');
  if(guard)assert.equal(changed.guards[guard],false,label+' guard');
  await assert.rejects(()=>db.exec(apply),error=>error.code==='55000',label+' installer fails closed');
 }finally{await db.exec('ROLLBACK');}
 assert.deepEqual(await report(),baseline,label+' isolated rollback');checks.push(label);console.log('PASS '+label);
}
try{
 await db.exec('SET search_path=pg_catalog,pg_temp');
 const before=await report();assert.equal(before.state,'absent');checks.push('exact_retained_baseline_recognized');
 const drifts=[
  ['authorization_dependency_drift',`ALTER FUNCTION public.current_user_has_identity_access(uuid) SECURITY INVOKER`,'category_functions'],
  ['legacy_writer_acl_drift',`GRANT EXECUTE ON FUNCTION public.delete_my_store_category_v2(uuid) TO anon`,'category_functions'],
  ['category_name_constraint_drift',`ALTER TABLE public.store_categories DROP CONSTRAINT store_categories_name_valid_check;
    ALTER TABLE public.store_categories ADD CONSTRAINT store_categories_name_valid_check CHECK(true)`,'category_relations'],
  ['category_column_drift',`ALTER TABLE public.store_categories ADD COLUMN unexpected_field text`,'category_relations'],
  ['link_write_policy_drift',`ALTER POLICY "users can manage own listing store categories" ON public.listing_store_categories USING(true) WITH CHECK(true)`,'category_relations'],
  ['incoming_category_foreign_key_drift',`CREATE TABLE public.synthetic_category_dependant(id uuid PRIMARY KEY,
    category_id uuid REFERENCES public.store_categories(id) ON DELETE CASCADE)`,'category_delete_effects'],
  ['incoming_link_foreign_key_drift',`CREATE TABLE public.synthetic_link_dependant(id uuid PRIMARY KEY,listing_id bigint,category_id uuid,
    FOREIGN KEY(listing_id,category_id) REFERENCES public.listing_store_categories(listing_id,store_category_id) ON DELETE CASCADE)`,'category_delete_effects'],
  ['category_delete_rewrite_rule_drift',`CREATE RULE unexpected_category_rule AS ON DELETE TO public.store_categories DO ALSO SELECT 1`,'category_delete_effects'],
  ['link_delete_rewrite_rule_drift',`CREATE RULE unexpected_link_rule AS ON DELETE TO public.listing_store_categories DO ALSO SELECT 1`,'category_delete_effects'],
  ['unexpected_link_delete_trigger_drift',`CREATE FUNCTION public.synthetic_delete_trigger() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN OLD;END$$;
    CREATE TRIGGER synthetic_delete BEFORE DELETE ON public.listing_store_categories FOR EACH ROW EXECUTE FUNCTION public.synthetic_delete_trigger()`,'category_delete_effects'],
  ['unexpected_capability_overload',`CREATE FUNCTION public.manage_my_store_category_v1(text) RETURNS jsonb LANGUAGE sql AS 'SELECT NULL::jsonb'`,null],
 ];
 for(const [label,sql,guard] of drifts)await refused(label,sql,before,guard);
 const marker='ALTER FUNCTION public.manage_my_store_category_v1(uuid,uuid,text,uuid,uuid,text,text) OWNER TO postgres;';
 assert.equal(apply.split(marker).length,2);
 const injected="DO $failure$ BEGIN RAISE EXCEPTION 'synthetic_install_failure' USING ERRCODE='55000';END $failure$;\n";
 try{await assert.rejects(()=>db.exec(apply.replace(marker,injected+marker)),error=>error.code==='55000');}
 finally{await db.exec('ROLLBACK');}
 assert.deepEqual(await report(),before);checks.push('partial_create_rolls_back_atomically');
 await db.query(`INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,description,status,image)
  VALUES(74001,$1,$2,$1,'Retained title','Retained description','active','retained-install-photo.webp')`,[a.owner,a.ownerIdentity]);
 await db.query(`INSERT INTO public.listing_images(listing_id,user_id,original_url,sort_order)
  VALUES(74001,$1,'retained-install-photo.webp',0)`,[a.owner]);
 await db.query(`INSERT INTO public.store_categories(id,user_id,identity_id,name)
  VALUES('74000000-0000-4000-8000-000000000001',$1,$2,'Retained category')`,[a.owner,a.ownerIdentity]);
 await db.exec("INSERT INTO public.listing_store_categories(listing_id,store_category_id) VALUES(74001,'74000000-0000-4000-8000-000000000001')");
 const rows=await snapshot();
 const applied=(await db.exec(apply)).flatMap(r=>r.rows).filter(r=>r.result);assert.equal(applied.length,1);assert.equal(applied[0].result.state,'applied');
 assert.deepEqual(await snapshot(),rows);checks.push('install_retains_listings_photos_categories_and_links');
 const after=await report();assert.deepEqual(after.invariants,before.invariants);assert.equal(after.fingerprints.dependencies,before.fingerprints.dependencies);
 checks.push('retained_function_authority_structure_invariants_unchanged');
 const replay=(await db.exec(apply)).flatMap(r=>r.rows).filter(r=>r.result);assert.deepEqual(replay,applied);assert.deepEqual(await snapshot(),rows);
 checks.push('exact_applied_replay_is_noop');
 await refused('applied_rpc_acl_drift',`GRANT EXECUTE ON FUNCTION public.manage_my_store_category_v1(uuid,uuid,text,uuid,uuid,text,text) TO anon`,after,null);
 await refused('applied_rpc_definition_drift',`ALTER FUNCTION public.manage_my_store_category_v1(uuid,uuid,text,uuid,uuid,text,text) SECURITY INVOKER`,after,null);
 const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
 const proof={schema_version:1,kind:'store-category-management-installation',result:'PASS',generated_at_utc:new Date().toISOString(),
  checks,check_count:checks.length,engine:'PGlite PostgreSQL/WASM',synthetic_rows:true,
  live_database:false,production_storage:false,mac_installer:false,
  inputs:Object.fromEntries([...provenance.map(p=>[p.path,p.sha256]),...['01_management.sql','preflight.sql','apply.sql','verify.sql','tests/fixture.mjs','tests/installation.mjs'].map(name=>
   ['supabase/repairs/20261110_store_category_management/'+name,sha(fs.readFileSync(path.join(repair,name)))])])};
 fs.writeFileSync(path.join(repair,'installation-result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}catch(error){console.error(JSON.stringify({result:'FAIL',checks,error_code:error.code??null,message:error.message}));process.exitCode=1;}
finally{await db.close();}
