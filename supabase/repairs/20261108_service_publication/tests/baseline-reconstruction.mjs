// Regression proof for the issued V1 preflight stop. Acceptance is still
// generated from retained SQL declarations; the observation is used only to
// verify that their corrected disposable reconstruction explains the stop.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
process.env.SELQIRO_SERVICE_BASELINE_ONLY='1';
const {db,root,repair}=await import('./fixture.mjs');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
const observation=JSON.parse(read('review/v1-stop-observation.json'));
assert.equal(observation.original_report_sha256,'6430306e81abdae9cf961a1c3722ab6e47f1a86f24f2cfa39d99f824efa61af2');
const actual=observation.observed_fields.database_last_read;
const baselinePath='supabase/migrations/20260722173530_baseline_20260722.sql';
const categoryPath='supabase/migrations/20260802213000_add_service_category_foundation.sql';
const baseline=fs.readFileSync(path.join(root,baselinePath),'utf8');
const category=fs.readFileSync(path.join(root,categoryPath),'utf8');
const clauses=[
 ...[...baseline.matchAll(/^ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "(?:postgres|anon|authenticated|service_role)";/gm)].map(x=>({path:baselinePath,statement:x[0]})),
 ...[...baseline.matchAll(/^(?:REVOKE ALL ON FUNCTION|GRANT ALL ON FUNCTION) "public"\."(?:save_my_service_v2|set_my_service_status_v2)"[^;]+;/gm)].map(x=>({path:baselinePath,statement:x[0]})),
 ...[...category.matchAll(/(?:revoke all|grant select|grant all)\s+on table\s+public\.service_categories\s+(?:from|to)[^;]+;/gi)].map(x=>({path:categoryPath,statement:x[0]}))
];
assert.equal(clauses.length,13,'four table defaults, six baseline writer ACL statements and three category grants');
const issuedModules={
 '01_state.sql':'b0a8a744befacab337eb81bb41c985387056c6aa9e1c577f4a2e7b6fb92e22d9',
 '02_content.sql':'6cd60b1e773ba394574c0c3cbbcca98bb25e09bc47d0e07543ac666c31f305de',
 '03_commands.sql':'ba40cd1edc847172c2f1ae65ba9b904eec1c0c5b75b05b1a4556f3cd1e16b550',
 '04_cancel.sql':'a3b4149ea64b3804e799bac0d346a09538a32deab28157cdd0e57be94d97bc65',
 '05_media_bridge.sql':'bd20070e61ebdfe5990e17213a21351e0fe369780634af0a6355620d263c6532',
 '06_reads_status.sql':'a41834df2927f690e193b546539390afb72100e292ab617ef8e47aa6a425e95d',
 '07_contact.sql':'dc13f1215ca767887fc6cd4abafaf21b54ca1a629319b96fc031dc5e64ccdd64',
 '08_authority.sql':'ef12f384aa3923a7bd9617c3e14a5fc6f78dcb5b4e778ac981ff4769962ebf96'
};
for(const [name,expected] of Object.entries(issuedModules))assert.equal(sha(read(name)),expected,'runtime SQL remains identical to issued V1 '+name);
await db.exec('SET search_path=pg_catalog,pg_temp');
const report=async()=>(await db.query(read('tests/catalog.sql'))).rows[0].result;
const scalar=async(sql)=>(await db.query(sql)).rows[0].value;
const writers=(await db.query(`SELECT p.oid::regprocedure::text signature,p.proname name FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
 AND p.proname IN('save_my_service_v2','set_my_service_status_v2') ORDER BY p.proname`)).rows;
assert.equal(writers.length,2);
const defaultsQuery=`SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(d.defaclrole),'kind',d.defaclobjtype,
 'acl',d.defaclacl::text) ORDER BY pg_get_userbyid(d.defaclrole),d.defaclobjtype),'[]') value
 FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='public'`;
