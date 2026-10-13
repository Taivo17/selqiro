-- DORMANT NEW HELPER CANDIDATE; not a production migration.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required';
 END IF;
END $gate$;
-- Reuses the EXISTING exact normalizers, identity lock and versioned policy helpers.
CREATE FUNCTION listing_publication_private.require_actor(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog,public,auth,pg_temp AS $fn$
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001';
 END IF;
 IF auth.uid() IS NULL OR p_expected_user_id IS NULL OR auth.uid() IS DISTINCT FROM p_expected_user_id THEN
  RAISE EXCEPTION 'publication_account_changed' USING ERRCODE='42501';
 END IF;
 RETURN public.lock_listing_creation_actor_v1(p_expected_identity_id);
END $fn$;
CREATE FUNCTION listing_publication_private.require_policies() RETURNS jsonb LANGUAGE plpgsql
SET search_path=pg_catalog,public,auth,pg_temp AS $fn$
DECLARE p record; locked_id uuid; accepted_id uuid; result jsonb:='[]'; at_time timestamptz;
BEGIN
 -- Brief shared catalog lock closes the new-policy phantom between selection and write.
 -- No Storage/network work may occur inside this database transaction.
 LOCK TABLE public.publication_policy_documents IN SHARE MODE;
 at_time:=clock_timestamp();
 -- Ordinary V2 has free-text location, NOT a verified policy-country code. Never guess it.
 -- Global-only pilot fails closed if any country-scoped ordinary rule is active.
 IF EXISTS(SELECT 1 FROM public.publication_policy_documents d WHERE d.status='active'
    AND 'listing'=ANY(d.applies_to_content_types) AND d.country_code IS NOT NULL
    AND (d.effective_until IS NULL OR d.effective_until>at_time)) THEN
  RAISE EXCEPTION 'publication_policy_country_scope_unresolved' USING ERRCODE='55000';
 END IF;
 PERFORM public.require_my_current_publication_policy_acceptance_v1('marketplace-general',NULL,'et-EE');
 FOR p IN SELECT * FROM public.get_required_publication_policies_v1('listing',NULL,'et-EE')
    WHERE requires_user_acceptance ORDER BY policy_document_id LOOP
  -- Existing helpers use transaction time; additionally reject a version expired while waiting.
  SELECT d.id INTO locked_id FROM public.publication_policy_documents d
   WHERE d.id=p.policy_document_id AND d.status='active' AND d.effective_from<=at_time
    AND (d.effective_until IS NULL OR d.effective_until>at_time) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
  accepted_id:=public.require_my_current_publication_policy_acceptance_v1(p.policy_key,NULL,'et-EE');
  IF accepted_id IS DISTINCT FROM locked_id THEN
   RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.user_publication_policy_acceptances a
   WHERE a.user_id=auth.uid() AND a.policy_document_id=locked_id AND a.content_hash=p.content_hash FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'publication_acceptance_required' USING ERRCODE='42501'; END IF;
  result:=result||jsonb_build_array(jsonb_build_object('document_id',p.policy_document_id,
     'version',p.policy_version,'content_hash',p.content_hash));
 END LOOP;
 -- Locks on acceptance rows can wait too: validate wall time again at the last boundary.
 at_time:=clock_timestamp();
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result) item
   LEFT JOIN public.publication_policy_documents d ON d.id=(item->>'document_id')::uuid
   WHERE d.id IS NULL OR d.status<>'active' OR d.effective_from>at_time
    OR (d.effective_until IS NOT NULL AND d.effective_until<=at_time)) THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501';
 END IF;
 -- Also detect newly effective rules that the transaction-time helper did not include.
 IF (SELECT count(*) FROM public.publication_policy_documents d WHERE d.status='active'
   AND d.country_code IS NULL AND d.locale='et-EE' AND 'listing'=ANY(d.applies_to_content_types)
   AND d.requires_user_acceptance AND d.effective_from<=at_time
   AND (d.effective_until IS NULL OR d.effective_until>at_time))<>jsonb_array_length(result)
   OR jsonb_array_length(result)=0 THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501';
 END IF;
 RETURN result;
