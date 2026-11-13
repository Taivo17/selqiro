-- COMPONENT 01_state.sql
-- One free, account-scoped discovery preference. No content or message writes.
CREATE SCHEMA provider_controls_private;
REVOKE ALL ON SCHEMA provider_controls_private FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE provider_controls_private.hidden_providers (
 viewer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 provider_identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 revision uuid NOT NULL CHECK(revision<>'00000000-0000-0000-0000-000000000000'::uuid),
 hidden_until timestamptz CHECK(hidden_until IS NULL OR isfinite(hidden_until)),
 PRIMARY KEY(viewer_user_id,provider_identity_id)
);
CREATE INDEX hidden_providers_active_idx ON provider_controls_private.hidden_providers
 (viewer_user_id,hidden_until DESC,provider_identity_id) WHERE hidden_until IS NOT NULL;
ALTER TABLE provider_controls_private.hidden_providers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON provider_controls_private.hidden_providers FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION provider_controls_private.require_actor(p_expected_user_id uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR p_expected_user_id IS NULL OR actor<>p_expected_user_id
 OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor) THEN
  RAISE EXCEPTION 'provider_control_actor_mismatch' USING ERRCODE='42501';END IF;
 RETURN actor;
END $f$;

CREATE FUNCTION provider_controls_private.validate_target(p_type text,p_id text) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF p_type IS NULL OR p_id IS NULL OR p_type NOT IN('listing','horse_offer','service','profile','hidden_provider','blocked_account','conversation') THEN
  RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
 IF p_type='listing' THEN
  IF p_id!~'^(0|[1-9][0-9]{0,18}|-[1-9][0-9]{0,18})$' THEN
   RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
  IF p_id::numeric NOT BETWEEN -9223372036854775808 AND 9223372036854775807 THEN
   RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
 ELSIF p_type IN('blocked_account','conversation') THEN
  IF p_id!~'^[1-9][0-9]{0,18}$' THEN RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
  IF p_id::numeric>9223372036854775807 THEN RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
 ELSIF p_id!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  OR p_id='00000000-0000-0000-0000-000000000000' THEN
  RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
END $f$;

