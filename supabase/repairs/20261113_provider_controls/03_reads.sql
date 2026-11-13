CREATE FUNCTION provider_controls_private.snapshot(p_actor uuid,p_type text,p_id text,p_target jsonb,p_now timestamptz) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE h provider_controls_private.hidden_providers%ROWTYPE;b public.user_blocks%ROWTYPE;
 identity_value uuid:=(p_target->>'identity_id')::uuid;account_value uuid:=(p_target->>'account_id')::uuid;
 other_block boolean:=false;own_provider boolean:=true;available boolean:=p_target IS NOT NULL;
BEGIN
 IF available THEN
  SELECT * INTO h FROM provider_controls_private.hidden_providers WHERE viewer_user_id=p_actor AND provider_identity_id=identity_value;
  SELECT * INTO b FROM public.user_blocks WHERE blocker_id=p_actor AND blocked_id=account_value;
  SELECT EXISTS(SELECT 1 FROM public.user_blocks WHERE blocker_id=account_value AND blocked_id=p_actor) INTO other_block;
  own_provider:=coalesce(provider_controls_private.is_own_provider(p_actor,identity_value,account_value),false);
 END IF;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_actor,'target_type',p_type,'target_id',p_id,
  'target_available',available,'target_token',p_target->>'target_token',
  'provider',jsonb_build_object('identity_id',identity_value,'display_name',coalesce(p_target->>'display_name','Selqiro'),
   'slug',p_target->>'slug','avatar_url',p_target->>'avatar_url'),
  'hidden_until',h.hidden_until,'hidden',coalesce(h.hidden_until>p_now,false),'hide_revision',h.revision,
  'blocked_by_me',b.id IS NOT NULL,'blocked_by_other',other_block,'block_id',b.id::text,'block_created_at',b.created_at,
  'can_hide',available AND identity_value IS NOT NULL AND NOT own_provider AND coalesce((p_target->>'identity_active')::boolean,false)
   AND p_type NOT IN('blocked_account','hidden_provider','conversation') AND b.id IS NULL AND NOT other_block,
  'can_block',available AND account_value IS NOT NULL AND NOT own_provider AND p_type NOT IN('hidden_provider','conversation')
   AND (b.id IS NOT NULL OR NOT other_block),'server_now',p_now);
END $f$;

CREATE FUNCTION public.get_my_provider_control_v1(p_expected_user_id uuid,p_target_type text,p_target_id text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE actor uuid:=provider_controls_private.require_actor(p_expected_user_id);target jsonb;
 read_time timestamptz:=statement_timestamp();
BEGIN
 target:=provider_controls_private.resolve_target(actor,p_target_type,p_target_id);
 RETURN provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time);
END $f$;

CREATE FUNCTION public.list_my_provider_controls_v1(p_expected_user_id uuid,p_kind text,
 p_result_limit integer DEFAULT 25,p_result_offset integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE actor uuid:=provider_controls_private.require_actor(p_expected_user_id);items jsonb;total bigint;
 read_time timestamptz:=statement_timestamp();
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN('hidden','blocked') OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50
 OR p_result_offset IS NULL OR p_result_offset NOT BETWEEN 0 AND 100000 THEN
  RAISE EXCEPTION 'provider_control_list_invalid' USING ERRCODE='22023';END IF;
 WITH candidates AS MATERIALIZED(
  SELECT 'hidden_provider'::text target_type,h.provider_identity_id::text target_id,h.hidden_until sort_time
  FROM provider_controls_private.hidden_providers h WHERE p_kind='hidden' AND h.viewer_user_id=actor AND h.hidden_until>read_time
  UNION ALL SELECT 'blocked_account',b.id::text,b.created_at FROM public.user_blocks b WHERE p_kind='blocked' AND b.blocker_id=actor
 ), page AS(SELECT * FROM candidates ORDER BY sort_time DESC,target_id LIMIT p_result_limit OFFSET p_result_offset)
 SELECT (SELECT count(*) FROM candidates),coalesce((SELECT jsonb_agg(provider_controls_private.snapshot(actor,p.target_type,p.target_id,
  provider_controls_private.resolve_target(actor,p.target_type,p.target_id),read_time) ORDER BY p.sort_time DESC,p.target_id) FROM page p),'[]'::jsonb)
 INTO total,items;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',actor,'kind',p_kind,'items',items,'total_count',total::text,
 'result_limit',p_result_limit,'result_offset',p_result_offset,'has_more',p_result_offset+jsonb_array_length(items)<total,
 'next_offset',CASE WHEN p_result_offset+jsonb_array_length(items)<total THEN p_result_offset+jsonb_array_length(items) END);
END $f$;
REVOKE ALL ON FUNCTION provider_controls_private.snapshot(uuid,text,text,jsonb,timestamptz),
 public.get_my_provider_control_v1(uuid,text,text),public.list_my_provider_controls_v1(uuid,text,integer,integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_provider_control_v1(uuid,text,text),
 public.list_my_provider_controls_v1(uuid,text,integer,integer) TO authenticated;
