import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as f from './fixture.mjs';
import {report as stateReport,format} from './catalog.mjs';
const {db,repair,result,actors:a}=f;
const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
const pins=JSON.parse(read('catalog-pins.json'));
const require=createRequire(path.join(f.root,'package.json'));
const {loader}=require(path.join(f.root,'tests/helpers/jobs-public-loader.cjs'));
const load=loader({});
const {parseJobPage,parsePublicJob}=load('src/entities/job/model/jobParsers.ts');
const checks=[];let failure=null,engine=null;
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
const denied=(fn,code='42501')=>assert.rejects(fn,error=>error.code===code);
const uuid=()=>crypto.randomUUID();
const person={user:a.owner,identity:a.ownerIdentity};
const business={user:a.member,identity:a.businessIdentity};
const peer={user:a.peer,identity:a.peerIdentity};
const content=overrides=>({title:'Synthetic snow clearing',description:'Synthetic work only; no real offer.',category:'construction',
 countryCode:'EE',city:'Paide',locationLabel:'Paide piirkond',workplaceType:'on_site',employmentType:'task',workingTime:null,
 salaryMin:null,salaryMax:null,salaryCurrency:null,salaryPeriod:null,...overrides});
const rpc=(actor,name,args=[])=>f.call(actor.user,name,[actor.user,actor.identity,...args]);
const publicRpc=async(name,args=[],actor=null)=>actor?f.call(actor.user,name,args):
 (await f.asRole('anon','SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') value',args)).rows[0].value;
const policies=async actor=>(await rpc(actor,'get_my_job_policies_v1')).documents.map(d=>({documentId:d.documentId,version:d.version,contentHash:d.contentHash,accepted:true}));
const make=async(actor,c=content())=>{
 const draft=(await rpc(actor,'save_my_job_v1',[uuid(),null,null,c,[]])).job;
 return (await rpc(actor,'publish_my_job_v1',[uuid(),draft.job_id,draft.edit_revision,await policies(actor)])).job;
};
const detail=(id,actor=null)=>publicRpc('get_public_job_v1',[id],actor);
const search=(actor=null,limit=24,cursor=null,type=null)=>publicRpc('search_public_jobs_v1',['',null,null,null,null,type,null,limit,cursor],actor);
const profile=(slug,actor=null)=>publicRpc('get_public_profile_jobs_v1',[slug,24,null],actor);
const storedAvatar=value=>db.query('UPDATE public.identity_profiles SET avatar_url=$2 WHERE identity_id=$1',[person.identity,value]);
const privateImage=page=>page.items.find(x=>x.identity_id===person.identity).employer.logo_url;
const fixtures={format:'selqiro-job-image-read-public-fixtures-20261121-v1',
 boundary:'Unmodified results from real local PostgreSQL functions with synthetic jobs/identities/media. No hosted user data or Storage objects.',before:{},after:{},pagination:{}};
const state={};
const capture=async()=>({search:await search(),detail:await detail(state.task.job_id),profile:await profile(state.personalSlug)});
try{
 await db.exec("SET search_path=pg_catalog,pg_temp;SET timezone='UTC';SET jit=off;");
 engine={runtime:'PGlite',...(await db.query("SELECT current_setting('server_version') server_version,version() build")).rows[0]};
 await f.setIdentity(person.user,person.identity);await f.setIdentity(business.user,business.identity);await f.setIdentity(peer.user,peer.identity);
 const slugs=(await db.query('SELECT identity_id,slug FROM public.identity_profiles WHERE identity_id=ANY($1::uuid[])',[[person.identity,business.identity]])).rows;
 state.personalSlug=slugs.find(x=>x.identity_id===person.identity).slug;
 state.businessSlug=slugs.find(x=>x.identity_id===business.identity).slug;
 await db.query('UPDATE public.identity_profiles SET avatar_url=NULL WHERE identity_id=ANY($1::uuid[])',[[person.identity,business.identity]]);
 await check('existing_business_job_and_private_task_without_optional_salary_parse_before_image_regression',async()=>{
  state.businessJob=await make(business,content({title:'Synthetic mower operator',employmentType:'permanent',workingTime:'flexible'}));
  state.task=await make(person,content());
  const page=await search();assert.equal(page.items.length,2);parseJobPage(page,24,{kind:'search'});
 });
 const legacy='data:image/jpeg;base64,'+'A'.repeat(6000);
 await check('one_inline_avatar_reproduces_entire_search_failure_but_business_profile_stays_readable',async()=>{
  await storedAvatar(legacy);fixtures.before=await capture();
  assert.equal(fixtures.before.search.items.length,2);assert.equal(privateImage(fixtures.before.search),legacy);
  assert.throws(()=>parseJobPage(fixtures.before.search,24,{kind:'search'}));
  assert.throws(()=>parsePublicJob(fixtures.before.detail));
  const page=await profile(state.businessSlug);parseJobPage(page,24,{kind:'profile',slug:state.businessSlug,identityId:business.identity});
 });
 await check('guarded_install_changes_one_reader_and_preserves_all_existing_rows_receipts_and_auth_authority',async()=>{
  const before=(await result(read('preflight.sql')))[0];assert.equal(before.state,'before');assert(before.recognized&&before.read_only);assert.equal(before.user_rows_read,false);
  const data=await f.snapshot();const applied=(await result(read('apply.sql')))[0];
  assert.equal(applied.state,'after');assert.equal(applied.read_only,false);
  assert.deepEqual(await f.snapshot(),data);assert.deepEqual(await f.authSnapshot(),f.authBaseline);
  assert.equal(f.installerFacts.rolsuper,false);assert.equal(f.installerFacts.auth_uid_execute_grantable,false);
  const verified=(await result(read('verify.sql')))[0];assert(verified.recognized&&verified.read_only);assert.equal(verified.state,'after');
  assert.deepEqual({...applied,read_only:true},verified);
 });
 await check('legacy_inline_avatar_is_safely_omitted_and_both_jobs_parse_in_search_profile_and_detail',async()=>{
  fixtures.after.legacy=await capture();assert.equal(privateImage(fixtures.after.legacy.search),null);
  for(const actor of [null,person,peer]){
   const page=await search(actor);assert.equal(page.items.length,2);parseJobPage(page,24,{kind:'search'});
   assert.equal(parsePublicJob(await detail(state.task.job_id,actor)).content.salaryMin,null);
   parseJobPage(await profile(state.personalSlug,actor),24,{kind:'profile',slug:state.personalSlug,identityId:person.identity});
   parseJobPage(await profile(state.businessSlug,actor),24,{kind:'profile',slug:state.businessSlug,identityId:business.identity});
  }
  assert.equal((await db.query('SELECT avatar_url FROM public.identity_profiles WHERE identity_id=$1',[person.identity])).rows[0].avatar_url,legacy);
 });
 await check('existing_bounded_HTTP_legacy_references_remain_supported_while_unsafe_or_oversize_ones_become_null',async()=>{
  for(const url of ['https://images.example.invalid/avatar.webp','http://images.example.invalid/avatar.jpg']){
   await storedAvatar(url);const page=await search();assert.equal(privateImage(page),url);parseJobPage(page,24,{kind:'search'});
  }
  for(const url of ['data:image/png;base64,AA==','javascript:alert(1)','https://images.example.invalid/'+'a'.repeat(2100),
   'https://images.example.invalid/'+'ä'.repeat(1100),'https://user:password@images.example.invalid/avatar.webp',
   'https://images.example.invalid/a b.webp','https://images.example.invalid/a\\b.webp']){
   await storedAvatar(url);const page=await search();assert.equal(privateImage(page),null);parseJobPage(page,24,{kind:'search'});
   assert.equal((await db.query('SELECT avatar_url FROM public.identity_profiles WHERE identity_id=$1',[person.identity])).rows[0].avatar_url,url);
  }
  await storedAvatar(null);assert.equal(privateImage(await search()),null);
  await storedAvatar(legacy);
 });
 await check('current_managed_avatar_takes_precedence_over_unchanged_legacy_inline_source',async()=>{
  state.asset=uuid();state.revision=uuid();
  await db.query("INSERT INTO profile_media_private.assets(asset_id,actor_user_id,identity_id,slot,status,sha256,byte_size,width,height) VALUES($1,$2,$3,'avatar','active',$4,4096,128,128)",[state.asset,person.user,person.identity,'a'.repeat(64)]);
  await db.query('INSERT INTO profile_media_private.identity_state(identity_id,revision,avatar_managed,avatar_asset_id) VALUES($1,$2,true,$3)',[person.identity,state.revision,state.asset]);
  state.assetUrl=(await db.query("SELECT profile_media_private.slot_url($1,'avatar') value",[person.identity])).rows[0].value;
  assert.match(state.assetUrl,/^https:\/\/vyjletlmwoiwxsnsunlm\.supabase\.co\/storage\/v1\/object\/public\/identity-media\/managed-profile-v1\//);
  fixtures.after.managed=await capture();assert.equal(privateImage(fixtures.after.managed.search),state.assetUrl);
  assert.equal(fixtures.after.managed.detail.employer.logo_url,state.assetUrl);assert.equal(privateImage(fixtures.after.managed.profile),state.assetUrl);
  parseJobPage(fixtures.after.managed.search,24,{kind:'search'});
  assert.equal((await db.query('SELECT avatar_url FROM public.identity_profiles WHERE identity_id=$1',[person.identity])).rows[0].avatar_url,legacy);
 });
 await check('explicitly_removed_managed_avatar_never_resurrects_a_legacy_picture',async()=>{
  await db.query('UPDATE profile_media_private.identity_state SET avatar_asset_id=NULL WHERE identity_id=$1',[person.identity]);
  fixtures.after.removed=await capture();assert.equal(privateImage(fixtures.after.removed.search),null);
  assert.equal(fixtures.after.removed.detail.employer.logo_url,null);assert.equal(privateImage(fixtures.after.removed.profile),null);
  parseJobPage(fixtures.after.removed.search,24,{kind:'search'});
 });
 await check('managed_asset_of_another_identity_and_retired_assets_do_not_enter_public_job_DTOs',async()=>{
  const other=uuid();await db.query("INSERT INTO profile_media_private.assets(asset_id,actor_user_id,identity_id,slot,status,sha256,byte_size,width,height) VALUES($1,$2,$3,'avatar','active',$4,4096,128,128)",[other,business.user,business.identity,'b'.repeat(64)]);
  await db.query('UPDATE profile_media_private.identity_state SET avatar_asset_id=$2 WHERE identity_id=$1',[person.identity,other]);
  assert.equal(privateImage(await search()),null);
  await db.query('UPDATE profile_media_private.identity_state SET avatar_asset_id=$2 WHERE identity_id=$1',[person.identity,state.asset]);
  await db.query("UPDATE profile_media_private.assets SET status='retired' WHERE asset_id=$1",[state.asset]);
  assert.equal(privateImage(await search()),null);
 });
 await check('stable_search_pagination_and_task_filter_remain_valid_for_mixed_publishers',async()=>{
  fixtures.pagination.first=await search(null,1);assert.equal(fixtures.pagination.first.has_more,true);
  fixtures.pagination.second=await search(null,1,fixtures.pagination.first.next_cursor);
  parseJobPage(fixtures.pagination.first,1,{kind:'search'});
  parseJobPage(fixtures.pagination.second,1,{kind:'search'},fixtures.pagination.first.next_cursor);
  assert.notEqual(fixtures.pagination.first.items[0].content_id,fixtures.pagination.second.items[0].content_id);
  const tasks=await search(null,24,null,'task');assert.equal(tasks.items.length,1);assert.equal(tasks.items[0].content_id,state.task.job_id);
 });
 await check('repeating_exact_apply_only_observes_after_without_writing_rows',async()=>{
  const data=await f.snapshot();assert.equal((await result(read('apply.sql')))[0].state,'after');assert.deepEqual(await f.snapshot(),data);
 });
 await check('unknown_media_reader_definition_is_refused_before_any_change',async()=>{
  const data=await f.snapshot();await db.exec('BEGIN');
  try{
   await db.exec("CREATE OR REPLACE FUNCTION profile_media_private.public_url(p_object_name text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$ SELECT 'https://unexpected.example.invalid/'||p_object_name $$");
   const drift=(await result(stateReport(pins)))[0];assert.equal(drift.state,'unknown');assert.equal(drift.recognized,false);
   await denied(()=>result(read('apply.sql')),'55000');
  }finally{await db.exec('ROLLBACK');}
  assert.deepEqual(await f.snapshot(),data);assert.equal((await result(read('verify.sql')))[0].state,'after');
 });
 await check('job_and_profile_media_private_tables_and_helpers_stay_closed_for_API_roles',async()=>{
  for(const role of ['anon','authenticated','service_role']){
   await denied(()=>f.asRole(role,'SELECT * FROM public.jobs'));
   await denied(()=>f.asRole(role,'SELECT * FROM profile_media_private.assets'));
   await denied(()=>f.asRole(role,"SELECT profile_media_private.slot_url($1,'avatar')",[person.identity]));
  }
  assert.deepEqual(await f.authSnapshot(),f.authBaseline);
 });
 fixtures.generated_at_utc=new Date().toISOString();
 fixtures.engine=engine;
 fs.writeFileSync(path.join(repair,'tests/public-read-fixtures.json'),JSON.stringify(fixtures,null,2)+'\n');
}catch(error){failure={message:error.message,code:error.code,detail:error.detail,where:error.where,position:error.position,
 stack:error.code&&error.code!=='ERR_ASSERTION'?undefined:error.stack};console.error(JSON.stringify(failure,null,2));process.exitCode=1;}
finally{
 const reportValue={format,result:failure?'FAIL':'PASS',generated_at_utc:new Date().toISOString(),engine,checks,failure,installer:f.installerFacts,
  test_sources:Object.fromEntries(fs.readdirSync(path.join(repair,'tests')).filter(n=>n.endsWith('.mjs')).map(n=>[n,f.sha(read('tests/'+n))])),
  client_parser_inputs:Object.fromEntries(load.inputs),
  source_modules:Object.fromEntries(f.modules.map(n=>[n,f.sha(read(n))])),
  sql_sha256:Object.fromEntries(['preflight.sql','apply.sql','verify.sql'].map(n=>[n,f.sha(read(n))])),
  public_fixture_sha256:failure?null:f.sha(read('tests/public-read-fixtures.json')),
  live_database:false,real_user_data:false,production_storage:false,native_concurrency:false,
  limitations:['Real PostgreSQL permissions and PL/pgSQL run in local PGlite with synthetic identities/jobs/media metadata, not hosted Supabase/PostgREST.',
   'Only accepted media reader declarations and table constraints are restored; no hosted Storage objects or prior historical test suites are invoked.',
   'Current TypeScript parsers process the actual SQL responses. Saved fixture values are unmodified and callers may freeze time to their read_at for deterministic expiry checks.']};
 fs.writeFileSync(path.join(repair,'runtime-result.json'),JSON.stringify(reportValue,null,2)+'\n');
 console.log(JSON.stringify({result:reportValue.result,checks:checks.length,report:path.join(repair,'runtime-result.json')}));await db.close();
}
