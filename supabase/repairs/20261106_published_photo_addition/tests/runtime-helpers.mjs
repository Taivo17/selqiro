import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {db,asActor,asRole,claim,record,gallery} from './fixture.mjs';
const sql=(name,args)=>'SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') value';
export const call=async(user,name,args)=>(await asActor(user,sql(name,args),args)).rows[0].value;
export const service=async(name,args)=>(await asRole('service_role',sql(name,args),args)).rows[0].value;
export const image=()=>({client_file_id:crypto.randomUUID(),byte_length:100,sha256:'b'.repeat(64)});
export const key=(item,request,user=item.author)=>[user,item.identity,item.id,item.attempt,request];
export const prepare=(item,request,revision,descriptor=image(),user=item.author)=>call(user,
 'prepare_my_managed_listing_image_addition_v1',[...key(item,request,user),revision,descriptor]);
export const status=(item,request,user=item.author)=>call(user,'get_my_managed_listing_image_addition_v1',key(item,request,user));
export const cancel=(item,request,user=item.author)=>call(user,'cancel_my_managed_listing_image_addition_v1',key(item,request,user));
export const append=(item,request,child,ready,revision,user=item.author)=>call(user,
 'append_my_managed_listing_image_v1',[...key(item,request,user),child,ready,revision]);
