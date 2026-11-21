import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as f from './fixture.mjs';
import {report,format} from './catalog.mjs';
const {db,repair,result,actors:a}=f;
const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
const pins=JSON.parse(read('catalog-pins.json'));
const uuid=()=>crypto.randomUUID();
const checks=[];let failure=null,engine=null;
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
const denied=(fn,code='42501')=>assert.rejects(fn,error=>error.code===code);
const person={user:a.owner,identity:a.ownerIdentity};
const business={user:a.member,identity:a.businessIdentity};
const peer={user:a.peer,identity:a.peerIdentity};
const content=overrides=>({title:'Synthetic fence repair',description:'Synthetic local fixture work. No real offer.',category:'construction',
 countryCode:'EE',city:'Paide',locationLabel:'Paide piirkond',workplaceType:'on_site',employmentType:'task',workingTime:null,
 salaryMin:null,salaryMax:null,salaryCurrency:null,salaryPeriod:null,...overrides});
const employment=()=>content({title:'Synthetic employed gardener',employmentType:'permanent',workingTime:'part_time'});
const rpc=(actor,name,args=[])=>f.call(actor.user,name,[actor.user,actor.identity,...args]);
const publicRpc=async(name,args=[],actor=null)=>actor?f.call(actor.user,name,args):
 (await f.asRole('anon','SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') value',args)).rows[0].value;
const policies=async actor=>(await rpc(actor,'get_my_job_policies_v1')).documents.map(d=>({documentId:d.documentId,version:d.version,contentHash:d.contentHash,accepted:true}));
const save=(actor,c=content(),key=uuid(),old=null,shown=[])=>rpc(actor,'save_my_job_v1',[key,old?.job_id??null,old?.edit_revision??null,c,shown]);
const publish=async(actor,job,key=uuid(),shown=null)=>rpc(actor,'publish_my_job_v1',[key,job.job_id,job.edit_revision,shown??await policies(actor)]);
const make=async(actor,c=content())=>(await publish(actor,(await save(actor,c)).job)).job;
const own=(actor,id)=>rpc(actor,'get_my_job_v1',[id]);
const receipt=(actor,key)=>rpc(actor,'get_my_job_request_v1',[key]);
const detail=(id,actor=null)=>publicRpc('get_public_job_v1',[id],actor);
const search=(type=null,actor=null,limit=24,cursor=null)=>publicRpc('search_public_jobs_v1',['',null,null,null,null,type,null,limit,cursor],actor);
const profile=(slug,actor=null)=>publicRpc('get_public_profile_jobs_v1',[slug,24,null],actor);
const status=(actor,job,next)=>rpc(actor,'set_my_job_status_v1',[uuid(),job.job_id,job.edit_revision,job.status,next]);
const renew=(actor,job)=>rpc(actor,'renew_my_job_activity_v1',[uuid(),job.job_id,job.edit_revision,job.active_until]);
const contact=(actor,id,key=uuid())=>rpc(actor,'contact_my_job_provider_v1',[key,id]);
const control=async(actor,target)=>f.call(actor.user,'get_my_provider_control_v1',[actor.user,'profile',target]);
const action=(actor,s,operation)=>f.call(actor.user,'set_my_provider_control_v1',[actor.user,s.target_type,s.target_id,
 operation,s.target_token,operation==='hide'||operation==='unhide'?s.hide_revision:null,
 operation==='hide'||operation==='unhide'?uuid():null,
 operation==='block'||operation==='unblock'?s.block_id:null,operation==='block'||operation==='unblock'?s.block_created_at:null]);
const state={};
try{
 await db.exec("SET search_path=pg_catalog,pg_temp;SET timezone='UTC';SET jit=off;");
 engine={runtime:'PGlite',...(await db.query("SELECT current_setting('server_version') server_version,version() build")).rows[0]};
 await f.setIdentity(business.user,business.identity);await f.setIdentity(person.user,person.identity);
 const slugs=(await db.query('SELECT identity_id,slug FROM public.identity_profiles WHERE identity_id=ANY($1::uuid[])',[[person.identity,business.identity]])).rows;
 state.personalSlug=slugs.find(x=>x.identity_id===person.identity).slug;
 state.businessSlug=slugs.find(x=>x.identity_id===business.identity).slug;
 assert(state.personalSlug&&state.businessSlug);
 await check('old_business_request_and_job_are_preserved_byte_for_byte_during_guarded_install',async()=>{
  state.oldContent=employment();state.oldKey=uuid();state.oldReply=await save(business,state.oldContent,state.oldKey);
  state.oldReceipt=await receipt(business,state.oldKey);
  const before=(await result(read('preflight.sql')))[0];assert.equal(before.state,'before');assert(before.recognized&&before.read_only);assert.equal(before.user_rows_read,false);
  const data=await f.snapshot();const applied=(await result(read('apply.sql')))[0];
  assert.equal(applied.state,'after');assert.equal(applied.read_only,false);
  assert.deepEqual(await f.snapshot(),data);assert.deepEqual(await f.authSnapshot(),f.authBaseline);
  assert.equal(f.installerFacts.rolsuper,false);assert.equal(f.installerFacts.auth_uid_execute_grantable,false);
  const verified=(await result(read('verify.sql')))[0];assert(verified.recognized&&verified.read_only);assert.equal(verified.state,'after');
  assert.deepEqual({...applied,read_only:true},verified);
  assert.deepEqual(await receipt(business,state.oldKey),state.oldReceipt);
  assert.deepEqual(await save(business,state.oldContent,state.oldKey),state.oldReply);
  assert.deepEqual((await own(business,state.oldReply.job.job_id)).content,state.oldContent);
 });
 await check('repeating_exact_install_observes_after_without_rewriting_existing_data',async()=>{
  const data=await f.snapshot();assert.equal((await result(read('apply.sql')))[0].state,'after');assert.deepEqual(await f.snapshot(),data);
 });
 await check('closed_job_tables_and_helpers_remain_closed_for_all_api_roles',async()=>{
  for(const role of ['anon','authenticated','service_role']){
   await denied(()=>f.asRole(role,'SELECT * FROM public.jobs'));
   await denied(()=>f.asRole(role,"INSERT INTO public.jobs(identity_id,created_by_user_id,title,description,category,workplace_type,employment_type) VALUES($1,$2,'Denied','Denied','other','on_site','task')",[person.identity,person.user]));
   await denied(()=>f.asRole(role,'SELECT jobs_private.require_actor($1,$2)',[person.user,person.identity]));
  }
 });
 await check('personal_actor_can_save_task_without_business_membership_or_payment',async()=>{
  state.taskKey=uuid();state.taskContent=content();state.taskDraft=(await save(person,state.taskContent,state.taskKey)).job;
  assert.equal(state.taskDraft.status,'draft');assert.equal(state.taskDraft.identity_id,person.identity);
  assert.equal(Object.keys(state.taskDraft.content).length,13);assert.deepEqual(state.taskDraft.content,state.taskContent);
  assert.equal(await detail(state.taskDraft.job_id),null);
  const observed=await receipt(person,state.taskKey);assert.equal(observed.found,true);
  assert.deepEqual(observed.request,{job_id:null,expected_revision:null,content:state.taskContent,policy_snapshot:[]});
 });
 await check('personal_publish_requires_exact_displayed_policy_and_keeps_one_calendar_month',async()=>{
  const bad=(await policies(person)).map(p=>({...p,contentHash:'0'.repeat(64)}));
  await denied(()=>publish(person,state.taskDraft,uuid(),bad));
  state.task=(await publish(person,state.taskDraft)).job;
  assert.equal(state.task.status,'published');
  assert((await db.query('SELECT active_until=jobs_private.calendar_month_after(published_at) ok FROM public.jobs WHERE id=$1',[state.task.job_id])).rows[0].ok);
  const pub=await detail(state.task.job_id);assert.equal(pub.employer.identity_type,'private');
  assert.deepEqual(Object.keys(pub.employer).sort(),['identity_type','logo_url','name','slug']);
  assert.equal(pub.employer.slug,state.personalSlug);
  for(const privateKey of ['created_by_user_id','user_id','email','phone','contact_email','address_text','lat','lng']){
   assert.equal(Object.hasOwn(pub,privateKey),false);assert.equal(Object.hasOwn(pub.employer,privateKey),false);
  }
 });
 await check('personal_account_can_offer_employment_and_business_member_can_offer_a_task',async()=>{
  state.employment=await make(person,employment());
  state.businessTask=await make(business,content({title:'Synthetic business snow removal',salaryMin:'125.5',salaryMax:'200',salaryCurrency:'EUR',salaryPeriod:'task'}));
  assert.equal((await detail(state.employment.job_id)).employer.identity_type,'private');
  assert.equal((await detail(state.businessTask.job_id)).employer.identity_type,'business');
  assert.equal(state.businessTask.content.salaryPeriod,'task');assert.equal(state.businessTask.content.salaryMin,'125.5');
 });
 await check('task_total_payment_and_workload_are_validated_server_side',async()=>{
  for(const value of [content({workingTime:'full_time'}),employmentWithTotal(),
   content({employmentType:null,salaryMin:'20',salaryCurrency:'EUR',salaryPeriod:'task'}),
   content({salaryPeriod:'task'}),content({salaryMin:'1.5',salaryCurrency:'JPY',salaryPeriod:'task'}),
   content({salaryMin:'20',salaryMax:'10',salaryCurrency:'EUR',salaryPeriod:'task'}),
   content({employmentType:'unknown'}),{...content(),identity_id:peer.identity}]){
   await denied(()=>save(person,value),'22023');
  }
  const hourly=await save(person,content({salaryMin:'15',salaryCurrency:'EUR',salaryPeriod:'hour'}));
  assert.equal(hourly.job.content.salaryPeriod,'hour');
  const exact=await save(person,content({salaryMin:'4.123',salaryCurrency:'KWD',salaryPeriod:'task'}));
  assert.equal(exact.job.content.salaryMin,'4.123');
 });
 await check('table_constraints_also_reject_total_pay_for_employment_or_task_employment_workload',async()=>{
  await denied(()=>db.query("UPDATE public.jobs SET employment_type='permanent',salary_min=10,salary_currency='EUR',salary_period='task' WHERE id=$1",[state.task.job_id]),'23514');
  await denied(()=>db.query("UPDATE public.jobs SET working_time='full_time' WHERE id=$1",[state.task.job_id]),'23514');
  assert.equal((await own(person,state.task.job_id)).content.workingTime,null);
 });
 await check('wrong_account_inactive_identity_and_cross_identity_owner_reads_are_denied',async()=>{
  await denied(()=>f.call(peer.user,'get_my_jobs_v1',[person.user,person.identity,24,null]));
  await denied(()=>f.call(peer.user,'get_my_jobs_v1',[peer.user,person.identity,24,null]));
  await denied(()=>own(peer,state.task.job_id));await denied(()=>own(person,state.businessTask.job_id));
  await f.setIdentity(person.user,business.identity);
  try{await denied(()=>save(person));await denied(()=>receipt(person,state.taskKey));}
  finally{await f.setIdentity(person.user,person.identity);}
  await db.query("UPDATE public.identities SET status='inactive' WHERE id=$1",[person.identity]);
  try{await denied(()=>save(person));assert.equal(await detail(state.task.job_id),null);assert.equal((await profile(state.personalSlug)).items.length,0);}
  finally{await db.query("UPDATE public.identities SET status='active' WHERE id=$1",[person.identity]);}
 });
 await check('business_membership_and_active_business_remain_required',async()=>{
  await db.query("UPDATE public.business_members SET status='inactive' WHERE business_account_id=$1 AND user_id=$2",[a.business,business.user]);
  try{await denied(()=>save(business));await denied(()=>own(business,state.businessTask.job_id));}
  finally{await db.query("UPDATE public.business_members SET status='active' WHERE business_account_id=$1 AND user_id=$2",[a.business,business.user]);}
  await db.query("UPDATE public.business_accounts SET status='suspended' WHERE id=$1",[a.business]);
  try{await denied(()=>save(business));assert.equal(await detail(state.businessTask.job_id),null);assert(await detail(state.task.job_id));}
  finally{await db.query("UPDATE public.business_accounts SET status='active' WHERE id=$1",[a.business]);}
 });
 await check('personal_update_preserves_id_publication_time_and_duration_and_rejects_stale_revision',async()=>{
  const before=state.task,shown=await policies(person),key=uuid();
  const updated=await save(person,content({title:'Synthetic fence repair updated'}),key,before,shown);
  state.task=updated.job;assert.equal(state.task.job_id,before.job_id);assert.equal(state.task.published_at,before.published_at);
  assert.equal(state.task.active_until,before.active_until);assert.equal(state.task.created_at,before.created_at);
  await denied(()=>save(person,content({title:'Stale edit'}),uuid(),before,shown),'40001');
  assert.deepEqual(await receipt(person,key),{schema_version:1,actor_user_id:person.user,identity_id:person.identity,request_key:key,
   found:true,operation:'save',request:{job_id:before.job_id,expected_revision:before.edit_revision,content:content({title:'Synthetic fence repair updated'}),policy_snapshot:shown},result:updated});
 });
 await check('request_key_replay_is_bound_to_exact_content_actor_and_identity',async()=>{
  await denied(()=>save(person,content({title:'Changed original request'}),state.taskKey),'22023');
  assert.equal((await receipt(peer,state.taskKey)).found,false);
  const old=await receipt(person,state.taskKey);assert.equal(old.result.job.status,'draft','receipt remains historical');
  assert.equal((await own(person,state.task.job_id)).status,'published','fresh read remains authoritative');
 });
 await check('task_search_and_personal_profile_filter_before_stable_pagination',async()=>{
  const tasks=await search('task');assert(tasks.items.some(j=>j.content_id===state.task.job_id));
  assert(tasks.items.some(j=>j.content_id===state.businessTask.job_id));assert(tasks.items.every(j=>j.content.employmentType==='task'));
  const jobs=await search('permanent');assert(jobs.items.some(j=>j.content_id===state.employment.job_id));
  assert(jobs.items.every(j=>j.content.employmentType==='permanent'));
  const first=await search('task',null,1);assert(first.has_more);const second=await search('task',null,1,first.next_cursor);
  assert.notEqual(first.items[0].content_id,second.items[0].content_id);
  const p=await profile(state.personalSlug);assert(p.items.some(j=>j.content_id===state.task.job_id));
  assert(p.items.some(j=>j.content_id===state.employment.job_id));assert(p.items.every(j=>j.identity_id===person.identity));
  assert((await profile(state.businessSlug)).items.some(j=>j.content_id===state.businessTask.job_id));
 });
 await check('personal_provider_hide_changes_discovery_only',async()=>{
  await action(peer,await control(peer,person.identity),'hide');
  try{assert((await search(null,peer)).items.every(j=>j.identity_id!==person.identity));assert(await detail(state.task.job_id,peer));
   assert((await profile(state.personalSlug,peer)).items.some(j=>j.content_id===state.task.job_id));}
  finally{await action(peer,await control(peer,person.identity),'unhide');}
 });
 await check('bilateral_account_blocks_filter_personal_detail_search_profile_and_new_contact',async()=>{
  for(const [blocker,target] of [[peer,person],[person,peer]]){
   await action(blocker,await control(blocker,target.identity),'block');
   try{assert.equal(await detail(state.task.job_id,peer),null);
    assert((await search(null,peer)).items.every(j=>j.identity_id!==person.identity));
    assert.equal((await profile(state.personalSlug,peer)).items.length,0);
    await denied(()=>contact(peer,state.task.job_id));assert(await detail(state.task.job_id));}
   finally{await action(blocker,await control(blocker,target.identity),'unblock');}
  }
 });
 await check('private_job_contact_routes_to_identity_owner_and_sends_no_automatic_message',async()=>{
  const count=(await db.query('SELECT count(*)::int n FROM public.messages')).rows[0].n;
  const key=uuid();const contacted=await contact(peer,state.task.job_id,key);state.personalConversation=contacted.conversation_id;
  assert.equal(contacted.replayed,false);assert.equal((await contact(peer,state.task.job_id,key)).replayed,true);
  assert.equal((await db.query('SELECT count(*)::int n FROM public.messages')).rows[0].n,count);
  const members=(await db.query('SELECT user_id,identity_id FROM public.conversation_participants WHERE conversation_id=$1',[contacted.conversation_id])).rows;
  assert(members.some(x=>x.user_id===person.user&&x.identity_id===person.identity));
  assert(members.some(x=>x.user_id===peer.user&&x.identity_id===peer.identity));
  await denied(()=>contact(person,state.task.job_id));
  await denied(()=>contact(peer,state.businessTask.job_id,key),'22023');
 });
 await check('business_task_contact_keeps_business_owner_routing_for_member_created_job',async()=>{
  const contacted=await contact(peer,state.businessTask.job_id);
  const members=(await db.query('SELECT user_id,identity_id FROM public.conversation_participants WHERE conversation_id=$1',[contacted.conversation_id])).rows;
  assert(members.some(x=>x.user_id===a.owner&&x.identity_id===business.identity));
  assert(!members.some(x=>x.user_id===business.user&&x.identity_id===business.identity));
 });
 await check('personal_task_keeps_historical_message_context_and_block_send_guard',async()=>{
  const sent=await rpc(peer,'send_my_message_v2',[uuid(),state.personalConversation,'Synthetic task response',null,null]);
  const thread=()=>rpc(peer,'get_my_marketplace_message_thread_v2',[state.personalConversation,null,null]);
  const before=await thread();const message=before.messages.find(x=>x.id===sent.message_id);
  assert.equal(message.listing.content_type,'job');assert.equal(message.listing.id,state.task.job_id);
  await action(peer,await control(peer,person.identity),'block');
  try{await denied(()=>rpc(peer,'send_my_message_v2',[uuid(),state.personalConversation,'Blocked response',null,null]));
   const blocked=await thread();assert.equal(blocked.can_send,false);assert(blocked.messages.some(x=>x.id===sent.message_id));}
  finally{await action(peer,await control(peer,person.identity),'unblock');}
 });
 await check('paused_expired_and_closed_personal_jobs_leave_public_results_without_erasing_content',async()=>{
  state.task=(await status(person,state.task,'paused')).job;assert.equal(await detail(state.task.job_id),null);
  await db.query("UPDATE public.jobs SET published_at=clock_timestamp()-interval '2 months',active_until=clock_timestamp()-interval '1 second' WHERE id=$1",[state.task.job_id]);
  const old=await own(person,state.task.job_id);const renewed=(await renew(person,old)).job;
  assert.equal(renewed.status,'paused');assert.equal(renewed.published_at,old.published_at);assert.equal(renewed.updated_at,old.updated_at);
  state.task=(await status(person,renewed,'published')).job;assert(await detail(state.task.job_id));
  state.task=(await status(person,state.task,'closed')).job;assert.equal(await detail(state.task.job_id),null);
  assert.equal((await own(person,state.task.job_id)).content.employmentType,'task');
  const thread=await rpc(peer,'get_my_marketplace_message_thread_v2',[state.personalConversation,null,null]);
  assert(thread.messages.length>0);await denied(()=>contact(peer,state.task.job_id));
 });
 await check('personal_publishing_without_public_profile_slug_fails_without_receipt_or_publication',async()=>{
  const draft=(await save(person,content())).job,key=uuid();
  await db.query('UPDATE public.identity_profiles SET slug=NULL WHERE identity_id=$1',[person.identity]);
  try{await denied(()=>publish(person,draft,key),'55000');assert.equal((await receipt(person,key)).found,false);assert.equal((await own(person,draft.job_id)).status,'draft');}
  finally{await db.query('UPDATE public.identity_profiles SET slug=$2 WHERE identity_id=$1',[person.identity,state.personalSlug]);}
 });
 await check('guard_refuses_unrecognized_job_authority_and_rolls_back_without_applying',async()=>{
  await db.exec('BEGIN;GRANT SELECT ON public.jobs TO anon;');
  try{
   const drift=(await result(report(pins)))[0];assert.equal(drift.state,'unknown');assert.equal(drift.recognized,false);
   await denied(()=>result(read('apply.sql')),'55000');
  }finally{await db.exec('ROLLBACK');}
  assert.equal((await result(read('verify.sql')))[0].state,'after');
  await denied(()=>f.asRole('anon','SELECT * FROM public.jobs'));
 });
 await check('new_capabilities_and_retained_auth_authority_are_truthful',async()=>{
  const caps=await publicRpc('get_jobs_capabilities_v1');assert(caps.business_publication&&caps.personal_publication&&caps.task_publication);
  assert.equal(caps.validity,'one_calendar_month_utc');assert.equal((await publicRpc('get_job_categories_v1')).items.length,14);
  assert.deepEqual(await f.authSnapshot(),f.authBaseline);
 });
}catch(error){failure={message:error.message,code:error.code,detail:error.detail,where:error.where,position:error.position,
 stack:error.code&&error.code!=='ERR_ASSERTION'?undefined:error.stack};console.error(JSON.stringify(failure,null,2));process.exitCode=1;}
finally{
 const reportValue={format,result:failure?'FAIL':'PASS',generated_at_utc:new Date().toISOString(),engine,checks,failure,installer:f.installerFacts,
  test_sources:Object.fromEntries(fs.readdirSync(path.join(repair,'tests')).filter(n=>n.endsWith('.mjs')).map(n=>[n,f.sha(read('tests/'+n))])),
  source_modules:Object.fromEntries(f.modules.map(n=>[n,f.sha(read(n))])),
  sql_sha256:Object.fromEntries(['preflight.sql','apply.sql','verify.sql'].map(n=>[n,f.sha(read(n))])),
  live_database:false,real_user_data:false,production_storage:false,native_concurrency:false,
  limitations:['Runs real PostgreSQL permissions and PL/pgSQL in PGlite with synthetic identities and provider metadata, not hosted Supabase/PostgREST.',
   'PGlite serializes sessions. CAS and identity-switch tests are sequential; no native concurrent-session proof is claimed.',
   'Historical test suites are not rerun. Their accepted source declarations are restored as a test foundation.']};
 fs.writeFileSync(path.join(repair,'runtime-result.json'),JSON.stringify(reportValue,null,2)+'\n');
 console.log(JSON.stringify({result:reportValue.result,checks:checks.length,report:path.join(repair,'runtime-result.json')}));await db.close();
}
function employmentWithTotal(){return {...employment(),salaryMin:'20',salaryCurrency:'EUR',salaryPeriod:'task'};}
