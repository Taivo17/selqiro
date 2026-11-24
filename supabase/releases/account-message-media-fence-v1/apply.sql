-- One guarded schema transaction; no account/content/object row mutations.
BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE;
SET LOCAL search_path=pg_catalog;
SET LOCAL TimeZone='UTC';
SET LOCAL jit=off;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='2s';
SET LOCAL idle_in_transaction_session_timeout='15s';
-- Fresh execution prerequisite, not a previously observed catalog fact.
-- FOR SHARE requires row visibility, SELECT and at least one UPDATE column.
-- No privileges are changed and no Auth/account data is selected here.
DO $message_media_authority$
BEGIN
 IF current_user <> 'postgres'
 OR NOT coalesce(has_schema_privilege('postgres','auth','USAGE'),false)
 OR NOT coalesce(has_table_privilege('postgres','auth.users','SELECT'),false)
 OR NOT coalesce(has_any_column_privilege('postgres','auth.users','UPDATE'),false)
 OR coalesce(row_security_active('auth.users'::regclass),true)
 OR NOT coalesce(has_schema_privilege('postgres','account_lifecycle_private','USAGE'),false)
 OR NOT coalesce(has_table_privilege('postgres','account_lifecycle_private.account_states','SELECT'),false)
 OR NOT coalesce(has_any_column_privilege('postgres','account_lifecycle_private.account_states','UPDATE'),false)
 OR coalesce(row_security_active('account_lifecycle_private.account_states'::regclass),true) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNT_MESSAGE_MEDIA_AUTHORITY_REQUIRED';
 END IF;
END;
$message_media_authority$;

-- Storage policy authority and bucket configuration are fresh prerequisites.
-- They are not described as previously observed hosted metadata. No object rows
-- are read, and existing legacy bucket privacy/limits are preserved as found.
DO $storage_authority$
DECLARE storage_rls boolean;storage_authority boolean;storage_setting text;
 storage_policy_grants jsonb;storage_grant_tables jsonb;
BEGIN
 IF NOT coalesce(has_schema_privilege('postgres','storage','USAGE'),false)
 OR NOT coalesce(has_table_privilege('postgres','storage.buckets','SELECT'),false)
 OR coalesce(row_security_active('storage.buckets'::regclass),true) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNT_MESSAGE_MEDIA_STORAGE_AUTHORITY_REQUIRED'; END IF;
 SELECT c.relrowsecurity,pg_has_role('postgres',c.relowner,'USAGE') INTO storage_rls,storage_authority FROM pg_class c WHERE c.oid='storage.objects'::regclass;
 -- Supabase may delegate policy management without inheriting the table owner.
 -- A registered SIGHUP-only Supautils setting is distinct from an arbitrary
 -- custom GUC placeholder. Its grant is for this exact current user and table.
 IF storage_authority IS NOT TRUE AND current_user='postgres' THEN
  storage_authority:=false;
  BEGIN
   SELECT s.setting INTO storage_setting FROM pg_catalog.pg_settings s
    WHERE s.name='supautils.policy_grants' AND s.context='sighup' AND s.vartype='string';
   IF FOUND THEN
    storage_policy_grants:=storage_setting::jsonb;
    IF jsonb_typeof(storage_policy_grants)='object' THEN
     IF NOT EXISTS(SELECT 1 FROM jsonb_each(storage_policy_grants) g WHERE jsonb_typeof(g.value)<>'array') THEN
      IF NOT EXISTS(SELECT 1 FROM jsonb_each(storage_policy_grants) g
       CROSS JOIN LATERAL jsonb_array_elements(g.value) t WHERE jsonb_typeof(t.value)<>'string') THEN
       storage_grant_tables:=storage_policy_grants->current_user::text;
       IF jsonb_typeof(storage_grant_tables)='array' THEN
        -- Resolve a table NAME like Supautils, not regclass's numeric-OID input.
        SELECT coalesce(bool_or(pg_catalog.to_regclass((SELECT string_agg(pg_catalog.quote_ident(p.part),'.' ORDER BY p.ordinal)
          FROM unnest(pg_catalog.parse_ident(t.value,true)) WITH ORDINALITY p(part,ordinal)))='storage.objects'::regclass),false)
         INTO storage_authority FROM jsonb_array_elements_text(storage_grant_tables) t(value);
       END IF;
      END IF;
     END IF;
    END IF;
   END IF;
  EXCEPTION WHEN OTHERS THEN
   storage_authority:=false;
  END;
 END IF;

 IF storage_rls IS NOT TRUE OR storage_authority IS NOT TRUE THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNT_MESSAGE_MEDIA_STORAGE_AUTHORITY_REQUIRED'; END IF;
 IF (SELECT count(*) FROM pg_attribute WHERE attrelid='storage.objects'::regclass AND attnum>0 AND NOT attisdropped)>128
 OR (SELECT count(*) FROM pg_policy WHERE polrelid='storage.objects'::regclass)>128
 OR (SELECT count(*) FROM pg_trigger WHERE tgrelid='storage.objects'::regclass AND NOT tgisinternal)>64 THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='ACCOUNT_MESSAGE_MEDIA_STORAGE_CATALOG_LIMIT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='messages')
 OR NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='message-attachments-v2' AND public=false
  AND file_size_limit=2000000 AND allowed_mime_types=ARRAY['image/webp']::text[]) THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='ACCOUNT_MESSAGE_MEDIA_BUCKET_CONFIG_MISMATCH'; END IF;
END;
$storage_authority$;
DO $message_media_lock$ BEGIN PERFORM pg_advisory_xact_lock(20261124,48109); END $message_media_lock$;
DO $message_media_guard$ DECLARE observed jsonb; BEGIN
WITH observed AS MATERIALIZED (
WITH managed_marker AS MATERIALIZED (
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
 WHERE n.nspname||'.'||p.proname IN ('public.listing_contact_is_managed_v1')
),accepted AS MATERIALIZED (
WITH core_observation AS MATERIALIZED (
WITH requested_relations(name) AS (VALUES
('public.conversations'),
('public.messages'),
('public.conversation_participants')
), requested_functions(signature,name,argument_types) AS (VALUES
('listing_contact_private.require_actor_hosted_v1(uuid,uuid)','listing_contact_private.require_actor_hosted_v1',ARRAY['uuid','uuid']::text[]),
('listing_contact_private.require_peer(uuid,uuid)','listing_contact_private.require_peer',ARRAY['uuid','uuid']::text[]),
('listing_contact_private.require_member(bigint,uuid,uuid)','listing_contact_private.require_member',ARRAY['bigint','uuid','uuid']::text[]),
('listing_contact_private.require_unblocked(uuid,uuid)','listing_contact_private.require_unblocked',ARRAY['uuid','uuid']::text[]),
('messaging_private_v2.exact_thread(bigint,uuid,uuid)','messaging_private_v2.exact_thread',ARRAY['bigint','uuid','uuid']::text[]),
('messaging_private_v2.require_thread(bigint,uuid,uuid)','messaging_private_v2.require_thread',ARRAY['bigint','uuid','uuid']::text[]),
('public.contact_my_listing_seller_v1(uuid,uuid,uuid,text)','public.contact_my_listing_seller_v1',ARRAY['uuid','uuid','uuid','text']::text[]),
('public.contact_my_horse_seller_v1(uuid,uuid,uuid,uuid)','public.contact_my_horse_seller_v1',ARRAY['uuid','uuid','uuid','uuid']::text[]),
('public.contact_my_service_provider_v1(uuid,uuid,uuid,uuid)','public.contact_my_service_provider_v1',ARRAY['uuid','uuid','uuid','uuid']::text[]),
('public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text)','public.send_my_listing_message_v1',ARRAY['uuid','uuid','uuid','text','text','text']::text[]),
('public.send_my_message_v2(uuid,uuid,uuid,text,text,text,uuid)','public.send_my_message_v2',ARRAY['uuid','uuid','uuid','text','text','text','uuid']::text[])
), relation_requests AS MATERIALIZED (
 SELECT r.name,n.oid schema_oid,c.oid relation_oid,c.relkind,
 n.oid IS NOT NULL schema_present,
 CASE WHEN n.oid IS NULL THEN false ELSE has_schema_privilege(current_user,n.oid,'USAGE') END schema_usage
 FROM requested_relations r LEFT JOIN pg_namespace n ON n.nspname=split_part(r.name,'.',1)
 LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=split_part(r.name,'.',2)
), scoped_relations AS MATERIALIZED (
 SELECT r.name,c.* FROM relation_requests r JOIN pg_class c ON c.oid=r.relation_oid
 WHERE c.relkind IN ('r','p')
), fixed_functions AS MATERIALIZED (
 SELECT p.oid,r.signature FROM requested_functions r
 JOIN pg_namespace n ON n.nspname=split_part(r.name,'.',1)
 JOIN pg_proc p ON p.pronamespace=n.oid AND p.proname=split_part(r.name,'.',2) AND p.prokind='f'
 WHERE ARRAY(SELECT format_type(t,NULL) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY a(t,k) ORDER BY k)=r.argument_types
), scoped_triggers AS MATERIALIZED (
 SELECT t.* FROM pg_trigger t WHERE t.tgrelid IN (SELECT oid FROM scoped_relations) AND NOT t.tgisinternal AND t.tgname NOT IN ('guard_account_lifecycle_conversation_v1','guard_account_lifecycle_participant_v1')
), function_scope AS MATERIALIZED (
 SELECT oid FROM fixed_functions UNION SELECT tgfoid FROM scoped_triggers
), roles AS MATERIALIZED (
 SELECT oid,rolname,rolsuper,rolbypassrls,rolinherit,rolcanlogin FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','selqiro_listing_contact_writer_v1')
), scoped_schemas AS MATERIALIZED (
 SELECT n.* FROM pg_namespace n WHERE n.oid IN (SELECT schema_oid FROM relation_requests)
 OR n.oid IN (SELECT p.pronamespace FROM pg_proc p JOIN function_scope f ON f.oid=p.oid)
), scoped_policies AS MATERIALIZED (
 SELECT p.*,r.name relation_name FROM pg_policy p JOIN scoped_relations r ON r.oid=p.polrelid
)
, schemas_raw AS MATERIALIZED (SELECT n.nspname sort_key,jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),'observer_usage',has_schema_privilege(current_user,n.oid,'USAGE'),'acl_sha256',encode(sha256(convert_to((coalesce(n.nspacl,acldefault('n',n.nspowner)))::text,'UTF8')),'hex')) facts FROM scoped_schemas n)
, schemas_bounded AS MATERIALIZED (SELECT sort_key,facts FROM schemas_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 12)
, roles_raw AS MATERIALIZED (SELECT rolname sort_key,jsonb_build_object('name',rolname,'superuser',rolsuper,'bypass_rls',rolbypassrls,'inherit',rolinherit,'can_login',rolcanlogin) facts FROM roles)
, roles_bounded AS MATERIALIZED (SELECT sort_key,facts FROM roles_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 4)
, relations_raw AS MATERIALIZED (SELECT r.name sort_key,jsonb_build_object('name',r.name,'kind',r.relkind,'owner',pg_get_userbyid(r.relowner),'rls',r.relrowsecurity,'force_rls',r.relforcerowsecurity,'observer_select',has_table_privilege(current_user,r.oid,'SELECT'),'acl_sha256',encode(sha256(convert_to((coalesce(r.relacl,acldefault('r',r.relowner)))::text,'UTF8')),'hex')) facts FROM scoped_relations r)
, relations_bounded AS MATERIALIZED (SELECT sort_key,facts FROM relations_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 3)
, columns_raw AS MATERIALIZED (SELECT r.name||':'||lpad(a.attnum::text,5,'0') sort_key,jsonb_build_object('relation',r.name,'name',a.attname,'position',a.attnum,'type',format_type(a.atttypid,a.atttypmod),'acl_sha256',CASE WHEN a.attacl IS NULL THEN NULL ELSE encode(sha256(convert_to((a.attacl)::text,'UTF8')),'hex') END) facts FROM scoped_relations r JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped)
, columns_bounded AS MATERIALIZED (SELECT sort_key,facts FROM columns_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 192)
, triggers_raw AS MATERIALIZED (SELECT r.name||':'||t.tgname sort_key,jsonb_build_object('relation',r.name,'name',t.tgname,'enabled',t.tgenabled,'event_mask',t.tgtype,'function',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')','argument_count',t.tgnargs,'arguments_sha256',encode(sha256(t.tgargs),'hex'),'when_tree_sha256',CASE WHEN t.tgqual IS NULL THEN NULL ELSE encode(sha256(convert_to((t.tgqual)::text,'UTF8')),'hex') END,'definition_sha256',encode(sha256(convert_to((pg_get_triggerdef(t.oid))::text,'UTF8')),'hex')) facts FROM scoped_triggers t JOIN scoped_relations r ON r.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace)
, triggers_bounded AS MATERIALIZED (SELECT sort_key,facts FROM triggers_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 32)
, policies_raw AS MATERIALIZED (SELECT p.relation_name||':'||p.polname sort_key,jsonb_build_object('relation',p.relation_name,'name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END ORDER BY x) FROM unnest(p.polroles) x),'using_sha256',CASE WHEN pg_get_expr(p.polqual,p.polrelid) IS NULL THEN NULL ELSE encode(sha256(convert_to((pg_get_expr(p.polqual,p.polrelid))::text,'UTF8')),'hex') END,'check_sha256',CASE WHEN pg_get_expr(p.polwithcheck,p.polrelid) IS NULL THEN NULL ELSE encode(sha256(convert_to((pg_get_expr(p.polwithcheck,p.polrelid))::text,'UTF8')),'hex') END) facts FROM scoped_policies p)
, policies_bounded AS MATERIALIZED (SELECT sort_key,facts FROM policies_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 96)
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
 UNION ALL SELECT 'column',r.name||'.'||c.attname,pg_get_userbyid(a.grantor),
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable
 FROM scoped_relations r JOIN pg_attribute c ON c.attrelid=r.oid AND c.attnum>0 AND NOT c.attisdropped
 CROSS JOIN LATERAL aclexplode(c.attacl) a
 UNION ALL SELECT 'function',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',pg_get_userbyid(a.grantor),
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable
 FROM function_scope f JOIN pg_proc p ON p.oid=f.oid JOIN pg_namespace n ON n.oid=p.pronamespace
 CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
 ) g)
, grants_bounded AS MATERIALIZED (SELECT sort_key,facts FROM grants_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 1536)
, effective_privileges_raw AS MATERIALIZED (SELECT g.object_kind||g.object_name||g.role sort_key,to_jsonb(g) facts FROM (
 SELECT 'schema'::text object_kind,n.nspname::text object_name,a.rolname role,
 NULL::boolean can_select,NULL::boolean can_insert,NULL::boolean can_update,NULL::boolean can_delete,NULL::boolean can_execute,
 has_schema_privilege(a.oid,n.oid,'USAGE') can_usage FROM scoped_schemas n CROSS JOIN roles a
 UNION ALL SELECT 'relation',r.name,a.rolname,
 has_table_privilege(a.oid,r.oid,'SELECT'),has_table_privilege(a.oid,r.oid,'INSERT'),
 has_table_privilege(a.oid,r.oid,'UPDATE'),has_table_privilege(a.oid,r.oid,'DELETE'),NULL::boolean,NULL::boolean
 FROM scoped_relations r CROSS JOIN roles a
 UNION ALL SELECT 'column',r.name||'.'||c.attname,a.rolname,
 has_column_privilege(a.oid,r.oid,c.attnum,'SELECT'),has_column_privilege(a.oid,r.oid,c.attnum,'INSERT'),
 has_column_privilege(a.oid,r.oid,c.attnum,'UPDATE'),NULL::boolean,NULL::boolean,NULL::boolean
 FROM scoped_relations r JOIN pg_attribute c ON c.attrelid=r.oid AND c.attnum>0 AND NOT c.attisdropped CROSS JOIN roles a
 UNION ALL SELECT 'function',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',a.rolname,NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,
 has_function_privilege(a.oid,p.oid,'EXECUTE'),NULL::boolean
 FROM function_scope f JOIN pg_proc p ON p.oid=f.oid JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN roles a
 ) g)
, effective_privileges_bounded AS MATERIALIZED (SELECT sort_key,facts FROM effective_privileges_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 1536)
, measured AS MATERIALIZED (SELECT jsonb_build_object('schemas',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM schemas_bounded),'roles',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM roles_bounded),'relations',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM relations_bounded),'columns',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM columns_bounded),'triggers',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM triggers_bounded),'policies',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM policies_bounded),'policy_dependencies',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM policy_dependencies_bounded),'functions',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM functions_bounded),'grants',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM grants_bounded),'effective_privileges',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM effective_privileges_bounded)) catalog,jsonb_build_object('schemas',jsonb_build_object('total',(SELECT count(*) FROM schemas_raw),'returned',(SELECT count(*) FROM schemas_bounded)),'roles',jsonb_build_object('total',(SELECT count(*) FROM roles_raw),'returned',(SELECT count(*) FROM roles_bounded)),'relations',jsonb_build_object('total',(SELECT count(*) FROM relations_raw),'returned',(SELECT count(*) FROM relations_bounded)),'columns',jsonb_build_object('total',(SELECT count(*) FROM columns_raw),'returned',(SELECT count(*) FROM columns_bounded)),'triggers',jsonb_build_object('total',(SELECT count(*) FROM triggers_raw),'returned',(SELECT count(*) FROM triggers_bounded)),'policies',jsonb_build_object('total',(SELECT count(*) FROM policies_raw),'returned',(SELECT count(*) FROM policies_bounded)),'policy_dependencies',jsonb_build_object('total',(SELECT count(*) FROM policy_dependencies_raw),'returned',(SELECT count(*) FROM policy_dependencies_bounded)),'functions',jsonb_build_object('total',(SELECT count(*) FROM functions_raw),'returned',(SELECT count(*) FROM functions_bounded)),'grants',jsonb_build_object('total',(SELECT count(*) FROM grants_raw),'returned',(SELECT count(*) FROM grants_bounded)),'effective_privileges',jsonb_build_object('total',(SELECT count(*) FROM effective_privileges_raw),'returned',(SELECT count(*) FROM effective_privileges_bounded))) counts), gathered AS MATERIALIZED (SELECT
 jsonb_build_object('format','selqiro-account-contact-catalog-20261124-v2','read_only',current_setting('transaction_read_only')='on','user_rows_read',false,
 'observer',jsonb_build_object('role',current_user,'server_version_num',current_setting('server_version_num')::integer,'roles_present',(SELECT coalesce(jsonb_agg(rolname ORDER BY rolname COLLATE "C"),'[]'::jsonb) FROM roles)),
 'relation_requests',(SELECT jsonb_agg(jsonb_build_object('name',name,'present',relation_oid IS NOT NULL,'schema_present',schema_present,'schema_usage',schema_usage,'kind',relkind) ORDER BY name COLLATE "C") FROM relation_requests),
 'function_requests',(SELECT jsonb_agg(jsonb_build_object('signature',r.signature,'required',true,'present',EXISTS(SELECT 1 FROM fixed_functions f WHERE f.signature=r.signature),'overloads',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=r.name AND p.prokind='f')) ORDER BY r.signature COLLATE "C") FROM requested_functions r),
 'catalog',catalog,'counts',counts,'limits',jsonb_build_object('schemas',12,'roles',4,'relations',3,'columns',192,'triggers',32,'policies',96,'policy_dependencies',128,'functions',64,'grants',1536,'effective_privileges',1536),'facts_sha256',encode(sha256(convert_to((catalog)::text,'UTF8')),'hex'),'coverage',jsonb_build_object('state','pending','result_limited',false,'call_graph','fixed_signatures_and_direct_attached_triggers_only','body_review','required_before_implementation','max_result_bytes',786432,'issues',to_jsonb(array_remove(ARRAY[
 CASE WHEN current_user<>'postgres' THEN 'unexpected_observer' END,
 CASE WHEN (SELECT count(*) FROM roles)<>4 THEN 'required_role_missing' END,
 CASE WHEN EXISTS(SELECT 1 FROM relation_requests WHERE relation_oid IS NULL) THEN 'required_relation_missing' END,
 CASE WHEN EXISTS(SELECT 1 FROM relation_requests WHERE relation_oid IS NOT NULL AND relkind NOT IN ('r','p')) THEN 'unsupported_relation_kind' END,
 CASE WHEN EXISTS(SELECT 1 FROM relation_requests WHERE relation_oid IS NOT NULL AND NOT schema_usage) THEN 'schema_usage_missing' END,
 CASE WHEN (SELECT count(*) FROM fixed_functions)<>11 THEN 'required_function_missing' END,
 CASE WHEN EXISTS(SELECT 1 FROM requested_functions r WHERE (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=r.name AND p.prokind='f')>1) THEN 'unexpected_function_overloads' END,
 CASE WHEN (SELECT count(*) FROM schemas_raw)>12 OR (SELECT count(*) FROM roles_raw)>4 OR (SELECT count(*) FROM relations_raw)>3 OR (SELECT count(*) FROM columns_raw)>192 OR (SELECT count(*) FROM triggers_raw)>32 OR (SELECT count(*) FROM policies_raw)>96 OR (SELECT count(*) FROM policy_dependencies_raw)>128 OR (SELECT count(*) FROM functions_raw)>64 OR (SELECT count(*) FROM grants_raw)>1536 OR (SELECT count(*) FROM effective_privileges_raw)>1536 THEN 'catalog_limit' END],NULL)))) payload FROM measured)
