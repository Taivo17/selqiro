-- Dated, exact-catalog guarded profile READ privacy repair. No user rows exported.
BEGIN READ ONLY;
SET LOCAL search_path=pg_catalog;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='3s';
WITH captured AS MATERIALIZED (-- Textual array ordering is explicitly bytewise (C), independent of the
-- database's locale. JSONB object serialization and numeric order stay intact.
WITH wanted_relations(name) AS (VALUES
 ('public.profiles'), ('public.identity_profiles'), ('public.identities'),
 ('public.business_accounts'), ('public.business_members')
), relations AS MATERIALIZED (
 SELECT w.name,c.* FROM wanted_relations w
 LEFT JOIN pg_class c ON c.oid=to_regclass(w.name)
), actors AS MATERIALIZED (
 SELECT oid,rolname,rolsuper,rolinherit,rolbypassrls,rolcreaterole,rolcreatedb
 FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')
), auth_users AS MATERIALIZED (
 SELECT c.* FROM pg_class c WHERE c.oid=to_regclass('auth.users')
), triggers AS MATERIALIZED (
 SELECT t.*,n.nspname||'.'||c.relname AS relation_name
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE NOT t.tgisinternal
 AND (t.tgrelid IN (SELECT oid FROM relations)
      OR t.tgrelid IN (SELECT oid FROM auth_users))
), wanted_functions(name) AS (VALUES
 ('public.save_my_active_identity_profile'),
 ('public.update_my_active_identity_location'),
 ('public.get_my_active_identity_profile'),
 ('public.get_my_active_identity_profile_details'),
 ('public.get_my_identities'),
 ('public.current_user_has_identity_access'),
 ('public.user_has_identity_access_v2'),
 ('public.require_my_active_identity_v2'),
 ('public.set_my_active_identity_v2'),
 ('public.validate_profile_active_identity_v2'),
 ('public.is_business_member'),
 ('public.get_store_by_slug'),
 ('public.get_identity_profile_public'),
 ('public.get_feed_identity_profiles'),
 ('messaging_private_v2.identity_card'),
 ('listing_publication_private.require_actor'),
 ('listing_contact_private.require_actor_hosted_v1'),
 ('public.get_public_legacy_profile_card_v1'), ('public.get_my_identity_profile_plan_v1')
), functions AS MATERIALIZED (
 SELECT n.nspname||'.'||p.proname AS name,p.*
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE p.prokind='f'
 AND (n.nspname||'.'||p.proname IN (SELECT name FROM wanted_functions)
      OR p.oid IN (SELECT tgfoid FROM triggers))
), related_views AS MATERIALIZED (
 SELECT DISTINCT v.oid,n.nspname||'.'||v.relname AS name,
  v.relowner,v.reloptions,v.relacl,v.relkind
 FROM pg_class v JOIN pg_namespace n ON n.oid=v.relnamespace
 JOIN pg_rewrite rw ON rw.ev_class=v.oid
 JOIN pg_depend d ON d.classid='pg_rewrite'::regclass AND d.objid=rw.oid
 WHERE v.relkind IN ('v','m') AND d.refclassid='pg_class'::regclass
 AND d.refobjid IN (SELECT oid FROM relations)
 AND v.oid<>d.refobjid
), wanted_schemas(name) AS (VALUES
 ('public'),('auth')
), inventory AS MATERIALIZED (
SELECT jsonb_build_object(
 'format','selqiro-profile-catalog-20261120-v1',
 'kind','profile_catalog',
 'read_only',current_setting('transaction_read_only'),
 'server_version',current_setting('server_version'),
 'current_role',current_user,
 'fixed_settings_unfiltered',
  has_table_privilege(current_user,'listing_publication_private.hosted_preview_settings','SELECT')
  AND NOT row_security_active('listing_publication_private.hosted_preview_settings'::regclass)
,
 'hosted_context',(
  SELECT coalesce(jsonb_agg(jsonb_build_object(
   'project_ref',s.project_ref,'instance_id',s.instance_id,
   'release_id',s.release_id,'enabled',s.enabled,'release_ready',s.release_ready,
   'storage_authority_version',s.storage_authority_version) ORDER BY s.singleton),'[]'::jsonb)
  FROM listing_publication_private.hosted_preview_settings s WHERE s.singleton),
 'actors',(
  SELECT coalesce(jsonb_agg(to_jsonb(a)-'oid' ORDER BY a.rolname COLLATE "C"),'[]'::jsonb) FROM actors a),
 'auth_users',jsonb_build_object(
  'exists',EXISTS(SELECT 1 FROM auth_users),
  'kind',(SELECT c.relkind FROM auth_users c),
  'owner',(SELECT pg_get_userbyid(c.relowner) FROM auth_users c),
  'rls',(SELECT c.relrowsecurity FROM auth_users c),
  'forced',(SELECT c.relforcerowsecurity FROM auth_users c)),
 'relations',(
  SELECT jsonb_agg(jsonb_build_object(
   'name',r.name,'exists',r.oid IS NOT NULL,'kind',r.relkind,
   'owner',pg_get_userbyid(r.relowner),'rls',r.relrowsecurity,'forced',r.relforcerowsecurity,
   'acl',(
    SELECT coalesce(jsonb_agg(jsonb_build_object(
     'grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY x.grantor,x.grantee,x.privilege_type COLLATE "C"),'[]'::jsonb)
    FROM aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) x),
   'effective',(
    SELECT coalesce(jsonb_agg(jsonb_build_object('role',a.rolname,
     'select',has_table_privilege(a.oid,r.oid,'SELECT'),
     'insert',has_table_privilege(a.oid,r.oid,'INSERT'),
     'update',has_table_privilege(a.oid,r.oid,'UPDATE'),
     'delete',has_table_privilege(a.oid,r.oid,'DELETE')) ORDER BY a.rolname COLLATE "C"),'[]'::jsonb)
    FROM actors a),
   'columns',(
    SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.attname,'position',c.attnum,
     'type',format_type(c.atttypid,c.atttypmod),'not_null',c.attnotnull,
     'effective',(
      SELECT coalesce(jsonb_agg(jsonb_build_object('role',a.rolname,
       'select',has_column_privilege(a.oid,r.oid,c.attnum,'SELECT'),
       'insert',has_column_privilege(a.oid,r.oid,c.attnum,'INSERT'),
       'update',has_column_privilege(a.oid,r.oid,c.attnum,'UPDATE')) ORDER BY a.rolname COLLATE "C"),'[]'::jsonb)
      FROM actors a)) ORDER BY c.attnum),'[]'::jsonb)
    FROM pg_attribute c WHERE c.attrelid=r.oid AND c.attnum>0 AND NOT c.attisdropped),
   'policies',(
    SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,
     'permissive',p.polpermissive,
     'roles',(SELECT jsonb_agg(CASE WHEN role_oid=0 THEN 'PUBLIC' ELSE pg_get_userbyid(role_oid) END ORDER BY role_oid) FROM unnest(p.polroles) role_oid),
     'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid))
     ORDER BY p.polname COLLATE "C"),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=r.oid),
   'constraints',(
    SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.conname,'type',c.contype,
     'definition_sha256',encode(sha256(convert_to(pg_get_constraintdef(c.oid),'UTF8')),'hex'))
     ORDER BY c.conname COLLATE "C"),'[]'::jsonb) FROM pg_constraint c WHERE c.conrelid=r.oid AND c.contype<>'n'),
   'indexes',(
    SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,
     'unique',i.indisunique,'valid',i.indisvalid,
     'definition_sha256',encode(sha256(convert_to(pg_get_indexdef(i.indexrelid),'UTF8')),'hex'))
     ORDER BY i.indexrelid::regclass::text COLLATE "C"),'[]'::jsonb) FROM pg_index i WHERE i.indrelid=r.oid)
   ) ORDER BY r.name COLLATE "C") FROM relations r),
 'functions',(
  SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.name,'signature',p.oid::regprocedure::text,
   'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'volatility',p.provolatile,
   'result',pg_get_function_result(p.oid),
   'search_path',(SELECT x FROM unnest(p.proconfig) x WHERE x LIKE 'search_path=%' LIMIT 1),
   'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
   'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
   'acl',(
    SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY x.grantor,x.grantee,x.privilege_type COLLATE "C"),'[]'::jsonb)
    FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x),
   'effective_execute',(
    SELECT coalesce(jsonb_agg(jsonb_build_object('role',a.rolname,
     'execute',has_function_privilege(a.oid,p.oid,'EXECUTE')) ORDER BY a.rolname COLLATE "C"),'[]'::jsonb)
    FROM actors a)) ORDER BY p.name COLLATE "C",p.oid::regprocedure::text COLLATE "C"),'[]'::jsonb)
  FROM functions p),
 'missing_function_names',(
  SELECT coalesce(jsonb_agg(w.name ORDER BY w.name COLLATE "C"),'[]'::jsonb)
  FROM wanted_functions w WHERE NOT EXISTS(SELECT 1 FROM functions p WHERE p.name=w.name)),
 'triggers',(
  SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.relation_name,'name',t.tgname,
   'enabled',t.tgenabled,'event_mask',t.tgtype,'function',t.tgfoid::regprocedure::text,
   'definition_sha256',encode(sha256(convert_to(pg_get_triggerdef(t.oid),'UTF8')),'hex'))
   ORDER BY t.relation_name COLLATE "C",t.tgname COLLATE "C"),'[]'::jsonb) FROM triggers t),
 'related_views',(
  SELECT coalesce(jsonb_agg(jsonb_build_object('name',v.name,'kind',v.relkind,
   'owner',pg_get_userbyid(v.relowner),'options',v.reloptions,
   'definition_sha256',encode(sha256(convert_to(pg_get_viewdef(v.oid,true),'UTF8')),'hex'),
   'acl',(
    SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY x.grantor,x.grantee,x.privilege_type COLLATE "C"),'[]'::jsonb)
    FROM aclexplode(coalesce(v.relacl,acldefault('r',v.relowner))) x),
   'effective_select',(
    SELECT coalesce(jsonb_agg(jsonb_build_object('role',a.rolname,
     'table',has_table_privilege(a.oid,v.oid,'SELECT'),
     'any_column',has_any_column_privilege(a.oid,v.oid,'SELECT')) ORDER BY a.rolname COLLATE "C"),'[]'::jsonb)
    FROM actors a)) ORDER BY v.name COLLATE "C"),'[]'::jsonb) FROM related_views v),
 'schemas',(
  SELECT jsonb_agg(jsonb_build_object('name',w.name,'exists',n.oid IS NOT NULL,
   'effective',(
    SELECT jsonb_agg(jsonb_build_object('role',a.rolname,
     'usage',has_schema_privilege(a.oid,n.oid,'USAGE'),
     'create',has_schema_privilege(a.oid,n.oid,'CREATE')) ORDER BY a.rolname COLLATE "C")
    FROM actors a)) ORDER BY w.name COLLATE "C")
  FROM wanted_schemas w LEFT JOIN pg_namespace n ON n.nspname=w.name),
 'default_acl',(
  SELECT coalesce(jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),
   'schema',n.nspname,'object_type',d.defaclobjtype,
   'acl',(
    SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY x.grantor,x.grantee,x.privilege_type COLLATE "C"),'[]'::jsonb)
    FROM aclexplode(d.defaclacl) x))
   ORDER BY d.defaclrole,d.defaclnamespace,d.defaclobjtype),'[]'::jsonb)
  FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
  WHERE d.defaclnamespace=0 OR n.nspname IN ('public','storage')),
 'identity_media_bucket','[]'::jsonb
) AS value
)
SELECT jsonb_build_object(
 'current_role',i.value->'current_role','fixed_settings_unfiltered',i.value->'fixed_settings_unfiltered',
 'relations',(SELECT jsonb_object_agg(r->>'name',(r-'name'-'acl'-'policies')||jsonb_build_object(
   'acl',(SELECT jsonb_agg(a ORDER BY (a->>'grantor') COLLATE "C",(a->>'grantee') COLLATE "C",(a->>'privilege') COLLATE "C",(a->>'grantable') COLLATE "C") FROM jsonb_array_elements(r->'acl') a),
   'policies',(SELECT coalesce(jsonb_agg((p-'roles')||jsonb_build_object('roles',
      (SELECT jsonb_agg(v ORDER BY v COLLATE "C") FROM jsonb_array_elements_text(p->'roles') v)) ORDER BY (p->>'name') COLLATE "C"),'[]'::jsonb)
      FROM jsonb_array_elements(r->'policies') p))) FROM jsonb_array_elements(i.value->'relations') r),
 'functions',(SELECT jsonb_object_agg(f->>'signature',(f-'acl')||jsonb_build_object('acl',
   (SELECT jsonb_agg(a ORDER BY (a->>'grantor') COLLATE "C",(a->>'grantee') COLLATE "C",(a->>'privilege') COLLATE "C",(a->>'grantable') COLLATE "C") FROM jsonb_array_elements(f->'acl') a)))
   FROM jsonb_array_elements(i.value->'functions') f WHERE f->>'name' NOT LIKE 'storage.%'),
 'actors',i.value->'actors','schemas',i.value->'schemas',
 'triggers',(SELECT coalesce(jsonb_agg(t ORDER BY (t->>'relation') COLLATE "C",(t->>'name') COLLATE "C"),'[]'::jsonb)
   FROM jsonb_array_elements(i.value->'triggers') t WHERE t->>'relation' LIKE 'public.%'),
 'related_views',i.value->'related_views','hosted_context',i.value->'hosted_context',
 'function_creation_defaults',(SELECT coalesce(jsonb_agg((d-'acl')||jsonb_build_object('acl',
   (SELECT jsonb_agg(a ORDER BY (a->>'grantor') COLLATE "C",(a->>'grantee') COLLATE "C",(a->>'privilege') COLLATE "C",(a->>'grantable') COLLATE "C") FROM jsonb_array_elements(d->'acl') a))
   ORDER BY (d->>'schema') COLLATE "C"),'[]'::jsonb) FROM jsonb_array_elements(i.value->'default_acl') d
   WHERE d->>'owner'='postgres' AND (d->>'schema' IS NULL OR d->>'schema'='public') AND d->>'object_type'='f')
) AS scope FROM inventory i), fingerprint AS (
 SELECT encode(sha256(convert_to(scope::text,'UTF8')),'hex') AS sha FROM captured
)
SELECT jsonb_build_object(
 'format','selqiro-profile-read-privacy-state-20261120-v1',
 'state',CASE sha WHEN 'a09a7fd154af348f9b6b87043a6dece6e58eb67a3324a174665ef6f3db7e7a50' THEN 'before' WHEN '7ec206ef204821ff096d37043d6086cdf1a2165cfe968aea9b7bba3b4deb470f' THEN 'after' ELSE 'unknown' END,
 'recognized',sha IN ('a09a7fd154af348f9b6b87043a6dece6e58eb67a3324a174665ef6f3db7e7a50','7ec206ef204821ff096d37043d6086cdf1a2165cfe968aea9b7bba3b4deb470f'),
 'read_only',true,
 'project_ref','vyjletlmwoiwxsnsunlm',
 'instance_id','2d088814-0900-448a-a9d1-7b05470cb1d2',
 'release_id','listing-publication-hosted-preview-v1',
 'scope_sha256',sha,
 'expected_before_sha256','a09a7fd154af348f9b6b87043a6dece6e58eb67a3324a174665ef6f3db7e7a50',
 'expected_after_sha256','7ec206ef204821ff096d37043d6086cdf1a2165cfe968aea9b7bba3b4deb470f',
 'user_rows_read',false
) AS result FROM fingerprint;
ROLLBACK;
