CREATE OR REPLACE FUNCTION jobs_private.is_public(j public.jobs) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT j.status='published' AND j.published_at IS NOT NULL AND j.active_until>statement_timestamp()
 AND EXISTS(SELECT 1 FROM public.identities i JOIN public.identity_profiles ip ON ip.identity_id=i.id
 LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 WHERE i.id=j.identity_id AND i.status='active' AND nullif(btrim(ip.slug),'') IS NOT NULL
 AND ((i.type='private' AND i.user_id IS NOT NULL AND i.business_account_id IS NULL
  AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=i.user_id))
 OR (i.type='business' AND b.status='active')));
$f$;

CREATE OR REPLACE FUNCTION jobs_private.visible_to_viewer(p_identity uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT EXISTS(SELECT 1 FROM public.identities i LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 WHERE i.id=p_identity AND i.type IN('private','business')
 AND CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks block
 WHERE public.listing_actor_uid_hosted_v1() IS NOT NULL
 AND ((block.blocker_id=public.listing_actor_uid_hosted_v1()
  AND block.blocked_id=CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END)
 OR (block.blocked_id=public.listing_actor_uid_hosted_v1()
  AND block.blocker_id=CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END))));
$f$;

CREATE OR REPLACE FUNCTION jobs_private.public_fields(j public.jobs) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jsonb_build_object('schema_version',1,'content_type','job','content_id',j.id,'identity_id',j.identity_id,
 'content',jobs_private.content(j),'status','published','created_at',j.created_at,'updated_at',j.updated_at,
 'published_at',j.published_at,'active_until',j.active_until,
 'employer',jsonb_build_object('name',coalesce(nullif(btrim(ip.display_name),''),
  CASE WHEN i.type='business' THEN nullif(btrim(b.name),'') END,'Selqiro'),
 'slug',ip.slug,'logo_url',ip.avatar_url,'identity_type',i.type))
 FROM public.identities i LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 JOIN public.identity_profiles ip ON ip.identity_id=i.id WHERE i.id=j.identity_id;
$f$;

CREATE OR REPLACE FUNCTION public.get_jobs_capabilities_v1() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jsonb_build_object('schema_version',1,'release','jobs-public-v1','public_search',true,'public_profile',true,
 'public_detail',true,'business_publication',true,'personal_publication',true,'task_publication',true,
 'validity','one_calendar_month_utc','request_receipts',true);
$f$;