, bounded AS MATERIALIZED (SELECT CASE WHEN octet_length(payload::text)>786176 OR payload->'coverage'->'issues' ? 'catalog_limit' THEN
 jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(payload,'{catalog}',jsonb_build_object('schemas','[]'::jsonb,'roles','[]'::jsonb,'relations','[]'::jsonb,'columns','[]'::jsonb,'triggers','[]'::jsonb,'policies','[]'::jsonb,'policy_dependencies','[]'::jsonb,'functions','[]'::jsonb,'grants','[]'::jsonb,'effective_privileges','[]'::jsonb)),'{facts_sha256}',to_jsonb(encode(sha256(convert_to((jsonb_build_object('schemas','[]'::jsonb,'roles','[]'::jsonb,'relations','[]'::jsonb,'columns','[]'::jsonb,'triggers','[]'::jsonb,'policies','[]'::jsonb,'policy_dependencies','[]'::jsonb,'functions','[]'::jsonb,'grants','[]'::jsonb,'effective_privileges','[]'::jsonb))::text,'UTF8')),'hex'))),'{counts}',(SELECT jsonb_object_agg(k,jsonb_set(v,'{returned}','0'::jsonb)) FROM jsonb_each(payload->'counts') AS x(k,v))),'{coverage,result_limited}','true'::jsonb),'{coverage,issues}',payload->'coverage'->'issues'||'"output_limit"'::jsonb)
 ELSE payload END payload FROM gathered)
SELECT jsonb_set(payload,'{coverage,state}',to_jsonb(CASE WHEN jsonb_array_length(payload->'coverage'->'issues')=0 THEN 'complete'::text ELSE 'limited'::text END)) AS result FROM bounded
), account_observation AS MATERIALIZED (
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
),job_observation AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object(
 'signature',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',
 'owner',pg_get_userbyid(p.proowner),'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,
 'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,'result',pg_get_function_result(p.oid),
 'arguments',to_jsonb(p.proargnames),'defaults',pg_get_expr(p.proargdefaults,0),'config',to_jsonb(p.proconfig),
 'body',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'grantor',pg_get_userbyid(a.grantor),'grantable',a.is_grantable,'privilege',a.privilege_type) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a)
 ) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]'::jsonb) value
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE (n.nspname,p.proname) IN (('public','contact_my_job_provider_v1'),('jobs_private','contact_snapshot'))
),helper_observation AS MATERIALIZED (
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
)
SELECT jsonb_build_object('contact_catalog',jsonb_set(result-ARRAY['read_only','facts_sha256'],'{catalog,functions}',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'signature' COLLATE "C"),'[]'::jsonb) FROM jsonb_array_elements(result->'catalog'->'functions') x WHERE x->>'name' NOT IN ('messaging_private_v2.guard_account_block','public.contact_my_horse_seller_v1','public.contact_my_listing_seller_v1','public.contact_my_service_provider_v1','public.send_my_listing_message_v1','public.send_my_message_v2'))),'account',(SELECT value FROM account_observation),'job_snapshot',(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM job_observation,jsonb_array_elements(value) x WHERE x->>'signature' LIKE 'jobs_private.%')) b,
jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'signature' COLLATE "C"),'[]'::jsonb) FROM jsonb_array_elements(result->'catalog'->'functions') x WHERE x->>'name' IN ('messaging_private_v2.guard_account_block','public.contact_my_horse_seller_v1','public.contact_my_listing_seller_v1','public.contact_my_service_provider_v1','public.send_my_listing_message_v1','public.send_my_message_v2')),'job_contact',(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM job_observation,jsonb_array_elements(value) x WHERE x->>'signature' LIKE 'public.%'),'new_helper',(SELECT value FROM helper_observation)) t FROM core_observation
),photo_functions AS MATERIALIZED (
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
 WHERE n.nspname||'.'||p.proname IN ('messaging_private_v2.bucket_ready','messaging_private_v2.photo_receipt','public.reserve_my_message_photo_v2','public.claim_message_photo_upload_v2','public.finish_message_photo_upload_v2','public.cancel_my_message_photo_v2','public.get_my_message_photo_binding_v2','public.claim_message_photo_cleanup_v2','public.finish_message_photo_cleanup_v2')
),photo_structure AS MATERIALIZED (
SELECT jsonb_build_object(
 'schema',(SELECT jsonb_build_object('owner',pg_get_userbyid(n.nspowner),'acl',
   (SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,
    'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
    FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a)) FROM pg_namespace n WHERE n.nspname='messaging_private_v2'),
 'tables',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
   'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
   'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,
     'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum)
    FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
   'constraints',(SELECT jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'validated',q.convalidated,
    'definition',pg_get_constraintdef(q.oid)) ORDER BY q.conname) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
   'indexes',(SELECT jsonb_agg(pg_get_indexdef(i.indexrelid) ORDER BY x.relname) FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid WHERE i.indrelid=c.oid),
   'policies',(SELECT jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
    'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'public' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
    'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname) FROM pg_policy q WHERE q.polrelid=c.oid),
   'acl',(SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,
    'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
    FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a)
  ) ORDER BY c.relname),'[]'::jsonb) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='messaging_private_v2' AND c.relkind IN('r','p','v','m','f')),
 'public_indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'owner',pg_get_userbyid(c.relowner),'definition',pg_get_indexdef(c.oid)) ORDER BY c.relname),'[]'::jsonb)
   FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relname IN('messaging_thread_activity_v2','messaging_thread_message_v2')),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb)
  FROM pg_trigger t WHERE t.tgrelid='public.messages'::regclass AND t.tgname IN('protect_attached_message_photo_v2','messaging_account_block_v2')),
 'storage_policy',(SELECT jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
    'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'public' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
    'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname)
    FROM pg_policy q WHERE q.polrelid='storage.objects'::regclass AND q.polname='message_attachments_v2_server_only')
) value
),storage_policies AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
 'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
 'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]'::jsonb) value
 FROM pg_policy q WHERE q.polrelid='storage.objects'::regclass AND q.polname IN ('Participants can upload message images','Participants can view message images','message_attachments_v2_server_only')
), new_objects AS MATERIALIZED (
WITH funcs AS (SELECT coalesce(jsonb_agg(jsonb_build_object(
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
 WHERE n.nspname||'.'||p.proname IN ('messaging_private_v2.require_writable_thread_v1','messaging_private_v2.guard_legacy_conversation_accounts_v1','messaging_private_v2.guard_legacy_participant_accounts_v1','public.message_photo_write_available_v1')), policies AS (SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
 'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
 'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]'::jsonb) value
 FROM pg_policy q WHERE q.polrelid='storage.objects'::regclass AND q.polname IN ('message_legacy_account_insert_v1','message_legacy_account_update_v1')) SELECT jsonb_build_object('functions',(SELECT value FROM funcs),'policies',(SELECT value FROM policies),'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t WHERE t.tgname IN ('guard_account_lifecycle_conversation_v1','guard_account_lifecycle_participant_v1'))) value
)
SELECT jsonb_build_object('managed_marker',(SELECT jsonb_agg(x-ARRAY['acl','effective']) FROM managed_marker,jsonb_array_elements(value) x),'accepted_contact_base',accepted.b,'accepted_contact_target',accepted.t,'photo_structure',(SELECT value FROM photo_structure),'storage_required_policies',(SELECT value FROM storage_policies),'unchanged_photo_functions',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'signature'),'[]'::jsonb) FROM photo_functions,jsonb_array_elements(value) x WHERE split_part(x->>'signature','(',1) NOT IN ('public.reserve_my_message_photo_v2','public.claim_message_photo_upload_v2','public.finish_message_photo_upload_v2'))) b,
jsonb_build_object('photo_functions',(SELECT jsonb_agg(x ORDER BY x->>'signature') FROM photo_functions,jsonb_array_elements(value) x WHERE split_part(x->>'signature','(',1) IN ('public.reserve_my_message_photo_v2','public.claim_message_photo_upload_v2','public.finish_message_photo_upload_v2')),'new_objects',(SELECT value FROM new_objects)) t FROM accepted
),fingerprints AS (SELECT encode(sha256(convert_to(b::text,'UTF8')),'hex') b,encode(sha256(convert_to(t::text,'UTF8')),'hex') t FROM observed),evaluated AS (SELECT *,CASE WHEN b='f82446e2b2b6afbc6faead421786a86cee06a668060f2b2ff0d564b4e2012a1e' AND t='a991e5f0b4645d002a50a6f92a740a0184069c353eda524fdfb4e663ae1f8bf2' THEN 'before' WHEN b='f82446e2b2b6afbc6faead421786a86cee06a668060f2b2ff0d564b4e2012a1e' AND t='b5c7913ee90e02f291ef55f6d75524b33bba161a36947b52fb5289badc5e09bb' THEN 'after' ELSE 'unknown' END state FROM fingerprints)
SELECT jsonb_build_object('format','selqiro-account-message-media-fence-20261124-v1','stage','preflight','state',state,'recognized',state IN('before','after'),'read_only',true,'account_rows_read',false,'account_rows_exported',false,'base_fingerprint',b,'target_fingerprint',t,'fence_verified',state='after') INTO observed FROM evaluated;
 IF observed->>'state' IS DISTINCT FROM 'before' THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='ACCOUNT_MESSAGE_MEDIA_SCHEMA_MISMATCH',DETAIL='base='||(observed->>'base_fingerprint')||';target='||(observed->>'target_fingerprint'); END IF;
