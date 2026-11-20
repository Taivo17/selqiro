-- Dated, exact-catalog guarded public profile text/location editor. No user rows exported.
-- This file is applied at most once by the journalled runner. Already-after
-- state is rejected here; recovery observes metadata and never replays a write.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL statement_timeout='30s';
SET LOCAL lock_timeout='3s';
LOCK TABLE public.profiles,public.identity_profiles,public.identities,
 public.business_accounts,public.business_members,public.admin_users,public.premium_invites IN SHARE ROW EXCLUSIVE MODE;
DO $guard$
DECLARE actual text;
BEGIN
 SELECT encode(sha256(convert_to(scope::text,'UTF8')),'hex') INTO actual FROM (-- Exact accepted read state plus bounded writer metadata; no application rows.
WITH catalog AS MATERIALIZED (
WITH RECURSIVE read_scope AS MATERIALIZED (
-- Textual array ordering is explicitly bytewise (C), independent of the
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
) AS scope FROM inventory i
),
read_fingerprint AS MATERIALIZED (
 SELECT scope,encode(sha256(convert_to(scope::text,'UTF8')),'hex') AS sha256 FROM read_scope
), wanted_relations(name) AS (VALUES
 ('public.profiles'),('public.identity_profiles'),('public.identities'),
 ('public.business_accounts'),('public.business_members'),
 ('public.admin_users'),('public.premium_invites')
), relations AS MATERIALIZED (
 SELECT w.name,c.* FROM wanted_relations w LEFT JOIN pg_class c ON c.oid=to_regclass(w.name)
), actors AS MATERIALIZED (
 SELECT oid,rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')
), auth_users AS MATERIALIZED (
 SELECT c.* FROM pg_class c WHERE c.oid=to_regclass('auth.users')
), triggers AS MATERIALIZED (
 SELECT t.*,n.nspname||'.'||c.relname AS relation_name
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE NOT t.tgisinternal
 AND (t.tgrelid IN (SELECT oid FROM relations) OR t.tgrelid IN (SELECT oid FROM auth_users))
), known_functions(name) AS (VALUES
 ('public.save_my_active_identity_profile'),('public.update_my_active_identity_location'),
 ('public.get_my_active_identity_profile'),('public.get_my_active_identity_profile_details'),
 ('public.get_my_identities'),('public.current_user_has_identity_access'),
 ('public.user_has_identity_access_v2'),('public.require_my_active_identity_v2'),
 ('public.set_my_active_identity_v2'),('public.validate_profile_active_identity_v2'),
 ('public.is_business_member'),('public.admin_set_identity_plan'),('public.is_admin'),
 ('public.claim_premium_invite'),('public.create_premium_invite'),
 ('profile_editor_private.lock_owner'),('profile_editor_private.snapshot'),('profile_editor_private.touch_revision'),('public.get_my_profile_editor_v1'),('public.save_my_profile_editor_v1')
), helper_names(name) AS (VALUES
 ('save_my_active_identity_profile'),('update_my_active_identity_location'),
 ('set_my_active_identity_v2'),('admin_set_identity_plan'),('is_admin'),
 ('claim_premium_invite'),('create_premium_invite'),
 ('get_my_profile_editor_v1'),('save_my_profile_editor_v1'),('profile_editor_private')
), routine_candidates AS MATERIALIZED (
 SELECT p.*,n.nspname AS schema_name,n.nspname||'.'||p.proname AS name,
  n.nspname||'.'||p.proname IN (SELECT name FROM known_functions) AS known_name,
  p.oid IN (SELECT tgfoid FROM triggers) AS attached_trigger,
  ARRAY(SELECT r.name FROM relations r
    WHERE p.prosrc ~* ('\m'||split_part(r.name,'.',2)||'\M') ORDER BY r.name COLLATE "C") AS source_relations,
  ARRAY(SELECT r.name FROM relations r WHERE EXISTS(
    SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid
    AND d.refclassid='pg_class'::regclass AND d.refobjid=r.oid) ORDER BY r.name COLLATE "C") AS relation_dependencies,
  ARRAY(SELECT h.name FROM helper_names h WHERE p.prosrc ~* ('\m'||h.name||'\M') ORDER BY h.name COLLATE "C") AS source_helpers,
  ARRAY(SELECT q.oid::regprocedure::text FROM pg_proc q JOIN pg_namespace qn ON qn.oid=q.pronamespace
    WHERE qn.nspname||'.'||q.proname IN (SELECT name FROM known_functions)
    AND EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid
      AND d.refclassid='pg_proc'::regclass AND d.refobjid=q.oid)
    ORDER BY q.oid::regprocedure::text COLLATE "C") AS function_dependencies
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE p.prokind IN ('f','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
 AND n.nspname NOT LIKE 'pg_temp_%' AND n.nspname NOT LIKE 'pg_toast%'
), selected_routines AS MATERIALIZED (
 SELECT * FROM routine_candidates p WHERE p.known_name OR p.attached_trigger
 OR cardinality(p.source_relations)>0 OR cardinality(p.relation_dependencies)>0
 OR cardinality(p.source_helpers)>0 OR cardinality(p.function_dependencies)>0
), routines AS MATERIALIZED (
 -- Overflow is explicit and rejected by the parser; it is never silently accepted.
 SELECT * FROM selected_routines ORDER BY name COLLATE "C",oid::regprocedure::text COLLATE "C" LIMIT 513
), related_views AS MATERIALIZED (
 SELECT DISTINCT v.oid,n.nspname||'.'||v.relname AS name,v.relowner,v.reloptions,v.relacl,v.relkind
 FROM pg_class v JOIN pg_namespace n ON n.oid=v.relnamespace
 JOIN pg_rewrite rw ON rw.ev_class=v.oid
 JOIN pg_depend d ON d.classid='pg_rewrite'::regclass AND d.objid=rw.oid
 WHERE v.relkind IN ('v','m') AND d.refclassid='pg_class'::regclass
 AND d.refobjid IN (SELECT oid FROM relations) AND v.oid<>d.refobjid
), relevant_schemas AS MATERIALIZED (
 SELECT n.* FROM pg_namespace n WHERE n.nspname IN ('public','auth','storage')
 OR n.oid IN (SELECT pronamespace FROM routines)
), role_seeds(oid) AS (
 SELECT oid FROM actors UNION SELECT relowner FROM relations WHERE oid IS NOT NULL
 UNION SELECT proowner FROM routines UNION SELECT relowner FROM related_views
 UNION SELECT nspowner FROM relevant_schemas
 UNION SELECT x.grantee FROM relations r CROSS JOIN LATERAL aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM routines p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM related_views v CROSS JOIN LATERAL aclexplode(coalesce(v.relacl,acldefault('r',v.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM relevant_schemas n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE x.grantee<>0
 UNION SELECT relowner FROM owned_sequences
 UNION SELECT x.grantee FROM owned_sequences s CROSS JOIN LATERAL aclexplode(coalesce(s.relacl,acldefault('s',s.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
   WHERE a.attrelid IN (SELECT oid FROM relations) AND a.attnum>0 AND NOT a.attisdropped AND x.grantee<>0
), role_closure(oid) AS (
 SELECT oid FROM role_seeds UNION SELECT m.roleid FROM pg_auth_members m JOIN role_closure c ON c.oid=m.member
), owned_sequences AS MATERIALIZED (
 SELECT s.oid,n.nspname||'.'||s.relname AS name,s.relowner,s.relacl,r.name AS relation_name,a.attname AS column_name,d.deptype
 FROM pg_class s JOIN pg_namespace n ON n.oid=s.relnamespace
 JOIN pg_depend d ON d.classid='pg_class'::regclass AND d.objid=s.oid
 JOIN relations r ON d.refclassid='pg_class'::regclass AND r.oid=d.refobjid
 JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum=d.refobjsubid
 WHERE s.relkind='S' AND d.deptype IN ('a','i') AND NOT a.attisdropped
)
SELECT jsonb_build_object(
 'format','selqiro-profile-write-catalog-20261120-v1',
 'kind','profile_write_catalog','read_only',current_setting('transaction_read_only'),
 'user_rows_read',false,'source_commit','d6540333c6a1eace53bfac616c1041a8bd238806',
 'server_version',current_setting('server_version'),'current_role',current_user,
 'baseline',jsonb_build_object('expected_sha256','7ec206ef204821ff096d37043d6086cdf1a2165cfe968aea9b7bba3b4deb470f',
   'scope_sha256',f.sha256,'matched',f.sha256='7ec206ef204821ff096d37043d6086cdf1a2165cfe968aea9b7bba3b4deb470f'),
 'fixed_settings_unfiltered',(f.scope->>'fixed_settings_unfiltered')::boolean
   AND has_table_privilege(current_user,'storage.buckets','SELECT')
   AND NOT row_security_active('storage.buckets'::regclass),
 'hosted_context',f.scope->'hosted_context',
 'auth_users',jsonb_build_object('exists',EXISTS(SELECT 1 FROM auth_users),
   'kind',(SELECT relkind FROM auth_users),'owner',(SELECT pg_get_userbyid(relowner) FROM auth_users),
   'rls',(SELECT relrowsecurity FROM auth_users),'forced',(SELECT relforcerowsecurity FROM auth_users)),
 'relations',(SELECT jsonb_agg(jsonb_build_object(
   'name',r.name,'exists',r.oid IS NOT NULL,'kind',r.relkind,'owner',pg_get_userbyid(r.relowner),
   'rls',r.relrowsecurity,'forced',r.relforcerowsecurity,
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) x),
   'effective',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,
     'select',has_table_privilege(a.oid,r.oid,'SELECT'),'insert',has_table_privilege(a.oid,r.oid,'INSERT'),
     'update',has_table_privilege(a.oid,r.oid,'UPDATE'),'delete',has_table_privilege(a.oid,r.oid,'DELETE'))
     ORDER BY a.rolname COLLATE "C") FROM actors a),
   'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object(
     'name',c.attname,'position',c.attnum,'type',format_type(c.atttypid,c.atttypmod),'not_null',c.attnotnull,
     'identity',c.attidentity,'generated',c.attgenerated,'default_expression',pg_get_expr(d.adbin,d.adrelid),
     'default_sha256',CASE WHEN d.oid IS NULL THEN NULL ELSE encode(sha256(convert_to(pg_get_expr(d.adbin,d.adrelid),'UTF8')),'hex') END,
     'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
       'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
       'privilege',x.privilege_type,'grantable',x.is_grantable)
       ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb) FROM aclexplode(c.attacl) x),
     'effective',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,
       'select',has_column_privilege(a.oid,r.oid,c.attnum,'SELECT'),
       'insert',has_column_privilege(a.oid,r.oid,c.attnum,'INSERT'),
       'update',has_column_privilege(a.oid,r.oid,c.attnum,'UPDATE')) ORDER BY a.rolname COLLATE "C") FROM actors a))
     ORDER BY c.attnum),'[]'::jsonb) FROM pg_attribute c LEFT JOIN pg_attrdef d ON d.adrelid=c.attrelid AND d.adnum=c.attnum
     WHERE c.attrelid=r.oid AND c.attnum>0 AND NOT c.attisdropped),
   'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
     'roles',(SELECT jsonb_agg(v.name ORDER BY v.name COLLATE "C") FROM (
       SELECT CASE WHEN u=0 THEN 'PUBLIC' ELSE pg_get_userbyid(u) END AS name FROM unnest(p.polroles) u) v),
     'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname COLLATE "C"),'[]'::jsonb)
     FROM pg_policy p WHERE p.polrelid=r.oid),
   'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.conname,'type',c.contype,
     'definition',pg_get_constraintdef(c.oid),'definition_sha256',encode(sha256(convert_to(pg_get_constraintdef(c.oid),'UTF8')),'hex'),
     'deferrable',c.condeferrable,'initially_deferred',c.condeferred,'validated',c.convalidated,
     'referenced_relation',CASE WHEN c.confrelid=0 THEN NULL ELSE c.confrelid::regclass::text END)
     ORDER BY c.conname COLLATE "C"),'[]'::jsonb) FROM pg_constraint c WHERE c.conrelid=r.oid AND c.contype<>'n'),
   'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,
     'unique',i.indisunique,'valid',i.indisvalid,'ready',i.indisready,
     'definition',pg_get_indexdef(i.indexrelid),'definition_sha256',encode(sha256(convert_to(pg_get_indexdef(i.indexrelid),'UTF8')),'hex'))
     ORDER BY i.indexrelid::regclass::text COLLATE "C"),'[]'::jsonb) FROM pg_index i WHERE i.indrelid=r.oid)
 ) ORDER BY r.name COLLATE "C") FROM relations r),
 'routine_census',jsonb_build_object('method','profile_editor_known_names_triggers_dependencies_source_and_helper_tokens_v1',
   'dynamic_sql_complete',false,'external_auth_hooks_checked',false,'maximum',512,
   'matched_count',(SELECT count(*) FROM selected_routines),
   'overflow',(SELECT count(*)>512 FROM selected_routines)),
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
   'name',p.name,'signature',p.oid::regprocedure::text,'kind',p.prokind,
   'owner',pg_get_userbyid(p.proowner),'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,
   'result',CASE WHEN p.prokind='p' THEN NULL ELSE pg_get_function_result(p.oid) END,
   'search_path',(SELECT x FROM unnest(p.proconfig) x WHERE x LIKE 'search_path=%' ORDER BY x COLLATE "C" LIMIT 1),
   'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
   'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
   'known_name',p.known_name,'attached_trigger',p.attached_trigger,
   'source_relations',to_jsonb(p.source_relations),'relation_dependencies',to_jsonb(p.relation_dependencies),
   'source_helpers',to_jsonb(p.source_helpers),'function_dependencies',to_jsonb(p.function_dependencies),
   'write_keyword_observed',p.prosrc ~* '\m(insert|update|delete|merge|truncate)\M',
   'execute_keyword_observed',p.prosrc ~* '\mexecute\M',
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x),
   'effective_execute',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,'execute',has_function_privilege(a.oid,p.oid,'EXECUTE'))
     ORDER BY a.rolname COLLATE "C") FROM actors a)) ORDER BY p.name COLLATE "C",p.oid::regprocedure::text COLLATE "C"),'[]'::jsonb)
   FROM routines p JOIN pg_language l ON l.oid=p.prolang),
 'missing_function_names',(SELECT coalesce(jsonb_agg(w.name ORDER BY w.name COLLATE "C"),'[]'::jsonb)
   FROM known_functions w WHERE NOT EXISTS(SELECT 1 FROM routines p WHERE p.name=w.name)),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.relation_name,'name',t.tgname,
   'enabled',t.tgenabled,'event_mask',t.tgtype,'function',t.tgfoid::regprocedure::text,
   'columns',(SELECT coalesce(jsonb_agg(a.attname ORDER BY a.attname COLLATE "C"),'[]'::jsonb)
     FROM pg_attribute a WHERE a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr) AND NOT a.attisdropped),
   'argument_count',t.tgnargs,'arguments_sha256',encode(sha256(t.tgargs),'hex'),
   'when_sha256',CASE WHEN t.tgqual IS NULL THEN NULL ELSE encode(sha256(convert_to(t.tgqual::text,'UTF8')),'hex') END,
   'constraint',t.tgconstraint<>0,'deferrable',t.tgdeferrable,'initially_deferred',t.tginitdeferred,
   'definition_sha256',encode(sha256(convert_to(pg_get_triggerdef(t.oid),'UTF8')),'hex'))
   ORDER BY t.relation_name COLLATE "C",t.tgname COLLATE "C"),'[]'::jsonb) FROM triggers t),
 'related_views',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',v.name,'kind',v.relkind,
   'owner',pg_get_userbyid(v.relowner),'options',(SELECT jsonb_agg(o ORDER BY o COLLATE "C") FROM unnest(v.reloptions) o),
   'definition_sha256',encode(sha256(convert_to(pg_get_viewdef(v.oid,true),'UTF8')),'hex'),
   'updatable_mask',pg_relation_is_updatable(v.oid,false),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(v.relacl,acldefault('r',v.relowner))) x),
   'effective',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,
     'select',has_any_column_privilege(a.oid,v.oid,'SELECT'),'insert',has_any_column_privilege(a.oid,v.oid,'INSERT'),
     'update',has_any_column_privilege(a.oid,v.oid,'UPDATE'),'delete',has_table_privilege(a.oid,v.oid,'DELETE'))
     ORDER BY a.rolname COLLATE "C") FROM actors a)) ORDER BY v.name COLLATE "C"),'[]'::jsonb) FROM related_views v),
 'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.name,'name',w.rulename,'enabled',w.ev_enabled,
   'event',w.ev_type,'instead',w.is_instead,
   'definition_sha256',encode(sha256(convert_to(pg_get_ruledef(w.oid),'UTF8')),'hex'))
   ORDER BY r.name COLLATE "C",w.rulename COLLATE "C"),'[]'::jsonb)
   FROM pg_rewrite w JOIN relations r ON r.oid=w.ev_class WHERE w.rulename<>'_RETURN'),
 'schemas',(SELECT jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x),
   'effective',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,'usage',has_schema_privilege(a.oid,n.oid,'USAGE'),
     'create',has_schema_privilege(a.oid,n.oid,'CREATE')) ORDER BY a.rolname COLLATE "C") FROM actors a))
   ORDER BY n.nspname COLLATE "C") FROM relevant_schemas n),
 'roles',(SELECT jsonb_agg(jsonb_build_object('name',r.rolname,'superuser',r.rolsuper,'inherit',r.rolinherit,
   'bypass_rls',r.rolbypassrls,'create_role',r.rolcreaterole,'create_db',r.rolcreatedb,'can_login',r.rolcanlogin)
   ORDER BY r.rolname COLLATE "C") FROM pg_roles r WHERE r.oid IN (SELECT oid FROM role_closure)),
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('member',pg_get_userbyid(m.member),
   'role',pg_get_userbyid(m.roleid),'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,
   'inherit',(to_jsonb(m)->'inherit_option'),'set',(to_jsonb(m)->'set_option'))
   ORDER BY pg_get_userbyid(m.member) COLLATE "C",pg_get_userbyid(m.roleid) COLLATE "C",pg_get_userbyid(m.grantor) COLLATE "C"),'[]'::jsonb)
   FROM pg_auth_members m WHERE m.member IN (SELECT oid FROM role_closure)),
 'default_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),
   'schema',n.nspname,'object_type',d.defaclobjtype,
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(d.defaclacl) x))
   ORDER BY pg_get_userbyid(d.defaclrole) COLLATE "C",n.nspname COLLATE "C" NULLS FIRST,d.defaclobjtype::text COLLATE "C"),'[]'::jsonb)
   FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
   WHERE d.defaclrole IN (SELECT oid FROM role_closure)
   AND (d.defaclnamespace=0 OR d.defaclnamespace IN (SELECT oid FROM relevant_schemas))),
 'owned_sequences',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',s.name,'relation',s.relation_name,
   'column',s.column_name,'dependency_type',s.deptype,'owner',pg_get_userbyid(s.relowner),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(s.relacl,acldefault('s',s.relowner))) x))
   ORDER BY s.name COLLATE "C",s.relation_name COLLATE "C",s.column_name COLLATE "C"),'[]'::jsonb) FROM owned_sequences s),
 'identity_media_bucket',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,
   'file_size_limit',b.file_size_limit,'allowed_mime_types',(SELECT jsonb_agg(m ORDER BY m COLLATE "C") FROM unnest(b.allowed_mime_types) m))
   ORDER BY b.id COLLATE "C"),'[]'::jsonb) FROM storage.buckets b WHERE b.id='identity-media')
) AS result FROM read_fingerprint f
)

