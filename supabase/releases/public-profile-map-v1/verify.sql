-- Independent read-only verification is mandatory after an apply attempt.
BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY;
SET LOCAL search_path=pg_catalog;
SET LOCAL timezone='UTC';
SET LOCAL jit=off;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='3s';
SET LOCAL idle_in_transaction_session_timeout='25s';
DO $map_authority$
DECLARE relation_name text;
BEGIN
 IF current_user<>'postgres' OR current_setting('server_version_num')::integer<>170006 THEN
  RAISE EXCEPTION 'PUBLIC_PROFILE_MAP_EXECUTION_AUTHORITY_REQUIRED' USING ERRCODE='42501';
 END IF;
 FOREACH relation_name IN ARRAY ARRAY['auth.users','public.profiles','public.identities',
  'public.identity_profiles','public.business_accounts','public.user_blocks',
  'account_lifecycle_private.account_states','profile_location_private.profile_locations'] LOOP
  IF NOT coalesce(has_schema_privilege('postgres',split_part(relation_name,'.',1),'USAGE'),false)
   OR NOT coalesce(has_table_privilege('postgres',relation_name,'SELECT'),false)
   OR coalesce(row_security_active(relation_name::regclass),true) THEN
   RAISE EXCEPTION 'PUBLIC_PROFILE_MAP_EXECUTION_AUTHORITY_REQUIRED' USING ERRCODE='42501';
  END IF;
 END LOOP;
 IF NOT has_function_privilege('postgres','public.get_store_by_slug(text)','EXECUTE')
  OR NOT has_function_privilege('postgres','profile_location_private.valid_location(jsonb)','EXECUTE') THEN
  RAISE EXCEPTION 'PUBLIC_PROFILE_MAP_EXECUTION_AUTHORITY_REQUIRED' USING ERRCODE='42501';
 END IF;
