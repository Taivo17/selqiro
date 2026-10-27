-- Integrated owner surfaces, installed only after the random disposable marker.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres'
  OR to_regclass('selqiro_disposable_v2.run') IS NULL THEN RAISE EXCEPTION 'fresh_integration_run_required'; END IF;
END $gate$;

CREATE OR REPLACE FUNCTION public.get_my_managed_listing_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE aid uuid; activity jsonb; images jsonb; BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_listing_id !~'^[1-9][0-9]{0,18}$' OR p_listing_id::numeric>9223372036854775807
 THEN RAISE EXCEPTION 'listing_id_invalid' USING ERRCODE='22023'; END IF;
 SELECT a.id INTO aid FROM listing_publication_private.attempts a
 JOIN listing_publication_private.publications p ON p.attempt_id=a.id
 WHERE p.listing_id=p_listing_id::bigint AND a.identity_id=p_expected_identity_id FOR SHARE OF a;
 IF aid IS NOT NULL THEN
  SELECT jsonb_build_object('status',l.status,'active_until',l.active_until) INTO activity
   FROM public.listings l WHERE l.id=p_listing_id::bigint AND l.identity_id=p_expected_identity_id;
  SELECT coalesce(jsonb_agg('/api/v2/listing-media/'||aid::text||'/'||s.ordinal::text ORDER BY s.ordinal),'[]'::jsonb)
   INTO images FROM listing_publication_private.slots s WHERE s.attempt_id=aid AND activity IS NOT NULL;
 END IF;
 RETURN jsonb_build_object('receipt',listing_publication_private.final_receipt(aid),'activity',activity,'images',coalesce(images,'[]'::jsonb));
END $f$;

CREATE FUNCTION public.get_my_listing_media_binding_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_ordinal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE v jsonb; BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_ordinal IS NULL OR p_ordinal NOT BETWEEN 0 AND 9 THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id,'ordinal',s.ordinal,'bucket_id',o.bucket_id,
 'object_path',o.object_path,'sha256',w.intent->>'web_sha256','bytes',(w.intent->>'web_bytes')::integer) INTO v
 FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id
 JOIN public.listings l ON l.id=p.listing_id
 JOIN listing_publication_private.slots s ON s.attempt_id=a.id AND s.ordinal=p_ordinal
 JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.kind='web'
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.state='ready'
 WHERE a.id=p_attempt_id AND a.state='published' AND p.state='published'
 AND l.identity_id=a.identity_id AND a.identity_id=p_expected_identity_id;
 RETURN v;
END $f$;

CREATE FUNCTION public.set_my_managed_listing_status_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id text,
 p_expected_status text,p_status text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE r public.listings; BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_status IS NULL OR p_status NOT IN('active','paused','sold') OR p_expected_status IS NULL
  OR p_expected_status NOT IN('active','paused','sold') THEN RAISE EXCEPTION 'listing_status_invalid' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM listing_publication_private.attempts a JOIN listing_publication_private.publications p ON p.attempt_id=a.id
  WHERE p.listing_id::text=p_listing_id AND a.identity_id=p_expected_identity_id AND p.state='published' FOR SHARE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'managed_listing_required' USING ERRCODE='42501'; END IF;
 r:=public.lock_my_listing_basics_v1(p_listing_id,p_expected_identity_id,true);
 IF r.status IS DISTINCT FROM p_expected_status THEN RAISE EXCEPTION 'listing_status_conflict' USING ERRCODE='40001'; END IF;
 IF p_status='active' THEN PERFORM listing_publication_private.require_policies(); END IF;
 UPDATE public.listings SET status=p_status,updated_by_user_id=p_expected_user_id WHERE id=r.id AND status=p_expected_status;
 RETURN jsonb_build_object('listing_id',r.id::text,'status',p_status);
END $f$;

CREATE FUNCTION public.renew_my_managed_listing_activity_v2(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_listing_id text,p_expected_active_until timestamptz)
RETURNS TABLE(listing_id text,status text,active_until timestamptz,changed boolean) LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$ BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 RETURN QUERY SELECT * FROM public.renew_my_listing_activity_v1(p_listing_id,p_expected_active_until);
END $f$;
REVOKE ALL ON FUNCTION public.get_my_managed_listing_v2(uuid,uuid,text),
 public.get_my_listing_media_binding_v2(uuid,uuid,uuid,integer),
 public.set_my_managed_listing_status_v2(uuid,uuid,text,text,text),
 public.renew_my_managed_listing_activity_v2(uuid,uuid,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
