-- Hosted SOURCE UploadPart admission. Run only inside the reviewed additive
-- release transaction, after its private ledgers and before final API grants.
-- This creates no Storage namespace functions, table triggers, buckets or rows.
-- The provider-supported policy management channel must authorize the two
-- bucket-scoped policies below; lack of that permission aborts the transaction.
DO $storage_preconditions$ BEGIN
 IF current_user <> 'postgres'
  OR NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_preview_settings
    WHERE singleton AND release_id='listing-publication-hosted-preview-v1'
      AND NOT enabled AND NOT release_ready)
  OR to_regprocedure('storage.allow_only_operation(text)') IS NULL
  OR to_regprocedure('public.listing_actor_uid_hosted_v1()') IS NULL
  OR to_regprocedure('listing_publication_private.assert_hosted_preview_actor(uuid)') IS NULL
  OR NOT has_function_privilege('selqiro_listing_final_writer_v1',
    'public.listing_actor_uid_hosted_v1()','EXECUTE')
  OR NOT has_function_privilege('selqiro_listing_final_writer_v1',
    'storage.allow_only_operation(text)','EXECUTE') THEN
  RAISE EXCEPTION 'hosted_storage_authority_prerequisite' USING ERRCODE='55000';
 END IF;
END $storage_preconditions$;

-- Encode the exact provider-issued opaque ID; never interpret it as a UUID,
-- path or pre-encoded query value. UTF-8 octets outside RFC3986 unreserved ASCII
-- become uppercase percent escapes, matching the AWS SDK signer.
CREATE FUNCTION listing_publication_private.hosted_s3_query_value_v1(p_value text)
RETURNS text LANGUAGE plpgsql IMMUTABLE STRICT
SET search_path=pg_catalog,pg_temp AS $f$
DECLARE bytes bytea:=convert_to(p_value,'UTF8'); i integer; b integer; encoded text:='';
BEGIN
 IF octet_length(bytes)>2048 THEN
  RAISE EXCEPTION 'hosted_upload_id_length' USING ERRCODE='22023';
 END IF;
 FOR i IN 0..octet_length(bytes)-1 LOOP
  b:=get_byte(bytes,i);
  IF (b BETWEEN 65 AND 90) OR (b BETWEEN 97 AND 122) OR (b BETWEEN 48 AND 57)
    OR b IN(45,46,95,126) THEN
   encoded:=encoded||chr(b);
  ELSE
   encoded:=encoded||'%'||upper(lpad(to_hex(b),2,'0'));
  END IF;
 END LOOP;
 RETURN encoded;
