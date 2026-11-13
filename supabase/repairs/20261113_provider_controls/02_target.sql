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
