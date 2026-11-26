-- Bounded metadata only; no account, content, messages, files or Storage rows.
WITH account AS MATERIALIZED (
-- Catalog only; no application/Auth/Storage rows.
WITH foundation_functions AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'name',n.nspname||'.'||p.proname,
  'arguments',COALESCE((SELECT jsonb_agg(format_type(a,NULL) ORDER BY ord) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY x(a,ord)),'[]'::jsonb),
  'result',pg_get_function_result(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'definer',p.prosecdef,'volatility',p.provolatile::text,'strict',p.proisstrict,'parallel',p.proparallel::text,'leakproof',p.proleakproof,
  'config_sha256',CASE WHEN p.proconfig IS NULL THEN NULL ELSE encode(sha256(convert_to(p.proconfig::text,'UTF8')),'hex') END,
  'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
  'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'defaults',p.pronargdefaults<>0,
  'grants',COALESCE((SELECT jsonb_agg(jsonb_build_object('role',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
   FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a),'[]'::jsonb)) ORDER BY n.nspname,p.proname,p.oid),'[]'::jsonb) value
 FROM (SELECT p.* FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='account_lifecycle_private' AND p.proname<>'account_is_available') OR (n.nspname='public' AND p.proname='get_my_account_state_v1') ORDER BY n.nspname,p.proname,p.oid LIMIT 4) p
 JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
), foundation AS (
 SELECT jsonb_build_object(
  'schema_owner',(SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='account_lifecycle_private'),
  'schema_owner_only',NOT EXISTS(SELECT 1 FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname='account_lifecycle_private' AND a.grantee<>n.nspowner),
  'schema_app_denied',NOT EXISTS(SELECT 1 FROM pg_roles r JOIN pg_namespace n ON n.nspname='account_lifecycle_private' WHERE r.rolname IN ('anon','authenticated','service_role') AND (has_schema_privilege(r.oid,n.oid,'USAGE') OR has_schema_privilege(r.oid,n.oid,'CREATE'))),
  'relation_count',(SELECT count(*) FROM (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='account_lifecycle_private' AND c.relkind IN ('r','p','v','m','S','f') LIMIT 3) bounded),
  'table_owner',(SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid=to_regclass('account_lifecycle_private.account_states')),
  'table_kind',(SELECT relkind::text FROM pg_class WHERE oid=to_regclass('account_lifecycle_private.account_states')),
  'rls',(SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('account_lifecycle_private.account_states')),
  'force_rls',(SELECT relforcerowsecurity FROM pg_class WHERE oid=to_regclass('account_lifecycle_private.account_states')),
  'owner_grants_only',NOT EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=to_regclass('account_lifecycle_private.account_states') AND a.grantee<>c.relowner),
  'column_grants_owner_only',NOT EXISTS(SELECT 1 FROM pg_attribute col JOIN pg_class c ON c.oid=col.attrelid CROSS JOIN LATERAL aclexplode(col.attacl) a WHERE c.oid=to_regclass('account_lifecycle_private.account_states') AND a.grantee<>c.relowner),
  'table_app_denied',NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','service_role') AND
   (has_table_privilege(r.oid,to_regclass('account_lifecycle_private.account_states'),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.oid,to_regclass('account_lifecycle_private.account_states'),'SELECT,INSERT,UPDATE,REFERENCES'))),
  'columns',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'generated',a.attgenerated::text,'identity',a.attidentity::text,
   'default_sha256',CASE WHEN d.oid IS NULL THEN NULL ELSE encode(sha256(convert_to(pg_get_expr(d.adbin,d.adrelid),'UTF8')),'hex') END) ORDER BY a.attnum)
   FROM (SELECT * FROM pg_attribute WHERE attrelid=to_regclass('account_lifecycle_private.account_states') AND attnum>0 AND NOT attisdropped ORDER BY attnum LIMIT 8) a
   LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum),'[]'::jsonb),
  'constraints',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',con.conname,'kind',con.contype::text,'definition_sha256',encode(sha256(convert_to(pg_get_constraintdef(con.oid),'UTF8')),'hex'),'validated',con.convalidated,'deferrable',con.condeferrable) ORDER BY con.conname)
   FROM (SELECT * FROM pg_constraint WHERE conrelid=to_regclass('account_lifecycle_private.account_states') ORDER BY conname LIMIT 8) con),'[]'::jsonb),
  'table_triggers',(SELECT count(*) FROM (SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('account_lifecycle_private.account_states') AND NOT tgisinternal LIMIT 2) bounded),
  'policies',(SELECT count(*) FROM (SELECT 1 FROM pg_policy WHERE polrelid=to_regclass('account_lifecycle_private.account_states') LIMIT 2) bounded),
  'indexes',(SELECT count(*) FROM (SELECT 1 FROM pg_index WHERE indrelid=to_regclass('account_lifecycle_private.account_states') LIMIT 3) bounded),
  'functions',(SELECT value FROM foundation_functions),
  'auth_triggers',COALESCE((SELECT jsonb_agg(jsonb_build_object('definition_sha256',encode(sha256(convert_to(pg_get_triggerdef(t.oid),'UTF8')),'hex'),'name',t.tgname,'function',t.tgfoid::regprocedure::text,'enabled',t.tgenabled::text,'event_mask',t.tgtype,'argument_count',t.tgnargs,
   'arguments_sha256',encode(sha256(t.tgargs),'hex'),'when_sha256',CASE WHEN t.tgqual IS NULL THEN NULL ELSE encode(sha256(convert_to(pg_get_expr(t.tgqual,t.tgrelid),'UTF8')),'hex') END) ORDER BY t.tgname)
   FROM (SELECT * FROM pg_trigger WHERE tgrelid=to_regclass('auth.users') AND NOT tgisinternal ORDER BY tgname LIMIT 4) t),'[]'::jsonb)
 ) value
), scoped_functions AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'name',n.nspname||'.'||p.proname,
  'arguments',COALESCE((SELECT jsonb_agg(format_type(a,NULL) ORDER BY ord) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY x(a,ord)),'[]'::jsonb),
  'result',pg_get_function_result(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'definer',p.prosecdef,'volatility',p.provolatile::text,'strict',p.proisstrict,'parallel',p.proparallel::text,'leakproof',p.proleakproof,
  'config_sha256',CASE WHEN p.proconfig IS NULL THEN NULL ELSE encode(sha256(convert_to(p.proconfig::text,'UTF8')),'hex') END,
  'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
  'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'defaults',p.pronargdefaults<>0,
  'grants',COALESCE((SELECT jsonb_agg(jsonb_build_object('role',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
   FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a),'[]'::jsonb)) ORDER BY n.nspname,p.proname,p.oid),'[]'::jsonb) value
 FROM (SELECT p.* FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname IN ('account_lifecycle_private.account_is_available') ORDER BY n.nspname,p.proname,p.oid LIMIT 12) p
 JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
), ownership_columns AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('relation',w.relation,'name',w.name,
 'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'generated',a.attgenerated::text,'identity',a.attidentity::text)
 ORDER BY w.relation COLLATE "C",w.name COLLATE "C"),'[]'::jsonb) value
 FROM (VALUES ('auth.users','id'),('auth.users','created_at'),('auth.users','deleted_at'),('auth.users','banned_until')) w(relation,name)
 JOIN pg_attribute a ON a.attrelid=to_regclass(w.relation) AND a.attname=w.name AND NOT a.attisdropped
), protected_relations AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('name',name,'kind',c.relkind::text,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'observer_select',has_table_privilege(current_user,c.oid,'SELECT')) ORDER BY name COLLATE "C"),'[]'::jsonb) value
 FROM unnest(ARRAY['auth.users']) name JOIN pg_class c ON c.oid=to_regclass(name)
), protected_indexes AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('relation',i.indrelid::regclass::text,'name',c.relname,'unique',i.indisunique,
 'primary',i.indisprimary,'valid',i.indisvalid,'ready',i.indisready,
 'definition_sha256',encode(sha256(convert_to(pg_get_indexdef(i.indexrelid),'UTF8')),'hex')) ORDER BY i.indrelid::regclass::text COLLATE "C",c.relname COLLATE "C"),'[]'::jsonb) value
 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
 WHERE i.indrelid IN (SELECT to_regclass(x) FROM unnest(ARRAY['auth.users']) x) AND c.relname IN ('users_pkey','business_accounts_pkey','identities_pkey','identity_profiles_identity_id_key','identity_profiles_slug_key','profiles_pkey','profiles_store_slug_key')

) SELECT jsonb_build_object('foundation',(SELECT value FROM foundation),'helper',(SELECT value FROM scoped_functions),'auth_columns',(SELECT value FROM ownership_columns),'auth_relations',(SELECT value FROM protected_relations),'auth_indexes',(SELECT value FROM protected_indexes)) value
), contact_availability AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object(
 'signature',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',
 'owner',pg_get_userbyid(p.proowner),'language',l.lanname,'kind',p.prokind,'definer',p.prosecdef,'volatility',p.provolatile,
 'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,'returns_set',p.proretset,'result',pg_get_function_result(p.oid),
 'arguments',to_jsonb(p.proargnames),'argument_types',(SELECT jsonb_agg(format_type(x,NULL) ORDER BY ord) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY z(x,ord)),
 'defaults',pg_get_expr(p.proargdefaults,0),'config',to_jsonb(p.proconfig),
 'body_bytes',octet_length(convert_to(p.prosrc,'UTF8')),'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
 'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'grantor',pg_get_userbyid(a.grantor),'grantable',a.is_grantable,'privilege',a.privilege_type) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),
 'effective',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,'execute',has_function_privilege(r.oid,p.oid,'EXECUTE')) ORDER BY r.rolname) FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','service_role','selqiro_listing_contact_writer_v1'))
 ) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]'::jsonb) value
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname='listing_contact_private' AND p.proname='require_available_accounts_v1'
), auth_uid AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'name',n.nspname||'.'||p.proname,
  'arguments',COALESCE((SELECT jsonb_agg(format_type(a,NULL) ORDER BY ord) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY x(a,ord)),'[]'::jsonb),
  'result',pg_get_function_result(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'definer',p.prosecdef,'volatility',p.provolatile::text,'strict',p.proisstrict,'parallel',p.proparallel::text,'leakproof',p.proleakproof,
  'config_sha256',CASE WHEN p.proconfig IS NULL THEN NULL ELSE encode(sha256(convert_to(p.proconfig::text,'UTF8')),'hex') END,
  'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
  'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'defaults',p.pronargdefaults<>0,
  'grants',COALESCE((SELECT jsonb_agg(jsonb_build_object('role',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
   FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a),'[]'::jsonb)) ORDER BY n.nspname,p.proname,p.oid),'[]'::jsonb) value
 FROM (SELECT p.* FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname IN ('auth.uid') ORDER BY n.nspname,p.proname,p.oid LIMIT 12) p
 JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
), job_functions AS MATERIALIZED (
 SELECT p.oid::regprocedure::text signature,jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),
 'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,
 'leakproof',p.proleakproof,'parallel',p.proparallel,'result',pg_get_function_result(p.oid),
 'arguments',p.proargnames,'defaults',pg_get_expr(p.proargdefaults,0),'config',p.proconfig,
 'body',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x)) facts
 FROM (SELECT p.* FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname||'.'||p.proname IN ('jobs_private.accept_policies','jobs_private.calendar_month_after','jobs_private.content','jobs_private.current_policies','jobs_private.mutate','jobs_private.normalize_content','jobs_private.owner_fields','jobs_private.require_actor','jobs_private.require_available_accounts_v1','jobs_private.require_key','jobs_private.require_revision','listing_publication_private.assert_hosted_preview_actor','listing_publication_private.hosted_storage_contract_ready','listing_publication_private.require_actor','public.current_user_has_identity_access','public.get_my_job_policies_v1','public.get_my_job_request_v1','public.get_my_job_v1','public.get_my_jobs_v1','public.listing_actor_uid_hosted_v1','public.listing_price_currency_scale_v1','public.lock_listing_creation_actor_v1','public.normalize_listing_price_v1','public.publish_my_job_v1','public.renew_my_job_activity_v1','public.save_my_job_v1','public.set_my_job_status_v1')
 ORDER BY n.nspname COLLATE "C",p.proname COLLATE "C",p.oid LIMIT 28) p
 JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
), job_relations AS MATERIALIZED (
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
 ORDER BY p.polname COLLATE "C"),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid)) facts
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname||'.'||c.relname IN ('jobs_private.categories','jobs_private.requests','public.jobs')
), job_schema AS (
 SELECT jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) value FROM pg_namespace n WHERE n.nspname='jobs_private'
), identity_columns AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('relation',w.relation,'name',w.name,
 'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'generated',a.attgenerated::text,'identity',a.attidentity::text)
 ORDER BY w.relation COLLATE "C",w.name COLLATE "C"),'[]'::jsonb) value
 FROM (VALUES ('public.business_accounts','id'),('public.business_accounts','owner_user_id'),('public.business_accounts','status'),('public.identities','business_account_id'),('public.identities','id'),('public.identities','status'),('public.identities','type'),('public.identities','user_id'),('public.identity_profiles','identity_id'),('public.identity_profiles','slug'),('public.profiles','id'),('public.profiles','store_slug')) w(relation,name)
 JOIN pg_attribute a ON a.attrelid=to_regclass(w.relation) AND a.attname=w.name AND NOT a.attisdropped
), identity_relations AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('name',name,'kind',c.relkind::text,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'observer_select',has_table_privilege(current_user,c.oid,'SELECT')) ORDER BY name COLLATE "C"),'[]'::jsonb) value
 FROM unnest(ARRAY['public.identities','public.business_accounts','public.profiles','public.identity_profiles']) name JOIN pg_class c ON c.oid=to_regclass(name)
), identity_indexes AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('relation',i.indrelid::regclass::text,'name',c.relname,'unique',i.indisunique,
 'primary',i.indisprimary,'valid',i.indisvalid,'ready',i.indisready,
 'definition_sha256',encode(sha256(convert_to(pg_get_indexdef(i.indexrelid),'UTF8')),'hex')) ORDER BY i.indrelid::regclass::text COLLATE "C",c.relname COLLATE "C"),'[]'::jsonb) value
 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
 WHERE i.indrelid IN (SELECT to_regclass(x) FROM unnest(ARRAY['public.identities','public.business_accounts','public.profiles','public.identity_profiles']) x)
 AND c.relname IN ('business_accounts_pkey','identities_pkey','identity_profiles_identity_id_key','identity_profiles_slug_key','profiles_pkey','profiles_store_slug_key')
), base AS (
 SELECT jsonb_build_object('account',(SELECT value FROM account),
 'accepted_contact_availability',(SELECT value FROM contact_availability),'auth_uid',(SELECT value FROM auth_uid),
 'schema',jsonb_build_array((SELECT value FROM job_schema)),
 'tables',(SELECT coalesce(jsonb_agg(facts ORDER BY name COLLATE "C"),'[]'::jsonb) FROM job_relations),
 'dependencies',(SELECT coalesce(jsonb_agg(facts ORDER BY signature COLLATE "C"),'[]'::jsonb) FROM job_functions
  WHERE signature NOT IN ('jobs_private.mutate(uuid,uuid,uuid,text,jsonb)','jobs_private.require_available_accounts_v1(uuid,uuid)')),
 'identity_structure',jsonb_build_object('columns',(SELECT value FROM identity_columns),
  'relations',(SELECT value FROM identity_relations),'indexes',(SELECT value FROM identity_indexes))) value
), target AS (
 SELECT jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(facts ORDER BY signature COLLATE "C"),'[]'::jsonb) FROM job_functions
  WHERE signature IN ('jobs_private.mutate(uuid,uuid,uuid,text,jsonb)','jobs_private.require_available_accounts_v1(uuid,uuid)')),
 'helper_app_denied',NOT EXISTS(SELECT 1 FROM pg_roles r JOIN pg_proc p ON p.oid=to_regprocedure('jobs_private.require_available_accounts_v1(uuid,uuid)')
 WHERE r.rolname IN ('anon','authenticated','service_role') AND has_function_privilege(r.oid,p.oid,'EXECUTE'))) value
)
SELECT base.value b,target.value t FROM base CROSS JOIN target;
