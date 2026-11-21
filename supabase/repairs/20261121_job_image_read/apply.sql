BEGIN;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL timezone='UTC';
SET LOCAL jit=off;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='45s';
SET LOCAL idle_in_transaction_session_timeout='10s';
SET LOCAL transaction_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('selqiro:job-image-read:20261121',0));
CREATE TEMP TABLE job_image_read_before ON COMMIT DROP AS WITH functions AS MATERIALIZED (
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
 OR n.nspname||'.'||p.proname=ANY(ARRAY['listing_publication_private.require_actor','public.listing_actor_uid_hosted_v1','public.lock_listing_creation_actor_v1','public.current_user_has_identity_access','listing_publication_private.assert_hosted_preview_actor','listing_publication_private.hosted_storage_contract_ready','public.normalize_listing_price_v1','public.listing_price_currency_scale_v1','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_key','listing_contact_private.require_peer','listing_contact_private.require_member','listing_contact_private.require_unblocked','listing_contact_private.guard_message','listing_contact_private.guard_conversation','listing_contact_private.guard_participant','public.send_my_message_v2','public.get_my_message_thread_v2','profile_media_private.slot_url','profile_media_private.slot_asset','profile_media_private.public_url','profile_media_private.guard_asset_update']::text[])
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
 WHERE c.relkind IN('r','p') AND (n.nspname='jobs_private' OR n.nspname||'.'||c.relname=ANY(ARRAY['public.jobs','profile_media_private.assets','profile_media_private.identity_state']))
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
 FROM pg_namespace n WHERE n.nspname IN('jobs_private','profile_media_private')),
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
 SELECT jsonb_build_object('format','selqiro-job-image-read-state-20261121-v1',
 'state',CASE WHEN context_ready AND scope_sha256='70f63c1ab7988acb0a8f41d22382d5113e24cfd412754f36e9435217bccf051c' THEN 'before'
 WHEN context_ready AND scope_sha256='683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848' THEN 'after' ELSE 'unknown' END,
 'recognized',context_ready AND scope_sha256 IN('70f63c1ab7988acb0a8f41d22382d5113e24cfd412754f36e9435217bccf051c','683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848'),
 'read_only',current_setting('transaction_read_only')='on',
 'project_ref',settings->0->>'project_ref','instance_id',settings->0->>'instance_id','release_id',settings->0->>'release_id',
 'scope_sha256',scope_sha256,'expected_before_sha256','70f63c1ab7988acb0a8f41d22382d5113e24cfd412754f36e9435217bccf051c','expected_after_sha256','683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848',
 'user_rows_read',false) result FROM checked;
DO $guard$ DECLARE b jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.job_image_read_before;
IF (b->>'recognized'='true' AND b->>'state' IN('before','after')) IS NOT TRUE THEN
RAISE EXCEPTION 'JOB_IMAGE_READ_STATE_NOT_RECOGNIZED' USING ERRCODE='55000';END IF;END $guard$;
DO $install$ DECLARE b jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.job_image_read_before;
IF b->>'state'='before' THEN EXECUTE 'CREATE OR REPLACE FUNCTION jobs_private.public_fields(j public.jobs) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT jsonb_build_object(''schema_version'',1,''content_type'',''job'',''content_id'',j.id,''identity_id'',j.identity_id,
 ''content'',jobs_private.content(j),''status'',''published'',''created_at'',j.created_at,''updated_at'',j.updated_at,
 ''published_at'',j.published_at,''active_until'',j.active_until,
 ''employer'',jsonb_build_object(''name'',coalesce(nullif(btrim(ip.display_name),''''),
  CASE WHEN i.type=''business'' THEN nullif(btrim(b.name),'''') END,''Selqiro''),
 ''slug'',ip.slug,''logo_url'',profile_media_private.slot_url(j.identity_id,''avatar''),''identity_type'',i.type))
 FROM public.identities i LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 JOIN public.identity_profiles ip ON ip.identity_id=i.id WHERE i.id=j.identity_id;
$f$;
';END IF;END $install$;
CREATE TEMP TABLE job_image_read_after ON COMMIT DROP AS WITH functions AS MATERIALIZED (
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
 OR n.nspname||'.'||p.proname=ANY(ARRAY['listing_publication_private.require_actor','public.listing_actor_uid_hosted_v1','public.lock_listing_creation_actor_v1','public.current_user_has_identity_access','listing_publication_private.assert_hosted_preview_actor','listing_publication_private.hosted_storage_contract_ready','public.normalize_listing_price_v1','public.listing_price_currency_scale_v1','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_key','listing_contact_private.require_peer','listing_contact_private.require_member','listing_contact_private.require_unblocked','listing_contact_private.guard_message','listing_contact_private.guard_conversation','listing_contact_private.guard_participant','public.send_my_message_v2','public.get_my_message_thread_v2','profile_media_private.slot_url','profile_media_private.slot_asset','profile_media_private.public_url','profile_media_private.guard_asset_update']::text[])
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
 WHERE c.relkind IN('r','p') AND (n.nspname='jobs_private' OR n.nspname||'.'||c.relname=ANY(ARRAY['public.jobs','profile_media_private.assets','profile_media_private.identity_state']))
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
 FROM pg_namespace n WHERE n.nspname IN('jobs_private','profile_media_private')),
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
 SELECT jsonb_build_object('format','selqiro-job-image-read-state-20261121-v1',
 'state',CASE WHEN context_ready AND scope_sha256='70f63c1ab7988acb0a8f41d22382d5113e24cfd412754f36e9435217bccf051c' THEN 'before'
 WHEN context_ready AND scope_sha256='683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848' THEN 'after' ELSE 'unknown' END,
 'recognized',context_ready AND scope_sha256 IN('70f63c1ab7988acb0a8f41d22382d5113e24cfd412754f36e9435217bccf051c','683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848'),
 'read_only',current_setting('transaction_read_only')='on',
 'project_ref',settings->0->>'project_ref','instance_id',settings->0->>'instance_id','release_id',settings->0->>'release_id',
 'scope_sha256',scope_sha256,'expected_before_sha256','70f63c1ab7988acb0a8f41d22382d5113e24cfd412754f36e9435217bccf051c','expected_after_sha256','683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848',
 'user_rows_read',false) result FROM checked;
DO $verify$ DECLARE b jsonb;a jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.job_image_read_before;
SELECT result INTO STRICT a FROM pg_temp.job_image_read_after;
IF (a->>'recognized'='true' AND a->>'state'='after' AND a->>'project_ref'=b->>'project_ref'
AND a->>'instance_id'=b->>'instance_id' AND a->>'release_id'=b->>'release_id') IS NOT TRUE THEN
RAISE EXCEPTION 'JOB_IMAGE_READ_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000';END IF;END $verify$;
NOTIFY pgrst,'reload schema';
SELECT result FROM pg_temp.job_image_read_after;
COMMIT;