END $f$;
REVOKE ALL ON FUNCTION listing_publication_private.hosted_s3_query_value_v1(text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.hosted_s3_query_value_v1(text)
 TO selqiro_listing_final_writer_v1;

CREATE FUNCTION public.listing_source_part_allowed_hosted_v1(p_bucket text,p_path text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; request_path text;
 query_fields text[]; request_headers jsonb;
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'authenticated' OR public.listing_actor_uid_hosted_v1() IS NULL
  OR p_bucket IS DISTINCT FROM 'listing-publication-private'
  OR NOT coalesce(storage.allow_only_operation('storage.s3.upload.part'),false)
  OR current_setting('request.method',true) IS DISTINCT FROM 'PUT' THEN RETURN false; END IF;

 -- Supabase's S3 router supplies request.url as request.path. A different live
 -- gateway shape fails closed; no suffix/path-normalization fallback is allowed.
 request_path:=coalesce(current_setting('request.path',true),'');
 IF split_part(request_path,'?',1) IS DISTINCT FROM '/s3/'||p_bucket||'/'||p_path
  OR strpos(request_path,'?')=0 THEN RETURN false; END IF;
 query_fields:=string_to_array(substr(request_path,strpos(request_path,'?')+1),'&');
 -- Parse only raw parameter names. Reject encoded names, empty fields and even
 -- case-folded duplicate names, instead of disagreeing with the provider parser.
 IF cardinality(query_fields)>32 OR cardinality(query_fields)<2
  OR EXISTS(SELECT 1 FROM unnest(query_fields) f
    WHERE strpos(f,'=')=0 OR split_part(f,'=',1)!~'^[A-Za-z0-9_-]+$')
  OR (SELECT count(DISTINCT lower(split_part(f,'=',1))) FROM unnest(query_fields) f)
    <>cardinality(query_fields)
  OR NOT coalesce('partNumber=1'=ANY(query_fields),false)
  OR (SELECT count(*) FROM unnest(query_fields) f WHERE split_part(f,'=',1)='partNumber')<>1
  OR (SELECT count(*) FROM unnest(query_fields) f WHERE split_part(f,'=',1)='uploadId')<>1
  THEN RETURN false; END IF;
 BEGIN
  request_headers:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
 EXCEPTION WHEN invalid_text_representation THEN RETURN false;
 END;
 IF jsonb_typeof(request_headers) IS DISTINCT FROM 'object' THEN RETURN false; END IF;

 BEGIN
  PERFORM listing_publication_private.assert_hosted_preview_actor(public.listing_actor_uid_hosted_v1());
 EXCEPTION WHEN SQLSTATE '42501' OR SQLSTATE '55000' OR SQLSTATE 'P0002' THEN RETURN false;
 END;
 SELECT x.* INTO a FROM listing_publication_private.attempts x
 JOIN listing_publication_private.objects o ON o.attempt_id=x.id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 WHERE x.actor_user_id=public.listing_actor_uid_hosted_v1() AND o.bucket_id=p_bucket AND o.object_path=p_path AND o.kind='source'
  AND o.dispatch_key IS NULL AND m.state='open' AND m.problem IS NULL AND m.part_key IS NOT NULL;
 IF NOT FOUND THEN RETURN false; END IF;
 -- Preserve the same actor/identity/attempt/policy lock ordering used to issue
 -- the part grant and claim Complete. Admission does not drain an existing PUT.
 BEGIN
  PERFORM listing_publication_private.lock_multipart_context(a.actor_user_id,a.identity_id,a.id,false);
 EXCEPTION WHEN SQLSTATE '42501' OR SQLSTATE '55000' OR SQLSTATE 'P0002' THEN RETURN false;
 END;
 RETURN EXISTS(SELECT 1 FROM listing_publication_private.objects o
  JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
  JOIN listing_publication_private.slots s ON s.id=o.slot_id
  WHERE o.attempt_id=a.id AND o.bucket_id=p_bucket AND o.object_path=p_path AND o.kind='source'
   AND o.dispatch_key IS NULL AND m.state='open' AND m.problem IS NULL AND m.part_key IS NOT NULL
   AND m.part_sign_epoch+600>floor(extract(epoch FROM clock_timestamp()))::bigint
   AND m.upload_id IS NOT NULL
   AND ('uploadId='||listing_publication_private.hosted_s3_query_value_v1(m.upload_id))=ANY(query_fields)
   AND request_headers->>'content-length'=s.expected_source_bytes::text
   AND NOT request_headers ? 'x-amz-decoded-content-length');
END $f$;
REVOKE ALL ON FUNCTION public.listing_source_part_allowed_hosted_v1(text,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.listing_source_part_allowed_hosted_v1(text,text) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
GRANT USAGE ON SCHEMA storage TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.listing_source_part_allowed_hosted_v1(text,text) TO authenticated,anon;

-- Restrictive AND closes this managed bucket even if another permissive policy
-- exists. Other buckets retain their current behavior. No S3 Create, Complete,
-- Abort, Copy, full-object upload or direct read is authorized for the browser.
CREATE POLICY listing_hosted_multipart_operation_fence ON storage.objects AS RESTRICTIVE
 FOR ALL TO authenticated,anon
 USING(bucket_id<>'listing-publication-private' OR public.listing_source_part_allowed_hosted_v1(bucket_id,name))
 WITH CHECK(bucket_id<>'listing-publication-private' OR public.listing_source_part_allowed_hosted_v1(bucket_id,name));
CREATE POLICY listing_hosted_multipart_source_part ON storage.objects FOR ALL TO authenticated
 USING(bucket_id='listing-publication-private' AND public.listing_source_part_allowed_hosted_v1(bucket_id,name))
 WITH CHECK(bucket_id='listing-publication-private' AND public.listing_source_part_allowed_hosted_v1(bucket_id,name));

-- The managed multipart path must not reopen the historical broad capability
-- issuing API alongside its operation-aware user-JWT grants.
DO $close_legacy$ DECLARE f regprocedure; BEGIN
 FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(ARRAY['reserve_my_listing_upload_v1','get_my_listing_upload_grant_v1',
  'claim_listing_upload_sign_v1','record_listing_upload_grant_v1','confirm_listing_upload_release_v1',
  'record_listing_web_write_completed_v1']) LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f);
 END LOOP;
END $close_legacy$;
UPDATE listing_publication_private.hosted_preview_settings
 SET storage_authority_version='source-part-rfc3986-v1'
 WHERE singleton AND NOT enabled AND NOT release_ready;

COMMENT ON FUNCTION public.listing_source_part_allowed_hosted_v1(text,text) IS
 'Closed hosted-preview browser Auth-JWT SOURCE UploadPart admission: current allowlisted actor/identity/policy, exact operation/method/path, canonical opaque uploadId, one part and bound Content-Length. No privileged S3 credentials or external-write finality claim.';
