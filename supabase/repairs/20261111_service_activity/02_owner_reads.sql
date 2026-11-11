CREATE FUNCTION service_publication_private.activity_fields(s public.services,p_now timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('active_until',a.active_until,'origin',a.origin,
 'last_confirmed_at',a.last_confirmed_at,'is_expired',coalesce(a.active_until<=p_now,false),
 'can_renew',s.status IN('published','archived') AND a.service_id IS NOT NULL,'server_now',p_now)
 FROM (SELECT 1) one LEFT JOIN service_publication_private.activity a ON a.service_id=s.id;
$f$;
REVOKE ALL ON FUNCTION service_publication_private.activity_fields(public.services,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.get_my_service_activity_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_service_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE s public.services%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT * INTO s FROM public.services WHERE id=p_service_id AND identity_id=p_expected_identity_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_unavailable' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('schema_version',1,'content_type','service','actor_user_id',p_expected_user_id,
 'identity_id',s.identity_id,'service_id',s.id,'status',s.status,
 'activity',service_publication_private.activity_fields(s,clock_timestamp()));
END $f$;

CREATE FUNCTION public.get_my_service_publication_snapshot_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_service_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE s public.services%ROWTYPE;retained jsonb;
BEGIN
 -- The v1 reader keeps its exact contract for old clients and command receipts.
 retained:=public.get_my_service_publication_snapshot_v1(p_expected_user_id,p_expected_identity_id,p_service_id);
 SELECT * INTO STRICT s FROM public.services WHERE id=p_service_id AND identity_id=p_expected_identity_id;
 RETURN retained||jsonb_build_object('schema_version',2,'activity',service_publication_private.activity_fields(s,statement_timestamp()));
END $f$;

CREATE FUNCTION public.get_my_service_publications_v2(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_result_limit integer DEFAULT 200,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE items jsonb;total bigint;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 200 OR p_result_offset IS NULL
 OR p_result_offset<0 OR p_result_offset>1000000 THEN RAISE EXCEPTION 'service_page_invalid' USING ERRCODE='22023';END IF;
 SELECT count(*) INTO total FROM public.services WHERE identity_id=p_expected_identity_id;
 SELECT coalesce(jsonb_agg(public.get_my_service_publication_snapshot_v2(p_expected_user_id,p_expected_identity_id,s.id)
 ORDER BY s.created_at DESC,s.id ASC),'[]'::jsonb) INTO items FROM
 (SELECT * FROM public.services WHERE identity_id=p_expected_identity_id ORDER BY created_at DESC,id ASC
 LIMIT p_result_limit OFFSET p_result_offset) s;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
 'items',items,'total_count',total::text,'result_limit',p_result_limit,'result_offset',p_result_offset,
 'has_more',p_result_offset+jsonb_array_length(items)<total,
 'next_offset',CASE WHEN p_result_offset+jsonb_array_length(items)<total THEN p_result_offset+jsonb_array_length(items) ELSE NULL END);
END $f$;

REVOKE ALL ON FUNCTION public.get_my_service_activity_v1(uuid,uuid,uuid),
 public.get_my_service_publication_snapshot_v2(uuid,uuid,uuid),public.get_my_service_publications_v2(uuid,uuid,integer,integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_service_activity_v1(uuid,uuid,uuid),
 public.get_my_service_publication_snapshot_v2(uuid,uuid,uuid),public.get_my_service_publications_v2(uuid,uuid,integer,integer)
 TO authenticated;