CREATE FUNCTION provider_controls_private.is_own_provider(p_actor uuid,p_identity uuid,p_account uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT p_actor=p_account OR EXISTS(SELECT 1 FROM public.identities i
 LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 WHERE i.id=p_identity AND ((i.type='private' AND i.user_id=p_actor)
 OR (i.type='business' AND (b.owner_user_id=p_actor OR EXISTS(SELECT 1 FROM public.business_members m
 WHERE m.business_account_id=i.business_account_id AND m.user_id=p_actor AND m.status='active')))));
$f$;
REVOKE ALL ON FUNCTION provider_controls_private.require_actor(uuid),
 provider_controls_private.validate_target(text,text),provider_controls_private.is_own_provider(uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;

-- COMPONENT 02_target.sql
-- Resolve only a currently public content reference or an existing own preference.
-- Account IDs are private here. The public response contains only provider metadata.
CREATE FUNCTION provider_controls_private.resolve_target(p_actor uuid,p_type text,p_id text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE identity_value uuid;account_value uuid;metadata jsonb;identity_active boolean;
BEGIN
 PERFORM provider_controls_private.validate_target(p_type,p_id);
 CASE p_type
 WHEN 'listing' THEN
  SELECT l.identity_id,l.user_id INTO identity_value,account_value FROM public.listings l
  JOIN public.identities i ON i.id=l.identity_id AND i.status='active'
  JOIN public.identity_profiles ip ON ip.identity_id=i.id
  WHERE l.id=p_id::bigint AND l.status='active' AND (l.active_until IS NULL OR l.active_until>statement_timestamp());
 WHEN 'horse_offer' THEN
  SELECT h.identity_id,h.created_by_user_id INTO identity_value,account_value FROM public.horse_offers h
  JOIN public.identities i ON i.id=h.identity_id AND i.status='active'
  JOIN public.identity_profiles ip ON ip.identity_id=i.id
  WHERE h.id=p_id::uuid AND horse_publication_private.is_public(h.id);
 WHEN 'service' THEN
  SELECT s.identity_id,CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END
  INTO identity_value,account_value FROM public.services s JOIN public.identities i ON i.id=s.identity_id AND i.status='active'
  LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
  WHERE s.id=p_id::uuid AND service_publication_private.is_public(s.id);
 WHEN 'profile' THEN
  SELECT i.id,CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END
  INTO identity_value,account_value FROM public.identities i
  JOIN public.identity_profiles ip ON ip.identity_id=i.id
  LEFT JOIN public.business_accounts b ON b.id=i.business_account_id WHERE i.id=p_id::uuid AND i.status='active';
 WHEN 'hidden_provider' THEN
  SELECT i.id,CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END
  INTO identity_value,account_value FROM provider_controls_private.hidden_providers h
  JOIN public.identities i ON i.id=h.provider_identity_id
  LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
  WHERE h.viewer_user_id=p_actor AND h.provider_identity_id=p_id::uuid;
 WHEN 'blocked_account' THEN
  SELECT b.blocked_id INTO account_value FROM public.user_blocks b WHERE b.id=p_id::bigint AND b.blocker_id=p_actor;
  IF account_value IS NOT NULL THEN
   SELECT i.id INTO identity_value FROM public.identities i LEFT JOIN public.identity_profiles ip ON ip.identity_id=i.id
   WHERE i.type='private' AND i.user_id=account_value ORDER BY (i.status='active') DESC,ip.slug NULLS LAST,i.id LIMIT 1;
  END IF;
 WHEN 'conversation' THEN
  SELECT CASE WHEN c.buyer_id=p_actor THEN c.seller_identity_id ELSE c.buyer_identity_id END,
   CASE WHEN c.buyer_id=p_actor THEN c.seller_id ELSE c.buyer_id END INTO identity_value,account_value
  FROM public.conversations c WHERE c.id=p_id::bigint AND p_actor IN(c.buyer_id,c.seller_id)
  AND messaging_private_v2.exact_thread(c.id,p_actor,CASE WHEN c.buyer_id=p_actor THEN c.buyer_identity_id ELSE c.seller_identity_id END);
 END CASE;
 IF identity_value IS NULL AND account_value IS NULL THEN RETURN NULL;END IF;
 -- The caller's own block must remain readable for reconciliation and undo.
 -- An incoming block alone cannot reveal a formerly public content target.
 IF p_type NOT IN('hidden_provider','blocked_account','conversation') AND EXISTS(SELECT 1 FROM public.user_blocks b
 WHERE b.blocker_id=account_value AND b.blocked_id=p_actor)
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE b.blocker_id=p_actor AND b.blocked_id=account_value) THEN RETURN NULL;END IF;
 SELECT jsonb_build_object('identity_id',i.id,'display_name',left(coalesce(nullif(ip.display_name,''),nullif(i.display_name,''),'Selqiro'),200),
  'slug',CASE WHEN length(ip.slug)<=512 THEN ip.slug END,
  'avatar_url',CASE WHEN length(ip.avatar_url)<=2048 AND ip.avatar_url~'^(https?://|/api/)' THEN ip.avatar_url END,
  'identity_active',i.status='active') INTO metadata
 FROM public.identities i LEFT JOIN public.identity_profiles ip ON ip.identity_id=i.id WHERE i.id=identity_value;
 IF metadata IS NULL THEN metadata:=jsonb_build_object('identity_id',NULL,'display_name','Selqiro',
 'slug',NULL,'avatar_url',NULL,'identity_active',false);END IF;
 RETURN metadata||jsonb_build_object('account_id',account_value,'target_token',encode(sha256(convert_to(
  jsonb_build_array(p_actor,p_type,p_id,identity_value,account_value)::text,'UTF8')),'hex'));
END $f$;

-- SET holds the referenced content and identity before resolving the binding again.
-- The account-block table is locked only afterwards, matching messaging order.
CREATE FUNCTION provider_controls_private.lock_target(p_actor uuid,p_type text,p_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE identity_value uuid;business_value uuid;
BEGIN
 PERFORM provider_controls_private.validate_target(p_type,p_id);
 PERFORM 1 FROM public.profiles WHERE id=p_actor FOR KEY SHARE;
 CASE p_type
 WHEN 'listing' THEN SELECT identity_id INTO identity_value FROM public.listings WHERE id=p_id::bigint FOR SHARE;
 WHEN 'horse_offer' THEN SELECT identity_id INTO identity_value FROM public.horse_offers WHERE id=p_id::uuid FOR SHARE;
 WHEN 'service' THEN SELECT identity_id INTO identity_value FROM public.services WHERE id=p_id::uuid FOR SHARE;
 WHEN 'profile' THEN identity_value:=p_id::uuid;
 WHEN 'hidden_provider' THEN SELECT provider_identity_id INTO identity_value FROM provider_controls_private.hidden_providers
  WHERE viewer_user_id=p_actor AND provider_identity_id=p_id::uuid;
 ELSE NULL;
 END CASE;
 IF identity_value IS NOT NULL THEN
  SELECT business_account_id INTO business_value FROM public.identities WHERE id=identity_value FOR SHARE;
  IF business_value IS NOT NULL THEN PERFORM 1 FROM public.business_accounts WHERE id=business_value FOR SHARE;END IF;
 END IF;
END $f$;
REVOKE ALL ON FUNCTION provider_controls_private.resolve_target(uuid,text,text),
 provider_controls_private.lock_target(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;

-- COMPONENT 03_reads.sql
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

-- COMPONENT 04_actions.sql
CREATE FUNCTION public.set_my_provider_control_v1(p_expected_user_id uuid,p_target_type text,p_target_id text,p_action text,
 p_expected_target_token text,p_expected_revision uuid DEFAULT NULL,p_next_revision uuid DEFAULT NULL,
 p_expected_block_id text DEFAULT NULL,p_expected_block_created_at timestamptz DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE actor uuid:=provider_controls_private.require_actor(p_expected_user_id);target jsonb;state jsonb;
 identity_value uuid;account_value uuid;h provider_controls_private.hidden_providers%ROWTYPE;b public.user_blocks%ROWTYPE;
 read_time timestamptz;changed boolean:=false;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'provider_control_read_committed_required' USING ERRCODE='22023';END IF;
 IF p_action IS NULL OR p_action NOT IN('hide','unhide','block','unblock') OR p_expected_target_token IS NULL
 OR p_expected_target_token!~'^[0-9a-f]{64}$' OR (p_target_type='hidden_provider' AND p_action<>'unhide')
 OR (p_target_type='blocked_account' AND p_action<>'unblock') OR p_target_type='conversation' THEN
  RAISE EXCEPTION 'provider_control_action_invalid' USING ERRCODE='22023';END IF;
 IF p_action IN('hide','unhide') THEN
  IF p_next_revision IS NULL OR p_next_revision='00000000-0000-0000-0000-000000000000'::uuid
  OR p_next_revision=p_expected_revision OR p_expected_block_id IS NOT NULL OR p_expected_block_created_at IS NOT NULL THEN
   RAISE EXCEPTION 'provider_control_revision_invalid' USING ERRCODE='22023';END IF;
 ELSE
  IF p_expected_revision IS NOT NULL OR p_next_revision IS NOT NULL
  OR ((p_expected_block_id IS NULL)<>(p_expected_block_created_at IS NULL))
  OR (p_expected_block_created_at IS NOT NULL AND NOT isfinite(p_expected_block_created_at)) THEN
   RAISE EXCEPTION 'provider_control_block_input_invalid' USING ERRCODE='22023';END IF;
  IF p_expected_block_id IS NOT NULL THEN PERFORM provider_controls_private.validate_target('blocked_account',p_expected_block_id);END IF;
  IF p_action='unblock' AND p_expected_block_id IS NULL THEN
   RAISE EXCEPTION 'provider_control_block_input_invalid' USING ERRCODE='22023';END IF;
 END IF;
 PERFORM provider_controls_private.lock_target(actor,p_target_type,p_target_id);
 -- A bounded table lock is the existing account-block serialization contract.
 IF p_action IN('block','unblock') THEN LOCK TABLE public.user_blocks IN SHARE ROW EXCLUSIVE MODE;
 ELSE LOCK TABLE public.user_blocks IN SHARE MODE;END IF;
 target:=provider_controls_private.resolve_target(actor,p_target_type,p_target_id);
 IF target IS NULL THEN RAISE EXCEPTION 'provider_control_unavailable' USING ERRCODE='42501';END IF;
 IF target->>'target_token' IS DISTINCT FROM p_expected_target_token THEN
  RAISE EXCEPTION 'provider_control_target_conflict' USING ERRCODE='40001';END IF;
 identity_value:=(target->>'identity_id')::uuid;account_value:=(target->>'account_id')::uuid;
 IF p_action IN('hide','unhide') THEN
  IF identity_value IS NULL THEN RAISE EXCEPTION 'provider_control_unavailable' USING ERRCODE='42501';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('selqiro-provider-control:'||actor::text||':'||identity_value::text,0));
  SELECT * INTO h FROM provider_controls_private.hidden_providers WHERE viewer_user_id=actor AND provider_identity_id=identity_value FOR UPDATE;
  read_time:=clock_timestamp();
  state:=provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time);
  IF p_action='hide' AND NOT (state->>'can_hide')::boolean THEN
   RAISE EXCEPTION 'provider_control_unavailable' USING ERRCODE='42501';END IF;
  -- Exact replay never restarts the clock. A new generation requires its own CAS.
  IF h.revision=p_next_revision AND ((p_action='hide' AND h.hidden_until IS NOT NULL) OR (p_action='unhide' AND h.hidden_until IS NULL)) THEN NULL;
  ELSE
   IF h.revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'provider_control_conflict' USING ERRCODE='40001';END IF;
   IF (p_action='hide' AND NOT coalesce(h.hidden_until>read_time,false)) OR (p_action='unhide' AND h.hidden_until IS NOT NULL) THEN
    INSERT INTO provider_controls_private.hidden_providers(viewer_user_id,provider_identity_id,revision,hidden_until)
    VALUES(actor,identity_value,p_next_revision,CASE WHEN p_action='hide' THEN read_time+interval '24 hours' END)
    ON CONFLICT(viewer_user_id,provider_identity_id) DO UPDATE SET revision=EXCLUDED.revision,hidden_until=EXCLUDED.hidden_until;
    changed:=true;
   END IF;
  END IF;
 ELSE
  read_time:=clock_timestamp();state:=provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time);
  IF NOT (state->>'can_block')::boolean THEN RAISE EXCEPTION 'provider_control_unavailable' USING ERRCODE='42501';END IF;
  SELECT * INTO b FROM public.user_blocks WHERE blocker_id=actor AND blocked_id=account_value;
  IF p_action='block' THEN
   IF b.id IS NULL AND p_expected_block_id IS NOT NULL THEN RAISE EXCEPTION 'provider_control_conflict' USING ERRCODE='40001';END IF;
   IF b.id IS NOT NULL AND p_expected_block_id IS NOT NULL
   AND (b.id::text<>p_expected_block_id OR b.created_at IS DISTINCT FROM p_expected_block_created_at) THEN
    RAISE EXCEPTION 'provider_control_conflict' USING ERRCODE='40001';END IF;
   IF b.id IS NULL THEN INSERT INTO public.user_blocks(blocker_id,blocked_id,created_at) VALUES(actor,account_value,read_time);changed:=true;END IF;
  ELSE
   IF b.id IS NULL OR b.id::text<>p_expected_block_id OR b.created_at IS DISTINCT FROM p_expected_block_created_at THEN
    RAISE EXCEPTION 'provider_control_conflict' USING ERRCODE='40001';END IF;
   DELETE FROM public.user_blocks WHERE id=b.id AND blocker_id=actor AND blocked_id=account_value AND created_at=p_expected_block_created_at;
   changed:=FOUND;
  END IF;
 END IF;
 RETURN provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time)||jsonb_build_object('action',p_action,'changed',changed);
END $f$;
REVOKE ALL ON FUNCTION public.set_my_provider_control_v1(uuid,text,text,text,text,uuid,uuid,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.set_my_provider_control_v1(uuid,text,text,text,text,uuid,uuid,text,timestamptz) TO authenticated;

-- COMPONENT 05_search_ordinary_v1.sql
-- Retained filters, wire, ordering and public grants; preference before count/page.
CREATE OR REPLACE FUNCTION public.search_public_listings_v1(
  p_search_query text default '',
  p_category text default null,
  p_subcategory text default null,
  p_detail_category text default null,
  p_condition text default null,
  p_location_query text default '',
  p_result_limit integer default 24,
  p_result_offset integer default 0
)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public, auth, pg_temp
-- Optional predicates must be planned using this call's actual search inputs.
-- This setting is local to the function; it does not alter the caller/session default.
set plan_cache_mode = force_custom_plan
as $function$
declare
  v_query text := btrim(coalesce(p_search_query, ''));
  v_location text := btrim(coalesce(p_location_query, ''));
  v_category text := nullif(btrim(p_category), '');
  v_subcategory text := nullif(btrim(p_subcategory), '');
  v_detail text := nullif(btrim(p_detail_category), '');
  v_condition text := nullif(btrim(p_condition), '');
  v_actor uuid := auth.uid();
  v_tsquery tsquery;
  v_result jsonb;
begin
  if char_length(v_query) > 160 or char_length(v_location) > 160 then
    raise exception 'listing_search_text_too_long' using errcode = '22023';
  end if;
  if p_result_limit is null or p_result_limit < 1 or p_result_limit > 60
    or p_result_offset is null or p_result_offset < 0 or p_result_offset > 100000 then
    raise exception 'listing_search_pagination_invalid' using errcode = '22023';
  end if;
  if (v_category is not null and (char_length(v_category) > 120 or v_category !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and (char_length(v_subcategory) > 160 or v_subcategory !~ '^[a-z][a-z0-9_]*$'))
    or (v_detail is not null and (char_length(v_detail) > 160 or v_detail !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and v_category is null)
    or (v_detail is not null and v_subcategory is null) then
    raise exception 'listing_search_category_path_invalid' using errcode = '22023';
  end if;
  if v_condition is not null and v_condition not in ('new', 'used', 'damaged') then
    raise exception 'listing_search_condition_invalid' using errcode = '22023';
  end if;
  -- Plain words are ANDed. No user-controlled SQL, FTS syntax or implicit AI query.
  -- The old search_vector contains raw location and arbitrary details: do not use it.
  v_tsquery := plainto_tsquery('pg_catalog.simple'::regconfig, v_query);
  with viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=v_actor AND hidden_until>statement_timestamp()), matched as materialized (
    select l.id, l.created_at, l.title, left(l.description, 280) as description_preview,
      l.price, l.price_amount, l.category, l.subcategory, l.condition, l.country, l.city,
      case when jsonb_typeof(l.details -> 'detailCategory') = 'string'
        then l.details ->> 'detailCategory' else null end as detail_category,
      l.image as fallback_image, ip.display_name as seller_name, ip.slug as seller_slug,
      ip.avatar_url as seller_avatar_url, i.type as seller_type
    from public.listings l
    join public.identities i on i.id = l.identity_id and i.status = 'active'
    join public.identity_profiles ip on ip.identity_id = i.id
    where NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=l.identity_id) and l.status = 'active'
      and (l.active_until is null or l.active_until > now())
      and (v_query = '' or
        public.public_listing_search_document_v1(l.title, l.description, l.category, l.subcategory, l.details) @@ v_tsquery)
      and (v_category is null or l.category = v_category)
      and (v_subcategory is null or l.subcategory = v_subcategory)
      and (v_detail is null or (jsonb_typeof(l.details -> 'detailCategory') = 'string'
        and l.details ->> 'detailCategory' = v_detail))
      and (v_condition is null or l.condition = v_condition)
      and (v_location = '' or strpos(lower(coalesce(l.city, '') || ' ' || coalesce(l.country, '')), lower(v_location)) > 0)
      -- Preserve the existing account-block meaning, now before count/pagination.
      -- This is not a new business/identity-level block policy.
      and not exists (
        select 1 from public.user_blocks b
        where v_actor is not null and (
          (b.blocker_id = v_actor and b.blocked_id = l.user_id)
          or (b.blocked_id = v_actor and b.blocker_id = l.user_id)
        )
      )
  ), page as (
    select m.* from matched m
    order by m.created_at desc, m.id desc
    limit p_result_limit offset p_result_offset
  ), cards as (
    select p.id, p.created_at, jsonb_build_object(
      'content_type', 'listing', 'content_id', p.id::text,
      'title', p.title, 'description_preview', p.description_preview,
      'price', p.price,
      'price_amount', case when p.price_amount >= 0 and p.price_amount::text not in ('NaN','Infinity','-Infinity')
        then p.price_amount::text else null end,
      -- Legacy listings have no canonical currency column. Never invent EUR.
      'currency', null,
      'category', p.category, 'subcategory', p.subcategory,
      'detail_category', p.detail_category, 'condition', p.condition,
      'country', p.country, 'city', p.city,
      'image_url', coalesce(img.thumb_url, img.medium_url, img.original_url, p.fallback_image),
      'seller_name', p.seller_name, 'seller_slug', p.seller_slug,
      'seller_avatar_url', p.seller_avatar_url, 'seller_type', p.seller_type,
      'created_at', p.created_at
    ) as card
    from page p
    left join lateral (
      select li.thumb_url, li.medium_url, li.original_url from public.listing_images li
      where li.listing_id = p.id
      order by li.is_primary desc nulls last, li.sort_order asc nulls last,
        li.created_at asc nulls last, li.id asc
      limit 1
    ) img on true
  ), totals as (select count(*) as n from matched)
  select jsonb_build_object(
    'schema_version', 1, 'content_scope', 'ordinary_listings', 'sort', 'newest',
    'items', coalesce((select jsonb_agg(c.card order by c.created_at desc, c.id desc) from cards c), '[]'::jsonb),
    'total_count', t.n::text, 'result_limit', p_result_limit, 'result_offset', p_result_offset,
    'has_more', t.n > p_result_offset::bigint + p_result_limit,
    'next_offset', case when t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit <= 100000 then p_result_offset + p_result_limit else null end,
    'window_limit_reached', t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit > 100000
  ) into v_result from totals t;
  return v_result;
end;
$function$;

-- COMPONENT 06_search_ordinary_v2.sql
-- Retained filters, wire, ordering and public grants; preference before count/page.
CREATE OR REPLACE FUNCTION public.search_public_listings_v2(p_search_query text DEFAULT ''::text, p_category text DEFAULT NULL::text, p_subcategory text DEFAULT NULL::text, p_detail_category text DEFAULT NULL::text, p_condition text DEFAULT NULL::text, p_location_query text DEFAULT ''::text, p_result_limit integer DEFAULT 24, p_result_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
declare
  v_query text := btrim(coalesce(p_search_query, ''));
  v_location text := btrim(coalesce(p_location_query, ''));
  v_category text := nullif(btrim(p_category), '');
  v_subcategory text := nullif(btrim(p_subcategory), '');
  v_detail text := nullif(btrim(p_detail_category), '');
  v_condition text := nullif(btrim(p_condition), '');
  v_actor uuid := public.listing_actor_uid_hosted_v1();
  v_tsquery tsquery;
  v_result jsonb;
begin
  if char_length(v_query) > 160 or char_length(v_location) > 160 then
    raise exception 'listing_search_text_too_long' using errcode = '22023';
  end if;
  if p_result_limit is null or p_result_limit < 1 or p_result_limit > 60
    or p_result_offset is null or p_result_offset < 0 or p_result_offset > 100000 then
    raise exception 'listing_search_pagination_invalid' using errcode = '22023';
  end if;
  if (v_category is not null and (char_length(v_category) > 120 or v_category !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and (char_length(v_subcategory) > 160 or v_subcategory !~ '^[a-z][a-z0-9_]*$'))
    or (v_detail is not null and (char_length(v_detail) > 160 or v_detail !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and v_category is null)
    or (v_detail is not null and v_subcategory is null) then
    raise exception 'listing_search_category_path_invalid' using errcode = '22023';
  end if;
  if v_condition is not null and v_condition not in ('new', 'used', 'damaged') then
    raise exception 'listing_search_condition_invalid' using errcode = '22023';
  end if;
  -- Plain words are ANDed. No user-controlled SQL, FTS syntax or implicit AI query.
  -- The old search_vector contains raw location and arbitrary details: do not use it.
  v_tsquery := plainto_tsquery('pg_catalog.simple'::regconfig, v_query);
  with viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=v_actor AND hidden_until>statement_timestamp()), matched as materialized (
    select l.id, l.created_at, l.title, left(l.description, 280) as description_preview,
      l.price, l.price_amount, l.price_kind, l.currency, l.price_revision, l.category, l.subcategory, l.condition, l.country, l.city,
      case when jsonb_typeof(l.details -> 'detailCategory') = 'string'
        then l.details ->> 'detailCategory' else null end as detail_category,
      l.image as fallback_image, ip.display_name as seller_name, ip.slug as seller_slug,
      ip.avatar_url as seller_avatar_url, i.type as seller_type
    from public.listings l
    join public.identities i on i.id = l.identity_id and i.status = 'active'
    join public.identity_profiles ip on ip.identity_id = i.id
    where NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=l.identity_id) and l.status = 'active'
      and (l.active_until is null or l.active_until > now())
      and (v_query = '' or
        public.public_listing_search_document_v1(l.title, l.description, l.category, l.subcategory, l.details) @@ v_tsquery)
      and (v_category is null or l.category = v_category)
      and (v_subcategory is null or l.subcategory = v_subcategory)
      and (v_detail is null or (jsonb_typeof(l.details -> 'detailCategory') = 'string'
        and l.details ->> 'detailCategory' = v_detail))
      and (v_condition is null or l.condition = v_condition)
      and (v_location = '' or strpos(lower(coalesce(l.city, '') || ' ' || coalesce(l.country, '')), lower(v_location)) > 0)
      -- Preserve the existing account-block meaning, now before count/pagination.
      -- This is not a new business/identity-level block policy.
      and not exists (
        select 1 from public.user_blocks b
        where v_actor is not null and (
          (b.blocker_id = v_actor and b.blocked_id = l.user_id)
          or (b.blocked_id = v_actor and b.blocker_id = l.user_id)
        )
      )
  ), page as (
    select m.* from matched m
    order by m.created_at desc, m.id desc
    limit p_result_limit offset p_result_offset
  ), cards as (
    select p.id, p.created_at, jsonb_build_object(
      'content_type', 'listing', 'content_id', p.id::text,
      'title', p.title, 'description_preview', p.description_preview,
      'price', public.listing_price_read_model_v1(p.price_kind,p.price_amount,
        p.currency,p.price_revision,p.price),
      'category', p.category, 'subcategory', p.subcategory,
      'detail_category', p.detail_category, 'condition', p.condition,
      'country', p.country, 'city', p.city,
      'image_url', coalesce(img.thumb_url, img.medium_url, img.original_url, p.fallback_image),
      'seller_name', p.seller_name, 'seller_slug', p.seller_slug,
      'seller_avatar_url', p.seller_avatar_url, 'seller_type', p.seller_type,
      'created_at', p.created_at
    ) as card
    from page p
    left join lateral (
      select li.thumb_url, li.medium_url, li.original_url from public.listing_images li
      where li.listing_id = p.id
      order by li.is_primary desc nulls last, li.sort_order asc nulls last,
        li.created_at asc nulls last, li.id asc
      limit 1
    ) img on true
  ), totals as (select count(*) as n from matched)
  select jsonb_build_object(
    'schema_version', 2, 'content_scope', 'ordinary_listings', 'sort', 'newest',
    'items', coalesce((select jsonb_agg(c.card order by c.created_at desc, c.id desc) from cards c), '[]'::jsonb),
    'total_count', t.n::text, 'result_limit', p_result_limit, 'result_offset', p_result_offset,
    'has_more', t.n > p_result_offset::bigint + p_result_limit,
    'next_offset', case when t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit <= 100000 then p_result_offset + p_result_limit else null end,
    'window_limit_reached', t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit > 100000
  ) into v_result from totals t;
  return v_result;
end;
$function$;

-- COMPONENT 07_search_marketplace.sql
CREATE OR REPLACE FUNCTION public.search_public_marketplace_v1(p_search_query text DEFAULT '',p_category text DEFAULT NULL,
 p_subcategory text DEFAULT NULL,p_detail_category text DEFAULT NULL,p_condition text DEFAULT NULL,
 p_location_query text DEFAULT '',p_result_limit integer DEFAULT 24,p_result_offset integer DEFAULT 0,
 p_identity_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET plan_cache_mode='force_custom_plan' AS $f$
DECLARE q text:=btrim(coalesce(p_search_query,''));loc text:=btrim(coalesce(p_location_query,''));
 cat text:=nullif(btrim(p_category),'');sub text:=nullif(btrim(p_subcategory),'');
 detail text:=nullif(btrim(p_detail_category),'');cond text:=nullif(btrim(p_condition),'');
 actor uuid:=public.listing_actor_uid_hosted_v1();query tsquery;result jsonb;
BEGIN
 IF char_length(q)>160 OR char_length(loc)>160 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 60
  OR p_result_offset IS NULL OR p_result_offset NOT BETWEEN 0 AND 100000 THEN
  RAISE EXCEPTION 'marketplace_search_input' USING ERRCODE='22023'; END IF;
 IF (cat IS NOT NULL AND (length(cat)>120 OR cat!~'^[a-z][a-z0-9_]*$'))
  OR (sub IS NOT NULL AND (length(sub)>160 OR sub!~'^[a-z][a-z0-9_]*$' OR cat IS NULL))
  OR (detail IS NOT NULL AND (length(detail)>160 OR detail!~'^[a-z][a-z0-9_]*$' OR sub IS NULL))
  OR (cond IS NOT NULL AND cond NOT IN('new','used','damaged'))
  OR (cat='horses' AND (detail IS NOT NULL OR (sub IS NOT NULL AND sub NOT IN('sale','free_transfer','lease','co_rider','wanted')))) THEN
  RAISE EXCEPTION 'marketplace_search_filters' USING ERRCODE='22023'; END IF;
 query:=plainto_tsquery('pg_catalog.simple'::regconfig,q);
 WITH viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=actor AND hidden_until>statement_timestamp()), ordinary AS MATERIALIZED(
  SELECT 'listing'::text content_type,l.id::text content_id,l.id numeric_id,NULL::uuid horse_id,l.created_at,
   jsonb_build_object('content_type','listing','content_id',l.id::text,'offer_type',NULL,
    'title',l.title,'description_preview',left(l.description,280),
    'price',public.listing_price_read_model_v1(l.price_kind,l.price_amount,l.currency,l.price_revision,l.price),
    'category',l.category,'subcategory',l.subcategory,
    'detail_category',CASE WHEN jsonb_typeof(l.details->'detailCategory')='string' THEN l.details->>'detailCategory' END,
    'condition',l.condition,'country',l.country,'city',l.city,
    'image_url',coalesce(img.thumb_url,img.medium_url,img.original_url,l.image),
    'seller_name',ip.display_name,'seller_slug',ip.slug,'seller_avatar_url',ip.avatar_url,'seller_type',i.type,'created_at',l.created_at) card
  FROM public.listings l JOIN public.identities i ON i.id=l.identity_id AND i.status='active'
  JOIN public.identity_profiles ip ON ip.identity_id=i.id
  LEFT JOIN LATERAL(SELECT li.thumb_url,li.medium_url,li.original_url FROM public.listing_images li WHERE li.listing_id=l.id
   ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,li.created_at ASC NULLS LAST,li.id LIMIT 1) img ON true
  WHERE NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=l.identity_id) AND l.status='active' AND (l.active_until IS NULL OR l.active_until>now())
   AND (p_identity_id IS NULL OR l.identity_id=p_identity_id)
   AND (q='' OR public.public_listing_search_document_v1(l.title,l.description,l.category,l.subcategory,l.details)@@query)
   AND (cat IS NULL OR l.category=cat) AND (sub IS NULL OR l.subcategory=sub)
   AND (detail IS NULL OR (jsonb_typeof(l.details->'detailCategory')='string' AND l.details->>'detailCategory'=detail))
   AND (cond IS NULL OR l.condition=cond)
   AND (loc='' OR strpos(lower(coalesce(l.city,'')||' '||coalesce(l.country,'')),lower(loc))>0)
   AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL AND
    ((b.blocker_id=actor AND b.blocked_id=l.user_id) OR (b.blocked_id=actor AND b.blocker_id=l.user_id)))
 ), horses AS MATERIALIZED(
  SELECT 'horse_offer'::text content_type,h.id::text content_id,NULL::bigint numeric_id,h.id horse_id,h.created_at,
   jsonb_build_object('content_type','horse_offer','content_id',h.id,'offer_type',h.offer_type,
    'title',h.title,'description_preview',left(h.description,280),'price',horse_publication_private.public_price(h),
    'category','horses','subcategory',h.offer_type,'detail_category',NULL,'condition',NULL,'country','EE',
    'city',CASE WHEN h.offer_type='wanted' THEN h.details#>>'{wanted,search_area,city_or_municipality}' ELSE h.city END,
    'image_url',img.original_url,'seller_name',ip.display_name,'seller_slug',ip.slug,
    'seller_avatar_url',ip.avatar_url,'seller_type',i.type,'created_at',h.created_at) card
  FROM public.horse_offers h JOIN public.identities i ON i.id=h.identity_id AND i.status='active'
  JOIN public.identity_profiles ip ON ip.identity_id=i.id
  LEFT JOIN LATERAL(SELECT im.original_url FROM public.horse_offer_images im WHERE im.horse_offer_id=h.id
   ORDER BY im.is_primary DESC,im.sort_order,im.created_at,im.id LIMIT 1) img ON true
  WHERE NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=h.identity_id) AND horse_publication_private.is_public(h.id) AND (p_identity_id IS NULL OR h.identity_id=p_identity_id)
   AND (cat IS NULL OR cat='horses') AND (sub IS NULL OR h.offer_type=sub) AND detail IS NULL AND cond IS NULL
   AND (q='' OR to_tsvector('pg_catalog.simple'::regconfig,coalesce(h.title,'')||' '||coalesce(h.description,'')||' '||
    coalesce(h.breed,'')||' '||coalesce(h.discipline,'')||' '||coalesce(h.details#>>'{wanted,preferred_breed}',''))@@query)
   AND (loc='' OR strpos(lower(CASE WHEN h.offer_type='wanted' THEN coalesce(h.details#>>'{wanted,search_area,city_or_municipality}','')
     ELSE coalesce(h.city,'') END||' EE'),lower(loc))>0)
   AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL AND
    ((b.blocker_id=actor AND b.blocked_id=h.created_by_user_id) OR (b.blocked_id=actor AND b.blocker_id=h.created_by_user_id)))
 ), matched AS MATERIALIZED(SELECT * FROM ordinary UNION ALL SELECT * FROM horses),
 page AS(SELECT * FROM matched ORDER BY created_at DESC,content_type,numeric_id DESC,horse_id DESC LIMIT p_result_limit OFFSET p_result_offset),
 totals AS(SELECT count(*) n FROM matched)
 SELECT jsonb_build_object('schema_version',1,'content_scope','marketplace','sort','newest',
  'items',coalesce((SELECT jsonb_agg(card ORDER BY created_at DESC,content_type,numeric_id DESC,horse_id DESC) FROM page),'[]'::jsonb),
  'total_count',n::text,'result_limit',p_result_limit,'result_offset',p_result_offset,
  'has_more',n>p_result_offset::bigint+p_result_limit,
  'next_offset',CASE WHEN n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit<=100000 THEN p_result_offset+p_result_limit END,
  'window_limit_reached',n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit>100000)
 INTO result FROM totals;
 RETURN result;
END $f$;

-- COMPONENT 08_search_services.sql
CREATE OR REPLACE FUNCTION public.search_public_services_v1(p_query text DEFAULT '',p_category text DEFAULT NULL,p_subcategory text DEFAULT NULL,
 p_country text DEFAULT NULL,p_city text DEFAULT NULL,p_result_limit integer DEFAULT 24,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE items jsonb;total bigint;query text:=lower(btrim(coalesce(p_query,'')));
BEGIN
 IF length(query)>300 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 100 OR p_result_offset IS NULL
 OR p_result_offset<0 OR p_result_offset>1000000 OR length(p_category)>120 OR length(p_subcategory)>160
 OR length(p_country)>120 OR length(p_city)>160 THEN RAISE EXCEPTION 'service_search_invalid' USING ERRCODE='22023';END IF;
 WITH viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=public.listing_actor_uid_hosted_v1() AND hidden_until>statement_timestamp()), candidates AS MATERIALIZED(SELECT s.* FROM public.services s WHERE NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=s.identity_id) AND service_publication_private.is_public(s.id) AND service_publication_private.visible_to_viewer(s.id)
 AND (nullif(btrim(p_category),'') IS NULL OR s.category=btrim(p_category))
 AND (nullif(btrim(p_subcategory),'') IS NULL OR s.subcategory=btrim(p_subcategory))
 AND (nullif(btrim(p_country),'') IS NULL OR lower(s.country)=lower(btrim(p_country)))
 AND (nullif(btrim(p_city),'') IS NULL OR lower(s.city)=lower(btrim(p_city)))
 AND (query='' OR NOT EXISTS(SELECT 1 FROM regexp_split_to_table(query,'\s+') token
 WHERE token<>'' AND position(token IN lower(concat_ws(' ',s.title,s.description,s.category,s.subcategory,s.country,s.city,s.location)))=0))),
 page AS(SELECT * FROM candidates ORDER BY published_at DESC,created_at DESC,id LIMIT p_result_limit OFFSET p_result_offset)
 SELECT (SELECT count(*) FROM candidates),coalesce((SELECT jsonb_agg(service_publication_private.public_fields(p)
 ORDER BY p.published_at DESC,p.created_at DESC,p.id) FROM page p),'[]'::jsonb) INTO total,items;
 RETURN jsonb_build_object('schema_version',1,'items',items,'total_count',total::text,'result_limit',p_result_limit,
 'result_offset',p_result_offset,'has_more',p_result_offset+jsonb_array_length(items)<total,
 'next_offset',CASE WHEN p_result_offset+jsonb_array_length(items)<total THEN p_result_offset+jsonb_array_length(items) ELSE NULL END);
END $f$;

-- COMPONENT 09_public_profile.sql
-- Select the same canonical/legacy slug candidate first. A blocked selected
-- profile must not fall through to another account's coinciding legacy alias.
-- Temporary discovery hiding never affects direct profile access.
CREATE OR REPLACE FUNCTION public.get_store_by_slug(store_slug_input text)
RETURNS TABLE(identity_profile_id uuid,identity_id uuid,identity_type text,business_account_id uuid,
 display_name text,slug text,bio text,avatar_url text,banner_url text,banner_dominant_color text,
 contact_phone text,contact_email text,website_url text,address_text text,city text,country text,
 lat double precision,lng double precision,location_visibility text,legacy_user_id uuid,is_premium boolean)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp AS $f$
 WITH selected AS MATERIALIZED(
  SELECT ip.id identity_profile_id,i.id identity_id,i.type identity_type,i.business_account_id,
   ip.display_name,ip.slug,coalesce(ip.bio,p.bio) bio,coalesce(ip.avatar_url,p.avatar_url) avatar_url,
   coalesce(ip.banner_url,p.banner_url) banner_url,coalesce(ip.banner_dominant_color,p.banner_dominant_color) banner_dominant_color,
   ip.contact_phone,ip.contact_email,ip.website_url,ip.address_text,ip.city,ip.country,
   ip.lat,ip.lng,ip.location_visibility,i.user_id legacy_user_id,coalesce(p.is_premium,false) is_premium,
   CASE WHEN i.type='private' THEN i.user_id ELSE business.owner_user_id END block_account_id
  FROM public.identity_profiles ip JOIN public.identities i ON i.id=ip.identity_id
  LEFT JOIN public.profiles p ON p.id=i.user_id
  LEFT JOIN public.business_accounts business ON business.id=i.business_account_id
  WHERE ip.slug=store_slug_input OR p.store_slug=store_slug_input
  ORDER BY CASE WHEN ip.slug=store_slug_input THEN 0 ELSE 1 END LIMIT 1
 )
 SELECT s.identity_profile_id,s.identity_id,s.identity_type,s.business_account_id,s.display_name,s.slug,s.bio,
 s.avatar_url,s.banner_url,s.banner_dominant_color,s.contact_phone,s.contact_email,s.website_url,s.address_text,
 s.city,s.country,s.lat,s.lng,s.location_visibility,s.legacy_user_id,s.is_premium FROM selected s
 WHERE NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
 AND ((b.blocker_id=auth.uid() AND b.blocked_id=s.block_account_id)
 OR (b.blocked_id=auth.uid() AND b.blocker_id=s.block_account_id)));
$f$;

-- COMPONENT 10_legacy_search.sql
-- Existing legacy wires and sorting; filters now run before page selection.
CREATE OR REPLACE FUNCTION "public"."get_marketplace_listings"("result_limit" integer DEFAULT 30, "result_offset" integer DEFAULT 0) RETURNS TABLE("listing_id" bigint, "user_id" "uuid", "identity_id" "uuid", "seller_name" "text", "seller_slug" "text", "seller_type" "text", "is_premium" boolean, "title" "text", "description" "text", "price" "text", "price_amount" numeric, "image" "text", "category" "text", "subcategory" "text", "condition" "text", "country" "text", "city" "text", "location" "text", "listing_lat" double precision, "listing_lng" double precision, "search_text" "text", "details" "jsonb", "active_until" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=auth.uid() AND hidden_until>statement_timestamp())
  select
    l.id,
    l.user_id,
    l.identity_id,

    ip.display_name,
    ip.slug,
    i.type,
    coalesce(p.is_premium, false),

    l.title,
    l.description,
    l.price,
    l.price_amount,
    coalesce(li.thumb_url, li.medium_url, li.original_url, l.image),

    l.category,
    l.subcategory,
    l.condition,

    l.country,
    l.city,
    l.location,
    l.listing_lat,
    l.listing_lng,

    l.search_text,
    l.details,

    l.active_until,
    l.created_at

  from listings l
  join identities i
    on i.id = l.identity_id
  join identity_profiles ip
    on ip.identity_id = i.id
  left join profiles p
    on p.id = i.user_id
  left join lateral (
    select thumb_url, medium_url, original_url
    from listing_images
    where listing_id = l.id
    order by is_primary desc, sort_order asc, created_at asc
    limit 1
  ) li on true
  where NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=l.identity_id)
    AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
     AND ((b.blocker_id=auth.uid() AND b.blocked_id=l.user_id) OR (b.blocked_id=auth.uid() AND b.blocker_id=l.user_id)))
    AND l.status = 'active'
    and (
      l.active_until is null
      or l.active_until > now()
    )
  order by l.created_at desc
  limit result_limit
  offset result_offset;
