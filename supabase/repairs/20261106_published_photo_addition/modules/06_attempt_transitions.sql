-- Existing terminal attempts are never reopened. The sole new transition is
-- supported by an exact immutable attachment receipt and existing cleanup rows.
CREATE OR REPLACE FUNCTION public.prepare_my_listing_publication_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_input jsonb,p_images jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $fn$
DECLARE active_id uuid; n jsonb; images jsonb; fingerprint bytea; a listing_publication_private.attempts%ROWTYPE;
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
 a.id:=listing_publication_private.allocate_managed_publication_attempt_v1(
  p_expected_user_id,active_id,p_request_key,fingerprint,n,images);
 RETURN listing_publication_private.snapshot(a.id)||jsonb_build_object('replayed',false);
END $fn$;

CREATE OR REPLACE FUNCTION listing_publication_private.protect_attempt() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication_receipt_retained' USING ERRCODE='55000'; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='open' AND NEW.state='published'
  AND NEW.payload IS NULL AND NEW.closed_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','payload','closed_at'])=(to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  AND EXISTS(SELECT 1 FROM listing_publication_private.managed_image_additions_v1 b
   JOIN listing_publication_private.publications p ON p.attempt_id=b.parent_attempt_id
   JOIN listing_publication_private.attempts parent ON parent.id=p.attempt_id
   JOIN public.listings l ON l.id=p.listing_id
   WHERE b.attempt_id=OLD.id AND b.attached_at IS NOT NULL AND p.state='published' AND parent.state='published'
    AND parent.identity_id=OLD.identity_id AND l.identity_id=OLD.identity_id AND l.created_by_user_id=parent.actor_user_id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND o.kind='source' AND (c.object_id IS NULL OR c.reason<>'published_source'
    OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path)) THEN RETURN NEW; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='published' AND NEW.state='deleted'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND EXISTS(SELECT 1 FROM listing_publication_private.managed_image_additions_v1 b
   JOIN listing_publication_private.publications p ON p.attempt_id=b.parent_attempt_id
   WHERE b.attempt_id=OLD.id AND b.attached_at IS NOT NULL AND p.state='deleting'
    AND NOT EXISTS(SELECT 1 FROM public.listings l WHERE l.id=p.listing_id))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path)) THEN RETURN NEW; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='open' AND NEW.state='published'
  AND NEW.payload IS NULL AND NEW.closed_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','payload','closed_at'])=(to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  AND EXISTS(SELECT 1 FROM listing_publication_private.publications p JOIN public.listings l ON l.id=p.listing_id
   WHERE p.attempt_id=OLD.id AND p.state='published' AND l.identity_id=OLD.identity_id AND l.created_by_user_id=OLD.actor_user_id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND o.kind='source' AND (c.object_id IS NULL OR c.reason<>'published_source' OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path))
 THEN RETURN NEW; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='published' AND NEW.state='deleted'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND EXISTS(SELECT 1 FROM listing_publication_private.publications p WHERE p.attempt_id=OLD.id AND p.state='deleting'
   AND NOT EXISTS(SELECT 1 FROM public.listings l WHERE l.id=p.listing_id))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path))
 THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','payload','closed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  OR OLD.state<>'open' OR NEW.state NOT IN('cancelled','expired') OR NEW.payload IS NOT NULL OR NEW.closed_at IS NULL THEN
  RAISE EXCEPTION 'publication_attempt_immutable' USING ERRCODE='55000'; END IF;
 IF EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
  WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path OR c.reason<>NEW.state
   OR c.state<>listing_publication_private.object_cleanup_state(o.id))) THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_required' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;

CREATE FUNCTION listing_publication_private.assert_ordinary_publication_v1(p_attempt uuid)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF EXISTS(SELECT 1 FROM listing_publication_private.managed_image_additions_v1 WHERE attempt_id=p_attempt) THEN
  RAISE EXCEPTION 'publication_addition_requires_append' USING ERRCODE='55000'; END IF;
END $f$;

