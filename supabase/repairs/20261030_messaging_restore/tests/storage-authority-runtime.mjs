import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// This fixture models a non-owner, not a Supautils installation. Positive
// metadata cases below exercise the parser only and cannot grant SQL rights.
process.env.SELQIRO_TEST_STORAGE_NONOWNER='1';
const {db,dir,read,check,checks,results,guardEvidence}=await import('./fixture.mjs');
const inspect=async()=> (await db.exec(read('preflight.sql'))).flatMap(x=>x.rows??[]).find(x=>x.result)?.result;
const markerStart='-- BEGIN STORAGE POLICY AUTHORITY';
const markerEnd='-- END STORAGE POLICY AUTHORITY';
const fragment=read('catalog-guard.sql').split(markerStart)[1].split(markerEnd)[0];
const settingsSource='FROM pg_catalog.pg_settings s';
assert.equal(fragment.split(settingsSource).length,2);
const sqlLiteral=value=>value===null?'NULL':"'"+String(value).replaceAll("'","''")+"'";
const settingsFixture=({name='supautils.policy_grants',setting,context='sighup',vartype='string'})=>
 `FROM (SELECT ${sqlLiteral(name)}::text name,${sqlLiteral(setting)}::text setting,${sqlLiteral(context)}::text context,${sqlLiteral(vartype)}::text vartype) s`;