$$;

CREATE OR REPLACE FUNCTION "public"."get_marketplace_listings_nearby"("center_lat" double precision DEFAULT NULL::double precision, "center_lng" double precision DEFAULT NULL::double precision, "result_limit" integer DEFAULT 30, "result_offset" integer DEFAULT 0) RETURNS TABLE("listing_id" bigint, "user_id" "uuid", "identity_id" "uuid", "seller_name" "text", "seller_slug" "text", "seller_type" "text", "is_premium" boolean, "title" "text", "description" "text", "price" "text", "price_amount" numeric, "image" "text", "category" "text", "subcategory" "text", "condition" "text", "country" "text", "city" "text", "location" "text", "listing_lat" double precision, "listing_lng" double precision, "search_text" "text", "details" "jsonb", "distance_km" double precision, "active_until" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=auth.uid() AND hidden_until>statement_timestamp())
  select
    l.id,
    l.user_id,
    l.identity_id,
    ip.display_name,
    ip.slug,
    i.type,
    coalesce(p.is_premium, false),
    l.title,
    l.description,
    l.price,
    l.price_amount,
    coalesce(li.thumb_url, li.medium_url, li.original_url, l.image),
    l.category,
    l.subcategory,
    l.condition,
    l.country,
    l.city,
    l.location,
    l.listing_lat,
    l.listing_lng,
    l.search_text,
    l.details,
    case
      when center_lat is not null
       and center_lng is not null
       and l.listing_lat is not null
       and l.listing_lng is not null
      then 6371 * 2 * asin(
        sqrt(
          power(sin(radians(l.listing_lat - center_lat) / 2), 2) +
          cos(radians(center_lat)) *
          cos(radians(l.listing_lat)) *
          power(sin(radians(l.listing_lng - center_lng) / 2), 2)
        )
      )
      else null
    end as distance_km,
    l.active_until,
    l.created_at
  from listings l
  join identities i on i.id = l.identity_id
  join identity_profiles ip on ip.identity_id = i.id
  left join profiles p on p.id = l.user_id
  left join lateral (
    select thumb_url, medium_url, original_url
    from listing_images
    where listing_id = l.id
    order by is_primary desc, sort_order asc, created_at asc
    limit 1
  ) li on true
  where NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=l.identity_id)
    AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
     AND ((b.blocker_id=auth.uid() AND b.blocked_id=l.user_id) OR (b.blocked_id=auth.uid() AND b.blocker_id=l.user_id)))
    AND l.status = 'active'
    and (l.active_until is null or l.active_until > now())
  order by
    case when center_lat is not null and center_lng is not null then
      case
        when l.listing_lat is null or l.listing_lng is null then 1
        else 0
      end
    else 0 end,
    distance_km asc nulls last,
    l.created_at desc
  limit result_limit
  offset result_offset;