SELECT (result-'baseline'-'format'-'kind'-'read_only'-'server_version'-'source_commit'-'user_rows_read')
 || jsonb_build_object(
  'format','selqiro-profile-editor-scope-20261120-v1',
  'accepted_read_scope_sha256',result#>'{baseline,scope_sha256}',
  'editor_schema',jsonb_build_object(
   'exists',EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='profile_editor_private'),
   'owner',(SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='profile_editor_private'),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x
     WHERE n.nspname='profile_editor_private'))
 ) AS scope FROM catalog
) captured;
 IF actual IS DISTINCT FROM '9329ce1f18934e4cb27b8fabbbc77940639e29a0d1a94ce782c2457b4574a21f' THEN
  RAISE EXCEPTION 'profile_editor_before_state_mismatch' USING ERRCODE='55000';
 END IF;
END;
$guard$;
-- Safe text/location profile editor. Applied only inside apply.sql's exact-catalog transaction.
-- No public user rows or existing media are deleted; privileges close old browser write paths.
CREATE SCHEMA profile_editor_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA profile_editor_private FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE public.identity_profiles ADD COLUMN profile_revision uuid NOT NULL DEFAULT gen_random_uuid();

CREATE FUNCTION profile_editor_private.touch_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $function$
BEGIN
 NEW.profile_revision := gen_random_uuid();
 NEW.updated_at := clock_timestamp();
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION profile_editor_private.touch_revision() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER profile_editor_revision_before_update
 BEFORE UPDATE ON public.identity_profiles FOR EACH ROW
 EXECUTE FUNCTION profile_editor_private.touch_revision();

