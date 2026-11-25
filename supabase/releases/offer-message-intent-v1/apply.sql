-- One guarded DDL transaction; no existing content rows are rewritten.
BEGIN ISOLATION LEVEL READ COMMITTED READ WRITE;
SET LOCAL search_path=pg_catalog;
SET LOCAL TimeZone='UTC';
SET LOCAL jit=off;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='2s';
SET LOCAL idle_in_transaction_session_timeout='15s';
-- Fresh authority/size prerequisites. No account, message or offer rows read.
DO $offer_intent_authority$
DECLARE rel regclass;
BEGIN
 IF current_user<>'postgres' OR NOT has_schema_privilege('postgres','public','CREATE')
 OR NOT pg_has_role('postgres','selqiro_listing_contact_writer_v1','USAGE')
 OR NOT has_schema_privilege('postgres','auth','USAGE')
 OR NOT has_table_privilege('postgres','auth.users','SELECT')
 OR NOT has_any_column_privilege('postgres','auth.users','UPDATE')
 OR row_security_active('auth.users'::regclass)
 OR NOT has_table_privilege('postgres','account_lifecycle_private.account_states','SELECT')
 OR NOT has_any_column_privilege('postgres','account_lifecycle_private.account_states','UPDATE')
 OR row_security_active('account_lifecycle_private.account_states'::regclass) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='OFFER_MESSAGE_INTENT_AUTHORITY_REQUIRED'; END IF;
 FOREACH rel IN ARRAY ARRAY['horse_publication_private.message_cards'::regclass,'service_publication_private.message_cards'::regclass,'jobs_private.message_cards'::regclass] LOOP
  IF (SELECT count(*) FROM pg_attribute WHERE attrelid=rel AND attnum>0 AND NOT attisdropped)>16
  OR (SELECT count(*) FROM pg_constraint WHERE conrelid=rel)>16
  OR (SELECT count(*) FROM pg_index WHERE indrelid=rel)>8
  OR (SELECT count(*) FROM pg_policy WHERE polrelid=rel)>8
  OR (SELECT count(*) FROM pg_trigger WHERE tgrelid=rel AND NOT tgisinternal)>8 THEN
   RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='OFFER_MESSAGE_INTENT_CATALOG_LIMIT'; END IF;
 END LOOP;
