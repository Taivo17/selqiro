BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL timezone='UTC';
SET LOCAL jit=off;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='45s';
SET LOCAL idle_in_transaction_session_timeout='10s';
SET LOCAL transaction_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('selqiro:job-owner-read:20261122',0));
CREATE TEMP TABLE job_owner_read_before ON COMMIT DROP AS WITH functions AS MATERIALIZED (
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
),measured AS MATERIALIZED (SELECT *,encode(sha256(convert_to((facts)::text,'UTF8')),'hex') scope_sha256 FROM observed),authority AS MATERIALIZED (WITH authority_relations AS MATERIALIZED (
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
 ORDER BY p.polname COLLATE "C"),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid))||jsonb_build_object(
 'persistence',c.relpersistence,'options',c.reloptions,
 'partition_key',pg_get_partkeydef(c.oid),'partition_bound',pg_get_expr(c.relpartbound,c.oid),
 'inherits',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY (i.inhparent::regclass::text) COLLATE "C"),'[]'::jsonb)
 FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rulename,'definition',pg_get_ruledef(r.oid))
 ORDER BY r.rulename COLLATE "C"),'[]'::jsonb) FROM pg_rewrite r WHERE r.ev_class=c.oid)) facts
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname||'.'||c.relname=ANY(ARRAY['public.profiles','public.identities','public.business_accounts','public.business_members','listing_publication_private.hosted_preview_settings','listing_publication_private.hosted_preview_actors','storage.buckets']::text[])
),authority_functions AS MATERIALIZED (
 SELECT p.oid::regprocedure::text signature,jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),
 'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,
 'leakproof',p.proleakproof,'parallel',p.proparallel,'result',pg_get_function_result(p.oid),
 'arguments',p.proargnames,'defaults',pg_get_expr(p.proargdefaults,0),'config',p.proconfig,
 'body',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x))||jsonb_build_object(
 'returns_set',p.proretset,'cost',p.procost,'rows',p.prorows,'support',p.prosupport::regproc::text) facts
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE (n.nspname='auth' AND p.proname IN('uid','jwt','role'))
 OR EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace s ON s.oid=c.relnamespace
 WHERE t.tgfoid=p.oid AND NOT t.tgisinternal AND s.nspname||'.'||c.relname=ANY(ARRAY['public.profiles','public.identities','public.business_accounts','public.business_members','listing_publication_private.hosted_preview_settings','listing_publication_private.hosted_preview_actors','storage.buckets']::text[]))
 OR EXISTS(SELECT 1 FROM pg_event_trigger e WHERE e.evtfoid=p.oid)
),authority_observed AS MATERIALIZED (
 SELECT jsonb_build_object(
 'tables',(SELECT coalesce(jsonb_agg(facts ORDER BY name COLLATE "C"),'[]'::jsonb) FROM authority_relations),
 'functions',(SELECT coalesce(jsonb_agg(facts ORDER BY signature COLLATE "C"),'[]'::jsonb) FROM authority_functions),
 'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname COLLATE "C"),'[]'::jsonb)
 FROM pg_namespace n WHERE n.nspname=ANY(ARRAY['auth','public','listing_publication_private','storage']::text[])),
 'roles',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rolname,'super',r.rolsuper,'inherit',r.rolinherit,
 'create_role',r.rolcreaterole,'create_db',r.rolcreatedb,'login',r.rolcanlogin,'replication',r.rolreplication,
 'bypass_rls',r.rolbypassrls,'connection_limit',r.rolconnlimit,'valid_until',r.rolvaliduntil,
 'config_sha256',encode(sha256(convert_to((to_jsonb(r.rolconfig))::text,'UTF8')),'hex')) ORDER BY r.rolname COLLATE "C"),'[]'::jsonb) FROM pg_roles r),
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(m.roleid),
 'member',pg_get_userbyid(m.member),'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,
 'inherit',m.inherit_option,'set',m.set_option) ORDER BY pg_get_userbyid(m.roleid) COLLATE "C",
 pg_get_userbyid(m.member) COLLATE "C",pg_get_userbyid(m.grantor) COLLATE "C"),'[]'::jsonb) FROM pg_auth_members m),
 'default_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(d.defaclrole),
 'schema',coalesce(n.nspname,'*'),'type',d.defaclobjtype,'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(d.defaclacl) x))
 ORDER BY pg_get_userbyid(d.defaclrole) COLLATE "C",coalesce(n.nspname,'*') COLLATE "C",d.defaclobjtype),'[]'::jsonb)
 FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
 WHERE d.defaclnamespace=0 OR n.nspname=ANY(ARRAY['auth','public','listing_publication_private','storage']::text[])),
 'role_database_settings',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',CASE WHEN s.setrole=0 THEN 'ALL' ELSE pg_get_userbyid(s.setrole) END,
 'database',CASE WHEN s.setdatabase=0 THEN 'ALL' ELSE current_database() END,'settings_sha256',encode(sha256(convert_to((to_jsonb(s.setconfig))::text,'UTF8')),'hex'))
 ORDER BY s.setdatabase=0,CASE WHEN s.setrole=0 THEN 'ALL' ELSE pg_get_userbyid(s.setrole) END COLLATE "C"),'[]'::jsonb)
 FROM pg_db_role_setting s WHERE s.setdatabase=0 OR s.setdatabase=(SELECT oid FROM pg_database WHERE datname=current_database())),
 'event_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',e.evtname,'event',e.evtevent,
 'owner',pg_get_userbyid(e.evtowner),'function',e.evtfoid::regprocedure::text,'enabled',e.evtenabled,'tags',e.evttags)
 ORDER BY e.evtname COLLATE "C"),'[]'::jsonb) FROM pg_event_trigger e),
 'target_extra_properties',(SELECT jsonb_build_object('kind',p.prokind,'returns_set',p.proretset,
 'cost',p.procost,'rows',p.prorows,'support',p.prosupport::regproc::text,'variadic',p.provariadic::regtype::text,
 'argument_modes',p.proargmodes,'transforms',p.protrftypes::text,'sql_body',p.prosqlbody IS NOT NULL)
 FROM pg_proc p WHERE p.oid=to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'))
 ) authority_facts,
 (
 current_setting('server_version_num')::integer>=170000
 AND current_user='postgres'
 AND current_setting('transaction_isolation')='read committed'
 AND NOT EXISTS(SELECT 1 FROM (VALUES ('public.profiles','id','uuid'),
('public.profiles','active_identity_id','uuid'),
('public.identities','id','uuid'),
('public.identities','type','text'),
('public.identities','user_id','uuid'),
('public.identities','business_account_id','uuid'),
('public.identities','status','text'),
('public.business_accounts','id','uuid'),
('public.business_accounts','status','text'),
('public.business_members','business_account_id','uuid'),
('public.business_members','user_id','uuid'),
('public.business_members','status','text'),
('listing_publication_private.hosted_preview_settings','singleton','boolean'),
('listing_publication_private.hosted_preview_settings','project_ref','text'),
('listing_publication_private.hosted_preview_settings','instance_id','uuid'),
('listing_publication_private.hosted_preview_settings','release_id','text'),
('listing_publication_private.hosted_preview_settings','enabled','boolean'),
('listing_publication_private.hosted_preview_settings','release_ready','boolean'),
('listing_publication_private.hosted_preview_settings','storage_authority_version','text'),
('listing_publication_private.hosted_preview_actors','actor_user_id','uuid')) e(relation_name,column_name,type_name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
 WHERE a.attrelid=to_regclass(e.relation_name) AND c.relkind IN('r','p') AND a.attnum>0 AND NOT a.attisdropped
 AND a.attname=e.column_name AND a.atttypid=to_regtype(e.type_name)))
 AND NOT EXISTS(SELECT 1 FROM (VALUES ('public.profiles','id'),
('public.identities','id'),
('public.business_accounts','id'),
('listing_publication_private.hosted_preview_settings','singleton'),
('listing_publication_private.hosted_preview_actors','actor_user_id')) e(relation_name,column_name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_index i ON i.indrelid=a.attrelid
 WHERE a.attrelid=to_regclass(e.relation_name) AND a.attname=e.column_name AND a.attnotnull AND NOT a.attisdropped
 AND i.indisunique AND i.indisvalid AND i.indisready AND i.indnkeyatts=1 AND i.indkey[0]=a.attnum
 AND i.indexprs IS NULL AND i.indpred IS NULL))
 AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY['public.profiles','public.identities','public.business_accounts','public.business_members','listing_publication_private.hosted_preview_settings','listing_publication_private.hosted_preview_actors']::text[]) e(name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.oid=to_regclass(e.name) AND c.relrowsecurity))
 AND EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('auth.uid()') AND p.prorettype='uuid'::regtype
 AND p.provolatile IN('s','i') AND NOT p.proretset)
 AND EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)')
 AND p.prokind='f' AND NOT p.proretset AND p.procost=100 AND p.prorows=0 AND p.prosupport=0 AND p.provariadic=0
 AND p.proargmodes IS NULL AND p.protrftypes IS NULL AND p.prosqlbody IS NULL
 AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid
 AND d.refclassid='pg_extension'::regclass AND d.deptype='e'))
 AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role','authenticator')
 AND pg_has_role(r.oid,'postgres','MEMBER'))
 AND coalesce(has_function_privilege('authenticated',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),false)
 AND NOT coalesce(has_function_privilege('anon',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),true)
 AND NOT coalesce(has_function_privilege('service_role',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),true)) authority_contract_ready
),authority_measured AS MATERIALIZED (SELECT *,encode(sha256(convert_to((authority_facts)::text,'UTF8')),'hex') authority_sha256 FROM authority_observed)
 SELECT authority_facts,authority_contract_ready,authority_sha256 FROM authority_measured),checked AS MATERIALIZED (SELECT measured.*,authority.authority_contract_ready,
 installer_ready AND authority_contract_ready AND settings=jsonb_build_array(jsonb_build_object(
 'project_ref','vyjletlmwoiwxsnsunlm','instance_id','2d088814-0900-448a-a9d1-7b05470cb1d2','release_id','listing-publication-hosted-preview-v1',
 'release_ready',true,'storage_authority_version','source-part-rfc3986-v1')) context_ready FROM measured CROSS JOIN authority)
 SELECT jsonb_build_object('format','selqiro-job-owner-read-state-20261122-v1',
 'state',CASE WHEN context_ready AND scope_sha256='683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848' THEN 'before'
 WHEN context_ready AND scope_sha256='0be7544243260b409badb5a5f09dee9308663d089236acdfdef421b34b1173ef' THEN 'after' ELSE 'unknown' END,
 'recognized',context_ready AND scope_sha256 IN('683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848','0be7544243260b409badb5a5f09dee9308663d089236acdfdef421b34b1173ef'),
 'read_only',current_setting('transaction_read_only')='on',
 'project_ref',settings->0->>'project_ref','instance_id',settings->0->>'instance_id','release_id',settings->0->>'release_id',
 'scope_sha256',scope_sha256,'expected_before_sha256','683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848','expected_after_sha256','0be7544243260b409badb5a5f09dee9308663d089236acdfdef421b34b1173ef',
 'user_rows_read',false) result FROM checked;