CREATE FUNCTION profile_editor_private.lock_owner(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS public.identities LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE
 v_user uuid := auth.uid();
 v_active uuid;
 v_identity public.identities%ROWTYPE;
 v_business public.business_accounts%ROWTYPE;
 v_member public.business_members%ROWTYPE;
BEGIN
 IF v_user IS NULL OR v_user IS DISTINCT FROM p_expected_user_id THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_AUTH_CHANGED' USING ERRCODE='42501';
 END IF;
 -- Serialize the active actor before looking up or changing its profile.
 SELECT p.active_identity_id INTO v_active FROM public.profiles p WHERE p.id=v_user FOR UPDATE;
 IF NOT FOUND OR p_expected_identity_id IS NULL OR v_active IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_ACTOR_CHANGED' USING ERRCODE='42501';
 END IF;
 SELECT i.* INTO v_identity FROM public.identities i WHERE i.id=v_active FOR UPDATE;
 IF NOT FOUND OR v_identity.status IS DISTINCT FROM 'active' THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_FORBIDDEN' USING ERRCODE='42501';
 END IF;
 IF v_identity.type='private' THEN
  IF v_identity.user_id IS DISTINCT FROM v_user OR v_identity.business_account_id IS NOT NULL THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_FORBIDDEN' USING ERRCODE='42501';
  END IF;
 ELSIF v_identity.type='business' THEN
  -- A member alone cannot edit a company's public identity. Ownership and
  -- active membership are both fresh and locked through the whole operation.
  SELECT b.* INTO v_business FROM public.business_accounts b WHERE b.id=v_identity.business_account_id FOR UPDATE;
  IF NOT FOUND OR v_business.owner_user_id IS DISTINCT FROM v_user OR v_business.status IS DISTINCT FROM 'active' THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  SELECT m.* INTO v_member FROM public.business_members m
   WHERE m.business_account_id=v_business.id AND m.user_id=v_user FOR UPDATE;
  IF NOT FOUND OR v_member.status IS DISTINCT FROM 'active' THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_FORBIDDEN' USING ERRCODE='42501';
  END IF;
 ELSE
  RAISE EXCEPTION 'PROFILE_EDITOR_FORBIDDEN' USING ERRCODE='42501';
 END IF;
 RETURN v_identity;
END;
$function$;
REVOKE ALL ON FUNCTION profile_editor_private.lock_owner(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION profile_editor_private.snapshot(p_user_id uuid,p_identity public.identities,p_profile public.identity_profiles)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $function$
 SELECT jsonb_build_object(
  'user_id',p_user_id,'identity_id',p_identity.id,'identity_type',p_identity.type,
  'revision',p_profile.profile_revision,
  'display_name',coalesce(nullif(p_profile.display_name,''),p_identity.display_name,''),
  'bio',coalesce(p_profile.bio,(SELECT legacy.bio FROM public.profiles legacy WHERE p_identity.type='private' AND p_identity.user_id=p_user_id AND legacy.id=p_user_id),''),'website_url',coalesce(p_profile.website_url,''),
  'country',coalesce(p_profile.country,''),'city',coalesce(p_profile.city,''),
  'address_text',CASE WHEN p_identity.type='business' THEN coalesce(p_profile.address_text,'') ELSE '' END,
  'location_visibility',CASE
    WHEN p_profile.identity_id IS NULL THEN 'city'
    WHEN p_profile.location_visibility='city' THEN 'city'
    WHEN p_identity.type='private' AND p_profile.location_visibility='exact' THEN 'city'
    WHEN p_identity.type='business' AND p_profile.location_visibility='exact' THEN 'exact'
    ELSE 'hidden' END,
  'slug',nullif(btrim(p_profile.slug),''))
$function$;
REVOKE ALL ON FUNCTION profile_editor_private.snapshot(uuid,public.identities,public.identity_profiles) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.get_my_profile_editor_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE
 v_identity public.identities%ROWTYPE;
 v_profile public.identity_profiles%ROWTYPE;
BEGIN
 v_identity := profile_editor_private.lock_owner(p_expected_user_id,p_expected_identity_id);
 SELECT p.* INTO v_profile FROM public.identity_profiles p WHERE p.identity_id=v_identity.id FOR SHARE;
 -- Missing profile is deliberately read-only; the first explicit save creates it.
 RETURN profile_editor_private.snapshot(p_expected_user_id,v_identity,v_profile);
END;
$function$;
REVOKE ALL ON FUNCTION public.get_my_profile_editor_v1(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile_editor_v1(uuid,uuid) TO authenticated;

CREATE FUNCTION public.save_my_profile_editor_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_expected_revision uuid,p_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE
 v_identity public.identities%ROWTYPE;
 v_profile public.identity_profiles%ROWTYPE;
 v_exists boolean;
 v_name text; v_bio text; v_website text; v_country text; v_city text; v_address text; v_visibility text;
 v_authority text; v_host text; v_port text;
BEGIN
 v_identity := profile_editor_private.lock_owner(p_expected_user_id,p_expected_identity_id);
 IF p_patch IS NULL OR jsonb_typeof(p_patch) IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023';
 END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_patch))<>7
    OR EXISTS(SELECT 1 FROM jsonb_each(p_patch) x WHERE
      x.key NOT IN ('display_name','bio','website_url','country','city','address_text','location_visibility')
      OR jsonb_typeof(x.value) IS DISTINCT FROM 'string') THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023';
 END IF;
 v_name := btrim(p_patch->>'display_name');
 v_bio := btrim(replace(replace(p_patch->>'bio',E'\r\n',E'\n'),E'\r',E'\n'));
 v_website := btrim(p_patch->>'website_url');
 v_country := btrim(p_patch->>'country'); v_city := btrim(p_patch->>'city');
 v_address := btrim(p_patch->>'address_text'); v_visibility := p_patch->>'location_visibility';
 IF char_length(v_name) NOT BETWEEN 1 AND 100 OR char_length(v_bio)>2000
    OR char_length(v_website)>2048 OR char_length(v_country)>100
    OR char_length(v_city)>120 OR char_length(v_address)>240
    OR v_visibility NOT IN ('hidden','city','exact')
    OR (v_name||v_country||v_city||v_address) ~ '[[:cntrl:]]'
    OR replace(replace(v_bio,E'\n',''),E'\t','') ~ '[[:cntrl:]]' THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023';
 END IF;
 IF v_website<>'' THEN
  IF v_website !~* '^https?://' OR v_website ~ '[[:cntrl:][:space:]]' OR strpos(v_website,chr(92))>0 THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023';
  END IF;
  v_authority := (regexp_match(v_website,'^https?://([^/?#]+)','i'))[1];
  IF v_authority IS NULL OR strpos(v_authority,'@')>0 THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023';
  END IF;
  IF left(v_authority,1)='[' THEN
   IF v_authority !~ '^\[[0-9a-fA-F:.]+\](:[0-9]{1,5})?$' THEN
    RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023';
   END IF;
   v_host := substring(v_authority from '^\[([^]]+)\]');
   BEGIN PERFORM v_host::inet;
   EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023';
   END;
   v_port := substring(v_authority from '\]:([0-9]+)$');
  ELSE
   IF v_authority !~ '^[[:alnum:]]([[:alnum:].-]*[[:alnum:].])?(:[0-9]{1,5})?$' THEN
    RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023';
   END IF;
   v_host := split_part(v_authority,':',1);
   IF v_host ~ '(^|\.)-|-(\.|$)|\.\.' OR char_length(v_host)>253
      OR EXISTS(SELECT 1 FROM unnest(string_to_array(rtrim(v_host,'.'),'.')) l WHERE char_length(l)>63 OR l='') THEN
    RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023';
   END IF;
   v_port := substring(v_authority from ':([0-9]+)$');
  END IF;
  IF v_port IS NOT NULL AND v_port::integer>65535 THEN
   RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023';
  END IF;
 END IF;
 IF v_identity.type='private' AND (v_visibility='exact' OR v_address<>'') THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023';
 END IF;
 IF v_visibility='exact' AND (v_country='' OR v_city='' OR v_address='') THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_INVALID_INPUT' USING ERRCODE='22023';
 END IF;
 SELECT p.* INTO v_profile FROM public.identity_profiles p WHERE p.identity_id=v_identity.id FOR UPDATE;
 v_exists := FOUND;
 IF (v_exists AND v_profile.profile_revision IS DISTINCT FROM p_expected_revision)
    OR (NOT v_exists AND p_expected_revision IS NOT NULL) THEN
  RAISE EXCEPTION 'PROFILE_EDITOR_CONFLICT' USING ERRCODE='40001';
 END IF;
 IF v_exists THEN
  UPDATE public.identity_profiles p SET display_name=v_name,bio=v_bio,website_url=nullif(v_website,''),
   country=nullif(v_country,''),city=nullif(v_city,''),address_text=nullif(v_address,''),location_visibility=v_visibility,
   -- Old coordinates cannot describe an edited location. Private profiles never
   -- keep exact coordinates after an explicit save; no location is geocoded.
   lat=CASE WHEN v_identity.type='private' OR p.country IS DISTINCT FROM nullif(v_country,'')
     OR p.city IS DISTINCT FROM nullif(v_city,'') OR p.address_text IS DISTINCT FROM nullif(v_address,'') THEN NULL ELSE p.lat END,
   lng=CASE WHEN v_identity.type='private' OR p.country IS DISTINCT FROM nullif(v_country,'')
     OR p.city IS DISTINCT FROM nullif(v_city,'') OR p.address_text IS DISTINCT FROM nullif(v_address,'') THEN NULL ELSE p.lng END,
   slug=coalesce(nullif(btrim(p.slug),''),'profiil-'||replace(gen_random_uuid()::text,'-','')),
   updated_by_user_id=p_expected_user_id
   WHERE p.identity_id=v_identity.id RETURNING p.* INTO v_profile;
 ELSE
  INSERT INTO public.identity_profiles(identity_id,display_name,slug,bio,website_url,country,city,address_text,
    location_visibility,created_by_user_id,updated_by_user_id)
  VALUES(v_identity.id,v_name,'profiil-'||replace(gen_random_uuid()::text,'-',''),v_bio,nullif(v_website,''),
    nullif(v_country,''),nullif(v_city,''),nullif(v_address,''),v_visibility,p_expected_user_id,p_expected_user_id)
  RETURNING * INTO v_profile;
 END IF;
 UPDATE public.identities i SET display_name=v_name,updated_by=p_expected_user_id,updated_at=clock_timestamp()
 WHERE i.id=v_identity.id RETURNING i.* INTO v_identity;
 RETURN profile_editor_private.snapshot(p_expected_user_id,v_identity,v_profile);
END;
$function$;
REVOKE ALL ON FUNCTION public.save_my_profile_editor_v1(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_my_profile_editor_v1(uuid,uuid,uuid,jsonb) TO authenticated;

-- Table grants include TRUNCATE/TRIGGER/REFERENCES and bypass the intended editor
-- even when row-level policies are present. Retain all existing SELECT policies.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN ON TABLE
 public.profiles,public.identity_profiles,public.identities,public.business_accounts,
 public.business_members,public.admin_users,public.premium_invites FROM PUBLIC,anon,authenticated;
DO $revoke_columns$
DECLARE r record;
BEGIN
 FOR r IN SELECT n.nspname,c.relname,a.attname FROM pg_attribute a
  JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('profiles','identity_profiles','identities','business_accounts','business_members','admin_users','premium_invites')
  AND a.attnum>0 AND NOT a.attisdropped
 LOOP
  EXECUTE format('REVOKE INSERT (%I), UPDATE (%I), REFERENCES (%I) ON TABLE %I.%I FROM PUBLIC,anon,authenticated',
    r.attname,r.attname,r.attname,r.nspname,r.relname);
 END LOOP;
END;
$revoke_columns$;

-- These existing account operations stay direct, constrained by the accepted
-- owner RLS and active-identity validation trigger. Protected columns stay closed.
GRANT INSERT(id,email,language) ON public.profiles TO authenticated;
GRANT UPDATE(language,active_identity_id) ON public.profiles TO authenticated;
-- Minimal initial identity/company rows retain their existing safe defaults.
-- No UPDATE, media, paid, verification, status or authority reassignment grant.
GRANT INSERT(type,user_id,business_account_id,display_name,created_by,updated_by) ON public.identities TO authenticated;
-- Initial company identities cannot attach an unrelated private account. The
-- accepted owner RLS still authorizes the private owner or company owner.
CREATE POLICY profile_editor_identity_bootstrap_owner_shape ON public.identities
 AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (
  (type='private' AND user_id=auth.uid() AND business_account_id IS NULL)
  OR (type='business' AND user_id IS NULL AND business_account_id IS NOT NULL));

GRANT INSERT(owner_user_id,name,slug,description,created_by,updated_by) ON public.business_accounts TO authenticated;
GRANT INSERT(business_account_id,user_id,invited_by) ON public.business_members TO authenticated;

REVOKE ALL ON FUNCTION public.save_my_active_identity_profile(text,text,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.update_my_active_identity_location(text,text,double precision,double precision)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_premium_invite(integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.claim_premium_invite(text) FROM PUBLIC,anon,authenticated;

DO $guard$
DECLARE actual text;
BEGIN
 SELECT encode(sha256(convert_to(scope::text,'UTF8')),'hex') INTO actual FROM (-- Exact accepted read state plus bounded writer metadata; no application rows.
WITH catalog AS MATERIALIZED (
WITH RECURSIVE read_scope AS MATERIALIZED (
-- Textual array ordering is explicitly bytewise (C), independent of the
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
) AS scope FROM inventory i
),
read_fingerprint AS MATERIALIZED (
 SELECT scope,encode(sha256(convert_to(scope::text,'UTF8')),'hex') AS sha256 FROM read_scope
), wanted_relations(name) AS (VALUES
 ('public.profiles'),('public.identity_profiles'),('public.identities'),
 ('public.business_accounts'),('public.business_members'),
 ('public.admin_users'),('public.premium_invites')
), relations AS MATERIALIZED (
 SELECT w.name,c.* FROM wanted_relations w LEFT JOIN pg_class c ON c.oid=to_regclass(w.name)
), actors AS MATERIALIZED (
 SELECT oid,rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')
), auth_users AS MATERIALIZED (
 SELECT c.* FROM pg_class c WHERE c.oid=to_regclass('auth.users')
), triggers AS MATERIALIZED (
 SELECT t.*,n.nspname||'.'||c.relname AS relation_name
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE NOT t.tgisinternal
 AND (t.tgrelid IN (SELECT oid FROM relations) OR t.tgrelid IN (SELECT oid FROM auth_users))
), known_functions(name) AS (VALUES
 ('public.save_my_active_identity_profile'),('public.update_my_active_identity_location'),
 ('public.get_my_active_identity_profile'),('public.get_my_active_identity_profile_details'),
 ('public.get_my_identities'),('public.current_user_has_identity_access'),
 ('public.user_has_identity_access_v2'),('public.require_my_active_identity_v2'),
 ('public.set_my_active_identity_v2'),('public.validate_profile_active_identity_v2'),
 ('public.is_business_member'),('public.admin_set_identity_plan'),('public.is_admin'),
 ('public.claim_premium_invite'),('public.create_premium_invite'),
 ('profile_editor_private.lock_owner'),('profile_editor_private.snapshot'),('profile_editor_private.touch_revision'),('public.get_my_profile_editor_v1'),('public.save_my_profile_editor_v1')
), helper_names(name) AS (VALUES
 ('save_my_active_identity_profile'),('update_my_active_identity_location'),
 ('set_my_active_identity_v2'),('admin_set_identity_plan'),('is_admin'),
 ('claim_premium_invite'),('create_premium_invite'),
 ('get_my_profile_editor_v1'),('save_my_profile_editor_v1'),('profile_editor_private')
), routine_candidates AS MATERIALIZED (
 SELECT p.*,n.nspname AS schema_name,n.nspname||'.'||p.proname AS name,
  n.nspname||'.'||p.proname IN (SELECT name FROM known_functions) AS known_name,
  p.oid IN (SELECT tgfoid FROM triggers) AS attached_trigger,
  ARRAY(SELECT r.name FROM relations r
    WHERE p.prosrc ~* ('\m'||split_part(r.name,'.',2)||'\M') ORDER BY r.name COLLATE "C") AS source_relations,
  ARRAY(SELECT r.name FROM relations r WHERE EXISTS(
    SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid
    AND d.refclassid='pg_class'::regclass AND d.refobjid=r.oid) ORDER BY r.name COLLATE "C") AS relation_dependencies,
  ARRAY(SELECT h.name FROM helper_names h WHERE p.prosrc ~* ('\m'||h.name||'\M') ORDER BY h.name COLLATE "C") AS source_helpers,
  ARRAY(SELECT q.oid::regprocedure::text FROM pg_proc q JOIN pg_namespace qn ON qn.oid=q.pronamespace
    WHERE qn.nspname||'.'||q.proname IN (SELECT name FROM known_functions)
    AND EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid
      AND d.refclassid='pg_proc'::regclass AND d.refobjid=q.oid)
    ORDER BY q.oid::regprocedure::text COLLATE "C") AS function_dependencies
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE p.prokind IN ('f','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
 AND n.nspname NOT LIKE 'pg_temp_%' AND n.nspname NOT LIKE 'pg_toast%'
), selected_routines AS MATERIALIZED (
 SELECT * FROM routine_candidates p WHERE p.known_name OR p.attached_trigger
 OR cardinality(p.source_relations)>0 OR cardinality(p.relation_dependencies)>0
 OR cardinality(p.source_helpers)>0 OR cardinality(p.function_dependencies)>0
), routines AS MATERIALIZED (
 -- Overflow is explicit and rejected by the parser; it is never silently accepted.
 SELECT * FROM selected_routines ORDER BY name COLLATE "C",oid::regprocedure::text COLLATE "C" LIMIT 513
), related_views AS MATERIALIZED (
 SELECT DISTINCT v.oid,n.nspname||'.'||v.relname AS name,v.relowner,v.reloptions,v.relacl,v.relkind
 FROM pg_class v JOIN pg_namespace n ON n.oid=v.relnamespace
 JOIN pg_rewrite rw ON rw.ev_class=v.oid
 JOIN pg_depend d ON d.classid='pg_rewrite'::regclass AND d.objid=rw.oid
 WHERE v.relkind IN ('v','m') AND d.refclassid='pg_class'::regclass
 AND d.refobjid IN (SELECT oid FROM relations) AND v.oid<>d.refobjid
), relevant_schemas AS MATERIALIZED (
 SELECT n.* FROM pg_namespace n WHERE n.nspname IN ('public','auth','storage')
 OR n.oid IN (SELECT pronamespace FROM routines)
), role_seeds(oid) AS (
 SELECT oid FROM actors UNION SELECT relowner FROM relations WHERE oid IS NOT NULL
 UNION SELECT proowner FROM routines UNION SELECT relowner FROM related_views
 UNION SELECT nspowner FROM relevant_schemas
 UNION SELECT x.grantee FROM relations r CROSS JOIN LATERAL aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM routines p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM related_views v CROSS JOIN LATERAL aclexplode(coalesce(v.relacl,acldefault('r',v.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM relevant_schemas n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE x.grantee<>0
 UNION SELECT relowner FROM owned_sequences
 UNION SELECT x.grantee FROM owned_sequences s CROSS JOIN LATERAL aclexplode(coalesce(s.relacl,acldefault('s',s.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
   WHERE a.attrelid IN (SELECT oid FROM relations) AND a.attnum>0 AND NOT a.attisdropped AND x.grantee<>0
), role_closure(oid) AS (
 SELECT oid FROM role_seeds UNION SELECT m.roleid FROM pg_auth_members m JOIN role_closure c ON c.oid=m.member
), owned_sequences AS MATERIALIZED (
 SELECT s.oid,n.nspname||'.'||s.relname AS name,s.relowner,s.relacl,r.name AS relation_name,a.attname AS column_name,d.deptype
 FROM pg_class s JOIN pg_namespace n ON n.oid=s.relnamespace
 JOIN pg_depend d ON d.classid='pg_class'::regclass AND d.objid=s.oid
 JOIN relations r ON d.refclassid='pg_class'::regclass AND r.oid=d.refobjid
 JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum=d.refobjsubid
 WHERE s.relkind='S' AND d.deptype IN ('a','i') AND NOT a.attisdropped
)
SELECT jsonb_build_object(
 'format','selqiro-profile-write-catalog-20261120-v1',
 'kind','profile_write_catalog','read_only',current_setting('transaction_read_only'),
 'user_rows_read',false,'source_commit','d6540333c6a1eace53bfac616c1041a8bd238806',
 'server_version',current_setting('server_version'),'current_role',current_user,
 'baseline',jsonb_build_object('expected_sha256','7ec206ef204821ff096d37043d6086cdf1a2165cfe968aea9b7bba3b4deb470f',
   'scope_sha256',f.sha256,'matched',f.sha256='7ec206ef204821ff096d37043d6086cdf1a2165cfe968aea9b7bba3b4deb470f'),
 'fixed_settings_unfiltered',(f.scope->>'fixed_settings_unfiltered')::boolean
   AND has_table_privilege(current_user,'storage.buckets','SELECT')
   AND NOT row_security_active('storage.buckets'::regclass),
 'hosted_context',f.scope->'hosted_context',
 'auth_users',jsonb_build_object('exists',EXISTS(SELECT 1 FROM auth_users),
   'kind',(SELECT relkind FROM auth_users),'owner',(SELECT pg_get_userbyid(relowner) FROM auth_users),
   'rls',(SELECT relrowsecurity FROM auth_users),'forced',(SELECT relforcerowsecurity FROM auth_users)),
 'relations',(SELECT jsonb_agg(jsonb_build_object(
   'name',r.name,'exists',r.oid IS NOT NULL,'kind',r.relkind,'owner',pg_get_userbyid(r.relowner),
   'rls',r.relrowsecurity,'forced',r.relforcerowsecurity,
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) x),
   'effective',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,
     'select',has_table_privilege(a.oid,r.oid,'SELECT'),'insert',has_table_privilege(a.oid,r.oid,'INSERT'),
     'update',has_table_privilege(a.oid,r.oid,'UPDATE'),'delete',has_table_privilege(a.oid,r.oid,'DELETE'))
     ORDER BY a.rolname COLLATE "C") FROM actors a),
   'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object(
     'name',c.attname,'position',c.attnum,'type',format_type(c.atttypid,c.atttypmod),'not_null',c.attnotnull,
     'identity',c.attidentity,'generated',c.attgenerated,'default_expression',pg_get_expr(d.adbin,d.adrelid),
     'default_sha256',CASE WHEN d.oid IS NULL THEN NULL ELSE encode(sha256(convert_to(pg_get_expr(d.adbin,d.adrelid),'UTF8')),'hex') END,
     'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
       'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
       'privilege',x.privilege_type,'grantable',x.is_grantable)
       ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb) FROM aclexplode(c.attacl) x),
     'effective',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,
       'select',has_column_privilege(a.oid,r.oid,c.attnum,'SELECT'),
       'insert',has_column_privilege(a.oid,r.oid,c.attnum,'INSERT'),
       'update',has_column_privilege(a.oid,r.oid,c.attnum,'UPDATE')) ORDER BY a.rolname COLLATE "C") FROM actors a))
     ORDER BY c.attnum),'[]'::jsonb) FROM pg_attribute c LEFT JOIN pg_attrdef d ON d.adrelid=c.attrelid AND d.adnum=c.attnum
     WHERE c.attrelid=r.oid AND c.attnum>0 AND NOT c.attisdropped),
   'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
     'roles',(SELECT jsonb_agg(v.name ORDER BY v.name COLLATE "C") FROM (
       SELECT CASE WHEN u=0 THEN 'PUBLIC' ELSE pg_get_userbyid(u) END AS name FROM unnest(p.polroles) u) v),
     'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname COLLATE "C"),'[]'::jsonb)
     FROM pg_policy p WHERE p.polrelid=r.oid),
   'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.conname,'type',c.contype,
     'definition',pg_get_constraintdef(c.oid),'definition_sha256',encode(sha256(convert_to(pg_get_constraintdef(c.oid),'UTF8')),'hex'),
     'deferrable',c.condeferrable,'initially_deferred',c.condeferred,'validated',c.convalidated,
     'referenced_relation',CASE WHEN c.confrelid=0 THEN NULL ELSE c.confrelid::regclass::text END)
     ORDER BY c.conname COLLATE "C"),'[]'::jsonb) FROM pg_constraint c WHERE c.conrelid=r.oid AND c.contype<>'n'),
   'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,
     'unique',i.indisunique,'valid',i.indisvalid,'ready',i.indisready,
     'definition',pg_get_indexdef(i.indexrelid),'definition_sha256',encode(sha256(convert_to(pg_get_indexdef(i.indexrelid),'UTF8')),'hex'))
     ORDER BY i.indexrelid::regclass::text COLLATE "C"),'[]'::jsonb) FROM pg_index i WHERE i.indrelid=r.oid)
 ) ORDER BY r.name COLLATE "C") FROM relations r),
 'routine_census',jsonb_build_object('method','profile_editor_known_names_triggers_dependencies_source_and_helper_tokens_v1',
   'dynamic_sql_complete',false,'external_auth_hooks_checked',false,'maximum',512,
   'matched_count',(SELECT count(*) FROM selected_routines),
   'overflow',(SELECT count(*)>512 FROM selected_routines)),
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
   'name',p.name,'signature',p.oid::regprocedure::text,'kind',p.prokind,
   'owner',pg_get_userbyid(p.proowner),'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,
   'result',CASE WHEN p.prokind='p' THEN NULL ELSE pg_get_function_result(p.oid) END,
   'search_path',(SELECT x FROM unnest(p.proconfig) x WHERE x LIKE 'search_path=%' ORDER BY x COLLATE "C" LIMIT 1),
   'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
   'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
   'known_name',p.known_name,'attached_trigger',p.attached_trigger,
   'source_relations',to_jsonb(p.source_relations),'relation_dependencies',to_jsonb(p.relation_dependencies),
   'source_helpers',to_jsonb(p.source_helpers),'function_dependencies',to_jsonb(p.function_dependencies),
   'write_keyword_observed',p.prosrc ~* '\m(insert|update|delete|merge|truncate)\M',
   'execute_keyword_observed',p.prosrc ~* '\mexecute\M',
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x),
   'effective_execute',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,'execute',has_function_privilege(a.oid,p.oid,'EXECUTE'))
     ORDER BY a.rolname COLLATE "C") FROM actors a)) ORDER BY p.name COLLATE "C",p.oid::regprocedure::text COLLATE "C"),'[]'::jsonb)
   FROM routines p JOIN pg_language l ON l.oid=p.prolang),
 'missing_function_names',(SELECT coalesce(jsonb_agg(w.name ORDER BY w.name COLLATE "C"),'[]'::jsonb)
   FROM known_functions w WHERE NOT EXISTS(SELECT 1 FROM routines p WHERE p.name=w.name)),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.relation_name,'name',t.tgname,
   'enabled',t.tgenabled,'event_mask',t.tgtype,'function',t.tgfoid::regprocedure::text,
   'columns',(SELECT coalesce(jsonb_agg(a.attname ORDER BY a.attname COLLATE "C"),'[]'::jsonb)
     FROM pg_attribute a WHERE a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr) AND NOT a.attisdropped),
   'argument_count',t.tgnargs,'arguments_sha256',encode(sha256(t.tgargs),'hex'),
   'when_sha256',CASE WHEN t.tgqual IS NULL THEN NULL ELSE encode(sha256(convert_to(t.tgqual::text,'UTF8')),'hex') END,
   'constraint',t.tgconstraint<>0,'deferrable',t.tgdeferrable,'initially_deferred',t.tginitdeferred,
   'definition_sha256',encode(sha256(convert_to(pg_get_triggerdef(t.oid),'UTF8')),'hex'))
   ORDER BY t.relation_name COLLATE "C",t.tgname COLLATE "C"),'[]'::jsonb) FROM triggers t),
 'related_views',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',v.name,'kind',v.relkind,
   'owner',pg_get_userbyid(v.relowner),'options',(SELECT jsonb_agg(o ORDER BY o COLLATE "C") FROM unnest(v.reloptions) o),
   'definition_sha256',encode(sha256(convert_to(pg_get_viewdef(v.oid,true),'UTF8')),'hex'),
   'updatable_mask',pg_relation_is_updatable(v.oid,false),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(v.relacl,acldefault('r',v.relowner))) x),
   'effective',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,
     'select',has_any_column_privilege(a.oid,v.oid,'SELECT'),'insert',has_any_column_privilege(a.oid,v.oid,'INSERT'),
     'update',has_any_column_privilege(a.oid,v.oid,'UPDATE'),'delete',has_table_privilege(a.oid,v.oid,'DELETE'))
     ORDER BY a.rolname COLLATE "C") FROM actors a)) ORDER BY v.name COLLATE "C"),'[]'::jsonb) FROM related_views v),
 'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.name,'name',w.rulename,'enabled',w.ev_enabled,
   'event',w.ev_type,'instead',w.is_instead,
   'definition_sha256',encode(sha256(convert_to(pg_get_ruledef(w.oid),'UTF8')),'hex'))
   ORDER BY r.name COLLATE "C",w.rulename COLLATE "C"),'[]'::jsonb)
   FROM pg_rewrite w JOIN relations r ON r.oid=w.ev_class WHERE w.rulename<>'_RETURN'),
 'schemas',(SELECT jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x),
   'effective',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,'usage',has_schema_privilege(a.oid,n.oid,'USAGE'),
     'create',has_schema_privilege(a.oid,n.oid,'CREATE')) ORDER BY a.rolname COLLATE "C") FROM actors a))
   ORDER BY n.nspname COLLATE "C") FROM relevant_schemas n),
 'roles',(SELECT jsonb_agg(jsonb_build_object('name',r.rolname,'superuser',r.rolsuper,'inherit',r.rolinherit,
   'bypass_rls',r.rolbypassrls,'create_role',r.rolcreaterole,'create_db',r.rolcreatedb,'can_login',r.rolcanlogin)
   ORDER BY r.rolname COLLATE "C") FROM pg_roles r WHERE r.oid IN (SELECT oid FROM role_closure)),
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('member',pg_get_userbyid(m.member),
   'role',pg_get_userbyid(m.roleid),'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,
   'inherit',(to_jsonb(m)->'inherit_option'),'set',(to_jsonb(m)->'set_option'))
   ORDER BY pg_get_userbyid(m.member) COLLATE "C",pg_get_userbyid(m.roleid) COLLATE "C",pg_get_userbyid(m.grantor) COLLATE "C"),'[]'::jsonb)
   FROM pg_auth_members m WHERE m.member IN (SELECT oid FROM role_closure)),
 'default_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),
   'schema',n.nspname,'object_type',d.defaclobjtype,
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(d.defaclacl) x))
   ORDER BY pg_get_userbyid(d.defaclrole) COLLATE "C",n.nspname COLLATE "C" NULLS FIRST,d.defaclobjtype::text COLLATE "C"),'[]'::jsonb)
   FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
   WHERE d.defaclrole IN (SELECT oid FROM role_closure)
   AND (d.defaclnamespace=0 OR d.defaclnamespace IN (SELECT oid FROM relevant_schemas))),
 'owned_sequences',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',s.name,'relation',s.relation_name,
   'column',s.column_name,'dependency_type',s.deptype,'owner',pg_get_userbyid(s.relowner),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(s.relacl,acldefault('s',s.relowner))) x))
   ORDER BY s.name COLLATE "C",s.relation_name COLLATE "C",s.column_name COLLATE "C"),'[]'::jsonb) FROM owned_sequences s),
 'identity_media_bucket',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,
   'file_size_limit',b.file_size_limit,'allowed_mime_types',(SELECT jsonb_agg(m ORDER BY m COLLATE "C") FROM unnest(b.allowed_mime_types) m))
   ORDER BY b.id COLLATE "C"),'[]'::jsonb) FROM storage.buckets b WHERE b.id='identity-media')
) AS result FROM read_fingerprint f
)

