import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {db,actors,asActor,asRole,read,here,provenance,seedCompletedListing,seal,
 claim,record,claimSql,recordSql,removeSyntheticMetadata,accounting} from './fixture.mjs';
const checks=[];
const result={schema_version:1,scope:'One completed published SOURCE; exact retained PostgreSQL declarations and synthetic metadata.',
 checks,live_database_calls:false,provider_storage_executed:false,native_postgresql_executed:false,
 concurrent_session_execution:false,synthetic_provider_metadata:true};
async function check(label,action){try{await action();checks.push({label,passed:true});}
 catch(e){checks.push({label,passed:false,message:e.message,code:e.code});throw e;}}
async function denied(operation,code='42501',message){
 let error;try{await operation();}catch(e){error=e;}
 assert.equal(error?.code,code,error?.message??'operation unexpectedly succeeded');
 if(message)assert.equal(error.message,message);
}
async function metadata(item,kind,foreign=false){const o=item.source[0];
 if(kind==='upload')await db.query('INSERT INTO storage.s3_multipart_uploads VALUES($1,$2,$3,$4)',
  [foreign?'foreign-'+crypto.randomUUID():o.upload,o.bucket_id,o.object_path,foreign?crypto.randomUUID():o.version]);
 else await db.query('INSERT INTO storage.s3_multipart_uploads_parts VALUES($1,$2,$3,$4,1,$5,100,clock_timestamp())',
  [foreign?'foreign-'+crypto.randomUUID():o.upload,o.bucket_id,o.object_path,foreign?crypto.randomUUID():o.version,'synthetic-etag']);
}
try{
 result.engine=(await db.query('SELECT version() version')).rows[0].version;
 const cases={};let id=1100;
 for(const name of ['happy','many','business','unverified','unknown','problem','hash','version','upload','foreignUpload',
  'parts','foreignParts','webAbsent','webVersion','webProblem','noSession','blocked','expired','exhausted','network','duringDelete','lateMetadata','firstProblem'])
  cases[name]=await seedCompletedListing(++id,name==='many'?{count:3}:name==='business'?{identity:actors.businessIdentity}:{});
 const bad=await seedCompletedListing(++id,{bad:'wrong-mirror'});
 await db.query(`UPDATE listing_publication_private.multipart_sessions SET verified_at=NULL,observed_sha256=NULL,observed_bytes=NULL WHERE object_id=$1`,[cases.unverified.source[0].id]);
 await db.query(`UPDATE listing_publication_private.multipart_sessions SET state='needs_attention',completed_at=NULL,
  storage_object_id=NULL,complete_etag=NULL,verified_at=NULL,observed_sha256=NULL,observed_bytes=NULL,problem='complete_outcome_unknown' WHERE object_id=$1`,[cases.unknown.source[0].id]);
 for(const name of ['problem','webProblem'])await db.query("UPDATE listing_publication_private.multipart_sessions SET problem='provider_mismatch' WHERE object_id=$1",[(name==='problem'?cases[name].source:cases[name].web)[0].id]);
 await db.query("UPDATE listing_publication_private.multipart_sessions SET observed_sha256=repeat('e',64) WHERE object_id=$1",[cases.hash.source[0].id]);
 for(const name of ['version','webVersion'])await db.query('UPDATE storage.objects SET version=$2 WHERE id=$1',[(name==='version'?cases[name].source:cases[name].web)[0].storageId,crypto.randomUUID()]);
 await removeSyntheticMetadata(cases.webAbsent.web[0]);
 await metadata(cases.upload,'upload');await metadata(cases.foreignUpload,'upload',true);
 await metadata(cases.parts,'parts');await metadata(cases.foreignParts,'parts',true);
 await db.query('DELETE FROM listing_publication_private.multipart_sessions WHERE object_id=$1',[cases.noSession.source[0].id]);
 await db.query("UPDATE listing_publication_private.cleanup SET state='blocked_write_settlement' WHERE object_id=$1",[cases.blocked.source[0].id]);
 for(const name of ['expired','exhausted'])await db.query(`UPDATE listing_publication_private.cleanup SET state='in_flight',
  work_key=$2,try_count=$3,lease_until=clock_timestamp()-interval '1 second' WHERE object_id=$1`,
  [cases[name].source[0].id,crypto.randomUUID(),name==='expired'?1:8]);
 await seal();await db.exec(read('changes.sql'));

 await check('service_only_boundary_and_private_or_generic_apis_remain_closed',async()=>{
  const x=cases.happy,args=[x.author,x.identity,x.attempt,x.request];
  for(const role of ['anon','authenticated'])await denied(()=>asRole(role,claimSql,args));
  await denied(()=>asRole('service_role','SELECT public.claim_listing_cleanup_v1()'));
  await denied(()=>asRole('service_role','SELECT public.record_listing_cleanup_v1($1,$2,$3)',[x.source[0].id,crypto.randomUUID(),'deleted']));
  await denied(()=>asRole('service_role','SELECT * FROM listing_publication_private.cleanup'));
  assert.equal((await db.query("SELECT has_function_privilege('service_role','public.record_listing_published_source_cleanup_v1(uuid,uuid,uuid,uuid,uuid,uuid,text)','EXECUTE') allowed")).rows[0].allowed,true);
 });
 await check('wrong_user_identity_attempt_and_request_are_denied',async()=>{
  await denied(()=>claim(cases.happy,actors.peer,cases.happy.identity));
  await denied(()=>claim(cases.happy,cases.happy.author,actors.otherIdentity));
  await denied(()=>claim(cases.happy,undefined,undefined,crypto.randomUUID()));
  await denied(()=>claim({...cases.happy,attempt:crypto.randomUUID()}));
 });
 await check('claim_requires_read_committed',async()=>{
  await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');
  await db.exec('SET LOCAL ROLE service_role');
  try{await denied(()=>db.query(claimSql,[cases.happy.author,cases.happy.identity,cases.happy.attempt,cases.happy.request]),'25001');}
  finally{await db.exec('ROLLBACK');}
 });
 await check('unknown_unverified_problem_hash_version_and_provider_leftovers_stay_held',async()=>{
  for(const name of ['unverified','unknown','problem','hash','version','upload','foreignUpload','parts','foreignParts',
   'webAbsent','webVersion','webProblem','noSession','blocked']){
   assert.equal(await claim(cases[name]),null,name);assert.equal(Number((await accounting(cases[name])).bytes),29*1024*1024,name);
  }
 });
 await check('broken_published_gallery_fails_before_claim',async()=>{
  await denied(()=>claim(bad),'55000');
  assert.equal((await db.query('SELECT try_count FROM listing_publication_private.cleanup WHERE object_id=$1',[bad.source[0].id])).rows[0].try_count,0);
 });
 let work;
 await check('claim_is_exact_source_with_one_lease_and_no_web_mutation',async()=>{
  const x=cases.happy;assert.equal(Number((await accounting(x)).bytes),29*1024*1024);
  work=await claim(x);assert.equal(work.object_id,x.source[0].id);assert.equal(work.object_path,x.source[0].object_path);
  assert.equal(work.try_count,1);assert.equal(work.schema_version,1);assert.equal(await claim(x),null);
  assert.equal((await db.query('SELECT count(*)::int n FROM listing_publication_private.cleanup WHERE object_id=$1',[x.web[0].id])).rows[0].n,0);
 });
 await check('delete_ack_without_database_absence_rolls_back_and_retains_quota',async()=>{
  await denied(()=>record(cases.happy,work),'55000','publication_source_cleanup_not_observed');
  assert.equal(Number((await accounting(cases.happy)).bytes),29*1024*1024);
  assert.equal((await db.query('SELECT state FROM listing_publication_private.cleanup WHERE object_id=$1',[work.object_id])).rows[0].state,'in_flight');
 });
 await check('record_binding_rejects_web_other_attempt_and_stale_work_key',async()=>{
  await denied(()=>record(cases.happy,{...work,object_id:cases.happy.web[0].id}));
  await denied(()=>record(cases.many,work));
  await denied(()=>record(cases.happy,{...work,work_key:crypto.randomUUID()}));
 });
 await check('observed_logical_absence_releases_exactly_25_mib_retaining_4_mib_web',async()=>{
  await removeSyntheticMetadata(cases.happy.source[0]);assert.equal((await record(cases.happy,work)).state,'deleted');
  const a=await accounting(cases.happy);assert.equal(Number(a.bytes),4*1024*1024);assert.equal(a.receipt.files_remaining,0);assert.equal(a.receipt.state,'published');
  assert.equal((await db.query('SELECT count(*)::int n FROM storage.objects WHERE id=$1',[cases.happy.web[0].storageId])).rows[0].n,1);
  assert.equal((await db.query('SELECT count(*)::int n FROM listing_publication_private.multipart_auxiliary_receipts')).rows[0].n,0);
 });
 await check('lost_result_ack_is_idempotent_without_double_release',async()=>{
  assert.equal((await record(cases.happy,work)).state,'deleted');assert.equal(await claim(cases.happy),null);
  assert.equal(Number((await accounting(cases.happy)).bytes),4*1024*1024);
 });
 await check('one_pass_claims_only_one_of_several_sources',async()=>{
  const x=cases.many;const w=await claim(x);assert(x.source.some(s=>s.id===w.object_id));
  assert.equal((await db.query("SELECT count(*)::int n FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.attempt_id=$1 AND c.state='in_flight'",[x.attempt])).rows[0].n,1);
  assert.equal(Number((await accounting(x)).bytes),3*29*1024*1024);
 });
 await check('another_active_business_member_is_authorized_and_revocation_blocks_result',async()=>{
  const x=cases.business;await db.query('UPDATE public.profiles SET active_identity_id=$2 WHERE id=$1',[actors.member,actors.businessIdentity]);
  const w=await claim(x,actors.member);assert.equal(w.object_id,x.source[0].id);
  await db.query("UPDATE public.business_members SET status='inactive' WHERE user_id=$1",[actors.member]);
  await denied(()=>record(x,w,'network',actors.member));
  await db.query("UPDATE public.business_members SET status='active' WHERE user_id=$1",[actors.member]);
  assert.equal((await record(x,w,'network',actors.member)).state,'retry_wait');
  await db.query('UPDATE public.profiles SET active_identity_id=$2 WHERE id=$1',[actors.member,actors.memberIdentity]);
 });
 await check('network_failure_retains_quota_and_existing_backoff_blocks_immediate_retry',async()=>{
  const x=cases.network,w=await claim(x);assert.equal((await record(x,w,'network')).state,'retry_wait');
  assert.equal(await claim(x),null);assert.equal(Number((await accounting(x)).bytes),29*1024*1024);
 });
 await check('expired_lease_can_reclaim_once_and_exhausted_lease_requires_attention',async()=>{
  const w=await claim(cases.expired);assert.equal(w.try_count,2);
  assert.equal(await claim(cases.exhausted),null);
  assert.equal((await db.query('SELECT state FROM listing_publication_private.cleanup WHERE object_id=$1',[cases.exhausted.source[0].id])).rows[0].state,'needs_attention');
 });
 await check('metadata_appearing_after_claim_prevents_false_deleted_result',async()=>{
  const x=cases.lateMetadata,w=await claim(x);await removeSyntheticMetadata(x.source[0]);await metadata(x,'parts',true);
  await denied(()=>record(x,w),'55000');assert.equal(Number((await accounting(x)).bytes),29*1024*1024);
 });
 await check('listing_removal_interleaved_after_dispatch_preserves_source_result_lineage',async()=>{
  const x=cases.duringDelete,w=await claim(x);await removeSyntheticMetadata(x.source[0]);
  await asActor(x.author,'SELECT public.delete_my_published_listing_v1($1,$2,$3)',[x.author,x.identity,String(x.id)]);
  assert.equal((await record(x,w)).state,'deleted');assert.equal(await claim(x),null);
  const a=await accounting(x);assert.equal(a.receipt.state,'deleting');assert.equal(a.receipt.files_remaining,1);assert.equal(Number(a.bytes),4*1024*1024);
 });
 await check('later_listing_removal_never_recharges_completed_source',async()=>{
  const x=cases.happy;await asActor(x.author,'SELECT public.delete_my_published_listing_v1($1,$2,$3)',[x.author,x.identity,String(x.id)]);
  const a=await accounting(x);assert.equal(a.receipt.files_remaining,1);assert.equal(Number(a.bytes),4*1024*1024);
  assert.equal((await record(x,work)).state,'deleted');assert.equal(Number((await accounting(x)).bytes),4*1024*1024);
 });
 await check('problem_before_first_record_keeps_quota_but_late_diagnostic_never_recharges',async()=>{
  const x=cases.firstProblem,w=await claim(x);await removeSyntheticMetadata(x.source[0]);
  await asRole('selqiro_listing_final_writer_v1',"UPDATE listing_publication_private.multipart_sessions SET problem='provider_mismatch' WHERE object_id=$1",[x.source[0].id]);
  await denied(()=>record(x,w),'55000','publication_source_cleanup_not_observed');
  assert.equal(Number((await accounting(x)).bytes),29*1024*1024);
  await asRole('selqiro_listing_final_writer_v1',"UPDATE listing_publication_private.multipart_sessions SET problem='provider_mismatch' WHERE object_id=$1",[cases.happy.source[0].id]);
  assert.equal(Number((await accounting(cases.happy)).bytes),4*1024*1024);
  assert.equal((await record(cases.happy,work)).state,'deleted');
 });
 await check('auxiliary_oracle_is_not_fabricated_and_legacy_readiness_stays_held',async()=>{
  await denied(()=>db.query(`INSERT INTO listing_publication_private.multipart_auxiliary_receipts(session_id,run_id,storage_instance_id,
   process_exit_observed_at,process_exit_evidence_sha256,volume_scan_evidence_sha256) VALUES($1,$2,'synthetic',clock_timestamp(),repeat('a',64),repeat('a',64))`,
   [cases.happy.source[0].session,crypto.randomUUID()]),'55000','publication_hosted_terminal_cleanup_unavailable');
  const r=(await asRole('service_role','SELECT public.get_selqiro_hosted_preview_readiness_v1($1,$2,$3,$4) value',
   ['vyjletlmwoiwxsnsunlm','listing-publication-hosted-preview-v1','2d088814-0900-448a-a9d1-7b05470cb1d2',actors.owner])).rows[0].value;
  assert.equal(r.cleanup_mode,'held');assert.equal((await db.query('SELECT count(*)::int n FROM listing_publication_private.multipart_auxiliary_receipts')).rows[0].n,0);
 });
 result.passed=true;result.source_provenance=provenance;result.changes_sha256=crypto.createHash('sha256').update(read('changes.sql')).digest('hex');
 console.log(JSON.stringify({passed:true,checks:checks.length}));
}catch(e){result.passed=false;console.error(JSON.stringify({message:e.message,code:e.code,where:e.where}));process.exitCode=1;}
finally{fs.writeFileSync(path.join(here,'runtime-result.json'),JSON.stringify(result,null,2)+'\n');await db.close();}
