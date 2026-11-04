// Focused PostgreSQL/WASM fixture. Synthetic metadata is never provider evidence.
// Reuse the accepted fixture's exact retained declarations, RLS and actor setup;
// extend only the cleanup dependencies. No old test suite is executed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as base from '../../20261101_listing_primary_image/tests/fixture.mjs';
export const { db, actors, asActor, asRole, withActorContext, fn }=base;
export const root=base.root;
export const here=path.dirname(fileURLToPath(import.meta.url));
export const repair=path.dirname(here);
export const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
export const provenance=[...base.provenance];
const pins=JSON.parse(read('source-pins.json'));
function source(relative){
 const bytes=fs.readFileSync(path.join(root,relative));
 const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 assert.equal(sha256,pins.inputs[relative],'retained source changed: '+relative);
 provenance.push({path:relative,sha256});return bytes.toString('utf8');
}
const core=source('supabase/releases/listing-publication-hosted-preview-v1/20_publication_core.sql');
const multi=source('supabase/releases/listing-publication-hosted-preview-v1/30_multipart_and_journey.sql');
const assembled=source('supabase/releases/listing-publication-hosted-preview-v1/release.sql');
const primary=source('supabase/repairs/20261101_listing_primary_image/changes.sql');
source('supabase/repairs/20261101_listing_primary_image/tests/fixture.mjs');
export const previousPreflight=source('supabase/repairs/20261101_listing_primary_image/preflight.sql');
function declaration(sql,kind,name){
 const prefix='CREATE '+kind+' '+name;
 const start=sql.indexOf(prefix);assert(start>=0,prefix);
 const end=kind==='TABLE'?sql.indexOf('\n);',start)+3:sql.indexOf(';',start)+1;
 return sql.slice(start,end);
}
const privateTables=['upload_grants','web_write_completions','write_settlements','source_no_release',
 'source_release_tracking','source_recorded_no_release'];
const problemConstraintStart=multi.indexOf('ALTER TABLE listing_publication_private.multipart_sessions DROP CONSTRAINT multipart_sessions_problem_check;');
const problemConstraintEnd=multi.indexOf('CREATE OR REPLACE FUNCTION public.record_listing_multipart_problem_v2',problemConstraintStart);
assert(problemConstraintStart>0&&problemConstraintEnd>problemConstraintStart);
export const extraFunctions=[
 [core,'listing_publication_private.require_upload_service'],
 [core,'listing_publication_private.lock_upload_service_actor'],
 [multi,'listing_publication_private.lock_multipart_cleanup_context'],
 [multi,'listing_publication_private.legacy_cleanup_state_before_multipart_v2'],
 [multi,'listing_publication_private.object_cleanup_state'],
 [multi,'listing_publication_private.protect_cleanup'],
 [multi,'listing_publication_private.protect_multipart_attempt'],
 [multi,'listing_publication_private.protect_multipart_session'],
 [multi,'listing_publication_private.protect_multipart_auxiliary'],
 [multi,'listing_publication_private.protect_multipart_abort'],
 [multi,'listing_publication_private.guard_legacy_source_in_multipart'],
 [core,'public.claim_listing_cleanup_v1'],
 [core,'public.record_listing_cleanup_v1'],
 [multi,'public.claim_listing_cleanup_for_attempt_v2'],
 [multi,'public.get_my_listing_cleanup_summary_v1']
];
for(const [sql,name] of extraFunctions)assert.equal(fn(sql,name),fn(assembled,name),'stale declaration: '+name);
export const dependencyNames=[...base.dependencyNames,...extraFunctions.map(([,n])=>n),
 'listing_publication_private.multipart_object_fully_deleted'];
