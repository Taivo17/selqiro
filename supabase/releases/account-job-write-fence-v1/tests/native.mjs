import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const packagedLayout=fs.existsSync(path.join(root,'expected-contract.json'));
const runtime=process.env.SELQIRO_TEST_RUNTIME || path.resolve(root,'../../test-runtime');
const require=createRequire(path.join(runtime,'package.json'));
const {Client}=require('pg');
const pgBin=process.env.SELQIRO_PG_BIN || path.join(runtime,'node_modules/@embedded-postgres/linux-x64/native/bin');
const work=path.join(root,'native-runtime');
fs.mkdirSync(work,{recursive:true});
const data=path.join(work,'data'),socket=path.join(work,'socket');
fs.mkdirSync(socket,{recursive:true});
const port=57439;
const results=[];
fs.rmSync(path.join(root,'proof/native-report.json'),{force:true});
const metadata={format:'selqiro-account-job-write-native-tests-v1',started_at:new Date().toISOString(),
 production_executed:false,production_rows_used:false,tests:results};
function run(binary,args){
 const result=spawnSync(path.join(pgBin,binary),args,{encoding:'utf8',timeout:30000});
 if(result.status!==0)throw new Error(binary+': '+result.stderr+' '+result.stdout);
 return result.stdout.trim();
}
const pgVersion=run('postgres',['--version']);
assert.equal(pgVersion,'postgres (PostgreSQL) 17.6');metadata.postgres=pgVersion;
if(!fs.existsSync(path.join(data,'PG_VERSION')))run('initdb',['-D',data,'-A','trust','-U','postgres','--no-locale','--encoding=UTF8']);
run('pg_ctl',['-D',data,'-l',path.join(work,'postgres.log'),'-o',`-p ${port} -c listen_addresses=127.0.0.1 -c unix_socket_directories=''`,'-w','start']);
const config={host:'127.0.0.1',port,user:'postgres',database:'postgres'};
let admin;const clients=[];
async function connection(database='selqiro_job_account_fixture'){
 const c=new Client({...config,database});await c.connect();
 await c.query('SET search_path=pg_catalog');clients.push(c);return c;
}
async function test(name,fn){
 const began=Date.now();await fn();results.push({name,passed:true,duration_ms:Date.now()-began});
 console.log('PASS '+name);
}
function read(name){
 const relative=packagedLayout&&name.startsWith('release/')?name.slice('release/'.length):name;
 return fs.readFileSync(path.join(root,relative),'utf8');
}
function hash(text){return crypto.createHash('sha256').update(text).digest('hex');}
function compact(value){return JSON.stringify(value);}
function literal(value){return compact(value).replaceAll("'","''");}
const expected=JSON.parse(read('release/expected-contract.json'));
let fixtureBase,fixtureHash;
function adapted(name){
 const original=read('release/'+name);
 const old="'"+literal(expected.base)+"'::jsonb b";
 assert.ok(original.includes(old),'exact expected base literal present');
 return original.replaceAll(old,()=>"'"+literal(fixtureBase)+"'::jsonb b");
}
function resultRows(result){
 const list=Array.isArray(result)?result:[result];
 return list.flatMap(x=>x.rows||[]);
}
function onlyReport(result){
 const rows=resultRows(result);assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]),['result']);return rows[0].result;
}
async function reject(c,sql,args,code,message){
 let error;
 try{await c.query(sql,args);}catch(e){error=e;}
 assert.ok(error,'expected SQL rejection');
 if(code)assert.equal(error.code,code,error.message);
 if(message)assert.match(error.message,new RegExp(message));
 return error;
}
async function catalog(c){return (await c.query(read('release/catalog-query.sql'))).rows[0];}
async function counts(c){return (await c.query(`SELECT
 (SELECT count(*) FROM public.jobs)::int jobs,
 (SELECT count(*) FROM jobs_private.requests)::int receipts,
 (SELECT count(*) FROM public.user_publication_policy_acceptances)::int acceptances`)).rows[0];}
const users={private:'10000000-0000-0000-0000-000000000001',owner:'10000000-0000-0000-0000-000000000002',
 member:'10000000-0000-0000-0000-000000000003',other:'10000000-0000-0000-0000-000000000004'};
const identities={private:'20000000-0000-0000-0000-000000000001',business:'20000000-0000-0000-0000-000000000002',other:'20000000-0000-0000-0000-000000000003'};
const business='30000000-0000-0000-0000-000000000001';
const content={title:'Fixture job',description:'Synthetic local job',category:'other',countryCode:'EE',city:'Paide',locationLabel:'Paide',
 workplaceType:'on_site',employmentType:'task',workingTime:null,salaryMin:null,salaryMax:null,salaryCurrency:null,salaryPeriod:null};
