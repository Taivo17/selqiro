// Actual SQL against synthetic users in a fresh local PostgreSQL instance.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url)),source=path.resolve(here,'../../..');
const out=path.resolve(process.argv[2]),port=Number(process.argv[3]),testRuntime=path.resolve(process.argv[4]),mode=process.argv[5];
assert(['capture','verify'].includes(mode));
const require=createRequire(path.join(testRuntime,'package.json')),{Client}=require('pg');
const release=path.join(source,'supabase/releases/public-profile-map-v1');
const previous=path.join(source,'supabase/releases/profile-location-v1');
const sql=n=>fs.readFileSync(path.join(release,n),'utf8'),sha=v=>createHash('sha256').update(v).digest('hex');
const files=['changes.sql','new-catalog-query.sql','contract.json',...(mode==='verify'?
 ['baseline-query.sql','preflight.sql','apply.sql','verify.sql','sql_contract.py','expected-contract.json']:[])];
const inputs=Object.fromEntries(files.map(n=>[n,sha(sql(n))]));
for(const name of ['supabase/releases/account-public-profile-fence-v1/public-profile.sql',
 'supabase/releases/account-public-profile-fence-v1/account-availability.sql','supabase/repairs/20261120_profile_editor/apply.sql',
 'supabase/releases/profile-location-v1/changes.sql','tests/profile-location-v1/sql/fixture.sql',
 'tests/public-profile-map-v1/sql/fixture.sql','tests/public-profile-map-v1/sql/runtime.mjs']) inputs[name]=sha(fs.readFileSync(path.join(source,name)));
const cases=[],record=(id,extra={})=>{cases.push({id,passed:true,...extra});console.log('PASS '+id);};
const write=(n,v)=>fs.writeFileSync(path.join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const config={host:'127.0.0.1',port,database:'postgres',user:'postgres',connectionTimeoutMillis:2000,query_timeout:25000,application_name:'selqiro_public_profile_map_isolated_fixture'};
const db=new Client(config);let failure=null,version=null;
const U='11111111-1111-4111-8111-111111111111',I='22222222-2222-4222-8222-222222222222';
const U2='33333333-3333-4333-8333-333333333333',I2='44444444-4444-4444-8444-444444444444';
const B='55555555-5555-4555-8555-555555555555',BI='66666666-6666-4666-8666-666666666666';
const zero='00000000-0000-0000-0000-000000000000';
const place=extra=>({country_code:'EE',country_name:'Estonia',place_name:'Valga',region_name:'Valgamaa',latitude:0,longitude:0,
 precision:'locality',source:'geoapify',source_id:'synthetic:valga',source_kind:'city',...extra});
const publicPlace=loc=>Object.fromEntries(['country_code','country_name','place_name','region_name','latitude','longitude','precision'].map(k=>[k,loc[k]]));
const query=(q,args=[])=>db.query(q,args),capture=async(q)=>(await query(q)).rows[0].result;
const wrapper=async(q)=>{const results=await query(q),rows=(Array.isArray(results)?results:[results]).flatMap(r=>r.rows??[]);
 assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]),['result']);return rows[0].result;};
async function setRole(roleName,uid){assert(['authenticated','anon','service_role'].includes(roleName));
 await query('SET LOCAL ROLE '+roleName);await query("SELECT set_config('request.jwt.claim.sub',$1,true)",[uid??'']);}
async function asRole(roleName,uid,fn){await query('BEGIN');try{await setRole(roleName,uid);const result=await fn();await query('COMMIT');return result;}
 catch(error){await query('ROLLBACK');throw error;}}
const rpc=async(id=I)=>(await query('SELECT public.get_public_profile_location_v1($1::uuid) result',[id])).rows[0].result;
const read=(id=I,roleName='anon',uid=null)=>asRole(roleName,uid,()=>rpc(id));
async function reject(fn,code,message){await assert.rejects(fn,e=>{assert.equal(e.code,code);if(message)assert.equal(e.message,message);return true;});}
async function withMutation(text,args,fn){await query('BEGIN');try{await query(text,args);await fn();}finally{await query('ROLLBACK');}}
const mutateRead=(text,args,id=I,roleName='anon',uid=null)=>withMutation(text,args,async()=>{await setRole(roleName,uid);assert.equal(await rpc(id),null);});
const content=()=>capture(`SELECT jsonb_build_object('profiles',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.identity_id) FROM public.identity_profiles p),
 'locations',(SELECT jsonb_agg(to_jsonb(l) ORDER BY l.identity_id) FROM profile_location_private.profile_locations l),
 'accounts',(SELECT jsonb_agg(to_jsonb(a) ORDER BY a.account_user_id) FROM account_lifecycle_private.account_states a)) result`);