END $fn$;
CREATE FUNCTION listing_publication_private.normalize_images(p_images jsonb) RETURNS jsonb LANGUAGE plpgsql
IMMUTABLE SET search_path=pg_catalog,public,pg_temp AS $fn$
DECLARE e jsonb; ids uuid[]:='{}'; file_id uuid; bytes integer; total_bytes bigint:=0; result jsonb:='[]';
BEGIN
 IF p_images IS NULL OR jsonb_typeof(p_images) IS DISTINCT FROM 'array' OR octet_length(p_images::text)>4096 THEN
  RAISE EXCEPTION 'publication_images_invalid' USING ERRCODE='22023';
 END IF;
 IF jsonb_array_length(p_images)>10 THEN RAISE EXCEPTION 'publication_image_count_exceeded' USING ERRCODE='22023'; END IF;
 FOR e IN SELECT value FROM jsonb_array_elements(p_images) LOOP
  PERFORM public.require_listing_create_keys_v1(e,ARRAY['client_file_id','byte_length','sha256']);
  IF jsonb_typeof(e->'client_file_id') IS DISTINCT FROM 'string'
   OR char_length(e->>'client_file_id')<>36 OR e->>'client_file_id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR jsonb_typeof(e->'sha256') IS DISTINCT FROM 'string' OR char_length(e->>'sha256')<>64
   OR e->>'sha256' !~ '^[0-9a-f]{64}$'
   OR jsonb_typeof(e->'byte_length') IS DISTINCT FROM 'number'
   OR e->>'byte_length' !~ '^[1-9][0-9]{0,7}$' THEN
   RAISE EXCEPTION 'publication_images_invalid' USING ERRCODE='22023';
  END IF;
  file_id:=(e->>'client_file_id')::uuid; bytes:=(e->>'byte_length')::integer;
  IF file_id='00000000-0000-0000-0000-000000000000'::uuid OR file_id=ANY(ids) OR bytes>26214400 THEN
   RAISE EXCEPTION 'publication_images_invalid' USING ERRCODE='22023';
  END IF;
  ids:=array_append(ids,file_id); total_bytes:=total_bytes+bytes;
  result:=result||jsonb_build_array(jsonb_build_object('client_file_id',file_id,'byte_length',bytes,'sha256',e->>'sha256'));
 END LOOP;
 IF total_bytes>104857600 THEN RAISE EXCEPTION 'publication_attempt_bytes_exceeded' USING ERRCODE='22023'; END IF;
 RETURN result;
END $fn$;
CREATE FUNCTION listing_publication_private.snapshot(p_id uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $fn$
 WITH at_time AS MATERIALIZED (SELECT clock_timestamp() AS t)
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id::text,'request_key',a.request_key::text,
  'actor_user_id',a.actor_user_id::text,'identity_id',a.identity_id::text,
  'state',CASE WHEN a.state='open' AND a.expires_at<=at_time.t THEN 'expired' ELSE a.state END,
  'created_at',to_char(a.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'expires_at',to_char(a.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'payload',CASE WHEN a.state='open' AND a.expires_at>at_time.t THEN a.payload ELSE NULL END,
  'slots',coalesce((SELECT jsonb_agg(jsonb_build_object('slot_id',s.id::text,'ordinal',s.ordinal,
   'client_file_id',s.client_file_id::text,'expected_bytes',s.expected_source_bytes,
   'expected_sha256',encode(s.expected_source_sha256,'hex')) ORDER BY s.ordinal)
   FROM listing_publication_private.slots s WHERE s.attempt_id=a.id),'[]'::jsonb))
 FROM listing_publication_private.attempts a CROSS JOIN at_time WHERE a.id=p_id;
$fn$;