async function parseRegisteredMetadata(metadata){
 const code=fragment.replace(settingsSource,settingsFixture(metadata));
 const sql=`BEGIN READ ONLY; SET LOCAL search_path=pg_catalog,public,pg_temp;
 DO $test$ DECLARE storage_rls boolean;storage_authority boolean;storage_setting text;storage_policy_grants jsonb;storage_grant_tables jsonb;
 BEGIN ${code} PERFORM set_config('selqiro.synthetic_authority_parser',storage_authority::text,true); END $test$;
 SELECT current_setting('selqiro.synthetic_authority_parser')::boolean AS allowed; ROLLBACK;`;
 return (await db.exec(sql)).flatMap(x=>x.rows??[]).find(x=>'allowed' in x).allowed;
}
const valid={setting:JSON.stringify({postgres:['storage.objects']})};
try{
 await db.exec("DELETE FROM storage.buckets WHERE id='message-attachments-v2'");
 const before=await check('nonowner_with_ordinary_table_grants_has_no_native_policy_authority',async()=>{
  assert.equal((await db.query("SELECT pg_has_role('postgres',(SELECT relowner FROM pg_class WHERE oid='storage.objects'::regclass),'USAGE') allowed")).rows[0].allowed,false);
  const r=await inspect();assert.equal(r.state,'unknown');assert.equal(r.bucket_state,'absent');
  assert.deepEqual(Object.entries(r.guards).filter(([,value])=>!value).map(([name])=>name),['storage_policy_authority']);
  assert.deepEqual(r.fingerprints,JSON.parse(read('tests/pre-authority-fresh-fingerprints.json')));return r;
 });
 await check('unregistered_custom_GUC_placeholder_never_grants_policy_authority',async()=>{
  await db.query("SELECT set_config('supautils.policy_grants',$1,false)",[valid.setting]);
  assert.equal((await db.query("SELECT count(*)::int n FROM pg_catalog.pg_settings WHERE name='supautils.policy_grants'")).rows[0].n,0);
  const r=await inspect();assert.equal(r.guards.storage_policy_authority,false);assert.deepEqual(r.fingerprints,before.fingerprints);
 });
 await check('registered_metadata_parser_accepts_exact_current_user_and_resolved_target_OID',async()=>{
  assert.equal(await parseRegisteredMetadata(valid),true);
  assert.equal(await parseRegisteredMetadata({setting:JSON.stringify({postgres:['storage.buckets','"storage"."objects"']})}),true);
 });
 await check('registered_metadata_parser_rejects_missing_wrong_name_context_and_type',async()=>{
  for(const metadata of [{...valid,name:'other.policy_grants'},{...valid,context:'user'},{...valid,context:'superuser'},
   {...valid,vartype:'bool'},{...valid,setting:null}])assert.equal(await parseRegisteredMetadata(metadata),false,JSON.stringify(metadata));
 });
 await check('registered_metadata_parser_rejects_malformed_role_and_table_shapes',async()=>{
  for(const setting of ['{','null','[]','{}','{"postgres":"storage.objects"}','{"postgres":[null]}',
   '{"postgres":["storage.objects",1]}','{"postgres":["storage.objects"],"other":false}',
   '{"postgres":["storage..objects"]}'])assert.equal(await parseRegisteredMetadata({setting}),false,setting);
 });
 await check('registered_metadata_parser_never_expands_roles_substrings_or_unqualified_other_tables',async()=>{
  await db.exec('CREATE TABLE public.objects(id integer)');
  for(const setting of [JSON.stringify({synthetic_storage_owner:['storage.objects']}),JSON.stringify({Postgres:['storage.objects']}),
   JSON.stringify({postgres:['storage.buckets']}),JSON.stringify({postgres:['objects']}),
   JSON.stringify({postgres:['public.objects']}),JSON.stringify({postgres:['storage.objects_other']})]){
   assert.equal(await parseRegisteredMetadata({setting}),false,setting);
  }
  await db.exec('DROP TABLE public.objects');
 });
 await check('numeric_regclass_OID_input_is_not_a_Supautils_table_name',async()=>{
  const oid=(await db.query("SELECT 'storage.objects'::regclass::oid::text value")).rows[0].value;
  assert.equal((await db.query("SELECT to_regclass($1)='storage.objects'::regclass matched",[oid])).rows[0].matched,true);
  assert.equal(await parseRegisteredMetadata({setting:JSON.stringify({postgres:[oid]})}),false);
  assert.equal(await parseRegisteredMetadata({setting:JSON.stringify({postgres:['"'+oid+'"']})}),false);
 });
 await check('actual_database_permission_still_refuses_a_parser_positive_without_Supautils',async()=>{
  await db.exec("INSERT INTO storage.buckets VALUES('message-attachments-v2',false,2000000,ARRAY['image/webp'])");
  const sql=read('apply.sql');assert.equal(sql.split(settingsSource).length,3);
  const modeled=sql.replaceAll(settingsSource,settingsFixture(valid));
  let error;try{await db.exec(modeled);}catch(caught){error=caught;}finally{await db.exec('ROLLBACK');}
  assert.equal(error?.code,'42501');assert.match(error?.message??'',/owner of table objects/);
  assert.equal((await db.query("SELECT to_regnamespace('messaging_private_v2') IS NULL absent")).rows[0].absent,true);
  assert.equal((await db.query("SELECT count(*)::int n FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname='message_attachments_v2_server_only'")).rows[0].n,0);
  const r=await inspect();assert.equal(r.guards.storage_policy_authority,false);assert.deepEqual(r.invariants,before.invariants);assert.deepEqual(r.fingerprints,before.fingerprints);
 });
 results.passed=checks.every(x=>x.passed);
 results.scope='Synthetic PGlite non-owner authorization and exact registered-setting parser tests. Positive metadata cases are parser fixtures, not an installed Supautils hook. Native SQL rejects CREATE POLICY without actual authority. No live database, Storage API, role grant, or ownership change outside the isolated fixture.';
 results.evidence=await guardEvidence(before.fingerprints);
 fs.writeFileSync(path.join(dir,'tests/storage-authority-result.json'),JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify({passed:results.passed,checks:checks.length}));
}catch(error){
 console.error(error);results.passed=false;fs.writeFileSync(path.join(dir,'tests/storage-authority-result.json'),JSON.stringify(results,null,2)+'\n');process.exitCode=1;
}finally{await db.close();}