DO $guard$ DECLARE b jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.job_owner_read_before;
IF (b->>'recognized'='true' AND b->>'state' IN('before','after')) IS NOT TRUE THEN
RAISE EXCEPTION 'JOB_OWNER_READ_STATE_NOT_RECOGNIZED' USING ERRCODE='55000';END IF;END $guard$;
CREATE TEMP TABLE job_owner_read_authority_before ON COMMIT DROP AS WITH authority_relations AS MATERIALIZED (
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
 ORDER BY p.polname COLLATE "C"),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid))||jsonb_build_object(
 'persistence',c.relpersistence,'options',c.reloptions,
 'partition_key',pg_get_partkeydef(c.oid),'partition_bound',pg_get_expr(c.relpartbound,c.oid),
 'inherits',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY (i.inhparent::regclass::text) COLLATE "C"),'[]'::jsonb)
 FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rulename,'definition',pg_get_ruledef(r.oid))
 ORDER BY r.rulename COLLATE "C"),'[]'::jsonb) FROM pg_rewrite r WHERE r.ev_class=c.oid)) facts
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname||'.'||c.relname=ANY(ARRAY['public.profiles','public.identities','public.business_accounts','public.business_members','listing_publication_private.hosted_preview_settings','listing_publication_private.hosted_preview_actors','storage.buckets']::text[])
),authority_functions AS MATERIALIZED (
 SELECT p.oid::regprocedure::text signature,jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),
 'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,
 'leakproof',p.proleakproof,'parallel',p.proparallel,'result',pg_get_function_result(p.oid),
 'arguments',p.proargnames,'defaults',pg_get_expr(p.proargdefaults,0),'config',p.proconfig,
 'body',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x))||jsonb_build_object(
 'returns_set',p.proretset,'cost',p.procost,'rows',p.prorows,'support',p.prosupport::regproc::text) facts
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE (n.nspname='auth' AND p.proname IN('uid','jwt','role'))
 OR EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace s ON s.oid=c.relnamespace
 WHERE t.tgfoid=p.oid AND NOT t.tgisinternal AND s.nspname||'.'||c.relname=ANY(ARRAY['public.profiles','public.identities','public.business_accounts','public.business_members','listing_publication_private.hosted_preview_settings','listing_publication_private.hosted_preview_actors','storage.buckets']::text[]))
 OR EXISTS(SELECT 1 FROM pg_event_trigger e WHERE e.evtfoid=p.oid)
),authority_observed AS MATERIALIZED (
 SELECT jsonb_build_object(
 'tables',(SELECT coalesce(jsonb_agg(facts ORDER BY name COLLATE "C"),'[]'::jsonb) FROM authority_relations),
 'functions',(SELECT coalesce(jsonb_agg(facts ORDER BY signature COLLATE "C"),'[]'::jsonb) FROM authority_functions),
 'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname COLLATE "C"),'[]'::jsonb)
 FROM pg_namespace n WHERE n.nspname=ANY(ARRAY['auth','public','listing_publication_private','storage']::text[])),
 'roles',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rolname,'super',r.rolsuper,'inherit',r.rolinherit,
 'create_role',r.rolcreaterole,'create_db',r.rolcreatedb,'login',r.rolcanlogin,'replication',r.rolreplication,
 'bypass_rls',r.rolbypassrls,'connection_limit',r.rolconnlimit,'valid_until',r.rolvaliduntil,
 'config_sha256',encode(sha256(convert_to((to_jsonb(r.rolconfig))::text,'UTF8')),'hex')) ORDER BY r.rolname COLLATE "C"),'[]'::jsonb) FROM pg_roles r),
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(m.roleid),
 'member',pg_get_userbyid(m.member),'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,
 'inherit',m.inherit_option,'set',m.set_option) ORDER BY pg_get_userbyid(m.roleid) COLLATE "C",
 pg_get_userbyid(m.member) COLLATE "C",pg_get_userbyid(m.grantor) COLLATE "C"),'[]'::jsonb) FROM pg_auth_members m),
 'default_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(d.defaclrole),
 'schema',coalesce(n.nspname,'*'),'type',d.defaclobjtype,'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(d.defaclacl) x))
 ORDER BY pg_get_userbyid(d.defaclrole) COLLATE "C",coalesce(n.nspname,'*') COLLATE "C",d.defaclobjtype),'[]'::jsonb)
 FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
 WHERE d.defaclnamespace=0 OR n.nspname=ANY(ARRAY['auth','public','listing_publication_private','storage']::text[])),
 'role_database_settings',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',CASE WHEN s.setrole=0 THEN 'ALL' ELSE pg_get_userbyid(s.setrole) END,
 'database',CASE WHEN s.setdatabase=0 THEN 'ALL' ELSE current_database() END,'settings_sha256',encode(sha256(convert_to((to_jsonb(s.setconfig))::text,'UTF8')),'hex'))
 ORDER BY s.setdatabase=0,CASE WHEN s.setrole=0 THEN 'ALL' ELSE pg_get_userbyid(s.setrole) END COLLATE "C"),'[]'::jsonb)
 FROM pg_db_role_setting s WHERE s.setdatabase=0 OR s.setdatabase=(SELECT oid FROM pg_database WHERE datname=current_database())),
 'event_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',e.evtname,'event',e.evtevent,
 'owner',pg_get_userbyid(e.evtowner),'function',e.evtfoid::regprocedure::text,'enabled',e.evtenabled,'tags',e.evttags)
 ORDER BY e.evtname COLLATE "C"),'[]'::jsonb) FROM pg_event_trigger e),
 'target_extra_properties',(SELECT jsonb_build_object('kind',p.prokind,'returns_set',p.proretset,
 'cost',p.procost,'rows',p.prorows,'support',p.prosupport::regproc::text,'variadic',p.provariadic::regtype::text,
 'argument_modes',p.proargmodes,'transforms',p.protrftypes::text,'sql_body',p.prosqlbody IS NOT NULL)
 FROM pg_proc p WHERE p.oid=to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'))
 ) authority_facts,
 (
 current_setting('server_version_num')::integer>=170000
 AND current_user='postgres'
 AND current_setting('transaction_isolation')='read committed'
 AND NOT EXISTS(SELECT 1 FROM (VALUES ('public.profiles','id','uuid'),
('public.profiles','active_identity_id','uuid'),
('public.identities','id','uuid'),
('public.identities','type','text'),
('public.identities','user_id','uuid'),
('public.identities','business_account_id','uuid'),
('public.identities','status','text'),
('public.business_accounts','id','uuid'),
('public.business_accounts','status','text'),
('public.business_members','business_account_id','uuid'),
('public.business_members','user_id','uuid'),
('public.business_members','status','text'),
('listing_publication_private.hosted_preview_settings','singleton','boolean'),
('listing_publication_private.hosted_preview_settings','project_ref','text'),
('listing_publication_private.hosted_preview_settings','instance_id','uuid'),
('listing_publication_private.hosted_preview_settings','release_id','text'),
('listing_publication_private.hosted_preview_settings','enabled','boolean'),
('listing_publication_private.hosted_preview_settings','release_ready','boolean'),
('listing_publication_private.hosted_preview_settings','storage_authority_version','text'),
('listing_publication_private.hosted_preview_actors','actor_user_id','uuid')) e(relation_name,column_name,type_name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
 WHERE a.attrelid=to_regclass(e.relation_name) AND c.relkind IN('r','p') AND a.attnum>0 AND NOT a.attisdropped
 AND a.attname=e.column_name AND a.atttypid=to_regtype(e.type_name)))
 AND NOT EXISTS(SELECT 1 FROM (VALUES ('public.profiles','id'),
('public.identities','id'),
('public.business_accounts','id'),
('listing_publication_private.hosted_preview_settings','singleton'),
('listing_publication_private.hosted_preview_actors','actor_user_id')) e(relation_name,column_name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_index i ON i.indrelid=a.attrelid
 WHERE a.attrelid=to_regclass(e.relation_name) AND a.attname=e.column_name AND a.attnotnull AND NOT a.attisdropped
 AND i.indisunique AND i.indisvalid AND i.indisready AND i.indnkeyatts=1 AND i.indkey[0]=a.attnum
 AND i.indexprs IS NULL AND i.indpred IS NULL))
 AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY['public.profiles','public.identities','public.business_accounts','public.business_members','listing_publication_private.hosted_preview_settings','listing_publication_private.hosted_preview_actors']::text[]) e(name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.oid=to_regclass(e.name) AND c.relrowsecurity))
 AND EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('auth.uid()') AND p.prorettype='uuid'::regtype
 AND p.provolatile IN('s','i') AND NOT p.proretset)
 AND EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)')
 AND p.prokind='f' AND NOT p.proretset AND p.procost=100 AND p.prorows=0 AND p.prosupport=0 AND p.provariadic=0
 AND p.proargmodes IS NULL AND p.protrftypes IS NULL AND p.prosqlbody IS NULL
 AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid
 AND d.refclassid='pg_extension'::regclass AND d.deptype='e'))
 AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role','authenticator')
 AND pg_has_role(r.oid,'postgres','MEMBER'))
 AND coalesce(has_function_privilege('authenticated',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),false)
 AND NOT coalesce(has_function_privilege('anon',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),true)
 AND NOT coalesce(has_function_privilege('service_role',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),true)) authority_contract_ready
),authority_measured AS MATERIALIZED (SELECT *,encode(sha256(convert_to((authority_facts)::text,'UTF8')),'hex') authority_sha256 FROM authority_observed)
 SELECT authority_facts,authority_contract_ready,authority_sha256 FROM authority_measured;