END $message_media_guard$;
CREATE TEMP TABLE selqiro_message_media_storage_before ON COMMIT DROP AS -- Dynamic bounded snapshot of pre-existing Storage metadata. This is retained
-- only inside the single apply transaction, not invented as a previous fact.
SELECT jsonb_build_object(
 'relation',(SELECT jsonb_build_object('owner',pg_get_userbyid(c.relowner),'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
  'acl',coalesce(c.relacl,acldefault('r',c.relowner))::text) FROM pg_class c WHERE c.oid='storage.objects'::regclass),
 'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,
  'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid),'acl',a.attacl::text) ORDER BY a.attnum)
  FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
  WHERE a.attrelid='storage.objects'::regclass AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
  'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(p.polroles) x ORDER BY 1),
  'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]'::jsonb)
  FROM pg_policy p WHERE p.polrelid='storage.objects'::regclass AND p.polname NOT IN('message_legacy_account_insert_v1','message_legacy_account_update_v1')),
 'triggers',(SELECT coalesce(jsonb_agg(pg_get_triggerdef(t.oid) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid='storage.objects'::regclass AND NOT tgisinternal),
 'buckets',(SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'public',public,'limit',file_size_limit,'mimes',allowed_mime_types) ORDER BY id)
  FROM storage.buckets WHERE id IN('messages','message-attachments-v2'))
) value;
-- Account write helper remains installed and byte-exact. These entry points are
-- private, except the caller-bound boolean required by Storage RLS.
CREATE FUNCTION messaging_private_v2.require_writable_thread_v1(p_conversation bigint,p_user uuid,p_identity uuid)
RETURNS public.conversations LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c public.conversations%ROWTYPE;
BEGIN
 SELECT * INTO c FROM public.conversations WHERE id=p_conversation FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.conversation_participants WHERE conversation_id=p_conversation FOR SHARE;
 IF NOT messaging_private_v2.exact_thread(p_conversation,p_user,p_identity) THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM listing_contact_private.require_available_accounts_v1(c.buyer_id,c.seller_id);
 RETURN c;
END $f$;

CREATE FUNCTION messaging_private_v2.guard_legacy_conversation_accounts_v1()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE actor uuid;identity_key uuid;
BEGIN
 -- Existing INVOKER guard remains responsible for managed writer permissions.
 IF public.listing_contact_is_managed_v1(CASE WHEN TG_OP='UPDATE' THEN OLD.id END,CASE WHEN TG_OP='UPDATE' THEN OLD.listing_id END)
 OR public.listing_contact_is_managed_v1(NEW.id,NEW.listing_id) THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot','updated_at','archived_at'])
   IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot','updated_at','archived_at']) THEN
   RAISE EXCEPTION 'message_conversation_binding_immutable' USING ERRCODE='42501'; END IF;
  IF NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
  -- Retention-only archive and cleared listing snapshots do not create contact.
  IF NEW.archived_at IS NOT NULL AND (to_jsonb(NEW)-'archived_at')=(to_jsonb(OLD)-'archived_at') THEN RETURN NEW; END IF;
  IF NEW.listing_title_snapshot IS NULL AND NEW.listing_image_snapshot IS NULL AND NEW.listing_price_snapshot IS NULL
   AND (NEW.listing_id IS NOT DISTINCT FROM OLD.listing_id OR (NEW.listing_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.listings WHERE id=OLD.listing_id)))
   AND (to_jsonb(NEW)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot'])=
       (to_jsonb(OLD)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot']) THEN RETURN NEW; END IF;
 END IF;
 actor:=auth.uid();
 -- Existing message INSERT maintenance has no JWT subject, but its nested
 -- activity update is already under the exact thread lock. Keep that narrow
 -- path while still checking both accounts and freezing every binding.
 IF TG_OP='UPDATE' AND actor IS NULL AND pg_trigger_depth()>1 AND NEW.archived_at IS NULL
 AND (to_jsonb(NEW)-ARRAY['updated_at','archived_at'])=(to_jsonb(OLD)-ARRAY['updated_at','archived_at']) THEN
  PERFORM messaging_private_v2.require_writable_thread_v1(NEW.id,NEW.buyer_id,NEW.buyer_identity_id);
  RETURN NEW;
 END IF;
 SELECT active_identity_id INTO identity_key FROM public.profiles WHERE id=actor;
 IF actor IS NULL OR identity_key IS NULL OR NEW.buyer_id IS NULL OR NEW.seller_id IS NULL
 OR NEW.buyer_identity_id IS NULL OR NEW.seller_identity_id IS NULL
 OR NEW.buyer_id=NEW.seller_id OR NEW.buyer_identity_id=NEW.seller_identity_id
 OR NOT ((NEW.buyer_id=actor AND NEW.buyer_identity_id=identity_key) OR (NEW.seller_id=actor AND NEW.seller_identity_id=identity_key))
 OR (TG_OP='INSERT' AND NEW.created_by IS DISTINCT FROM actor) THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 -- No profile/identity lock is acquired from inside an already locked UPDATE.
 -- New INSERT has no visible existing conversation to contend with.
 IF TG_OP='INSERT' THEN
  PERFORM listing_contact_private.require_peer(NEW.buyer_id,NEW.buyer_identity_id);
  PERFORM listing_contact_private.require_peer(NEW.seller_id,NEW.seller_identity_id);
 END IF;
 PERFORM listing_contact_private.require_available_accounts_v1(NEW.buyer_id,NEW.seller_id);
 RETURN NEW;
END $f$;

CREATE FUNCTION messaging_private_v2.guard_legacy_participant_accounts_v1()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c public.conversations%ROWTYPE;actor uuid;identity_key uuid;
BEGIN
 IF public.listing_contact_is_managed_v1(CASE WHEN TG_OP='UPDATE' THEN OLD.conversation_id END)
 OR public.listing_contact_is_managed_v1(NEW.conversation_id) THEN RETURN NEW; END IF;
 actor:=auth.uid();
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['last_read_at','deleted_at','custom_title']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['last_read_at','deleted_at','custom_title']) THEN
   RAISE EXCEPTION 'message_participant_binding_immutable' USING ERRCODE='42501'; END IF;
  IF NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
  IF actor=OLD.user_id THEN RETURN NEW; END IF;
  -- The existing sender trigger may unhide the peer after a successful send.
  IF NEW.deleted_at IS NOT NULL OR (to_jsonb(NEW)-'deleted_at')<>(to_jsonb(OLD)-'deleted_at') THEN
   RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND actor IS NULL AND pg_trigger_depth()>1 AND NEW.deleted_at IS NULL
 AND (to_jsonb(NEW)-'deleted_at')=(to_jsonb(OLD)-'deleted_at') THEN
  PERFORM messaging_private_v2.require_writable_thread_v1(NEW.conversation_id,NEW.user_id,NEW.identity_id);
  RETURN NEW;
 END IF;
 SELECT active_identity_id INTO identity_key FROM public.profiles WHERE id=actor;
 SELECT * INTO c FROM public.conversations WHERE id=NEW.conversation_id FOR UPDATE;
 IF NOT FOUND OR actor IS NULL OR identity_key IS NULL OR c.buyer_id IS NULL OR c.seller_id IS NULL
 OR c.buyer_identity_id IS NULL OR c.seller_identity_id IS NULL
 OR c.buyer_id=c.seller_id OR c.buyer_identity_id=c.seller_identity_id
 OR NOT ((c.buyer_id=actor AND c.buyer_identity_id=identity_key) OR (c.seller_id=actor AND c.seller_identity_id=identity_key))
 OR NOT ((NEW.user_id=c.buyer_id AND NEW.identity_id=c.buyer_identity_id) OR (NEW.user_id=c.seller_id AND NEW.identity_id=c.seller_identity_id))
 OR NEW.user_id IS NULL OR NEW.identity_id IS NULL THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' AND ((SELECT count(*) FROM public.conversation_participants WHERE conversation_id=c.id)>=2
 OR EXISTS(SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id=c.id AND
  (p.user_id IS NULL OR p.identity_id IS NULL OR NOT ((p.user_id=c.buyer_id AND p.identity_id=c.buyer_identity_id) OR (p.user_id=c.seller_id AND p.identity_id=c.seller_identity_id))))) THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' AND NOT messaging_private_v2.exact_thread(c.id,actor,identity_key) THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM listing_contact_private.require_available_accounts_v1(c.buyer_id,c.seller_id);
 RETURN NEW;
END $f$;

CREATE FUNCTION public.message_photo_write_available_v1(p_name text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE actor uuid;identity_key uuid;cid bigint;
BEGIN
 actor:=auth.uid();
 IF actor IS NULL OR p_name IS NULL OR length(p_name)>230
 OR p_name !~ '^[1-9][0-9]{0,18}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$' OR strpos(p_name,'..')>0 THEN RETURN false; END IF;
 BEGIN cid:=split_part(p_name,'/',1)::bigint; EXCEPTION WHEN numeric_value_out_of_range THEN RETURN false; END;
 SELECT active_identity_id INTO identity_key FROM public.profiles WHERE id=actor;
 IF identity_key IS NULL THEN RETURN false; END IF;
 PERFORM messaging_private_v2.require_writable_thread_v1(cid,actor,identity_key);
 -- Recheck selection after any conversation/account lock wait, without taking
 -- a profile lock after the conversation lock.
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor AND active_identity_id=identity_key) THEN RETURN false; END IF;
 RETURN true;
END $f$;