END;
$map_authority$;
DO $map_baseline$
DECLARE observed jsonb;
BEGIN
 SELECT q.result INTO observed FROM (
-- Metadata only. Both already accepted contracts remain byte-for-byte pinned.
WITH legacy AS MATERIALIZED (
-- Exact accepted catalog scope, excluding only this release’s separately pinned trigger.
WITH requested_relations(name) AS (VALUES
('public.profiles'),
('public.identities'),
('public.identity_profiles'),
('public.business_accounts'),
('public.business_members'),
('account_lifecycle_private.account_states')
), requested_functions(signature,name,argument_types,required) AS (VALUES
('auth.uid()','auth.uid',ARRAY[]::text[],true),
('profile_editor_private.touch_revision()','profile_editor_private.touch_revision',ARRAY[]::text[],true),
('profile_editor_private.lock_owner(uuid,uuid)','profile_editor_private.lock_owner',ARRAY['uuid','uuid']::text[],true),
('profile_editor_private.snapshot(uuid,public.identities,public.identity_profiles)','profile_editor_private.snapshot',ARRAY['uuid','public.identities','public.identity_profiles']::text[],true),
('public.get_my_profile_editor_v1(uuid,uuid)','public.get_my_profile_editor_v1',ARRAY['uuid','uuid']::text[],true),
('public.save_my_profile_editor_v1(uuid,uuid,uuid,jsonb)','public.save_my_profile_editor_v1',ARRAY['uuid','uuid','uuid','jsonb']::text[],true),
('account_lifecycle_private.account_is_available(uuid)','account_lifecycle_private.account_is_available',ARRAY['uuid']::text[],true),
('public.get_my_active_identity_profile_details()','public.get_my_active_identity_profile_details',ARRAY[]::text[],false),
('public.update_my_active_identity_location(text,text,double precision,double precision)','public.update_my_active_identity_location',ARRAY['text','text','double precision','double precision']::text[],false),
('public.save_my_active_identity_profile(text,text,text,text,text,text)','public.save_my_active_identity_profile',ARRAY['text','text','text','text','text','text']::text[],false),
('public.get_store_by_slug(text)','public.get_store_by_slug',ARRAY['text']::text[],true)
), relation_requests AS MATERIALIZED (
 SELECT r.name,n.oid schema_oid,c.oid relation_oid,c.relkind,
 n.oid IS NOT NULL schema_present,
 CASE WHEN n.oid IS NULL THEN false ELSE has_schema_privilege(current_user,n.oid,'USAGE') END schema_usage
 FROM requested_relations r LEFT JOIN pg_namespace n ON n.nspname=split_part(r.name,'.',1)
 LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=split_part(r.name,'.',2)
), scoped_relations AS MATERIALIZED (
 SELECT r.name,c.* FROM relation_requests r JOIN pg_class c ON c.oid=r.relation_oid
 WHERE c.relkind IN ('r','p')
), scoped_columns AS MATERIALIZED (
 SELECT r.name relation_name,a.*,d.adbin,d.adrelid FROM scoped_relations r
 JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped
 LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
), fixed_functions AS MATERIALIZED (
 SELECT p.oid,r.signature FROM requested_functions r
 JOIN pg_namespace n ON n.nspname=split_part(r.name,'.',1)
 JOIN pg_proc p ON p.pronamespace=n.oid AND p.proname=split_part(r.name,'.',2) AND p.prokind='f'
 WHERE ARRAY(SELECT format_type(t,NULL) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY a(t,k) ORDER BY k)=r.argument_types
), function_requests AS MATERIALIZED (
 SELECT r.signature,r.required,EXISTS(SELECT 1 FROM fixed_functions f WHERE f.signature=r.signature) present,
 (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname||'.'||p.proname=r.name AND p.prokind='f') overloads FROM requested_functions r
), scoped_triggers AS MATERIALIZED (
 SELECT t.* FROM pg_trigger t WHERE t.tgrelid IN (SELECT oid FROM scoped_relations) AND NOT t.tgisinternal AND NOT (t.tgname='profile_location_text_changed_v1' AND t.tgrelid=to_regclass('public.identity_profiles'))
), function_scope AS MATERIALIZED (
 SELECT oid FROM fixed_functions UNION SELECT tgfoid FROM scoped_triggers
), roles AS MATERIALIZED (
 SELECT oid,rolname,rolsuper,rolbypassrls,rolinherit,rolcanlogin FROM pg_roles
 WHERE rolname IN ('anon','authenticated','service_role')
), requested_extensions(name) AS (VALUES
('postgis'),('pg_trgm'),('unaccent')
), scoped_extensions AS MATERIALIZED (
 SELECT e.* FROM pg_extension e JOIN requested_extensions r ON r.name=e.extname
), scoped_schemas AS MATERIALIZED (
 SELECT n.* FROM pg_namespace n WHERE n.oid IN (SELECT schema_oid FROM relation_requests)
 OR n.oid IN (SELECT p.pronamespace FROM pg_proc p JOIN function_scope f ON f.oid=p.oid)
 OR n.oid IN (SELECT extnamespace FROM scoped_extensions)
), scoped_policies AS MATERIALIZED (
 SELECT p.*,r.name relation_name FROM pg_policy p JOIN scoped_relations r ON r.oid=p.polrelid
), scoped_defaults AS MATERIALIZED (
 SELECT a.*,CASE WHEN a.defaclnamespace=0 THEN '*' ELSE n.nspname::text END schema_name
 FROM pg_default_acl a JOIN pg_roles o ON o.oid=a.defaclrole AND o.rolname='postgres'
 LEFT JOIN pg_namespace n ON n.oid=a.defaclnamespace
 WHERE a.defaclobjtype IN ('r','S','f','T','n') AND (a.defaclnamespace=0 OR n.nspname IN ('public','profile_editor_private','account_lifecycle_private'))
), scoped_extension_types AS MATERIALIZED (
 SELECT t.*,e.extname,n.nspname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
 JOIN pg_depend d ON d.classid='pg_type'::regclass AND d.objid=t.oid AND d.refclassid='pg_extension'::regclass AND d.deptype='e'
 JOIN scoped_extensions e ON e.oid=d.refobjid AND e.extname='postgis'
 WHERE t.typname IN ('geometry','geography')
), requested_auth_columns(name) AS (VALUES
('id'),('created_at'),('deleted_at'),('banned_until')
)
, schemas_raw AS MATERIALIZED (SELECT n.nspname sort_key,jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),'observer_usage',has_schema_privilege(current_user,n.oid,'USAGE'),'acl_sha256',encode(sha256(convert_to((coalesce(n.nspacl,acldefault('n',n.nspowner)))::text,'UTF8')),'hex')) facts FROM scoped_schemas n)
, schemas_bounded AS MATERIALIZED (SELECT sort_key,facts FROM schemas_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 16)
, roles_raw AS MATERIALIZED (SELECT rolname sort_key,jsonb_build_object('name',rolname,'superuser',rolsuper,'bypass_rls',rolbypassrls,'inherit',rolinherit,'can_login',rolcanlogin) facts FROM roles)
, roles_bounded AS MATERIALIZED (SELECT sort_key,facts FROM roles_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 3)
, relations_raw AS MATERIALIZED (SELECT r.name sort_key,jsonb_build_object('name',r.name,'kind',r.relkind,'owner',pg_get_userbyid(r.relowner),'rls',r.relrowsecurity,'force_rls',r.relforcerowsecurity,'observer_select',has_table_privilege(current_user,r.oid,'SELECT'),'acl_sha256',encode(sha256(convert_to((coalesce(r.relacl,acldefault('r',r.relowner)))::text,'UTF8')),'hex')) facts FROM scoped_relations r)
, relations_bounded AS MATERIALIZED (SELECT sort_key,facts FROM relations_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 6)
, columns_raw AS MATERIALIZED (SELECT a.relation_name||':'||lpad(a.attnum::text,5,'0') sort_key,jsonb_build_object('relation',a.relation_name,'name',a.attname,'position',a.attnum,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default_sha256',CASE WHEN pg_get_expr(a.adbin,a.adrelid) IS NULL THEN NULL ELSE encode(sha256(convert_to((pg_get_expr(a.adbin,a.adrelid))::text,'UTF8')),'hex') END,'acl_sha256',CASE WHEN a.attacl IS NULL THEN NULL ELSE encode(sha256(convert_to((a.attacl)::text,'UTF8')),'hex') END) facts FROM scoped_columns a)
, columns_bounded AS MATERIALIZED (SELECT sort_key,facts FROM columns_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 320)
, constraints_raw AS MATERIALIZED (SELECT r.name||':'||c.conname sort_key,jsonb_build_object(
 'relation',r.name,'name',c.conname,'kind',c.contype,'validated',c.convalidated,'deferrable',c.condeferrable,'initially_deferred',c.condeferred,
 'columns',(SELECT coalesce(jsonb_agg(a.attname ORDER BY k),'[]'::jsonb) FROM unnest(c.conkey) WITH ORDINALITY x(attnum,k) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=x.attnum),
 'referenced_relation',CASE WHEN c.confrelid=0 THEN NULL ELSE rn.nspname||'.'||rc.relname END,
 'referenced_columns',(SELECT coalesce(jsonb_agg(a.attname ORDER BY k),'[]'::jsonb) FROM unnest(c.confkey) WITH ORDINALITY x(attnum,k) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=x.attnum),
 'definition_sha256',encode(sha256(convert_to((pg_get_constraintdef(c.oid,true))::text,'UTF8')),'hex')) facts
 FROM scoped_relations r JOIN pg_constraint c ON c.conrelid=r.oid
 LEFT JOIN pg_class rc ON rc.oid=c.confrelid LEFT JOIN pg_namespace rn ON rn.oid=rc.relnamespace)
, constraints_bounded AS MATERIALIZED (SELECT sort_key,facts FROM constraints_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 128)
, indexes_raw AS MATERIALIZED (SELECT r.name||':'||ci.relname sort_key,jsonb_build_object(
 'relation',r.name,'name',ci.relname,'method',am.amname,'unique',i.indisunique,'primary',i.indisprimary,'valid',i.indisvalid,'ready',i.indisready,
 'key_columns',(SELECT coalesce(jsonb_agg(CASE WHEN x.attnum=0 THEN '[expression]' ELSE a.attname::text END ORDER BY k),'[]'::jsonb)
 FROM unnest(i.indkey::smallint[]) WITH ORDINALITY x(attnum,k) LEFT JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=x.attnum WHERE k<=i.indnkeyatts),
 'has_expressions',i.indexprs IS NOT NULL,'partial',i.indpred IS NOT NULL,
 'definition_sha256',encode(sha256(convert_to((pg_get_indexdef(i.indexrelid))::text,'UTF8')),'hex')) facts FROM scoped_relations r
 JOIN pg_index i ON i.indrelid=r.oid JOIN pg_class ci ON ci.oid=i.indexrelid JOIN pg_am am ON am.oid=ci.relam)
, indexes_bounded AS MATERIALIZED (SELECT sort_key,facts FROM indexes_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 128)
, triggers_raw AS MATERIALIZED (SELECT r.name||':'||t.tgname sort_key,jsonb_build_object('relation',r.name,'name',t.tgname,'enabled',t.tgenabled,'event_mask',t.tgtype,'function',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')','argument_count',t.tgnargs,'arguments_sha256',encode(sha256(t.tgargs),'hex'),'when_sha256',CASE WHEN t.tgqual::text IS NULL THEN NULL ELSE encode(sha256(convert_to((t.tgqual::text)::text,'UTF8')),'hex') END,'definition_sha256',encode(sha256(convert_to((pg_get_triggerdef(t.oid))::text,'UTF8')),'hex')) facts FROM scoped_triggers t JOIN scoped_relations r ON r.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace)
, triggers_bounded AS MATERIALIZED (SELECT sort_key,facts FROM triggers_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 48)
, policies_raw AS MATERIALIZED (SELECT p.relation_name||':'||p.polname sort_key,jsonb_build_object('relation',p.relation_name,'name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END ORDER BY x) FROM unnest(p.polroles) x),'using_sha256',CASE WHEN pg_get_expr(p.polqual,p.polrelid) IS NULL THEN NULL ELSE encode(sha256(convert_to((pg_get_expr(p.polqual,p.polrelid))::text,'UTF8')),'hex') END,'check_sha256',CASE WHEN pg_get_expr(p.polwithcheck,p.polrelid) IS NULL THEN NULL ELSE encode(sha256(convert_to((pg_get_expr(p.polwithcheck,p.polrelid))::text,'UTF8')),'hex') END) facts FROM scoped_policies p)
, policies_bounded AS MATERIALIZED (SELECT sort_key,facts FROM policies_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 128)
, policy_dependencies_raw AS MATERIALIZED (SELECT DISTINCT s.relation_name||':'||s.polname||':'||n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')' sort_key,jsonb_build_object('policy',s.relation_name||':'||s.polname,'function',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')','dependency_type',d.deptype) facts FROM scoped_policies s JOIN pg_depend d ON d.classid='pg_policy'::regclass AND d.objid=s.oid AND d.refclassid='pg_proc'::regclass JOIN pg_proc p ON p.oid=d.refobjid JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema'))
, policy_dependencies_bounded AS MATERIALIZED (SELECT sort_key,facts FROM policy_dependencies_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 128)
, functions_raw AS MATERIALIZED (SELECT n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')' sort_key,jsonb_build_object('signature',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')','name',n.nspname||'.'||p.proname,'origins',to_jsonb(array_remove(ARRAY[CASE WHEN EXISTS(SELECT 1 FROM fixed_functions f WHERE f.oid=p.oid) THEN 'fixed' END,CASE WHEN EXISTS(SELECT 1 FROM scoped_triggers t WHERE t.tgfoid=p.oid) THEN 'trigger' END],NULL)),'kind',p.prokind,'owner',pg_get_userbyid(p.proowner),'language',l.lanname,'result_type',format_type(p.prorettype,NULL),'argument_types',(SELECT coalesce(jsonb_agg(format_type(t,NULL) ORDER BY k),'[]'::jsonb) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY a(t,k)),'definer',p.prosecdef,'volatility',p.provolatile,'parallel',p.proparallel,'strict',p.proisstrict,'leakproof',p.proleakproof,'returns_set',p.proretset,'body_bytes',octet_length(convert_to(p.prosrc,'UTF8')),'body_sha256',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),'definition_sha256',encode(sha256(convert_to((pg_get_functiondef(p.oid))::text,'UTF8')),'hex'),'config_sha256',CASE WHEN p.proconfig IS NULL THEN NULL ELSE encode(sha256(convert_to((p.proconfig)::text,'UTF8')),'hex') END,'default_arguments_sha256',CASE WHEN pg_get_expr(p.proargdefaults,0) IS NULL THEN NULL ELSE encode(sha256(convert_to((pg_get_expr(p.proargdefaults,0))::text,'UTF8')),'hex') END,'acl_sha256',encode(sha256(convert_to((coalesce(p.proacl,acldefault('f',p.proowner)))::text,'UTF8')),'hex')) facts FROM function_scope f JOIN pg_proc p ON p.oid=f.oid JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang)
, functions_bounded AS MATERIALIZED (SELECT sort_key,facts FROM functions_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 64)
, grants_raw AS MATERIALIZED (SELECT g.object_kind||g.object_name||g.grantor||g.grantee||g.privilege sort_key,to_jsonb(g) facts FROM (
 SELECT 'schema'::text object_kind,n.nspname::text object_name,pg_get_userbyid(a.grantor) grantor,
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END grantee,a.privilege_type privilege,a.is_grantable grantable
 FROM scoped_schemas n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a
 UNION ALL SELECT 'relation',r.name,pg_get_userbyid(a.grantor),
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable
 FROM scoped_relations r CROSS JOIN LATERAL aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) a
 UNION ALL SELECT 'column',c.relation_name||'.'||c.attname,pg_get_userbyid(a.grantor),
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable
 FROM scoped_columns c CROSS JOIN LATERAL aclexplode(c.attacl) a
 UNION ALL SELECT 'function',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',pg_get_userbyid(a.grantor),
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable
 FROM function_scope f JOIN pg_proc p ON p.oid=f.oid JOIN pg_namespace n ON n.oid=p.pronamespace
 CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
 ) g)
, grants_bounded AS MATERIALIZED (SELECT sort_key,facts FROM grants_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 2048)
, effective_privileges_raw AS MATERIALIZED (SELECT g.object_kind||g.object_name||g.role sort_key,to_jsonb(g) facts FROM (
 SELECT 'schema'::text object_kind,n.nspname::text object_name,a.rolname role,
 NULL::boolean can_select,NULL::boolean can_insert,NULL::boolean can_update,NULL::boolean can_delete,NULL::boolean can_execute,
 has_schema_privilege(a.oid,n.oid,'USAGE') can_usage,has_schema_privilege(a.oid,n.oid,'CREATE') can_create FROM scoped_schemas n CROSS JOIN roles a
 UNION ALL SELECT 'relation',r.name,a.rolname,
 has_table_privilege(a.oid,r.oid,'SELECT'),has_table_privilege(a.oid,r.oid,'INSERT'),
 has_table_privilege(a.oid,r.oid,'UPDATE'),has_table_privilege(a.oid,r.oid,'DELETE'),NULL::boolean,NULL::boolean,NULL::boolean
 FROM scoped_relations r CROSS JOIN roles a
 UNION ALL SELECT 'column',c.relation_name||'.'||c.attname,a.rolname,
 has_column_privilege(a.oid,c.attrelid,c.attnum,'SELECT'),has_column_privilege(a.oid,c.attrelid,c.attnum,'INSERT'),
 has_column_privilege(a.oid,c.attrelid,c.attnum,'UPDATE'),NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean
 FROM scoped_columns c CROSS JOIN roles a
 UNION ALL SELECT 'function',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',a.rolname,NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,
 has_function_privilege(a.oid,p.oid,'EXECUTE'),NULL::boolean,NULL::boolean
 FROM function_scope f JOIN pg_proc p ON p.oid=f.oid JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN roles a
 ) g)
, effective_privileges_bounded AS MATERIALIZED (SELECT sort_key,facts FROM effective_privileges_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 1536)
, default_acls_raw AS MATERIALIZED (SELECT d.schema_name||':'||d.defaclobjtype::text sort_key,jsonb_build_object('owner','postgres','schema',d.schema_name,'object_kind',d.defaclobjtype,'acl_sha256',encode(sha256(convert_to((d.defaclacl)::text,'UTF8')),'hex')) facts FROM scoped_defaults d)
, default_acls_bounded AS MATERIALIZED (SELECT sort_key,facts FROM default_acls_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 20)
, default_acl_grants_raw AS MATERIALIZED (SELECT d.schema_name||':'||d.defaclobjtype::text||':'||a.grantor||':'||a.grantee||':'||a.privilege_type sort_key,jsonb_build_object('owner','postgres','schema',d.schema_name,'object_kind',d.defaclobjtype,'grantor',pg_get_userbyid(a.grantor),'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable) facts FROM scoped_defaults d CROSS JOIN LATERAL aclexplode(d.defaclacl) a)
, default_acl_grants_bounded AS MATERIALIZED (SELECT sort_key,facts FROM default_acl_grants_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 128)
, auth_columns_raw AS MATERIALIZED (SELECT r.name sort_key,jsonb_build_object('name',r.name,'present',a.attname IS NOT NULL,'type',CASE WHEN a.attname IS NULL THEN NULL ELSE format_type(a.atttypid,a.atttypmod) END,'not_null',a.attnotnull) facts FROM requested_auth_columns r LEFT JOIN pg_namespace n ON n.nspname='auth' LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname='users' AND c.relkind IN ('r','p') LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attname=r.name AND a.attnum>0 AND NOT a.attisdropped)
, auth_columns_bounded AS MATERIALIZED (SELECT sort_key,facts FROM auth_columns_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 4)
, extensions_raw AS MATERIALIZED (SELECT r.name sort_key,jsonb_build_object('name',r.name,'available',a.name IS NOT NULL,'default_version',a.default_version,'installed',e.oid IS NOT NULL,'installed_version',e.extversion,'schema',n.nspname,'owner',CASE WHEN e.oid IS NULL THEN NULL ELSE pg_get_userbyid(e.extowner) END,'relocatable',e.extrelocatable) facts FROM requested_extensions r LEFT JOIN pg_available_extensions a ON a.name=r.name LEFT JOIN scoped_extensions e ON e.extname=r.name LEFT JOIN pg_namespace n ON n.oid=e.extnamespace)
, extensions_bounded AS MATERIALIZED (SELECT sort_key,facts FROM extensions_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 3)
, extension_types_raw AS MATERIALIZED (SELECT t.nspname||'.'||t.typname sort_key,jsonb_build_object('name',t.nspname||'.'||t.typname,'extension',t.extname,'type_name',t.typname,'kind',t.typtype) facts FROM scoped_extension_types t)
, extension_types_bounded AS MATERIALIZED (SELECT sort_key,facts FROM extension_types_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 2)
, operator_classes_raw AS MATERIALIZED (SELECT n.nspname||'.'||o.opcname||':'||am.amname sort_key,jsonb_build_object('name',n.nspname||'.'||o.opcname,'extension',e.extname,'method',am.amname,'input_type',format_type(o.opcintype,NULL),'default',o.opcdefault) facts
 FROM pg_opclass o JOIN pg_namespace n ON n.oid=o.opcnamespace JOIN pg_am am ON am.oid=o.opcmethod
 JOIN pg_depend d ON d.classid='pg_opclass'::regclass AND d.objid=o.oid AND d.refclassid='pg_extension'::regclass AND d.deptype='e'
 JOIN scoped_extensions e ON e.oid=d.refobjid
 WHERE am.amname IN ('gist','gin') AND ((e.extname='postgis' AND o.opcintype IN (SELECT oid FROM scoped_extension_types)) OR (e.extname='pg_trgm' AND o.opcintype='text'::regtype)))
, operator_classes_bounded AS MATERIALIZED (SELECT sort_key,facts FROM operator_classes_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 16)
, index_methods_raw AS MATERIALIZED (SELECT r.name sort_key,jsonb_build_object('name',r.name,'present',a.oid IS NOT NULL,'kind',a.amtype) facts FROM (VALUES ('btree'),('gist'),('gin')) AS r(name) LEFT JOIN pg_am a ON a.amname=r.name)
, index_methods_bounded AS MATERIALIZED (SELECT sort_key,facts FROM index_methods_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 3)
, measured AS MATERIALIZED (SELECT jsonb_build_object('schemas',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM schemas_bounded),'roles',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM roles_bounded),'relations',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM relations_bounded),'columns',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM columns_bounded),'constraints',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM constraints_bounded),'indexes',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM indexes_bounded),'triggers',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM triggers_bounded),'policies',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM policies_bounded),'policy_dependencies',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM policy_dependencies_bounded),'functions',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM functions_bounded),'grants',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM grants_bounded),'effective_privileges',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM effective_privileges_bounded),'default_acls',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM default_acls_bounded),'default_acl_grants',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM default_acl_grants_bounded),'auth_columns',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM auth_columns_bounded),'extensions',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM extensions_bounded),'extension_types',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM extension_types_bounded),'operator_classes',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM operator_classes_bounded),'index_methods',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM index_methods_bounded)) catalog,jsonb_build_object('schemas',jsonb_build_object('total',(SELECT count(*) FROM schemas_raw),'returned',(SELECT count(*) FROM schemas_bounded)),'roles',jsonb_build_object('total',(SELECT count(*) FROM roles_raw),'returned',(SELECT count(*) FROM roles_bounded)),'relations',jsonb_build_object('total',(SELECT count(*) FROM relations_raw),'returned',(SELECT count(*) FROM relations_bounded)),'columns',jsonb_build_object('total',(SELECT count(*) FROM columns_raw),'returned',(SELECT count(*) FROM columns_bounded)),'constraints',jsonb_build_object('total',(SELECT count(*) FROM constraints_raw),'returned',(SELECT count(*) FROM constraints_bounded)),'indexes',jsonb_build_object('total',(SELECT count(*) FROM indexes_raw),'returned',(SELECT count(*) FROM indexes_bounded)),'triggers',jsonb_build_object('total',(SELECT count(*) FROM triggers_raw),'returned',(SELECT count(*) FROM triggers_bounded)),'policies',jsonb_build_object('total',(SELECT count(*) FROM policies_raw),'returned',(SELECT count(*) FROM policies_bounded)),'policy_dependencies',jsonb_build_object('total',(SELECT count(*) FROM policy_dependencies_raw),'returned',(SELECT count(*) FROM policy_dependencies_bounded)),'functions',jsonb_build_object('total',(SELECT count(*) FROM functions_raw),'returned',(SELECT count(*) FROM functions_bounded)),'grants',jsonb_build_object('total',(SELECT count(*) FROM grants_raw),'returned',(SELECT count(*) FROM grants_bounded)),'effective_privileges',jsonb_build_object('total',(SELECT count(*) FROM effective_privileges_raw),'returned',(SELECT count(*) FROM effective_privileges_bounded)),'default_acls',jsonb_build_object('total',(SELECT count(*) FROM default_acls_raw),'returned',(SELECT count(*) FROM default_acls_bounded)),'default_acl_grants',jsonb_build_object('total',(SELECT count(*) FROM default_acl_grants_raw),'returned',(SELECT count(*) FROM default_acl_grants_bounded)),'auth_columns',jsonb_build_object('total',(SELECT count(*) FROM auth_columns_raw),'returned',(SELECT count(*) FROM auth_columns_bounded)),'extensions',jsonb_build_object('total',(SELECT count(*) FROM extensions_raw),'returned',(SELECT count(*) FROM extensions_bounded)),'extension_types',jsonb_build_object('total',(SELECT count(*) FROM extension_types_raw),'returned',(SELECT count(*) FROM extension_types_bounded)),'operator_classes',jsonb_build_object('total',(SELECT count(*) FROM operator_classes_raw),'returned',(SELECT count(*) FROM operator_classes_bounded)),'index_methods',jsonb_build_object('total',(SELECT count(*) FROM index_methods_raw),'returned',(SELECT count(*) FROM index_methods_bounded))) counts), gathered AS MATERIALIZED (SELECT
 jsonb_build_object('format','selqiro-location-foundation-catalog-20261127-v1','read_only',current_setting('transaction_read_only')='on','user_rows_read',false,'implementation_ready',false,
 'observer',jsonb_build_object('role',current_user,'server_version_num',current_setting('server_version_num')::integer,'roles_present',(SELECT coalesce(jsonb_agg(rolname ORDER BY rolname COLLATE "C"),'[]'::jsonb) FROM roles)),
 'relation_requests',(SELECT jsonb_agg(jsonb_build_object('name',name,'present',relation_oid IS NOT NULL,'schema_present',schema_present,'schema_usage',schema_usage,'kind',relkind) ORDER BY name COLLATE "C") FROM relation_requests),
 'function_requests',(SELECT jsonb_agg(jsonb_build_object('signature',signature,'required',required,'present',present,'overloads',overloads) ORDER BY signature COLLATE "C") FROM function_requests),
 'catalog',catalog,'counts',counts,'limits',jsonb_build_object('schemas',16,'roles',3,'relations',6,'columns',320,'constraints',128,'indexes',128,'triggers',48,'policies',128,'policy_dependencies',128,'functions',64,'grants',2048,'effective_privileges',1536,'default_acls',20,'default_acl_grants',128,'auth_columns',4,'extensions',3,'extension_types',2,'operator_classes',16,'index_methods',3),'facts_sha256',encode(sha256(convert_to((catalog)::text,'UTF8')),'hex'),'coverage',jsonb_build_object('state','pending','result_limited',false,'call_graph','fixed_signatures_and_direct_attached_triggers_only','body_review','required_before_implementation','max_result_bytes',786432,'issues',to_jsonb(array_remove(ARRAY[
 CASE WHEN current_user<>'postgres' THEN 'unexpected_observer' END,
 CASE WHEN (SELECT count(*) FROM roles)<>3 THEN 'required_role_missing' END,
 CASE WHEN EXISTS(SELECT 1 FROM relation_requests WHERE relation_oid IS NULL) THEN 'required_relation_missing' END,
 CASE WHEN EXISTS(SELECT 1 FROM relation_requests WHERE relation_oid IS NOT NULL AND relkind NOT IN ('r','p')) THEN 'unsupported_relation_kind' END,
 CASE WHEN EXISTS(SELECT 1 FROM relation_requests WHERE relation_oid IS NOT NULL AND NOT schema_usage) THEN 'schema_usage_missing' END,
 CASE WHEN EXISTS(SELECT 1 FROM function_requests WHERE required AND NOT present) THEN 'required_function_missing' END,
 CASE WHEN EXISTS(SELECT 1 FROM function_requests WHERE overloads>1) THEN 'unexpected_function_overloads' END,
 CASE WHEN EXISTS(SELECT 1 FROM auth_columns_raw WHERE NOT (facts->>'present')::boolean) THEN 'required_auth_column_missing' END,
 CASE WHEN (SELECT count(*) FROM schemas_raw)>16 OR (SELECT count(*) FROM roles_raw)>3 OR (SELECT count(*) FROM relations_raw)>6 OR (SELECT count(*) FROM columns_raw)>320 OR (SELECT count(*) FROM constraints_raw)>128 OR (SELECT count(*) FROM indexes_raw)>128 OR (SELECT count(*) FROM triggers_raw)>48 OR (SELECT count(*) FROM policies_raw)>128 OR (SELECT count(*) FROM policy_dependencies_raw)>128 OR (SELECT count(*) FROM functions_raw)>64 OR (SELECT count(*) FROM grants_raw)>2048 OR (SELECT count(*) FROM effective_privileges_raw)>1536 OR (SELECT count(*) FROM default_acls_raw)>20 OR (SELECT count(*) FROM default_acl_grants_raw)>128 OR (SELECT count(*) FROM auth_columns_raw)>4 OR (SELECT count(*) FROM extensions_raw)>3 OR (SELECT count(*) FROM extension_types_raw)>2 OR (SELECT count(*) FROM operator_classes_raw)>16 OR (SELECT count(*) FROM index_methods_raw)>3 THEN 'catalog_limit' END],NULL)))) payload FROM measured)
