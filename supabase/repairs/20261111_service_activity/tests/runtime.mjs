import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as f from './fixture.mjs';
import * as service from '../../20261108_service_publication/tests/fixture.mjs';
const {db,repair,actors:a,asActor,asRole,setIdentity,manage,call,publicCall,all,snapshot,
 readActivity,renew,ownerV2,listV2,provenance,sha,result}=f;
const checks=[],id=()=>crypto.randomUUID(),scalar=async(sql,args=[])=>(await db.query(sql,args)).rows[0].value;
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
const reject=(fn,code,message)=>assert.rejects(fn,e=>e.code===code&&(!message||e.message===message));
const detail=serviceId=>publicCall('get_public_service_v1',[serviceId]);
const search=()=>publicCall('search_public_services_v1',['',null,null,null,null,100,0]);
const slug='synthetic-'+a.ownerIdentity;
const profile=()=>publicCall('get_public_profile_services_v2',[slug,null,24,0]);
const categories=()=>publicCall('get_public_profile_store_categories_v2',[slug,'services',100,0]);
const media=p=>service.service('get_public_service_media_binding_v1',[p.attempt_id,0]);
const ownerMedia=p=>call(a.owner,'get_my_service_media_binding_v1',[a.owner,a.ownerIdentity,p.attempt_id,0]);
const activityRows=()=>all('service_publication_private.activity');
const expire=serviceId=>db.query(`UPDATE service_publication_private.activity
 SET started_at=clock_timestamp()-interval '400 days',active_until=clock_timestamp()-interval '1 hour',last_confirmed_at=NULL
 WHERE service_id=$1`,[serviceId]);
async function status(p,next){const s=await service.ownerRead(p);return call(p.actor_user_id,'set_my_service_activity_v1',[
 p.actor_user_id,p.identity_id,p.service_id,s.edit_revision,s.status,next]);}
async function edit(p,title){const s=await service.ownerRead(p);return service.prepare({...s.content,title,
 priceAmount:s.content.priceAmount===null?null:Number(s.content.priceAmount)},s.images.map(i=>({imageId:i.id,isPrimary:i.is_primary})),
 {user:p.actor_user_id,identity:p.identity_id,serviceId:p.service_id,revision:s.edit_revision});}
