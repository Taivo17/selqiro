CREATE FUNCTION jobs_private.normalize_content(p_content jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE keys constant text[]:=ARRAY['title','description','category','countryCode','city','locationLabel','workplaceType',
 'employmentType','workingTime','salaryMin','salaryMax','salaryCurrency','salaryPeriod'];
 k text;n jsonb:='{}';v text;low jsonb;high jsonb;
BEGIN
 IF p_content IS NULL OR jsonb_typeof(p_content)<>'object' OR octet_length(p_content::text)>65536
 OR NOT(p_content ?& keys) OR p_content-keys<>'{}'::jsonb THEN
 RAISE EXCEPTION 'job_content_invalid' USING ERRCODE='22023';END IF;
 FOREACH k IN ARRAY keys LOOP
  IF p_content->k IS DISTINCT FROM 'null'::jsonb AND jsonb_typeof(p_content->k) IS DISTINCT FROM 'string' THEN
   RAISE EXCEPTION 'job_content_invalid' USING ERRCODE='22023';END IF;
  v:=CASE WHEN k IN('salaryMin','salaryMax','salaryCurrency') THEN p_content->>k ELSE nullif(btrim(p_content->>k),'') END;
  n:=n||jsonb_build_object(k,v);
 END LOOP;
 IF n->>'title' IS NULL OR char_length(n->>'title') NOT BETWEEN 2 AND 140 OR n->>'title' ~ '[[:cntrl:]]'
 OR n->>'description' IS NULL OR char_length(n->>'description') NOT BETWEEN 1 AND 10000
 OR NOT EXISTS(SELECT 1 FROM jobs_private.categories WHERE code=n->>'category')
 OR (n->>'countryCode' IS NOT NULL AND n->>'countryCode' !~ '^[A-Z]{2}$')
 OR char_length(n->>'city')>160 OR n->>'city' ~ '[[:cntrl:]]'
 OR char_length(n->>'locationLabel')>300 OR n->>'locationLabel' ~ '[[:cntrl:]]'
 OR n->>'workplaceType' IS NULL OR n->>'workplaceType' NOT IN('on_site','remote','hybrid')
 OR (n->>'employmentType' IS NOT NULL AND n->>'employmentType' NOT IN('permanent','fixed_term','contract','internship','other'))
 OR (n->>'workingTime' IS NOT NULL AND n->>'workingTime' NOT IN('full_time','part_time','flexible','other')) THEN
 RAISE EXCEPTION 'job_content_invalid' USING ERRCODE='22023';END IF;
 IF n->>'salaryMin' IS NULL AND n->>'salaryMax' IS NULL THEN
  IF n->>'salaryCurrency' IS NOT NULL OR n->>'salaryPeriod' IS NOT NULL THEN
   RAISE EXCEPTION 'job_salary_invalid' USING ERRCODE='22023';END IF;
 ELSE
  IF n->>'salaryCurrency' IS NULL OR n->>'salaryPeriod' IS NULL OR n->>'salaryPeriod' NOT IN('hour','day','week','month','year') THEN
   RAISE EXCEPTION 'job_salary_invalid' USING ERRCODE='22023';END IF;
  IF n->>'salaryMin' IS NOT NULL THEN
   low:=public.normalize_listing_price_v1(jsonb_build_object('kind','fixed','amount',n->'salaryMin','currency',n->'salaryCurrency'));
   n:=jsonb_set(n,'{salaryMin}',low->'amount');
  END IF;
  IF n->>'salaryMax' IS NOT NULL THEN
   high:=public.normalize_listing_price_v1(jsonb_build_object('kind','fixed','amount',n->'salaryMax','currency',n->'salaryCurrency'));
   n:=jsonb_set(n,'{salaryMax}',high->'amount');
  END IF;
  IF (n->>'salaryMin')::numeric>(n->>'salaryMax')::numeric THEN
   RAISE EXCEPTION 'job_salary_invalid' USING ERRCODE='22023';END IF;
 END IF;
 RETURN n;
END $f$;
CREATE FUNCTION jobs_private.content(j public.jobs) RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jsonb_build_object('title',j.title,'description',j.description,'category',j.category,'countryCode',j.country_code,
 'city',j.city,'locationLabel',j.location_label,'workplaceType',j.workplace_type,'employmentType',j.employment_type,
 'workingTime',j.working_time,'salaryMin',j.salary_min::text,'salaryMax',j.salary_max::text,
 'salaryCurrency',j.salary_currency,'salaryPeriod',j.salary_period);
$f$;
CREATE FUNCTION jobs_private.owner_fields(j public.jobs,p_user uuid) RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jsonb_build_object('schema_version',1,'content_type','job','actor_user_id',p_user,'identity_id',j.identity_id,
 'job_id',j.id,'edit_revision',j.edit_revision::text,'status',j.status,'content',jobs_private.content(j),
 'created_at',j.created_at,'updated_at',j.updated_at,'published_at',j.published_at,'active_until',j.active_until,
 'last_confirmed_at',j.last_confirmed_at);
$f$;
CREATE FUNCTION jobs_private.is_public(j public.jobs) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT j.status='published' AND j.published_at IS NOT NULL AND j.active_until>statement_timestamp()
 AND EXISTS(SELECT 1 FROM public.identities i JOIN public.business_accounts b ON b.id=i.business_account_id AND b.status='active'
 JOIN public.identity_profiles ip ON ip.identity_id=i.id
 WHERE i.id=j.identity_id AND i.type='business' AND i.status='active' AND nullif(btrim(ip.slug),'') IS NOT NULL);
$f$;
CREATE FUNCTION jobs_private.visible_to_viewer(p_identity uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT EXISTS(SELECT 1 FROM public.identities i JOIN public.business_accounts b ON b.id=i.business_account_id
 WHERE i.id=p_identity AND NOT EXISTS(SELECT 1 FROM public.user_blocks block
 WHERE public.listing_actor_uid_hosted_v1() IS NOT NULL
 AND ((block.blocker_id=public.listing_actor_uid_hosted_v1() AND block.blocked_id=b.owner_user_id)
 OR (block.blocked_id=public.listing_actor_uid_hosted_v1() AND block.blocker_id=b.owner_user_id))));
$f$;
CREATE FUNCTION jobs_private.public_fields(j public.jobs) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jsonb_build_object('schema_version',1,'content_type','job','content_id',j.id,'identity_id',j.identity_id,
 'content',jobs_private.content(j),'status','published','created_at',j.created_at,'updated_at',j.updated_at,
 'published_at',j.published_at,'active_until',j.active_until,
 'employer',jsonb_build_object('name',coalesce(nullif(ip.display_name,''),b.name),'slug',ip.slug,'logo_url',ip.avatar_url))
 FROM public.identities i JOIN public.business_accounts b ON b.id=i.business_account_id
 JOIN public.identity_profiles ip ON ip.identity_id=i.id WHERE i.id=j.identity_id;
$f$;
CREATE FUNCTION jobs_private.search_document(p_title text,p_description text,p_category text,p_city text,p_country text)
RETURNS tsvector LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT to_tsvector('pg_catalog.simple'::regconfig,coalesce(p_title,'')||' '||coalesce(p_description,'')||' '||
 coalesce(p_category,'')||' '||coalesce(p_city,'')||' '||coalesce(p_country,''));
$f$;
CREATE INDEX jobs_public_keywords_idx ON public.jobs USING gin
 (jobs_private.search_document(title,description,category,city,country_code)) WHERE status='published';
