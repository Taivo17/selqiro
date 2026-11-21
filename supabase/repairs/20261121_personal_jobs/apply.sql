BEGIN;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL timezone='UTC';
SET LOCAL jit=off;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='45s';
SET LOCAL idle_in_transaction_session_timeout='10s';
SET LOCAL transaction_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('selqiro:personal-jobs:20261121',0));
CREATE TEMP TABLE personal_jobs_before ON COMMIT DROP AS WITH functions AS MATERIALIZED (
 SELECT n.nspname||'.'||p.proname name,p.oid::regprocedure::text signature,jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),
 'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,
 'leakproof',p.proleakproof,'parallel',p.proparallel,'result',pg_get_function_result(p.oid),
 'arguments',p.proargnames,'defaults',pg_get_expr(p.proargdefaults,0),'config',p.proconfig,
 'body',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x)) facts
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname='jobs_private' OR (n.nspname='public' AND p.proname=ANY(ARRAY['get_jobs_capabilities_v1','get_job_categories_v1','get_public_job_v1','search_public_jobs_v1','get_public_profile_jobs_v1','get_my_jobs_v1','get_my_job_v1','get_my_job_policies_v1','get_my_job_request_v1','save_my_job_v1','publish_my_job_v1','set_my_job_status_v1','renew_my_job_activity_v1','contact_my_job_provider_v1','get_my_marketplace_message_thread_v2']::text[]))
 OR n.nspname||'.'||p.proname=ANY(ARRAY['listing_publication_private.require_actor','public.listing_actor_uid_hosted_v1','public.lock_listing_creation_actor_v1','public.current_user_has_identity_access','listing_publication_private.assert_hosted_preview_actor','listing_publication_private.hosted_storage_contract_ready','public.normalize_listing_price_v1','public.listing_price_currency_scale_v1','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_key','listing_contact_private.require_peer','listing_contact_private.require_member','listing_contact_private.require_unblocked','listing_contact_private.guard_message','listing_contact_private.guard_conversation','listing_contact_private.guard_participant','public.send_my_message_v2','public.get_my_message_thread_v2']::text[])
),relations AS MATERIALIZED (
 SELECT n.nspname||'.'||c.relname name,jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,
 'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('position',a.attnum,'name',a.attname,
 'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,
 'default',pg_get_expr(d.adbin,d.adrelid),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(a.attacl) x)) ORDER BY a.attnum),'[]'::jsonb)
 FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
 WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,
 'definition',pg_get_constraintdef(q.oid),'validated',q.convalidated) ORDER BY q.conname COLLATE "C"),'[]'::jsonb)
 FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,
 'definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready,'unique',i.indisunique)
 ORDER BY (i.indexrelid::regclass::text) COLLATE "C"),'[]'::jsonb) FROM pg_index i WHERE i.indrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,
 'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname COLLATE "C"),'[]'::jsonb)
 FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
 'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END
 ORDER BY (CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END) COLLATE "C") FROM unnest(p.polroles) r),
 'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid))
 ORDER BY p.polname COLLATE "C"),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid)) facts FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind IN('r','p') AND (n.nspname='jobs_private' OR n.nspname||'.'||c.relname='public.jobs')
),observed AS MATERIALIZED (
 SELECT jsonb_build_object(
 'functions',(SELECT coalesce(jsonb_agg(facts ORDER BY signature COLLATE "C"),'[]'::jsonb) FROM functions),
 'tables',(SELECT coalesce(jsonb_agg(facts ORDER BY name COLLATE "C"),'[]'::jsonb) FROM relations),
 'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname COLLATE "C"),'[]'::jsonb)
 FROM pg_namespace n WHERE n.nspname='jobs_private'),
 'added_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,'name',t.tgname,
 'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid),'function_owner',pg_get_userbyid(p.proowner))
 ORDER BY (t.tgrelid::regclass::text) COLLATE "C",t.tgname COLLATE "C"),'[]'::jsonb)
 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal
 AND t.tgname IN('job_message_context','job_clear_context','job_clear_on_listing')
 AND t.tgrelid::regclass::text=ANY(ARRAY['public.messages','public.conversations','service_publication_private.thread_context','horse_publication_private.thread_context']))
 ) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('project_ref',s.project_ref,'instance_id',s.instance_id,
 'release_id',s.release_id,'release_ready',s.release_ready,'storage_authority_version',s.storage_authority_version)
 ORDER BY s.instance_id::text COLLATE "C"),'[]'::jsonb) FROM listing_publication_private.hosted_preview_settings s) settings,
 current_user='postgres' AND has_table_privilege(current_user,'listing_publication_private.hosted_preview_settings','SELECT')
 AND NOT row_security_active('listing_publication_private.hosted_preview_settings'::regclass) installer_ready
),measured AS MATERIALIZED (SELECT *,encode(sha256(convert_to((facts)::text,'UTF8')),'hex') scope_sha256 FROM observed),checked AS MATERIALIZED (SELECT *,
 installer_ready AND settings=jsonb_build_array(jsonb_build_object('project_ref','vyjletlmwoiwxsnsunlm',
 'instance_id','2d088814-0900-448a-a9d1-7b05470cb1d2','release_id','listing-publication-hosted-preview-v1','release_ready',true,
 'storage_authority_version','source-part-rfc3986-v1')) context_ready FROM measured)
 SELECT jsonb_build_object('format','selqiro-personal-jobs-state-20261121-v1',
 'state',CASE WHEN context_ready AND scope_sha256='33c8f264b584b8a30cc39253af4a5d2b73f551c530296cc5fca037424fc33721' THEN 'before'
 WHEN context_ready AND scope_sha256='0154e63e365b610241031f5a0e6617abdb918a067212e99b7a82e9cfa06fbb54' THEN 'after' ELSE 'unknown' END,
 'recognized',context_ready AND scope_sha256 IN('33c8f264b584b8a30cc39253af4a5d2b73f551c530296cc5fca037424fc33721','0154e63e365b610241031f5a0e6617abdb918a067212e99b7a82e9cfa06fbb54'),
 'read_only',current_setting('transaction_read_only')='on',
 'project_ref',settings->0->>'project_ref','instance_id',settings->0->>'instance_id','release_id',settings->0->>'release_id',
 'scope_sha256',scope_sha256,'expected_before_sha256','33c8f264b584b8a30cc39253af4a5d2b73f551c530296cc5fca037424fc33721','expected_after_sha256','0154e63e365b610241031f5a0e6617abdb918a067212e99b7a82e9cfa06fbb54',
 'user_rows_read',false) result FROM checked;
