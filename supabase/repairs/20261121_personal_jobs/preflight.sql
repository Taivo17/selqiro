BEGIN READ ONLY;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL timezone='UTC';
SET LOCAL jit=off;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
WITH functions AS MATERIALIZED (
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
COMMIT;
