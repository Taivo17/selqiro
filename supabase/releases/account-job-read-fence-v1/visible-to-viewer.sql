CREATE OR REPLACE FUNCTION jobs_private.visible_to_viewer(p_identity uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT EXISTS(SELECT 1 FROM public.identities i LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 WHERE i.id=p_identity AND i.type IN('private','business')
 AND CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END IS NOT NULL
 AND account_lifecycle_private.account_is_available(CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END)
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks block
 WHERE public.listing_actor_uid_hosted_v1() IS NOT NULL
 AND ((block.blocker_id=public.listing_actor_uid_hosted_v1()
  AND block.blocked_id=CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END)
 OR (block.blocked_id=public.listing_actor_uid_hosted_v1()
  AND block.blocker_id=CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END))));
$f$;