export const originalPublicWriterPolicies=base.originalPublicWriterPolicies;
await db.exec(`
 CREATE TABLE storage.s3_multipart_uploads(id text PRIMARY KEY,bucket_id text,key text,version text);
 CREATE TABLE storage.s3_multipart_uploads_parts(upload_id text,bucket_id text,key text,version text,
  part_number integer,etag text,size bigint,created_at timestamptz);
 ${privateTables.map(n=>declaration(core,'TABLE','listing_publication_private.'+n)).join('\n')}
 ${declaration(multi,'TABLE','listing_publication_private.multipart_abort_observations')}
 ${multi.slice(problemConstraintStart,problemConstraintEnd)}
 ${declaration(multi,'VIEW','listing_publication_private.hosted_s3_multipart_uploads ')}
 ${declaration(multi,'VIEW','listing_publication_private.hosted_s3_multipart_uploads_parts ')}
 ${[...privateTables,'multipart_abort_observations'].map(n=>`
  ALTER TABLE listing_publication_private.${n} ENABLE ROW LEVEL SECURITY;
  ALTER TABLE listing_publication_private.${n} FORCE ROW LEVEL SECURITY;
  REVOKE ALL ON listing_publication_private.${n} FROM PUBLIC,anon,authenticated,service_role;
  GRANT SELECT ON listing_publication_private.${n} TO selqiro_listing_final_writer_v1;
  CREATE POLICY fixture_read_dependency ON listing_publication_private.${n} FOR SELECT TO selqiro_listing_final_writer_v1 USING(true);`).join('\n')}
 GRANT SELECT ON listing_publication_private.hosted_s3_multipart_uploads,
  listing_publication_private.hosted_s3_multipart_uploads_parts TO selqiro_listing_final_writer_v1;
 ${extraFunctions.map(([sql,n])=>fn(sql,n)).join('\n')}
 REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
 GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA listing_publication_private TO selqiro_listing_final_writer_v1;
 GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
 ALTER FUNCTION public.claim_listing_cleanup_v1() OWNER TO selqiro_listing_final_writer_v1;
 ALTER FUNCTION public.record_listing_cleanup_v1(uuid,uuid,text) OWNER TO selqiro_listing_final_writer_v1;
 ALTER FUNCTION public.claim_listing_cleanup_for_attempt_v2(uuid,uuid,uuid,uuid) OWNER TO selqiro_listing_final_writer_v1;
 REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
 REVOKE ALL ON FUNCTION public.claim_listing_cleanup_v1(),public.record_listing_cleanup_v1(uuid,uuid,text)
  FROM PUBLIC,anon,authenticated,service_role;
 REVOKE ALL ON FUNCTION public.claim_listing_cleanup_for_attempt_v2(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
 ${primary}
`);
// Initial conditions use synthetic rows before installing the remaining exact
// triggers. Runtime tests run with all these protections active and never disable
// them. Synthetic Storage rows simulate observed metadata, not actual API IO.
let sealed=false;
export async function seedCompletedListing(id,options={}){
 assert(!sealed,'seed before sealing the synthetic fixture');
 const value=await base.seedListing(id,{count:1,...options});
 await db.query('INSERT INTO listing_publication_private.multipart_attempts(attempt_id) VALUES($1)',[value.attempt]);
 const objects=(await db.query('SELECT * FROM listing_publication_private.objects WHERE attempt_id=$1 ORDER BY kind',[value.attempt])).rows;
 for(const o of objects){
  const sid=crypto.randomUUID(), storageId=crypto.randomUUID(), version=crypto.randomUUID(), upload='synthetic-'+crypto.randomUUID();
  await db.query(`INSERT INTO listing_publication_private.multipart_sessions(id,object_id,request_key,state,upload_id,
   storage_version,create_received_at,part_key,part_sign_epoch,complete_key,part_etag,complete_etag,
   storage_object_id,completed_at,observed_sha256,observed_bytes,verified_at)
   VALUES($1,$2,$3,'completed',$4,$5,clock_timestamp(),$6,1,$7,'part-etag','complete-etag',
    $8,clock_timestamp(),$9,100,clock_timestamp())`,
   [sid,o.id,crypto.randomUUID(),upload,version,crypto.randomUUID(),crypto.randomUUID(),storageId,o.kind==='source'?'b'.repeat(64):'c'.repeat(64)]);
  await db.query('INSERT INTO storage.objects(id,bucket_id,name,version) VALUES($1,$2,$3,$4)',[storageId,o.bucket_id,o.object_path,version]);
  (value[o.kind]??=[]).push({...o,session:sid,storageId,version,upload});
 }
 await db.query("UPDATE listing_publication_private.cleanup c SET state='pending' FROM listing_publication_private.objects o WHERE o.id=c.object_id AND o.attempt_id=$1",[value.attempt]);
 value.request=(await db.query('SELECT request_key FROM listing_publication_private.attempts WHERE id=$1',[value.attempt])).rows[0].request_key;
 return value;
}
export async function seal(){
 assert(!sealed);sealed=true;
 const triggers=['protect_cleanup'];
 await db.exec(triggers.map(n=>declaration(core,'TRIGGER',n)).join('\n')+'\n'+
  ['protect_multipart_attempt','protect_multipart_attempt_truncate','protect_multipart_session','protect_multipart_session_truncate',
   'protect_multipart_auxiliary','protect_multipart_auxiliary_truncate','protect_multipart_abort','protect_multipart_abort_truncate',
   'guard_legacy_source_in_multipart'].map(n=>declaration(multi,'TRIGGER',n)).join('\n'));
}
export const claimSql='SELECT public.claim_listing_published_source_cleanup_v1($1,$2,$3,$4) value';
export const recordSql='SELECT public.record_listing_published_source_cleanup_v1($1,$2,$3,$4,$5,$6,$7) value';
export async function claim(item,user=item.author,identity=item.identity,request=item.request){
 return (await asRole('service_role',claimSql,[user,identity,item.attempt,request])).rows[0].value;
}
export async function record(item,work,result='deleted',user=item.author,identity=item.identity){
 return (await asRole('service_role',recordSql,[user,identity,item.attempt,item.request,work.object_id,work.work_key,result])).rows[0].value;
}
export async function removeSyntheticMetadata(o){
 await db.query('DELETE FROM storage.objects WHERE id=$1',[o.storageId]);
}
export async function accounting(item){
 return (await db.query(`SELECT listing_publication_private.final_receipt($1) receipt,
  coalesce(sum(reserved_bytes) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(id)),0)::bigint bytes
  FROM listing_publication_private.objects WHERE attempt_id=$1`,[item.attempt])).rows[0];
}
