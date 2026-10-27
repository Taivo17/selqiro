-- Narrow browser authority for the SAME integrated disposable multipart flow.
-- A presigned URL signed with global S3 admin credentials is too broad: unsigned
-- headers can change S3 operation routing. Browser grants therefore use the user's
-- existing Auth JWT (S3 session token) and these operation-aware RLS checks.
-- No JWT is minted here and no elevated S3 credential goes to the browser.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres'
  OR current_setting('selqiro.integration_scope',true) IS DISTINCT FROM 'disposable-v2' THEN
  RAISE EXCEPTION 'publication_disposable_integration_required'; END IF;
END $gate$;
CREATE OR REPLACE FUNCTION storage.listing_source_part_allowed_v2(p_bucket text,p_path text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; query_fields text[]; request_headers jsonb;
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'authenticated' OR auth.uid() IS NULL
  OR p_bucket IS DISTINCT FROM 'listing-publication-private'
  OR NOT coalesce(storage.allow_only_operation('storage.s3.upload.part'),false)
  OR current_setting('request.method',true) IS DISTINCT FROM 'PUT'
  OR split_part(coalesce(current_setting('request.path',true),''),'?',1) IS DISTINCT FROM '/s3/'||p_bucket||'/'||p_path THEN RETURN false; END IF;
 query_fields:=string_to_array(split_part(current_setting('request.path',true),'?',2),'&');
 request_headers:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
 IF NOT coalesce('partNumber=1'=ANY(query_fields),false)
  OR (SELECT count(*) FROM unnest(query_fields) f WHERE f LIKE 'partNumber=%')<>1
  OR (SELECT count(*) FROM unnest(query_fields) f WHERE f LIKE 'uploadId=%')<>1 THEN RETURN false; END IF;
 SELECT x.* INTO a FROM listing_publication_private.attempts x
 JOIN listing_publication_private.objects o ON o.attempt_id=x.id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 WHERE x.actor_user_id=auth.uid() AND o.bucket_id=p_bucket AND o.object_path=p_path AND o.kind='source'
  AND o.dispatch_key IS NULL AND m.state='open' AND m.problem IS NULL AND m.part_key IS NOT NULL;
 IF NOT FOUND THEN RETURN false; END IF;
 -- Same actor/identity/attempt/policy lock order as issuing the grant and Complete.
 -- This is an admission check. It does not pretend to cancel an already streaming part.
 BEGIN
  PERFORM listing_publication_private.lock_multipart_context(a.actor_user_id,a.identity_id,a.id,false);
 EXCEPTION WHEN SQLSTATE '42501' OR SQLSTATE '55000' OR SQLSTATE 'P0002' THEN
  -- An ordinary closed/changed authority is an RLS denial, not a Storage 500.
  RETURN false;
 END;
 RETURN EXISTS(SELECT 1 FROM listing_publication_private.objects o
  JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
  JOIN listing_publication_private.slots s ON s.id=o.slot_id
  WHERE o.attempt_id=a.id AND o.bucket_id=p_bucket AND o.object_path=p_path AND o.kind='source'
   AND o.dispatch_key IS NULL AND m.state='open' AND m.problem IS NULL AND m.part_key IS NOT NULL
   AND m.part_sign_epoch+600>floor(extract(epoch FROM clock_timestamp()))::bigint
   -- This isolated pin uses the file backend's UUID uploadId. No unsupported URL
   -- decoding assumption is generalized to an opaque hosted backend uploadId.
   AND m.upload_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND ('uploadId='||m.upload_id)=ANY(query_fields)
   AND request_headers->>'content-length'=s.expected_source_bytes::text
   AND NOT request_headers ? 'x-amz-decoded-content-length');
END $f$;
REVOKE ALL ON FUNCTION storage.listing_source_part_allowed_v2(text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT CREATE ON SCHEMA storage TO selqiro_listing_final_writer_v1;
ALTER FUNCTION storage.listing_source_part_allowed_v2(text,text) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA storage FROM selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION storage.listing_source_part_allowed_v2(text,text) TO authenticated,anon;
GRANT EXECUTE ON FUNCTION storage.operation(),storage.allow_only_operation(text) TO selqiro_listing_final_writer_v1;
-- Restrictive AND prevents any other permissive policy from admitting a different
-- operation on this managed bucket. Other buckets keep their existing policies.
CREATE POLICY listing_multipart_operation_fence ON storage.objects AS RESTRICTIVE
 FOR ALL TO authenticated,anon
 USING(bucket_id<>'listing-publication-private' OR storage.listing_source_part_allowed_v2(bucket_id,name))
 WITH CHECK(bucket_id<>'listing-publication-private' OR storage.listing_source_part_allowed_v2(bucket_id,name));
CREATE POLICY listing_multipart_source_part ON storage.objects FOR ALL TO authenticated
 USING(bucket_id='listing-publication-private' AND storage.listing_source_part_allowed_v2(bucket_id,name))
 WITH CHECK(bucket_id='listing-publication-private' AND storage.listing_source_part_allowed_v2(bucket_id,name));

-- The initial core fixture exposes historical declarations for integration; this
-- overlay closes the old capability-issuance API surface explicitly. Domain locks
-- also prevent any legacy dispatch on an attempt already using multipart.
DO $close_legacy$ DECLARE f regprocedure; BEGIN
 FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(ARRAY['reserve_my_listing_upload_v1','get_my_listing_upload_grant_v1',
  'claim_listing_upload_sign_v1','record_listing_upload_grant_v1','confirm_listing_upload_release_v1',
  'record_listing_web_write_completed_v1']) LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f);
 END LOOP;
END $close_legacy$;
COMMENT ON FUNCTION storage.listing_source_part_allowed_v2(text,text) IS
 'Browser Auth-JWT S3 admission only: exact open granted SOURCE + current actor/identity/policy + storage.s3.upload.part. No Create/Complete/Abort/copy/full-object upload/read authority; no in-flight drain claim.';