END $offer_intent_authority$;
DO $offer_intent_lock$ BEGIN PERFORM pg_advisory_xact_lock(20261124,58216); END $offer_intent_lock$;
DO $offer_intent_guard$ DECLARE observed jsonb; BEGIN
WITH observed AS MATERIALIZED (
WITH accepted AS MATERIALIZED (
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
),dependencies AS MATERIALIZED (
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
 WHERE n.nspname||'.'||p.proname IN ('public.get_my_marketplace_message_thread_v1','public.get_my_marketplace_message_thread_v2','horse_publication_private.contact_snapshot','service_publication_private.contact_snapshot','jobs_private.contact_snapshot')
),targets AS MATERIALIZED (
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
 WHERE n.nspname||'.'||p.proname IN ('horse_publication_private.capture_message_card','service_publication_private.capture_message_card','jobs_private.capture_message_card','messaging_private_v2.validate_offer_intent_v1','messaging_private_v2.offer_snapshot_v1','messaging_private_v2.last_shared_offer_v1','public.get_my_offer_message_thread_v1','public.send_my_offer_message_v1')
),cards AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
 'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'validated',q.convalidated,'definition',pg_get_constraintdef(q.oid)) ORDER BY q.conname) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'indexes',(SELECT jsonb_agg(jsonb_build_object('definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive) ORDER BY x.relname) FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid WHERE i.indrelid=c.oid AND x.relname NOT IN ('offer_message_listing_header_v1','offer_message_horse_header_v1','offer_message_service_header_v1','offer_message_job_header_v1')),
 'policies',(SELECT jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname) FROM pg_policy q WHERE q.polrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type) FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a)
 ) ORDER BY n.nspname),'[]'::jsonb) value FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relname='message_cards' AND n.nspname IN ('horse_publication_private','service_publication_private','jobs_private')
),indexes AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'definition',CASE WHEN c.relkind='i' THEN pg_get_indexdef(c.oid) END,'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive) ORDER BY n.nspname,c.relname),'[]'::jsonb) value FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_index i ON i.indexrelid=c.oid WHERE c.relname IN ('offer_message_listing_header_v1','offer_message_horse_header_v1','offer_message_service_header_v1','offer_message_job_header_v1')
),columns AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object('relation',n.nspname||'.'||c.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull) ORDER BY n.nspname,c.relname,a.attname),'[]'::jsonb) value FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE a.attnum>0 AND NOT a.attisdropped AND ((n.nspname='public' AND c.relname='jobs' AND a.attname='active_until') OR (n.nspname='service_publication_private' AND c.relname='activity' AND a.attname IN ('service_id','active_until')))
)
SELECT jsonb_build_object('accepted_base',jsonb_set(a.b,'{accepted_contact_base,contact_catalog,catalog,functions}',(SELECT jsonb_agg(CASE WHEN f->>'name' IN ('horse_publication_private.capture_message_card','service_publication_private.capture_message_card','jobs_private.capture_message_card') THEN f-ARRAY['body_bytes','body_sha256','definition_sha256'] ELSE f END ORDER BY f->>'signature' COLLATE "C") FROM jsonb_array_elements(a.b#>'{accepted_contact_base,contact_catalog,catalog,functions}') f)),'accepted_target',a.t,'dependencies',(SELECT value FROM dependencies),'card_tables',(SELECT value FROM cards),'dependency_columns',(SELECT value FROM columns)) b,
jsonb_build_object('functions',(SELECT value FROM targets),'indexes',(SELECT value FROM indexes)) t FROM accepted a
),fingerprints AS (SELECT encode(sha256(convert_to(b::text,'UTF8')),'hex') b,encode(sha256(convert_to(t::text,'UTF8')),'hex') t FROM observed),evaluated AS (SELECT *,CASE WHEN b='4d0ca607396f916dbfe6ac92f354d552f395e6bb40ec56104dc0273076b74863' AND t='34801e60a6a85f5b959d0910adbb9561ccb9e9fb300be6128359f25c100ff75c' THEN 'before' WHEN b='4d0ca607396f916dbfe6ac92f354d552f395e6bb40ec56104dc0273076b74863' AND t='f5979d5e54267630239eb40d1ca61080a0a62f8f9bfc24e7333c72682e8e7a94' THEN 'after' ELSE 'unknown' END state FROM fingerprints)
SELECT jsonb_build_object('format','selqiro-offer-message-intent-20261124-v1','stage','preflight','state',state,'recognized',state IN('before','after'),'read_only',true,'account_rows_read',false,'account_rows_exported',false,'base_fingerprint',b,'target_fingerprint',t,'fence_verified',state='after') INTO observed FROM evaluated;
 IF observed->>'state' IS DISTINCT FROM 'before' THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='OFFER_MESSAGE_INTENT_SCHEMA_MISMATCH',DETAIL='base='||(observed->>'base_fingerprint')||';target='||(observed->>'target_fingerprint'); END IF;
END $offer_intent_guard$;
-- Typed intent is request data. Thread pointers never choose a message attachment.
CREATE FUNCTION messaging_private_v2.validate_offer_intent_v1(p_type text,p_id text)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF p_type IS NULL AND p_id IS NULL THEN RETURN; END IF;
 IF p_type IS NULL OR p_id IS NULL OR p_type NOT IN ('listing','horse_offer','service','job') THEN
  RAISE EXCEPTION 'message_offer_input' USING ERRCODE='22023'; END IF;
 IF p_type='listing' THEN
  PERFORM listing_contact_private.positive_id(p_id);
 ELSIF p_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 OR p_id='00000000-0000-0000-0000-000000000000' THEN
  RAISE EXCEPTION 'message_offer_input' USING ERRCODE='22023';
 END IF;
END $f$;

-- Private, narrow resolver. Existing canonical publication checks and row locks
-- decide availability. The offer must belong to an exact participant tuple.
CREATE FUNCTION messaging_private_v2.offer_snapshot_v1(p_conversation bigint,p_type text,p_id text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c public.conversations%ROWTYPE;l public.listings%ROWTYPE;s jsonb;card jsonb;
 owner_user uuid;owner_identity uuid;expires timestamptz;
BEGIN
 PERFORM messaging_private_v2.validate_offer_intent_v1(p_type,p_id);
 IF p_type IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO c FROM public.conversations WHERE id=p_conversation;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 CASE p_type
 WHEN 'listing' THEN
  SELECT * INTO l FROM public.listings WHERE id=p_id::bigint FOR SHARE;
  IF NOT FOUND OR l.status<>'active' OR l.active_until IS NULL OR l.active_until<=clock_timestamp()
   OR (public.listing_contact_is_managed_v1(p_conversation,l.id) AND NOT EXISTS(
    SELECT 1 FROM listing_publication_private.publications p WHERE p.listing_id=l.id AND p.state='published')) THEN
   RAISE EXCEPTION 'message_offer_unavailable' USING ERRCODE='42501'; END IF;
  s:=jsonb_build_object('user_id',l.user_id,'identity_id',l.identity_id,
   'card',jsonb_build_object('id',l.id::text,'title',l.title,'image',l.image,'price',l.price));
 WHEN 'horse_offer' THEN s:=horse_publication_private.contact_snapshot(p_id::uuid);
 WHEN 'service' THEN
  s:=service_publication_private.contact_snapshot(p_id::uuid);
  SELECT active_until INTO expires FROM service_publication_private.activity WHERE service_id=p_id::uuid FOR SHARE;
  IF NOT FOUND OR expires IS NULL OR expires<=clock_timestamp() THEN RAISE EXCEPTION 'message_offer_unavailable' USING ERRCODE='42501'; END IF;
 WHEN 'job' THEN
  s:=jobs_private.contact_snapshot(p_id::uuid);
  SELECT active_until INTO expires FROM public.jobs WHERE id=p_id::uuid;
  IF expires IS NULL OR expires<=clock_timestamp() THEN RAISE EXCEPTION 'message_offer_unavailable' USING ERRCODE='42501'; END IF;
 END CASE;
 owner_user:=(s->>'user_id')::uuid;owner_identity:=(s->>'identity_id')::uuid;
 IF owner_user IS NULL OR owner_identity IS NULL OR NOT (
  (owner_user=c.buyer_id AND owner_identity=c.buyer_identity_id)
  OR (owner_user=c.seller_id AND owner_identity=c.seller_identity_id)) THEN
  RAISE EXCEPTION 'message_offer_unavailable' USING ERRCODE='42501'; END IF;
 IF p_type='horse_offer' AND ((s->>'active_until') IS NULL OR (s->>'active_until')::timestamptz<=clock_timestamp()) THEN
  RAISE EXCEPTION 'message_offer_unavailable' USING ERRCODE='42501'; END IF;
 card:=s->'card';
 -- Match the bounded existing message-card contract while freezing sent values.
 card:=jsonb_build_object('id',p_id,'title',left(card->>'title',200),
  'image',CASE WHEN length(card->>'image')<=2048 THEN card->>'image' ELSE NULL END,
  'price',left(card->>'price',200)) || CASE WHEN p_type='listing' THEN '{}'::jsonb ELSE jsonb_build_object('content_type',p_type) END;
 RETURN card;
END $f$;

-- Four indexed one-row candidates keep the header bounded even with long history.
CREATE FUNCTION messaging_private_v2.last_shared_offer_v1(p_conversation bigint)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog,pg_temp AS $f$
 SELECT card FROM (
  (SELECT m.id AS message_id,0 AS kind,jsonb_build_object('id',m.listing_id::text,'title',left(m.listing_title,200)) AS card
   FROM public.messages m WHERE m.conversation_id=p_conversation AND m.listing_id IS NOT NULL ORDER BY m.id DESC LIMIT 1)
  UNION ALL
  (SELECT h.message_id,1,jsonb_build_object('id',h.horse_offer_id,'title',left(h.card->>'title',200),'content_type','horse_offer')
   FROM horse_publication_private.message_cards h WHERE h.conversation_id=p_conversation ORDER BY h.message_id DESC LIMIT 1)
  UNION ALL
  (SELECT s.message_id,2,jsonb_build_object('id',s.service_id,'title',left(s.card->>'title',200),'content_type','service')
   FROM service_publication_private.message_cards s WHERE s.conversation_id=p_conversation ORDER BY s.message_id DESC LIMIT 1)
  UNION ALL
  (SELECT j.message_id,3,jsonb_build_object('id',j.job_id,'title',left(j.card->>'title',200),'content_type','job')
   FROM jobs_private.message_cards j WHERE j.conversation_id=p_conversation ORDER BY j.message_id DESC LIMIT 1)
 ) candidates ORDER BY message_id DESC,kind LIMIT 1;
$f$;

CREATE INDEX offer_message_listing_header_v1 ON public.messages(conversation_id,id DESC) WHERE listing_id IS NOT NULL;
CREATE INDEX offer_message_horse_header_v1 ON horse_publication_private.message_cards(conversation_id,message_id DESC);
CREATE INDEX offer_message_service_header_v1 ON service_publication_private.message_cards(conversation_id,message_id DESC);
CREATE INDEX offer_message_job_header_v1 ON jobs_private.message_cards(conversation_id,message_id DESC);

REVOKE ALL ON FUNCTION messaging_private_v2.validate_offer_intent_v1(text,text),
 messaging_private_v2.offer_snapshot_v1(bigint,text,text),messaging_private_v2.last_shared_offer_v1(bigint)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION messaging_private_v2.validate_offer_intent_v1(text,text),
 messaging_private_v2.offer_snapshot_v1(bigint,text,text),messaging_private_v2.last_shared_offer_v1(bigint)
 TO selqiro_listing_contact_writer_v1;

-- Existing trigger identities, owners, grants and rows are retained. New typed
-- sends insert their validated snapshot explicitly in the same transaction.
CREATE OR REPLACE FUNCTION horse_publication_private.capture_message_card()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 RETURN NEW;
END $f$;

CREATE OR REPLACE FUNCTION service_publication_private.capture_message_card()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 RETURN NEW;
END $f$;

CREATE OR REPLACE FUNCTION jobs_private.capture_message_card()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
BEGIN
 RETURN NEW;
END $f$;

CREATE FUNCTION public.get_my_offer_message_thread_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_conversation_id text,p_before_message_id text DEFAULT NULL,p_attachment_offer_type text DEFAULT NULL,p_attachment_offer_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE r jsonb;cid bigint;attachment jsonb;header jsonb;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM messaging_private_v2.validate_offer_intent_v1(p_attachment_offer_type,p_attachment_offer_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);
 PERFORM messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 -- Resolve an explicit preview before the base reader locks the conversation,
 -- following the same offer -> conversation order as a send. Missing/unavailable
 -- previews are removable; they never replace a historical shared header.
 IF p_attachment_offer_type IS NOT NULL THEN
  BEGIN
   attachment:=messaging_private_v2.offer_snapshot_v1(cid,p_attachment_offer_type,p_attachment_offer_id);
  EXCEPTION WHEN insufficient_privilege THEN attachment:=NULL;
  END;
 END IF;
 r:=public.get_my_marketplace_message_thread_v2(p_expected_user_id,p_expected_identity_id,p_conversation_id,p_before_message_id,NULL);
 header:=messaging_private_v2.last_shared_offer_v1(cid);
 RETURN (r-ARRAY['attachment_listing_id','attachment_listing']) || jsonb_build_object(
  'schema_version',3,'listing',header,'attachment_offer_type',p_attachment_offer_type,
  'attachment_offer_id',p_attachment_offer_id,'attachment_offer',attachment);
END $f$;
REVOKE ALL ON FUNCTION public.get_my_offer_message_thread_v1(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_offer_message_thread_v1(uuid,uuid,text,text,text,text) TO authenticated;

CREATE FUNCTION public.send_my_offer_message_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_conversation_id text,p_message text,p_offer_type text DEFAULT NULL,p_offer_id text DEFAULT NULL,p_attachment_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;lid bigint;c public.conversations%ROWTYPE;old messaging_private_v2.send_receipts%ROWTYPE;
 card jsonb;ph messaging_private_v2.photos%ROWTYPE;digest bytea;mid bigint;peer_u uuid;peer_i uuid;t timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key);cid:=listing_contact_private.positive_id(p_conversation_id);
 PERFORM messaging_private_v2.validate_offer_intent_v1(p_offer_type,p_offer_id);
 IF p_offer_type='listing' THEN lid:=listing_contact_private.positive_id(p_offer_id); END IF;
 IF p_message IS NULL OR char_length(p_message)>5000 OR octet_length(p_message)>20000
 OR (btrim(p_message,E' \t\r\n')='' AND p_attachment_id IS NULL) THEN RAISE EXCEPTION 'message_input' USING ERRCODE='22023'; END IF;
 c:=messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 digest:=sha256(convert_to(jsonb_build_object('protocol','offer-message-intent-v1','conversation_id',cid::text,'offer_type',p_offer_type,'offer_id',p_offer_id,'message',p_message,'attachment_id',p_attachment_id)::text,'UTF8'));
 SELECT * INTO old FROM messaging_private_v2.send_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id IS DISTINCT FROM p_expected_identity_id OR old.conversation_id<>cid OR old.intent_sha256<>digest THEN
   RAISE EXCEPTION 'message_request_conflict' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
   'conversation_id',cid::text,'action','send','message_id',old.message_id::text,'request_key',p_request_key,'replayed',true);
 END IF;
 IF c.buyer_id=p_expected_user_id THEN peer_u:=c.seller_id;peer_i:=c.seller_identity_id; ELSE peer_u:=c.buyer_id;peer_i:=c.buyer_identity_id; END IF;
 PERFORM listing_contact_private.require_peer(peer_u,peer_i);
 PERFORM listing_contact_private.require_available_accounts_v1(p_expected_user_id,peer_u);
 PERFORM listing_contact_private.require_unblocked(p_expected_user_id,peer_u);
 -- Offer -> conversation -> attachment preserves the existing mutation lock order.
 IF p_offer_type IS NOT NULL THEN card:=messaging_private_v2.offer_snapshot_v1(cid,p_offer_type,p_offer_id); END IF;
 PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.conversation_participants WHERE conversation_id=cid FOR SHARE;
 IF NOT messaging_private_v2.exact_thread(cid,p_expected_user_id,p_expected_identity_id) THEN RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 -- A retry waiting on the thread must acknowledge the same durable receipt.
 SELECT * INTO old FROM messaging_private_v2.send_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id IS DISTINCT FROM p_expected_identity_id OR old.conversation_id<>cid OR old.intent_sha256<>digest THEN
   RAISE EXCEPTION 'message_request_conflict' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
   'conversation_id',cid::text,'action','send','message_id',old.message_id::text,'request_key',p_request_key,'replayed',true);
 END IF;
 -- Recheck time-based availability after a possible conversation-lock wait.
 IF p_offer_type IS NOT NULL THEN PERFORM messaging_private_v2.offer_snapshot_v1(cid,p_offer_type,p_offer_id); END IF;
 mid:=nextval('public.messages_id_seq');t:=clock_timestamp();
 IF p_attachment_id IS NOT NULL THEN
  SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
  IF NOT FOUND OR ph.actor_user_id<>p_expected_user_id OR ph.identity_id<>p_expected_identity_id OR ph.conversation_id<>cid
   OR ph.state<>'ready' OR ph.expires_at<=t OR NOT messaging_private_v2.bucket_ready() THEN
   RAISE EXCEPTION 'message_photo_unavailable' USING ERRCODE='42501'; END IF;
  -- The deferred FK and insert trigger bind this exact message ID atomically.
  UPDATE messaging_private_v2.photos SET state='attached',message_id=mid WHERE attachment_id=p_attachment_id;
 END IF;
 INSERT INTO messaging_private_v2.send_receipts(actor_user_id,identity_id,request_key,conversation_id,message_id,intent_sha256)
 VALUES(p_expected_user_id,p_expected_identity_id,p_request_key,cid,mid,digest);
 INSERT INTO public.messages(id,conversation_id,sender_id,sender_identity_id,message,created_at,listing_id,listing_title,listing_image,listing_price,image_path)
 OVERRIDING SYSTEM VALUE VALUES(mid,cid,p_expected_user_id,p_expected_identity_id,p_message,t,lid,CASE WHEN lid IS NOT NULL THEN card->>'title' END,
  CASE WHEN lid IS NOT NULL THEN card->>'image' END,CASE WHEN lid IS NOT NULL THEN card->>'price' END,
  CASE WHEN p_attachment_id IS NULL THEN NULL ELSE cid::text||'/'||p_attachment_id::text||'.webp' END);
 -- Exactly one typed immutable snapshot belongs to this accepted send intent.
 CASE p_offer_type
 WHEN 'horse_offer' THEN INSERT INTO horse_publication_private.message_cards(message_id,conversation_id,horse_offer_id,card) VALUES(mid,cid,p_offer_id::uuid,card);
 WHEN 'service' THEN INSERT INTO service_publication_private.message_cards(message_id,conversation_id,service_id,card) VALUES(mid,cid,p_offer_id::uuid,card);
 WHEN 'job' THEN INSERT INTO jobs_private.message_cards(message_id,conversation_id,job_id,card) VALUES(mid,cid,p_offer_id::uuid,card);
 ELSE NULL;
 END CASE;
 UPDATE public.conversations SET updated_at=t,archived_at=NULL WHERE id=cid;
 UPDATE public.conversation_participants SET deleted_at=NULL WHERE conversation_id=cid;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'conversation_id',cid::text,'action','send','message_id',mid::text,'request_key',p_request_key,'replayed',false);
END $f$;
GRANT CREATE ON SCHEMA public TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.send_my_offer_message_v1(uuid,uuid,uuid,text,text,text,text,uuid) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_contact_writer_v1;
REVOKE ALL ON FUNCTION public.send_my_offer_message_v1(uuid,uuid,uuid,text,text,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.send_my_offer_message_v1(uuid,uuid,uuid,text,text,text,text,uuid) TO authenticated;

DO $offer_intent_guard$ DECLARE observed jsonb; BEGIN
WITH observed AS MATERIALIZED (
WITH accepted AS MATERIALIZED (
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
),dependencies AS MATERIALIZED (
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
 WHERE n.nspname||'.'||p.proname IN ('public.get_my_marketplace_message_thread_v1','public.get_my_marketplace_message_thread_v2','horse_publication_private.contact_snapshot','service_publication_private.contact_snapshot','jobs_private.contact_snapshot')
),targets AS MATERIALIZED (
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
 WHERE n.nspname||'.'||p.proname IN ('horse_publication_private.capture_message_card','service_publication_private.capture_message_card','jobs_private.capture_message_card','messaging_private_v2.validate_offer_intent_v1','messaging_private_v2.offer_snapshot_v1','messaging_private_v2.last_shared_offer_v1','public.get_my_offer_message_thread_v1','public.send_my_offer_message_v1')
),cards AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
 'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'validated',q.convalidated,'definition',pg_get_constraintdef(q.oid)) ORDER BY q.conname) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'indexes',(SELECT jsonb_agg(jsonb_build_object('definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive) ORDER BY x.relname) FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid WHERE i.indrelid=c.oid AND x.relname NOT IN ('offer_message_listing_header_v1','offer_message_horse_header_v1','offer_message_service_header_v1','offer_message_job_header_v1')),
 'policies',(SELECT jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname) FROM pg_policy q WHERE q.polrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type) FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a)
 ) ORDER BY n.nspname),'[]'::jsonb) value FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relname='message_cards' AND n.nspname IN ('horse_publication_private','service_publication_private','jobs_private')
),indexes AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'definition',CASE WHEN c.relkind='i' THEN pg_get_indexdef(c.oid) END,'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive) ORDER BY n.nspname,c.relname),'[]'::jsonb) value FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_index i ON i.indexrelid=c.oid WHERE c.relname IN ('offer_message_listing_header_v1','offer_message_horse_header_v1','offer_message_service_header_v1','offer_message_job_header_v1')
),columns AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object('relation',n.nspname||'.'||c.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull) ORDER BY n.nspname,c.relname,a.attname),'[]'::jsonb) value FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE a.attnum>0 AND NOT a.attisdropped AND ((n.nspname='public' AND c.relname='jobs' AND a.attname='active_until') OR (n.nspname='service_publication_private' AND c.relname='activity' AND a.attname IN ('service_id','active_until')))
)
SELECT jsonb_build_object('accepted_base',jsonb_set(a.b,'{accepted_contact_base,contact_catalog,catalog,functions}',(SELECT jsonb_agg(CASE WHEN f->>'name' IN ('horse_publication_private.capture_message_card','service_publication_private.capture_message_card','jobs_private.capture_message_card') THEN f-ARRAY['body_bytes','body_sha256','definition_sha256'] ELSE f END ORDER BY f->>'signature' COLLATE "C") FROM jsonb_array_elements(a.b#>'{accepted_contact_base,contact_catalog,catalog,functions}') f)),'accepted_target',a.t,'dependencies',(SELECT value FROM dependencies),'card_tables',(SELECT value FROM cards),'dependency_columns',(SELECT value FROM columns)) b,
jsonb_build_object('functions',(SELECT value FROM targets),'indexes',(SELECT value FROM indexes)) t FROM accepted a
),fingerprints AS (SELECT encode(sha256(convert_to(b::text,'UTF8')),'hex') b,encode(sha256(convert_to(t::text,'UTF8')),'hex') t FROM observed),evaluated AS (SELECT *,CASE WHEN b='4d0ca607396f916dbfe6ac92f354d552f395e6bb40ec56104dc0273076b74863' AND t='34801e60a6a85f5b959d0910adbb9561ccb9e9fb300be6128359f25c100ff75c' THEN 'before' WHEN b='4d0ca607396f916dbfe6ac92f354d552f395e6bb40ec56104dc0273076b74863' AND t='f5979d5e54267630239eb40d1ca61080a0a62f8f9bfc24e7333c72682e8e7a94' THEN 'after' ELSE 'unknown' END state FROM fingerprints)
SELECT jsonb_build_object('format','selqiro-offer-message-intent-20261124-v1','stage','preflight','state',state,'recognized',state IN('before','after'),'read_only',true,'account_rows_read',false,'account_rows_exported',false,'base_fingerprint',b,'target_fingerprint',t,'fence_verified',state='after') INTO observed FROM evaluated;
 IF observed->>'state' IS DISTINCT FROM 'after' THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='OFFER_MESSAGE_INTENT_POSTCHECK_FAILED',DETAIL='base='||(observed->>'base_fingerprint')||';target='||(observed->>'target_fingerprint'); END IF;
END $offer_intent_guard$;
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Only a fresh observation after COMMIT acknowledges apply.
BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY;
SET LOCAL search_path=pg_catalog;
SET LOCAL TimeZone='UTC';
SET LOCAL jit=off;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='2s';
SET LOCAL idle_in_transaction_session_timeout='15s';
-- Fresh authority/size prerequisites. No account, message or offer rows read.
DO $offer_intent_authority$
DECLARE rel regclass;
BEGIN
 IF current_user<>'postgres' OR NOT has_schema_privilege('postgres','public','CREATE')
 OR NOT pg_has_role('postgres','selqiro_listing_contact_writer_v1','USAGE')
 OR NOT has_schema_privilege('postgres','auth','USAGE')
 OR NOT has_table_privilege('postgres','auth.users','SELECT')
 OR NOT has_any_column_privilege('postgres','auth.users','UPDATE')
 OR row_security_active('auth.users'::regclass)
 OR NOT has_table_privilege('postgres','account_lifecycle_private.account_states','SELECT')
 OR NOT has_any_column_privilege('postgres','account_lifecycle_private.account_states','UPDATE')
 OR row_security_active('account_lifecycle_private.account_states'::regclass) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='OFFER_MESSAGE_INTENT_AUTHORITY_REQUIRED'; END IF;
 FOREACH rel IN ARRAY ARRAY['horse_publication_private.message_cards'::regclass,'service_publication_private.message_cards'::regclass,'jobs_private.message_cards'::regclass] LOOP
  IF (SELECT count(*) FROM pg_attribute WHERE attrelid=rel AND attnum>0 AND NOT attisdropped)>16
  OR (SELECT count(*) FROM pg_constraint WHERE conrelid=rel)>16
  OR (SELECT count(*) FROM pg_index WHERE indrelid=rel)>8
  OR (SELECT count(*) FROM pg_policy WHERE polrelid=rel)>8
  OR (SELECT count(*) FROM pg_trigger WHERE tgrelid=rel AND NOT tgisinternal)>8 THEN
   RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='OFFER_MESSAGE_INTENT_CATALOG_LIMIT'; END IF;
 END LOOP;
END $offer_intent_authority$;
WITH observed AS MATERIALIZED (
WITH accepted AS MATERIALIZED (
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
),dependencies AS MATERIALIZED (
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
 WHERE n.nspname||'.'||p.proname IN ('public.get_my_marketplace_message_thread_v1','public.get_my_marketplace_message_thread_v2','horse_publication_private.contact_snapshot','service_publication_private.contact_snapshot','jobs_private.contact_snapshot')
),targets AS MATERIALIZED (
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
 WHERE n.nspname||'.'||p.proname IN ('horse_publication_private.capture_message_card','service_publication_private.capture_message_card','jobs_private.capture_message_card','messaging_private_v2.validate_offer_intent_v1','messaging_private_v2.offer_snapshot_v1','messaging_private_v2.last_shared_offer_v1','public.get_my_offer_message_thread_v1','public.send_my_offer_message_v1')
),cards AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
 'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'validated',q.convalidated,'definition',pg_get_constraintdef(q.oid)) ORDER BY q.conname) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'indexes',(SELECT jsonb_agg(jsonb_build_object('definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive) ORDER BY x.relname) FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid WHERE i.indrelid=c.oid AND x.relname NOT IN ('offer_message_listing_header_v1','offer_message_horse_header_v1','offer_message_service_header_v1','offer_message_job_header_v1')),
 'policies',(SELECT jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname) FROM pg_policy q WHERE q.polrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type) FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a)
 ) ORDER BY n.nspname),'[]'::jsonb) value FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relname='message_cards' AND n.nspname IN ('horse_publication_private','service_publication_private','jobs_private')
),indexes AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'definition',CASE WHEN c.relkind='i' THEN pg_get_indexdef(c.oid) END,'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive) ORDER BY n.nspname,c.relname),'[]'::jsonb) value FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_index i ON i.indexrelid=c.oid WHERE c.relname IN ('offer_message_listing_header_v1','offer_message_horse_header_v1','offer_message_service_header_v1','offer_message_job_header_v1')
),columns AS MATERIALIZED (
SELECT coalesce(jsonb_agg(jsonb_build_object('relation',n.nspname||'.'||c.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull) ORDER BY n.nspname,c.relname,a.attname),'[]'::jsonb) value FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE a.attnum>0 AND NOT a.attisdropped AND ((n.nspname='public' AND c.relname='jobs' AND a.attname='active_until') OR (n.nspname='service_publication_private' AND c.relname='activity' AND a.attname IN ('service_id','active_until')))
)
SELECT jsonb_build_object('accepted_base',jsonb_set(a.b,'{accepted_contact_base,contact_catalog,catalog,functions}',(SELECT jsonb_agg(CASE WHEN f->>'name' IN ('horse_publication_private.capture_message_card','service_publication_private.capture_message_card','jobs_private.capture_message_card') THEN f-ARRAY['body_bytes','body_sha256','definition_sha256'] ELSE f END ORDER BY f->>'signature' COLLATE "C") FROM jsonb_array_elements(a.b#>'{accepted_contact_base,contact_catalog,catalog,functions}') f)),'accepted_target',a.t,'dependencies',(SELECT value FROM dependencies),'card_tables',(SELECT value FROM cards),'dependency_columns',(SELECT value FROM columns)) b,
jsonb_build_object('functions',(SELECT value FROM targets),'indexes',(SELECT value FROM indexes)) t FROM accepted a
),fingerprints AS (SELECT encode(sha256(convert_to(b::text,'UTF8')),'hex') b,encode(sha256(convert_to(t::text,'UTF8')),'hex') t FROM observed),evaluated AS (SELECT *,CASE WHEN b='4d0ca607396f916dbfe6ac92f354d552f395e6bb40ec56104dc0273076b74863' AND t='34801e60a6a85f5b959d0910adbb9561ccb9e9fb300be6128359f25c100ff75c' THEN 'before' WHEN b='4d0ca607396f916dbfe6ac92f354d552f395e6bb40ec56104dc0273076b74863' AND t='f5979d5e54267630239eb40d1ca61080a0a62f8f9bfc24e7333c72682e8e7a94' THEN 'after' ELSE 'unknown' END state FROM fingerprints)
SELECT jsonb_build_object('format','selqiro-offer-message-intent-20261124-v1','stage','apply','state',state,'recognized',state IN('before','after'),'read_only',false,'account_rows_read',false,'account_rows_exported',false,'base_fingerprint',b,'target_fingerprint',t,'fence_verified',state='after') AS result FROM evaluated;
ROLLBACK;