REVOKE ALL ON FUNCTION messaging_private_v2.require_writable_thread_v1(bigint,uuid,uuid),
 messaging_private_v2.guard_legacy_conversation_accounts_v1(),messaging_private_v2.guard_legacy_participant_accounts_v1(),
 public.message_photo_write_available_v1(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION messaging_private_v2.require_writable_thread_v1(bigint,uuid,uuid) TO selqiro_listing_contact_writer_v1;
GRANT EXECUTE ON FUNCTION public.message_photo_write_available_v1(text) TO authenticated;

CREATE TRIGGER guard_account_lifecycle_conversation_v1 BEFORE INSERT OR UPDATE ON public.conversations
 FOR EACH ROW EXECUTE FUNCTION messaging_private_v2.guard_legacy_conversation_accounts_v1();
CREATE TRIGGER guard_account_lifecycle_participant_v1 BEFORE INSERT OR UPDATE ON public.conversation_participants
 FOR EACH ROW EXECUTE FUNCTION messaging_private_v2.guard_legacy_participant_accounts_v1();

CREATE POLICY message_legacy_account_insert_v1 ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated
 WITH CHECK(CASE WHEN bucket_id='messages' THEN CASE WHEN auth.uid() IS NULL THEN false ELSE public.message_photo_write_available_v1(name) END ELSE true END);
CREATE POLICY message_legacy_account_update_v1 ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated
 USING(CASE WHEN bucket_id='messages' THEN CASE WHEN auth.uid() IS NULL THEN false ELSE public.message_photo_write_available_v1(name) END ELSE true END)
 WITH CHECK(CASE WHEN bucket_id='messages' THEN CASE WHEN auth.uid() IS NULL THEN false ELSE public.message_photo_write_available_v1(name) END ELSE true END);

CREATE OR REPLACE FUNCTION public.reserve_my_message_photo_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_conversation_id text,p_source_sha256 text,p_source_bytes bigint,p_source_mime text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;c public.conversations%ROWTYPE;ph messaging_private_v2.photos%ROWTYPE;peer_u uuid;peer_i uuid;t timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key);cid:=listing_contact_private.positive_id(p_conversation_id);
 IF p_source_sha256 IS NULL OR p_source_sha256 !~ '^[0-9a-f]{64}$' OR p_source_bytes IS NULL
 OR p_source_bytes NOT BETWEEN 1 AND 1400000 OR p_source_mime IS DISTINCT FROM 'image/webp' THEN
  RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 c:=messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF ph.identity_id<>p_expected_identity_id OR ph.conversation_id<>cid OR ph.source_sha256<>p_source_sha256 OR ph.source_bytes<>p_source_bytes OR ph.source_mime<>p_source_mime THEN
   RAISE EXCEPTION 'message_photo_request_conflict' USING ERRCODE='22023'; END IF;
  IF ph.state IN('reserved','uploading','ready') AND ph.expires_at<=clock_timestamp() THEN
   UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=clock_timestamp(),failure_code='EXPIRED' WHERE attachment_id=ph.attachment_id RETURNING * INTO ph;
  END IF;
  RETURN messaging_private_v2.photo_receipt(ph);
 END IF;
 c:=messaging_private_v2.require_writable_thread_v1(cid,p_expected_user_id,p_expected_identity_id);
 IF NOT messaging_private_v2.bucket_ready() THEN RAISE EXCEPTION 'message_photo_storage_unavailable' USING ERRCODE='55000'; END IF;
 IF c.buyer_id=p_expected_user_id THEN peer_u:=c.seller_id;peer_i:=c.seller_identity_id; ELSE peer_u:=c.buyer_id;peer_i:=c.buyer_identity_id; END IF;
 PERFORM listing_contact_private.require_peer(peer_u,peer_i);PERFORM listing_contact_private.require_unblocked(p_expected_user_id,peer_u);
 -- require_actor holds the actor profile lock, serializing this actor's quota
 -- decisions. Permanent tombstones retain their byte reservation: an ambiguous
 -- late upload never creates unaccounted storage merely because it was canceled.
 t:=clock_timestamp();
 IF (SELECT count(*) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND created_at>t-interval '1 hour')>=10
 OR (SELECT count(*) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND created_at>t-interval '1 day')>=100
 OR (SELECT coalesce(sum(source_bytes),0) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND created_at>t-interval '1 day')+p_source_bytes>104857600
 OR (SELECT count(*) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND state IN('reserved','uploading','ready') AND expires_at>t)>=10
 OR (SELECT coalesce(sum(coalesce(web_bytes,2000000)),0) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id)+2000000>262144000 THEN
  RAISE EXCEPTION 'message_photo_quota' USING ERRCODE='54000'; END IF;
 INSERT INTO messaging_private_v2.photos(actor_user_id,identity_id,conversation_id,request_key,source_sha256,source_bytes,source_mime,created_at,expires_at)
 VALUES(p_expected_user_id,p_expected_identity_id,cid,p_request_key,p_source_sha256,p_source_bytes,p_source_mime,t,t+interval '30 minutes') RETURNING * INTO ph;
 RETURN messaging_private_v2.photo_receipt(ph);
END $f$;