DO $install$ DECLARE b jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.job_owner_read_before;
IF b->>'state'='before' THEN EXECUTE '-- One read RPC only. Shared mutation authority and its transaction locks stay unchanged.
-- STABLE makes every authority check and the page use the calling statement''s snapshot.
CREATE OR REPLACE FUNCTION public.get_my_jobs_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,
 p_result_limit integer DEFAULT 24,p_cursor jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' SET lock_timeout=''2s'' AS $f$
DECLARE
 actor uuid;
 active_id uuid;
 identity_row public.identities%ROWTYPE;
 config listing_publication_private.hosted_preview_settings%ROWTYPE;
 cursor_value jsonb;items jsonb;more boolean;next_value jsonb;
 read_time timestamptz:=statement_timestamp();
BEGIN
 -- Preserve the shared actor contract and its refusal order without taking row locks.
 IF current_setting(''transaction_isolation'')<>''read committed'' THEN
  RAISE EXCEPTION ''publication_read_committed_required'' USING ERRCODE=''25001'';
 END IF;
 actor:=public.listing_actor_uid_hosted_v1();
 IF actor IS NULL OR p_expected_user_id IS NULL OR actor IS DISTINCT FROM p_expected_user_id THEN
  RAISE EXCEPTION ''publication_account_changed'' USING ERRCODE=''42501'';
 END IF;

 SELECT * INTO config FROM listing_publication_private.hosted_preview_settings WHERE singleton;
 IF NOT FOUND OR NOT config.enabled OR NOT config.release_ready
  OR config.storage_authority_version IS DISTINCT FROM ''source-part-rfc3986-v1''
  OR NOT listing_publication_private.hosted_storage_contract_ready() THEN
  RAISE EXCEPTION ''publication_hosted_preview_disabled'' USING ERRCODE=''55000'';
 END IF;
 PERFORM 1 FROM listing_publication_private.hosted_preview_actors WHERE actor_user_id=actor;
 IF NOT FOUND THEN
  RAISE EXCEPTION ''publication_hosted_preview_actor_forbidden'' USING ERRCODE=''42501'';
 END IF;
 IF p_expected_identity_id IS NULL THEN
  RAISE EXCEPTION ''listing_price_identity_required'' USING ERRCODE=''42501'';
 END IF;

 SELECT p.active_identity_id INTO active_id FROM public.profiles p WHERE p.id=actor;
 IF active_id IS NULL OR active_id IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION ''listing_price_identity_changed'' USING ERRCODE=''42501'';
 END IF;
 SELECT i.* INTO identity_row FROM public.identities i WHERE i.id=active_id AND i.status=''active'';
 IF NOT FOUND THEN
  RAISE EXCEPTION ''listing_price_identity_forbidden'' USING ERRCODE=''42501'';
 END IF;
 IF identity_row.type=''business'' THEN
  PERFORM 1 FROM public.business_members m WHERE m.business_account_id=identity_row.business_account_id
   AND m.user_id=actor AND m.status=''active'';
  IF NOT FOUND THEN
   RAISE EXCEPTION ''listing_price_identity_forbidden'' USING ERRCODE=''42501'';
  END IF;
 END IF;
 IF public.current_user_has_identity_access(active_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION ''listing_price_identity_forbidden'' USING ERRCODE=''42501'';
 END IF;

 -- Preserve the job-specific private/business rules after the shared checks.
 IF identity_row.type=''private'' THEN
  IF identity_row.user_id IS DISTINCT FROM p_expected_user_id OR identity_row.business_account_id IS NOT NULL THEN
   RAISE EXCEPTION ''job_identity_forbidden'' USING ERRCODE=''42501'';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_expected_user_id;
  IF NOT FOUND THEN
   RAISE EXCEPTION ''job_identity_unavailable'' USING ERRCODE=''42501'';
  END IF;
 ELSIF identity_row.type=''business'' THEN
  PERFORM 1 FROM public.business_accounts WHERE id=identity_row.business_account_id AND status=''active'';
  IF NOT FOUND THEN
   RAISE EXCEPTION ''job_business_unavailable'' USING ERRCODE=''42501'';
  END IF;
  PERFORM 1 FROM public.business_members WHERE business_account_id=identity_row.business_account_id
   AND user_id=p_expected_user_id AND status=''active'';
  IF NOT FOUND THEN
   RAISE EXCEPTION ''job_business_forbidden'' USING ERRCODE=''42501'';
  END IF;
 ELSE
  RAISE EXCEPTION ''job_identity_forbidden'' USING ERRCODE=''42501'';
 END IF;

 IF p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50 THEN
  RAISE EXCEPTION ''job_page_invalid'' USING ERRCODE=''22023'';
 END IF;
 cursor_value:=jobs_private.cursor(p_cursor,''created_at'');
 WITH candidates AS MATERIALIZED(SELECT j.* FROM public.jobs j WHERE j.identity_id=p_expected_identity_id
 AND (cursor_value IS NULL OR (j.created_at,j.id)<((cursor_value->>''created_at'')::timestamptz,(cursor_value->>''id'')::uuid))
 ORDER BY j.created_at DESC,j.id DESC LIMIT p_result_limit+1), page AS MATERIALIZED(
 SELECT * FROM candidates ORDER BY created_at DESC,id DESC LIMIT p_result_limit)
 SELECT (SELECT count(*)>p_result_limit FROM candidates),
 coalesce((SELECT jsonb_agg(jobs_private.owner_fields(p,p_expected_user_id) ORDER BY p.created_at DESC,p.id DESC) FROM page p),''[]''::jsonb),
 (SELECT jsonb_build_object(''created_at'',created_at,''id'',id) FROM page ORDER BY created_at,id LIMIT 1)
 INTO more,items,next_value;
 RETURN jsonb_build_object(''schema_version'',1,''actor_user_id'',p_expected_user_id,''identity_id'',p_expected_identity_id,
 ''items'',items,''result_limit'',p_result_limit,''has_more'',more,''next_cursor'',CASE WHEN more THEN next_value ELSE NULL END,''read_at'',read_time);
END $f$;
';END IF;END $install$;
CREATE TEMP TABLE job_owner_read_after ON COMMIT DROP AS WITH functions AS MATERIALIZED (
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
),measured AS MATERIALIZED (SELECT *,encode(sha256(convert_to((facts)::text,'UTF8')),'hex') scope_sha256 FROM observed),authority AS MATERIALIZED (WITH authority_relations AS MATERIALIZED (
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
 ORDER BY p.polname COLLATE "C"),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid))||jsonb_build_object(
 'persistence',c.relpersistence,'options',c.reloptions,
 'partition_key',pg_get_partkeydef(c.oid),'partition_bound',pg_get_expr(c.relpartbound,c.oid),
 'inherits',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY (i.inhparent::regclass::text) COLLATE "C"),'[]'::jsonb)
 FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rulename,'definition',pg_get_ruledef(r.oid))
 ORDER BY r.rulename COLLATE "C"),'[]'::jsonb) FROM pg_rewrite r WHERE r.ev_class=c.oid)) facts
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname||'.'||c.relname=ANY(ARRAY['public.profiles','public.identities','public.business_accounts','public.business_members','listing_publication_private.hosted_preview_settings','listing_publication_private.hosted_preview_actors','storage.buckets']::text[])
),authority_functions AS MATERIALIZED (
 SELECT p.oid::regprocedure::text signature,jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),
 'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,
 'leakproof',p.proleakproof,'parallel',p.proparallel,'result',pg_get_function_result(p.oid),
 'arguments',p.proargnames,'defaults',pg_get_expr(p.proargdefaults,0),'config',p.proconfig,
 'body',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x))||jsonb_build_object(
 'returns_set',p.proretset,'cost',p.procost,'rows',p.prorows,'support',p.prosupport::regproc::text) facts
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE (n.nspname='auth' AND p.proname IN('uid','jwt','role'))
 OR EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace s ON s.oid=c.relnamespace
 WHERE t.tgfoid=p.oid AND NOT t.tgisinternal AND s.nspname||'.'||c.relname=ANY(ARRAY['public.profiles','public.identities','public.business_accounts','public.business_members','listing_publication_private.hosted_preview_settings','listing_publication_private.hosted_preview_actors','storage.buckets']::text[]))
 OR EXISTS(SELECT 1 FROM pg_event_trigger e WHERE e.evtfoid=p.oid)
),authority_observed AS MATERIALIZED (
 SELECT jsonb_build_object(
 'tables',(SELECT coalesce(jsonb_agg(facts ORDER BY name COLLATE "C"),'[]'::jsonb) FROM authority_relations),
 'functions',(SELECT coalesce(jsonb_agg(facts ORDER BY signature COLLATE "C"),'[]'::jsonb) FROM authority_functions),
 'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname COLLATE "C"),'[]'::jsonb)
 FROM pg_namespace n WHERE n.nspname=ANY(ARRAY['auth','public','listing_publication_private','storage']::text[])),
 'roles',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rolname,'super',r.rolsuper,'inherit',r.rolinherit,
 'create_role',r.rolcreaterole,'create_db',r.rolcreatedb,'login',r.rolcanlogin,'replication',r.rolreplication,
 'bypass_rls',r.rolbypassrls,'connection_limit',r.rolconnlimit,'valid_until',r.rolvaliduntil,
 'config_sha256',encode(sha256(convert_to((to_jsonb(r.rolconfig))::text,'UTF8')),'hex')) ORDER BY r.rolname COLLATE "C"),'[]'::jsonb) FROM pg_roles r),
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(m.roleid),
 'member',pg_get_userbyid(m.member),'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,
 'inherit',m.inherit_option,'set',m.set_option) ORDER BY pg_get_userbyid(m.roleid) COLLATE "C",
 pg_get_userbyid(m.member) COLLATE "C",pg_get_userbyid(m.grantor) COLLATE "C"),'[]'::jsonb) FROM pg_auth_members m),
 'default_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(d.defaclrole),
 'schema',coalesce(n.nspname,'*'),'type',d.defaclobjtype,'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(d.defaclacl) x))
 ORDER BY pg_get_userbyid(d.defaclrole) COLLATE "C",coalesce(n.nspname,'*') COLLATE "C",d.defaclobjtype),'[]'::jsonb)
 FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
 WHERE d.defaclnamespace=0 OR n.nspname=ANY(ARRAY['auth','public','listing_publication_private','storage']::text[])),
 'role_database_settings',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',CASE WHEN s.setrole=0 THEN 'ALL' ELSE pg_get_userbyid(s.setrole) END,
 'database',CASE WHEN s.setdatabase=0 THEN 'ALL' ELSE current_database() END,'settings_sha256',encode(sha256(convert_to((to_jsonb(s.setconfig))::text,'UTF8')),'hex'))
 ORDER BY s.setdatabase=0,CASE WHEN s.setrole=0 THEN 'ALL' ELSE pg_get_userbyid(s.setrole) END COLLATE "C"),'[]'::jsonb)
 FROM pg_db_role_setting s WHERE s.setdatabase=0 OR s.setdatabase=(SELECT oid FROM pg_database WHERE datname=current_database())),
 'event_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',e.evtname,'event',e.evtevent,
 'owner',pg_get_userbyid(e.evtowner),'function',e.evtfoid::regprocedure::text,'enabled',e.evtenabled,'tags',e.evttags)
 ORDER BY e.evtname COLLATE "C"),'[]'::jsonb) FROM pg_event_trigger e),
 'target_extra_properties',(SELECT jsonb_build_object('kind',p.prokind,'returns_set',p.proretset,
 'cost',p.procost,'rows',p.prorows,'support',p.prosupport::regproc::text,'variadic',p.provariadic::regtype::text,
 'argument_modes',p.proargmodes,'transforms',p.protrftypes::text,'sql_body',p.prosqlbody IS NOT NULL)
 FROM pg_proc p WHERE p.oid=to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'))
 ) authority_facts,
 (
 current_setting('server_version_num')::integer>=170000
 AND current_user='postgres'
 AND current_setting('transaction_isolation')='read committed'
 AND NOT EXISTS(SELECT 1 FROM (VALUES ('public.profiles','id','uuid'),
('public.profiles','active_identity_id','uuid'),
('public.identities','id','uuid'),
('public.identities','type','text'),
('public.identities','user_id','uuid'),
('public.identities','business_account_id','uuid'),
('public.identities','status','text'),
('public.business_accounts','id','uuid'),
('public.business_accounts','status','text'),
('public.business_members','business_account_id','uuid'),
('public.business_members','user_id','uuid'),
('public.business_members','status','text'),
('listing_publication_private.hosted_preview_settings','singleton','boolean'),
('listing_publication_private.hosted_preview_settings','project_ref','text'),
('listing_publication_private.hosted_preview_settings','instance_id','uuid'),
('listing_publication_private.hosted_preview_settings','release_id','text'),
('listing_publication_private.hosted_preview_settings','enabled','boolean'),
('listing_publication_private.hosted_preview_settings','release_ready','boolean'),
('listing_publication_private.hosted_preview_settings','storage_authority_version','text'),
('listing_publication_private.hosted_preview_actors','actor_user_id','uuid')) e(relation_name,column_name,type_name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
 WHERE a.attrelid=to_regclass(e.relation_name) AND c.relkind IN('r','p') AND a.attnum>0 AND NOT a.attisdropped
 AND a.attname=e.column_name AND a.atttypid=to_regtype(e.type_name)))
 AND NOT EXISTS(SELECT 1 FROM (VALUES ('public.profiles','id'),
('public.identities','id'),
('public.business_accounts','id'),
('listing_publication_private.hosted_preview_settings','singleton'),
('listing_publication_private.hosted_preview_actors','actor_user_id')) e(relation_name,column_name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_index i ON i.indrelid=a.attrelid
 WHERE a.attrelid=to_regclass(e.relation_name) AND a.attname=e.column_name AND a.attnotnull AND NOT a.attisdropped
 AND i.indisunique AND i.indisvalid AND i.indisready AND i.indnkeyatts=1 AND i.indkey[0]=a.attnum
 AND i.indexprs IS NULL AND i.indpred IS NULL))
 AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY['public.profiles','public.identities','public.business_accounts','public.business_members','listing_publication_private.hosted_preview_settings','listing_publication_private.hosted_preview_actors']::text[]) e(name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.oid=to_regclass(e.name) AND c.relrowsecurity))
 AND EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('auth.uid()') AND p.prorettype='uuid'::regtype
 AND p.provolatile IN('s','i') AND NOT p.proretset)
 AND EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)')
 AND p.prokind='f' AND NOT p.proretset AND p.procost=100 AND p.prorows=0 AND p.prosupport=0 AND p.provariadic=0
 AND p.proargmodes IS NULL AND p.protrftypes IS NULL AND p.prosqlbody IS NULL
 AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid
 AND d.refclassid='pg_extension'::regclass AND d.deptype='e'))
 AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role','authenticator')
 AND pg_has_role(r.oid,'postgres','MEMBER'))
 AND coalesce(has_function_privilege('authenticated',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),false)
 AND NOT coalesce(has_function_privilege('anon',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),true)
 AND NOT coalesce(has_function_privilege('service_role',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),true)) authority_contract_ready
),authority_measured AS MATERIALIZED (SELECT *,encode(sha256(convert_to((authority_facts)::text,'UTF8')),'hex') authority_sha256 FROM authority_observed)
 SELECT authority_facts,authority_contract_ready,authority_sha256 FROM authority_measured),checked AS MATERIALIZED (SELECT measured.*,authority.authority_contract_ready,
 installer_ready AND authority_contract_ready AND settings=jsonb_build_array(jsonb_build_object(
 'project_ref','vyjletlmwoiwxsnsunlm','instance_id','2d088814-0900-448a-a9d1-7b05470cb1d2','release_id','listing-publication-hosted-preview-v1',
 'release_ready',true,'storage_authority_version','source-part-rfc3986-v1')) context_ready FROM measured CROSS JOIN authority)
 SELECT jsonb_build_object('format','selqiro-job-owner-read-state-20261122-v1',
 'state',CASE WHEN context_ready AND scope_sha256='683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848' THEN 'before'
 WHEN context_ready AND scope_sha256='0be7544243260b409badb5a5f09dee9308663d089236acdfdef421b34b1173ef' THEN 'after' ELSE 'unknown' END,
 'recognized',context_ready AND scope_sha256 IN('683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848','0be7544243260b409badb5a5f09dee9308663d089236acdfdef421b34b1173ef'),
 'read_only',current_setting('transaction_read_only')='on',
 'project_ref',settings->0->>'project_ref','instance_id',settings->0->>'instance_id','release_id',settings->0->>'release_id',
 'scope_sha256',scope_sha256,'expected_before_sha256','683ed8976cafce8aaf59e1169014bf6f1d6ff977c9e45bf04699071ba4369848','expected_after_sha256','0be7544243260b409badb5a5f09dee9308663d089236acdfdef421b34b1173ef',
 'user_rows_read',false) result FROM checked;
