// Historical starting state only, in a fresh disposable database. Like the
// retained seed fixture this creates synthetic prior receipts before sealing
// the remaining exact mutation guards. It never disables a trigger, edits an
// existing protected receipt, or performs real Storage/network operations.
const started=performance.now();
const legacy=process.argv[2]==='legacy_published_source_receipt_preserved';
const trace=stage=>{if(process.env.SELQIRO_CAPACITY_TIMING_TRACE==='1')console.error(JSON.stringify({stage,elapsed_ms:Math.round(performance.now()-started)}));};
const inherited=process.env.SELQIRO_PGLITE_MODULE;
process.env.SELQIRO_HORSE_PGLITE_BACKEND=inherited||'@electric-sql/pglite';
process.env.SELQIRO_PGLITE_MODULE=new URL('../../20261108_horse_publication/tests/provider-pglite.mjs',import.meta.url).href;
const base=await import('../../20261106_published_photo_addition/tests/fixture.mjs');
trace('retained_baseline_loaded');
if(inherited===undefined)delete process.env.SELQIRO_PGLITE_MODULE;else process.env.SELQIRO_PGLITE_MODULE=inherited;
await base.db.exec(`
 CREATE TEMP TABLE capacity_history AS SELECT n,gen_random_uuid() attempt,gen_random_uuid() slot,
  gen_random_uuid() source,gen_random_uuid() web,gen_random_uuid() source_storage,gen_random_uuid() web_storage,
  gen_random_uuid() source_version,gen_random_uuid() web_version,
  clock_timestamp()-interval '2 days' created FROM generate_series(1,${legacy?1:300}) n;
 INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,status,image)
 SELECT 10000+n,'${base.actors.owner}','${base.actors.ownerIdentity}','${base.actors.owner}',
  'Synthetic historical listing','active','/api/v2/listing-media/'||attempt::text||'/0' FROM capacity_history;
 INSERT INTO listing_publication_private.attempts(id,actor_user_id,identity_id,request_key,intent_sha256,
  payload,policy_snapshot,state,created_at,expires_at,closed_at)
 SELECT attempt,'${base.actors.owner}','${base.actors.ownerIdentity}',gen_random_uuid(),decode(repeat('a',64),'hex'),
  NULL,'[{}]','published',created,created+interval '24 hours',created FROM capacity_history;
 INSERT INTO listing_publication_private.slots(id,attempt_id,ordinal,client_file_id,expected_source_bytes,expected_source_sha256)
 SELECT slot,attempt,0,gen_random_uuid(),100,decode(repeat('b',64),'hex') FROM capacity_history;
 INSERT INTO listing_publication_private.objects(id,attempt_id,slot_id,kind,bucket_id,object_path,reserved_bytes)
 SELECT source,attempt,slot,'source','listing-publication-private','v1/'||attempt::text||'/'||slot::text||'/source.upload',26214400 FROM capacity_history
 UNION ALL SELECT web,attempt,slot,'web','listing-publication-private','v1/'||attempt::text||'/'||slot::text||'/web-v1.webp',4194304 FROM capacity_history;
 INSERT INTO listing_publication_private.web_images(attempt_id,slot_id,request_key,claimed_at,process_before_epoch,
  state,intent,prepared_at,write_before_epoch,ready_id,ready_at)
 SELECT attempt,slot,gen_random_uuid(),created,floor(extract(epoch FROM created))::bigint+120,'ready',
  jsonb_build_object('pipeline_version','listing-web-v1','content_type','image/webp','source_sha256',repeat('b',64),
   'source_bytes',100,'source_format','jpeg','web_sha256',repeat('c',64),'web_bytes',100,'width',200,'height',100,
   'sharp_version','0.34.3','libvips_version','8.17.1'),created,
  floor(extract(epoch FROM created))::bigint+30,gen_random_uuid(),created FROM capacity_history;
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at,
  work_key,lease_until,try_count,deleted_at)
 SELECT source,'listing-publication-private','v1/'||attempt::text||'/'||slot::text||'/source.upload',
  'published_source','deleted',created,gen_random_uuid(),created+interval '60 seconds',1,created+interval '1 second' FROM capacity_history;
 INSERT INTO public.listing_images(listing_id,user_id,original_url,medium_url,thumb_url,sort_order,is_primary)
 SELECT 10000+n,'${base.actors.owner}','/api/v2/listing-media/'||attempt::text||'/0',
  '/api/v2/listing-media/'||attempt::text||'/0','/api/v2/listing-media/'||attempt::text||'/0',0,true FROM capacity_history;
 INSERT INTO listing_publication_private.publications(attempt_id,listing_id,confirmation_sha256,published_at,state)
 SELECT attempt,10000+n,repeat('d',64),created,'published' FROM capacity_history;
 INSERT INTO listing_publication_private.multipart_attempts(attempt_id) SELECT attempt FROM capacity_history;
 INSERT INTO listing_publication_private.multipart_sessions(id,object_id,request_key,state,upload_id,storage_version,
  create_received_at,part_key,part_sign_epoch,complete_key,part_etag,complete_etag,storage_object_id,
  completed_at,observed_sha256,observed_bytes,verified_at)
 SELECT gen_random_uuid(),source,gen_random_uuid(),'completed','synthetic-source-'||source::text,source_version::text,
  created,gen_random_uuid(),1,gen_random_uuid(),'synthetic-part','synthetic-complete',source_storage,created,repeat('b',64),100,created FROM capacity_history WHERE ${legacy?'false':'true'}
 UNION ALL SELECT gen_random_uuid(),web,gen_random_uuid(),'completed','synthetic-web-'||web::text,web_version::text,
  created,gen_random_uuid(),1,gen_random_uuid(),'synthetic-part','synthetic-complete',web_storage,created,repeat('c',64),100,created FROM capacity_history;
 INSERT INTO storage.objects(id,bucket_id,name,version)
 SELECT web_storage,'listing-publication-private','v1/'||attempt::text||'/'||slot::text||'/web-v1.webp',web_version::text FROM capacity_history;
 DROP TABLE capacity_history;
`);
trace('historical_rows_seeded');
const current=await import('./fixture.mjs');
trace('capacity_fixture_sealed');
export const {db,actors,asActor,asRole,call,service,prepare,publish,content,newImage,readyImage,denied,setIdentity}=current;