CREATE OR REPLACE FUNCTION public.claim_message_photo_upload_v2(p_attachment_id uuid,p_expected_user_id uuid,p_expected_identity_id uuid,
 p_source_sha256 text,p_claim_key uuid,p_web_sha256 text,p_web_bytes bigint,p_width integer,p_height integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE ph messaging_private_v2.photos%ROWTYPE;initial_ph messaging_private_v2.photos%ROWTYPE;gated boolean:=false;
BEGIN
 PERFORM listing_contact_private.require_key(p_claim_key);
 IF p_web_sha256 IS NULL OR p_web_sha256 !~ '^[0-9a-f]{64}$' OR p_web_bytes IS NULL OR p_web_bytes NOT BETWEEN 1 AND 2000000
 OR p_width IS NULL OR p_width NOT BETWEEN 1 AND 1600 OR p_height IS NULL OR p_height NOT BETWEEN 1 AND 1600 THEN
  RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 SELECT * INTO initial_ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id;
 IF FOUND AND initial_ph.actor_user_id=p_expected_user_id AND initial_ph.identity_id=p_expected_identity_id
 AND initial_ph.source_sha256=p_source_sha256
 AND (initial_ph.upload_key IS NULL OR (initial_ph.web_sha256=p_web_sha256 AND initial_ph.web_bytes=p_web_bytes AND initial_ph.width=p_width AND initial_ph.height=p_height))
 AND initial_ph.state IN('reserved','uploading') AND initial_ph.expires_at>clock_timestamp() THEN
  PERFORM messaging_private_v2.require_writable_thread_v1(initial_ph.conversation_id,initial_ph.actor_user_id,initial_ph.identity_id);
  gated:=true;
 END IF;
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
 IF NOT FOUND OR ph.actor_user_id IS DISTINCT FROM p_expected_user_id OR ph.identity_id IS DISTINCT FROM p_expected_identity_id
 OR ph.source_sha256 IS DISTINCT FROM p_source_sha256 THEN RAISE EXCEPTION 'message_photo_unavailable' USING ERRCODE='42501'; END IF;
 IF ph.upload_key IS NOT NULL AND (ph.web_sha256<>p_web_sha256 OR ph.web_bytes<>p_web_bytes OR ph.width<>p_width OR ph.height<>p_height) THEN
  RAISE EXCEPTION 'message_photo_output_conflict' USING ERRCODE='22023'; END IF;
 IF ph.state IN('reserved','uploading') AND ph.expires_at>clock_timestamp()
 AND (NOT gated OR (ph.actor_user_id,ph.identity_id,ph.conversation_id) IS DISTINCT FROM (initial_ph.actor_user_id,initial_ph.identity_id,initial_ph.conversation_id)) THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 IF ph.state IN('reserved','uploading','ready') AND ph.expires_at<=clock_timestamp() THEN
  UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=clock_timestamp(),failure_code='EXPIRED' WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 ELSIF ph.state='reserved' THEN
  IF NOT messaging_private_v2.bucket_ready() THEN RAISE EXCEPTION 'message_photo_storage_unavailable' USING ERRCODE='55000'; END IF;
  UPDATE messaging_private_v2.photos SET state='uploading',upload_key=p_claim_key,web_sha256=p_web_sha256,web_bytes=p_web_bytes,width=p_width,height=p_height
  WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 END IF;
 -- A replay returns the original upload key and exact frozen bytes. The HTTP
 -- transport must use create-only writes; an existing object must be read/hash
 -- verified against this manifest, never overwritten or silently adopted.
 RETURN messaging_private_v2.photo_receipt(ph);
END $f$;

CREATE OR REPLACE FUNCTION public.finish_message_photo_upload_v2(p_attachment_id uuid,p_claim_key uuid,p_outcome text,
 p_web_sha256 text,p_web_bytes bigint,p_width integer,p_height integer,p_failure_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE ph messaging_private_v2.photos%ROWTYPE;initial_ph messaging_private_v2.photos%ROWTYPE;gated boolean:=false;
BEGIN
 IF p_outcome IS NULL OR p_outcome NOT IN('ready','failed') OR (p_failure_code IS NOT NULL AND p_failure_code !~ '^[A-Z0-9_]{1,64}$') THEN
  RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 SELECT * INTO initial_ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id;
 IF FOUND AND initial_ph.upload_key=p_claim_key AND p_claim_key IS NOT NULL
 AND initial_ph.web_sha256=p_web_sha256 AND initial_ph.web_bytes=p_web_bytes AND initial_ph.width=p_width AND initial_ph.height=p_height
 AND p_outcome='ready' AND initial_ph.state='uploading' AND initial_ph.expires_at>clock_timestamp() THEN
  PERFORM messaging_private_v2.require_writable_thread_v1(initial_ph.conversation_id,initial_ph.actor_user_id,initial_ph.identity_id);
  gated:=true;
 END IF;
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
 IF NOT FOUND OR ph.upload_key IS DISTINCT FROM p_claim_key OR p_claim_key IS NULL
 OR ph.web_sha256 IS DISTINCT FROM p_web_sha256 OR ph.web_bytes IS DISTINCT FROM p_web_bytes
 OR ph.width IS DISTINCT FROM p_width OR ph.height IS DISTINCT FROM p_height THEN
  RAISE EXCEPTION 'message_photo_output_conflict' USING ERRCODE='22023'; END IF;
 IF p_outcome='ready' AND ph.state='uploading' AND ph.expires_at>clock_timestamp()
 AND (NOT gated OR (ph.actor_user_id,ph.identity_id,ph.conversation_id) IS DISTINCT FROM (initial_ph.actor_user_id,initial_ph.identity_id,initial_ph.conversation_id)) THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 IF ph.state IN('reserved','uploading','ready') AND (ph.expires_at<=clock_timestamp() OR p_outcome='failed') THEN
  UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=clock_timestamp(),failure_code=coalesce(p_failure_code,CASE WHEN ph.expires_at<=clock_timestamp() THEN 'EXPIRED' ELSE 'UPLOAD_FAILED' END)
  WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 ELSIF ph.state='uploading' AND p_outcome='ready' THEN
  IF NOT messaging_private_v2.bucket_ready() THEN RAISE EXCEPTION 'message_photo_storage_unavailable' USING ERRCODE='55000'; END IF;
  UPDATE messaging_private_v2.photos SET state='ready' WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 END IF;
 -- attached and tombstoned states never regress or resurrect on late results.
 RETURN messaging_private_v2.photo_receipt(ph);
END $f$;

DO $message_media_guard$ DECLARE observed jsonb; BEGIN
WITH observed AS MATERIALIZED (
WITH managed_marker AS MATERIALIZED (
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
 WHERE n.nspname||'.'||p.proname IN ('public.listing_contact_is_managed_v1')
),accepted AS MATERIALIZED (
WITH core_observation AS MATERIALIZED (
WITH requested_relations(name) AS (VALUES
('public.conversations'),
('public.messages'),
('public.conversation_participants')
), requested_functions(signature,name,argument_types) AS (VALUES
('listing_contact_private.require_actor_hosted_v1(uuid,uuid)','listing_contact_private.require_actor_hosted_v1',ARRAY['uuid','uuid']::text[]),
('listing_contact_private.require_peer(uuid,uuid)','listing_contact_private.require_peer',ARRAY['uuid','uuid']::text[]),
('listing_contact_private.require_member(bigint,uuid,uuid)','listing_contact_private.require_member',ARRAY['bigint','uuid','uuid']::text[]),
('listing_contact_private.require_unblocked(uuid,uuid)','listing_contact_private.require_unblocked',ARRAY['uuid','uuid']::text[]),
('messaging_private_v2.exact_thread(bigint,uuid,uuid)','messaging_private_v2.exact_thread',ARRAY['bigint','uuid','uuid']::text[]),
('messaging_private_v2.require_thread(bigint,uuid,uuid)','messaging_private_v2.require_thread',ARRAY['bigint','uuid','uuid']::text[]),
('public.contact_my_listing_seller_v1(uuid,uuid,uuid,text)','public.contact_my_listing_seller_v1',ARRAY['uuid','uuid','uuid','text']::text[]),
('public.contact_my_horse_seller_v1(uuid,uuid,uuid,uuid)','public.contact_my_horse_seller_v1',ARRAY['uuid','uuid','uuid','uuid']::text[]),
('public.contact_my_service_provider_v1(uuid,uuid,uuid,uuid)','public.contact_my_service_provider_v1',ARRAY['uuid','uuid','uuid','uuid']::text[]),
('public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text)','public.send_my_listing_message_v1',ARRAY['uuid','uuid','uuid','text','text','text']::text[]),
('public.send_my_message_v2(uuid,uuid,uuid,text,text,text,uuid)','public.send_my_message_v2',ARRAY['uuid','uuid','uuid','text','text','text','uuid']::text[])
), relation_requests AS MATERIALIZED (
 SELECT r.name,n.oid schema_oid,c.oid relation_oid,c.relkind,
 n.oid IS NOT NULL schema_present,
 CASE WHEN n.oid IS NULL THEN false ELSE has_schema_privilege(current_user,n.oid,'USAGE') END schema_usage
 FROM requested_relations r LEFT JOIN pg_namespace n ON n.nspname=split_part(r.name,'.',1)
 LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=split_part(r.name,'.',2)
), scoped_relations AS MATERIALIZED (
 SELECT r.name,c.* FROM relation_requests r JOIN pg_class c ON c.oid=r.relation_oid
 WHERE c.relkind IN ('r','p')
), fixed_functions AS MATERIALIZED (
 SELECT p.oid,r.signature FROM requested_functions r
 JOIN pg_namespace n ON n.nspname=split_part(r.name,'.',1)
 JOIN pg_proc p ON p.pronamespace=n.oid AND p.proname=split_part(r.name,'.',2) AND p.prokind='f'
 WHERE ARRAY(SELECT format_type(t,NULL) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY a(t,k) ORDER BY k)=r.argument_types
), scoped_triggers AS MATERIALIZED (
 SELECT t.* FROM pg_trigger t WHERE t.tgrelid IN (SELECT oid FROM scoped_relations) AND NOT t.tgisinternal AND t.tgname NOT IN ('guard_account_lifecycle_conversation_v1','guard_account_lifecycle_participant_v1')
), function_scope AS MATERIALIZED (
 SELECT oid FROM fixed_functions UNION SELECT tgfoid FROM scoped_triggers
), roles AS MATERIALIZED (
 SELECT oid,rolname,rolsuper,rolbypassrls,rolinherit,rolcanlogin FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','selqiro_listing_contact_writer_v1')
), scoped_schemas AS MATERIALIZED (
 SELECT n.* FROM pg_namespace n WHERE n.oid IN (SELECT schema_oid FROM relation_requests)
 OR n.oid IN (SELECT p.pronamespace FROM pg_proc p JOIN function_scope f ON f.oid=p.oid)
), scoped_policies AS MATERIALIZED (
 SELECT p.*,r.name relation_name FROM pg_policy p JOIN scoped_relations r ON r.oid=p.polrelid
)
, schemas_raw AS MATERIALIZED (SELECT n.nspname sort_key,jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),'observer_usage',has_schema_privilege(current_user,n.oid,'USAGE'),'acl_sha256',encode(sha256(convert_to((coalesce(n.nspacl,acldefault('n',n.nspowner)))::text,'UTF8')),'hex')) facts FROM scoped_schemas n)
, schemas_bounded AS MATERIALIZED (SELECT sort_key,facts FROM schemas_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 12)
, roles_raw AS MATERIALIZED (SELECT rolname sort_key,jsonb_build_object('name',rolname,'superuser',rolsuper,'bypass_rls',rolbypassrls,'inherit',rolinherit,'can_login',rolcanlogin) facts FROM roles)
, roles_bounded AS MATERIALIZED (SELECT sort_key,facts FROM roles_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 4)
, relations_raw AS MATERIALIZED (SELECT r.name sort_key,jsonb_build_object('name',r.name,'kind',r.relkind,'owner',pg_get_userbyid(r.relowner),'rls',r.relrowsecurity,'force_rls',r.relforcerowsecurity,'observer_select',has_table_privilege(current_user,r.oid,'SELECT'),'acl_sha256',encode(sha256(convert_to((coalesce(r.relacl,acldefault('r',r.relowner)))::text,'UTF8')),'hex')) facts FROM scoped_relations r)
, relations_bounded AS MATERIALIZED (SELECT sort_key,facts FROM relations_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 3)
, columns_raw AS MATERIALIZED (SELECT r.name||':'||lpad(a.attnum::text,5,'0') sort_key,jsonb_build_object('relation',r.name,'name',a.attname,'position',a.attnum,'type',format_type(a.atttypid,a.atttypmod),'acl_sha256',CASE WHEN a.attacl IS NULL THEN NULL ELSE encode(sha256(convert_to((a.attacl)::text,'UTF8')),'hex') END) facts FROM scoped_relations r JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped)
, columns_bounded AS MATERIALIZED (SELECT sort_key,facts FROM columns_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 192)
, triggers_raw AS MATERIALIZED (SELECT r.name||':'||t.tgname sort_key,jsonb_build_object('relation',r.name,'name',t.tgname,'enabled',t.tgenabled,'event_mask',t.tgtype,'function',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')','argument_count',t.tgnargs,'arguments_sha256',encode(sha256(t.tgargs),'hex'),'when_tree_sha256',CASE WHEN t.tgqual IS NULL THEN NULL ELSE encode(sha256(convert_to((t.tgqual)::text,'UTF8')),'hex') END,'definition_sha256',encode(sha256(convert_to((pg_get_triggerdef(t.oid))::text,'UTF8')),'hex')) facts FROM scoped_triggers t JOIN scoped_relations r ON r.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace)
, triggers_bounded AS MATERIALIZED (SELECT sort_key,facts FROM triggers_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 32)
, policies_raw AS MATERIALIZED (SELECT p.relation_name||':'||p.polname sort_key,jsonb_build_object('relation',p.relation_name,'name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END ORDER BY x) FROM unnest(p.polroles) x),'using_sha256',CASE WHEN pg_get_expr(p.polqual,p.polrelid) IS NULL THEN NULL ELSE encode(sha256(convert_to((pg_get_expr(p.polqual,p.polrelid))::text,'UTF8')),'hex') END,'check_sha256',CASE WHEN pg_get_expr(p.polwithcheck,p.polrelid) IS NULL THEN NULL ELSE encode(sha256(convert_to((pg_get_expr(p.polwithcheck,p.polrelid))::text,'UTF8')),'hex') END) facts FROM scoped_policies p)
, policies_bounded AS MATERIALIZED (SELECT sort_key,facts FROM policies_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 96)
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
 UNION ALL SELECT 'column',r.name||'.'||c.attname,pg_get_userbyid(a.grantor),
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable
 FROM scoped_relations r JOIN pg_attribute c ON c.attrelid=r.oid AND c.attnum>0 AND NOT c.attisdropped
 CROSS JOIN LATERAL aclexplode(c.attacl) a
 UNION ALL SELECT 'function',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',pg_get_userbyid(a.grantor),
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable
 FROM function_scope f JOIN pg_proc p ON p.oid=f.oid JOIN pg_namespace n ON n.oid=p.pronamespace
 CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
 ) g)
, grants_bounded AS MATERIALIZED (SELECT sort_key,facts FROM grants_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 1536)
, effective_privileges_raw AS MATERIALIZED (SELECT g.object_kind||g.object_name||g.role sort_key,to_jsonb(g) facts FROM (
 SELECT 'schema'::text object_kind,n.nspname::text object_name,a.rolname role,
 NULL::boolean can_select,NULL::boolean can_insert,NULL::boolean can_update,NULL::boolean can_delete,NULL::boolean can_execute,
 has_schema_privilege(a.oid,n.oid,'USAGE') can_usage FROM scoped_schemas n CROSS JOIN roles a
 UNION ALL SELECT 'relation',r.name,a.rolname,
 has_table_privilege(a.oid,r.oid,'SELECT'),has_table_privilege(a.oid,r.oid,'INSERT'),
 has_table_privilege(a.oid,r.oid,'UPDATE'),has_table_privilege(a.oid,r.oid,'DELETE'),NULL::boolean,NULL::boolean
 FROM scoped_relations r CROSS JOIN roles a
 UNION ALL SELECT 'column',r.name||'.'||c.attname,a.rolname,
 has_column_privilege(a.oid,r.oid,c.attnum,'SELECT'),has_column_privilege(a.oid,r.oid,c.attnum,'INSERT'),
 has_column_privilege(a.oid,r.oid,c.attnum,'UPDATE'),NULL::boolean,NULL::boolean,NULL::boolean
 FROM scoped_relations r JOIN pg_attribute c ON c.attrelid=r.oid AND c.attnum>0 AND NOT c.attisdropped CROSS JOIN roles a
 UNION ALL SELECT 'function',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',a.rolname,NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,
 has_function_privilege(a.oid,p.oid,'EXECUTE'),NULL::boolean
 FROM function_scope f JOIN pg_proc p ON p.oid=f.oid JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN roles a
 ) g)
, effective_privileges_bounded AS MATERIALIZED (SELECT sort_key,facts FROM effective_privileges_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 1536)
, measured AS MATERIALIZED (SELECT jsonb_build_object('schemas',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM schemas_bounded),'roles',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM roles_bounded),'relations',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM relations_bounded),'columns',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM columns_bounded),'triggers',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM triggers_bounded),'policies',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM policies_bounded),'policy_dependencies',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM policy_dependencies_bounded),'functions',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM functions_bounded),'grants',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM grants_bounded),'effective_privileges',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM effective_privileges_bounded)) catalog,jsonb_build_object('schemas',jsonb_build_object('total',(SELECT count(*) FROM schemas_raw),'returned',(SELECT count(*) FROM schemas_bounded)),'roles',jsonb_build_object('total',(SELECT count(*) FROM roles_raw),'returned',(SELECT count(*) FROM roles_bounded)),'relations',jsonb_build_object('total',(SELECT count(*) FROM relations_raw),'returned',(SELECT count(*) FROM relations_bounded)),'columns',jsonb_build_object('total',(SELECT count(*) FROM columns_raw),'returned',(SELECT count(*) FROM columns_bounded)),'triggers',jsonb_build_object('total',(SELECT count(*) FROM triggers_raw),'returned',(SELECT count(*) FROM triggers_bounded)),'policies',jsonb_build_object('total',(SELECT count(*) FROM policies_raw),'returned',(SELECT count(*) FROM policies_bounded)),'policy_dependencies',jsonb_build_object('total',(SELECT count(*) FROM policy_dependencies_raw),'returned',(SELECT count(*) FROM policy_dependencies_bounded)),'functions',jsonb_build_object('total',(SELECT count(*) FROM functions_raw),'returned',(SELECT count(*) FROM functions_bounded)),'grants',jsonb_build_object('total',(SELECT count(*) FROM grants_raw),'returned',(SELECT count(*) FROM grants_bounded)),'effective_privileges',jsonb_build_object('total',(SELECT count(*) FROM effective_privileges_raw),'returned',(SELECT count(*) FROM effective_privileges_bounded))) counts), gathered AS MATERIALIZED (SELECT
 jsonb_build_object('format','selqiro-account-contact-catalog-20261124-v2','read_only',current_setting('transaction_read_only')='on','user_rows_read',false,
 'observer',jsonb_build_object('role',current_user,'server_version_num',current_setting('server_version_num')::integer,'roles_present',(SELECT coalesce(jsonb_agg(rolname ORDER BY rolname COLLATE "C"),'[]'::jsonb) FROM roles)),
 'relation_requests',(SELECT jsonb_agg(jsonb_build_object('name',name,'present',relation_oid IS NOT NULL,'schema_present',schema_present,'schema_usage',schema_usage,'kind',relkind) ORDER BY name COLLATE "C") FROM relation_requests),
 'function_requests',(SELECT jsonb_agg(jsonb_build_object('signature',r.signature,'required',true,'present',EXISTS(SELECT 1 FROM fixed_functions f WHERE f.signature=r.signature),'overloads',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=r.name AND p.prokind='f')) ORDER BY r.signature COLLATE "C") FROM requested_functions r),
 'catalog',catalog,'counts',counts,'limits',jsonb_build_object('schemas',12,'roles',4,'relations',3,'columns',192,'triggers',32,'policies',96,'policy_dependencies',128,'functions',64,'grants',1536,'effective_privileges',1536),'facts_sha256',encode(sha256(convert_to((catalog)::text,'UTF8')),'hex'),'coverage',jsonb_build_object('state','pending','result_limited',false,'call_graph','fixed_signatures_and_direct_attached_triggers_only','body_review','required_before_implementation','max_result_bytes',786432,'issues',to_jsonb(array_remove(ARRAY[
 CASE WHEN current_user<>'postgres' THEN 'unexpected_observer' END,
 CASE WHEN (SELECT count(*) FROM roles)<>4 THEN 'required_role_missing' END,
 CASE WHEN EXISTS(SELECT 1 FROM relation_requests WHERE relation_oid IS NULL) THEN 'required_relation_missing' END,
 CASE WHEN EXISTS(SELECT 1 FROM relation_requests WHERE relation_oid IS NOT NULL AND relkind NOT IN ('r','p')) THEN 'unsupported_relation_kind' END,
 CASE WHEN EXISTS(SELECT 1 FROM relation_requests WHERE relation_oid IS NOT NULL AND NOT schema_usage) THEN 'schema_usage_missing' END,
 CASE WHEN (SELECT count(*) FROM fixed_functions)<>11 THEN 'required_function_missing' END,
 CASE WHEN EXISTS(SELECT 1 FROM requested_functions r WHERE (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=r.name AND p.prokind='f')>1) THEN 'unexpected_function_overloads' END,
 CASE WHEN (SELECT count(*) FROM schemas_raw)>12 OR (SELECT count(*) FROM roles_raw)>4 OR (SELECT count(*) FROM relations_raw)>3 OR (SELECT count(*) FROM columns_raw)>192 OR (SELECT count(*) FROM triggers_raw)>32 OR (SELECT count(*) FROM policies_raw)>96 OR (SELECT count(*) FROM policy_dependencies_raw)>128 OR (SELECT count(*) FROM functions_raw)>64 OR (SELECT count(*) FROM grants_raw)>1536 OR (SELECT count(*) FROM effective_privileges_raw)>1536 THEN 'catalog_limit' END],NULL)))) payload FROM measured)