SELECT (result-'baseline'-'format'-'kind'-'read_only'-'server_version'-'source_commit'-'user_rows_read')
 || jsonb_build_object(
  'format','selqiro-profile-editor-scope-20261120-v1',
  'accepted_read_scope_sha256',result#>'{baseline,scope_sha256}',
  'editor_schema',jsonb_build_object(
   'exists',EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='profile_editor_private'),
   'owner',(SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='profile_editor_private'),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x
     WHERE n.nspname='profile_editor_private'))
 ) AS scope FROM catalog
) captured;
 IF actual IS DISTINCT FROM 'ecc5f60c52f42b3d1f67dae5bed0b0fefef2c38b51cdd0e03d3e59a534c454b5' THEN
  RAISE EXCEPTION 'profile_editor_after_state_mismatch' USING ERRCODE='55000';
 END IF;
END;
$guard$;
WITH captured AS MATERIALIZED (-- Exact accepted read state plus bounded writer metadata; no application rows.
WITH catalog AS MATERIALIZED (
WITH RECURSIVE read_scope AS MATERIALIZED (
-- Textual array ordering is explicitly bytewise (C), independent of the
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
) AS scope FROM inventory i
),
read_fingerprint AS MATERIALIZED (
 SELECT scope,encode(sha256(convert_to(scope::text,'UTF8')),'hex') AS sha256 FROM read_scope
), wanted_relations(name) AS (VALUES
 ('public.profiles'),('public.identity_profiles'),('public.identities'),
 ('public.business_accounts'),('public.business_members'),
 ('public.admin_users'),('public.premium_invites')
), relations AS MATERIALIZED (
 SELECT w.name,c.* FROM wanted_relations w LEFT JOIN pg_class c ON c.oid=to_regclass(w.name)
), actors AS MATERIALIZED (
 SELECT oid,rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')
), auth_users AS MATERIALIZED (
 SELECT c.* FROM pg_class c WHERE c.oid=to_regclass('auth.users')
), triggers AS MATERIALIZED (
 SELECT t.*,n.nspname||'.'||c.relname AS relation_name
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE NOT t.tgisinternal
 AND (t.tgrelid IN (SELECT oid FROM relations) OR t.tgrelid IN (SELECT oid FROM auth_users))
), known_functions(name) AS (VALUES
 ('public.save_my_active_identity_profile'),('public.update_my_active_identity_location'),
 ('public.get_my_active_identity_profile'),('public.get_my_active_identity_profile_details'),
 ('public.get_my_identities'),('public.current_user_has_identity_access'),
 ('public.user_has_identity_access_v2'),('public.require_my_active_identity_v2'),
 ('public.set_my_active_identity_v2'),('public.validate_profile_active_identity_v2'),
 ('public.is_business_member'),('public.admin_set_identity_plan'),('public.is_admin'),
 ('public.claim_premium_invite'),('public.create_premium_invite'),
 ('profile_editor_private.lock_owner'),('profile_editor_private.snapshot'),('profile_editor_private.touch_revision'),('public.get_my_profile_editor_v1'),('public.save_my_profile_editor_v1')
), helper_names(name) AS (VALUES
 ('save_my_active_identity_profile'),('update_my_active_identity_location'),
 ('set_my_active_identity_v2'),('admin_set_identity_plan'),('is_admin'),
 ('claim_premium_invite'),('create_premium_invite'),
 ('get_my_profile_editor_v1'),('save_my_profile_editor_v1'),('profile_editor_private')
), routine_candidates AS MATERIALIZED (
 SELECT p.*,n.nspname AS schema_name,n.nspname||'.'||p.proname AS name,
  n.nspname||'.'||p.proname IN (SELECT name FROM known_functions) AS known_name,
  p.oid IN (SELECT tgfoid FROM triggers) AS attached_trigger,
  ARRAY(SELECT r.name FROM relations r
    WHERE p.prosrc ~* ('\m'||split_part(r.name,'.',2)||'\M') ORDER BY r.name COLLATE "C") AS source_relations,
  ARRAY(SELECT r.name FROM relations r WHERE EXISTS(
    SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid
    AND d.refclassid='pg_class'::regclass AND d.refobjid=r.oid) ORDER BY r.name COLLATE "C") AS relation_dependencies,
  ARRAY(SELECT h.name FROM helper_names h WHERE p.prosrc ~* ('\m'||h.name||'\M') ORDER BY h.name COLLATE "C") AS source_helpers,
  ARRAY(SELECT q.oid::regprocedure::text FROM pg_proc q JOIN pg_namespace qn ON qn.oid=q.pronamespace
    WHERE qn.nspname||'.'||q.proname IN (SELECT name FROM known_functions)
    AND EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid
      AND d.refclassid='pg_proc'::regclass AND d.refobjid=q.oid)
    ORDER BY q.oid::regprocedure::text COLLATE "C") AS function_dependencies
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE p.prokind IN ('f','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
 AND n.nspname NOT LIKE 'pg_temp_%' AND n.nspname NOT LIKE 'pg_toast%'
), selected_routines AS MATERIALIZED (
 SELECT * FROM routine_candidates p WHERE p.known_name OR p.attached_trigger
 OR cardinality(p.source_relations)>0 OR cardinality(p.relation_dependencies)>0
 OR cardinality(p.source_helpers)>0 OR cardinality(p.function_dependencies)>0
), routines AS MATERIALIZED (
 -- Overflow is explicit and rejected by the parser; it is never silently accepted.
 SELECT * FROM selected_routines ORDER BY name COLLATE "C",oid::regprocedure::text COLLATE "C" LIMIT 513
), related_views AS MATERIALIZED (
 SELECT DISTINCT v.oid,n.nspname||'.'||v.relname AS name,v.relowner,v.reloptions,v.relacl,v.relkind
 FROM pg_class v JOIN pg_namespace n ON n.oid=v.relnamespace
 JOIN pg_rewrite rw ON rw.ev_class=v.oid
 JOIN pg_depend d ON d.classid='pg_rewrite'::regclass AND d.objid=rw.oid
 WHERE v.relkind IN ('v','m') AND d.refclassid='pg_class'::regclass
 AND d.refobjid IN (SELECT oid FROM relations) AND v.oid<>d.refobjid
), relevant_schemas AS MATERIALIZED (
 SELECT n.* FROM pg_namespace n WHERE n.nspname IN ('public','auth','storage')
 OR n.oid IN (SELECT pronamespace FROM routines)
), role_seeds(oid) AS (
 SELECT oid FROM actors UNION SELECT relowner FROM relations WHERE oid IS NOT NULL
 UNION SELECT proowner FROM routines UNION SELECT relowner FROM related_views
 UNION SELECT nspowner FROM relevant_schemas
 UNION SELECT x.grantee FROM relations r CROSS JOIN LATERAL aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM routines p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM related_views v CROSS JOIN LATERAL aclexplode(coalesce(v.relacl,acldefault('r',v.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM relevant_schemas n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE x.grantee<>0
 UNION SELECT relowner FROM owned_sequences
 UNION SELECT x.grantee FROM owned_sequences s CROSS JOIN LATERAL aclexplode(coalesce(s.relacl,acldefault('s',s.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
   WHERE a.attrelid IN (SELECT oid FROM relations) AND a.attnum>0 AND NOT a.attisdropped AND x.grantee<>0
), role_closure(oid) AS (
 SELECT oid FROM role_seeds UNION SELECT m.roleid FROM pg_auth_members m JOIN role_closure c ON c.oid=m.member
), owned_sequences AS MATERIALIZED (
 SELECT s.oid,n.nspname||'.'||s.relname AS name,s.relowner,s.relacl,r.name AS relation_name,a.attname AS column_name,d.deptype
 FROM pg_class s JOIN pg_namespace n ON n.oid=s.relnamespace
 JOIN pg_depend d ON d.classid='pg_class'::regclass AND d.objid=s.oid
 JOIN relations r ON d.refclassid='pg_class'::regclass AND r.oid=d.refobjid
 JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum=d.refobjsubid
 WHERE s.relkind='S' AND d.deptype IN ('a','i') AND NOT a.attisdropped
)
SELECT jsonb_build_object(
 'format','selqiro-profile-write-catalog-20261120-v1',
 'kind','profile_write_catalog','read_only',current_setting('transaction_read_only'),
 'user_rows_read',false,'source_commit','d6540333c6a1eace53bfac616c1041a8bd238806',
 'server_version',current_setting('server_version'),'current_role',current_user,
 'baseline',jsonb_build_object('expected_sha256','7ec206ef204821ff096d37043d6086cdf1a2165cfe968aea9b7bba3b4deb470f',
   'scope_sha256',f.sha256,'matched',f.sha256='7ec206ef204821ff096d37043d6086cdf1a2165cfe968aea9b7bba3b4deb470f'),
 'fixed_settings_unfiltered',(f.scope->>'fixed_settings_unfiltered')::boolean
   AND has_table_privilege(current_user,'storage.buckets','SELECT')
   AND NOT row_security_active('storage.buckets'::regclass),
 'hosted_context',f.scope->'hosted_context',
 'auth_users',jsonb_build_object('exists',EXISTS(SELECT 1 FROM auth_users),
   'kind',(SELECT relkind FROM auth_users),'owner',(SELECT pg_get_userbyid(relowner) FROM auth_users),
   'rls',(SELECT relrowsecurity FROM auth_users),'forced',(SELECT relforcerowsecurity FROM auth_users)),
 'relations',(SELECT jsonb_agg(jsonb_build_object(
   'name',r.name,'exists',r.oid IS NOT NULL,'kind',r.relkind,'owner',pg_get_userbyid(r.relowner),
   'rls',r.relrowsecurity,'forced',r.relforcerowsecurity,
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) x),
   'effective',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,
     'select',has_table_privilege(a.oid,r.oid,'SELECT'),'insert',has_table_privilege(a.oid,r.oid,'INSERT'),
     'update',has_table_privilege(a.oid,r.oid,'UPDATE'),'delete',has_table_privilege(a.oid,r.oid,'DELETE'))
     ORDER BY a.rolname COLLATE "C") FROM actors a),
   'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object(
     'name',c.attname,'position',c.attnum,'type',format_type(c.atttypid,c.atttypmod),'not_null',c.attnotnull,
     'identity',c.attidentity,'generated',c.attgenerated,'default_expression',pg_get_expr(d.adbin,d.adrelid),
     'default_sha256',CASE WHEN d.oid IS NULL THEN NULL ELSE encode(sha256(convert_to(pg_get_expr(d.adbin,d.adrelid),'UTF8')),'hex') END,
     'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
       'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
       'privilege',x.privilege_type,'grantable',x.is_grantable)
       ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb) FROM aclexplode(c.attacl) x),
     'effective',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,
       'select',has_column_privilege(a.oid,r.oid,c.attnum,'SELECT'),
       'insert',has_column_privilege(a.oid,r.oid,c.attnum,'INSERT'),
       'update',has_column_privilege(a.oid,r.oid,c.attnum,'UPDATE')) ORDER BY a.rolname COLLATE "C") FROM actors a))
     ORDER BY c.attnum),'[]'::jsonb) FROM pg_attribute c LEFT JOIN pg_attrdef d ON d.adrelid=c.attrelid AND d.adnum=c.attnum
     WHERE c.attrelid=r.oid AND c.attnum>0 AND NOT c.attisdropped),
   'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
     'roles',(SELECT jsonb_agg(v.name ORDER BY v.name COLLATE "C") FROM (
       SELECT CASE WHEN u=0 THEN 'PUBLIC' ELSE pg_get_userbyid(u) END AS name FROM unnest(p.polroles) u) v),
     'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname COLLATE "C"),'[]'::jsonb)
     FROM pg_policy p WHERE p.polrelid=r.oid),
   'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.conname,'type',c.contype,
     'definition',pg_get_constraintdef(c.oid),'definition_sha256',encode(sha256(convert_to(pg_get_constraintdef(c.oid),'UTF8')),'hex'),
     'deferrable',c.condeferrable,'initially_deferred',c.condeferred,'validated',c.convalidated,
     'referenced_relation',CASE WHEN c.confrelid=0 THEN NULL ELSE c.confrelid::regclass::text END)
     ORDER BY c.conname COLLATE "C"),'[]'::jsonb) FROM pg_constraint c WHERE c.conrelid=r.oid AND c.contype<>'n'),
   'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,
     'unique',i.indisunique,'valid',i.indisvalid,'ready',i.indisready,
     'definition',pg_get_indexdef(i.indexrelid),'definition_sha256',encode(sha256(convert_to(pg_get_indexdef(i.indexrelid),'UTF8')),'hex'))
     ORDER BY i.indexrelid::regclass::text COLLATE "C"),'[]'::jsonb) FROM pg_index i WHERE i.indrelid=r.oid)
 ) ORDER BY r.name COLLATE "C") FROM relations r),
 'routine_census',jsonb_build_object('method','profile_editor_known_names_triggers_dependencies_source_and_helper_tokens_v1',
   'dynamic_sql_complete',false,'external_auth_hooks_checked',false,'maximum',512,
   'matched_count',(SELECT count(*) FROM selected_routines),
   'overflow',(SELECT count(*)>512 FROM selected_routines)),
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
   'name',p.name,'signature',p.oid::regprocedure::text,'kind',p.prokind,
   'owner',pg_get_userbyid(p.proowner),'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,
   'result',CASE WHEN p.prokind='p' THEN NULL ELSE pg_get_function_result(p.oid) END,
   'search_path',(SELECT x FROM unnest(p.proconfig) x WHERE x LIKE 'search_path=%' ORDER BY x COLLATE "C" LIMIT 1),
   'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
   'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
   'known_name',p.known_name,'attached_trigger',p.attached_trigger,
   'source_relations',to_jsonb(p.source_relations),'relation_dependencies',to_jsonb(p.relation_dependencies),
   'source_helpers',to_jsonb(p.source_helpers),'function_dependencies',to_jsonb(p.function_dependencies),
   'write_keyword_observed',p.prosrc ~* '\m(insert|update|delete|merge|truncate)\M',
   'execute_keyword_observed',p.prosrc ~* '\mexecute\M',
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x),
   'effective_execute',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,'execute',has_function_privilege(a.oid,p.oid,'EXECUTE'))
     ORDER BY a.rolname COLLATE "C") FROM actors a)) ORDER BY p.name COLLATE "C",p.oid::regprocedure::text COLLATE "C"),'[]'::jsonb)
   FROM routines p JOIN pg_language l ON l.oid=p.prolang),
 'missing_function_names',(SELECT coalesce(jsonb_agg(w.name ORDER BY w.name COLLATE "C"),'[]'::jsonb)
   FROM known_functions w WHERE NOT EXISTS(SELECT 1 FROM routines p WHERE p.name=w.name)),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.relation_name,'name',t.tgname,
   'enabled',t.tgenabled,'event_mask',t.tgtype,'function',t.tgfoid::regprocedure::text,
   'columns',(SELECT coalesce(jsonb_agg(a.attname ORDER BY a.attname COLLATE "C"),'[]'::jsonb)
     FROM pg_attribute a WHERE a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr) AND NOT a.attisdropped),
   'argument_count',t.tgnargs,'arguments_sha256',encode(sha256(t.tgargs),'hex'),
   'when_sha256',CASE WHEN t.tgqual IS NULL THEN NULL ELSE encode(sha256(convert_to(t.tgqual::text,'UTF8')),'hex') END,
   'constraint',t.tgconstraint<>0,'deferrable',t.tgdeferrable,'initially_deferred',t.tginitdeferred,
   'definition_sha256',encode(sha256(convert_to(pg_get_triggerdef(t.oid),'UTF8')),'hex'))
   ORDER BY t.relation_name COLLATE "C",t.tgname COLLATE "C"),'[]'::jsonb) FROM triggers t),
 'related_views',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',v.name,'kind',v.relkind,
   'owner',pg_get_userbyid(v.relowner),'options',(SELECT jsonb_agg(o ORDER BY o COLLATE "C") FROM unnest(v.reloptions) o),
   'definition_sha256',encode(sha256(convert_to(pg_get_viewdef(v.oid,true),'UTF8')),'hex'),
   'updatable_mask',pg_relation_is_updatable(v.oid,false),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(v.relacl,acldefault('r',v.relowner))) x),
   'effective',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,
     'select',has_any_column_privilege(a.oid,v.oid,'SELECT'),'insert',has_any_column_privilege(a.oid,v.oid,'INSERT'),
     'update',has_any_column_privilege(a.oid,v.oid,'UPDATE'),'delete',has_table_privilege(a.oid,v.oid,'DELETE'))
     ORDER BY a.rolname COLLATE "C") FROM actors a)) ORDER BY v.name COLLATE "C"),'[]'::jsonb) FROM related_views v),
 'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.name,'name',w.rulename,'enabled',w.ev_enabled,
   'event',w.ev_type,'instead',w.is_instead,
   'definition_sha256',encode(sha256(convert_to(pg_get_ruledef(w.oid),'UTF8')),'hex'))
   ORDER BY r.name COLLATE "C",w.rulename COLLATE "C"),'[]'::jsonb)
   FROM pg_rewrite w JOIN relations r ON r.oid=w.ev_class WHERE w.rulename<>'_RETURN'),
 'schemas',(SELECT jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x),
   'effective',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,'usage',has_schema_privilege(a.oid,n.oid,'USAGE'),
     'create',has_schema_privilege(a.oid,n.oid,'CREATE')) ORDER BY a.rolname COLLATE "C") FROM actors a))
   ORDER BY n.nspname COLLATE "C") FROM relevant_schemas n),
 'roles',(SELECT jsonb_agg(jsonb_build_object('name',r.rolname,'superuser',r.rolsuper,'inherit',r.rolinherit,
   'bypass_rls',r.rolbypassrls,'create_role',r.rolcreaterole,'create_db',r.rolcreatedb,'can_login',r.rolcanlogin)
   ORDER BY r.rolname COLLATE "C") FROM pg_roles r WHERE r.oid IN (SELECT oid FROM role_closure)),
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('member',pg_get_userbyid(m.member),
   'role',pg_get_userbyid(m.roleid),'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,
   'inherit',(to_jsonb(m)->'inherit_option'),'set',(to_jsonb(m)->'set_option'))
   ORDER BY pg_get_userbyid(m.member) COLLATE "C",pg_get_userbyid(m.roleid) COLLATE "C",pg_get_userbyid(m.grantor) COLLATE "C"),'[]'::jsonb)
   FROM pg_auth_members m WHERE m.member IN (SELECT oid FROM role_closure)),
 'default_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),
   'schema',n.nspname,'object_type',d.defaclobjtype,
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(d.defaclacl) x))
   ORDER BY pg_get_userbyid(d.defaclrole) COLLATE "C",n.nspname COLLATE "C" NULLS FIRST,d.defaclobjtype::text COLLATE "C"),'[]'::jsonb)
   FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
   WHERE d.defaclrole IN (SELECT oid FROM role_closure)
   AND (d.defaclnamespace=0 OR d.defaclnamespace IN (SELECT oid FROM relevant_schemas))),
 'owned_sequences',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',s.name,'relation',s.relation_name,
   'column',s.column_name,'dependency_type',s.deptype,'owner',pg_get_userbyid(s.relowner),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM aclexplode(coalesce(s.relacl,acldefault('s',s.relowner))) x))
   ORDER BY s.name COLLATE "C",s.relation_name COLLATE "C",s.column_name COLLATE "C"),'[]'::jsonb) FROM owned_sequences s),
 'identity_media_bucket',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,
   'file_size_limit',b.file_size_limit,'allowed_mime_types',(SELECT jsonb_agg(m ORDER BY m COLLATE "C") FROM unnest(b.allowed_mime_types) m))
   ORDER BY b.id COLLATE "C"),'[]'::jsonb) FROM storage.buckets b WHERE b.id='identity-media')
) AS result FROM read_fingerprint f
)

