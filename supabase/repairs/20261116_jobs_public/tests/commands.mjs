import assert from 'node:assert/strict';
import {f,a,id,content,denied,rpc,policies,save,publish,owner,receipt,status,renew,detail,ownerContext,business} from './helpers.mjs';
export async function commandCases(check,state){
 state.slug=await business();
 await check('business_authority_direct_tables_and_private_helpers_are_closed',async()=>{
  for(const role of ['anon','authenticated','service_role']){
   await denied(()=>f.asRole(role,'SELECT * FROM public.jobs'));
   await denied(()=>f.asRole(role,'INSERT INTO public.jobs(identity_id,created_by_user_id,title,description,category,workplace_type) VALUES($1,$2,$3,$4,$5,$6)',
    [a.businessIdentity,a.member,'Forbidden','Forbidden','logistics','on_site']));
   await denied(()=>f.asRole(role,'SELECT jobs_private.current_policies()'));
  }
  await denied(()=>rpc(a.owner,'get_my_jobs_v1',[a.owner,a.ownerIdentity,24,null]));
  await denied(()=>rpc(a.peer,'get_my_jobs_v1',[a.member,a.businessIdentity,24,null]));
  await f.db.query("UPDATE public.business_members SET status='inactive' WHERE business_account_id=$1 AND user_id=$2",[a.business,a.member]);
  await denied(()=>save());
  await f.db.query("UPDATE public.business_members SET status='active' WHERE business_account_id=$1 AND user_id=$2",[a.business,a.member]);
 });
 await check('atomic_create_receipt_replay_unknown_reply_and_actor_binding',async()=>{
  const key=id(),original=content();const saved=await save(original,key);state.job=saved.job;
  assert.equal(saved.job.status,'draft');assert.equal(saved.job.active_until,null);assert.equal(await detail(saved.job.job_id),null);
  const read=await receipt(key);assert.equal(read.found,true);assert.equal(read.operation,'save');assert.deepEqual(read.result,saved);
  assert.deepEqual(read.request,{job_id:null,expected_revision:null,content:original,policy_snapshot:[]});
  assert.deepEqual(await save(original,key),saved,'same-key explicit retry reads its committed receipt');
  await denied(()=>save({...original,title:'Changed intent'},key),'22023');
  await f.setIdentity(a.owner,a.businessIdentity);
  const foreign=await rpc(a.owner,'get_my_job_request_v1',[a.owner,a.businessIdentity,key]);
  assert.equal(foreign.found,false);assert.equal(foreign.result,null);await f.setIdentity(a.owner,a.ownerIdentity);
  await f.setIdentity(a.member,a.memberIdentity);await denied(()=>receipt(key));await business();
  const rolled=id();let abandoned;
  await f.db.exec('BEGIN');try{abandoned=await save(content(),rolled);}finally{await f.db.exec('ROLLBACK');}
  assert.equal((await receipt(rolled)).found,false);await denied(()=>owner(abandoned.job.job_id));
  assert.equal((await f.db.query('SELECT count(*)::int n FROM public.jobs')).rows[0].n,1);
 });
 await check('shown_policy_is_exact_and_first_publication_is_one_calendar_month',async()=>{
  const draft=state.job;const wrong=(await policies()).map(p=>({...p,contentHash:'0'.repeat(64)}));const rejected=id();
  await denied(()=>publish(draft,rejected,wrong),'42501');assert.equal((await receipt(rejected)).found,false);
  assert.deepEqual(await owner(draft.job_id),draft);
  const key=id();const published=await publish(draft,key);state.job=published.job;
  assert.equal(published.job.status,'published');assert.equal(published.job.edit_revision,'2');
  const period=(await f.db.query('SELECT active_until=jobs_private.calendar_month_after(published_at) exact FROM public.jobs WHERE id=$1',[draft.job_id])).rows[0];
  assert.equal(period.exact,true);assert.deepEqual(await publish(draft,key),published);
  const pub=await detail(draft.job_id);assert.equal(pub.content_id,draft.job_id);assert.equal(pub.identity_id,a.businessIdentity);
  assert.equal(pub.content.title,draft.content.title);assert.equal(pub.active_until,published.job.active_until);
  assert.equal(Object.hasOwn(pub,'created_by_user_id'),false);
 });
 await check('content_CAS_uses_shared_currency_rules_without_renewal',async()=>{
  const before=state.job;const shown=await policies();
  await denied(()=>save(content({salaryMin:'1.5',salaryCurrency:'JPY',salaryPeriod:'hour'}),id(),before,shown),'22023');
  const updated=await save(content({salaryMin:'1234.123',salaryMax:'9999.999',salaryCurrency:'KWD',salaryPeriod:'month'}),id(),before,shown);
  assert.equal(updated.job.content.salaryMin,'1234.123');assert.equal(updated.job.active_until,before.active_until);
  assert.equal(updated.job.published_at,before.published_at);assert.equal(updated.job.created_at,before.created_at);
  await denied(()=>save(content({title:'Stale overwrite'}),id(),before,shown),'40001');
  assert.equal((await owner(before.job_id)).content.salaryCurrency,'KWD');state.job=updated.job;
  await denied(()=>save({...content(),identityId:a.peerIdentity},id(),state.job,shown),'22023');
  await denied(()=>save(content({salaryMin:'20',salaryMax:'10',salaryCurrency:'EUR',salaryPeriod:'hour'}),id(),state.job,shown),'22023');
 });
 await check('month_end_leap_year_and_session_timezone_are_explicit',async()=>{
  for(const [start,end] of [['2026-01-31T12:30:00Z','2026-02-28T12:30:00Z'],['2028-01-31T12:30:00Z','2028-02-29T12:30:00Z'],
   ['2026-12-31T12:30:00Z','2027-01-31T12:30:00Z'],['2026-08-31T12:30:00Z','2026-09-30T12:30:00Z']]){
   const r=(await f.db.query('SELECT jobs_private.calendar_month_after($1::timestamptz)=$2::timestamptz ok',[start,end])).rows[0];assert(r.ok);
  }
  await f.db.exec("SET timezone='America/New_York'");
  try{assert((await f.db.query("SELECT jobs_private.calendar_month_after('2026-02-15T12:30:00Z')='2026-03-15T12:30:00Z'::timestamptz ok")).rows[0].ok);}
  finally{await f.db.exec("SET timezone='UTC'");}
 });
 await check('expiry_and_renewal_preserve_paused_state_and_organic_dates',async()=>{
  state.job=(await status(state.job,'paused')).job;assert.equal(await detail(state.job.job_id),null);
  // Synthetic clock setup only: no production runner rewrites deadlines.
  await f.db.query("UPDATE public.jobs SET published_at=clock_timestamp()-interval '2 months',active_until=clock_timestamp()-interval '1 second' WHERE id=$1",[state.job.job_id]);
  const expired=await owner(state.job.job_id);const renewed=await renew(expired);
  assert.equal(renewed.job.status,'paused');assert.equal(renewed.job.published_at,expired.published_at);
  assert.equal(renewed.job.created_at,expired.created_at);assert.equal(renewed.job.updated_at,expired.updated_at);
  assert.equal(await detail(expired.job_id),null);await denied(()=>renew(expired),'40001');
  state.job=(await status(renewed.job,'published')).job;assert.equal((await detail(state.job.job_id)).content_id,state.job.job_id);
  const future=await owner(state.job.job_id);
  await f.db.query("UPDATE public.jobs SET active_until=clock_timestamp()+interval '3 months' WHERE id=$1",[future.job_id]);
  const longer=await owner(future.job_id);const unchanged=await renew(longer);
  assert.equal(unchanged.changed,false);assert.deepEqual(unchanged.job,longer);state.job=longer;
 });
}