, bounded AS MATERIALIZED (SELECT CASE WHEN octet_length(payload::text)>786176 OR payload->'coverage'->'issues' ? 'catalog_limit' THEN
 jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(payload,'{catalog}',jsonb_build_object('schemas','[]'::jsonb,'roles','[]'::jsonb,'relations','[]'::jsonb,'columns','[]'::jsonb,'triggers','[]'::jsonb,'policies','[]'::jsonb,'policy_dependencies','[]'::jsonb,'functions','[]'::jsonb,'grants','[]'::jsonb,'effective_privileges','[]'::jsonb)),'{facts_sha256}',to_jsonb(encode(sha256(convert_to((jsonb_build_object('schemas','[]'::jsonb,'roles','[]'::jsonb,'relations','[]'::jsonb,'columns','[]'::jsonb,'triggers','[]'::jsonb,'policies','[]'::jsonb,'policy_dependencies','[]'::jsonb,'functions','[]'::jsonb,'grants','[]'::jsonb,'effective_privileges','[]'::jsonb))::text,'UTF8')),'hex'))),'{counts}',(SELECT jsonb_object_agg(k,jsonb_set(v,'{returned}','0'::jsonb)) FROM jsonb_each(payload->'counts') AS x(k,v))),'{coverage,result_limited}','true'::jsonb),'{coverage,issues}',payload->'coverage'->'issues'||'"output_limit"'::jsonb)
 ELSE payload END payload FROM gathered)
SELECT jsonb_set(payload,'{coverage,state}',to_jsonb(CASE WHEN jsonb_array_length(payload->'coverage'->'issues')=0 THEN 'complete'::text ELSE 'limited'::text END)) AS result FROM bounded
), account_observation AS MATERIALIZED (
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
),job_observation AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object(
 'signature',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',
 'owner',pg_get_userbyid(p.proowner),'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,
 'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,'result',pg_get_function_result(p.oid),
 'arguments',to_jsonb(p.proargnames),'defaults',pg_get_expr(p.proargdefaults,0),'config',to_jsonb(p.proconfig),
 'body',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'grantor',pg_get_userbyid(a.grantor),'grantable',a.is_grantable,'privilege',a.privilege_type) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a)
 ) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]'::jsonb) value
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE (n.nspname,p.proname) IN (('public','contact_my_job_provider_v1'),('jobs_private','contact_snapshot'))
),helper_observation AS MATERIALIZED (
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
)
SELECT jsonb_build_object('contact_catalog',jsonb_set(result-ARRAY['read_only','facts_sha256'],'{catalog,functions}',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'signature' COLLATE "C"),'[]'::jsonb) FROM jsonb_array_elements(result->'catalog'->'functions') x WHERE x->>'name' NOT IN ('messaging_private_v2.guard_account_block','public.contact_my_horse_seller_v1','public.contact_my_listing_seller_v1','public.contact_my_service_provider_v1','public.send_my_listing_message_v1','public.send_my_message_v2'))),'account',(SELECT value FROM account_observation),'job_snapshot',(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM job_observation,jsonb_array_elements(value) x WHERE x->>'signature' LIKE 'jobs_private.%')) b,
jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'signature' COLLATE "C"),'[]'::jsonb) FROM jsonb_array_elements(result->'catalog'->'functions') x WHERE x->>'name' IN ('messaging_private_v2.guard_account_block','public.contact_my_horse_seller_v1','public.contact_my_listing_seller_v1','public.contact_my_service_provider_v1','public.send_my_listing_message_v1','public.send_my_message_v2')),'job_contact',(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM job_observation,jsonb_array_elements(value) x WHERE x->>'signature' LIKE 'public.%'),'new_helper',(SELECT value FROM helper_observation)) t FROM core_observation
),photo_functions AS MATERIALIZED (
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
 WHERE n.nspname||'.'||p.proname IN ('messaging_private_v2.bucket_ready','messaging_private_v2.photo_receipt','public.reserve_my_message_photo_v2','public.claim_message_photo_upload_v2','public.finish_message_photo_upload_v2','public.cancel_my_message_photo_v2','public.get_my_message_photo_binding_v2','public.claim_message_photo_cleanup_v2','public.finish_message_photo_cleanup_v2')
),photo_structure AS MATERIALIZED (
SELECT jsonb_build_object(
 'schema',(SELECT jsonb_build_object('owner',pg_get_userbyid(n.nspowner),'acl',
   (SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,
    'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
    FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a)) FROM pg_namespace n WHERE n.nspname='messaging_private_v2'),
 'tables',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
   'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
   'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,
     'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum)
    FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
   'constraints',(SELECT jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'validated',q.convalidated,
    'definition',pg_get_constraintdef(q.oid)) ORDER BY q.conname) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
   'indexes',(SELECT jsonb_agg(pg_get_indexdef(i.indexrelid) ORDER BY x.relname) FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid WHERE i.indrelid=c.oid),
   'policies',(SELECT jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
    'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'public' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
    'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname) FROM pg_policy q WHERE q.polrelid=c.oid),
   'acl',(SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,
    'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
    FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a)
  ) ORDER BY c.relname),'[]'::jsonb) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='messaging_private_v2' AND c.relkind IN('r','p','v','m','f')),
 'public_indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'owner',pg_get_userbyid(c.relowner),'definition',pg_get_indexdef(c.oid)) ORDER BY c.relname),'[]'::jsonb)
   FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relname IN('messaging_thread_activity_v2','messaging_thread_message_v2')),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb)
  FROM pg_trigger t WHERE t.tgrelid='public.messages'::regclass AND t.tgname IN('protect_attached_message_photo_v2','messaging_account_block_v2')),
 'storage_policy',(SELECT jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
    'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'public' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
    'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname)
    FROM pg_policy q WHERE q.polrelid='storage.objects'::regclass AND q.polname='message_attachments_v2_server_only')
) value
),storage_policies AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
 'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
 'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]'::jsonb) value
 FROM pg_policy q WHERE q.polrelid='storage.objects'::regclass AND q.polname IN ('Participants can upload message images','Participants can view message images','message_attachments_v2_server_only')
), new_objects AS MATERIALIZED (
WITH funcs AS (SELECT coalesce(jsonb_agg(jsonb_build_object(
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
 WHERE n.nspname||'.'||p.proname IN ('messaging_private_v2.require_writable_thread_v1','messaging_private_v2.guard_legacy_conversation_accounts_v1','messaging_private_v2.guard_legacy_participant_accounts_v1','public.message_photo_write_available_v1')), policies AS (SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
 'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
 'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]'::jsonb) value
 FROM pg_policy q WHERE q.polrelid='storage.objects'::regclass AND q.polname IN ('message_legacy_account_insert_v1','message_legacy_account_update_v1')) SELECT jsonb_build_object('functions',(SELECT value FROM funcs),'policies',(SELECT value FROM policies),'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t WHERE t.tgname IN ('guard_account_lifecycle_conversation_v1','guard_account_lifecycle_participant_v1'))) value
)
SELECT jsonb_build_object('managed_marker',(SELECT jsonb_agg(x-ARRAY['acl','effective']) FROM managed_marker,jsonb_array_elements(value) x),'accepted_contact_base',accepted.b,'accepted_contact_target',accepted.t,'photo_structure',(SELECT value FROM photo_structure),'storage_required_policies',(SELECT value FROM storage_policies),'unchanged_photo_functions',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'signature'),'[]'::jsonb) FROM photo_functions,jsonb_array_elements(value) x WHERE split_part(x->>'signature','(',1) NOT IN ('public.reserve_my_message_photo_v2','public.claim_message_photo_upload_v2','public.finish_message_photo_upload_v2'))) b,
jsonb_build_object('photo_functions',(SELECT jsonb_agg(x ORDER BY x->>'signature') FROM photo_functions,jsonb_array_elements(value) x WHERE split_part(x->>'signature','(',1) IN ('public.reserve_my_message_photo_v2','public.claim_message_photo_upload_v2','public.finish_message_photo_upload_v2')),'new_objects',(SELECT value FROM new_objects)) t FROM accepted
),fingerprints AS (SELECT encode(sha256(convert_to(b::text,'UTF8')),'hex') b,encode(sha256(convert_to(t::text,'UTF8')),'hex') t FROM observed),evaluated AS (SELECT *,CASE WHEN b='f82446e2b2b6afbc6faead421786a86cee06a668060f2b2ff0d564b4e2012a1e' AND t='a991e5f0b4645d002a50a6f92a740a0184069c353eda524fdfb4e663ae1f8bf2' THEN 'before' WHEN b='f82446e2b2b6afbc6faead421786a86cee06a668060f2b2ff0d564b4e2012a1e' AND t='b5c7913ee90e02f291ef55f6d75524b33bba161a36947b52fb5289badc5e09bb' THEN 'after' ELSE 'unknown' END state FROM fingerprints)
SELECT jsonb_build_object('format','selqiro-account-message-media-fence-20261124-v1','stage','preflight','state',state,'recognized',state IN('before','after'),'read_only',true,'account_rows_read',false,'account_rows_exported',false,'base_fingerprint',b,'target_fingerprint',t,'fence_verified',state='after') INTO observed FROM evaluated;
 IF observed->>'state' IS DISTINCT FROM 'after' THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='ACCOUNT_MESSAGE_MEDIA_POSTCHECK_FAILED',DETAIL='base='||(observed->>'base_fingerprint')||';target='||(observed->>'target_fingerprint'); END IF;
END $message_media_guard$;
DO $storage_preserve$ DECLARE after_value jsonb; BEGIN
-- Dynamic bounded snapshot of pre-existing Storage metadata. This is retained
-- only inside the single apply transaction, not invented as a previous fact.
SELECT jsonb_build_object(
 'relation',(SELECT jsonb_build_object('owner',pg_get_userbyid(c.relowner),'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
  'acl',coalesce(c.relacl,acldefault('r',c.relowner))::text) FROM pg_class c WHERE c.oid='storage.objects'::regclass),
 'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,
  'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid),'acl',a.attacl::text) ORDER BY a.attnum)
  FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
  WHERE a.attrelid='storage.objects'::regclass AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
  'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(p.polroles) x ORDER BY 1),
  'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]'::jsonb)
  FROM pg_policy p WHERE p.polrelid='storage.objects'::regclass AND p.polname NOT IN('message_legacy_account_insert_v1','message_legacy_account_update_v1')),
 'triggers',(SELECT coalesce(jsonb_agg(pg_get_triggerdef(t.oid) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid='storage.objects'::regclass AND NOT tgisinternal),
 'buckets',(SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'public',public,'limit',file_size_limit,'mimes',allowed_mime_types) ORDER BY id)
  FROM storage.buckets WHERE id IN('messages','message-attachments-v2'))
) INTO after_value;
 IF after_value IS DISTINCT FROM (SELECT value FROM pg_temp.selqiro_message_media_storage_before) THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='ACCOUNT_MESSAGE_MEDIA_STORAGE_PRESERVATION_FAILED'; END IF; END $storage_preserve$;
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Fresh observation after COMMIT is the only apply acknowledgment.
BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY;
SET LOCAL search_path=pg_catalog;
SET LOCAL TimeZone='UTC';
SET LOCAL jit=off;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='2s';
SET LOCAL idle_in_transaction_session_timeout='15s';
-- Fresh execution prerequisite, not a previously observed catalog fact.
-- FOR SHARE requires row visibility, SELECT and at least one UPDATE column.
-- No privileges are changed and no Auth/account data is selected here.
DO $message_media_authority$
BEGIN
 IF current_user <> 'postgres'
 OR NOT coalesce(has_schema_privilege('postgres','auth','USAGE'),false)
 OR NOT coalesce(has_table_privilege('postgres','auth.users','SELECT'),false)
 OR NOT coalesce(has_any_column_privilege('postgres','auth.users','UPDATE'),false)
 OR coalesce(row_security_active('auth.users'::regclass),true)
 OR NOT coalesce(has_schema_privilege('postgres','account_lifecycle_private','USAGE'),false)
 OR NOT coalesce(has_table_privilege('postgres','account_lifecycle_private.account_states','SELECT'),false)
 OR NOT coalesce(has_any_column_privilege('postgres','account_lifecycle_private.account_states','UPDATE'),false)
 OR coalesce(row_security_active('account_lifecycle_private.account_states'::regclass),true) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNT_MESSAGE_MEDIA_AUTHORITY_REQUIRED';
 END IF;
END;
$message_media_authority$;

-- Storage policy authority and bucket configuration are fresh prerequisites.
-- They are not described as previously observed hosted metadata. No object rows
-- are read, and existing legacy bucket privacy/limits are preserved as found.
DO $storage_authority$
DECLARE storage_rls boolean;storage_authority boolean;storage_setting text;
 storage_policy_grants jsonb;storage_grant_tables jsonb;