SELECT (result-'baseline'-'format'-'kind'-'read_only'-'server_version'-'source_commit'-'user_rows_read')
 || jsonb_build_object(
  'format','selqiro-profile-editor-scope-20261120-v1',
  'accepted_read_scope_sha256',result#>'{baseline,scope_sha256}',
  'editor_schema',jsonb_build_object(
   'exists',EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='profile_editor_private'),
   'owner',(SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='profile_editor_private'),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
     'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
     'privilege',x.privilege_type,'grantable',x.is_grantable)
     ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
     FROM pg_namespace n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x
     WHERE n.nspname='profile_editor_private'))
 ) AS scope FROM catalog
), fingerprint AS (
 SELECT encode(sha256(convert_to(scope::text,'UTF8')),'hex') AS sha FROM captured
)
SELECT jsonb_build_object(
 'format','selqiro-profile-editor-state-20261120-v1',
 'state',CASE sha WHEN '9329ce1f18934e4cb27b8fabbbc77940639e29a0d1a94ce782c2457b4574a21f' THEN 'before' WHEN 'ecc5f60c52f42b3d1f67dae5bed0b0fefef2c38b51cdd0e03d3e59a534c454b5' THEN 'after' ELSE 'unknown' END,
 'recognized',sha IN ('9329ce1f18934e4cb27b8fabbbc77940639e29a0d1a94ce782c2457b4574a21f','ecc5f60c52f42b3d1f67dae5bed0b0fefef2c38b51cdd0e03d3e59a534c454b5'),
 'read_only',false,
 'project_ref','vyjletlmwoiwxsnsunlm',
 'instance_id','2d088814-0900-448a-a9d1-7b05470cb1d2',
 'release_id','listing-publication-hosted-preview-v1',
 'scope_sha256',sha,
 'expected_before_sha256','9329ce1f18934e4cb27b8fabbbc77940639e29a0d1a94ce782c2457b4574a21f',
 'expected_after_sha256','ecc5f60c52f42b3d1f67dae5bed0b0fefef2c38b51cdd0e03d3e59a534c454b5',
 'user_rows_read',false
) AS result FROM fingerprint;
NOTIFY pgrst, 'reload schema';
COMMIT;
