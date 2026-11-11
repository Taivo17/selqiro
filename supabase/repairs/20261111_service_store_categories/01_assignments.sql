-- Canonical service/category links. Neither FK can delete the referenced service,
-- category or media. Category removal cleans links through its existing RPC.
CREATE TABLE public.service_store_categories (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  store_category_id uuid NOT NULL REFERENCES public.store_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id,store_category_id)
);
ALTER TABLE public.service_store_categories OWNER TO postgres;
CREATE INDEX service_store_categories_category_idx
  ON public.service_store_categories(store_category_id,service_id);
ALTER TABLE public.service_store_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.service_store_categories FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE public.service_store_categories IS
  'Canonical service UUID to identity-scoped shop category. Writes and owner reads only through checked RPCs; public reads through the versioned profile reader.';

CREATE FUNCTION public.get_my_service_store_categories_v1(
  p_service_id uuid,p_expected_identity_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $function$
DECLARE
  v_user uuid:=auth.uid();
  v_active uuid;
  v_identity public.identities%ROWTYPE;
  v_ids uuid[];
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'service_store_category_context_changed' USING ERRCODE='42501';
  END IF;
  IF p_service_id IS NULL OR p_expected_identity_id IS NULL
    OR current_setting('transaction_isolation')<>'read committed' THEN
    RAISE EXCEPTION 'service_store_category_invalid_input' USING ERRCODE='22023';
  END IF;
  -- Match category management/publication lock order: profile, identity,
  -- active membership, service, then (for writes) categories in UUID order.
  SELECT p.active_identity_id INTO v_active FROM public.profiles p
    WHERE p.id=v_user FOR UPDATE;
  IF NOT FOUND OR v_active IS DISTINCT FROM p_expected_identity_id THEN
    RAISE EXCEPTION 'service_store_category_context_changed' USING ERRCODE='42501';
  END IF;
  SELECT i.* INTO v_identity FROM public.identities i WHERE i.id=v_active FOR UPDATE;
  IF NOT FOUND OR v_identity.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'service_store_category_forbidden' USING ERRCODE='42501';
  END IF;
  IF v_identity.type='private' THEN
    IF v_identity.user_id IS DISTINCT FROM v_user THEN
      RAISE EXCEPTION 'service_store_category_forbidden' USING ERRCODE='42501';
    END IF;
  ELSIF v_identity.type='business' THEN
    PERFORM 1 FROM public.business_members m WHERE m.business_account_id=v_identity.business_account_id
      AND m.user_id=v_user AND m.status='active' FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'service_store_category_forbidden' USING ERRCODE='42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'service_store_category_forbidden' USING ERRCODE='42501';
  END IF;
  IF NOT coalesce(public.current_user_has_identity_access(v_active),false) THEN
    RAISE EXCEPTION 'service_store_category_forbidden' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.services h WHERE h.id=p_service_id AND h.identity_id=v_active FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'service_store_category_forbidden' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(array_agg(x.store_category_id ORDER BY x.store_category_id),'{}'::uuid[])
    INTO v_ids FROM public.service_store_categories x
    JOIN public.store_categories c ON c.id=x.store_category_id AND c.identity_id=v_active
    WHERE x.service_id=p_service_id;
  RETURN jsonb_build_object('service_id',p_service_id,'identity_id',v_active,'category_ids',v_ids);
END;
$function$;
ALTER FUNCTION public.get_my_service_store_categories_v1(uuid,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_my_service_store_categories_v1(uuid,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_service_store_categories_v1(uuid,uuid) TO authenticated;

CREATE FUNCTION public.set_my_service_store_categories_v1(
  p_service_id uuid,p_expected_identity_id uuid,p_category_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $function$
DECLARE
  v_context jsonb;
  v_ids uuid[];
  v_count integer;
BEGIN
  -- The owner reader acquires and retains the common authority/service locks
  -- for this transaction; no identity or revision is inferred from the UI.
  v_context:=public.get_my_service_store_categories_v1(p_service_id,p_expected_identity_id);
  IF p_category_ids IS NULL OR coalesce(array_ndims(p_category_ids),1)>1 THEN
    RAISE EXCEPTION 'service_store_category_invalid_input' USING ERRCODE='22023';
  END IF;
  IF array_position(p_category_ids,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'service_store_category_invalid_input' USING ERRCODE='22023';
  END IF;
  SELECT coalesce(array_agg(DISTINCT id ORDER BY id),'{}'::uuid[]) INTO v_ids
    FROM unnest(p_category_ids) ids(id);
  PERFORM c.id FROM public.store_categories c
    WHERE c.id=ANY(v_ids) AND c.identity_id=p_expected_identity_id ORDER BY c.id FOR UPDATE;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>cardinality(v_ids) THEN
    RAISE EXCEPTION 'service_store_category_invalid_selection' USING ERRCODE='22023';
  END IF;
  -- Validate the complete set before touching any links. Empty set clears;
  -- stable links are retained, so a replay is an exact no-op on existing rows.
  DELETE FROM public.service_store_categories x
    WHERE x.service_id=p_service_id AND NOT (x.store_category_id=ANY(v_ids));
  INSERT INTO public.service_store_categories(service_id,store_category_id)
    SELECT p_service_id,id FROM unnest(v_ids) ids(id)
    ON CONFLICT (service_id,store_category_id) DO NOTHING;
  RETURN jsonb_build_object('service_id',p_service_id,'identity_id',p_expected_identity_id,
    'category_ids',v_ids,'assigned_count',cardinality(v_ids));
END;
$function$;
ALTER FUNCTION public.set_my_service_store_categories_v1(uuid,uuid,uuid[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_my_service_store_categories_v1(uuid,uuid,uuid[])
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.set_my_service_store_categories_v1(uuid,uuid,uuid[]) TO authenticated;
COMMENT ON FUNCTION public.set_my_service_store_categories_v1(uuid,uuid,uuid[]) IS
  'Atomically replace the explicit shop-category set of an authorized canonical service; stored active identity and private/business access are checked under shared lock ordering. No content, lifecycle or media write.';