CREATE OR REPLACE FUNCTION listing_publication_private.apply_final(p_attempt uuid,p_normalized jsonb,p_confirmation text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET timezone='UTC' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; r public.listings%ROWTYPE;
 n jsonb:=p_normalized; actor uuid:=public.listing_actor_uid_hosted_v1(); active_id uuid; at_time timestamptz:=clock_timestamp();
BEGIN
 PERFORM listing_publication_private.assert_ordinary_publication_v1(p_attempt);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt FOR UPDATE;
 IF NOT FOUND OR a.actor_user_id IS DISTINCT FROM actor OR a.state<>'open' OR a.payload IS DISTINCT FROM n
  OR a.expires_at<=at_time THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 active_id:=a.identity_id;
  r.title:=n->'basics'->>'title'; r.description:=n->'basics'->>'description';
  r.condition:=n->'basics'->>'condition';
  r.category:=n->'category_path'->>0; r.subcategory:=coalesce(n->'category_path'->>1,'');
  r.country:=n->'location'->>'country'; r.city:=n->'location'->>'city';
  r.location:=concat_ws(' • ',nullif(r.country,''),nullif(r.city,''));
  r.listing_lat:=(n->'location'->>'latitude')::double precision;
  r.listing_lng:=(n->'location'->>'longitude')::double precision;
  r.manufacturer:=n->'attributes'->>'manufacturer'; r.part_number:=n->'attributes'->>'part_number';
  r.oem_number:=n->'attributes'->>'oem_number'; r.vehicle_brand:=n->'attributes'->>'vehicle_brand';
  r.vehicle_model:=n->'attributes'->>'vehicle_model'; r.vehicle_year:=n->'attributes'->>'vehicle_year';
  r.engine:=n->'attributes'->>'engine';
  -- One-way initial mirrors used by existing detail readers. Input cannot supply two values.
  r.details:=(n->'details')||jsonb_build_object('detailCategory',coalesce(n->'category_path'->>2,''),
    'manufacturer',r.manufacturer,'partNumber',r.part_number,'oemNumber',r.oem_number,
    'vehicleBrand',r.vehicle_brand,'vehicleModel',r.vehicle_model,'vehicleYear',r.vehicle_year,'engine',r.engine);
  INSERT INTO public.listings(
   user_id,identity_id,created_by_user_id,updated_by_user_id,title,description,condition,
   price_kind,price_amount,currency,category,subcategory,country,city,location,listing_lat,listing_lng,
   manufacturer,part_number,oem_number,vehicle_brand,vehicle_model,vehicle_year,engine,details,
   search_text,listing_language,status,created_at,active_until,image,
   ai_status,ai_enriched,ai_level,is_featured,is_boosted)
  VALUES(actor,active_id,actor,actor,r.title,r.description,r.condition,
   n->'price'->>'kind',(n->'price'->>'amount')::numeric,n->'price'->>'currency',
   r.category,r.subcategory,r.country,r.city,r.location,r.listing_lat,r.listing_lng,
   r.manufacturer,r.part_number,r.oem_number,r.vehicle_brand,r.vehicle_model,r.vehicle_year,r.engine,r.details,
   public.listing_basics_search_text_v1(r),n->>'language','active',at_time,at_time+interval '2160 hours',NULL,
   'not_started',false,'none',false,false)
  RETURNING * INTO r;

 INSERT INTO listing_publication_private.publications(attempt_id,listing_id,confirmation_sha256,published_at,state)
 VALUES(a.id,r.id,p_confirmation,at_time,'published');
 INSERT INTO public.listing_images(listing_id,user_id,original_url,medium_url,thumb_url,sort_order,is_primary)
 SELECT r.id,actor,'/api/v2/listing-media/'||a.id::text||'/'||s.ordinal::text,
 '/api/v2/listing-media/'||a.id::text||'/'||s.ordinal::text,
 '/api/v2/listing-media/'||a.id::text||'/'||s.ordinal::text,s.ordinal,s.ordinal=0
 FROM listing_publication_private.slots s WHERE s.attempt_id=a.id ORDER BY s.ordinal;
 UPDATE public.listings SET image=(SELECT i.original_url FROM public.listing_images i
  WHERE i.listing_id=r.id AND i.is_primary) WHERE id=r.id;
 PERFORM listing_publication_private.assert_final_last_boundary(a.id);
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 SELECT o.id,o.bucket_id,o.object_path,'published_source',listing_publication_private.object_cleanup_state(o.id),at_time
 FROM listing_publication_private.objects o WHERE o.attempt_id=a.id AND o.kind='source';
 UPDATE listing_publication_private.attempts SET state='published',payload=NULL,closed_at=at_time WHERE id=a.id;
 RETURN r.id;
END $f$;

CREATE OR REPLACE FUNCTION listing_publication_private.final_material(p_attempt uuid) RETURNS jsonb LANGUAGE plpgsql
SET search_path=pg_catalog,public,pg_temp AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; n jsonb; images jsonb; x record;
BEGIN
 PERFORM listing_publication_private.assert_ordinary_publication_v1(p_attempt);
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_attempt;
 IF NOT FOUND OR a.state<>'open' OR a.expires_at<=clock_timestamp() THEN
  RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 n:=public.normalize_listing_creation_v1(a.payload-'version');
 IF n IS DISTINCT FROM a.payload THEN RAISE EXCEPTION 'publication_input_changed' USING ERRCODE='22023'; END IF;
 FOR x IN SELECT s.id,w.state,w.ready_id,w.intent FROM listing_publication_private.slots s
  LEFT JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=s.attempt_id
  WHERE s.attempt_id=a.id ORDER BY s.ordinal LOOP
  IF x.state IS DISTINCT FROM 'ready' OR x.ready_id IS NULL THEN
   RAISE EXCEPTION 'publication_images_not_ready' USING ERRCODE='55000'; END IF;
  PERFORM listing_publication_private.validate_web_intent(x.intent,x.id);
 END LOOP;
 IF EXISTS(SELECT 1 FROM listing_publication_private.objects o JOIN listing_publication_private.cleanup c ON c.object_id=o.id WHERE o.attempt_id=a.id) THEN
  RAISE EXCEPTION 'publication_cleanup_conflict' USING ERRCODE='55000'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('slot_id',s.id,'ordinal',s.ordinal,'receipt_id',w.ready_id,
  'web_sha256',w.intent->>'web_sha256','web_bytes',w.intent->'web_bytes') ORDER BY s.ordinal),'[]') INTO images
 FROM listing_publication_private.slots s JOIN listing_publication_private.web_images w ON w.slot_id=s.id WHERE s.attempt_id=a.id;
 RETURN jsonb_build_object('schema_version',1,'attempt_id',a.id,'request_key',a.request_key,
 'actor_user_id',a.actor_user_id,'identity_id',a.identity_id,'price',n->'price','image_count',jsonb_array_length(images),
 'confirmation_sha256',encode(sha256(convert_to('selqiro-final-v1:'||jsonb_build_object(
  'intent',encode(a.intent_sha256,'hex'),'attempt',a.id,'price',n->'price','images',images)::text,'UTF8')),'hex'));
