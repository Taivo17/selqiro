import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {db,dir,read,check,checks,results,guardEvidence} from './fixture.mjs';
const inspect=async(file='preflight.sql')=>(await db.exec(read(file))).flatMap(x=>x.rows??[]).find(x=>x.result)?.result;
async function refused(sql,message){
 let caught;try{await db.exec(sql);}catch(e){caught=e;}finally{await db.exec('ROLLBACK');}
 assert.equal(caught?.code,'55000');assert.equal(caught?.message,message);
}
let before;
try{
 before=await check('fresh_exact_base_and_private_bucket_are_ready',async()=>{
  const r=await inspect();assert.equal(r.state,'absent',JSON.stringify(r));assert.equal(r.recognized,true);assert.equal(r.ready_to_apply,true);assert.equal(r.bucket_state,'ready');
  assert.deepEqual(r.fingerprints,JSON.parse(read('tests/pre-authority-fresh-fingerprints.json')),'fresh fingerprints changed from the prior package');
  assert.equal(Object.keys(r.invariants).length,11);assert(Object.values(r.invariants).every(x=>/^[0-9a-f]{64}$/.test(x)));return r;
 });
 await check('cached_message_sequence_cannot_break_visible_ID_ordering',async()=>{
  await db.exec('ALTER SEQUENCE public.messages_id_seq CACHE 2');
  const r=await inspect();assert.equal(r.state,'unknown');assert.equal(r.guards.required_columns,false);
  await refused(read('apply.sql'),'MESSAGING_RESTORE_READY_ABSENT_STATE_REQUIRED');
  await db.exec('ALTER SEQUENCE public.messages_id_seq CACHE 1');assert.equal((await inspect()).state,'absent');
 });
 await check('fresh_missing_bucket_is_recognized_preparation_not_SQL_apply_ready',async()=>{
  await db.exec("DELETE FROM storage.buckets WHERE id='message-attachments-v2'");
  const r=await inspect();assert.equal(r.state,'absent');assert.equal(r.recognized,true);assert.equal(r.bucket_state,'absent');assert.equal(r.ready_to_apply,false);
  await refused(read('apply.sql'),'MESSAGING_RESTORE_READY_ABSENT_STATE_REQUIRED');
  await db.exec("INSERT INTO storage.buckets VALUES('message-attachments-v2',false,2000000,ARRAY['image/webp'])");
 });
 await check('unknown_bucket_visibility_blocks_every_change',async()=>{
  await db.exec("UPDATE storage.buckets SET public=true WHERE id='message-attachments-v2'");
  assert.equal((await inspect()).state,'unknown');await refused(read('apply.sql'),'MESSAGING_RESTORE_READY_ABSENT_STATE_REQUIRED');
  await db.exec("UPDATE storage.buckets SET public=false WHERE id='message-attachments-v2'");
 });
 await check('unexpected_new_name_overload_is_unknown_and_not_overwritten',async()=>{
  await db.exec('CREATE FUNCTION public.send_my_message_v2() RETURNS jsonb LANGUAGE sql AS $$ SELECT NULL::jsonb $$');
  assert.equal((await inspect()).state,'unknown');await refused(read('apply.sql'),'MESSAGING_RESTORE_READY_ABSENT_STATE_REQUIRED');
  await db.exec('DROP FUNCTION public.send_my_message_v2()');
 });
 await check('failed_postverification_rolls_back_schema_grants_functions_and_trigger',async()=>{
  const sql=read('apply.sql');const second=sql.indexOf('DO $catalog_guard$',sql.indexOf('DO $catalog_guard$')+1);assert(second>0);
  const injected=sql.slice(0,second)+'REVOKE EXECUTE ON FUNCTION public.send_my_message_v2(uuid,uuid,uuid,text,text,text,uuid) FROM authenticated;\n'+sql.slice(second);
  await refused(injected,'MESSAGING_RESTORE_INSTALLED_STATE_NOT_VERIFIED');
  const r=await inspect();assert.equal(r.state,'absent');assert.deepEqual(r.invariants,before.invariants);
  assert.equal((await db.query("SELECT to_regnamespace('messaging_private_v2') IS NULL absent")).rows[0].absent,true);
  assert.equal((await db.query("SELECT has_schema_privilege('selqiro_listing_contact_writer_v1','public','CREATE') allowed")).rows[0].allowed,false);
 });
 const after=await check('exact_guarded_transaction_installs_and_protected_invariants_match',async()=>{
  const output=await db.exec(read('apply.sql'));const r=output.flatMap(x=>x.rows??[]).find(x=>x.result)?.result;
  assert.equal(r.state,'applied');assert.equal(r.recognized,true);assert.equal(r.bucket_state,'ready');assert.equal(r.ready_to_apply,false);assert.deepEqual(r.invariants,before.invariants);return r;
 });
 await check('verify_exact_installed_state_and_reapply_refusal',async()=>{
  const r=await inspect('verify.sql');assert.deepEqual(r,after);await refused(read('apply.sql'),'MESSAGING_RESTORE_READY_ABSENT_STATE_REQUIRED');assert.deepEqual(await inspect(),after);
 });
 await check('PG18_duplicate_NOT_NULL_rows_normalize_to_the_PG17_column_representation',async()=>{
  const canonical=read('tests/catalog-structure.sql');assert(canonical.includes(" AND q.contype<>'n'"));
  const raw=(await db.query(canonical.replace(" AND q.contype<>'n'",''))).rows[0].structure;
  const normalized=(await db.query(canonical)).rows[0].structure;
  assert.equal(raw.tables.flatMap(t=>t.constraints).filter(c=>c.type==='n').length,24);
  assert.equal(normalized.tables.flatMap(t=>t.constraints).filter(c=>c.type==='n').length,0);
  for(const table of raw.tables)table.constraints=table.constraints.filter(c=>c.type!=='n');
  assert.deepEqual(normalized,raw,'normalization changed more than duplicate NOT NULL rows');
  assert.deepEqual(normalized,JSON.parse(read('structure-pins.json')));
  assert.equal((await inspect()).state,'applied');
 });
 await check('renaming_only_a_duplicate_NOT_NULL_constraint_preserves_the_pinned_semantics',async()=>{
  await db.exec('ALTER TABLE messaging_private_v2.photos RENAME CONSTRAINT photos_source_bytes_not_null TO synthetic_not_null_name');
  assert.deepEqual(await inspect(),after);
  await db.exec('ALTER TABLE messaging_private_v2.photos RENAME CONSTRAINT synthetic_not_null_name TO photos_source_bytes_not_null');
 });
 await check('dropping_NOT_NULL_is_still_unknown_via_the_pinned_column',async()=>{
  await db.exec('ALTER TABLE messaging_private_v2.photos ALTER COLUMN source_bytes DROP NOT NULL');
  const r=await inspect();assert.equal(r.state,'unknown');assert.equal(r.guards.known_object_state,false);
  await db.exec('ALTER TABLE messaging_private_v2.photos ALTER COLUMN source_bytes SET NOT NULL');
  assert.deepEqual(await inspect(),after);
 });
 await check('NOT_VALID_NOT_NULL_cannot_hide_behind_attnotnull_true',async()=>{
  await db.exec('ALTER TABLE messaging_private_v2.photos DROP CONSTRAINT photos_source_bytes_not_null; ALTER TABLE messaging_private_v2.photos ADD CONSTRAINT photos_source_bytes_not_null NOT NULL source_bytes NOT VALID');
  assert.equal((await db.query("SELECT attnotnull FROM pg_attribute WHERE attrelid='messaging_private_v2.photos'::regclass AND attname='source_bytes'")).rows[0].attnotnull,true);
  const r=await inspect();assert.equal(r.state,'unknown');assert.equal(r.guards.known_object_state,false);
  await db.exec('ALTER TABLE messaging_private_v2.photos VALIDATE CONSTRAINT photos_source_bytes_not_null');
  assert.deepEqual(await inspect(),after);
 });
 await check('NO_INHERIT_NOT_NULL_is_not_the_ordinary_pinned_declaration',async()=>{
  await db.exec('ALTER TABLE messaging_private_v2.photos DROP CONSTRAINT photos_source_bytes_not_null; ALTER TABLE messaging_private_v2.photos ADD CONSTRAINT photos_source_bytes_not_null NOT NULL source_bytes NO INHERIT');
  const r=await inspect();assert.equal(r.state,'unknown');assert.equal(r.guards.known_object_state,false);
  await db.exec('ALTER TABLE messaging_private_v2.photos DROP CONSTRAINT photos_source_bytes_not_null; ALTER TABLE messaging_private_v2.photos ADD CONSTRAINT photos_source_bytes_not_null NOT NULL source_bytes');
  assert.deepEqual(await inspect(),after);
 });
 await check('non_NOT_NULL_constraint_definitions_remain_exact',async()=>{
  await db.exec('ALTER TABLE messaging_private_v2.photos DROP CONSTRAINT photos_source_bytes_check; ALTER TABLE messaging_private_v2.photos ADD CONSTRAINT photos_source_bytes_check CHECK(source_bytes BETWEEN 1 AND 1400001)');
  assert.equal((await inspect()).state,'unknown');
  await db.exec('ALTER TABLE messaging_private_v2.photos DROP CONSTRAINT photos_source_bytes_check; ALTER TABLE messaging_private_v2.photos ADD CONSTRAINT photos_source_bytes_check CHECK(source_bytes BETWEEN 1 AND 1400000)');
  assert.deepEqual(await inspect(),after);
 });
 await check('unexpected_inheritance_edge_is_not_normalized_away',async()=>{
  await db.exec('CREATE TABLE public.synthetic_message_parent(); ALTER TABLE messaging_private_v2.photos INHERIT public.synthetic_message_parent');
  assert.equal((await inspect()).state,'unknown');
  await db.exec('ALTER TABLE messaging_private_v2.photos NO INHERIT public.synthetic_message_parent; DROP TABLE public.synthetic_message_parent');
  assert.deepEqual(await inspect(),after);
 });
 await check('changed_function_security_metadata_is_unknown',async()=>{
  await db.exec('ALTER FUNCTION public.send_my_message_v2(uuid,uuid,uuid,text,text,text,uuid) SECURITY INVOKER');
  assert.equal((await inspect()).state,'unknown');await refused(read('apply.sql'),'MESSAGING_RESTORE_READY_ABSENT_STATE_REQUIRED');
  await db.exec('ALTER FUNCTION public.send_my_message_v2(uuid,uuid,uuid,text,text,text,uuid) SECURITY DEFINER');assert.equal((await inspect()).state,'applied');
 });
 await check('added_private_function_is_unknown',async()=>{
  await db.exec('CREATE FUNCTION messaging_private_v2.unreviewed() RETURNS boolean LANGUAGE sql AS $$ SELECT true $$');
  assert.equal((await inspect()).state,'unknown');await db.exec('DROP FUNCTION messaging_private_v2.unreviewed()');assert.equal((await inspect()).state,'applied');
 });
 await check('weakened_storage_restriction_is_unknown',async()=>{
  await db.exec('ALTER POLICY message_attachments_v2_server_only ON storage.objects USING(true)');assert.equal((await inspect()).state,'unknown');
  await db.exec("ALTER POLICY message_attachments_v2_server_only ON storage.objects USING(bucket_id<>'message-attachments-v2')");assert.equal((await inspect()).state,'applied');
 });
 await check('missing_bucket_after_install_is_unknown_not_recreated_by_SQL',async()=>{
  await db.exec("DELETE FROM storage.buckets WHERE id='message-attachments-v2'");assert.equal((await inspect()).state,'unknown');
  await db.exec("INSERT INTO storage.buckets VALUES('message-attachments-v2',false,2000000,ARRAY['image/webp'])");assert.equal((await inspect()).state,'applied');
 });
 results.passed=checks.every(x=>x.passed);results.scope='Exact generated preflight/apply/verify SQL under hosted-like nonsuperuser PostgreSQL with synthetic catalogs; no production execution.';
 results.evidence=await guardEvidence(before.fingerprints);
 fs.writeFileSync(path.join(dir,'tests/preflight-example.json'),JSON.stringify(before,null,2)+'\n');fs.writeFileSync(path.join(dir,'tests/verified-example.json'),JSON.stringify(after,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'tests/installation-result.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({passed:results.passed,checks:checks.length}));
}catch(error){console.error(error);results.passed=false;fs.writeFileSync(path.join(dir,'tests/installation-result.json'),JSON.stringify(results,null,2)+'\n');process.exitCode=1;}finally{await db.close();}