, bounded AS MATERIALIZED (SELECT CASE WHEN octet_length(payload::text)>786176 OR payload->'coverage'->'issues' ? 'catalog_limit' THEN
 jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(payload,'{catalog}',jsonb_build_object('schemas','[]'::jsonb,'roles','[]'::jsonb,'relations','[]'::jsonb,'columns','[]'::jsonb,'constraints','[]'::jsonb,'indexes','[]'::jsonb,'triggers','[]'::jsonb,'policies','[]'::jsonb,'policy_dependencies','[]'::jsonb,'functions','[]'::jsonb,'grants','[]'::jsonb,'effective_privileges','[]'::jsonb,'default_acls','[]'::jsonb,'default_acl_grants','[]'::jsonb,'auth_columns','[]'::jsonb,'extensions','[]'::jsonb,'extension_types','[]'::jsonb,'operator_classes','[]'::jsonb,'index_methods','[]'::jsonb)),'{facts_sha256}',to_jsonb(encode(sha256(convert_to((jsonb_build_object('schemas','[]'::jsonb,'roles','[]'::jsonb,'relations','[]'::jsonb,'columns','[]'::jsonb,'constraints','[]'::jsonb,'indexes','[]'::jsonb,'triggers','[]'::jsonb,'policies','[]'::jsonb,'policy_dependencies','[]'::jsonb,'functions','[]'::jsonb,'grants','[]'::jsonb,'effective_privileges','[]'::jsonb,'default_acls','[]'::jsonb,'default_acl_grants','[]'::jsonb,'auth_columns','[]'::jsonb,'extensions','[]'::jsonb,'extension_types','[]'::jsonb,'operator_classes','[]'::jsonb,'index_methods','[]'::jsonb))::text,'UTF8')),'hex'))),'{counts}',(SELECT jsonb_object_agg(k,jsonb_set(v,'{returned}','0'::jsonb)) FROM jsonb_each(payload->'counts') AS x(k,v))),'{coverage,result_limited}','true'::jsonb),'{coverage,issues}',payload->'coverage'->'issues'||'"output_limit"'::jsonb)
 ELSE payload END payload FROM gathered)
