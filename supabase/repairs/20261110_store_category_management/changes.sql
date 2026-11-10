-- COMPONENT 01_management.sql
-- One owner-confirmed category operation. Existing tables, readers and legacy
-- writers remain intact. The install guard pins their declarations separately.
CREATE FUNCTION public.manage_my_store_category_v1(
  p_expected_user_id uuid,
  p_expected_identity_id uuid,
  p_operation text,
  p_category_id uuid,
  p_parent_id uuid,
  p_name text,
  p_expected_name text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_active uuid;
  v_identity public.identities%ROWTYPE;
  v_category public.store_categories%ROWTYPE;
  v_parent public.store_categories%ROWTYPE;
  v_name text;
  v_sort bigint;
  v_changed boolean := false;
  v_removed integer := 0;
BEGIN
  IF v_user IS NULL OR p_expected_user_id IS DISTINCT FROM v_user
    OR p_expected_identity_id IS NULL THEN
    RAISE EXCEPTION 'store_category_context_changed' USING ERRCODE='42501';
  END IF;
  IF current_setting('transaction_isolation') <> 'read committed'
    OR p_operation IS NULL OR p_operation NOT IN ('create_root','create_child','rename','delete')
    OR p_category_id IS NULL THEN
    RAISE EXCEPTION 'store_category_invalid_input' USING ERRCODE='22023';
  END IF;
  SELECT p.active_identity_id INTO v_active FROM public.profiles p
  WHERE p.id=v_user FOR UPDATE;
  IF NOT FOUND OR v_active IS DISTINCT FROM p_expected_identity_id THEN
    RAISE EXCEPTION 'store_category_context_changed' USING ERRCODE='42501';
  END IF;
  SELECT i.* INTO v_identity FROM public.identities i WHERE i.id=v_active FOR UPDATE;
  IF NOT FOUND OR v_identity.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'store_category_forbidden' USING ERRCODE='42501';
  END IF;
  IF v_identity.type='private' THEN
    IF v_identity.user_id IS DISTINCT FROM v_user THEN
      RAISE EXCEPTION 'store_category_forbidden' USING ERRCODE='42501';
    END IF;
  ELSIF v_identity.type='business' THEN
    PERFORM 1 FROM public.business_members m
    WHERE m.business_account_id=v_identity.business_account_id AND m.user_id=v_user
      AND m.status='active' FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'store_category_forbidden' USING ERRCODE='42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'store_category_forbidden' USING ERRCODE='42501';
  END IF;
  IF NOT coalesce(public.current_user_has_identity_access(v_active),false) THEN
    RAISE EXCEPTION 'store_category_forbidden' USING ERRCODE='42501';
  END IF;

  IF p_operation IN ('create_root','create_child','rename') THEN
    v_name := btrim(regexp_replace(coalesce(p_name,''),'[[:space:]]+',' ','g'));
    IF char_length(v_name) NOT BETWEEN 1 AND 60 THEN
      RAISE EXCEPTION 'store_category_invalid_input' USING ERRCODE='22023';
    END IF;
  END IF;
  IF p_operation IN ('create_root','create_child') THEN
    IF p_expected_name IS NOT NULL
      OR (p_operation='create_root' AND p_parent_id IS NOT NULL)
      OR (p_operation='create_child' AND p_parent_id IS NULL)
      OR p_parent_id=p_category_id THEN
      RAISE EXCEPTION 'store_category_invalid_input' USING ERRCODE='22023';
    END IF;
    IF p_parent_id IS NOT NULL THEN
      SELECT c.* INTO v_parent FROM public.store_categories c WHERE c.id=p_parent_id FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'store_category_stale' USING ERRCODE='40001';
      END IF;
      IF v_parent.identity_id IS DISTINCT FROM v_active THEN
        RAISE EXCEPTION 'store_category_forbidden' USING ERRCODE='42501';
      END IF;
      IF v_parent.parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'store_category_invalid_input' USING ERRCODE='22023';
      END IF;
    END IF;
    SELECT c.* INTO v_category FROM public.store_categories c WHERE c.id=p_category_id FOR UPDATE;
    IF FOUND THEN
      IF v_category.identity_id IS DISTINCT FROM v_active OR v_category.user_id IS DISTINCT FROM v_user THEN
        RAISE EXCEPTION 'store_category_forbidden' USING ERRCODE='42501';
      END IF;
      IF v_category.parent_id IS DISTINCT FROM p_parent_id OR v_category.name IS DISTINCT FROM v_name THEN
        RAISE EXCEPTION 'store_category_stale' USING ERRCODE='40001';
      END IF;
    ELSE
      SELECT coalesce(max(c.sort_order)::bigint,-1)+1 INTO v_sort FROM public.store_categories c
      WHERE c.identity_id=v_active AND c.parent_id IS NOT DISTINCT FROM p_parent_id;
      IF v_sort > 2147483647 OR v_sort < -2147483648 THEN
        RAISE EXCEPTION 'store_category_invalid_input' USING ERRCODE='22023';
      END IF;
      INSERT INTO public.store_categories(id,user_id,identity_id,parent_id,name,sort_order)
      VALUES(p_category_id,v_user,v_active,p_parent_id,v_name,v_sort::integer)
      RETURNING * INTO v_category;
      v_changed := true;
    END IF;
  ELSE
    IF p_expected_name IS NULL OR char_length(p_expected_name) NOT BETWEEN 1 AND 60
      OR (p_operation='delete' AND p_name IS DISTINCT FROM p_expected_name) THEN
      RAISE EXCEPTION 'store_category_invalid_input' USING ERRCODE='22023';
    END IF;
    SELECT c.* INTO v_category FROM public.store_categories c WHERE c.id=p_category_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'store_category_stale' USING ERRCODE='40001';
    END IF;
    IF v_category.identity_id IS DISTINCT FROM v_active THEN
      RAISE EXCEPTION 'store_category_forbidden' USING ERRCODE='42501';
    END IF;
    IF v_category.parent_id IS DISTINCT FROM p_parent_id OR v_category.name IS DISTINCT FROM p_expected_name THEN
      RAISE EXCEPTION 'store_category_stale' USING ERRCODE='40001';
    END IF;
    IF p_operation='rename' THEN
      IF v_category.name IS DISTINCT FROM v_name THEN
        UPDATE public.store_categories c SET name=v_name WHERE c.id=p_category_id
        RETURNING c.* INTO v_category;
        v_changed := true;
      END IF;
    ELSE
      IF EXISTS(SELECT 1 FROM public.store_categories c WHERE c.parent_id=p_category_id) THEN
        RAISE EXCEPTION 'store_category_has_children' USING ERRCODE='23503';
      END IF;
      DELETE FROM public.listing_store_categories l WHERE l.store_category_id=p_category_id;
      GET DIAGNOSTICS v_removed = ROW_COUNT;
      DELETE FROM public.store_categories c WHERE c.id=p_category_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'store_category_stale' USING ERRCODE='40001';
      END IF;
      v_changed := true;
    END IF;
  END IF;
  RETURN jsonb_build_object('schema_version',1,'operation',p_operation,
    'actor_user_id',v_user,'identity_id',v_active,'category_id',v_category.id,
    'name',v_category.name,'sort_order',v_category.sort_order,'parent_id',v_category.parent_id,
    'changed',v_changed,'removed_listing_links',v_removed);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'store_category_duplicate' USING ERRCODE='23505';
END;
$function$;
ALTER FUNCTION public.manage_my_store_category_v1(uuid,uuid,text,uuid,uuid,text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.manage_my_store_category_v1(uuid,uuid,text,uuid,uuid,text,text)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.manage_my_store_category_v1(uuid,uuid,text,uuid,uuid,text,text) TO authenticated;
COMMENT ON FUNCTION public.manage_my_store_category_v1(uuid,uuid,text,uuid,uuid,text,text)
  IS 'One confirmed active-identity category operation with stable create ID and exact original-name/parent comparison. Deletion retains listings and media.';