$$;

-- COMPONENT 11_legacy_feed.sql
-- A narrow own-preference projection for an invoker view. The unauthenticated
-- viewer gets no identities. It grants no direct access to the private table.
CREATE FUNCTION public.hidden_provider_ids_for_viewer_v1() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT h.provider_identity_id FROM provider_controls_private.hidden_providers h
 WHERE h.viewer_user_id=auth.uid() AND h.hidden_until>statement_timestamp();
$f$;
REVOKE ALL ON FUNCTION public.hidden_provider_ids_for_viewer_v1() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.hidden_provider_ids_for_viewer_v1() TO anon,authenticated;

-- Top-level l.* retains the underlying FK column lineage for PostgREST embeds.
-- RLS and table grants are those of the real invoker, never the view owner.
CREATE VIEW public.discovery_listings_v1 WITH(security_invoker=true,security_barrier=true) AS
 WITH viewer_hidden AS MATERIALIZED(SELECT public.hidden_provider_ids_for_viewer_v1() identity_id)
 SELECT l.* FROM public.listings l
 WHERE NOT EXISTS(SELECT 1 FROM viewer_hidden h WHERE h.identity_id=l.identity_id)
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
  AND ((b.blocker_id=auth.uid() AND b.blocked_id=l.user_id) OR (b.blocked_id=auth.uid() AND b.blocker_id=l.user_id)));