SELECT jsonb_set(payload,'{coverage,state}',to_jsonb(CASE WHEN jsonb_array_length(payload->'coverage'->'issues')=0 THEN 'complete'::text ELSE 'limited'::text END)) AS result FROM bounded
), locality AS MATERIALIZED (
-- Metadata only. New private scope is closed; counts expose any extra object.
WITH scope AS MATERIALIZED (SELECT oid,nspname,nspowner,nspacl FROM pg_namespace WHERE nspname='profile_location_private'),
 functions AS MATERIALIZED (SELECT p.*,n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='profile_location_private' OR (n.nspname='public' AND p.proname IN
   ('prepare_profile_location_v1','get_my_profile_editor_v2','save_my_profile_editor_v2','reserve_profile_location_lookup_v1'))),
 tables AS MATERIALIZED (SELECT c.*,n.nspname FROM pg_class c JOIN scope n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p')),
 roles AS MATERIALIZED (SELECT oid,rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')),
 facts AS (SELECT jsonb_build_object(
  'format','selqiro-profile-location-catalog-v1',
  'counts',jsonb_build_object('schemas',(SELECT count(*) FROM scope),'relations',(SELECT count(*) FROM pg_class WHERE relnamespace IN (SELECT oid FROM scope)),
   'tables',(SELECT count(*) FROM tables),'functions',(SELECT count(*) FROM functions),
   'columns',(SELECT count(*) FROM pg_attribute WHERE attrelid IN (SELECT oid FROM tables) AND attnum>0 AND NOT attisdropped),
   'constraints',(SELECT count(*) FROM pg_constraint WHERE conrelid IN (SELECT oid FROM tables)),
   'policies',(SELECT count(*) FROM pg_policy WHERE polrelid IN (SELECT oid FROM tables)),
   'table_triggers',(SELECT count(*) FROM pg_trigger WHERE tgrelid IN (SELECT oid FROM tables) AND NOT tgisinternal)),
  'schema',(SELECT jsonb_build_object('name',nspname,'owner',pg_get_userbyid(nspowner),
   'grants',(SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
    'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable)
    ORDER BY (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C",a.privilege_type COLLATE "C")
    FROM aclexplode(coalesce(nspacl,acldefault('n',nspowner))) a),
   'effective',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,'usage',has_schema_privilege(r.oid,s.oid,'USAGE'),
    'create',has_schema_privilege(r.oid,s.oid,'CREATE')) ORDER BY r.rolname COLLATE "C") FROM roles r)) FROM scope s),
  'functions',(SELECT coalesce(jsonb_agg(facts ORDER BY name COLLATE "C"),'[]'::jsonb) FROM (
   SELECT nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')' name,jsonb_build_object(
    'name',nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',
    'owner',pg_get_userbyid(p.proowner),'kind',p.prokind,'language',l.lanname,
    'result',pg_get_function_result(p.oid),'arguments',pg_get_function_identity_arguments(p.oid),
    'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,
    'config',to_jsonb(p.proconfig),'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
    'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
    'grants',(SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
     'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable)
     ORDER BY (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C",a.privilege_type COLLATE "C")
     FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),
    'effective',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,'execute',has_function_privilege(r.oid,p.oid,'EXECUTE'))
      ORDER BY r.rolname COLLATE "C") FROM roles r)) facts
   FROM functions p JOIN pg_language l ON l.oid=p.prolang ORDER BY nspname COLLATE "C",proname COLLATE "C",p.oid LIMIT 32
  ) x),
  'tables',(SELECT coalesce(jsonb_agg(facts ORDER BY name COLLATE "C"),'[]'::jsonb) FROM (
   SELECT c.nspname||'.'||c.relname name,jsonb_build_object('name',c.nspname||'.'||c.relname,
    'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
    'grants',(SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
     'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable)
     ORDER BY (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C",a.privilege_type COLLATE "C")
     FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a),
    'effective',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,'select',has_table_privilege(r.oid,c.oid,'SELECT'),
     'insert',has_table_privilege(r.oid,c.oid,'INSERT'),'update',has_table_privilege(r.oid,c.oid,'UPDATE'),
     'delete',has_table_privilege(r.oid,c.oid,'DELETE'),'truncate',has_table_privilege(r.oid,c.oid,'TRUNCATE'),
     'references',has_table_privilege(r.oid,c.oid,'REFERENCES'),'trigger',has_table_privilege(r.oid,c.oid,'TRIGGER'),
     'maintain',has_table_privilege(r.oid,c.oid,'MAINTAIN')) ORDER BY r.rolname COLLATE "C") FROM roles r),
    'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
     'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid),
     'acl',to_jsonb(a.attacl)) ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
     WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
    'constraints',(SELECT jsonb_agg(jsonb_build_object('name',k.conname,'kind',k.contype,'validated',k.convalidated,
     'deferrable',k.condeferrable,'definition',pg_get_constraintdef(k.oid,true)) ORDER BY k.conname COLLATE "C")
     FROM pg_constraint k WHERE k.conrelid=c.oid),
    'indexes',(SELECT jsonb_agg(jsonb_build_object('name',ci.relname,'unique',i.indisunique,'primary',i.indisprimary,
     'valid',i.indisvalid,'ready',i.indisready,'definition',pg_get_indexdef(i.indexrelid)) ORDER BY ci.relname COLLATE "C")
     FROM pg_index i JOIN pg_class ci ON ci.oid=i.indexrelid WHERE i.indrelid=c.oid)) facts
   FROM tables c ORDER BY c.relname COLLATE "C" LIMIT 16
  ) x),
  'text_invalidation_trigger',(SELECT jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,
   'function',t.tgfoid::regprocedure::text,'definition',pg_get_triggerdef(t.oid)) FROM pg_trigger t
   WHERE t.tgrelid='public.identity_profiles'::regclass AND t.tgname='profile_location_text_changed_v1' AND NOT t.tgisinternal)
 ) result)
