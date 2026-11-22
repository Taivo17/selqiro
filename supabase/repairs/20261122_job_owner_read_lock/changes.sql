-- One read RPC only. Shared mutation authority and its transaction locks stay unchanged.
-- STABLE makes every authority check and the page use the calling statement's snapshot.
CREATE OR REPLACE FUNCTION public.get_my_jobs_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,
 p_result_limit integer DEFAULT 24,p_cursor jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE
 actor uuid;
 active_id uuid;
 identity_row public.identities%ROWTYPE;
 config listing_publication_private.hosted_preview_settings%ROWTYPE;
 cursor_value jsonb;items jsonb;more boolean;next_value jsonb;
 read_time timestamptz:=statement_timestamp();
BEGIN
 -- Preserve the shared actor contract and its refusal order without taking row locks.
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001';
 END IF;
 actor:=public.listing_actor_uid_hosted_v1();
 IF actor IS NULL OR p_expected_user_id IS NULL OR actor IS DISTINCT FROM p_expected_user_id THEN
  RAISE EXCEPTION 'publication_account_changed' USING ERRCODE='42501';
 END IF;

 SELECT * INTO config FROM listing_publication_private.hosted_preview_settings WHERE singleton;
 IF NOT FOUND OR NOT config.enabled OR NOT config.release_ready
  OR config.storage_authority_version IS DISTINCT FROM 'source-part-rfc3986-v1'
  OR NOT listing_publication_private.hosted_storage_contract_ready() THEN
  RAISE EXCEPTION 'publication_hosted_preview_disabled' USING ERRCODE='55000';
 END IF;
 PERFORM 1 FROM listing_publication_private.hosted_preview_actors WHERE actor_user_id=actor;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'publication_hosted_preview_actor_forbidden' USING ERRCODE='42501';
 END IF;
 IF p_expected_identity_id IS NULL THEN
  RAISE EXCEPTION 'listing_price_identity_required' USING ERRCODE='42501';
 END IF;

 SELECT p.active_identity_id INTO active_id FROM public.profiles p WHERE p.id=actor;
 IF active_id IS NULL OR active_id IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'listing_price_identity_changed' USING ERRCODE='42501';
 END IF;
 SELECT i.* INTO identity_row FROM public.identities i WHERE i.id=active_id AND i.status='active';
 IF NOT FOUND THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
 END IF;
 IF identity_row.type='business' THEN
  PERFORM 1 FROM public.business_members m WHERE m.business_account_id=identity_row.business_account_id
   AND m.user_id=actor AND m.status='active';
  IF NOT FOUND THEN
   RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
  END IF;
 END IF;
 IF public.current_user_has_identity_access(active_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
 END IF;

 -- Preserve the job-specific private/business rules after the shared checks.
 IF identity_row.type='private' THEN
  IF identity_row.user_id IS DISTINCT FROM p_expected_user_id OR identity_row.business_account_id IS NOT NULL THEN
   RAISE EXCEPTION 'job_identity_forbidden' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_expected_user_id;
  IF NOT FOUND THEN
   RAISE EXCEPTION 'job_identity_unavailable' USING ERRCODE='42501';
  END IF;
 ELSIF identity_row.type='business' THEN
  PERFORM 1 FROM public.business_accounts WHERE id=identity_row.business_account_id AND status='active';
  IF NOT FOUND THEN
   RAISE EXCEPTION 'job_business_unavailable' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.business_members WHERE business_account_id=identity_row.business_account_id
   AND user_id=p_expected_user_id AND status='active';
  IF NOT FOUND THEN
   RAISE EXCEPTION 'job_business_forbidden' USING ERRCODE='42501';
  END IF;
 ELSE
  RAISE EXCEPTION 'job_identity_forbidden' USING ERRCODE='42501';
 END IF;

 IF p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50 THEN
  RAISE EXCEPTION 'job_page_invalid' USING ERRCODE='22023';
 END IF;
 cursor_value:=jobs_private.cursor(p_cursor,'created_at');
 WITH candidates AS MATERIALIZED(SELECT j.* FROM public.jobs j WHERE j.identity_id=p_expected_identity_id
 AND (cursor_value IS NULL OR (j.created_at,j.id)<((cursor_value->>'created_at')::timestamptz,(cursor_value->>'id')::uuid))
 ORDER BY j.created_at DESC,j.id DESC LIMIT p_result_limit+1), page AS MATERIALIZED(
 SELECT * FROM candidates ORDER BY created_at DESC,id DESC LIMIT p_result_limit)
 SELECT (SELECT count(*)>p_result_limit FROM candidates),
 coalesce((SELECT jsonb_agg(jobs_private.owner_fields(p,p_expected_user_id) ORDER BY p.created_at DESC,p.id DESC) FROM page p),'[]'::jsonb),
 (SELECT jsonb_build_object('created_at',created_at,'id',id) FROM page ORDER BY created_at,id LIMIT 1)
 INTO more,items,next_value;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
 'items',items,'result_limit',p_result_limit,'has_more',more,'next_cursor',CASE WHEN more THEN next_value ELSE NULL END,'read_at',read_time);
END $f$;