try{
 await db.connect();const g=(await query("SELECT current_setting('data_directory') directory,host(inet_server_addr()) address,current_setting('server_version') version")).rows[0];
 assert.equal(g.directory,path.join(out,'data'));assert.equal(g.address,'127.0.0.1');version=g.version;
 await query(fs.readFileSync(path.join(source,'tests/profile-location-v1/sql/fixture.sql'),'utf8'));
 const accepted=fs.readFileSync(path.join(source,'supabase/repairs/20261120_profile_editor/apply.sql'),'utf8');
 const editor=accepted.slice(accepted.indexOf('\nCREATE SCHEMA profile_editor_private')+1,accepted.indexOf('\n-- Table grants include'));
 assert(editor.startsWith('CREATE SCHEMA profile_editor_private'));await query(editor);
 await query(fs.readFileSync(path.join(source,'supabase/releases/account-public-profile-fence-v1/account-availability.sql'),'utf8'));
 await query(fs.readFileSync(path.join(here,'fixture.sql'),'utf8'));
 await query(fs.readFileSync(path.join(source,'supabase/releases/account-public-profile-fence-v1/public-profile.sql'),'utf8'));
 await query('REVOKE EXECUTE ON FUNCTION public.get_store_by_slug(text) FROM PUBLIC');
 await query('GRANT EXECUTE ON FUNCTION public.get_store_by_slug(text) TO anon,authenticated,service_role');
 await query(fs.readFileSync(path.join(previous,'changes.sql'),'utf8'));
 for(const id of [I,BI]) await query('INSERT INTO profile_location_private.profile_locations(identity_id,location) VALUES($1,$2)',[id,place()]);
 await query('SET search_path=pg_catalog');
 const previousExpected=JSON.parse(fs.readFileSync(path.join(previous,'expected-contract.json'),'utf8'));
 const previousCatalog=await capture(fs.readFileSync(path.join(previous,'new-catalog-query.sql'),'utf8'));
 assert.equal(previousCatalog.sha256,previousExpected.contract_sha256);
 if(mode==='capture'){
  await query(sql('changes.sql'));const result=await capture(sql('new-catalog-query.sql'));
  assert.deepEqual(result.catalog.counts,{routines:1,roles:3});write('new-contract.json',result);
  record('isolated_new_metadata_capture_only',{postgres:version});
 }else{
  const expected=JSON.parse(sql('expected-contract.json')),before=await capture(sql('baseline-query.sql'));
  write('fixture-baseline.json',before);assert.equal(before.coverage,'complete');
  const adapted=name=>sql(name).replaceAll(expected.baseline_sha256,before.baseline_sha256);
  await reject(()=>wrapper(sql('preflight.sql')),'55000','PUBLIC_PROFILE_MAP_BASELINE_MISMATCH');await query('ROLLBACK');
  const beforeReceipt=await wrapper(adapted('preflight.sql'));assert.equal(beforeReceipt.contract_sha256,null);
  record('production_baseline_pin_rejects_synthetic_fixture_and_readonly_absence_is_recognized');
  await query('CREATE FUNCTION public.get_public_profile_location_v1(text) RETURNS void LANGUAGE sql AS $$SELECT$$');
  await reject(()=>wrapper(adapted('preflight.sql')),'55000','PUBLIC_PROFILE_MAP_AFTER_MISMATCH');await query('ROLLBACK');
  await reject(()=>wrapper(adapted('apply.sql')),'55000','PUBLIC_PROFILE_MAP_PARTIAL_OR_EXISTING_RELEASE');await query('ROLLBACK');
  await query('DROP FUNCTION public.get_public_profile_location_v1(text)');
  record('wrong_overload_or_partial_name_collision_is_refused');
  await query('ALTER FUNCTION public.get_store_by_slug(text) SECURITY INVOKER');
  await reject(()=>wrapper(adapted('preflight.sql')),'55000','PUBLIC_PROFILE_MAP_BASELINE_MISMATCH');await query('ROLLBACK');
  await query('ALTER FUNCTION public.get_store_by_slug(text) SECURITY DEFINER');
  await query('ALTER TABLE public.identity_profiles DISABLE TRIGGER profile_location_text_changed_v1');
  await reject(()=>wrapper(adapted('preflight.sql')),'55000','PUBLIC_PROFILE_MAP_BASELINE_MISMATCH');await query('ROLLBACK');
  await query('ALTER TABLE public.identity_profiles ENABLE TRIGGER profile_location_text_changed_v1');
  record('public_eligibility_or_locality_invalidation_drift_refuses_install');
  const wrong=adapted('apply.sql').replaceAll(expected.contract_sha256,'0'.repeat(64));
  await reject(()=>wrapper(wrong),'55000','PUBLIC_PROFILE_MAP_AFTER_MISMATCH');await query('ROLLBACK');
  assert.equal((await query("SELECT to_regprocedure('public.get_public_profile_location_v1(uuid)') value")).rows[0].value,null);
  assert(!sql('apply.sql').slice(0,sql('apply.sql').indexOf('COMMIT;')).includes("'stage','applied'"));
  record('after_guard_failure_rolls_back_new_function_and_ack_is_only_after_commit');
  const originalContent=await content();
  const applyReceipt=await wrapper(adapted('apply.sql'));assert.equal(applyReceipt.stage,'applied');assert.equal(applyReceipt.contract_sha256,expected.contract_sha256);
  write('fixture-apply-receipt.json',applyReceipt);
  const verifyReceipt=await wrapper(adapted('verify.sql'));assert.equal(verifyReceipt.stage,'after');assert.equal(verifyReceipt.contract_sha256,expected.contract_sha256);
  const installedReceipt=await wrapper(adapted('preflight.sql'));assert.equal(installedReceipt.contract_sha256,expected.contract_sha256);
  await reject(()=>wrapper(adapted('apply.sql')),'55000','PUBLIC_PROFILE_MAP_PARTIAL_OR_EXISTING_RELEASE');await query('ROLLBACK');
  assert.deepEqual(await content(),originalContent);assert.equal((await capture(sql('baseline-query.sql'))).baseline_sha256,before.baseline_sha256);
  write('new-contract.json',await capture(sql('new-catalog-query.sql')));
  record('post_commit_ack_independent_verify_exact_resume_and_unchanged_user_content');
  await query('GRANT EXECUTE ON FUNCTION public.get_public_profile_location_v1(uuid) TO service_role');
  await reject(()=>wrapper(adapted('verify.sql')),'55000','PUBLIC_PROFILE_MAP_AFTER_MISMATCH');await query('ROLLBACK');
  await query('REVOKE EXECUTE ON FUNCTION public.get_public_profile_location_v1(uuid) FROM service_role');
  await query('ALTER FUNCTION public.get_public_profile_location_v1(uuid) VOLATILE');
  await reject(()=>wrapper(adapted('verify.sql')),'55000','PUBLIC_PROFILE_MAP_AFTER_MISMATCH');await query('ROLLBACK');
  await query('ALTER FUNCTION public.get_public_profile_location_v1(uuid) STABLE');
  record('unexpected_rpc_grant_or_metadata_drift_refuses_verification');
  assert.deepEqual(await read(),{identity_id:I,location:publicPlace(place())});
  assert.deepEqual(await read(I,'authenticated',U2),{identity_id:I,location:publicPlace(place())});
  record('anonymous_and_authenticated_city_view_return_exactly_seven_public_fields_including_zero_coordinates');
  for(const roleName of ['anon','authenticated','service_role']){
   await reject(()=>asRole(roleName,U2,()=>query('SELECT * FROM profile_location_private.profile_locations')),'42501');
   await reject(()=>asRole(roleName,U2,()=>query('SELECT profile_location_private.valid_location($1)',[place()])),'42501');
  }
  await reject(()=>read(I,'service_role',null),'42501');
  record('private_table_helpers_and_unneeded_service_execution_remain_closed');
  const business=await read(BI);assert.deepEqual(business,{identity_id:BI,location:publicPlace(place())});
  assert(!JSON.stringify(business).includes('Synthetic business street'));assert(!JSON.stringify(business).includes('61.123456'));
  await withMutation("UPDATE public.identity_profiles SET location_visibility='exact' WHERE identity_id=$1",[I],async()=>{
   await setRole('anon',null);assert.deepEqual(await rpc(I),{identity_id:I,location:publicPlace(place())});});
  record('business_exact_and_legacy_private_exact_never_publish_address_or_raw_exact_coordinates_in_map');
  for(const visibility of ['hidden','unexpected'])for(const id of [I,BI]){
   await withMutation('UPDATE public.identity_profiles SET location_visibility=$1 WHERE identity_id=$2',[visibility,id],async()=>{
    await setRole('anon',null);assert.deepEqual(await rpc(id),{identity_id:id,location:null});});
  }
  record('hidden_or_unknown_visibility_suppresses_point_for_both_identity_types');
  assert.deepEqual(await read(I2),{identity_id:I2,location:null});
  assert.equal(await read(zero),null);assert.equal(await read(null),null);
  await mutateRead('UPDATE public.identity_profiles SET slug=NULL WHERE identity_id=$1',[I]);
  record('unconfirmed_location_is_null_and_missing_identity_or_canonical_slug_is_unavailable');
  for(const field of ['place_name','country_name']){
   await withMutation('UPDATE profile_location_private.profile_locations SET location=jsonb_set(location,$1::text[],to_jsonb($2::text)) WHERE identity_id=$3',[[field],'Different',I],async()=>{
    await setRole('anon',null);assert.deepEqual(await rpc(I),{identity_id:I,location:null});});
  }
  record('mismatched_saved_country_or_place_never_reuses_stale_point');
  for(const kind of ['county','state'])await withMutation('UPDATE profile_location_private.profile_locations SET location=$1 WHERE identity_id=$2',[place({precision:'region',source_kind:kind}),I],async()=>{
   await setRole('anon',null);assert.equal((await rpc(I)).location.precision,'region');});
  record('validated_county_and_state_remain_region_precision');
  for(const bad of [place({precision:'exact'}),place({source_kind:'street'}),place({source:'legacy'}),place({latitude:91}),place({longitude:-181})])
   await reject(()=>query('UPDATE profile_location_private.profile_locations SET location=$1 WHERE identity_id=$2',[bad,I]),'23514');
  record('storage_provenance_and_coarse_bounds_reject_exact_or_invalid_points');
  for(const mutation of ["UPDATE auth.users SET deleted_at=clock_timestamp() WHERE id=$1",
   "UPDATE auth.users SET banned_until=clock_timestamp()+interval '1 day' WHERE id=$1",
   "UPDATE auth.users SET created_at='infinity' WHERE id=$1",
   "UPDATE account_lifecycle_private.account_states SET state='closed' WHERE account_user_id=$1",
   'DELETE FROM account_lifecycle_private.account_states WHERE account_user_id=$1']){
   await mutateRead(mutation,[U],I);await mutateRead(mutation,[U],BI);
  }
  record('private_and_real_business_owner_account_unavailability_fail_closed');
  await withMutation("UPDATE auth.users SET banned_until=clock_timestamp()-interval '1 day' WHERE id=$1",[U],async()=>{
   await setRole('anon',null);assert.equal((await rpc()).identity_id,I);});
  await mutateRead("UPDATE public.identities SET status='paused' WHERE id=$1",[I]);
  await mutateRead("UPDATE public.identities SET status='paused' WHERE id=$1",[BI],BI);
  await mutateRead("UPDATE public.business_accounts SET status='paused' WHERE id=$1",[B],BI);
  record('expired_ban_does_not_hide_active_profile_but_inactive_identity_or_business_does');
  for(const pair of [[U,U2],[U2,U]])for(const id of [I,BI])
   await mutateRead('INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES($1,$2)',pair,id,'authenticated',U2);
  record('both_block_directions_apply_to_private_and_business_owner');
  await withMutation('UPDATE public.profiles SET store_slug=$1 WHERE id=$2',['private-fixture',U2],async()=>{
   await query('INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES($1,$2)',[U,U2]);
   await setRole('authenticated',U2);assert.equal(await rpc(I),null);
   assert.equal((await query("SELECT * FROM public.get_store_by_slug('private-fixture')")).rows.length,0);
   assert.equal((await rpc(I2)).identity_id,I2);
  });
  record('unavailable_canonical_profile_never_falls_back_to_a_legacy_alias');
  await withMutation("UPDATE public.identity_profiles SET city='New text locality' WHERE identity_id=$1",[I],async()=>{
   assert.equal((await query('SELECT count(*) n FROM profile_location_private.profile_locations WHERE identity_id=$1',[I])).rows[0].n,'0');
   await setRole('anon',null);assert.deepEqual(await rpc(I),{identity_id:I,location:null});
  });
  record('existing_text_invalidation_trigger_still_removes_point_before_public_read');
  await query('BEGIN READ ONLY');try{await setRole('anon',null);assert.equal((await rpc()).identity_id,I);}finally{await query('ROLLBACK');}
  assert.deepEqual(await content(),originalContent);
  assert.equal((await capture(sql('baseline-query.sql'))).baseline_sha256,before.baseline_sha256);
  assert.equal((await capture(sql('new-catalog-query.sql'))).sha256,expected.contract_sha256);
  record('public_rpc_runs_in_readonly_transaction_and_preserves_all_synthetic_content_and_old_contracts');
 }
}catch(error){failure={message:error.message,code:error.code??null,stack:error.stack};console.error(error);}
finally{await db.end().catch(()=>{});write('native-result.json',{format:'selqiro-public-profile-map-native-v1',mode,postgres:version,
 live_database_accessed:false,provider_calls:0,inputs,cases,passed:failure===null,failure});}
if(failure)process.exitCode=1;
