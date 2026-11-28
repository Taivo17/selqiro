// Fresh synthetic PostgreSQL fixture. This never uses hosted credentials or data.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url)),source=path.resolve(here,'../../..');
const out=path.resolve(process.argv[2]),port=Number(process.argv[3]),testRuntime=path.resolve(process.argv[4]);
const require=createRequire(path.join(testRuntime,'package.json')),{Client}=require('pg');
const release=path.join(source,'supabase/releases/profile-location-v1');
const sql=n=>fs.readFileSync(path.join(release,n),'utf8');
const sha=v=>createHash('sha256').update(v).digest('hex');
const files=['changes.sql','baseline-query.sql','new-catalog-query.sql','contract.json','preflight.sql','apply.sql','verify.sql','sql_contract.py','expected-contract.json'];
const inputs=Object.fromEntries(files.map(n=>[n,sha(sql(n))]));
const cases=[],record=(id,extra={})=>{cases.push({id,passed:true,...extra});console.log('PASS '+id);};
const write=(n,v)=>fs.writeFileSync(path.join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const config={host:'127.0.0.1',port,database:'postgres',user:'postgres',connectionTimeoutMillis:2000,query_timeout:25000,application_name:'selqiro_profile_location_isolated_fixture'};
const db=new Client(config);let failure=null,version=null;
const U='11111111-1111-4111-8111-111111111111',I='22222222-2222-4222-8222-222222222222';
const U2='33333333-3333-4333-8333-333333333333',I2='44444444-4444-4444-8444-444444444444';
const B='55555555-5555-4555-8555-555555555555',BI='66666666-6666-4666-8666-666666666666';
const zero='00000000-0000-0000-0000-000000000000';
const place=extra=>({country_code:'EE',country_name:'Estonia',place_name:'Valga',region_name:'Valgamaa',latitude:0,longitude:0,
 precision:'locality',source:'geoapify',source_id:'synthetic:valga',source_kind:'city',...extra});
const fields=extra=>({display_name:'Private fixture',bio:'Synthetic text',website_url:'',country:'Estonia',city:'Valga',address_text:'',location_visibility:'city',...extra});
const query=async(q,args=[])=>db.query(q,args);
const capture=async(q)=>{const r=await query(q);return r.rows[0].result;};
const wrapper=async(q)=>{const results=await query(q),rows=(Array.isArray(results)?results:[results]).flatMap(r=>r.rows??[]);
 assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]),['result']);return rows[0].result;};
