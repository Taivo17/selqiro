import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {db,actors,asActor,asRole,read,here,provenance,seedCompletedListing,seal,
 claim,removeSyntheticMetadata,accounting,retire,webClaim,webRecord,webStatus,webClaimSql,webRecordSql,
 webStatusSql,gallery,primary,fullyDeleted} from './fixture.mjs';
const checks=[];
const result={schema_version:1,scope:'Exact retired published WEB; accepted PostgreSQL declarations with synthetic provider metadata.',
 checks,live_database_calls:false,provider_storage_executed:false,native_postgresql_executed:false,
 concurrent_session_execution:false,synthetic_provider_metadata:true};
async function check(label,action){try{await action();checks.push({label,passed:true});}
 catch(e){checks.push({label,passed:false,message:e.message,code:e.code});throw e;}}
async function denied(operation,code='42501',message){
 let error;try{await operation();}catch(e){error=e;}
 assert.equal(error?.code,code,error?.message??'operation unexpectedly succeeded');if(message)assert.equal(error.message,message);
}
async function metadata(o,kind,foreign=false){
 if(kind==='upload')await db.query('INSERT INTO storage.s3_multipart_uploads VALUES($1,$2,$3,$4)',
  [foreign?'foreign-'+crypto.randomUUID():o.upload,o.bucket_id,o.object_path,foreign?crypto.randomUUID():o.version]);
 else await db.query('INSERT INTO storage.s3_multipart_uploads_parts VALUES($1,$2,$3,$4,1,$5,100,clock_timestamp())',
  [foreign?'foreign-'+crypto.randomUUID():o.upload,o.bucket_id,o.object_path,foreign?crypto.randomUUID():o.version,'synthetic-etag']);
}
async function deleteListing(x){return asActor(x.author,'SELECT public.delete_my_published_listing_v1($1,$2,$3)',[x.author,x.identity,String(x.id)]);}
async function setProblem(o){return asRole('selqiro_listing_final_writer_v1',"UPDATE listing_publication_private.multipart_sessions SET problem='provider_mismatch' WHERE object_id=$1",[o.id]);}
try{
 result.engine=(await db.query('SELECT version() version')).rows[0].version;
 const cases={};let id=2100;
 for(const name of ['happy','many','business','unverified','unknown','problem','hash','version','upload','foreignUpload',
  'parts','foreignParts','noSession','blocked','expired','exhausted','network','duringDelete','afterDelete',
  'lateMetadata','firstProblem','sourceDiagnostic','brokenGallery','unknownAck']){
  const x=cases[name]=await seedCompletedListing(++id,name==='business'?{count:3,identity:actors.businessIdentity}:{count:3});
  if(name==='business')await db.query('UPDATE public.profiles SET active_identity_id=$2 WHERE id=$1',[x.author,x.identity]);
  x.retired=await retire(x);
  if(name==='many')x.secondRetired=await retire(x,2);
  if(name==='business')await db.query('UPDATE public.profiles SET active_identity_id=$2 WHERE id=$1',[x.author,actors.ownerIdentity]);
 }
 const none=await seedCompletedListing(++id,{count:2});
 await db.query('UPDATE listing_publication_private.multipart_sessions SET verified_at=NULL,observed_sha256=NULL,observed_bytes=NULL WHERE object_id=$1',[cases.unverified.retired.id]);
 await db.query(`UPDATE listing_publication_private.multipart_sessions SET state='needs_attention',completed_at=NULL,
  storage_object_id=NULL,complete_etag=NULL,verified_at=NULL,observed_sha256=NULL,observed_bytes=NULL,problem='complete_outcome_unknown' WHERE object_id=$1`,[cases.unknown.retired.id]);
 await db.query("UPDATE listing_publication_private.multipart_sessions SET problem='provider_mismatch' WHERE object_id=$1",[cases.problem.retired.id]);
 await db.query("UPDATE listing_publication_private.multipart_sessions SET observed_sha256=repeat('e',64) WHERE object_id=$1",[cases.hash.retired.id]);
 await db.query('UPDATE storage.objects SET version=$2 WHERE id=$1',[cases.version.retired.storageId,crypto.randomUUID()]);
 await metadata(cases.upload.retired,'upload');await metadata(cases.foreignUpload.retired,'upload',true);
 await metadata(cases.parts.retired,'parts');await metadata(cases.foreignParts.retired,'parts',true);
 await db.query('DELETE FROM listing_publication_private.multipart_sessions WHERE object_id=$1',[cases.noSession.retired.id]);
 await db.query("UPDATE listing_publication_private.cleanup SET state='blocked_write_settlement' WHERE object_id=$1",[cases.blocked.retired.id]);
 for(const name of ['expired','exhausted'])await db.query(`UPDATE listing_publication_private.cleanup SET state='in_flight',
  work_key=$2,try_count=$3,lease_until=clock_timestamp()-interval '1 second' WHERE object_id=$1`,
  [cases[name].retired.id,crypto.randomUUID(),name==='expired'?1:8]);
 await seal();await db.exec(read('changes.sql'));

 await check('claim_record_service_only_read_authenticated_only_and_generic_apis_closed',async()=>{
  const x=cases.happy,args=[x.author,x.identity,x.attempt,x.request];
  for(const role of ['anon','authenticated']){
   await denied(()=>asRole(role,webClaimSql,args));
   await denied(()=>asRole(role,webRecordSql,[...args,x.retired.id,crypto.randomUUID(),'deleted']));
  }
  for(const role of ['anon','service_role'])await denied(()=>asRole(role,webStatusSql,args));
  await denied(()=>asRole('service_role','SELECT public.claim_listing_cleanup_v1()'));
  await denied(()=>asRole('service_role','SELECT public.record_listing_cleanup_v1($1,$2,$3)',[x.retired.id,crypto.randomUUID(),'deleted']));
  await denied(()=>asRole('service_role','SELECT * FROM listing_publication_private.cleanup'));
 });
 await check('exact_actor_identity_attempt_request_required_for_read_and_mutation',async()=>{
  for(const call of [webClaim,webStatus]){
   await denied(()=>call(cases.happy,actors.peer,cases.happy.identity));
   await denied(()=>call(cases.happy,cases.happy.author,actors.otherIdentity));
   await denied(()=>call(cases.happy,undefined,undefined,crypto.randomUUID()));
   await denied(()=>call({...cases.happy,attempt:crypto.randomUUID()}));
  }
 });
 await check('read_is_separate_read_only_authorized_projection_and_source_counter_is_unchanged',async()=>{
  const x=cases.happy;
  const before=(await db.query('SELECT to_jsonb(c) value FROM listing_publication_private.cleanup c WHERE object_id=$1',[x.retired.id])).rows[0].value;
  const status=await webStatus(x);assert.deepEqual(Object.keys(status).sort(),['schema_version','attempt_id','request_key','files_remaining','needs_attention','reserved_bytes'].sort());
  assert.deepEqual(status,{schema_version:1,attempt_id:x.attempt,request_key:x.request,files_remaining:1,needs_attention:0,reserved_bytes:4194304});
  assert.deepEqual(await webStatus(x),status);
  assert.deepEqual((await db.query('SELECT to_jsonb(c) value FROM listing_publication_private.cleanup c WHERE object_id=$1',[x.retired.id])).rows[0].value,before);
  assert.equal((await accounting(x)).receipt.files_remaining,0);
  assert.equal((await webStatus(none)).files_remaining,0);assert.equal(await webClaim(none),null);
  assert.equal((await accounting(none)).receipt.files_remaining,2);
 });
 await check('claim_requires_read_committed',async()=>{
  await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');await db.exec('SET LOCAL ROLE service_role');
  try{await denied(()=>db.query(webClaimSql,[cases.happy.author,cases.happy.identity,cases.happy.attempt,cases.happy.request]),'25001');}
  finally{await db.exec('ROLLBACK');}
 });
 await check('unknown_unverified_hash_version_unfinished_uploads_and_parts_do_not_authorize_cleanup',async()=>{
  for(const name of ['unverified','unknown','problem','hash','version','upload','foreignUpload','parts','foreignParts','noSession','blocked']){
   const x=cases[name];assert.equal(await webClaim(x),null,name);assert.equal(Number((await accounting(x)).bytes),3*4194304,name);
   assert.equal((await webStatus(x)).files_remaining,1,name);assert.equal(await fullyDeleted(x.retired),false,name);
  }
  assert.equal((await webStatus(cases.unknown)).needs_attention,1);
  assert.equal((await webStatus(cases.problem)).needs_attention,1);
  assert.equal((await webStatus(cases.blocked)).needs_attention,1);
 });
 let work;
 await check('only_exact_retired_non_primary_web_gets_one_fresh_lease',async()=>{
  const x=cases.happy;work=await webClaim(x);
  assert.equal(work.object_id,x.retired.id);assert.equal(work.object_path,x.retired.object_path);assert.equal(work.try_count,1);
  assert.equal(work.schema_version,1);assert.equal(await webClaim(x),null);
  assert.deepEqual(Object.keys(work).sort(),['schema_version','object_id','work_key','bucket_id','object_path','try_count','lease_until_epoch'].sort());
  assert.equal((await db.query('SELECT count(*)::int n FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.attempt_id=$1 AND o.kind=$2',[x.attempt,'web'])).rows[0].n,1);
 });
 await check('storage_ack_without_observed_absence_rolls_back_and_keeps_reserved_bytes',async()=>{
  await denied(()=>webRecord(cases.happy,work),'55000','publication_retired_web_cleanup_not_observed');
  assert.equal(Number((await accounting(cases.happy)).bytes),3*4194304);
  assert.equal((await db.query('SELECT state FROM listing_publication_private.cleanup WHERE object_id=$1',[work.object_id])).rows[0].state,'in_flight');
 });
 await check('wrong_object_source_active_web_attempt_and_lease_are_refused',async()=>{
  for(const id of [cases.happy.source[0].id,cases.happy.web.find(o=>o.ordinal===0).id,cases.many.retired.id])
   await denied(()=>webRecord(cases.happy,{...work,object_id:id}));
  await denied(()=>webRecord(cases.many,work));
  await denied(()=>webRecord(cases.happy,{...work,work_key:crypto.randomUUID()}));
 });
 await check('verified_absence_releases_exactly_one_web_reservation_and_preserves_active_gallery',async()=>{
  const x=cases.happy;await removeSyntheticMetadata(x.retired);assert.equal((await webRecord(x,work)).state,'deleted');
  assert.equal(await fullyDeleted(x.retired),true);assert.equal(Number((await accounting(x)).bytes),2*4194304);
  assert.deepEqual(await webStatus(x),{schema_version:1,attempt_id:x.attempt,request_key:x.request,files_remaining:0,needs_attention:0,reserved_bytes:0});
  const g=await gallery(x);assert.deepEqual(g.images.map(o=>o.ordinal),[0,2]);
  const changed=await primary(x,g.revision,2);assert.equal(changed.images.find(o=>o.is_primary).ordinal,2);
  assert.equal((await accounting(x)).receipt.files_remaining,0);assert.equal((await accounting(x)).receipt.state,'published');
  for(const o of x.web.filter(o=>o.ordinal!==1))assert.equal((await db.query('SELECT count(*)::int n FROM storage.objects WHERE id=$1',[o.storageId])).rows[0].n,1);
 });
 await check('same_result_replay_does_not_double_release_and_deleted_primary_slot_cannot_reappear',async()=>{
  const x=cases.happy;assert.equal((await webRecord(x,work)).state,'deleted');assert.equal(await webClaim(x),null);
  assert.equal(Number((await accounting(x)).bytes),2*4194304);
  await denied(async()=>primary(x,(await gallery(x)).revision,1),'22023');
 });
 await check('multiple_retired_photos_still_claim_only_one_target_per_call',async()=>{
  const x=cases.many,w=await webClaim(x);assert([x.retired.id,x.secondRetired.id].includes(w.object_id));
  assert.equal((await db.query("SELECT count(*)::int n FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.attempt_id=$1 AND c.state='in_flight'",[x.attempt])).rows[0].n,1);
  assert.equal((await webStatus(x)).files_remaining,2);
 });
 await check('membership_revocation_after_claim_blocks_read_and_record',async()=>{
  const x=cases.business;await db.query('UPDATE public.profiles SET active_identity_id=$2 WHERE id=$1',[actors.member,actors.businessIdentity]);
  const w=await webClaim(x,actors.member);assert.equal(w.object_id,x.retired.id);
  await db.query("UPDATE public.business_members SET status='inactive' WHERE user_id=$1",[actors.member]);
  await denied(()=>webRecord(x,w,'network',actors.member));await denied(()=>webStatus(x,actors.member));
  await db.query("UPDATE public.business_members SET status='active' WHERE user_id=$1",[actors.member]);
  assert.equal((await webRecord(x,w,'network',actors.member)).state,'retry_wait');
  await db.query('UPDATE public.profiles SET active_identity_id=$2 WHERE id=$1',[actors.member,actors.memberIdentity]);
 });
 await check('transport_error_and_unknown_receipt_retain_quota_with_existing_backoff',async()=>{
  for(const [name,error] of [['network','network'],['unknownAck','response']]){
   const x=cases[name],w=await webClaim(x);assert.equal((await webRecord(x,w,error)).state,'retry_wait');
   assert.equal(await webClaim(x),null);assert.equal(Number((await accounting(x)).bytes),3*4194304);
   assert.equal((await webStatus(x)).files_remaining,1);
  }
 });
 await check('expired_lease_reclaims_and_exhaustion_requires_attention',async()=>{
  assert.equal((await webClaim(cases.expired)).try_count,2);assert.equal(await webClaim(cases.exhausted),null);
  assert.equal((await webStatus(cases.exhausted)).needs_attention,1);
 });
 await check('multipart_metadata_appearing_after_claim_prevents_false_completion',async()=>{
  const x=cases.lateMetadata,w=await webClaim(x);await removeSyntheticMetadata(x.retired);await metadata(x.retired,'parts',true);
  await denied(()=>webRecord(x,w),'55000','publication_retired_web_cleanup_not_observed');
  assert.equal(await fullyDeleted(x.retired),false);assert.equal((await webStatus(x)).reserved_bytes,4194304);
 });
 await check('whole_listing_deletion_after_dispatch_preserves_exact_retired_result_lineage',async()=>{
  const x=cases.duringDelete,w=await webClaim(x);await removeSyntheticMetadata(x.retired);await deleteListing(x);
  assert.equal((await webRecord(x,w)).state,'deleted');assert.equal(await claim(x),null);assert.equal(await webClaim(x),null);
  assert.equal((await accounting(x)).receipt.state,'deleting');assert.equal((await accounting(x)).receipt.files_remaining,2);
  assert.equal(Number((await accounting(x)).bytes),2*4194304);assert.equal((await webStatus(x)).files_remaining,0);
 });
 await check('claim_after_whole_deletion_selects_only_prior_retired_web_and_source_fallback_is_null',async()=>{
  const x=cases.afterDelete;await deleteListing(x);assert.equal(await claim(x),null);
  const w=await webClaim(x);assert.equal(w.object_id,x.retired.id);await removeSyntheticMetadata(x.retired);
  assert.equal((await webRecord(x,w)).state,'deleted');assert.equal(await webClaim(x),null);
  assert.equal(Number((await accounting(x)).bytes),2*4194304);
 });
 await check('later_content_removal_and_web_diagnostic_do_not_recharge_completed_web',async()=>{
  const x=cases.happy;await setProblem(x.retired);assert.equal(await fullyDeleted(x.retired),true);
  assert.equal((await webRecord(x,work)).state,'deleted');await deleteListing(x);
  assert.equal((await webRecord(x,work)).state,'deleted');assert.equal(await fullyDeleted(x.retired),true);
  assert.equal(Number((await accounting(x)).bytes),2*4194304);assert.equal((await webStatus(x)).files_remaining,0);
 });
 await check('later_source_diagnostic_or_source_reappearance_cannot_recharge_retired_web',async()=>{
  const x=cases.sourceDiagnostic,w=await webClaim(x);await removeSyntheticMetadata(x.retired);await webRecord(x,w);
  const source=x.source.find(o=>o.slot_id===x.retired.slot_id);await setProblem(source);
  assert.equal(await fullyDeleted(x.retired),true);assert.equal((await webStatus(x)).files_remaining,0);
  await db.query('INSERT INTO storage.objects(id,bucket_id,name,version) VALUES($1,$2,$3,$4)',[source.storageId,source.bucket_id,source.object_path,source.version]);
  assert.equal(await fullyDeleted(x.retired),true);assert.equal((await webStatus(x)).files_remaining,0);
  assert.equal(Number((await accounting(x)).bytes),25*1024*1024+2*4194304);
 });
 await check('diagnostic_before_first_completion_keeps_retired_reservation',async()=>{
  const x=cases.firstProblem,w=await webClaim(x);await removeSyntheticMetadata(x.retired);await setProblem(x.retired);
  await denied(()=>webRecord(x,w),'55000','publication_retired_web_cleanup_not_observed');
  assert.equal(await fullyDeleted(x.retired),false);assert.equal((await webStatus(x)).needs_attention,1);
 });
 await check('status_and_existing_owner_management_do_not_depend_on_strict_gallery',async()=>{
  const x=cases.brokenGallery,source=x.source.find(o=>o.slot_id===x.retired.slot_id);
  await db.query('INSERT INTO storage.objects(id,bucket_id,name,version) VALUES($1,$2,$3,$4)',[source.storageId,source.bucket_id,source.object_path,source.version]);
  await denied(()=>webClaim(x),'55000');assert.equal((await webStatus(x)).files_remaining,1);
  const owner=(await asActor(x.author,'SELECT public.get_my_managed_listing_v2($1,$2,$3) value',[x.author,x.identity,String(x.id)])).rows[0].value;
  assert(owner);assert.equal((await db.query('SELECT try_count FROM listing_publication_private.cleanup WHERE object_id=$1',[x.retired.id])).rows[0].try_count,0);
 });
 await check('no_auxiliary_receipt_fabrication_and_generic_cleanup_mode_remains_held',async()=>{
  assert.equal((await db.query('SELECT count(*)::int n FROM listing_publication_private.multipart_auxiliary_receipts')).rows[0].n,0);
  await denied(()=>db.query(`INSERT INTO listing_publication_private.multipart_auxiliary_receipts(session_id,run_id,storage_instance_id,
   process_exit_observed_at,process_exit_evidence_sha256,volume_scan_evidence_sha256) VALUES($1,$2,'synthetic',clock_timestamp(),repeat('a',64),repeat('a',64))`,
   [cases.happy.retired.session,crypto.randomUUID()]),'55000','publication_hosted_terminal_cleanup_unavailable');
  const r=(await asRole('service_role','SELECT public.get_selqiro_hosted_preview_readiness_v1($1,$2,$3,$4) value',
   ['vyjletlmwoiwxsnsunlm','listing-publication-hosted-preview-v1','2d088814-0900-448a-a9d1-7b05470cb1d2',actors.owner])).rows[0].value;
  assert.equal(r.cleanup_mode,'held');
 });
 result.passed=true;result.source_provenance=provenance;result.changes_sha256=crypto.createHash('sha256').update(read('changes.sql')).digest('hex');
 console.log(JSON.stringify({passed:true,checks:checks.length}));
}catch(e){result.passed=false;console.error(JSON.stringify({message:e.message,code:e.code,where:e.where,stack:e.stack}));process.exitCode=1;}
finally{fs.writeFileSync(path.join(here,'runtime-result.json'),JSON.stringify(result,null,2)+'\n');await db.close();}