BEGIN
 IF NOT coalesce(has_schema_privilege('postgres','storage','USAGE'),false)
 OR NOT coalesce(has_table_privilege('postgres','storage.buckets','SELECT'),false)
 OR coalesce(row_security_active('storage.buckets'::regclass),true) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNT_MESSAGE_MEDIA_STORAGE_AUTHORITY_REQUIRED'; END IF;
 SELECT c.relrowsecurity,pg_has_role('postgres',c.relowner,'USAGE') INTO storage_rls,storage_authority FROM pg_class c WHERE c.oid='storage.objects'::regclass;
 -- Supabase may delegate policy management without inheriting the table owner.
 -- A registered SIGHUP-only Supautils setting is distinct from an arbitrary
 -- custom GUC placeholder. Its grant is for this exact current user and table.
 IF storage_authority IS NOT TRUE AND current_user='postgres' THEN
  storage_authority:=false;
  BEGIN
   SELECT s.setting INTO storage_setting FROM pg_catalog.pg_settings s
    WHERE s.name='supautils.policy_grants' AND s.context='sighup' AND s.vartype='string';
   IF FOUND THEN
    storage_policy_grants:=storage_setting::jsonb;
    IF jsonb_typeof(storage_policy_grants)='object' THEN
     IF NOT EXISTS(SELECT 1 FROM jsonb_each(storage_policy_grants) g WHERE jsonb_typeof(g.value)<>'array') THEN
      IF NOT EXISTS(SELECT 1 FROM jsonb_each(storage_policy_grants) g
       CROSS JOIN LATERAL jsonb_array_elements(g.value) t WHERE jsonb_typeof(t.value)<>'string') THEN
       storage_grant_tables:=storage_policy_grants->current_user::text;
       IF jsonb_typeof(storage_grant_tables)='array' THEN
        -- Resolve a table NAME like Supautils, not regclass's numeric-OID input.
        SELECT coalesce(bool_or(pg_catalog.to_regclass((SELECT string_agg(pg_catalog.quote_ident(p.part),'.' ORDER BY p.ordinal)
          FROM unnest(pg_catalog.parse_ident(t.value,true)) WITH ORDINALITY p(part,ordinal)))='storage.objects'::regclass),false)
         INTO storage_authority FROM jsonb_array_elements_text(storage_grant_tables) t(value);
       END IF;
      END IF;
     END IF;
    END IF;
   END IF;
  EXCEPTION WHEN OTHERS THEN
   storage_authority:=false;
  END;
 END IF;

 IF storage_rls IS NOT TRUE OR storage_authority IS NOT TRUE THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNT_MESSAGE_MEDIA_STORAGE_AUTHORITY_REQUIRED'; END IF;
 IF (SELECT count(*) FROM pg_attribute WHERE attrelid='storage.objects'::regclass AND attnum>0 AND NOT attisdropped)>128
 OR (SELECT count(*) FROM pg_policy WHERE polrelid='storage.objects'::regclass)>128
 OR (SELECT count(*) FROM pg_trigger WHERE tgrelid='storage.objects'::regclass AND NOT tgisinternal)>64 THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='ACCOUNT_MESSAGE_MEDIA_STORAGE_CATALOG_LIMIT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='messages')
 OR NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='message-attachments-v2' AND public=false
  AND file_size_limit=2000000 AND allowed_mime_types=ARRAY['image/webp']::text[]) THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='ACCOUNT_MESSAGE_MEDIA_BUCKET_CONFIG_MISMATCH'; END IF;
END;
$storage_authority$;
WITH observed AS MATERIALIZED (
WITH managed_marker AS MATERIALIZED (
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
 WHERE n.nspname||'.'||p.proname IN ('public.listing_contact_is_managed_v1')
),accepted AS MATERIALIZED (
WITH core_observation AS MATERIALIZED (
WITH requested_relations(name) AS (VALUES
('public.conversations'),
('public.messages'),
('public.conversation_participants')
), requested_functions(signature,name,argument_types) AS (VALUES
('listing_contact_private.require_actor_hosted_v1(uuid,uuid)','listing_contact_private.require_actor_hosted_v1',ARRAY['uuid','uuid']::text[]),
('listing_contact_private.require_peer(uuid,uuid)','listing_contact_private.require_peer',ARRAY['uuid','uuid']::text[]),
('listing_contact_private.require_member(bigint,uuid,uuid)','listing_contact_private.require_member',ARRAY['bigint','uuid','uuid']::text[]),
('listing_contact_private.require_unblocked(uuid,uuid)','listing_contact_private.require_unblocked',ARRAY['uuid','uuid']::text[]),
('messaging_private_v2.exact_thread(bigint,uuid,uuid)','messaging_private_v2.exact_thread',ARRAY['bigint','uuid','uuid']::text[]),
('messaging_private_v2.require_thread(bigint,uuid,uuid)','messaging_private_v2.require_thread',ARRAY['bigint','uuid','uuid']::text[]),
('public.contact_my_listing_seller_v1(uuid,uuid,uuid,text)','public.contact_my_listing_seller_v1',ARRAY['uuid','uuid','uuid','text']::text[]),
('public.contact_my_horse_seller_v1(uuid,uuid,uuid,uuid)','public.contact_my_horse_seller_v1',ARRAY['uuid','uuid','uuid','uuid']::text[]),
('public.contact_my_service_provider_v1(uuid,uuid,uuid,uuid)','public.contact_my_service_provider_v1',ARRAY['uuid','uuid','uuid','uuid']::text[]),
('public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text)','public.send_my_listing_message_v1',ARRAY['uuid','uuid','uuid','text','text','text']::text[]),
('public.send_my_message_v2(uuid,uuid,uuid,text,text,text,uuid)','public.send_my_message_v2',ARRAY['uuid','uuid','uuid','text','text','text','uuid']::text[])
), relation_requests AS MATERIALIZED (
 SELECT r.name,n.oid schema_oid,c.oid relation_oid,c.relkind,
 n.oid IS NOT NULL schema_present,
 CASE WHEN n.oid IS NULL THEN false ELSE has_schema_privilege(current_user,n.oid,'USAGE') END schema_usage
 FROM requested_relations r LEFT JOIN pg_namespace n ON n.nspname=split_part(r.name,'.',1)
 LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=split_part(r.name,'.',2)
), scoped_relations AS MATERIALIZED (
 SELECT r.name,c.* FROM relation_requests r JOIN pg_class c ON c.oid=r.relation_oid
 WHERE c.relkind IN ('r','p')
), fixed_functions AS MATERIALIZED (
 SELECT p.oid,r.signature FROM requested_functions r
 JOIN pg_namespace n ON n.nspname=split_part(r.name,'.',1)
 JOIN pg_proc p ON p.pronamespace=n.oid AND p.proname=split_part(r.name,'.',2) AND p.prokind='f'
 WHERE ARRAY(SELECT format_type(t,NULL) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY a(t,k) ORDER BY k)=r.argument_types
), scoped_triggers AS MATERIALIZED (
 SELECT t.* FROM pg_trigger t WHERE t.tgrelid IN (SELECT oid FROM scoped_relations) AND NOT t.tgisinternal AND t.tgname NOT IN ('guard_account_lifecycle_conversation_v1','guard_account_lifecycle_participant_v1')
), function_scope AS MATERIALIZED (
 SELECT oid FROM fixed_functions UNION SELECT tgfoid FROM scoped_triggers
), roles AS MATERIALIZED (
 SELECT oid,rolname,rolsuper,rolbypassrls,rolinherit,rolcanlogin FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','selqiro_listing_contact_writer_v1')
), scoped_schemas AS MATERIALIZED (
 SELECT n.* FROM pg_namespace n WHERE n.oid IN (SELECT schema_oid FROM relation_requests)
 OR n.oid IN (SELECT p.pronamespace FROM pg_proc p JOIN function_scope f ON f.oid=p.oid)
), scoped_policies AS MATERIALIZED (
 SELECT p.*,r.name relation_name FROM pg_policy p JOIN scoped_relations r ON r.oid=p.polrelid
)
, schemas_raw AS MATERIALIZED (SELECT n.nspname sort_key,jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),'observer_usage',has_schema_privilege(current_user,n.oid,'USAGE'),'acl_sha256',encode(sha256(convert_to((coalesce(n.nspacl,acldefault('n',n.nspowner)))::text,'UTF8')),'hex')) facts FROM scoped_schemas n)
, schemas_bounded AS MATERIALIZED (SELECT sort_key,facts FROM schemas_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 12)
, roles_raw AS MATERIALIZED (SELECT rolname sort_key,jsonb_build_object('name',rolname,'superuser',rolsuper,'bypass_rls',rolbypassrls,'inherit',rolinherit,'can_login',rolcanlogin) facts FROM roles)
, roles_bounded AS MATERIALIZED (SELECT sort_key,facts FROM roles_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 4)
, relations_raw AS MATERIALIZED (SELECT r.name sort_key,jsonb_build_object('name',r.name,'kind',r.relkind,'owner',pg_get_userbyid(r.relowner),'rls',r.relrowsecurity,'force_rls',r.relforcerowsecurity,'observer_select',has_table_privilege(current_user,r.oid,'SELECT'),'acl_sha256',encode(sha256(convert_to((coalesce(r.relacl,acldefault('r',r.relowner)))::text,'UTF8')),'hex')) facts FROM scoped_relations r)
, relations_bounded AS MATERIALIZED (SELECT sort_key,facts FROM relations_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 3)
, columns_raw AS MATERIALIZED (SELECT r.name||':'||lpad(a.attnum::text,5,'0') sort_key,jsonb_build_object('relation',r.name,'name',a.attname,'position',a.attnum,'type',format_type(a.atttypid,a.atttypmod),'acl_sha256',CASE WHEN a.attacl IS NULL THEN NULL ELSE encode(sha256(convert_to((a.attacl)::text,'UTF8')),'hex') END) facts FROM scoped_relations r JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped)
, columns_bounded AS MATERIALIZED (SELECT sort_key,facts FROM columns_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 192)
, triggers_raw AS MATERIALIZED (SELECT r.name||':'||t.tgname sort_key,jsonb_build_object('relation',r.name,'name',t.tgname,'enabled',t.tgenabled,'event_mask',t.tgtype,'function',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')','argument_count',t.tgnargs,'arguments_sha256',encode(sha256(t.tgargs),'hex'),'when_tree_sha256',CASE WHEN t.tgqual IS NULL THEN NULL ELSE encode(sha256(convert_to((t.tgqual)::text,'UTF8')),'hex') END,'definition_sha256',encode(sha256(convert_to((pg_get_triggerdef(t.oid))::text,'UTF8')),'hex')) facts FROM scoped_triggers t JOIN scoped_relations r ON r.oid=t.tgrelid JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace n ON n.oid=p.pronamespace)
, triggers_bounded AS MATERIALIZED (SELECT sort_key,facts FROM triggers_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 32)
, policies_raw AS MATERIALIZED (SELECT p.relation_name||':'||p.polname sort_key,jsonb_build_object('relation',p.relation_name,'name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END ORDER BY x) FROM unnest(p.polroles) x),'using_sha256',CASE WHEN pg_get_expr(p.polqual,p.polrelid) IS NULL THEN NULL ELSE encode(sha256(convert_to((pg_get_expr(p.polqual,p.polrelid))::text,'UTF8')),'hex') END,'check_sha256',CASE WHEN pg_get_expr(p.polwithcheck,p.polrelid) IS NULL THEN NULL ELSE encode(sha256(convert_to((pg_get_expr(p.polwithcheck,p.polrelid))::text,'UTF8')),'hex') END) facts FROM scoped_policies p)
, policies_bounded AS MATERIALIZED (SELECT sort_key,facts FROM policies_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 96)
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
 UNION ALL SELECT 'column',r.name||'.'||c.attname,pg_get_userbyid(a.grantor),
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable
 FROM scoped_relations r JOIN pg_attribute c ON c.attrelid=r.oid AND c.attnum>0 AND NOT c.attisdropped
 CROSS JOIN LATERAL aclexplode(c.attacl) a
 UNION ALL SELECT 'function',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',pg_get_userbyid(a.grantor),
 CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable
 FROM function_scope f JOIN pg_proc p ON p.oid=f.oid JOIN pg_namespace n ON n.oid=p.pronamespace
 CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
 ) g)
, grants_bounded AS MATERIALIZED (SELECT sort_key,facts FROM grants_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 1536)
, effective_privileges_raw AS MATERIALIZED (SELECT g.object_kind||g.object_name||g.role sort_key,to_jsonb(g) facts FROM (
 SELECT 'schema'::text object_kind,n.nspname::text object_name,a.rolname role,
 NULL::boolean can_select,NULL::boolean can_insert,NULL::boolean can_update,NULL::boolean can_delete,NULL::boolean can_execute,
 has_schema_privilege(a.oid,n.oid,'USAGE') can_usage FROM scoped_schemas n CROSS JOIN roles a
 UNION ALL SELECT 'relation',r.name,a.rolname,
 has_table_privilege(a.oid,r.oid,'SELECT'),has_table_privilege(a.oid,r.oid,'INSERT'),
 has_table_privilege(a.oid,r.oid,'UPDATE'),has_table_privilege(a.oid,r.oid,'DELETE'),NULL::boolean,NULL::boolean
 FROM scoped_relations r CROSS JOIN roles a
 UNION ALL SELECT 'column',r.name||'.'||c.attname,a.rolname,
 has_column_privilege(a.oid,r.oid,c.attnum,'SELECT'),has_column_privilege(a.oid,r.oid,c.attnum,'INSERT'),
 has_column_privilege(a.oid,r.oid,c.attnum,'UPDATE'),NULL::boolean,NULL::boolean,NULL::boolean
 FROM scoped_relations r JOIN pg_attribute c ON c.attrelid=r.oid AND c.attnum>0 AND NOT c.attisdropped CROSS JOIN roles a
 UNION ALL SELECT 'function',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',a.rolname,NULL::boolean,NULL::boolean,NULL::boolean,NULL::boolean,
 has_function_privilege(a.oid,p.oid,'EXECUTE'),NULL::boolean
 FROM function_scope f JOIN pg_proc p ON p.oid=f.oid JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN roles a
 ) g)
, effective_privileges_bounded AS MATERIALIZED (SELECT sort_key,facts FROM effective_privileges_raw ORDER BY sort_key COLLATE "C",facts::text COLLATE "C" LIMIT 1536)
, measured AS MATERIALIZED (SELECT jsonb_build_object('schemas',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM schemas_bounded),'roles',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM roles_bounded),'relations',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM relations_bounded),'columns',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM columns_bounded),'triggers',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM triggers_bounded),'policies',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM policies_bounded),'policy_dependencies',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM policy_dependencies_bounded),'functions',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM functions_bounded),'grants',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM grants_bounded),'effective_privileges',(SELECT coalesce(jsonb_agg(facts ORDER BY sort_key COLLATE "C",facts::text COLLATE "C"),'[]'::jsonb) FROM effective_privileges_bounded)) catalog,jsonb_build_object('schemas',jsonb_build_object('total',(SELECT count(*) FROM schemas_raw),'returned',(SELECT count(*) FROM schemas_bounded)),'roles',jsonb_build_object('total',(SELECT count(*) FROM roles_raw),'returned',(SELECT count(*) FROM roles_bounded)),'relations',jsonb_build_object('total',(SELECT count(*) FROM relations_raw),'returned',(SELECT count(*) FROM relations_bounded)),'columns',jsonb_build_object('total',(SELECT count(*) FROM columns_raw),'returned',(SELECT count(*) FROM columns_bounded)),'triggers',jsonb_build_object('total',(SELECT count(*) FROM triggers_raw),'returned',(SELECT count(*) FROM triggers_bounded)),'policies',jsonb_build_object('total',(SELECT count(*) FROM policies_raw),'returned',(SELECT count(*) FROM policies_bounded)),'policy_dependencies',jsonb_build_object('total',(SELECT count(*) FROM policy_dependencies_raw),'returned',(SELECT count(*) FROM policy_dependencies_bounded)),'functions',jsonb_build_object('total',(SELECT count(*) FROM functions_raw),'returned',(SELECT count(*) FROM functions_bounded)),'grants',jsonb_build_object('total',(SELECT count(*) FROM grants_raw),'returned',(SELECT count(*) FROM grants_bounded)),'effective_privileges',jsonb_build_object('total',(SELECT count(*) FROM effective_privileges_raw),'returned',(SELECT count(*) FROM effective_privileges_bounded))) counts), gathered AS MATERIALIZED (SELECT
 jsonb_build_object('format','selqiro-account-contact-catalog-20261124-v2','read_only',current_setting('transaction_read_only')='on','user_rows_read',false,
 'observer',jsonb_build_object('role',current_user,'server_version_num',current_setting('server_version_num')::integer,'roles_present',(SELECT coalesce(jsonb_agg(rolname ORDER BY rolname COLLATE "C"),'[]'::jsonb) FROM roles)),
 'relation_requests',(SELECT jsonb_agg(jsonb_build_object('name',name,'present',relation_oid IS NOT NULL,'schema_present',schema_present,'schema_usage',schema_usage,'kind',relkind) ORDER BY name COLLATE "C") FROM relation_requests),
 'function_requests',(SELECT jsonb_agg(jsonb_build_object('signature',r.signature,'required',true,'present',EXISTS(SELECT 1 FROM fixed_functions f WHERE f.signature=r.signature),'overloads',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=r.name AND p.prokind='f')) ORDER BY r.signature COLLATE "C") FROM requested_functions r),
 'catalog',catalog,'counts',counts,'limits',jsonb_build_object('schemas',12,'roles',4,'relations',3,'columns',192,'triggers',32,'policies',96,'policy_dependencies',128,'functions',64,'grants',1536,'effective_privileges',1536),'facts_sha256',encode(sha256(convert_to((catalog)::text,'UTF8')),'hex'),'coverage',jsonb_build_object('state','pending','result_limited',false,'call_graph','fixed_signatures_and_direct_attached_triggers_only','body_review','required_before_implementation','max_result_bytes',786432,'issues',to_jsonb(array_remove(ARRAY[
 CASE WHEN current_user<>'postgres' THEN 'unexpected_observer' END,
 CASE WHEN (SELECT count(*) FROM roles)<>4 THEN 'required_role_missing' END,
 CASE WHEN EXISTS(SELECT 1 FROM relation_requests WHERE relation_oid IS NULL) THEN 'required_relation_missing' END,
 CASE WHEN EXISTS(SELECT 1 FROM relation_requests WHERE relation_oid IS NOT NULL AND relkind NOT IN ('r','p')) THEN 'unsupported_relation_kind' END,
 CASE WHEN EXISTS(SELECT 1 FROM relation_requests WHERE relation_oid IS NOT NULL AND NOT schema_usage) THEN 'schema_usage_missing' END,
 CASE WHEN (SELECT count(*) FROM fixed_functions)<>11 THEN 'required_function_missing' END,
 CASE WHEN EXISTS(SELECT 1 FROM requested_functions r WHERE (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=r.name AND p.prokind='f')>1) THEN 'unexpected_function_overloads' END,
 CASE WHEN (SELECT count(*) FROM schemas_raw)>12 OR (SELECT count(*) FROM roles_raw)>4 OR (SELECT count(*) FROM relations_raw)>3 OR (SELECT count(*) FROM columns_raw)>192 OR (SELECT count(*) FROM triggers_raw)>32 OR (SELECT count(*) FROM policies_raw)>96 OR (SELECT count(*) FROM policy_dependencies_raw)>128 OR (SELECT count(*) FROM functions_raw)>64 OR (SELECT count(*) FROM grants_raw)>1536 OR (SELECT count(*) FROM effective_privileges_raw)>1536 THEN 'catalog_limit' END],NULL)))) payload FROM measured)