REVOKE ALL ON public.discovery_listings_v1 FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.discovery_listings_v1 TO anon,authenticated;

-- Explicit to-many relationships avoid relying on CTE view FK inference.
-- SECURITY INVOKER preserves each related table's real RLS and SELECT grants.
CREATE FUNCTION public.listing_images(p_listing public.discovery_listings_v1) RETURNS SETOF public.listing_images
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT image.* FROM public.listing_images image WHERE image.listing_id=(p_listing).id;
$f$;
CREATE FUNCTION public.listing_translations(p_listing public.discovery_listings_v1) RETURNS SETOF public.listing_translations
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT translation.* FROM public.listing_translations translation WHERE translation.listing_id=(p_listing).id;
$f$;
REVOKE ALL ON FUNCTION public.listing_images(public.discovery_listings_v1),public.listing_translations(public.discovery_listings_v1)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.listing_images(public.discovery_listings_v1),public.listing_translations(public.discovery_listings_v1)
 TO anon,authenticated;

-- COMPONENT 12_block_lookup_index.sql
-- The existing unique (blocker_id,blocked_id) index retains pair uniqueness.
-- Incoming viewer sets also need blocked_id as the leading lookup key.
-- Bounded transactional CREATE INDEX; no content or preference row writes.
CREATE INDEX user_blocks_blocked_blocker_idx_v1 ON public.user_blocks USING btree(blocked_id,blocker_id);