const policies=[{documentId:'50000000-0000-0000-0000-000000000001',version:'1',contentHash:'testhash',accepted:true}];
let db;
async function asActor(user,identity,fn,c=db){
 await c.query('BEGIN');
 try{
  await c.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[user]);
  await c.query('SET LOCAL ROLE authenticated');
  const value=await fn(c);await c.query('COMMIT');return value;
 }catch(error){await c.query('ROLLBACK');throw error;}
}
const uuid=()=>crypto.randomUUID();
async function save(user=users.private,identity=identities.private,key=uuid(),job=null,revision=null,patch=content,c=db){
 return asActor(user,identity,async q=>(await q.query('SELECT public.save_my_job_v1($1,$2,$3,$4,$5,$6,$7) result',
  [user,identity,key,job,revision,patch,JSON.stringify(job?policies:[])])).rows[0].result,c);
}
async function publish(job,user=users.private,identity=identities.private,key=uuid(),c=db){
 return asActor(user,identity,async q=>(await q.query('SELECT public.publish_my_job_v1($1,$2,$3,$4,$5,$6) result',
 [user,identity,key,job.job_id,job.edit_revision,JSON.stringify(policies)])).rows[0].result,c);
}
async function status(job,next,user=users.private,identity=identities.private,key=uuid(),c=db){
 return asActor(user,identity,async q=>(await q.query('SELECT public.set_my_job_status_v1($1,$2,$3,$4,$5,$6,$7) result',
 [user,identity,key,job.job_id,job.edit_revision,job.status,next])).rows[0].result,c);
}
async function renew(job,user=users.private,identity=identities.private,key=uuid(),c=db){
 return asActor(user,identity,async q=>(await q.query('SELECT public.renew_my_job_activity_v1($1,$2,$3,$4,$5,$6) result',
 [user,identity,key,job.job_id,job.edit_revision,job.active_until])).rows[0].result,c);
}
async function unavailable(fn){
 let error;try{await fn();}catch(e){error=e;}
 assert.ok(error);assert.equal(error.code,'42501');assert.match(error.message,/job_account_unavailable/);
}
async function freshFixture(){
 await admin.query('DROP DATABASE IF EXISTS selqiro_job_account_fixture WITH (FORCE)');
 for(const role of ['anon','authenticated','service_role','supabase_auth_admin','dashboard_user',
  'selqiro_listing_contact_writer_v1','selqiro_listing_final_writer_v1','selqiro_listing_price_writer_v1'])
  await admin.query('DROP ROLE IF EXISTS '+role);
 await admin.query('CREATE DATABASE selqiro_job_account_fixture');
 db=await connection();await db.query(read('tests/fixture.sql'));
}

