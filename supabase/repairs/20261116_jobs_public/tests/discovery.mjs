import assert from 'node:assert/strict';
import {f,a,id,makeJob,search,profile,detail,owner,rpc,denied,control,action,status} from './helpers.mjs';
export async function discoveryCases(check,state){
 await check('public_search_profile_owner_use_bounded_stable_keysets',async()=>{
  state.more=[];for(let n=0;n<4;n++)state.more.push(await makeJob({title:'Synthetic logistics tie '+n}));
  // Equal timestamps exercise the UUID tie-breaker, not a fake browser sort.
  await f.db.exec("UPDATE public.jobs SET published_at=statement_timestamp()-interval '1 hour'");
  const first=await search(2);assert.equal(first.items.length,2);assert.equal(first.has_more,true);assert(first.next_cursor);
  const second=await search(2,first.next_cursor);const third=await search(2,second.next_cursor);
  assert.equal(third.has_more,false);assert.equal(third.next_cursor,null);
  const ids=[...first.items,...second.items,...third.items].map(j=>j.content_id);
  assert.equal(new Set(ids).size,5);assert.deepEqual(ids,[...ids].sort().reverse());
  const p1=await profile(state.slug,2),p2=await profile(state.slug,2,p1.next_cursor),p3=await profile(state.slug,2,p2.next_cursor);
  assert.deepEqual([...p1.items,...p2.items,...p3.items].map(j=>j.content_id),ids);
  const own1=await rpc(a.member,'get_my_jobs_v1',[a.member,a.businessIdentity,2,null]);
  const own2=await rpc(a.member,'get_my_jobs_v1',[a.member,a.businessIdentity,2,own1.next_cursor]);
  assert.equal(own2.items.length,2);assert.equal(own1.next_cursor.id,own1.items.at(-1).job_id);
  const matching=await search(24,null,null,{query:'logistics',countryCode:'EE',city:'paide',workplaceType:'on_site'});
  assert.equal(matching.items.length,5);assert.equal((await search(24,null,null,{countryCode:'NZ'})).items.length,0);
  assert.equal((await profile('missing-synthetic-business')).items.length,0);
  await denied(()=>search(51),'22023');await denied(()=>search(2,{published_at:'infinity',id:id()}),'22023');
  await denied(()=>search(2,{published_at:new Date().toISOString(),id:id(),offset:2}),'22023');
  state.job=await owner(state.job.job_id);
 });
 await check('provider_hide_affects_discovery_only_and_bilateral_block_affects_all_public_reads',async()=>{
  const hidden=await action(a.peer,await control(a.peer,'profile',a.businessIdentity),'hide',id());
  assert.equal((await search(24,null,a.peer)).items.length,0);
  assert((await detail(state.job.job_id,a.peer)));assert.equal((await profile(state.slug,24,null,a.peer)).items.length,5);
  await action(a.peer,await control(a.peer,'profile',a.businessIdentity),'unhide',id());
  assert.equal((await search(24,null,a.peer)).items.length,5);
  const blocked=await action(a.peer,await control(a.peer,'profile',a.businessIdentity),'block');
  assert(blocked.blocked_by_me);assert.equal((await search(24,null,a.peer)).items.length,0);
  assert.equal(await detail(state.job.job_id,a.peer),null);assert.equal((await profile(state.slug,24,null,a.peer)).items.length,0);
  assert.equal((await search()).items.length,5,'anonymous visibility is independent of account preferences');
  await action(a.peer,await control(a.peer,'profile',a.businessIdentity),'unblock');
  // Reverse owner->viewer block must have the same reader effect.
  await action(a.owner,await control(a.owner,'profile',a.peerIdentity),'block');
  assert.equal((await search(24,null,a.peer)).items.length,0);assert.equal(await detail(state.job.job_id,a.peer),null);
  await action(a.owner,await control(a.owner,'profile',a.peerIdentity),'unblock');
 });
 await check('expired_closed_and_inactive_business_are_excluded_before_pagination',async()=>{
  const closed=(await status(state.more[0],'closed')).job;
  await f.db.query("UPDATE public.jobs SET active_until=statement_timestamp() WHERE id=$1",[state.more[1].job_id]);
  assert.equal(await detail(closed.job_id),null);assert.equal(await detail(state.more[1].job_id),null);
  const page=await search(2);assert.equal(page.items.length,2);assert.equal(page.has_more,true);
  assert(page.items.every(j=>j.content_id!==closed.job_id&&j.content_id!==state.more[1].job_id));
  assert.equal((await search(2,page.next_cursor)).items.length,1);
  await f.db.query("UPDATE public.business_accounts SET status='suspended' WHERE id=$1",[a.business]);
  assert.equal((await search()).items.length,0);assert.equal((await profile(state.slug)).items.length,0);
  await denied(()=>rpc(a.member,'get_my_jobs_v1',[a.member,a.businessIdentity,24,null]));
  await f.db.query("UPDATE public.business_accounts SET status='active' WHERE id=$1",[a.business]);
  assert.equal((await owner(closed.job_id)).status,'closed','owner retains closed content');
 });
}