SELECT jsonb_build_object('catalog',result,'sha256',encode(sha256(convert_to(result::text,'UTF8')),'hex')) AS result FROM facts
), gathered AS (
 SELECT jsonb_build_object('legacy_sha256',legacy.result->>'facts_sha256',
  'profile_location_sha256',locality.result->>'sha256') facts,
  legacy.result#>>'{coverage,state}' legacy_coverage
 FROM legacy CROSS JOIN locality
)
SELECT jsonb_build_object('format','selqiro-public-profile-map-baseline-v1',
 'coverage',legacy_coverage,'facts',facts,
 'baseline_sha256',encode(sha256(convert_to(facts::text,'UTF8')),'hex')) AS result FROM gathered

 ) q;
 IF observed->>'coverage' IS DISTINCT FROM 'complete'
  OR observed->>'baseline_sha256' IS DISTINCT FROM '23dabb9075381f629643b9742bce7d0995e5bd55987f51d7d5f0bb93399e7d8b' THEN
  RAISE EXCEPTION 'PUBLIC_PROFILE_MAP_BASELINE_MISMATCH' USING ERRCODE='55000';
 END IF;
END;
$map_baseline$;
DO $map_after$
DECLARE observed jsonb;
BEGIN
 SELECT q.result INTO observed FROM (
-- Metadata only. Include every overload or routine kind with the new public name.
WITH routines AS MATERIALIZED (
 SELECT p.*,n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='get_public_profile_location_v1'
), roles AS MATERIALIZED (
 SELECT oid,rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')
), facts AS (
 SELECT jsonb_build_object('format','selqiro-public-profile-map-catalog-v1',
  'counts',jsonb_build_object('routines',(SELECT count(*) FROM routines),'roles',(SELECT count(*) FROM roles)),
  'functions',(SELECT coalesce(jsonb_agg(facts ORDER BY name COLLATE "C"),'[]'::jsonb) FROM (
   SELECT nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')' name,
    jsonb_build_object(
     'name',nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',
     'owner',pg_get_userbyid(p.proowner),'kind',p.prokind,'language',l.lanname,
     'result',pg_get_function_result(p.oid),'arguments',pg_get_function_identity_arguments(p.oid),
     'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,
     'config',to_jsonb(p.proconfig),'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
     'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
     'grants',(SELECT jsonb_agg(jsonb_build_object(
      'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
      'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable)
      ORDER BY (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END) COLLATE "C",a.privilege_type COLLATE "C")
      FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),
     'effective',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,'execute',has_function_privilege(r.oid,p.oid,'EXECUTE'))
      ORDER BY r.rolname COLLATE "C") FROM roles r)) facts
    FROM routines p JOIN pg_language l ON l.oid=p.prolang
    ORDER BY nspname COLLATE "C",proname COLLATE "C",p.oid LIMIT 16
   ) x)
 ) result
)
SELECT jsonb_build_object('catalog',result,'sha256',encode(sha256(convert_to(result::text,'UTF8')),'hex')) AS result FROM facts
 ) q;
 IF observed->>'sha256' IS DISTINCT FROM 'a0697562b1f517c838816498556c89e3c8258c8c0dbfbef023c56663ddb35b39' THEN
  RAISE EXCEPTION 'PUBLIC_PROFILE_MAP_AFTER_MISMATCH' USING ERRCODE='55000';
 END IF;
END;
$map_after$;
SELECT jsonb_build_object('format','selqiro-public-profile-map-v1','stage','after',
 'baseline_sha256','23dabb9075381f629643b9742bce7d0995e5bd55987f51d7d5f0bb93399e7d8b',
 'release_sha256','5bd05bc448a072a67615c22f1fd3004ca740e4ce2fd1fb993d66f1c07b2d8193',
 'contract_sha256','a0697562b1f517c838816498556c89e3c8258c8c0dbfbef023c56663ddb35b39','no_user_rows_exported',true) AS result;
ROLLBACK;