, bounded AS MATERIALIZED (SELECT CASE WHEN octet_length(payload::text)>786176 OR payload->'coverage'->'issues' ? 'catalog_limit' THEN
 jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(payload,'{catalog}',jsonb_build_object('schemas','[]'::jsonb,'roles','[]'::jsonb,'relations','[]'::jsonb,'columns','[]'::jsonb,'triggers','[]'::jsonb,'policies','[]'::jsonb,'policy_dependencies','[]'::jsonb,'functions','[]'::jsonb,'grants','[]'::jsonb,'effective_privileges','[]'::jsonb)),'{facts_sha256}',to_jsonb(encode(sha256(convert_to((jsonb_build_object('schemas','[]'::jsonb,'roles','[]'::jsonb,'relations','[]'::jsonb,'columns','[]'::jsonb,'triggers','[]'::jsonb,'policies','[]'::jsonb,'policy_dependencies','[]'::jsonb,'functions','[]'::jsonb,'grants','[]'::jsonb,'effective_privileges','[]'::jsonb))::text,'UTF8')),'hex'))),'{counts}',(SELECT jsonb_object_agg(k,jsonb_set(v,'{returned}','0'::jsonb)) FROM jsonb_each(payload->'counts') AS x(k,v))),'{coverage,result_limited}','true'::jsonb),'{coverage,issues}',payload->'coverage'->'issues'||'"output_limit"'::jsonb)
 ELSE payload END payload FROM gathered)
SELECT jsonb_set(payload,'{coverage,state}',to_jsonb(CASE WHEN jsonb_array_length(payload->'coverage'->'issues')=0 THEN 'complete'::text ELSE 'limited'::text END)) AS result FROM bounded
), account_observation AS MATERIALIZED (
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
),job_observation AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object(
 'signature',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',
 'owner',pg_get_userbyid(p.proowner),'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,
 'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,'result',pg_get_function_result(p.oid),
 'arguments',to_jsonb(p.proargnames),'defaults',pg_get_expr(p.proargdefaults,0),'config',to_jsonb(p.proconfig),
 'body',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'grantor',pg_get_userbyid(a.grantor),'grantable',a.is_grantable,'privilege',a.privilege_type) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a)
 ) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]'::jsonb) value
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE (n.nspname,p.proname) IN (('public','contact_my_job_provider_v1'),('jobs_private','contact_snapshot'))
),helper_observation AS MATERIALIZED (
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
)
SELECT jsonb_build_object('contact_catalog',jsonb_set(result-ARRAY['read_only','facts_sha256'],'{catalog,functions}',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'signature' COLLATE "C"),'[]'::jsonb) FROM jsonb_array_elements(result->'catalog'->'functions') x WHERE x->>'name' NOT IN ('messaging_private_v2.guard_account_block','public.contact_my_horse_seller_v1','public.contact_my_listing_seller_v1','public.contact_my_service_provider_v1','public.send_my_listing_message_v1','public.send_my_message_v2'))),'account',(SELECT value FROM account_observation),'job_snapshot',(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM job_observation,jsonb_array_elements(value) x WHERE x->>'signature' LIKE 'jobs_private.%')) b,
jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'signature' COLLATE "C"),'[]'::jsonb) FROM jsonb_array_elements(result->'catalog'->'functions') x WHERE x->>'name' IN ('messaging_private_v2.guard_account_block','public.contact_my_horse_seller_v1','public.contact_my_listing_seller_v1','public.contact_my_service_provider_v1','public.send_my_listing_message_v1','public.send_my_message_v2')),'job_contact',(SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM job_observation,jsonb_array_elements(value) x WHERE x->>'signature' LIKE 'public.%'),'new_helper',(SELECT value FROM helper_observation)) t FROM core_observation
),photo_functions AS MATERIALIZED (
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
 WHERE n.nspname||'.'||p.proname IN ('messaging_private_v2.bucket_ready','messaging_private_v2.photo_receipt','public.reserve_my_message_photo_v2','public.claim_message_photo_upload_v2','public.finish_message_photo_upload_v2','public.cancel_my_message_photo_v2','public.get_my_message_photo_binding_v2','public.claim_message_photo_cleanup_v2','public.finish_message_photo_cleanup_v2')
),photo_structure AS MATERIALIZED (
SELECT jsonb_build_object(
 'schema',(SELECT jsonb_build_object('owner',pg_get_userbyid(n.nspowner),'acl',
   (SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,
    'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
    FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a)) FROM pg_namespace n WHERE n.nspname='messaging_private_v2'),
 'tables',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
   'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
   'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,
     'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum)
    FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
   'constraints',(SELECT jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'validated',q.convalidated,
    'definition',pg_get_constraintdef(q.oid)) ORDER BY q.conname) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
   'indexes',(SELECT jsonb_agg(pg_get_indexdef(i.indexrelid) ORDER BY x.relname) FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid WHERE i.indrelid=c.oid),
   'policies',(SELECT jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
    'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'public' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
    'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname) FROM pg_policy q WHERE q.polrelid=c.oid),
   'acl',(SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,
    'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
    FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a)
  ) ORDER BY c.relname),'[]'::jsonb) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='messaging_private_v2' AND c.relkind IN('r','p','v','m','f')),
 'public_indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'owner',pg_get_userbyid(c.relowner),'definition',pg_get_indexdef(c.oid)) ORDER BY c.relname),'[]'::jsonb)
   FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relname IN('messaging_thread_activity_v2','messaging_thread_message_v2')),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb)
  FROM pg_trigger t WHERE t.tgrelid='public.messages'::regclass AND t.tgname IN('protect_attached_message_photo_v2','messaging_account_block_v2')),
 'storage_policy',(SELECT jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
    'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'public' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
    'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname)
    FROM pg_policy q WHERE q.polrelid='storage.objects'::regclass AND q.polname='message_attachments_v2_server_only')
) value
),storage_policies AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
 'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
 'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]'::jsonb) value
 FROM pg_policy q WHERE q.polrelid='storage.objects'::regclass AND q.polname IN ('Participants can upload message images','Participants can view message images','message_attachments_v2_server_only')
), new_objects AS MATERIALIZED (
WITH funcs AS (SELECT coalesce(jsonb_agg(jsonb_build_object(
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
 WHERE n.nspname||'.'||p.proname IN ('messaging_private_v2.require_writable_thread_v1','messaging_private_v2.guard_legacy_conversation_accounts_v1','messaging_private_v2.guard_legacy_participant_accounts_v1','public.message_photo_write_available_v1')), policies AS (SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
 'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
 'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]'::jsonb) value
 FROM pg_policy q WHERE q.polrelid='storage.objects'::regclass AND q.polname IN ('message_legacy_account_insert_v1','message_legacy_account_update_v1')) SELECT jsonb_build_object('functions',(SELECT value FROM funcs),'policies',(SELECT value FROM policies),'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t WHERE t.tgname IN ('guard_account_lifecycle_conversation_v1','guard_account_lifecycle_participant_v1'))) value
)
SELECT jsonb_build_object('managed_marker',(SELECT jsonb_agg(x-ARRAY['acl','effective']) FROM managed_marker,jsonb_array_elements(value) x),'accepted_contact_base',accepted.b,'accepted_contact_target',accepted.t,'photo_structure',(SELECT value FROM photo_structure),'storage_required_policies',(SELECT value FROM storage_policies),'unchanged_photo_functions',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'signature'),'[]'::jsonb) FROM photo_functions,jsonb_array_elements(value) x WHERE split_part(x->>'signature','(',1) NOT IN ('public.reserve_my_message_photo_v2','public.claim_message_photo_upload_v2','public.finish_message_photo_upload_v2'))) b,
jsonb_build_object('photo_functions',(SELECT jsonb_agg(x ORDER BY x->>'signature') FROM photo_functions,jsonb_array_elements(value) x WHERE split_part(x->>'signature','(',1) IN ('public.reserve_my_message_photo_v2','public.claim_message_photo_upload_v2','public.finish_message_photo_upload_v2')),'new_objects',(SELECT value FROM new_objects)) t FROM accepted
),fingerprints AS (SELECT encode(sha256(convert_to(b::text,'UTF8')),'hex') b,encode(sha256(convert_to(t::text,'UTF8')),'hex') t FROM observed),evaluated AS (SELECT *,CASE WHEN b='f82446e2b2b6afbc6faead421786a86cee06a668060f2b2ff0d564b4e2012a1e' AND t='a991e5f0b4645d002a50a6f92a740a0184069c353eda524fdfb4e663ae1f8bf2' THEN 'before' WHEN b='f82446e2b2b6afbc6faead421786a86cee06a668060f2b2ff0d564b4e2012a1e' AND t='b5c7913ee90e02f291ef55f6d75524b33bba161a36947b52fb5289badc5e09bb' THEN 'after' ELSE 'unknown' END state FROM fingerprints)
SELECT jsonb_build_object('format','selqiro-account-message-media-fence-20261124-v1','stage','apply','state',state,'recognized',state IN('before','after'),'read_only',false,'account_rows_read',false,'account_rows_exported',false,'base_fingerprint',b,'target_fingerprint',t,'fence_verified',state='after') AS result FROM evaluated;
ROLLBACK;
