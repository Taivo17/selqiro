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
SELECT jsonb_build_object('catalog',result,'sha256',encode(sha256(convert_to(result::text,'UTF8')),'hex')) AS result FROM facts;