async function role(roleName,uid,fn,client=db){
 assert(['authenticated','anon','service_role'].includes(roleName));
 await client.query('BEGIN');
 try{await client.query('SET LOCAL ROLE '+roleName);await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[uid??'']);
  const r=await fn(client);await client.query('COMMIT');return r;
 }catch(e){await client.query('ROLLBACK');throw e;}
}
const auth=(fn,u=U)=>role('authenticated',u,fn);
const service=fn=>role('service_role',null,fn);
const rpc=async(c,name,args)=>{assert(/^[a-z_0-9]+$/.test(name));const r=await c.query('SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args);return r.rows[0].result;};
const read=async(u=U,i=I)=>auth(c=>rpc(c,'get_my_profile_editor_v2',[u,i]),u);
const prepare=async(loc=place(),u=U,i=I)=>service(c=>rpc(c,'prepare_profile_location_v1',[u,i,loc]));
const save=async(rev,patch,command,u=U,i=I)=>auth(c=>rpc(c,'save_my_profile_editor_v2',[u,i,rev,patch,command]),u);
const v1save=async(rev,patch,u=U,i=I)=>auth(c=>rpc(c,'save_my_profile_editor_v1',[u,i,rev,patch]),u);
const count=async(table)=>Number((await query('SELECT count(*) n FROM '+table)).rows[0].n);
async function reject(fn,code,message){await assert.rejects(fn,e=>{assert.equal(e.code,code);if(message)assert.equal(e.message,message);return true;});}
async function withMutation(text,fn){await query('BEGIN');try{await query(text);await fn();}finally{await query('ROLLBACK');}}
try{
 await db.connect();const g=(await query("SELECT current_setting('data_directory') directory,host(inet_server_addr()) address,current_setting('server_version') version")).rows[0];
 assert.equal(g.directory,path.join(out,'data'));assert.equal(g.address,'127.0.0.1');version=g.version;
 await query(fs.readFileSync(path.join(here,'fixture.sql'),'utf8'));
 const accepted=fs.readFileSync(path.join(source,'supabase/repairs/20261120_profile_editor/apply.sql'),'utf8');
 const v1=accepted.slice(accepted.indexOf('\nCREATE SCHEMA profile_editor_private')+1,accepted.indexOf('\n-- Table grants include'));
 assert(v1.startsWith('CREATE SCHEMA profile_editor_private'));assert(v1.includes('CREATE FUNCTION public.save_my_profile_editor_v1'));
 await query(v1);
 await query(fs.readFileSync(path.join(source,'supabase/releases/account-public-profile-fence-v1/account-availability.sql'),'utf8'));
 await query('SET search_path=pg_catalog');
 const baselineBefore=await capture(sql('baseline-query.sql'));
 write('baseline-observed.json',baselineBefore);
 assert.equal(baselineBefore.coverage.state,'complete');
 const expected=JSON.parse(sql('expected-contract.json'));
 // A fixture cannot claim the deployment catalog hash. Only that expected
 // baseline literal is substituted in memory; actual migration, new catalog
 // guard, grants, validation, COMMIT ordering and SQL files remain unchanged.
 const adapted=name=>sql(name).replaceAll(expected.baseline_sha256,baselineBefore.facts_sha256);
 await reject(()=>wrapper(sql('preflight.sql')),'55000','PROFILE_LOCATION_BASELINE_MISMATCH');await query('ROLLBACK');
 const beforeReceipt=await wrapper(adapted('preflight.sql'));assert.equal(beforeReceipt.stage,'before');assert.equal(beforeReceipt.contract_sha256,null);
 assert.equal((await query("SELECT current_setting('transaction_read_only') value")).rows[0].value,'off');
 record('production_pin_rejects_synthetic_baseline_readonly_preflight_recognizes_exact_absence');
 await query('CREATE SCHEMA profile_location_private');
 await reject(()=>wrapper(adapted('preflight.sql')),'55000','PROFILE_LOCATION_AFTER_MISMATCH');await query('ROLLBACK');await query('DROP SCHEMA profile_location_private');
 await query('CREATE FUNCTION public.get_my_profile_editor_v2(text) RETURNS void LANGUAGE sql AS $$SELECT$$');
 await reject(()=>wrapper(adapted('preflight.sql')),'55000','PROFILE_LOCATION_PARTIAL_OR_EXISTING_RELEASE');await query('ROLLBACK');await query('DROP FUNCTION public.get_my_profile_editor_v2(text)');
 record('partial_schema_or_public_name_collision_is_never_an_installable_before_state');
 await query('ALTER FUNCTION public.get_my_profile_editor_v1(uuid,uuid) SECURITY INVOKER');
 await reject(()=>wrapper(adapted('preflight.sql')),'55000','PROFILE_LOCATION_BASELINE_MISMATCH');await query('ROLLBACK');
 await query('ALTER FUNCTION public.get_my_profile_editor_v1(uuid,uuid) SECURITY DEFINER');
 const deliberatelyWrong=adapted('apply.sql').replaceAll(expected.contract_sha256,'0'.repeat(64));
 await reject(()=>wrapper(deliberatelyWrong),'55000','PROFILE_LOCATION_AFTER_MISMATCH');await query('ROLLBACK');
 assert.equal((await query("SELECT to_regnamespace('profile_location_private') value")).rows[0].value,null);
 assert(!sql('apply.sql').slice(0,sql('apply.sql').indexOf('COMMIT;')).includes("'stage','applied'"));
 record('baseline_body_drift_and_after_hash_failure_stop_and_roll_back_entire_migration');
 const baseRows=JSON.stringify((await query('SELECT (SELECT count(*) FROM public.identity_profiles) profiles,(SELECT count(*) FROM public.identities) identities,(SELECT count(*) FROM public.profiles) users')).rows[0]);
 const appliedReceipt=await wrapper(adapted('apply.sql'));assert.equal(appliedReceipt.stage,'applied');assert.equal(appliedReceipt.contract_sha256,expected.contract_sha256);
 assert.equal(appliedReceipt.release_sha256,expected.release_sha256);write('fixture-apply-receipt.json',appliedReceipt);
 const afterReceipt=await wrapper(adapted('verify.sql'));assert.equal(afterReceipt.stage,'after');assert.equal(afterReceipt.contract_sha256,expected.contract_sha256);
 const installedReceipt=await wrapper(adapted('preflight.sql'));assert.equal(installedReceipt.stage,'before');assert.equal(installedReceipt.contract_sha256,expected.contract_sha256);
 await reject(()=>wrapper(adapted('apply.sql')),'55000','PROFILE_LOCATION_PARTIAL_OR_EXISTING_RELEASE');await query('ROLLBACK');
 record('post_commit_ack_independent_verify_and_exact_installed_resume_without_reapply');
 assert.equal(JSON.stringify((await query('SELECT (SELECT count(*) FROM public.identity_profiles) profiles,(SELECT count(*) FROM public.identities) identities,(SELECT count(*) FROM public.profiles) users')).rows[0]),baseRows);
 const baselineAfter=await capture(sql('baseline-query.sql'));assert.equal(baselineAfter.facts_sha256,baselineBefore.facts_sha256);
 const after=await capture(sql('new-catalog-query.sql'));write('new-contract.json',after);write('fixture-baseline.json',{facts_sha256:baselineBefore.facts_sha256,note:'Synthetic fixture differs from deployment; new release metadata is captured separately.'});
 assert.equal(after.catalog.counts.tables,4);assert.equal(after.catalog.counts.functions,8);assert.equal(after.catalog.counts.policies,0);
 assert.equal(after.sha256,expected.contract_sha256);
 record('additive_migration_preserves_old_rows_functions_acl_and_baseline_metadata',{postgres:version});
 await query('GRANT EXECUTE ON FUNCTION public.prepare_profile_location_v1(uuid,uuid,jsonb) TO authenticated');
 await reject(()=>wrapper(adapted('verify.sql')),'55000','PROFILE_LOCATION_AFTER_MISMATCH');await query('ROLLBACK');
 await query('REVOKE EXECUTE ON FUNCTION public.prepare_profile_location_v1(uuid,uuid,jsonb) FROM authenticated');
 await query('ALTER TABLE public.identity_profiles DISABLE TRIGGER profile_location_text_changed_v1');
 await reject(()=>wrapper(adapted('preflight.sql')),'55000','PROFILE_LOCATION_AFTER_MISMATCH');await query('ROLLBACK');
 await query('ALTER TABLE public.identity_profiles ENABLE TRIGGER profile_location_text_changed_v1');
 assert.equal((await capture(sql('new-catalog-query.sql'))).sha256,expected.contract_sha256);
 record('after_verification_refuses_new_execute_grant_or_disabled_invalidation_trigger');
 const noProfile=await read();assert.equal(noProfile.profile.revision,null);assert.equal(noProfile.location,null);assert.equal(await count('public.identity_profiles'),0);
 record('read_missing_profile_is_read_only_and_preserves_closed_v1_shape');
 for(const roleName of ['anon','authenticated','service_role']){
  const rows=(await query(`SELECT n.nspname||'.'||p.proname name,has_function_privilege($1,p.oid,'EXECUTE') ok
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='profile_location_private'`,[roleName])).rows;
  assert(rows.every(r=>r.ok===false));
  for(const tableName of ['profile_locations','selections','lookup_budget','actor_lookup_budget'])
   await reject(()=>role(roleName,U,c=>c.query('SELECT * FROM profile_location_private.'+tableName)),'42501');
 }
 for(const roleName of ['anon','authenticated']){
  await reject(()=>role(roleName,U,c=>rpc(c,'prepare_profile_location_v1',[U,I,place()])),'42501');
  await reject(()=>role(roleName,U,c=>rpc(c,'reserve_profile_location_lookup_v1',[U,I])),'42501');
 }
 for(const roleName of ['anon','service_role'])await reject(()=>role(roleName,U,c=>rpc(c,'get_my_profile_editor_v2',[U,I])),'42501');
 record('all_private_tables_helpers_and_service_only_rpcs_are_closed_to_clients');
 for(const loc of [null,{}, {...place(),extra:'field'},place({country_code:'ZZ'}),place({country_code:'ee'}),place({latitude:91}),place({longitude:-181}),
  place({latitude:'0'}),place({source:'nominatim'}),place({source_kind:'street'}),place({precision:'exact'}),place({country_name:' Estonia'}),
  place({place_name:'a'.repeat(121)}),place({source_id:'a'.repeat(2049)}),place({region_name:'x\u0085y'}),place({place_name:'x\u2028y'})])
  await reject(()=>prepare(loc),'22023','PROFILE_EDITOR_INVALID_INPUT');
 for(const loc of [place(),place({country_code:'JP',country_name:'Japan',place_name:'東京',region_name:'',source_id:'japan:tokyo'}),
  place({source_kind:'state',precision:'region',place_name:'Järvamaa'}),place({source_kind:'county',precision:'region'})]){
  const p=await prepare(loc);assert.match(p.selection_id,/^[0-9a-f-]{36}$/);await query('DELETE FROM profile_location_private.selections WHERE selection_id=$1',[p.selection_id]);
 }
 record('canonical_shape_country_allowlist_unicode_bounds_zero_and_precision_validated');
 await reject(()=>auth(c=>rpc(c,'get_my_profile_editor_v2',[U2,I2])),'42501','PROFILE_EDITOR_AUTH_CHANGED');
 await reject(()=>read(U,I2),'42501','PROFILE_EDITOR_ACTOR_CHANGED');
 await reject(()=>prepare(place(),U,I2),'42501','PROFILE_EDITOR_ACTOR_CHANGED');
 record('expected_session_and_active_identity_are_checked_fresh');
 const cap=await prepare();const first=await save(null,fields(),{action:'select',selection_id:cap.selection_id});
 assert.deepEqual(first.location,place());assert.notEqual(first.profile.revision,null);assert.equal(await count('profile_location_private.selections'),0);
 assert.deepEqual(Object.keys(first).sort(),['location','profile']);assert.equal(Object.keys(first.profile).length,12);
 assert.deepEqual((await query('SELECT lat,lng FROM public.identity_profiles WHERE identity_id=$1',[I])).rows[0],{lat:null,lng:null});
 assert.deepEqual((await read()).location,place());record('first_save_atomically_creates_profile_and_zero_centroid_without_exact_columns');
 await reject(()=>save(first.profile.revision,fields(),{action:'select',selection_id:cap.selection_id}),'22023','LOCATION_SELECTION_EXPIRED');
 await reject(()=>save(null,fields(),{action:'keep'}),'40001','PROFILE_EDITOR_CONFLICT');
 await reject(()=>save(first.profile.revision,fields({city:'Elsewhere'}),{action:'keep'}),'22023','PROFILE_EDITOR_INVALID_INPUT');
 await reject(()=>save(first.profile.revision,fields(),{action:'keep',latitude:1}),'22023','PROFILE_EDITOR_INVALID_INPUT');
 await reject(()=>save(first.profile.revision,fields(),{action:'clear'}),'22023','PROFILE_EDITOR_INVALID_INPUT');
 record('stale_revision_replay_and_unspecified_location_changes_rejected');
 const capWrong=await prepare();await reject(()=>save(first.profile.revision,fields({country:'Latvia'}),{action:'select',selection_id:capWrong.selection_id}),'22023','PROFILE_EDITOR_INVALID_INPUT');
 assert.equal(await count('profile_location_private.selections'),1);
 await reject(()=>save(first.profile.revision,fields({address_text:'Private address',location_visibility:'exact'}),{action:'select',selection_id:capWrong.selection_id}),'22023','PROFILE_EDITOR_INVALID_INPUT');
 assert.equal((await read()).profile.revision,first.profile.revision);assert.equal(await count('profile_location_private.selections'),1);
 await query("UPDATE profile_location_private.selections SET created_at=statement_timestamp()-interval '20 minutes',expires_at=statement_timestamp()-interval '5 minutes' WHERE selection_id=$1",[capWrong.selection_id]);
 await reject(()=>save(first.profile.revision,fields(),{action:'select',selection_id:capWrong.selection_id}),'22023','LOCATION_SELECTION_EXPIRED');
 const foreign=await prepare(place(),U2,I2);
 await reject(()=>save(first.profile.revision,fields(),{action:'select',selection_id:foreign.selection_id}),'42501','PROFILE_EDITOR_FORBIDDEN');
 record('cross_country_foreign_expired_or_private_exact_selection_rolls_back_without_consumption');
 const renamed=await save(first.profile.revision,fields({display_name:'Renamed'}),{action:'keep'});assert.deepEqual(renamed.location,place());
 const oldRenamed=await v1save(renamed.profile.revision,fields({display_name:'Old client name'}));assert.deepEqual((await read()).location,place());
 await query("UPDATE public.identity_profiles SET avatar_url='fixture-image' WHERE identity_id=$1",[I]);assert.deepEqual((await read()).location,place());
 const oldRead=await read();await v1save(oldRead.profile.revision,fields({city:'Old client new place'}));assert.equal((await read()).location,null);
 record('v1_and_media_name_changes_keep_point_but_v1_location_text_change_invalidates_it');
 const restoredCap=await prepare();const restored=await save((await read()).profile.revision,fields(),{action:'select',selection_id:restoredCap.selection_id});
 const cleared=await save(restored.profile.revision,fields({country:'',city:''}),{action:'clear'});assert.equal(cleared.location,null);assert.equal(cleared.profile.country,'');assert.equal(cleared.profile.city,'');
 record('explicit_clear_removes_normalized_point_and_country_city_together');
 // Every availability probe is rolled back through a distinct privileged
 // transaction. RPC execution still runs under its real granted database role.
 for(const mutation of ["UPDATE auth.users SET banned_until=clock_timestamp()+interval '1 day' WHERE id='"+U+"'",
  "UPDATE auth.users SET deleted_at=clock_timestamp() WHERE id='"+U+"'",
  "UPDATE auth.users SET created_at='infinity' WHERE id='"+U+"'",
  "DELETE FROM account_lifecycle_private.account_states WHERE account_user_id='"+U+"'",
  "UPDATE account_lifecycle_private.account_states SET state='closed' WHERE account_user_id='"+U+"'"]){
  await query('BEGIN');await query(mutation);await query('SAVEPOINT probe');
  for(const [roleName,uid,name,args] of [['authenticated',U,'get_my_profile_editor_v2',[U,I]],['authenticated',U,'save_my_profile_editor_v2',[U,I,cleared.profile.revision,fields({country:'',city:''}),{action:'keep'}]],
   ['service_role',null,'prepare_profile_location_v1',[U,I,place()]],['service_role',null,'reserve_profile_location_lookup_v1',[U,I]]]){
    await query('SET LOCAL ROLE '+roleName);await query("SELECT set_config('request.jwt.claim.sub',$1,true)",[uid??'']);
    await reject(()=>rpc(db,name,args),'42501','PROFILE_EDITOR_FORBIDDEN');await query('ROLLBACK TO SAVEPOINT probe');
  }await query('ROLLBACK');
 }
 record('account_ban_deletion_missing_state_and_closed_state_fence_read_prepare_save_and_budget');
 await query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[BI,U]);
 const businessCap=await prepare(place(),U,BI);
 const business=await save(null,fields({display_name:'Business fixture',address_text:'Business road 1',location_visibility:'exact'}),{action:'select',selection_id:businessCap.selection_id},U,BI);
 assert.equal(business.profile.location_visibility,'exact');assert.deepEqual(business.location,place());
 await query("UPDATE public.business_members SET status='inactive' WHERE business_account_id=$1 AND user_id=$2",[B,U]);
 await reject(()=>read(U,BI),'42501','PROFILE_EDITOR_FORBIDDEN');await reject(()=>prepare(place(),U,BI),'42501','PROFILE_EDITOR_FORBIDDEN');
 await query("UPDATE public.business_members SET status='active' WHERE business_account_id=$1 AND user_id=$2",[B,U]);
 await query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[BI,U2]);
 await reject(()=>prepare(place(),U2,BI),'42501','PROFILE_EDITOR_FORBIDDEN');
 await query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[I,U]);await query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[I2,U2]);
 record('business_exact_text_keeps_locality_point_and_requires_owner_plus_active_membership');
 const caps=await Promise.all([prepare(),prepare()]);const current=(await read()).profile.revision;
 const concurrent=[];
 for(let k=0;k<2;k++){const c=new Client(config);await c.connect();concurrent.push(c);}
 const outcomes=await Promise.allSettled(concurrent.map((c,k)=>role('authenticated',U,d=>rpc(d,'save_my_profile_editor_v2',[U,I,current,fields({display_name:'Concurrent '+k}),{action:'select',selection_id:caps[k].selection_id}]),c)));
 for(const c of concurrent)await c.end();assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);
 const rejected=outcomes.find(o=>o.status==='rejected');assert.equal(rejected.reason.code,'40001');assert.equal(await count('profile_location_private.profile_locations'),2);
 record('concurrent_same_revision_saves_have_one_winner_and_no_partial_point');
 // Service-only global limiter serializes all actors. Its timestamps contain
 // no user query, IP, geocoder key or provider response.
 await query('UPDATE profile_location_private.lookup_budget SET attempts=ARRAY[]::timestamptz[]');await query('DELETE FROM profile_location_private.actor_lookup_budget');
 const firstBudget=await service(c=>rpc(c,'reserve_profile_location_lookup_v1',[U,I]));assert.deepEqual(firstBudget,{allowed:true,retry_after_seconds:0});
 const secondBudget=await service(c=>rpc(c,'reserve_profile_location_lookup_v1',[U2,I2]));assert.equal(secondBudget.allowed,false);assert.equal(secondBudget.retry_after_seconds,1);
 await query("UPDATE profile_location_private.lookup_budget SET attempts=ARRAY[clock_timestamp()-interval '1 second']");
 await query("INSERT INTO profile_location_private.actor_lookup_budget(user_id,attempts) VALUES($1,array_fill(clock_timestamp()-interval '1 minute',ARRAY[60])) ON CONFLICT(user_id) DO UPDATE SET attempts=EXCLUDED.attempts",[U]);
 const actorFull=await service(c=>rpc(c,'reserve_profile_location_lookup_v1',[U,I]));assert.equal(actorFull.allowed,false);assert(actorFull.retry_after_seconds>=3500);
 await query("UPDATE profile_location_private.lookup_budget SET attempts=array_fill(clock_timestamp()-interval '23 hours',ARRAY[3000])");
 const globalFull=await service(c=>rpc(c,'reserve_profile_location_lookup_v1',[U2,I2]));assert.equal(globalFull.allowed,false);assert(globalFull.retry_after_seconds>=3500);
 await query("UPDATE profile_location_private.lookup_budget SET attempts=array_fill(clock_timestamp()-interval '25 hours',ARRAY[3000])");
 const expiredBudget=await service(c=>rpc(c,'reserve_profile_location_lookup_v1',[U2,I2]));assert.equal(expiredBudget.allowed,true);
 assert.equal((await query('SELECT cardinality(attempts) n FROM profile_location_private.lookup_budget')).rows[0].n,1);
 record('global_spacing_rolling_24h_and_actor_rolling_hour_budgets_deny_without_overuse');
 await query('DELETE FROM profile_location_private.selections');
 for(let k=0;k<20;k++)await prepare();await reject(()=>prepare(),'54000','LOCATION_RATE_LIMITED');
 await query("UPDATE profile_location_private.selections SET created_at=statement_timestamp()-interval '20 minutes',expires_at=statement_timestamp()-interval '5 minutes'");
 await prepare();assert.equal(await count('profile_location_private.selections'),1);record('pending_selection_bound_and_expired_cleanup_keep_ephemeral_storage_bounded');
 // lock_owner locks profiles.id=user before the per-identity row. That shared
 // account row serializes the capability count, even around an identity switch.
 await query('DELETE FROM profile_location_private.selections');for(let k=0;k<19;k++)await prepare();
 const quotaClients=[new Client(config),new Client(config)];
 try{
  for(const c of quotaClients)await c.connect();
  const quotaResults=await Promise.allSettled(quotaClients.map(c=>role('service_role',null,d=>rpc(d,'prepare_profile_location_v1',[U,I,place()]),c)));
  assert.equal(quotaResults.filter(r=>r.status==='fulfilled').length,1);
  const limited=quotaResults.find(r=>r.status==='rejected');assert.equal(limited.reason.code,'54000');assert.equal(limited.reason.message,'LOCATION_RATE_LIMITED');
  assert.equal(await count('profile_location_private.selections'),20);
 }finally{for(const c of quotaClients)await c.end();}
 record('concurrent_preparation_at_nineteen_pending_selections_has_only_one_winner');
 await query('DELETE FROM profile_location_private.selections');for(let k=0;k<19;k++)await prepare();
 const holding=new Client(config),switching=new Client(config);
 try{
  await holding.connect();await switching.connect();await holding.query('BEGIN');await holding.query('SET LOCAL ROLE service_role');
  await rpc(holding,'prepare_profile_location_v1',[U,I,place()]);
  await switching.query('BEGIN');await switching.query("SET LOCAL lock_timeout='2s'");
  const switched=switching.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[BI,U]);
  let blocked=false;
  for(let k=0;k<50;k++){
   const result=await query('SELECT $1::int=ANY(pg_blocking_pids($2::int)) blocked',[holding.processID,switching.processID]);
   if(result.rows[0].blocked){blocked=true;break;}await new Promise(resolve=>setTimeout(resolve,10));
  }
  assert(blocked,'identity switch must wait for the per-user profile lock');
  await holding.query('COMMIT');await switched;
  await switching.query('SET LOCAL ROLE service_role');
  await reject(()=>rpc(switching,'prepare_profile_location_v1',[U,BI,place()]),'54000','LOCATION_RATE_LIMITED');
  await switching.query('ROLLBACK');assert.equal(await count('profile_location_private.selections'),20);
  assert.equal((await query('SELECT active_identity_id FROM public.profiles WHERE id=$1',[U])).rows[0].active_identity_id,I);
 }finally{await holding.query('ROLLBACK').catch(()=>{});await switching.query('ROLLBACK').catch(()=>{});await holding.end();await switching.end();}
 record('identity_switch_waits_for_shared_user_lock_and_cannot_bypass_pending_quota');
 const ending=await capture(sql('new-catalog-query.sql'));assert.equal(ending.sha256,after.sha256);
 assert.deepEqual(Object.fromEntries(files.map(n=>[n,sha(sql(n))])),inputs);
 record('tested_release_files_and_closed_schema_metadata_unchanged');
}catch(e){failure={name:e.name,message:e.message,code:e.code,stack:e.stack};console.error(e);process.exitCode=1;}
finally{await db.end().catch(()=>{});write('native-result.json',{format:'selqiro-profile-location-native-proof-v1',passed:failure===null,postgres:version,
 cases,case_count:cases.length,inputs,fixture_note:'Actual old profile functions and actual new release SQL; synthetic users/tables and inert unrelated optional catalog routines. No live project or user records.',live_database_accessed:false,failure});}