END $f$;

CREATE OR REPLACE FUNCTION public.get_my_listing_publication_confirmation_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id AND x.actor_user_id=p_expected_user_id
  AND x.identity_id=p_expected_identity_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 PERFORM listing_publication_private.assert_ordinary_publication_v1(p_attempt_id);
 IF a.state IN('published','deleted') THEN RETURN jsonb_build_object('receipt',listing_publication_private.final_receipt(a.id)); END IF;
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('confirmation',listing_publication_private.final_material(a.id));
END $f$;

CREATE OR REPLACE FUNCTION public.publish_my_listing_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_confirmation_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; p listing_publication_private.publications%ROWTYPE; material jsonb;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_confirmation_sha256 IS NULL OR char_length(p_confirmation_sha256)<>64 OR p_confirmation_sha256 !~ '^[0-9a-f]{64}$' THEN
  RAISE EXCEPTION 'publication_confirmation_invalid' USING ERRCODE='22023'; END IF;
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id AND x.actor_user_id=p_expected_user_id
  AND x.identity_id=p_expected_identity_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 PERFORM listing_publication_private.assert_ordinary_publication_v1(p_attempt_id);
 SELECT * INTO p FROM listing_publication_private.publications WHERE attempt_id=a.id;
 IF FOUND THEN
  IF p.confirmation_sha256 IS DISTINCT FROM p_confirmation_sha256 THEN RAISE EXCEPTION 'publication_confirmation_conflict' USING ERRCODE='22023'; END IF;
  -- Recovery is a read, even after terms changed, deletion, or listing expiration. Never reactivate.
  RETURN listing_publication_private.final_receipt(a.id)||jsonb_build_object('replayed',true);
 END IF;
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 material:=listing_publication_private.final_material(a.id);
 IF material->>'confirmation_sha256' IS DISTINCT FROM p_confirmation_sha256 THEN
  RAISE EXCEPTION 'publication_confirmation_conflict' USING ERRCODE='22023'; END IF;
 PERFORM listing_publication_private.apply_final(a.id,a.payload,p_confirmation_sha256);
 RETURN listing_publication_private.final_receipt(a.id)||jsonb_build_object('replayed',false);
END $f$;