const categoryAclQuery=`SELECT relacl::text value FROM pg_class WHERE oid='public.service_categories'::regclass`;
try{
 const before=await report();
 assert.equal(before.state,'absent');
 assert.deepEqual(before.fingerprints,actual.fingerprints,'retained-source reconstruction exactly explains both observed fingerprints');
 assert.equal(before.invariants.existing_functions,actual.invariants.existing_functions);
 const defaults=await scalar(defaultsQuery),categoryAcl=await scalar(categoryAclQuery);
 for(const w of writers){
  assert.equal(await scalar("SELECT has_function_privilege('anon','"+w.signature+"','EXECUTE') value"),false);
  assert.equal(await scalar("SELECT has_function_privilege('authenticated','"+w.signature+"','EXECUTE') value"),true);
 }
 for(const role of ['anon','authenticated'])assert.equal(await scalar("SELECT has_table_privilege('"+role+"','public.service_categories','UPDATE') value"),true);

 // Replay both fixture omissions only inside this disposable transaction.
 // It must recreate the old issued fingerprints, never become an accepted
 // alternate production baseline in R2.
 await db.exec('BEGIN; REVOKE ALL ON public.service_categories FROM anon,authenticated; GRANT SELECT ON public.service_categories TO anon,authenticated;');
 for(const w of writers)await db.exec('GRANT EXECUTE ON FUNCTION '+w.signature+' TO anon');
 const issued=await report();
 assert.equal(issued.fingerprints.dependencies,'1a5db1b7a74f1ba26223d02baa78a23746345eba27fa68650f7a2df5173e447a');
 assert.equal(issued.fingerprints.capability,'c8f63bccc8b51001e2cea564b1abe28206e55fc9a6db209230cae141e24fe7b8');
 assert.equal(issued.state,'unknown');
 await db.exec('ROLLBACK');

 // Reject either independent authority drift, even though the other side
 // still matches. The correction does not turn exact ACLs into an allowlist.
 const rejected=[];
 for(const [label,mutation] of [
  ['unexpected_anon_writer_execute','GRANT EXECUTE ON FUNCTION public.set_my_service_status_v2(uuid,text) TO anon'],
  ['unexpected_category_acl_change','REVOKE UPDATE ON public.service_categories FROM authenticated']
 ]){
  await db.exec('BEGIN; '+mutation);
  assert.equal((await report()).state,'unknown');
  await db.exec('ROLLBACK');rejected.push(label);
 }

 const applied=(await db.exec(read('apply.sql'))).flatMap(x=>x.rows).filter(x=>x.result);
 assert.equal(applied.length,1);assert.equal(applied[0].result.state,'applied');
 assert.deepEqual(applied[0].result.invariants,before.invariants);
 assert.equal(applied[0].result.fingerprints.dependencies,before.fingerprints.dependencies);
 assert.deepEqual(await scalar(defaultsQuery),defaults,'installation changes no public defaults');
 assert.equal(await scalar(categoryAclQuery),categoryAcl,'installation preserves category authority');
 for(const w of writers)for(const role of ['anon','authenticated','service_role'])
  assert.equal(await scalar("SELECT has_function_privilege('"+role+"','"+w.signature+"','EXECUTE') value"),false,'old writer fenced '+role+' '+w.name);
 for(const table of ['services','service_images'])for(const role of ['anon','authenticated'])for(const privilege of ['INSERT','UPDATE','DELETE'])
  assert.equal(await scalar("SELECT has_table_privilege('"+role+"','public."+table+"','"+privilege+"') value"),false,'raw old writer fenced');
 const replay=(await db.exec(read('apply.sql'))).flatMap(x=>x.rows).filter(x=>x.result);
 assert.deepEqual(replay,applied);
 const proof={schema_version:1,kind:'service-publication-v1-stop-root-cause',result:'PASS',generated_at_utc:new Date().toISOString(),
  original_report_sha256:observation.original_report_sha256,observed_fingerprints:actual.fingerprints,
  reconstructed_fingerprints:before.fingerprints,issued_fixture_fingerprints:issued.fingerprints,
  both_observed_domains_explained:true,runtime_modules_unchanged:issuedModules,
  explanation:[
   'The V1 fixture restored future function defaults before recreating two already-existing baseline writers, leaving an anon EXECUTE grant that their dumped ACLs do not contain.',
   'The V1 fixture omitted retained defaults for future public tables; the later service category migration revokes only PUBLIC and therefore retains the provider anon/authenticated table grants.'
  ],source_clauses:clauses,source_sha256:{[baselinePath]:sha(baseline),[categoryPath]:sha(category)},
  rejected_authority_drift:rejected,generated_sql_apply_and_replay:true,invariants_unchanged:true,
  public_default_privileges_unchanged:true,category_authority_unchanged:true,old_service_writers_fenced:true,
  live_database:false,application_rows_from_user_database_read:false,production_storage:false,
  limitations:['Exact fingerprints were reconstructed from retained source in disposable PostgreSQL/WASM; no live SQL or Storage operation was performed.',
   'The broad before/after authority invariant also includes hosted actor rows. It is checked within each installation transaction and is not a fixture-to-production acceptance pin.']};
 fs.writeFileSync(path.join(repair,'review/service-sql-root-cause.json'),JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',observed_fingerprints:actual.fingerprints,runtime_modules_unchanged:8,drift_cases_rejected:rejected.length,generated_sql_apply_and_replay:true}));
}finally{await db.close();}