try{
 admin=await connection('postgres');await freshFixture();
 await test('postgres_is_exactly_17_6',async()=>assert.equal((await db.query('SHOW server_version_num')).rows[0].server_version_num,'170006'));
 await test('jsonb_fingerprints_match_postgres',async()=>{
  for(const key of ['base','before','after']){
   const value=key==='base'?expected.base:expected[key];
   const row=(await db.query("SELECT encode(sha256(convert_to($1::jsonb::text,'UTF8')),'hex') digest",[value])).rows[0];
   assert.equal(row.digest,expected.fingerprints[key]);
  }
 });
 const initial=await catalog(db);fixtureBase=initial.b;
 fixtureHash=(await db.query("SELECT encode(sha256(convert_to($1::jsonb::text,'UTF8')),'hex') h",[fixtureBase])).rows[0].h;
 await test('real_old_mutation_target_matches_accepted_pin',async()=>assert.deepEqual(initial.t,expected.before));
 await test('production_preflight_rejects_fixture_substitutions',async()=>{
  const report=onlyReport(await db.query(read('release/preflight.sql')));assert.equal(report.state,'unknown');assert.equal(report.recognized,false);
 });
 await test('preflight_is_read_only_and_recognizes_exact_fixture_base',async()=>{
  const report=onlyReport(await db.query(adapted('preflight.sql')));assert.equal(report.state,'before');assert.equal(report.read_only,true);
  assert.equal(report.base_fingerprint,fixtureHash);assert.equal(report.target_fingerprint,expected.fingerprints.before);
 });
 await test('unknown_function_acl_stops_before_any_DDL',async()=>{
  await db.query('GRANT EXECUTE ON FUNCTION jobs_private.mutate(uuid,uuid,uuid,text,jsonb) TO authenticated');
  await reject(db,adapted('apply.sql'),undefined,'55000','BEFORE_STATE_MISMATCH');await db.query('ROLLBACK');
  assert.equal((await db.query("SELECT to_regprocedure('jobs_private.require_available_accounts_v1(uuid,uuid)') value")).rows[0].value,null);
  await db.query('REVOKE EXECUTE ON FUNCTION jobs_private.mutate(uuid,uuid,uuid,text,jsonb) FROM authenticated');
 });
 await test('DDL_failure_rolls_back_both_target_changes',async()=>{
  await db.query('BEGIN');
  await db.query(read('release/account-availability.sql'));
  await db.query(read('release/mutate.sql'));
  assert.deepEqual((await catalog(db)).t,expected.after);
  assert.deepEqual((await catalog(db)).b,fixtureBase);
  await db.query('ROLLBACK');
  const script=adapted('apply.sql').replace('COMMIT;','DO $injected$ BEGIN RAISE EXCEPTION \'fixture_fail_after_ddl\'; END $injected$;\nCOMMIT;');
  await reject(db,script,undefined,'P0001','fixture_fail_after_ddl');await db.query('ROLLBACK');
  assert.deepEqual((await catalog(db)).t,expected.before);
 });
 await test('single_apply_commits_then_emits_verified_receipt',async()=>{
  const script=adapted('apply.sql');
  assert.ok(script.indexOf('COMMIT;')<script.lastIndexOf("'stage','apply'"));
  const report=onlyReport(await db.query(script));assert.equal(report.state,'after');assert.equal(report.stage,'apply');
  assert.equal(report.target_fingerprint,expected.fingerprints.after);assert.equal(report.base_fingerprint,fixtureHash);
  assert.deepEqual((await catalog(db)).b,fixtureBase);
  assert.deepEqual((await catalog(db)).t,expected.after);
 });
 await test('independent_connection_verifies_committed_after_state',async()=>{
  const c=await connection();const report=onlyReport(await c.query(adapted('verify.sql')));assert.equal(report.state,'after');
 });
 await test('second_apply_is_refused_without_changes',async()=>{
  await reject(db,adapted('apply.sql'),undefined,'55000','BEFORE_STATE_MISMATCH');await db.query('ROLLBACK');
  assert.deepEqual((await catalog(db)).t,expected.after);
 });
 await test('helper_and_job_table_are_closed_to_app_roles',async()=>{
  for(const role of ['anon','authenticated','service_role']){
   const row=(await db.query(`SELECT has_function_privilege($1,'jobs_private.require_available_accounts_v1(uuid,uuid)','EXECUTE') exec,
    has_table_privilege($1,'public.jobs','INSERT,UPDATE,DELETE') job_write,
    has_table_privilege($1,'jobs_private.requests','INSERT,UPDATE,DELETE') receipt_write`,[role])).rows[0];
   assert.deepEqual(row,{exec:false,job_write:false,receipt_write:false});
  }
 });
 await db.query('INSERT INTO auth.users(id,created_at) SELECT x,now() FROM unnest($1::uuid[]) x',[Object.values(users)]);
 await db.query('INSERT INTO public.business_accounts(id,owner_user_id,name) VALUES($1,$2,$3)',[business,users.owner,'Fixture business']);
 await db.query('INSERT INTO public.business_members(business_account_id,user_id) VALUES($1,$2),($1,$3)',[business,users.owner,users.member]);
 await db.query("INSERT INTO public.identities(id,type,user_id,business_account_id) VALUES($1,'private',$2,NULL),($3,'business',NULL,$4),($5,'private',$6,NULL)",
 [identities.private,users.private,identities.business,business,identities.other,users.other]);
 await db.query('INSERT INTO public.profiles(id,active_identity_id) VALUES($1,$2),($3,$4),($5,$4),($6,$7)',
 [users.private,identities.private,users.owner,identities.business,users.member,users.other,identities.other]);
 await db.query("INSERT INTO public.identity_profiles(identity_id,slug) VALUES($1,'fixture-private'),($2,'fixture-business'),($3,'fixture-other')",Object.values(identities));
 await db.query('INSERT INTO listing_publication_private.hosted_preview_actors(actor_user_id) SELECT x FROM unnest($1::uuid[]) x',[Object.values(users)]);
 let personal,publishedPersonal,businessJob,businessDraft;
 await test('private_actor_owner_same_can_save_publish_status_renew',async()=>{
  personal=(await save()).job;
  publishedPersonal=(await publish(personal)).job;
  assert.equal(publishedPersonal.status,'published');
  const paused=(await status(publishedPersonal,'paused')).job;
  const renewed=(await renew(paused)).job;assert.equal(renewed.status,'paused');
  assert.equal(renewed.content.title,content.title);
 });
 await test('business_owner_can_save_publish_status_renew',async()=>{
  let j=(await save(users.owner,identities.business)).job;
  j=(await publish(j,users.owner,identities.business)).job;
  j=(await status(j,'paused',users.owner,identities.business)).job;
  j=(await renew(j,users.owner,identities.business)).job;businessJob=j;
  assert.equal(j.status,'paused');
 });
 await test('business_member_and_canonical_owner_both_active_allows',async()=>{
  const r=await save(users.member,identities.business);businessDraft=r.job;assert.equal(r.job.actor_user_id,users.member);
 });
 // Future closed/invalid states are synthetic test-only. Real installation
 // deliberately retains active-only and positive-revision production checks.
 await db.query('ALTER TABLE account_lifecycle_private.account_states DROP CONSTRAINT account_states_active_only, DROP CONSTRAINT account_states_revision_positive');
 const cases=[
  ['missing_state',"DELETE FROM account_lifecycle_private.account_states WHERE account_user_id=$1", "INSERT INTO account_lifecycle_private.account_states(account_user_id) VALUES($1)"],
  ['closed_state',"UPDATE account_lifecycle_private.account_states SET state='closed' WHERE account_user_id=$1", "UPDATE account_lifecycle_private.account_states SET state='active' WHERE account_user_id=$1"],
  ['zero_revision',"UPDATE account_lifecycle_private.account_states SET revision=0 WHERE account_user_id=$1", "UPDATE account_lifecycle_private.account_states SET revision=1 WHERE account_user_id=$1"],
  ['negative_revision',"UPDATE account_lifecycle_private.account_states SET revision=-1 WHERE account_user_id=$1", "UPDATE account_lifecycle_private.account_states SET revision=1 WHERE account_user_id=$1"],
  ['banned',"UPDATE auth.users SET banned_until=now()+interval '1 day' WHERE id=$1", "UPDATE auth.users SET banned_until=NULL WHERE id=$1"],
  ['deleted',"UPDATE auth.users SET deleted_at=now() WHERE id=$1", "UPDATE auth.users SET deleted_at=NULL WHERE id=$1"],
  ['nonfinite_created',"UPDATE auth.users SET created_at='infinity' WHERE id=$1", "UPDATE auth.users SET created_at=now() WHERE id=$1"],
 ];
 for(const [label,close,restore]of cases){
  for(const [whose,id]of [['actor',users.member],['owner',users.owner]]){
   await test(`${whose}_${label}_denies_new_write_without_receipt`,async()=>{
    const before=await counts(db);await db.query(close,[id]);
    try{await unavailable(()=>save(users.member,identities.business));assert.deepEqual(await counts(db),before);}
    finally{await db.query(restore,[id]);}
   });
  }
 }
 await test('missing_auth_actor_or_owner_fails_closed',async()=>{
  for(const id of [users.member,users.owner]){
   await db.query('BEGIN');
   try{
    await db.query('DELETE FROM account_lifecycle_private.account_states WHERE account_user_id=$1',[id]);
    await db.query('DELETE FROM auth.users WHERE id=$1',[id]);
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[users.member]);
    const before=await counts(db);await db.query('SAVEPOINT invalid_auth');
    await reject(db,'SELECT public.save_my_job_v1($1,$2,$3,NULL,NULL,$4,$5)',[users.member,identities.business,uuid(),content,'[]'],'42501','job_account_unavailable');
    await db.query('ROLLBACK TO SAVEPOINT invalid_auth');assert.deepEqual(await counts(db),before);
   }finally{await db.query('ROLLBACK');}
  }
 });
 await test('null_owner_or_account_helper_arguments_fail_closed',async()=>{
  for(const pair of [[null,users.owner],[users.member,null],[null,null]])
   await reject(db,'SELECT jobs_private.require_available_accounts_v1($1,$2)',pair,'42501','job_account_unavailable');
 });
 await test('all_four_operations_and_new_key_noop_denied_for_closed_owner',async()=>{
  const before=await counts(db);await db.query("UPDATE account_lifecycle_private.account_states SET state='closed' WHERE account_user_id=$1",[users.owner]);
  try{
   await unavailable(()=>save(users.member,identities.business));
   await unavailable(()=>publish(businessDraft,users.member,identities.business));
   await unavailable(()=>status(businessJob,'paused',users.member,identities.business));
   await unavailable(()=>renew(businessJob,users.member,identities.business));
   await unavailable(()=>save(users.member,identities.business,uuid(),businessJob.job_id,businessJob.edit_revision,businessJob.content));
   assert.deepEqual(await counts(db),before);
  }finally{await db.query("UPDATE account_lifecycle_private.account_states SET state='active' WHERE account_user_id=$1",[users.owner]);}
 });
 await test('exact_receipt_replay_preserved_when_owner_closes',async()=>{
  const key=uuid();const first=await save(users.member,identities.business,key);
  const before=await counts(db);await db.query("UPDATE account_lifecycle_private.account_states SET state='closed' WHERE account_user_id=$1",[users.owner]);
  try{
   const repeated=await save(users.member,identities.business,key);assert.deepEqual(repeated,first);
   assert.deepEqual(await counts(db),before);
   const receipt=await asActor(users.member,identities.business,async c=>(await c.query('SELECT public.get_my_job_request_v1($1,$2,$3) result',[users.member,identities.business,key])).rows[0].result);
   assert.deepEqual(receipt.result,first);
   let e;try{await save(users.member,identities.business,key,null,null,{...content,title:'different'});}catch(error){e=error;}
   assert.equal(e?.code,'22023');assert.match(e?.message,/job_request_conflict/);
  }finally{await db.query("UPDATE account_lifecycle_private.account_states SET state='active' WHERE account_user_id=$1",[users.owner]);}
 });
 await test('mutations_and_receipts_rollback_together',async()=>{
  const before=await counts(db);await db.query('BEGIN');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[users.private]);await db.query('SET LOCAL ROLE authenticated');
  await db.query('SELECT public.save_my_job_v1($1,$2,$3,NULL,NULL,$4,$5)',[users.private,identities.private,uuid(),content,'[]']);
  await db.query('ROLLBACK');assert.deepEqual(await counts(db),before);
 });
 await test('expired_ban_and_null_created_time_remain_allowed',async()=>{
  await db.query("UPDATE auth.users SET banned_until=now()-interval '1 day',created_at=NULL WHERE id=$1",[users.private]);
  try{assert.equal((await save()).job.status,'draft');}
  finally{await db.query('UPDATE auth.users SET banned_until=NULL,created_at=now() WHERE id=$1',[users.private]);}
 });
 // Real independent connections, state-only closer, no artificial sleep locks.
 async function waitBlocked(pid,c=admin){
  const limit=Date.now()+1500;
  while(Date.now()<limit){
   const row=(await c.query('SELECT wait_event_type,wait_event FROM pg_stat_activity WHERE pid=$1',[pid])).rows[0];
   if(row?.wait_event_type==='Lock')return row;
   await new Promise(resolve=>setTimeout(resolve,10));
  }
  throw new Error('expected_actual_lock_wait');
 }
 await test('close_first_state_commit_denies_waiting_new_job',async()=>{
  const closer=await connection(),writer=await connection();const before=await counts(db);
  await closer.query('BEGIN');await closer.query('SELECT id FROM auth.users WHERE id=$1 FOR UPDATE',[users.owner]);
  await closer.query("UPDATE account_lifecycle_private.account_states SET state='closed',revision=revision+1 WHERE account_user_id=$1",[users.owner]);
  const pending=save(users.member,identities.business,uuid(),null,null,content,writer).then(x=>({value:x}),e=>({error:e}));
  await waitBlocked(writer.processID);await closer.query('COMMIT');
  const outcome=await pending;assert.equal(outcome.error?.code,'42501');assert.match(outcome.error?.message,/job_account_unavailable/);
  assert.deepEqual(await counts(db),before);
  await db.query("UPDATE account_lifecycle_private.account_states SET state='active',revision=revision+1 WHERE account_user_id=$1",[users.owner]);
 });
 await test('write_first_closure_waits_for_job_and_receipt_commit',async()=>{
  const writer=await connection(),closer=await connection();const before=await counts(db);
  await writer.query('BEGIN');await writer.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[users.member]);await writer.query('SET LOCAL ROLE authenticated');
  const key=uuid();await writer.query('SELECT public.save_my_job_v1($1,$2,$3,NULL,NULL,$4,$5)',[users.member,identities.business,key,content,'[]']);
  await closer.query('BEGIN');
  const pending=closer.query('SELECT id FROM auth.users WHERE id=$1 FOR UPDATE',[users.owner]);
  await waitBlocked(closer.processID);await writer.query('COMMIT');await pending;
  await closer.query("UPDATE account_lifecycle_private.account_states SET state='closed',revision=revision+1 WHERE account_user_id=$1",[users.owner]);await closer.query('COMMIT');
  const after=await counts(db);assert.equal(after.jobs,before.jobs+1);assert.equal(after.receipts,before.receipts+1);
  await unavailable(()=>save(users.member,identities.business));
  await db.query("UPDATE account_lifecycle_private.account_states SET state='active',revision=revision+1 WHERE account_user_id=$1",[users.owner]);
 });
 await test('changed_canonical_owner_is_checked_instead_of_creator_or_member',async()=>{
  await db.query("UPDATE account_lifecycle_private.account_states SET state='closed' WHERE account_user_id=$1",[users.other]);
  await db.query('UPDATE public.business_accounts SET owner_user_id=$1 WHERE id=$2',[users.other,business]);
  const before=await counts(db);
  try{await unavailable(()=>save(users.member,identities.business));assert.deepEqual(await counts(db),before);}
  finally{
   await db.query('UPDATE public.business_accounts SET owner_user_id=$1 WHERE id=$2',[users.owner,business]);
   await db.query("UPDATE account_lifecycle_private.account_states SET state='active' WHERE account_user_id=$1",[users.other]);
  }
 });
 await test('business_owner_change_waits_for_existing_actor_lock',async()=>{
  const writer=await connection(),changer=await connection();await writer.query('BEGIN');
  await writer.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[users.member]);await writer.query('SET LOCAL ROLE authenticated');
  await writer.query('SELECT public.save_my_job_v1($1,$2,$3,NULL,NULL,$4,$5)',[users.member,identities.business,uuid(),content,'[]']);
  const pending=changer.query('UPDATE public.business_accounts SET owner_user_id=$1 WHERE id=$2',[users.other,business]);
  await waitBlocked(changer.processID);await writer.query('COMMIT');await pending;
  await db.query('UPDATE public.business_accounts SET owner_user_id=$1 WHERE id=$2',[users.owner,business]);
 });
 // Restore the actual active-only production structure, then verify preserved BASE.
 await db.query("ALTER TABLE account_lifecycle_private.account_states ADD CONSTRAINT account_states_active_only CHECK(state='active'), ADD CONSTRAINT account_states_revision_positive CHECK(revision>0)");
 await test('final_target_and_preserved_catalog_still_exact',async()=>{
  const final=await catalog(db);assert.deepEqual(final.b,fixtureBase);assert.deepEqual(final.t,expected.after);
  const report=onlyReport(await db.query(adapted('verify.sql')));assert.equal(report.fence_verified,true);
 });
 metadata.fixture_base_fingerprint=fixtureHash;
 metadata.production_pins=expected.fingerprints;
 metadata.substitutions=JSON.parse(read('proof/fixture-provenance.json')).substitutions;
 metadata.passed=true;metadata.finished_at=new Date().toISOString();
 metadata.test_count=results.length;
 metadata.source_hashes=Object.fromEntries(['release/account-availability.sql','release/mutate.sql','release/preflight.sql','release/apply.sql','release/verify.sql','release/catalog-query.sql','release/expected-contract.json','release/source-pins.json','release/sql_contract.py','generator/build.py','tests/build_fixture.py','tests/native.mjs','tests/fixture.sql'].map(n=>[n,hash(read(n))]));
 fs.writeFileSync(path.join(root,'proof/native-report.json'),JSON.stringify(metadata,null,2)+'\n');
 fs.rmSync(path.join(root,'proof/native-report.failed.json'),{force:true});
 console.log('NATIVE_REPORT '+JSON.stringify({passed:true,test_count:results.length}));
}catch(error){
 metadata.passed=false;metadata.error={name:error.name,message:error.message,code:error.code};metadata.finished_at=new Date().toISOString();
 fs.writeFileSync(path.join(root,'proof/native-report.failed.json'),JSON.stringify(metadata,null,2)+'\n');
 console.error(error);process.exitCode=1;
}finally{
 await Promise.allSettled(clients.map(c=>c.end()));
 try{run('pg_ctl',['-D',data,'-m','fast','-w','stop']);}catch(error){console.error('STOP_ERROR '+error.message);process.exitCode=1;}
}
