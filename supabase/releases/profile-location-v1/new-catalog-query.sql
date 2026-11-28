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
SELECT jsonb_build_object('catalog',result,'sha256',encode(sha256(convert_to(result::text,'UTF8')),'hex')) AS result FROM facts;
