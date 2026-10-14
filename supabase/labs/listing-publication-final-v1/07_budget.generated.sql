-- Exact prior preparation body, one quota predicate change only.
CREATE OR REPLACE FUNCTION public.prepare_my_listing_publication_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_input jsonb,p_images jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $fn$
DECLARE active_id uuid; n jsonb; images jsonb; fingerprint bytea; policies jsonb;
 a listing_publication_private.attempts%ROWTYPE; slot_id uuid; image record;
 at_time timestamptz; reserved bigint;
BEGIN
 active_id:=listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_request_key_invalid' USING ERRCODE='22023';
 END IF;
 n:=public.normalize_listing_creation_v1(p_input);
 IF n->>'language'<>'et' OR n->'location'->>'country'='' OR n->'location'->>'city'=''
    OR n->'location'->>'latitude' IS NOT NULL OR n->'location'->>'longitude' IS NOT NULL THEN
  RAISE EXCEPTION 'publication_form_scope_invalid' USING ERRCODE='22023';
 END IF;
 images:=listing_publication_private.normalize_images(p_images);
 fingerprint:=sha256(convert_to('selqiro-publication-attempt-v1:'||jsonb_build_object('input',n,'images',images)::text,'UTF8'));
 SELECT x.* INTO a FROM listing_publication_private.attempts x
  WHERE x.actor_user_id=p_expected_user_id AND x.request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF a.identity_id IS DISTINCT FROM active_id OR a.intent_sha256 IS DISTINCT FROM fingerprint THEN
   RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023';
  END IF;
  -- Recovery only; do not rewrite content, move deadline, issue permission or reopen a tombstone.
  RETURN listing_publication_private.snapshot(a.id)||jsonb_build_object('replayed',true);
 END IF;
 policies:=listing_publication_private.require_policies();
 at_time:=clock_timestamp();
 IF (SELECT count(*) FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
     AND x.state='open' AND x.expires_at>at_time)>=3 THEN
  RAISE EXCEPTION 'publication_open_attempt_limit' USING ERRCODE='54000';
 END IF;
 IF (SELECT count(*) FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
     AND x.created_at>at_time-interval '24 hours')>=20 THEN
  RAISE EXCEPTION 'publication_daily_attempt_limit' USING ERRCODE='54000';
 END IF;
 SELECT coalesce(sum(o.reserved_bytes),0) INTO reserved FROM listing_publication_private.objects o
  JOIN listing_publication_private.attempts x ON x.id=o.attempt_id WHERE x.actor_user_id=p_expected_user_id AND NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup done WHERE done.object_id=o.id AND done.state='deleted');
 -- Signed uploads cannot be bounded by the untrusted declared size. Reserve FULL per-object maxima.
 -- No budget is released until the future Storage settlement/cleanup contract proves it safe.
 IF reserved+jsonb_array_length(images)::bigint*(26214400+4194304)>314572800 THEN
  RAISE EXCEPTION 'publication_retained_bytes_limit' USING ERRCODE='54000';
 END IF;
 INSERT INTO listing_publication_private.attempts(actor_user_id,identity_id,request_key,intent_sha256,
   payload,policy_snapshot,created_at,expires_at)
 VALUES(p_expected_user_id,active_id,p_request_key,fingerprint,n,policies,at_time,at_time+interval '24 hours') RETURNING * INTO a;
 FOR image IN SELECT value,ordinality FROM jsonb_array_elements(images) WITH ORDINALITY LOOP
  INSERT INTO listing_publication_private.slots(attempt_id,ordinal,client_file_id,expected_source_bytes,expected_source_sha256)
  VALUES(a.id,image.ordinality-1,(image.value->>'client_file_id')::uuid,
    (image.value->>'byte_length')::integer,decode(image.value->>'sha256','hex')) RETURNING id INTO slot_id;
  INSERT INTO listing_publication_private.objects(attempt_id,slot_id,kind,bucket_id,object_path,reserved_bytes)
  VALUES(a.id,slot_id,'source','listing-publication-private','v1/'||a.id::text||'/'||slot_id::text||'/source.upload',26214400),
        (a.id,slot_id,'web','listing-publication-private','v1/'||a.id::text||'/'||slot_id::text||'/web-v1.webp',4194304);
 END LOOP;
 RETURN listing_publication_private.snapshot(a.id)||jsonb_build_object('replayed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.prepare_my_listing_publication_v1(uuid,uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;