export async function denied(operation,code,message){
 let error;try{await operation();}catch(value){error=value;}
 assert.equal(error?.code,code,error?.message??'operation unexpectedly succeeded');
 if(message)assert.equal(error.message,message);return error;
}
// Simulate only authoritative provider metadata observations. All attempt,
// upload, completion, verifier and WEB-ready transitions use retained RPCs.
export async function completeObject(snapshot,uploadRequest,kind){
 const slot=snapshot.slots[0],context=[snapshot.actor_user_id,snapshot.identity_id,snapshot.attempt_id,slot.slot_id,uploadRequest];
 const start=await service('reserve_listing_multipart_v2',[...context,kind]);assert(start.create_allowed);
 const binding=start.session,upload='synthetic-'+crypto.randomUUID(),version=crypto.randomUUID(),storageId=crypto.randomUUID();
 await db.query('INSERT INTO storage.s3_multipart_uploads VALUES($1,$2,$3,$4)',[upload,binding.bucket_id,binding.object_path,version]);
 await service('record_listing_multipart_created_v2',[binding.object_id,start.create_key,upload]);
 const part=await service('claim_listing_multipart_part_v2',[...context,kind]);assert(part.part_allowed);
 await db.query('INSERT INTO storage.s3_multipart_uploads_parts VALUES($1,$2,$3,$4,1,$5,0,clock_timestamp())',
  [upload,binding.bucket_id,binding.object_path,version,'synthetic-part-etag']);
 const complete=await service('claim_listing_multipart_complete_v2',[...context,kind,'synthetic-part-etag']);assert(complete.complete_allowed);
 await db.query('INSERT INTO storage.objects VALUES($1,$2,$3,$4)',[storageId,binding.bucket_id,binding.object_path,version]);
 await db.query('DELETE FROM storage.s3_multipart_uploads_parts WHERE upload_id=$1',[upload]);
 await db.query('DELETE FROM storage.s3_multipart_uploads WHERE id=$1',[upload]);
 await service('record_listing_multipart_completed_v2',[binding.object_id,complete.session.complete_key,'synthetic-complete-etag']);
 const hash=kind==='source'?slot.expected_sha256:'c'.repeat(64);
 await service('record_listing_multipart_verified_v2',[...context,kind,hash,100]);
 return {id:binding.object_id,slot_id:slot.slot_id,attempt_id:snapshot.attempt_id,bucket_id:binding.bucket_id,
  object_path:binding.object_path,storageId,version,upload,ordinal:0};
}
export async function readyImage(snapshot){
 const uploadRequest=crypto.randomUUID(),context=[snapshot.actor_user_id,snapshot.identity_id,snapshot.attempt_id,snapshot.slots[0].slot_id];
 const source=await completeObject(snapshot,uploadRequest,'source');
 const claim=await service('claim_listing_web_image_v1',[...context,uploadRequest]);assert(claim.process_allowed);
 const intent={pipeline_version:'listing-web-v1',content_type:'image/webp',source_sha256:snapshot.slots[0].expected_sha256,
  source_bytes:100,source_format:'jpeg',web_sha256:'c'.repeat(64),web_bytes:100,width:200,height:100,
  sharp_version:'0.34.3',libvips_version:'8.17.1'};
 const write=await service('prepare_listing_web_write_v1',[...context,claim.binding.job_id,claim.claim_id,intent]);assert(write.write_allowed);
 const web=await completeObject(snapshot,uploadRequest,'web');
 const result=await service('record_listing_web_ready_v1',[...context,claim.binding.job_id,intent.web_sha256,100]);
 return {ready:result.receipt.receipt_id,receipt:result.receipt,source,web,uploadRequest};
}
export async function familyReceipt(item){return (await db.query('SELECT listing_publication_private.final_receipt($1) value',[item.attempt])).rows[0].value;}
export async function setIdentity(user,identity){await db.query('UPDATE public.profiles SET active_identity_id=$2 WHERE id=$1',[user,identity]);}
export async function add(item,user=item.author) {
 const revision=(await gallery(item,user)).revision,request=crypto.randomUUID();
 const prepared=await prepare(item,request,revision,image(),user),verified=await readyImage(prepared.snapshot);
 const attached=await append(item,request,prepared.snapshot.attempt_id,verified.ready,revision,user);
 return {request,prepared,verified,attached};
}
export async function settleSources(item,user=item.author) {
 const tasks=[];
 for(let n=0;n<40;n++) {
  const task=await claim(item,user);if(task===null)return tasks;
  if(task.schema_version===2) {
   assert.equal(task.attempt_id,item.attempt);assert.equal(task.request_key,item.request);
   assert(task.object_path.startsWith('v1/'+task.origin_attempt_id+'/'));
  } else {assert.equal(task.schema_version,1);assert(task.object_path.startsWith('v1/'+item.attempt+'/'));}
  await db.query('DELETE FROM storage.objects WHERE bucket_id=$1 AND name=$2',[task.bucket_id,task.object_path]);
  await record(item,task,'deleted',user);tasks.push(task);
 }
 throw Error('source cleanup did not settle within the focused test bound');
}
export const deleteParent=(item,user=item.author)=>call(user,'delete_my_published_listing_v1',[user,item.identity,String(item.id)]);
export const bytesFor=async attempt=>(await db.query(`SELECT coalesce(sum(reserved_bytes),0)::integer value
 FROM listing_publication_private.objects WHERE attempt_id=$1
 AND NOT listing_publication_private.multipart_object_fully_deleted(id)`,[attempt])).rows[0].value;
// Private terminal cleanup remains closed in Production. This fixture-only
// wrapper lets tests exercise its SQL without granting any production RPC.
export async function terminalSnapshot(item) {
 await db.exec(`CREATE OR REPLACE FUNCTION listing_publication_private.fixture_terminal_snapshot(uuid,uuid,uuid,uuid)
 RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS
 $$ SELECT public.prepare_listing_multipart_cleanup_v2($1,$2,$3,$4) $$;
 GRANT EXECUTE ON FUNCTION listing_publication_private.fixture_terminal_snapshot(uuid,uuid,uuid,uuid) TO service_role;
 GRANT USAGE ON SCHEMA listing_publication_private TO service_role;`);
 try{return (await asRole('service_role','SELECT listing_publication_private.fixture_terminal_snapshot($1,$2,$3,$4) value',
  [item.author,item.identity,item.attempt,item.request])).rows[0].value;}
 finally{await db.exec(`REVOKE USAGE ON SCHEMA listing_publication_private FROM service_role;
  DROP FUNCTION listing_publication_private.fixture_terminal_snapshot(uuid,uuid,uuid,uuid)`);}
}
