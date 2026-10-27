-- REVIEW TEMPLATE ONLY. Never include in release.sql or in ordinary migrations.
-- The trusted installer must already have begun one transaction and supplied:
-- SET LOCAL selqiro.hosted_preview_project_ref = '<externally verified target>';
-- SET LOCAL selqiro.hosted_preview_instance_id = '<recorded installation UUID>';
-- SET LOCAL selqiro.hosted_preview_actor_ids = '<UUID1>,<UUID2>,<UUID3>';
-- Three distinct existing accounts; ordinary browser authentication is unchanged.
DO $activate$
DECLARE config listing_publication_private.hosted_preview_settings%ROWTYPE;
 actors uuid[]; actor uuid; actor_identity uuid; selected_text text;
BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' THEN
  RAISE EXCEPTION 'hosted_preview_trusted_activation_required' USING ERRCODE='42501';
 END IF;
 selected_text:=coalesce(current_setting('selqiro.hosted_preview_actor_ids',true),'');
 IF selected_text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(,[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}){2}$' THEN
  RAISE EXCEPTION 'hosted_preview_three_existing_actors_required' USING ERRCODE='22023';
 END IF;
 actors:=string_to_array(selected_text,',')::uuid[];
 IF (SELECT count(DISTINCT selected_actor) FROM unnest(actors) AS selected(selected_actor))<>3 THEN
  RAISE EXCEPTION 'hosted_preview_three_existing_actors_required' USING ERRCODE='22023';
 END IF;
 SELECT array_agg(selected_actor ORDER BY selected_actor) INTO actors FROM unnest(actors) AS selected(selected_actor);
 SELECT * INTO config FROM listing_publication_private.hosted_preview_settings WHERE singleton FOR UPDATE;
 IF NOT FOUND OR config.enabled OR NOT config.release_ready
  OR config.storage_authority_version IS DISTINCT FROM 'source-part-rfc3986-v1'
  OR NOT listing_publication_private.hosted_storage_contract_ready()
  OR config.release_id<>'listing-publication-hosted-preview-v1'
  OR config.project_ref IS DISTINCT FROM current_setting('selqiro.hosted_preview_project_ref',true)
  OR config.instance_id::text IS DISTINCT FROM current_setting('selqiro.hosted_preview_instance_id',true) THEN
  RAISE EXCEPTION 'hosted_preview_activation_identity_mismatch' USING ERRCODE='55000';
 END IF;
 -- Match the runtime lock order: settings -> actor -> profile -> identity.
 LOCK TABLE listing_publication_private.hosted_preview_actors IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM listing_publication_private.hosted_preview_actors WHERE actor_user_id<>ALL(actors))
  OR (SELECT count(*) FROM listing_publication_private.hosted_preview_actors) NOT IN (0,3) THEN
  RAISE EXCEPTION 'hosted_preview_different_existing_allowlist_requires_review' USING ERRCODE='55000';
 END IF;
 -- Validate every account before inserting any; the enclosing transaction keeps
 -- the three-account activation atomic if an account or identity changed.
 FOREACH actor IN ARRAY actors LOOP
  SELECT p.active_identity_id INTO actor_identity FROM public.profiles p
  JOIN auth.users u ON u.id=p.id WHERE p.id=actor FOR SHARE OF p;
  IF actor_identity IS NULL THEN
   RAISE EXCEPTION 'hosted_preview_existing_actor_identity_required' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.identities i WHERE i.id=actor_identity AND i.status='active' AND (
   (i.type='private' AND i.user_id=actor) OR
   (i.type='business' AND EXISTS(SELECT 1 FROM public.business_members m
    WHERE m.business_account_id=i.business_account_id AND m.user_id=actor AND m.status='active')))
  FOR SHARE OF i;
  IF NOT FOUND THEN
   RAISE EXCEPTION 'hosted_preview_existing_actor_identity_required' USING ERRCODE='42501';
  END IF;
 END LOOP;
 INSERT INTO listing_publication_private.hosted_preview_actors(actor_user_id)
 SELECT selected_actor FROM unnest(actors) AS selected(selected_actor)
 ON CONFLICT(actor_user_id) DO NOTHING;
 UPDATE listing_publication_private.hosted_preview_settings SET enabled=true WHERE singleton;
END $activate$;

-- This bounded result can be recorded by the trusted operator without tokens.
SELECT project_ref,release_id,instance_id,enabled,release_ready,storage_authority_version,
 (SELECT count(*) FROM listing_publication_private.hosted_preview_actors) AS allowlisted_actor_count
FROM listing_publication_private.hosted_preview_settings WHERE singleton;
