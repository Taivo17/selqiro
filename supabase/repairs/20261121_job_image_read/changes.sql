CREATE OR REPLACE FUNCTION jobs_private.public_fields(j public.jobs) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jsonb_build_object('schema_version',1,'content_type','job','content_id',j.id,'identity_id',j.identity_id,
 'content',jobs_private.content(j),'status','published','created_at',j.created_at,'updated_at',j.updated_at,
 'published_at',j.published_at,'active_until',j.active_until,
 'employer',jsonb_build_object('name',coalesce(nullif(btrim(ip.display_name),''),
  CASE WHEN i.type='business' THEN nullif(btrim(b.name),'') END,'Selqiro'),
 'slug',ip.slug,'logo_url',profile_media_private.slot_url(j.identity_id,'avatar'),'identity_type',i.type))
 FROM public.identities i LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 JOIN public.identity_profiles ip ON ip.identity_id=i.id WHERE i.id=j.identity_id;
$f$;