const durationIsYear=(until,from)=>scalar("SELECT $1::timestamptz-$2::timestamptz=interval '8760 hours' value",[until,from]);
try{
 // Real publication/managed gallery declarations; synthetic content only.
 const existing=await service.prepare(service.content({title:'Retained photographed service'}),[service.newImage()]);
 await service.readyImage(existing);await service.publish(existing);
 const archived=await service.prepare(service.content({title:'Retained paused service'}),[]);
 await service.publish(archived);await status(archived,'archived');
 const draft=await service.prepare(service.content({title:'Retained draft'}),[]);
 const unpublishedArchive=id();await db.query(`INSERT INTO public.services(id,identity_id,title,category,status)
 VALUES($1,$2,'Never published archive','transport_roadside','archived')`,[unpublishedArchive,a.ownerIdentity]);
 const cat=id();await manage(a.owner,a.ownerIdentity,'create_root',cat,null,'Service lifecycle');
 await f.setCategories(a.owner,existing.service_id,a.ownerIdentity,[cat]);
 const retainedRows=await snapshot(),v1Before=await service.ownerRead(existing);
 const applied=await result(fs.readFileSync(path.join(repair,'apply.sql'),'utf8'));
 assert.equal(applied[0].state,'applied');
 await check('rollout_preserves_every_retained_content_media_category_and_ledger_row',async()=>{
  assert.deepEqual(await snapshot(),retainedRows);assert.deepEqual(await service.ownerRead(existing),v1Before);
 });
 await check('existing_published_and_previously_published_archived_receive_one_explicit_transition_year',async()=>{
  const rollout=(await all('service_publication_private.activity_rollout'))[0],rows=await activityRows();
  assert.equal(rows.length,2);assert.equal(Number(rollout.published_count),1);assert.equal(Number(rollout.archived_count),1);
  for(const row of rows){assert.equal(row.origin,'transition');assert.equal(row.last_confirmed_at,null);
   assert.equal(row.started_at,rollout.activated_at);assert(await durationIsYear(row.active_until,row.started_at));}
 });
 await check('draft_and_never_published_archive_have_no_invented_deadline',async()=>{
  for(const sid of [draft.service_id,unpublishedArchive]){const x=await readActivity(sid);
   assert.equal(x.activity.active_until,null);assert.equal(x.activity.origin,null);assert.equal(x.activity.can_renew,false);
   await reject(()=>renew(sid,'2026-01-01T00:00:00Z'),'55000','service_activity_not_published');}
 });
 await check('v2_owner_projection_retains_v1_exact_fields_and_complete_stable_owner_list',async()=>{
  const v2=await ownerV2(existing.service_id),{activity,...rest}=v2;
  assert.deepEqual({...rest,schema_version:1},v1Before);assert.equal(activity.origin,'transition');
  const page=await listV2();assert.equal(page.schema_version,2);assert.equal(page.total_count,'4');
  assert(page.items.every(x=>x.schema_version===2&&Object.keys(x.activity).length===6));
  assert.equal((await listV2(a.owner,a.ownerIdentity,2,0)).next_offset,2);
  assert.equal((await listV2(a.owner,a.ownerIdentity,2,2)).has_more,false);
 });
 await check('first_real_publication_initializes_server_365_day_period_once',async()=>{
  const pending=await readActivity(draft.service_id);assert.equal(pending.activity.active_until,null);
  await service.publish(draft);const fresh=await readActivity(draft.service_id);
  assert.equal(fresh.activity.origin,'publication');assert.equal(fresh.activity.last_confirmed_at,null);
  const row=(await activityRows()).find(x=>x.service_id===draft.service_id);assert(await durationIsYear(row.active_until,row.started_at));
  const before=await activityRows();await service.publish(draft);assert.deepEqual(await activityRows(),before);
 });
 await check('never_published_archive_receives_period_only_when_first_made_public',async()=>{
  const p={actor_user_id:a.owner,identity_id:a.ownerIdentity,service_id:unpublishedArchive};
  await service.publish(await edit(p,'Unpublished archive edited'));
  assert.equal((await readActivity(unpublishedArchive)).activity.active_until,null);
  await status(p,'published');const fresh=await readActivity(unpublishedArchive);
  assert.equal(fresh.activity.origin,'publication');assert(fresh.activity.active_until);assert(await detail(unpublishedArchive));
 });
 await check('ordinary_content_photo_and_category_saves_do_not_auto_extend',async()=>{
  const before=await activityRows();await service.publish(await edit(existing,'Edited without renewal'));
  await f.setCategories(a.owner,existing.service_id,a.ownerIdentity,[]);
  await f.setCategories(a.owner,existing.service_id,a.ownerIdentity,[cat]);
  assert.deepEqual(await activityRows(),before);
 });
 await check('pausing_and_resuming_never_changes_the_deadline',async()=>{
  const before=await activityRows();await status(existing,'archived');await status(existing,'published');
  assert.deepEqual(await activityRows(),before);
 });
 await check('year_extension_is_explicit_exact_CAS_without_content_revision_or_ranking_changes',async()=>{
  const before=await snapshot(),current=await readActivity(existing.service_id),old=current.activity.active_until;
  const saved=await renew(existing.service_id,old);assert.equal(saved.changed,true);assert.equal(saved.status,'published');
  assert(await durationIsYear(saved.activity.active_until,saved.activity.server_now));
  assert.equal(saved.activity.last_confirmed_at,saved.activity.server_now);assert.deepEqual(await snapshot(),before);
  await reject(()=>renew(existing.service_id,old),'40001','service_activity_conflict');
  assert.equal((await readActivity(existing.service_id)).activity.active_until,saved.activity.active_until);
 });
 await check('exact_microsecond_CAS_rejects_browser_millisecond_rounding',async()=>{
  const current=await readActivity(existing.service_id),rounded=new Date(current.activity.active_until).toISOString();
  await db.query("UPDATE service_publication_private.activity SET active_until=date_trunc('milliseconds',active_until)+interval '1 microsecond' WHERE service_id=$1",[existing.service_id]);
  await reject(()=>renew(existing.service_id,rounded),'40001','service_activity_conflict');
 });
 await check('longer_existing_period_is_retained_without_compounding_or_false_confirmation',async()=>{
  await db.query("UPDATE service_publication_private.activity SET active_until=clock_timestamp()+interval '900 days' WHERE service_id=$1",[existing.service_id]);
  const current=await readActivity(existing.service_id),rows=await activityRows();
  const saved=await renew(existing.service_id,current.activity.active_until);assert.equal(saved.changed,false);
  assert.equal(saved.activity.active_until,current.activity.active_until);
  assert.equal(saved.activity.last_confirmed_at,current.activity.last_confirmed_at);assert.deepEqual(await activityRows(),rows);
 });
 await check('renewing_archived_service_keeps_it_archived_and_invisible',async()=>{
  await expire(archived.service_id);const before=await snapshot(),current=await readActivity(archived.service_id);
  assert.equal(current.activity.is_expired,true);assert.equal(current.activity.can_renew,true);
  const saved=await renew(archived.service_id,current.activity.active_until);assert.equal(saved.changed,true);
  assert.equal(saved.status,'archived');assert.equal(await detail(archived.service_id),null);assert.deepEqual(await snapshot(),before);
 });
 await check('expiry_filters_detail_search_profile_both_versions_categories_and_managed_media',async()=>{
  assert(await detail(existing.service_id));assert(await media(existing));
  const publicBefore=await search(),profileBefore=await profile(),catBefore=await categories();
  assert(catBefore.items.some(x=>x.id===cat));await expire(existing.service_id);
  assert.equal(await detail(existing.service_id),null);assert.equal(await media(existing),null);assert(await ownerMedia(existing));
  const s=await search(),p=await profile(),c=await categories();
  assert.equal(Number(s.total_count),Number(publicBefore.total_count)-1);
  assert.equal(Number(p.total_count),Number(profileBefore.total_count)-1);
  assert(!s.items.some(x=>x.content_id===existing.service_id));assert(!p.items.some(x=>x.id===existing.service_id));
  assert(!c.items.some(x=>x.id===cat));
  const legacy=await publicCall('get_public_profile_services_v1',[slug,80]);
  assert(!legacy.items.some(x=>x.id===existing.service_id));
  const old=await readActivity(existing.service_id);assert.equal(old.status,'published');assert.equal(old.activity.is_expired,true);
 });
 await check('expiry_blocks_new_contact_without_removing_any_existing_history',async()=>{
  const before=await snapshot();await reject(()=>call(a.peer,'contact_my_service_provider_v1',
   [a.peer,a.peerIdentity,id(),existing.service_id]),'42501','service_contact_unavailable');
  assert.deepEqual(await snapshot(),before);
 });
 await check('expired_edit_and_raw_pause_resume_cannot_restore_public_visibility',async()=>{
  const before=(await readActivity(existing.service_id)).activity.active_until;
  await service.publish(await edit(existing,'Expired edit retains expired state'));
  await status(existing,'archived');await status(existing,'published');
  assert.equal((await readActivity(existing.service_id)).activity.active_until,before);assert.equal(await detail(existing.service_id),null);
 });
 await check('explicit_expired_renewal_restores_same_uuid_media_category_and_public_counts',async()=>{
  const before=await snapshot(),old=await readActivity(existing.service_id);await renew(existing.service_id,old.activity.active_until);
  assert.deepEqual(await snapshot(),before);assert.equal((await detail(existing.service_id)).content_id,existing.service_id);
  assert(await media(existing));assert((await categories()).items.some(x=>x.id===cat));
 });
 await check('pending_content_command_remains_valid_after_activity_renewal',async()=>{
  const command=await edit(existing,'Pending edit survives explicit review'),snapshotBefore=await service.ownerRead(existing);
  const old=await readActivity(existing.service_id);await renew(existing.service_id,old.activity.active_until);
  assert.deepEqual(await service.ownerRead(existing),snapshotBefore);await service.publish(command);
  assert.equal((await detail(existing.service_id)).title,'Pending edit survives explicit review');
 });
 await check('null_nonfinite_and_high_isolation_inputs_fail_closed',async()=>{
  const rows=await activityRows(),deadline=(await readActivity(existing.service_id)).activity.active_until;
  for(const value of [null,'infinity','-infinity'])
   await reject(()=>renew(existing.service_id,value),'22023','service_activity_invalid_input');
  for(const isolation of ['repeatable read','serializable']){await db.exec("SET default_transaction_isolation='"+isolation+"'");
   try{await reject(()=>renew(existing.service_id,deadline),'25001','publication_read_committed_required');}
   finally{await db.exec("SET default_transaction_isolation='read committed'");}}
  assert.deepEqual(await activityRows(),rows);
 });
 await check('cross_owner_stale_identity_and_anonymous_owner_endpoints_are_denied',async()=>{
  const deadline=(await readActivity(existing.service_id)).activity.active_until,rows=await activityRows();
  await reject(()=>renew(existing.service_id,deadline,a.peer,a.peerIdentity),'42501');
  await reject(()=>readActivity(existing.service_id,a.peer,a.peerIdentity),'42501');
  await setIdentity(a.owner,a.otherIdentity);await reject(()=>renew(existing.service_id,deadline),'42501');
  await setIdentity(a.owner,a.ownerIdentity);
  for(const role of ['anon','service_role'])for(const sql of [
   'SELECT public.get_my_service_activity_v1($1,$2,$3)',
   'SELECT public.get_my_service_publication_snapshot_v2($1,$2,$3)',
   'SELECT public.renew_my_service_activity_v1($1,$2,$3,now())'])
   await reject(()=>asRole(role,sql,[a.owner,a.ownerIdentity,existing.service_id]),'42501');
  assert.deepEqual(await activityRows(),rows);
 });
 await check('all_API_roles_cannot_write_activity_and_old_browser_writers_remain_closed',async()=>{
  const rows=await activityRows();for(const role of ['anon','authenticated','service_role'])for(const sql of [
   'SELECT * FROM service_publication_private.activity',
   "UPDATE service_publication_private.activity SET active_until=now()+interval '9 years'",
   'DELETE FROM service_publication_private.activity','TRUNCATE service_publication_private.activity'])
   await reject(()=>asRole(role,sql),'42501');
  for(const role of ['anon','authenticated'])await reject(()=>asRole(role,'SELECT * FROM public.services'),'42501');
  await reject(()=>call(a.owner,'save_my_service_v2',[existing.service_id,'Bypass']),'42501');
  await reject(()=>call(a.owner,'set_my_service_status_v2',[existing.service_id,'published']),'42501');
  assert.deepEqual(await activityRows(),rows);
 });
 await check('active_business_member_can_confirm_shared_service_but_revoked_member_cannot',async()=>{
  await setIdentity(a.owner,a.businessIdentity);await setIdentity(a.member,a.businessIdentity);
  const b=await service.prepare(service.content(),[],{identity:a.businessIdentity});await service.publish(b);
  const current=await readActivity(b.service_id,a.member,a.businessIdentity);
  const saved=await renew(b.service_id,current.activity.active_until,a.member,a.businessIdentity);assert.equal(saved.changed,true);
  await db.query("UPDATE public.business_members SET status='inactive' WHERE business_account_id=$1 AND user_id=$2",[a.business,a.member]);
  await reject(()=>renew(b.service_id,saved.activity.active_until,a.member,a.businessIdentity),'42501');
  await setIdentity(a.owner,a.ownerIdentity);await setIdentity(a.member,a.memberIdentity);
 });
 await check('timezone_and_DST_do_not_change_exact_8760_hour_period',async()=>{
  await db.exec("SET timezone='America/New_York'");const old=await readActivity(existing.service_id);
  const saved=await renew(existing.service_id,old.activity.active_until);
  assert(await durationIsYear(saved.activity.active_until,saved.activity.server_now));await db.exec("SET timezone='UTC'");
 });
 const proof={schema_version:1,kind:'service-activity-runtime',result:'PASS',generated_at_utc:new Date().toISOString(),
  checks,check_count:checks.length,engine:'PGlite PostgreSQL/WASM',synthetic_rows:true,concurrent_sessions:false,
  live_database:false,production_storage:false,mac_installer:false,
  inputs:Object.fromEntries([...provenance.map(p=>[p.path,p.sha256]),...['01_state.sql','02_owner_reads.sql','03_renewal.sql',
   'apply.sql','tests/fixture.mjs','tests/runtime.mjs'].map(name=>['supabase/repairs/20261111_service_activity/'+name,sha(fs.readFileSync(path.join(repair,name)))])])};
 fs.writeFileSync(path.join(repair,'runtime-result.json'),JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',check_count:checks.length}));
}catch(e){console.error(JSON.stringify({result:'FAIL',checks,code:e.code,message:e.message,stack:e.stack?.split('\n').slice(0,6)}));process.exitCode=1;}
finally{await db.close();}