CREATE TEMP TABLE job_owner_read_authority_after ON COMMIT DROP AS WITH authority_relations AS MATERIALIZED (
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
 ORDER BY p.polname COLLATE "C"),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid))||jsonb_build_object(
 'persistence',c.relpersistence,'options',c.reloptions,
 'partition_key',pg_get_partkeydef(c.oid),'partition_bound',pg_get_expr(c.relpartbound,c.oid),
 'inherits',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY (i.inhparent::regclass::text) COLLATE "C"),'[]'::jsonb)
 FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rulename,'definition',pg_get_ruledef(r.oid))
 ORDER BY r.rulename COLLATE "C"),'[]'::jsonb) FROM pg_rewrite r WHERE r.ev_class=c.oid)) facts
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname||'.'||c.relname=ANY(ARRAY['public.profiles','public.identities','public.business_accounts','public.business_members','listing_publication_private.hosted_preview_settings','listing_publication_private.hosted_preview_actors','storage.buckets']::text[])
),authority_functions AS MATERIALIZED (
 SELECT p.oid::regprocedure::text signature,jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),
 'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,
 'leakproof',p.proleakproof,'parallel',p.proparallel,'result',pg_get_function_result(p.oid),
 'arguments',p.proargnames,'defaults',pg_get_expr(p.proargdefaults,0),'config',p.proconfig,
 'body',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x))||jsonb_build_object(
 'returns_set',p.proretset,'cost',p.procost,'rows',p.prorows,'support',p.prosupport::regproc::text) facts
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE (n.nspname='auth' AND p.proname IN('uid','jwt','role'))
 OR EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace s ON s.oid=c.relnamespace
 WHERE t.tgfoid=p.oid AND NOT t.tgisinternal AND s.nspname||'.'||c.relname=ANY(ARRAY['public.profiles','public.identities','public.business_accounts','public.business_members','listing_publication_private.hosted_preview_settings','listing_publication_private.hosted_preview_actors','storage.buckets']::text[]))
 OR EXISTS(SELECT 1 FROM pg_event_trigger e WHERE e.evtfoid=p.oid)
),authority_observed AS MATERIALIZED (
 SELECT jsonb_build_object(
 'tables',(SELECT coalesce(jsonb_agg(facts ORDER BY name COLLATE "C"),'[]'::jsonb) FROM authority_relations),
 'functions',(SELECT coalesce(jsonb_agg(facts ORDER BY signature COLLATE "C"),'[]'::jsonb) FROM authority_functions),
 'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname COLLATE "C"),'[]'::jsonb)
 FROM pg_namespace n WHERE n.nspname=ANY(ARRAY['auth','public','listing_publication_private','storage']::text[])),
 'roles',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rolname,'super',r.rolsuper,'inherit',r.rolinherit,
 'create_role',r.rolcreaterole,'create_db',r.rolcreatedb,'login',r.rolcanlogin,'replication',r.rolreplication,
 'bypass_rls',r.rolbypassrls,'connection_limit',r.rolconnlimit,'valid_until',r.rolvaliduntil,
 'config_sha256',encode(sha256(convert_to((to_jsonb(r.rolconfig))::text,'UTF8')),'hex')) ORDER BY r.rolname COLLATE "C"),'[]'::jsonb) FROM pg_roles r),
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(m.roleid),
 'member',pg_get_userbyid(m.member),'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,
 'inherit',m.inherit_option,'set',m.set_option) ORDER BY pg_get_userbyid(m.roleid) COLLATE "C",
 pg_get_userbyid(m.member) COLLATE "C",pg_get_userbyid(m.grantor) COLLATE "C"),'[]'::jsonb) FROM pg_auth_members m),
 'default_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(d.defaclrole),
 'schema',coalesce(n.nspname,'*'),'type',d.defaclobjtype,'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(d.defaclacl) x))
 ORDER BY pg_get_userbyid(d.defaclrole) COLLATE "C",coalesce(n.nspname,'*') COLLATE "C",d.defaclobjtype),'[]'::jsonb)
 FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
 WHERE d.defaclnamespace=0 OR n.nspname=ANY(ARRAY['auth','public','listing_publication_private','storage']::text[])),
 'role_database_settings',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',CASE WHEN s.setrole=0 THEN 'ALL' ELSE pg_get_userbyid(s.setrole) END,
 'database',CASE WHEN s.setdatabase=0 THEN 'ALL' ELSE current_database() END,'settings_sha256',encode(sha256(convert_to((to_jsonb(s.setconfig))::text,'UTF8')),'hex'))
 ORDER BY s.setdatabase=0,CASE WHEN s.setrole=0 THEN 'ALL' ELSE pg_get_userbyid(s.setrole) END COLLATE "C"),'[]'::jsonb)
 FROM pg_db_role_setting s WHERE s.setdatabase=0 OR s.setdatabase=(SELECT oid FROM pg_database WHERE datname=current_database())),
 'event_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',e.evtname,'event',e.evtevent,
 'owner',pg_get_userbyid(e.evtowner),'function',e.evtfoid::regprocedure::text,'enabled',e.evtenabled,'tags',e.evttags)
 ORDER BY e.evtname COLLATE "C"),'[]'::jsonb) FROM pg_event_trigger e),
 'target_extra_properties',(SELECT jsonb_build_object('kind',p.prokind,'returns_set',p.proretset,
 'cost',p.procost,'rows',p.prorows,'support',p.prosupport::regproc::text,'variadic',p.provariadic::regtype::text,
 'argument_modes',p.proargmodes,'transforms',p.protrftypes::text,'sql_body',p.prosqlbody IS NOT NULL)
 FROM pg_proc p WHERE p.oid=to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'))
 ) authority_facts,
 (
 current_setting('server_version_num')::integer>=170000
 AND current_user='postgres'
 AND current_setting('transaction_isolation')='read committed'
 AND NOT EXISTS(SELECT 1 FROM (VALUES ('public.profiles','id','uuid'),
('public.profiles','active_identity_id','uuid'),
('public.identities','id','uuid'),
('public.identities','type','text'),
('public.identities','user_id','uuid'),
('public.identities','business_account_id','uuid'),
('public.identities','status','text'),
('public.business_accounts','id','uuid'),
('public.business_accounts','status','text'),
('public.business_members','business_account_id','uuid'),
('public.business_members','user_id','uuid'),
('public.business_members','status','text'),
('listing_publication_private.hosted_preview_settings','singleton','boolean'),
('listing_publication_private.hosted_preview_settings','project_ref','text'),
('listing_publication_private.hosted_preview_settings','instance_id','uuid'),
('listing_publication_private.hosted_preview_settings','release_id','text'),
('listing_publication_private.hosted_preview_settings','enabled','boolean'),
('listing_publication_private.hosted_preview_settings','release_ready','boolean'),
('listing_publication_private.hosted_preview_settings','storage_authority_version','text'),
('listing_publication_private.hosted_preview_actors','actor_user_id','uuid')) e(relation_name,column_name,type_name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
 WHERE a.attrelid=to_regclass(e.relation_name) AND c.relkind IN('r','p') AND a.attnum>0 AND NOT a.attisdropped
 AND a.attname=e.column_name AND a.atttypid=to_regtype(e.type_name)))
 AND NOT EXISTS(SELECT 1 FROM (VALUES ('public.profiles','id'),
('public.identities','id'),
('public.business_accounts','id'),
('listing_publication_private.hosted_preview_settings','singleton'),
('listing_publication_private.hosted_preview_actors','actor_user_id')) e(relation_name,column_name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_index i ON i.indrelid=a.attrelid
 WHERE a.attrelid=to_regclass(e.relation_name) AND a.attname=e.column_name AND a.attnotnull AND NOT a.attisdropped
 AND i.indisunique AND i.indisvalid AND i.indisready AND i.indnkeyatts=1 AND i.indkey[0]=a.attnum
 AND i.indexprs IS NULL AND i.indpred IS NULL))
 AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY['public.profiles','public.identities','public.business_accounts','public.business_members','listing_publication_private.hosted_preview_settings','listing_publication_private.hosted_preview_actors']::text[]) e(name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.oid=to_regclass(e.name) AND c.relrowsecurity))
 AND EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('auth.uid()') AND p.prorettype='uuid'::regtype
 AND p.provolatile IN('s','i') AND NOT p.proretset)
 AND EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)')
 AND p.prokind='f' AND NOT p.proretset AND p.procost=100 AND p.prorows=0 AND p.prosupport=0 AND p.provariadic=0
 AND p.proargmodes IS NULL AND p.protrftypes IS NULL AND p.prosqlbody IS NULL
 AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid
 AND d.refclassid='pg_extension'::regclass AND d.deptype='e'))
 AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role','authenticator')
 AND pg_has_role(r.oid,'postgres','MEMBER'))
 AND coalesce(has_function_privilege('authenticated',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),false)
 AND NOT coalesce(has_function_privilege('anon',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),true)
 AND NOT coalesce(has_function_privilege('service_role',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),true)) authority_contract_ready
),authority_measured AS MATERIALIZED (SELECT *,encode(sha256(convert_to((authority_facts)::text,'UTF8')),'hex') authority_sha256 FROM authority_observed)
 SELECT authority_facts,authority_contract_ready,authority_sha256 FROM authority_measured;
DO $verify$ DECLARE b jsonb;a jsonb;old_authority jsonb;new_authority jsonb;BEGIN
SELECT result INTO STRICT b FROM pg_temp.job_owner_read_before;
SELECT result INTO STRICT a FROM pg_temp.job_owner_read_after;
SELECT authority_facts INTO STRICT old_authority FROM pg_temp.job_owner_read_authority_before;
SELECT authority_facts INTO STRICT new_authority FROM pg_temp.job_owner_read_authority_after;
IF (a->>'recognized'='true' AND a->>'state'='after' AND a->>'project_ref'=b->>'project_ref'
AND a->>'instance_id'=b->>'instance_id' AND a->>'release_id'=b->>'release_id') IS NOT TRUE THEN
RAISE EXCEPTION 'JOB_OWNER_READ_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000';END IF;
IF old_authority IS DISTINCT FROM new_authority THEN
RAISE EXCEPTION 'JOB_OWNER_READ_AUTHORITY_CHANGED' USING ERRCODE='55000';END IF;END $verify$;
NOTIFY pgrst,'reload schema';
SELECT result FROM pg_temp.job_owner_read_after;
COMMIT;
