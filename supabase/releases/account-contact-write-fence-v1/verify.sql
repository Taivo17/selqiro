-- Independent fresh metadata verification; no user records returned.
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
DO $contact_authority$
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
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNT_CONTACT_WRITE_AUTHORITY_REQUIRED';
 END IF;
END;
$contact_authority$;
WITH observed AS MATERIALIZED (
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
 SELECT t.* FROM pg_trigger t WHERE t.tgrelid IN (SELECT oid FROM scoped_relations) AND NOT t.tgisinternal
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
), fingerprints AS (SELECT encode(sha256(convert_to(b::text,'UTF8')),'hex') b,encode(sha256(convert_to(t::text,'UTF8')),'hex') t FROM observed),evaluated AS (SELECT *,CASE WHEN b='fb4fd27d31d456f2ea5c6dcb4c3b4bd6d71be0a5910dfc0dbe4d09d18bd28d00' AND t='002a7544e7c060d70562c3ceca2ac94ef4f6cdc0a57c98526f6fa75d6a7a0487' THEN 'before' WHEN b='fb4fd27d31d456f2ea5c6dcb4c3b4bd6d71be0a5910dfc0dbe4d09d18bd28d00' AND t='96e50aaaeb1afed0c66b5f8bfe8e3fb2ff5b89a8e942152e59a706e49237fb3c' THEN 'after' ELSE 'unknown' END state FROM fingerprints)
SELECT jsonb_build_object('format','selqiro-account-contact-write-fence-20261124-v1','stage','verify','state',state,'recognized',state IN ('before','after'),'read_only',true,'account_rows_read',false,'account_rows_exported',false,'base_fingerprint',b,'target_fingerprint',t,'fence_verified',state='after') AS result FROM evaluated;
ROLLBACK;
