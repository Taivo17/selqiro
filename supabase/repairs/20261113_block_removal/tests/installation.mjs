import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {db,root,repair,source,sha,provenance,snapshot,result,modules} from './fixture.mjs';
const checks=[],tamperCases=[];
const read=n=>fs.readFileSync(path.join(repair,n),'utf8');
const beforeExample=JSON.parse(read('tests/before-example.json')),afterExample=JSON.parse(read('tests/verified-example.json'));
const preflight=read('preflight.sql'),apply=read('apply.sql'),query=preflight.slice(preflight.indexOf('WITH function_facts'),preflight.lastIndexOf('COMMIT;'));
const readReport=async()=>(await db.query(query)).rows[0].result;
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
const failedApply=async(sql,code,message)=>{let error;try{await db.exec(sql);}catch(e){error=e;}finally{await db.exec('ROLLBACK');}
 assert(error,'transaction must fail');assert.equal(error.code,code);if(message)assert.equal(error.message,message);};
const tamper=async(name,sql)=>{
 await db.exec('BEGIN');
 try{await db.exec(sql);const r=await readReport();assert.equal(r.state,'unknown',name);assert.equal(r.recognized,false);
  assert.equal(r.ready_to_apply,false);tamperCases.push({name,guards_false:Object.entries(r.guards).filter(([,v])=>!v).map(([k])=>k),capability_unrecognized:!r.capability_absent&&!r.capability_present});
 }finally{await db.exec('ROLLBACK');}
};
try{
 await db.exec('SET search_path=pg_catalog,pg_temp');
 await check('metadata_only_before_report_matches_all_nine_guard_contracts',async()=>{
  const r=await result(preflight);assert.deepEqual(r,[beforeExample]);assert.equal(Object.keys(r[0].guards).length,9);
  assert(Object.values(r[0].guards).every(v=>v===true));assert(preflight.startsWith('BEGIN READ ONLY;'));
  assert(!query.includes('pg_stat_activity'));assert(!query.includes('query_text'));
  assert(!/\bFROM public\.(user_blocks|messages|conversations|conversation_participants)\b/.test(query));
 });
 await check('unreviewed_executable_writer_blocks_install_before_DDL',async()=>{
  await db.exec("CREATE FUNCTION public.unreviewed_block_removal_test() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$BEGIN DELETE FROM public.user_blocks WHERE blocker_id=auth.uid(); END$$;");
  const r=await readReport();assert.equal(r.state,'unknown');assert.equal(r.guards.block_writer_inventory,false);
  const rows=await snapshot();await failedApply(apply,'55000','BLOCK_REMOVAL_STATE_NOT_RECOGNIZED');
  assert.deepEqual(await snapshot(),rows);
  assert.equal((await db.query("SELECT count(*)::int n FROM pg_roles WHERE rolname='selqiro_block_removal_writer_v1'")).rows[0].n,0);
  await db.exec('DROP FUNCTION public.unreviewed_block_removal_test()');
  assert.deepEqual(await readReport(),beforeExample);
 });
 await check('failure_after_all_new_DDL_rolls_back_role_trigger_functions_and_ACLs',async()=>{
  const rows=await snapshot(),needle='CREATE TEMP TABLE block_removal_after';assert.equal(apply.split(needle).length,2);
  await failedApply(apply.replace(needle,'SELECT 1/0;\n'+needle),'22012');
  assert.deepEqual(await readReport(),beforeExample);assert.deepEqual(await snapshot(),rows);
 });
 await check('zero_and_multiple_before_rows_stop_strictly_without_install',async()=>{
  for(const inject of ['DELETE FROM pg_temp.block_removal_before;','INSERT INTO pg_temp.block_removal_before SELECT * FROM pg_temp.block_removal_before;']){
   assert.equal(apply.split('DO $before$').length,2);
   await failedApply(apply.replace('DO $before$',inject+'\nDO $before$'),'55000','BLOCK_REMOVAL_STATE_NOT_RECOGNIZED');
   assert.deepEqual(await readReport(),beforeExample);
  }
 });
 await check('NULL_after_predicate_fails_closed_and_rolls_back_complete_DDL',async()=>{
  const needle="IF (a->>'state'='applied'";assert.equal(apply.split(needle).length,2);
  await failedApply(apply.replace(needle,"IF (NULL::boolean AND a->>'state'='applied'"),'55000','BLOCK_REMOVAL_INSTALLED_STATE_NOT_VERIFIED');
  assert.deepEqual(await readReport(),beforeExample);
 });
 await check('verified_apply_is_independently_readable_and_retains_application_rows',async()=>{
  const rows=await snapshot();assert.deepEqual(await result(apply),[afterExample]);
  assert.deepEqual(await result(preflight),[afterExample]);assert.deepEqual(await snapshot(),rows);
  assert.deepEqual(afterExample.invariants,beforeExample.invariants);
  assert.equal(afterExample.fingerprints.dependencies,beforeExample.fingerprints.dependencies);
 });
 await check('exact_capability_and_dependency_guards_detect_authority_reopening',async()=>{
  await tamper('direct_delete_reopened','GRANT DELETE ON public.user_blocks TO authenticated');
  await tamper('explicit_id_insert_reopened','GRANT INSERT(id) ON public.user_blocks TO authenticated');
  await tamper('created_at_update_reopened','GRANT UPDATE(created_at) ON public.user_blocks TO authenticated');
  await tamper('sequence_setval_reopened','GRANT UPDATE ON SEQUENCE public.user_blocks_id_seq TO authenticated');
  await tamper('trigger_disabled','ALTER TABLE public.user_blocks DISABLE TRIGGER user_blocks_cas_delete_v1');
  await tamper('browser_writer_SET_membership',"GRANT selqiro_block_removal_writer_v1 TO authenticated WITH SET TRUE");
  // Owner-granted EXECUTE is narrowed by both schema and function ACL pins.
  await tamper('private_helper_EXECUTE_reopened',"GRANT selqiro_block_removal_writer_v1 TO postgres WITH SET TRUE; SET LOCAL ROLE selqiro_block_removal_writer_v1; GRANT EXECUTE ON FUNCTION provider_controls_private.remove_account_block_v1(uuid,uuid,bigint,timestamptz) TO authenticated; RESET ROLE; REVOKE selqiro_block_removal_writer_v1 FROM postgres;");
  await tamper('authenticated_unrestricted_update_policy',"CREATE POLICY unreviewed_update_test ON public.user_blocks FOR UPDATE TO authenticated USING(true) WITH CHECK(true)");
  assert.deepEqual(await readReport(),afterExample);
 });
 for(const n of [...modules,'changes.sql','preflight.sql','apply.sql','verify.sql','catalog-pins.json','tests/fixture.mjs','tests/catalog.mjs',
  'tests/build-guards.mjs','tests/installation.mjs','tests/before-example.json','tests/verified-example.json'])
  source('supabase/repairs/20261113_block_removal/'+n);
 const inputs=Object.fromEntries(provenance.map(x=>[x.path,x.sha256]).sort(([a],[b])=>a.localeCompare(b)));
 const input_drift=Object.entries(inputs).filter(([n,h])=>sha(fs.readFileSync(path.join(root,n)))!==h).map(([n])=>n);assert.deepEqual(input_drift,[]);
 fs.writeFileSync(path.join(repair,'installation-result.json'),JSON.stringify({schema_version:1,result:'PASS',
  generated_at_utc:new Date().toISOString(),tests_run:checks.length,checks,tamper_cases:tamperCases,inputs,input_drift,
  engine:'PGlite PostgreSQL/WASM',synthetic_fixture:true,live_database:false,concurrent_sessions:false,
  before_after_metadata_same_except_declared_capability:true,application_rows_unchanged:true,
  generated_reader_bytes:Buffer.byteLength(preflight),generated_apply_bytes:Buffer.byteLength(apply),
  cleanup_mode_evidence:'derived retained-contract label; no fresh cleanup state observation'},null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',tests:checks.length,tamper_cases:tamperCases.length,input_drift}));
}catch(e){console.error(JSON.stringify({result:'FAIL',passed:checks,code:e.code,message:e.message,where:e.where,detail:e.detail,
 position:e.position,query_context:e.query?.slice(Math.max(0,Number(e.position)-120),Number(e.position)+100),stack:e.stack?.split('\n').slice(0,7)}));process.exitCode=1;}
finally{await db.close();}
