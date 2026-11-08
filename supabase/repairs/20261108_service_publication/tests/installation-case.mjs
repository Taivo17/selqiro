import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
process.env.SELQIRO_SERVICE_BASELINE_ONLY='1';
const {db,repair,actors}=await import('./fixture.mjs');
const name=process.argv[2],read=n=>fs.readFileSync(path.join(repair,n),'utf8');
await db.exec('SET search_path=pg_catalog,pg_temp');
const catalog=read('tests/catalog.sql'),apply=read('apply.sql');
const report=async()=>{const rows=(await db.exec(catalog)).flatMap(x=>x.rows).filter(x=>x.result);assert.equal(rows.length,1);return rows[0].result;};
const scalar=async(sql,args=[])=>(await db.query(sql,args)).rows[0].value;
async function refused(sql,expected='SERVICE_PUBLICATION_KNOWN_STATE_REQUIRED'){
 let error;try{await db.exec(sql);}catch(e){error=e;await db.exec('ROLLBACK');}
 assert(error,'expected transaction refusal');assert.equal(error.message,expected);return error;
}
try{
 const before=await report();assert.equal(before.state,'absent');
 if(name==='seeded_install_replay_preserves_canonical_rows'){
  const id=crypto.randomUUID(),photo=crypto.randomUUID();
  await db.query(`INSERT INTO public.services(id,identity_id,title,category,price_type,price_amount,currency,status,published_at,service_lat,service_lng,image_url)
   VALUES($1,$2,'Existing optional legacy service',null,'hourly',null,'EUR','published',clock_timestamp(),58.123,25.456,'https://example.test/legacy.jpg')`,[id,actors.ownerIdentity]);
  await db.query(`INSERT INTO public.service_images(id,service_id,identity_id,uploaded_by_user_id,original_url,storage_path,sort_order,is_primary)
   VALUES($1,$2,$3,$4,'https://example.test/legacy.jpg','legacy/object.jpg',5,true)`,[photo,id,actors.ownerIdentity,actors.owner]);
  const rows=await scalar('SELECT jsonb_agg(to_jsonb(s) ORDER BY id) value FROM public.services s');
  const images=await scalar('SELECT jsonb_agg(to_jsonb(i) ORDER BY id) value FROM public.service_images i');
  const applied=(await db.exec(apply)).flatMap(x=>x.rows).filter(x=>x.result);assert.equal(applied.length,1);assert.equal(applied[0].result.state,'applied');
  assert.deepEqual(await scalar("SELECT jsonb_agg(to_jsonb(s)-'edit_revision' ORDER BY id) value FROM public.services s"),rows);
  assert.deepEqual(await scalar('SELECT jsonb_agg(to_jsonb(i) ORDER BY id) value FROM public.service_images i'),images);
  assert.equal(await scalar('SELECT count(*)::int value FROM service_publication_private.events'),0);
  assert.deepEqual((await report()).invariants,before.invariants);
  const replay=(await db.exec(apply)).flatMap(x=>x.rows).filter(x=>x.result);assert.deepEqual(replay,applied);
 }else if(name==='old_writer_definition_drift'){
  await db.exec(`CREATE OR REPLACE FUNCTION public.can_manage_service_storage_v2(p_service_id text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$ SELECT true $$`);
  assert.equal((await report()).state,'unknown');await refused(apply);
  assert.equal(await scalar("SELECT to_regnamespace('service_publication_private')::text value"),null);
 }else if(name==='old_writer_acl_drift'){
  await db.exec('GRANT EXECUTE ON FUNCTION public.set_my_service_status_v2(uuid,text) TO PUBLIC');
  assert.equal((await report()).state,'unknown');await refused(apply);
  assert.equal(await scalar("SELECT to_regnamespace('service_publication_private')::text value"),null);
 }else if(name==='canonical_structure_drift'){
  await db.exec('ALTER TABLE public.services ADD COLUMN unexpected_service_field text');
  assert.equal((await report()).state,'unknown');await refused(apply);
  assert.equal(await scalar("SELECT to_regnamespace('service_publication_private')::text value"),null);
 }else if(name==='canonical_rls_drift'){
  await db.exec('ALTER TABLE public.services DISABLE ROW LEVEL SECURITY');
  assert.equal((await report()).state,'unknown');await refused(apply);
  assert.equal(await scalar("SELECT to_regnamespace('service_publication_private')::text value"),null);
 }else if(name==='canonical_trigger_drift'){
  await db.exec('ALTER TABLE public.service_images DISABLE TRIGGER trg_service_images_validate_identity_v2');
  assert.equal((await report()).state,'unknown');await refused(apply);
  assert.equal(await scalar("SELECT to_regnamespace('service_publication_private')::text value"),null);
 }else if(name==='atomic_module_failure_rolls_back'){
  const marker='CREATE TEMP TABLE service_publication_install_after';assert(apply.includes(marker));
  const broken=apply.replace(marker,"DO $test_failure$ BEGIN RAISE EXCEPTION 'SYNTHETIC_INSTALL_FAILURE'; END $test_failure$;\n"+marker);
  await refused(broken,'SYNTHETIC_INSTALL_FAILURE');assert.deepEqual(await report(),before);
  assert.equal(await scalar("SELECT to_regnamespace('service_publication_private')::text value"),null);
 }else if(name==='applied_authority_drift_is_not_repaired_silently'){
  await db.exec(apply);assert.equal((await report()).state,'applied');
  await db.exec('GRANT USAGE ON SCHEMA service_publication_private TO authenticated');
  assert.equal((await report()).state,'unknown');await refused(apply);
  assert.equal(await scalar("SELECT has_schema_privilege('authenticated','service_publication_private','USAGE') value"),true);
 }else throw Error('Unknown installation case '+name);
 console.log(JSON.stringify({case:name,passed:true,live_database:false}));
}catch(e){console.error(JSON.stringify({case:name,passed:false,message:e.message,code:e.code,detail:e.detail,where:e.where}));process.exitCode=1;}
finally{await db.close();}