DO $guard$ DECLARE b jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.personal_jobs_before;
IF (b->>'recognized'='true' AND b->>'state' IN('before','after')) IS NOT TRUE THEN
RAISE EXCEPTION 'PERSONAL_JOBS_STATE_NOT_RECOGNIZED' USING ERRCODE='55000';END IF;END $guard$;
DO $install$ DECLARE b jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.personal_jobs_before;
IF b->>'state'='before' THEN EXECUTE '-- Extend the accepted job actor contract without changing its account lock,
-- expected identity, business membership or request reconciliation rules.
CREATE OR REPLACE FUNCTION jobs_private.require_actor(p_user uuid,p_identity uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
DECLARE i public.identities%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_actor(p_user,p_identity);
 SELECT * INTO i FROM public.identities WHERE id=p_identity AND status=''active'' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION ''job_identity_unavailable'' USING ERRCODE=''42501'';END IF;
 IF i.type=''private'' THEN
  IF i.user_id IS DISTINCT FROM p_user OR i.business_account_id IS NOT NULL THEN
   RAISE EXCEPTION ''job_identity_forbidden'' USING ERRCODE=''42501'';END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_user FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION ''job_identity_unavailable'' USING ERRCODE=''42501'';END IF;
 ELSIF i.type=''business'' THEN
  PERFORM 1 FROM public.business_accounts WHERE id=i.business_account_id AND status=''active'' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION ''job_business_unavailable'' USING ERRCODE=''42501'';END IF;
  PERFORM 1 FROM public.business_members WHERE business_account_id=i.business_account_id
   AND user_id=p_user AND status=''active'' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION ''job_business_forbidden'' USING ERRCODE=''42501'';END IF;
 ELSE RAISE EXCEPTION ''job_identity_forbidden'' USING ERRCODE=''42501'';
 END IF;
END $f$;

-- These are the two exact old named checks. The preflight recognizes the
-- complete job catalog before replacing them; no unknown constraints vanish.
ALTER TABLE public.jobs DROP CONSTRAINT jobs_employment_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_employment_type_check
 CHECK(employment_type IN(''permanent'',''fixed_term'',''contract'',''internship'',''other'',''task''));
ALTER TABLE public.jobs DROP CONSTRAINT jobs_salary_period_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_salary_period_check
 CHECK(salary_period IN(''hour'',''day'',''week'',''month'',''year'',''task''));
ALTER TABLE public.jobs ADD CONSTRAINT jobs_task_content_check
 CHECK((employment_type IS DISTINCT FROM ''task'' OR working_time IS NULL)
 AND (salary_period IS DISTINCT FROM ''task'' OR employment_type IS NOT DISTINCT FROM ''task''));

CREATE OR REPLACE FUNCTION jobs_private.normalize_content(p_content jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
DECLARE keys constant text[]:=ARRAY[''title'',''description'',''category'',''countryCode'',''city'',''locationLabel'',''workplaceType'',
 ''employmentType'',''workingTime'',''salaryMin'',''salaryMax'',''salaryCurrency'',''salaryPeriod''];
 k text;n jsonb:=''{}'';v text;low jsonb;high jsonb;
BEGIN
 IF p_content IS NULL OR jsonb_typeof(p_content)<>''object'' OR octet_length(p_content::text)>65536
 OR NOT(p_content ?& keys) OR p_content-keys<>''{}''::jsonb THEN
 RAISE EXCEPTION ''job_content_invalid'' USING ERRCODE=''22023'';END IF;
 FOREACH k IN ARRAY keys LOOP
  IF p_content->k IS DISTINCT FROM ''null''::jsonb AND jsonb_typeof(p_content->k) IS DISTINCT FROM ''string'' THEN
   RAISE EXCEPTION ''job_content_invalid'' USING ERRCODE=''22023'';END IF;
  v:=CASE WHEN k IN(''salaryMin'',''salaryMax'',''salaryCurrency'') THEN p_content->>k ELSE nullif(btrim(p_content->>k),'''') END;
  n:=n||jsonb_build_object(k,v);
 END LOOP;
 IF n->>''title'' IS NULL OR char_length(n->>''title'') NOT BETWEEN 2 AND 140 OR n->>''title'' ~ ''[[:cntrl:]]''
 OR n->>''description'' IS NULL OR char_length(n->>''description'') NOT BETWEEN 1 AND 10000
 OR NOT EXISTS(SELECT 1 FROM jobs_private.categories WHERE code=n->>''category'')
 OR (n->>''countryCode'' IS NOT NULL AND n->>''countryCode'' !~ ''^[A-Z]{2}$'')
 OR char_length(n->>''city'')>160 OR n->>''city'' ~ ''[[:cntrl:]]''
 OR char_length(n->>''locationLabel'')>300 OR n->>''locationLabel'' ~ ''[[:cntrl:]]''
 OR n->>''workplaceType'' IS NULL OR n->>''workplaceType'' NOT IN(''on_site'',''remote'',''hybrid'')
 OR (n->>''employmentType'' IS NOT NULL AND n->>''employmentType'' NOT IN(''permanent'',''fixed_term'',''contract'',''internship'',''other'',''task''))
 OR (n->>''workingTime'' IS NOT NULL AND n->>''workingTime'' NOT IN(''full_time'',''part_time'',''flexible'',''other'')) THEN
 RAISE EXCEPTION ''job_content_invalid'' USING ERRCODE=''22023'';END IF;
 IF n->>''employmentType''=''task'' AND n->>''workingTime'' IS NOT NULL THEN
  RAISE EXCEPTION ''job_content_invalid'' USING ERRCODE=''22023'';END IF;
 IF n->>''salaryPeriod''=''task'' AND n->>''employmentType'' IS DISTINCT FROM ''task'' THEN
  RAISE EXCEPTION ''job_salary_invalid'' USING ERRCODE=''22023'';END IF;
 IF n->>''salaryMin'' IS NULL AND n->>''salaryMax'' IS NULL THEN
  IF n->>''salaryCurrency'' IS NOT NULL OR n->>''salaryPeriod'' IS NOT NULL THEN
   RAISE EXCEPTION ''job_salary_invalid'' USING ERRCODE=''22023'';END IF;
 ELSE
  IF n->>''salaryCurrency'' IS NULL OR n->>''salaryPeriod'' IS NULL OR n->>''salaryPeriod'' NOT IN(''hour'',''day'',''week'',''month'',''year'',''task'') THEN
   RAISE EXCEPTION ''job_salary_invalid'' USING ERRCODE=''22023'';END IF;
  IF n->>''salaryMin'' IS NOT NULL THEN
   low:=public.normalize_listing_price_v1(jsonb_build_object(''kind'',''fixed'',''amount'',n->''salaryMin'',''currency'',n->''salaryCurrency''));
   n:=jsonb_set(n,''{salaryMin}'',low->''amount'');
  END IF;
  IF n->>''salaryMax'' IS NOT NULL THEN
   high:=public.normalize_listing_price_v1(jsonb_build_object(''kind'',''fixed'',''amount'',n->''salaryMax'',''currency'',n->''salaryCurrency''));
   n:=jsonb_set(n,''{salaryMax}'',high->''amount'');
  END IF;
  IF (n->>''salaryMin'')::numeric>(n->>''salaryMax'')::numeric THEN
   RAISE EXCEPTION ''job_salary_invalid'' USING ERRCODE=''22023'';END IF;
 END IF;
 RETURN n;
END $f$;

CREATE OR REPLACE FUNCTION jobs_private.is_public(j public.jobs) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT j.status=''published'' AND j.published_at IS NOT NULL AND j.active_until>statement_timestamp()
 AND EXISTS(SELECT 1 FROM public.identities i JOIN public.identity_profiles ip ON ip.identity_id=i.id
 LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 WHERE i.id=j.identity_id AND i.status=''active'' AND nullif(btrim(ip.slug),'''') IS NOT NULL
 AND ((i.type=''private'' AND i.user_id IS NOT NULL AND i.business_account_id IS NULL
  AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=i.user_id))
 OR (i.type=''business'' AND b.status=''active'')));
$f$;

CREATE OR REPLACE FUNCTION jobs_private.visible_to_viewer(p_identity uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT EXISTS(SELECT 1 FROM public.identities i LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 WHERE i.id=p_identity AND i.type IN(''private'',''business'')
 AND CASE WHEN i.type=''private'' THEN i.user_id ELSE b.owner_user_id END IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks block
 WHERE public.listing_actor_uid_hosted_v1() IS NOT NULL
 AND ((block.blocker_id=public.listing_actor_uid_hosted_v1()
  AND block.blocked_id=CASE WHEN i.type=''private'' THEN i.user_id ELSE b.owner_user_id END)
 OR (block.blocked_id=public.listing_actor_uid_hosted_v1()
  AND block.blocker_id=CASE WHEN i.type=''private'' THEN i.user_id ELSE b.owner_user_id END))));
$f$;

CREATE OR REPLACE FUNCTION jobs_private.public_fields(j public.jobs) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT jsonb_build_object(''schema_version'',1,''content_type'',''job'',''content_id'',j.id,''identity_id'',j.identity_id,
 ''content'',jobs_private.content(j),''status'',''published'',''created_at'',j.created_at,''updated_at'',j.updated_at,
 ''published_at'',j.published_at,''active_until'',j.active_until,
 ''employer'',jsonb_build_object(''name'',coalesce(nullif(btrim(ip.display_name),''''),
  CASE WHEN i.type=''business'' THEN nullif(btrim(b.name),'''') END,''Selqiro''),
 ''slug'',ip.slug,''logo_url'',ip.avatar_url,''identity_type'',i.type))
 FROM public.identities i LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 JOIN public.identity_profiles ip ON ip.identity_id=i.id WHERE i.id=j.identity_id;
$f$;

CREATE OR REPLACE FUNCTION public.get_jobs_capabilities_v1() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT jsonb_build_object(''schema_version'',1,''release'',''jobs-public-v1'',''public_search'',true,''public_profile'',true,
 ''public_detail'',true,''business_publication'',true,''personal_publication'',true,''task_publication'',true,
 ''validity'',''one_calendar_month_utc'',''request_receipts'',true);
$f$;

CREATE OR REPLACE FUNCTION public.get_public_profile_jobs_v1(p_seller_slug text,p_result_limit integer DEFAULT 24,p_cursor jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
DECLARE cursor_value jsonb;items jsonb;more boolean;next_value jsonb;identity_value uuid;identities uuid[];
BEGIN
 IF p_seller_slug IS NULL OR char_length(p_seller_slug) NOT BETWEEN 1 AND 160 OR p_seller_slug<>btrim(p_seller_slug)
 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50 THEN
 RAISE EXCEPTION ''job_profile_invalid'' USING ERRCODE=''22023'';END IF;
 cursor_value:=jobs_private.cursor(p_cursor,''published_at'');
 SELECT array_agg(identity_id) INTO identities FROM(SELECT ip.identity_id FROM public.identity_profiles ip
 JOIN public.identities i ON i.id=ip.identity_id AND i.type IN(''private'',''business'') AND i.status=''active''
 WHERE ip.slug=p_seller_slug LIMIT 2) known;
 IF cardinality(identities)=1 THEN identity_value:=identities[1];END IF;
 WITH candidates AS MATERIALIZED(SELECT j.* FROM public.jobs j WHERE j.identity_id=identity_value
 AND jobs_private.is_public(j) AND jobs_private.visible_to_viewer(j.identity_id)
 AND (cursor_value IS NULL OR (j.published_at,j.id)<((cursor_value->>''published_at'')::timestamptz,(cursor_value->>''id'')::uuid))
 ORDER BY j.published_at DESC,j.id DESC LIMIT p_result_limit+1),page AS MATERIALIZED(
 SELECT * FROM candidates ORDER BY published_at DESC,id DESC LIMIT p_result_limit)
 SELECT (SELECT count(*)>p_result_limit FROM candidates),
 coalesce((SELECT jsonb_agg(jobs_private.public_fields(p) ORDER BY p.published_at DESC,p.id DESC) FROM page p),''[]''::jsonb),
 (SELECT jsonb_build_object(''published_at'',published_at,''id'',id) FROM page ORDER BY published_at,id LIMIT 1)
 INTO more,items,next_value;
 RETURN jsonb_build_object(''schema_version'',1,''seller_slug'',p_seller_slug,''identity_id'',identity_value,
 ''items'',items,''result_limit'',p_result_limit,''has_more'',more,''next_cursor'',CASE WHEN more THEN next_value ELSE NULL END,
 ''read_at'',statement_timestamp());
END $f$;

CREATE OR REPLACE FUNCTION public.search_public_jobs_v1(p_query text DEFAULT '''',p_category text DEFAULT NULL,
 p_country_code text DEFAULT NULL,p_city text DEFAULT NULL,p_workplace_type text DEFAULT NULL,
 p_employment_type text DEFAULT NULL,p_working_time text DEFAULT NULL,p_result_limit integer DEFAULT 24,p_cursor jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' SET plan_cache_mode=force_custom_plan AS $f$
DECLARE cursor_value jsonb;query_value text:=btrim(coalesce(p_query,''''));words tsquery;items jsonb;more boolean;next_value jsonb;
BEGIN
 IF length(query_value)>300 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50
 OR (p_category IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jobs_private.categories WHERE code=p_category))
 OR (p_country_code IS NOT NULL AND p_country_code !~ ''^[A-Z]{2}$'') OR char_length(p_city)>160
 OR (p_workplace_type IS NOT NULL AND p_workplace_type NOT IN(''on_site'',''remote'',''hybrid''))
 OR (p_employment_type IS NOT NULL AND p_employment_type NOT IN(''permanent'',''fixed_term'',''contract'',''internship'',''other'',''task''))
 OR (p_working_time IS NOT NULL AND p_working_time NOT IN(''full_time'',''part_time'',''flexible'',''other'')) THEN
 RAISE EXCEPTION ''job_search_invalid'' USING ERRCODE=''22023'';END IF;
 cursor_value:=jobs_private.cursor(p_cursor,''published_at'');
 words:=plainto_tsquery(''pg_catalog.simple''::regconfig,query_value);
 WITH viewer_hidden AS MATERIALIZED(SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=public.listing_actor_uid_hosted_v1() AND hidden_until>statement_timestamp()),
 candidates AS MATERIALIZED(SELECT j.* FROM public.jobs j
 WHERE j.status=''published'' AND jobs_private.is_public(j) AND jobs_private.visible_to_viewer(j.identity_id)
 AND NOT EXISTS(SELECT 1 FROM viewer_hidden h WHERE h.provider_identity_id=j.identity_id)
 AND (p_category IS NULL OR j.category=p_category) AND (p_country_code IS NULL OR j.country_code=p_country_code)
 AND (p_city IS NULL OR lower(j.city)=lower(btrim(p_city)))
 AND (p_workplace_type IS NULL OR j.workplace_type=p_workplace_type)
 AND (p_employment_type IS NULL OR j.employment_type=p_employment_type)
 AND (p_working_time IS NULL OR j.working_time=p_working_time)
 AND (query_value='''' OR jobs_private.search_document(j.title,j.description,j.category,j.city,j.country_code)@@words)
 AND (cursor_value IS NULL OR (j.published_at,j.id)<((cursor_value->>''published_at'')::timestamptz,(cursor_value->>''id'')::uuid))
 ORDER BY j.published_at DESC,j.id DESC LIMIT p_result_limit+1),page AS MATERIALIZED(
 SELECT * FROM candidates ORDER BY published_at DESC,id DESC LIMIT p_result_limit)
 SELECT (SELECT count(*)>p_result_limit FROM candidates),
 coalesce((SELECT jsonb_agg(jobs_private.public_fields(p) ORDER BY p.published_at DESC,p.id DESC) FROM page p),''[]''::jsonb),
 (SELECT jsonb_build_object(''published_at'',published_at,''id'',id) FROM page ORDER BY published_at,id LIMIT 1)
 INTO more,items,next_value;
 RETURN jsonb_build_object(''schema_version'',1,''items'',items,''result_limit'',p_result_limit,''has_more'',more,
 ''next_cursor'',CASE WHEN more THEN next_value ELSE NULL END,''read_at'',statement_timestamp());
END $f$;

-- Keep the canonical identity/account conversation route. A personal job goes
-- to that identity''s owner, a business job to the existing business owner.
CREATE OR REPLACE FUNCTION jobs_private.contact_snapshot(p_job_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
DECLARE j public.jobs%ROWTYPE;i public.identities%ROWTYPE;owner_user uuid;
BEGIN
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR SHARE;
 IF NOT FOUND OR NOT jobs_private.is_public(j) THEN
  RAISE EXCEPTION ''job_contact_unavailable'' USING ERRCODE=''42501'';END IF;
 SELECT * INTO i FROM public.identities WHERE id=j.identity_id AND status=''active'' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION ''job_contact_unavailable'' USING ERRCODE=''42501'';END IF;
 IF i.type=''private'' AND i.business_account_id IS NULL THEN
  owner_user:=i.user_id;
 ELSIF i.type=''business'' THEN
  SELECT b.owner_user_id INTO owner_user FROM public.business_accounts b
   WHERE b.id=i.business_account_id AND b.status=''active'' FOR SHARE;
 ELSE RAISE EXCEPTION ''job_contact_unavailable'' USING ERRCODE=''42501'';END IF;
 IF owner_user IS NULL THEN RAISE EXCEPTION ''job_contact_unavailable'' USING ERRCODE=''42501'';END IF;
 RETURN jsonb_build_object(''user_id'',owner_user,''identity_id'',j.identity_id,
 ''card'',jsonb_build_object(''content_type'',''job'',''id'',j.id,''title'',j.title,''image'',NULL,''price'',NULL));
END $f$;
';END IF;END $install$;
CREATE TEMP TABLE personal_jobs_after ON COMMIT DROP AS WITH functions AS MATERIALIZED (
 SELECT n.nspname||'.'||p.proname name,p.oid::regprocedure::text signature,jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),
 'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,
 'leakproof',p.proleakproof,'parallel',p.proparallel,'result',pg_get_function_result(p.oid),
 'arguments',p.proargnames,'defaults',pg_get_expr(p.proargdefaults,0),'config',p.proconfig,
 'body',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x)) facts
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname='jobs_private' OR (n.nspname='public' AND p.proname=ANY(ARRAY['get_jobs_capabilities_v1','get_job_categories_v1','get_public_job_v1','search_public_jobs_v1','get_public_profile_jobs_v1','get_my_jobs_v1','get_my_job_v1','get_my_job_policies_v1','get_my_job_request_v1','save_my_job_v1','publish_my_job_v1','set_my_job_status_v1','renew_my_job_activity_v1','contact_my_job_provider_v1','get_my_marketplace_message_thread_v2']::text[]))
 OR n.nspname||'.'||p.proname=ANY(ARRAY['listing_publication_private.require_actor','public.listing_actor_uid_hosted_v1','public.lock_listing_creation_actor_v1','public.current_user_has_identity_access','listing_publication_private.assert_hosted_preview_actor','listing_publication_private.hosted_storage_contract_ready','public.normalize_listing_price_v1','public.listing_price_currency_scale_v1','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_key','listing_contact_private.require_peer','listing_contact_private.require_member','listing_contact_private.require_unblocked','listing_contact_private.guard_message','listing_contact_private.guard_conversation','listing_contact_private.guard_participant','public.send_my_message_v2','public.get_my_message_thread_v2']::text[])
),relations AS MATERIALIZED (
 SELECT n.nspname||'.'||c.relname name,jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,
 'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('position',a.attnum,'name',a.attname,
 'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,
 'default',pg_get_expr(d.adbin,d.adrelid),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(a.attacl) x)) ORDER BY a.attnum),'[]'::jsonb)
 FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
 WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,
 'definition',pg_get_constraintdef(q.oid),'validated',q.convalidated) ORDER BY q.conname COLLATE "C"),'[]'::jsonb)
 FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,
 'definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready,'unique',i.indisunique)
 ORDER BY (i.indexrelid::regclass::text) COLLATE "C"),'[]'::jsonb) FROM pg_index i WHERE i.indrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,
 'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname COLLATE "C"),'[]'::jsonb)
 FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
 'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END
 ORDER BY (CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END) COLLATE "C") FROM unnest(p.polroles) r),
 'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid))
 ORDER BY p.polname COLLATE "C"),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid)) facts FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind IN('r','p') AND (n.nspname='jobs_private' OR n.nspname||'.'||c.relname='public.jobs')
),observed AS MATERIALIZED (
 SELECT jsonb_build_object(
 'functions',(SELECT coalesce(jsonb_agg(facts ORDER BY signature COLLATE "C"),'[]'::jsonb) FROM functions),
 'tables',(SELECT coalesce(jsonb_agg(facts ORDER BY name COLLATE "C"),'[]'::jsonb) FROM relations),
 'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname COLLATE "C"),'[]'::jsonb)
 FROM pg_namespace n WHERE n.nspname='jobs_private'),
 'added_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,'name',t.tgname,
 'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid),'function_owner',pg_get_userbyid(p.proowner))
 ORDER BY (t.tgrelid::regclass::text) COLLATE "C",t.tgname COLLATE "C"),'[]'::jsonb)
 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal
 AND t.tgname IN('job_message_context','job_clear_context','job_clear_on_listing')
 AND t.tgrelid::regclass::text=ANY(ARRAY['public.messages','public.conversations','service_publication_private.thread_context','horse_publication_private.thread_context']))
 ) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('project_ref',s.project_ref,'instance_id',s.instance_id,
 'release_id',s.release_id,'release_ready',s.release_ready,'storage_authority_version',s.storage_authority_version)
 ORDER BY s.instance_id::text COLLATE "C"),'[]'::jsonb) FROM listing_publication_private.hosted_preview_settings s) settings,
 current_user='postgres' AND has_table_privilege(current_user,'listing_publication_private.hosted_preview_settings','SELECT')
 AND NOT row_security_active('listing_publication_private.hosted_preview_settings'::regclass) installer_ready
),measured AS MATERIALIZED (SELECT *,encode(sha256(convert_to((facts)::text,'UTF8')),'hex') scope_sha256 FROM observed),checked AS MATERIALIZED (SELECT *,
 installer_ready AND settings=jsonb_build_array(jsonb_build_object('project_ref','vyjletlmwoiwxsnsunlm',
 'instance_id','2d088814-0900-448a-a9d1-7b05470cb1d2','release_id','listing-publication-hosted-preview-v1','release_ready',true,
 'storage_authority_version','source-part-rfc3986-v1')) context_ready FROM measured)
 SELECT jsonb_build_object('format','selqiro-personal-jobs-state-20261121-v1',
 'state',CASE WHEN context_ready AND scope_sha256='33c8f264b584b8a30cc39253af4a5d2b73f551c530296cc5fca037424fc33721' THEN 'before'
 WHEN context_ready AND scope_sha256='0154e63e365b610241031f5a0e6617abdb918a067212e99b7a82e9cfa06fbb54' THEN 'after' ELSE 'unknown' END,
 'recognized',context_ready AND scope_sha256 IN('33c8f264b584b8a30cc39253af4a5d2b73f551c530296cc5fca037424fc33721','0154e63e365b610241031f5a0e6617abdb918a067212e99b7a82e9cfa06fbb54'),
 'read_only',current_setting('transaction_read_only')='on',
 'project_ref',settings->0->>'project_ref','instance_id',settings->0->>'instance_id','release_id',settings->0->>'release_id',
 'scope_sha256',scope_sha256,'expected_before_sha256','33c8f264b584b8a30cc39253af4a5d2b73f551c530296cc5fca037424fc33721','expected_after_sha256','0154e63e365b610241031f5a0e6617abdb918a067212e99b7a82e9cfa06fbb54',
 'user_rows_read',false) result FROM checked;
DO $verify$ DECLARE b jsonb;a jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.personal_jobs_before;
SELECT result INTO STRICT a FROM pg_temp.personal_jobs_after;
IF (a->>'recognized'='true' AND a->>'state'='after' AND a->>'project_ref'=b->>'project_ref'
AND a->>'instance_id'=b->>'instance_id' AND a->>'release_id'=b->>'release_id') IS NOT TRUE THEN
RAISE EXCEPTION 'PERSONAL_JOBS_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000';END IF;END $verify$;
NOTIFY pgrst,'reload schema';
SELECT result FROM pg_temp.personal_jobs_after;
COMMIT;
