-- Account gate only; retained visibility, finality, order and output contract.
CREATE OR REPLACE FUNCTION service_publication_private.visible_to_viewer(p_service uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM public.services s JOIN public.identities i ON i.id=s.identity_id
 LEFT JOIN public.business_accounts business ON business.id=i.business_account_id
 WHERE s.id=p_service
 AND account_lifecycle_private.account_is_available(
  CASE WHEN i.type='private' THEN i.user_id WHEN i.type='business' THEN business.owner_user_id END)
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks b
 WHERE public.listing_actor_uid_hosted_v1() IS NOT NULL AND
 ((b.blocker_id=public.listing_actor_uid_hosted_v1() AND b.blocked_id=CASE WHEN i.type='private' THEN i.user_id ELSE business.owner_user_id END)
 OR (b.blocked_id=public.listing_actor_uid_hosted_v1() AND b.blocker_id=CASE WHEN i.type='private' THEN i.user_id ELSE business.owner_user_id END))));
$f$;
