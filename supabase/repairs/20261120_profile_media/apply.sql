-- Profile media: exact accepted profile/Storage authority plus complete private media catalog.
-- At most one journalled application. Already-after is rejected here.
-- Recovery reads exact metadata; it never retries an uncertain schema write.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL statement_timeout='30s';
SET LOCAL lock_timeout='3s';
LOCK TABLE public.profiles,public.identity_profiles,public.identities,
 public.business_accounts,public.business_members,public.admin_users,public.premium_invites IN SHARE ROW EXCLUSIVE MODE;
-- Freeze Storage DDL while permitting normal ROW EXCLUSIVE object writes.
LOCK TABLE storage.buckets,storage.objects IN SHARE UPDATE EXCLUSIVE MODE;
DO $guard$
DECLARE actual text;
BEGIN
 SELECT encode(sha256(convert_to(scope::text,'UTF8')),'hex') INTO actual FROM (-- No application/user/Storage object rows are read. Fixed settings only.
-- pg_trigger.tgqual raw node hashes contain installation-specific object OIDs.
-- Their canonical pg_get_triggerdef text/hash, arguments and dependencies stay
-- in the Storage fingerprint; only that nonportable raw-node hash is omitted.
WITH observed_storage AS MATERIALIZED (
WITH RECURSIVE profile_scope AS MATERIALIZED (
-- Exact accepted read state plus bounded writer metadata; no application rows.
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

),
profile_fingerprint AS MATERIALIZED (
 SELECT scope,encode(sha256(convert_to(scope::text,'UTF8')),'hex') AS sha256 FROM profile_scope
), wanted_relations(name) AS (VALUES ('storage.buckets'),('storage.objects')),
relations AS MATERIALIZED (
 SELECT w.name,c.* FROM wanted_relations w LEFT JOIN pg_class c ON c.oid=to_regclass(w.name)
), actors AS MATERIALIZED (
 SELECT oid,rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')
), policies AS MATERIALIZED (
 -- Every policy on each shared relation, including policies without a bucket literal.
 SELECT p.*,r.name AS relation_name FROM pg_policy p JOIN relations r ON r.oid=p.polrelid
), triggers AS MATERIALIZED (
 SELECT t.*,r.name AS relation_name FROM pg_trigger t JOIN relations r ON r.oid=t.tgrelid
 WHERE NOT t.tgisinternal
), named_helpers(name) AS (VALUES ('auth.uid'),('storage.foldername')),
dependency_objects(source_kind,relation_name,object_name,classid,objid) AS MATERIALIZED (
 SELECT 'policy',p.relation_name,p.polname,'pg_policy'::regclass,p.oid FROM policies p
 UNION ALL SELECT 'trigger_dependency',t.relation_name,t.tgname,'pg_trigger'::regclass,t.oid FROM triggers t
 UNION ALL SELECT 'column_default',r.name,a.attname,'pg_attrdef'::regclass,d.oid
  FROM pg_attrdef d JOIN relations r ON r.oid=d.adrelid
  JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum AND NOT a.attisdropped
 UNION ALL SELECT 'constraint',r.name,c.conname,'pg_constraint'::regclass,c.oid
  FROM pg_constraint c JOIN relations r ON r.oid=c.conrelid
 UNION ALL SELECT 'index',r.name,i.indexrelid::regclass::text,'pg_class'::regclass,i.indexrelid
  FROM pg_index i JOIN relations r ON r.oid=i.indrelid
), routine_roots(source_kind,relation_name,object_name,oid) AS MATERIALIZED (
 SELECT o.source_kind,o.relation_name,o.object_name,d.refobjid
 FROM dependency_objects o JOIN pg_depend d ON d.classid=o.classid AND d.objid=o.objid
 WHERE d.refclassid='pg_proc'::regclass
 UNION SELECT o.source_kind,o.relation_name,o.object_name,op.oprcode::oid
 FROM dependency_objects o JOIN pg_depend d ON d.classid=o.classid AND d.objid=o.objid
 JOIN pg_operator op ON d.refclassid='pg_operator'::regclass AND op.oid=d.refobjid
 WHERE op.oprcode<>0
 UNION SELECT 'trigger_function',t.relation_name,t.tgname,t.tgfoid FROM triggers t
 UNION SELECT 'named_helper',NULL,h.name,p.oid FROM named_helpers h
 JOIN pg_namespace n ON n.nspname=split_part(h.name,'.',1)
 JOIN pg_proc p ON p.pronamespace=n.oid AND p.proname=split_part(h.name,'.',2)
), function_edges(caller,callee) AS MATERIALIZED (
 SELECT d.objid,d.refobjid FROM pg_depend d
 WHERE d.classid='pg_proc'::regclass AND d.refclassid='pg_proc'::regclass
 UNION SELECT d.objid,o.oprcode::oid FROM pg_depend d JOIN pg_operator o
 ON d.refclassid='pg_operator'::regclass AND o.oid=d.refobjid
 WHERE d.classid='pg_proc'::regclass AND o.oprcode<>0
), routine_walk(oid,depth,path) AS (
 SELECT DISTINCT r.oid,0,ARRAY[r.oid] FROM routine_roots r
 UNION ALL SELECT e.callee,w.depth+1,w.path||e.callee
 FROM routine_walk w JOIN function_edges e ON e.caller=w.oid
 WHERE w.depth<3 AND NOT e.callee=ANY(w.path)
), routine_ids AS MATERIALIZED (
 SELECT oid,min(depth) AS dependency_depth FROM routine_walk GROUP BY oid
), selected_routines AS MATERIALIZED (
 SELECT p.*,n.nspname||'.'||p.proname AS name,i.dependency_depth,
  CASE WHEN p.prokind='a' THEN NULL ELSE pg_get_functiondef(p.oid) END AS definition
 FROM routine_ids i JOIN pg_proc p ON p.oid=i.oid JOIN pg_namespace n ON n.oid=p.pronamespace
), routine_limits AS MATERIALIZED (
 SELECT count(*) AS matched_count,
  coalesce(sum(octet_length(prosrc)+coalesce(octet_length(definition),0)),0) AS definition_bytes,
  coalesce(bool_or(octet_length(prosrc)>131072 OR octet_length(definition)>147456),false) AS oversized_definition
 FROM selected_routines
), routines AS MATERIALIZED (
 -- Any truncation is explicit and rejected by the parser, never accepted as complete.
 SELECT * FROM selected_routines ORDER BY name COLLATE "C",oid::regprocedure::text COLLATE "C" LIMIT 129
), relevant_schemas AS MATERIALIZED (
 SELECT n.* FROM pg_namespace n WHERE n.nspname IN ('storage','auth')
 OR n.oid IN (SELECT pronamespace FROM routines)
), role_seeds(oid) AS (
 SELECT oid FROM actors UNION SELECT oid FROM pg_roles WHERE rolname=current_user
 UNION SELECT relowner FROM relations WHERE oid IS NOT NULL
 UNION SELECT proowner FROM routines UNION SELECT nspowner FROM relevant_schemas
 UNION SELECT x.grantee FROM relations r CROSS JOIN LATERAL aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantor FROM relations r CROSS JOIN LATERAL aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) x WHERE x.grantor<>0
 UNION SELECT x.grantee FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid IN (SELECT oid FROM relations) AND a.attnum>0 AND NOT a.attisdropped AND x.grantee<>0
 UNION SELECT x.grantor FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid IN (SELECT oid FROM relations) AND a.attnum>0 AND NOT a.attisdropped AND x.grantor<>0
 UNION SELECT x.grantee FROM routines p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantor FROM routines p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantor<>0
 UNION SELECT x.grantee FROM relevant_schemas n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantor FROM relevant_schemas n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE x.grantor<>0
 UNION SELECT u FROM policies p CROSS JOIN LATERAL unnest(p.polroles) u WHERE u<>0
), role_closure(oid) AS (
 SELECT oid FROM role_seeds UNION SELECT ancestor.oid FROM pg_auth_members m
 JOIN role_closure c ON c.oid=m.member CROSS JOIN LATERAL (VALUES(m.roleid),(m.grantor)) ancestor(oid)
), result AS MATERIALIZED (
 SELECT jsonb_build_object(
 'format','selqiro-profile-media-catalog-20261120-v1',
 'kind','profile_media_catalog','read_only',current_setting('transaction_read_only'),
 'user_rows_read',false,'source_commit','ab5d1d8cbe20499224541e283df9616304673122',
 'server_version',current_setting('server_version'),'current_role',current_user,
 'baseline',jsonb_build_object('expected_sha256','ecc5f60c52f42b3d1f67dae5bed0b0fefef2c38b51cdd0e03d3e59a534c454b5',
  'scope_sha256',f.sha256,'matched',f.sha256='ecc5f60c52f42b3d1f67dae5bed0b0fefef2c38b51cdd0e03d3e59a534c454b5'),
 'fixed_settings_unfiltered',(f.scope->>'fixed_settings_unfiltered')::boolean
  AND has_table_privilege(current_user,'storage.buckets','SELECT')
  AND NOT row_security_active('storage.buckets'::regclass),
 'hosted_context',f.scope->'hosted_context',
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
  'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.attname,'position',c.attnum,
   'type',format_type(c.atttypid,c.atttypmod),'not_null',c.attnotnull,'identity',c.attidentity,'generated',c.attgenerated,
   'default_expression',pg_get_expr(d.adbin,d.adrelid),
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
   'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),
   'function_dependencies',(SELECT coalesce(jsonb_agg(s.signature ORDER BY s.signature COLLATE "C"),'[]'::jsonb)
    FROM (SELECT DISTINCT rr.oid::regprocedure::text AS signature FROM routine_roots rr
     WHERE rr.source_kind='policy' AND rr.relation_name=r.name AND rr.object_name=p.polname) s)
   ) ORDER BY p.polname COLLATE "C"),'[]'::jsonb) FROM policies p WHERE p.polrelid=r.oid),
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
 'routine_census',jsonb_build_object('method','storage_policy_trigger_expression_catalog_dependencies_v1',
  'dynamic_sql_complete',false,'stored_body_dependencies_complete',false,'external_hooks_checked',false,
  'maximum',128,'max_dependency_depth',3,
  'matched_count',lim.matched_count,'definition_bytes',lim.definition_bytes,
  'overflow',lim.matched_count>128 OR lim.definition_bytes>1572864 OR lim.oversized_definition,
  'unexpanded_dependency_count',(SELECT count(*) FROM function_edges e JOIN routine_ids i ON i.oid=e.caller
   WHERE NOT EXISTS(SELECT 1 FROM routine_ids c WHERE c.oid=e.callee))),
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
  'name',p.name,'signature',p.oid::regprocedure::text,'kind',p.prokind,
  'owner',pg_get_userbyid(p.proowner),'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,
  'result',CASE WHEN p.prokind='p' THEN NULL ELSE pg_get_function_result(p.oid) END,
  'config',(SELECT coalesce(jsonb_agg(x ORDER BY x COLLATE "C"),'[]'::jsonb) FROM unnest(p.proconfig) x),
  'body',CASE WHEN lim.matched_count<=128 AND lim.definition_bytes<=1572864 AND NOT lim.oversized_definition THEN p.prosrc ELSE NULL END,
  'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
  'definition',CASE WHEN lim.matched_count<=128 AND lim.definition_bytes<=1572864 AND NOT lim.oversized_definition THEN p.definition ELSE NULL END,
  'definition_sha256',CASE WHEN p.definition IS NULL THEN NULL ELSE encode(sha256(convert_to(p.definition,'UTF8')),'hex') END,
  'definition_available',p.definition IS NOT NULL,'dependency_depth',p.dependency_depth,
  'sources',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',rr.source_kind,'relation',rr.relation_name,'object',rr.object_name)
   ORDER BY rr.source_kind COLLATE "C",rr.relation_name COLLATE "C" NULLS FIRST,rr.object_name COLLATE "C"),'[]'::jsonb)
   FROM routine_roots rr WHERE rr.oid=p.oid),
  'function_dependencies',(SELECT coalesce(jsonb_agg(e.callee::regprocedure::text ORDER BY e.callee::regprocedure::text COLLATE "C"),'[]'::jsonb)
   FROM function_edges e WHERE e.caller=p.oid),
  'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
   'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
   'privilege',x.privilege_type,'grantable',x.is_grantable)
   ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
   FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x),
  'effective_execute',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,'execute',has_function_privilege(a.oid,p.oid,'EXECUTE'))
   ORDER BY a.rolname COLLATE "C") FROM actors a)) ORDER BY p.name COLLATE "C",p.oid::regprocedure::text COLLATE "C"),'[]'::jsonb)
  FROM routines p JOIN pg_language l ON l.oid=p.prolang),
 'missing_named_helpers',(SELECT coalesce(jsonb_agg(h.name ORDER BY h.name COLLATE "C"),'[]'::jsonb)
  FROM named_helpers h WHERE NOT EXISTS(SELECT 1 FROM routines p WHERE p.name=h.name)),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.relation_name,'name',t.tgname,
  'enabled',t.tgenabled,'event_mask',t.tgtype,'function',t.tgfoid::regprocedure::text,
  'function_dependencies',(SELECT coalesce(jsonb_agg(s.signature ORDER BY s.signature COLLATE "C"),'[]'::jsonb)
   FROM (SELECT DISTINCT rr.oid::regprocedure::text AS signature FROM routine_roots rr
    WHERE rr.source_kind IN ('trigger_function','trigger_dependency') AND rr.relation_name=t.relation_name AND rr.object_name=t.tgname) s),
  'columns',(SELECT coalesce(jsonb_agg(a.attname ORDER BY a.attname COLLATE "C"),'[]'::jsonb)
   FROM pg_attribute a WHERE a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr) AND NOT a.attisdropped),
  'argument_count',t.tgnargs,'arguments_sha256',encode(sha256(t.tgargs),'hex'),
  'when_sha256',CASE WHEN t.tgqual IS NULL THEN NULL ELSE encode(sha256(convert_to(t.tgqual::text,'UTF8')),'hex') END,
  'constraint',t.tgconstraint<>0,'deferrable',t.tgdeferrable,'initially_deferred',t.tginitdeferred,
  'definition',pg_get_triggerdef(t.oid),
  'definition_sha256',encode(sha256(convert_to(pg_get_triggerdef(t.oid),'UTF8')),'hex'))
  ORDER BY t.relation_name COLLATE "C",t.tgname COLLATE "C"),'[]'::jsonb) FROM triggers t),
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
 'identity_media_bucket',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,
  'file_size_limit',b.file_size_limit,'allowed_mime_types',(SELECT jsonb_agg(m ORDER BY m COLLATE "C") FROM unnest(b.allowed_mime_types) m))
  ORDER BY b.id COLLATE "C"),'[]'::jsonb) FROM storage.buckets b WHERE b.id='identity-media')
 ) AS value FROM profile_fingerprint f CROSS JOIN routine_limits lim
)
SELECT value AS result FROM result
), media AS MATERIALIZED (
WITH RECURSIVE actors AS MATERIALIZED (
 SELECT oid,rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')
), media_schema AS MATERIALIZED (
 SELECT * FROM pg_namespace WHERE nspname='profile_media_private'
), media_relations AS MATERIALIZED (
 SELECT c.*,n.nspname||'.'||c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='profile_media_private' AND c.relkind IN ('r','p','v','m','f','S')
), media_functions AS MATERIALIZED (
 SELECT p.*,n.nspname||'.'||p.proname AS name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='profile_media_private' OR (n.nspname='public' AND p.proname IN
 ('get_my_profile_media_v1','begin_my_profile_media_v1','finish_profile_media_upload_v1','update_my_profile_media_v1',
  'claim_profile_media_cleanup_v1','finish_profile_media_cleanup_v1','get_public_profile_media_v1'))
), role_roots(oid) AS (
 SELECT oid FROM actors UNION SELECT nspowner FROM media_schema UNION SELECT relowner FROM media_relations
 UNION SELECT proowner FROM media_functions
 UNION SELECT x.grantee FROM media_schema n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM media_relations c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM media_functions p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantee<>0
), role_closure(oid) AS (
 SELECT oid FROM role_roots UNION SELECT m.roleid FROM pg_auth_members m JOIN role_closure r ON m.member=r.oid
)
SELECT jsonb_build_object(
 'schema',jsonb_build_object('exists',EXISTS(SELECT 1 FROM media_schema),'owner',(SELECT pg_get_userbyid(nspowner) FROM media_schema),
  'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
   'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
   ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
   FROM media_schema n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)),
 'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object(
  'name',c.name,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
  'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
   'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
   ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
   FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
  'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'position',a.attnum,'type',format_type(a.atttypid,a.atttypmod),
   'not_null',a.attnotnull,'generated',a.attgenerated,'identity',a.attidentity,'default_expression',pg_get_expr(d.adbin,d.adrelid),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
    'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
    ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb) FROM aclexplode(a.attacl) x))
   ORDER BY a.attnum),'[]'::jsonb) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
  'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',k.conname,'type',k.contype,'definition',pg_get_constraintdef(k.oid),
   'validated',k.convalidated,'deferrable',k.condeferrable,'initially_deferred',k.condeferred) ORDER BY k.conname COLLATE "C"),'[]'::jsonb) FROM pg_constraint k WHERE k.conrelid=c.oid AND k.contype<>'n'),
  'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,'definition',pg_get_indexdef(i.indexrelid),
   'valid',i.indisvalid,'ready',i.indisready,'unique',i.indisunique) ORDER BY i.indexrelid::regclass::text COLLATE "C"),'[]'::jsonb) FROM pg_index i WHERE i.indrelid=c.oid),
  'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
   'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY (CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END) COLLATE "C") FROM unnest(p.polroles) r),
   'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname COLLATE "C"),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid),
  'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid),
   'function',t.tgfoid::regprocedure::text,'arguments_sha256',encode(sha256(t.tgargs),'hex')) ORDER BY t.tgname COLLATE "C"),'[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rulename,'definition',pg_get_ruledef(r.oid)) ORDER BY r.rulename COLLATE "C"),'[]'::jsonb) FROM pg_rewrite r WHERE r.ev_class=c.oid)
 ) ORDER BY c.name COLLATE "C"),'[]'::jsonb) FROM media_relations c),
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.name,'signature',p.oid::regprocedure::text,
  'owner',pg_get_userbyid(p.proowner),'kind',p.prokind,'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,
  'config',coalesce(to_jsonb(p.proconfig),'[]'::jsonb),'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
  'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
  'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
   'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
   ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
   FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x),
  'effective_execute',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,'execute',has_function_privilege(a.oid,p.oid,'EXECUTE')) ORDER BY a.rolname COLLATE "C") FROM actors a)
 ) ORDER BY p.oid::regprocedure::text COLLATE "C"),'[]'::jsonb) FROM media_functions p JOIN pg_language l ON l.oid=p.prolang),
 'roles',(SELECT jsonb_agg(jsonb_build_object('name',r.rolname,'superuser',r.rolsuper,'inherit',r.rolinherit,'bypass_rls',r.rolbypassrls,
  'create_role',r.rolcreaterole,'create_db',r.rolcreatedb,'can_login',r.rolcanlogin) ORDER BY r.rolname COLLATE "C") FROM pg_roles r WHERE r.oid IN (SELECT oid FROM role_closure)),
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('member',pg_get_userbyid(m.member),'role',pg_get_userbyid(m.roleid),
  'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,'inherit',to_jsonb(m)->'inherit_option','set',to_jsonb(m)->'set_option')
  ORDER BY pg_get_userbyid(m.member) COLLATE "C",pg_get_userbyid(m.roleid) COLLATE "C",pg_get_userbyid(m.grantor) COLLATE "C"),'[]'::jsonb)
  FROM pg_auth_members m WHERE m.member IN (SELECT oid FROM role_closure))
) AS media_scope
)
SELECT jsonb_build_object(
 'format','selqiro-profile-media-scope-20261120-v1',
 'profile_scope_sha256',s.result#>'{baseline,scope_sha256}',
 'storage',(s.result-'baseline'-'format'-'kind'-'read_only'-'server_version'-'source_commit'-'user_rows_read'-'triggers')
  ||jsonb_build_object('triggers',(SELECT jsonb_agg(t.value-'when_sha256' ORDER BY t.ordinality)
   FROM jsonb_array_elements(s.result->'triggers') WITH ORDINALITY t(value,ordinality))),
 'media',m.media_scope) AS scope
FROM observed_storage s CROSS JOIN media m) captured;
 IF actual IS DISTINCT FROM '44d1a0dacd64ef6dd12860a3ec20321f3eb9fc2e5d02427bca7b4b9097ad8c7c' THEN
  RAISE EXCEPTION 'profile_media_before_state_mismatch' USING ERRCODE='55000';
 END IF;
END;
$guard$;
-- Profile avatar/logo and cover assets. This file runs only inside the exact
-- catalog-guarded apply transaction. It changes no Storage policy, configuration
-- or existing object, and does not rewrite any existing profile media value.
CREATE SCHEMA profile_media_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA profile_media_private FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE profile_media_private.cleanup_claims (
 claim_id uuid PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE profile_media_private.assets (
 asset_id uuid PRIMARY KEY,
 actor_user_id uuid NOT NULL REFERENCES auth.users(id),
 identity_id uuid NOT NULL REFERENCES public.identities(id),
 slot text NOT NULL CHECK(slot IN ('avatar','cover')),
 expected_revision uuid,
 object_name text GENERATED ALWAYS AS
  ('managed-profile-v1/'||identity_id::text||'/'||asset_id::text||'.webp') STORED NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','active','retired','deleting','deleted')),
 sha256 text CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 byte_size integer CHECK(byte_size BETWEEN 1 AND 2097152),
 width integer CHECK(width BETWEEN 1 AND 2560),
 height integer CHECK(height BETWEEN 1 AND 2560),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 ready_at timestamptz,
 retired_at timestamptz,
 claim_id uuid REFERENCES profile_media_private.cleanup_claims(claim_id),
 claimed_at timestamptz,
 deleted_at timestamptz,
 CHECK ((sha256 IS NULL AND byte_size IS NULL AND width IS NULL AND height IS NULL)
     OR (sha256 IS NOT NULL AND byte_size IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL)),
 CHECK (status NOT IN ('ready','active') OR sha256 IS NOT NULL),
 CHECK (slot<>'avatar' OR (byte_size<=524288 AND width<=512 AND height<=512)),
 CHECK ((claim_id IS NULL)=(claimed_at IS NULL)),
 CHECK (status NOT IN ('deleting','deleted') OR claim_id IS NOT NULL),
 CHECK ((status='deleted')=(deleted_at IS NOT NULL))
);
CREATE INDEX profile_media_attempts_by_actor ON profile_media_private.assets(actor_user_id,created_at);
CREATE INDEX profile_media_cleanup_candidates ON profile_media_private.assets(status,created_at,claimed_at);
CREATE INDEX profile_media_assets_by_claim ON profile_media_private.assets(claim_id);
CREATE TABLE profile_media_private.identity_state (
 identity_id uuid PRIMARY KEY REFERENCES public.identities(id),
 revision uuid,
 avatar_managed boolean NOT NULL DEFAULT false,
 avatar_asset_id uuid REFERENCES profile_media_private.assets(asset_id),
 cover_managed boolean NOT NULL DEFAULT false,
 cover_asset_id uuid REFERENCES profile_media_private.assets(asset_id),
 focus_x integer NOT NULL DEFAULT 500 CHECK(focus_x BETWEEN 0 AND 1000),
 focus_y integer NOT NULL DEFAULT 500 CHECK(focus_y BETWEEN 0 AND 1000),
 zoom integer NOT NULL DEFAULT 1000 CHECK(zoom BETWEEN 1000 AND 2000),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(avatar_managed OR avatar_asset_id IS NULL),
 CHECK(cover_managed OR cover_asset_id IS NULL),
 CHECK(revision IS NOT NULL OR (NOT avatar_managed AND NOT cover_managed))
);
ALTER TABLE profile_media_private.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_media_private.identity_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_media_private.cleanup_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA profile_media_private FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION profile_media_private.guard_asset_update() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $media$
BEGIN
 IF NEW.asset_id IS DISTINCT FROM OLD.asset_id OR NEW.actor_user_id IS DISTINCT FROM OLD.actor_user_id
  OR NEW.identity_id IS DISTINCT FROM OLD.identity_id OR NEW.slot IS DISTINCT FROM OLD.slot
  OR NEW.expected_revision IS DISTINCT FROM OLD.expected_revision OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
  RAISE EXCEPTION 'PROFILE_MEDIA_IMMUTABLE_ASSET' USING ERRCODE='55000';
 END IF;
 IF NOT ((OLD.status='pending' AND NEW.status IN ('ready','retired'))
  OR (OLD.status='ready' AND NEW.status IN ('active','retired'))
  OR (OLD.status='active' AND NEW.status='retired')
  OR (OLD.status='retired' AND NEW.status='deleting')
  OR (OLD.status='deleting' AND NEW.status IN ('deleting','deleted'))) THEN
  RAISE EXCEPTION 'PROFILE_MEDIA_INVALID_TRANSITION' USING ERRCODE='55000';
 END IF;
 IF NOT (OLD.status='pending' AND NEW.status='ready') AND
  (NEW.sha256 IS DISTINCT FROM OLD.sha256 OR NEW.byte_size IS DISTINCT FROM OLD.byte_size
   OR NEW.width IS DISTINCT FROM OLD.width OR NEW.height IS DISTINCT FROM OLD.height
   OR NEW.ready_at IS DISTINCT FROM OLD.ready_at) THEN
  RAISE EXCEPTION 'PROFILE_MEDIA_IMMUTABLE_RECEIPT' USING ERRCODE='55000';
 END IF;
 NEW.updated_at:=clock_timestamp();
 RETURN NEW;
END;
$media$;
CREATE TRIGGER profile_media_immutable_asset BEFORE UPDATE ON profile_media_private.assets
 FOR EACH ROW EXECUTE FUNCTION profile_media_private.guard_asset_update();

CREATE FUNCTION profile_media_private.require_owner(p_user_id uuid,p_identity_id uuid)
RETURNS public.identities LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $media$
DECLARE v_identity public.identities%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
  RAISE EXCEPTION 'PROFILE_MEDIA_AUTH_CHANGED' USING ERRCODE='42501';
 END IF;
 BEGIN
  v_identity:=profile_editor_private.lock_owner(p_user_id,p_identity_id);
 EXCEPTION WHEN insufficient_privilege THEN
  IF SQLERRM='PROFILE_EDITOR_ACTOR_CHANGED' THEN
   RAISE EXCEPTION 'PROFILE_MEDIA_ACTOR_CHANGED' USING ERRCODE='42501';
  END IF;
  RAISE EXCEPTION 'PROFILE_MEDIA_FORBIDDEN' USING ERRCODE='42501';
 END;
 RETURN v_identity;
END;
$media$;

CREATE FUNCTION profile_media_private.asset_binding(p_asset profile_media_private.assets)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $media$
 SELECT jsonb_build_object('asset_id',p_asset.asset_id,'user_id',p_asset.actor_user_id,
  'identity_id',p_asset.identity_id,'slot',p_asset.slot,'object_name',p_asset.object_name,'status',p_asset.status)
$media$;

CREATE FUNCTION profile_media_private.public_url(p_object_name text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $media$
 SELECT 'https://vyjletlmwoiwxsnsunlm.supabase.co/storage/v1/object/public/identity-media/'||p_object_name
$media$;

CREATE FUNCTION profile_media_private.slot_asset(p_identity_id uuid,p_slot text) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path=pg_catalog AS $media$
DECLARE v_state profile_media_private.identity_state%ROWTYPE;v_asset profile_media_private.assets%ROWTYPE;
 v_managed boolean;v_asset_id uuid;v_legacy text;
BEGIN
 IF p_slot NOT IN ('avatar','cover') OR p_slot IS NULL THEN RETURN NULL; END IF;
 SELECT s.* INTO v_state FROM profile_media_private.identity_state s WHERE s.identity_id=p_identity_id;
 v_managed:=CASE WHEN p_slot='avatar' THEN coalesce(v_state.avatar_managed,false) ELSE coalesce(v_state.cover_managed,false) END;
 v_asset_id:=CASE WHEN p_slot='avatar' THEN v_state.avatar_asset_id ELSE v_state.cover_asset_id END;
 IF v_managed THEN
  IF v_asset_id IS NULL THEN RETURN NULL; END IF;
  SELECT a.* INTO v_asset FROM profile_media_private.assets a WHERE a.asset_id=v_asset_id
   AND a.identity_id=p_identity_id AND a.slot=p_slot AND a.status='active';
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('asset_id',v_asset.asset_id,'url',profile_media_private.public_url(v_asset.object_name),
   'width',v_asset.width,'height',v_asset.height);
 END IF;
 -- Existing pictures remain until this individual slot is explicitly managed.
 -- An explicitly removed managed slot has already returned NULL above.
 SELECT CASE WHEN p_slot='avatar' THEN coalesce(nullif(btrim(ip.avatar_url),''),nullif(btrim(p.avatar_url),''),nullif(btrim(i.avatar_url),''))
   ELSE coalesce(nullif(btrim(ip.banner_url),''),nullif(btrim(p.banner_url),'')) END
 INTO v_legacy FROM public.identities i LEFT JOIN public.identity_profiles ip ON ip.identity_id=i.id
 LEFT JOIN public.profiles p ON p.id=i.user_id AND i.type='private' WHERE i.id=p_identity_id;
 IF v_legacy IS NULL THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('asset_id',NULL,'url',v_legacy,'width',NULL,'height',NULL);
END;
$media$;

CREATE FUNCTION profile_media_private.slot_url(p_identity_id uuid,p_slot text) RETURNS text
LANGUAGE sql STABLE SET search_path=pg_catalog AS $media$
 SELECT profile_media_private.slot_asset(p_identity_id,p_slot)->>'url'
$media$;

CREATE FUNCTION profile_media_private.snapshot(p_user_id uuid,p_identity_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path=pg_catalog AS $media$
 SELECT jsonb_build_object('user_id',p_user_id,'identity_id',p_identity_id,'revision',s.revision,
  'avatar',profile_media_private.slot_asset(p_identity_id,'avatar'),'cover',profile_media_private.slot_asset(p_identity_id,'cover'),
  'focus_x',coalesce(s.focus_x,500),'focus_y',coalesce(s.focus_y,500),'zoom',coalesce(s.zoom,1000))
 FROM (VALUES(1)) one(n) LEFT JOIN profile_media_private.identity_state s ON s.identity_id=p_identity_id
$media$;

CREATE FUNCTION public.get_my_profile_media_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET lock_timeout='3s' AS $media$
BEGIN
 PERFORM profile_media_private.require_owner(p_expected_user_id,p_expected_identity_id);
 RETURN profile_media_private.snapshot(p_expected_user_id,p_expected_identity_id);
END;
$media$;

CREATE FUNCTION public.begin_my_profile_media_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_expected_revision uuid,p_asset_id uuid,p_slot text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET lock_timeout='3s' AS $media$
DECLARE v_state profile_media_private.identity_state%ROWTYPE;v_asset profile_media_private.assets%ROWTYPE;
 v_now timestamptz:=clock_timestamp();
BEGIN
 PERFORM profile_media_private.require_owner(p_expected_user_id,p_expected_identity_id);
 IF p_asset_id IS NULL OR p_slot IS NULL OR p_slot NOT IN ('avatar','cover') THEN
  RAISE EXCEPTION 'PROFILE_MEDIA_INVALID_INPUT' USING ERRCODE='22023';
 END IF;
 INSERT INTO profile_media_private.identity_state(identity_id) VALUES(p_expected_identity_id) ON CONFLICT DO NOTHING;
 SELECT s.* INTO v_state FROM profile_media_private.identity_state s WHERE s.identity_id=p_expected_identity_id FOR UPDATE;
 IF v_state.revision IS DISTINCT FROM p_expected_revision THEN
  RAISE EXCEPTION 'PROFILE_MEDIA_CONFLICT' USING ERRCODE='P0001';
 END IF;
 SELECT a.* INTO v_asset FROM profile_media_private.assets a WHERE a.asset_id=p_asset_id FOR UPDATE;
 IF FOUND THEN
  IF v_asset.actor_user_id IS DISTINCT FROM p_expected_user_id OR v_asset.identity_id IS DISTINCT FROM p_expected_identity_id
   OR v_asset.slot IS DISTINCT FROM p_slot OR v_asset.expected_revision IS DISTINCT FROM p_expected_revision THEN
   RAISE EXCEPTION 'PROFILE_MEDIA_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  -- A replay never admits a storage write close to the adoption/cleanup TTL.
  -- The HTTP worker has a 60-second whole-request lifetime; five-minute gaps
  -- separate last admission, one-hour adoption expiry and cleanup eligibility.
  IF v_asset.status NOT IN ('pending','ready') OR v_asset.created_at<=v_now-interval '55 minutes' THEN
   RAISE EXCEPTION 'PROFILE_MEDIA_ASSET_UNAVAILABLE' USING ERRCODE='P0001';
  END IF;
  RETURN profile_media_private.asset_binding(v_asset);
 END IF;
 -- require_owner holds this actor's profile row, serializing its admissions
 -- across identities before these bounded indexed rate counts are evaluated.
 IF (SELECT count(*) FROM profile_media_private.assets a WHERE a.actor_user_id=p_expected_user_id AND a.created_at>v_now-interval '1 hour')>=12
  OR (SELECT count(*) FROM profile_media_private.assets a WHERE a.actor_user_id=p_expected_user_id AND a.status='pending' AND a.created_at>v_now-interval '1 hour')>=3 THEN
  RAISE EXCEPTION 'PROFILE_MEDIA_RATE_LIMIT' USING ERRCODE='PT429';
 END IF;
 INSERT INTO profile_media_private.assets(asset_id,actor_user_id,identity_id,slot,expected_revision)
 VALUES(p_asset_id,p_expected_user_id,p_expected_identity_id,p_slot,p_expected_revision) RETURNING * INTO v_asset;
 RETURN profile_media_private.asset_binding(v_asset);
END;
$media$;

CREATE FUNCTION public.finish_profile_media_upload_v1(p_asset_id uuid,p_user_id uuid,p_identity_id uuid,
 p_sha256 text,p_byte_size integer,p_width integer,p_height integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET lock_timeout='3s' AS $media$
DECLARE v_asset profile_media_private.assets%ROWTYPE;
BEGIN
 IF p_asset_id IS NULL OR p_user_id IS NULL OR p_identity_id IS NULL OR p_sha256 IS NULL
  OR p_sha256 !~ '^[0-9a-f]{64}$' OR p_byte_size IS NULL OR p_byte_size NOT BETWEEN 1 AND 2097152
  OR p_width IS NULL OR p_width NOT BETWEEN 1 AND 2560 OR p_height IS NULL OR p_height NOT BETWEEN 1 AND 2560 THEN
  RAISE EXCEPTION 'PROFILE_MEDIA_INVALID_INPUT' USING ERRCODE='22023';
 END IF;
 SELECT a.* INTO v_asset FROM profile_media_private.assets a WHERE a.asset_id=p_asset_id FOR UPDATE;
 IF NOT FOUND OR v_asset.actor_user_id IS DISTINCT FROM p_user_id OR v_asset.identity_id IS DISTINCT FROM p_identity_id THEN
  RAISE EXCEPTION 'PROFILE_MEDIA_FORBIDDEN' USING ERRCODE='42501';
 END IF;
 IF v_asset.slot='avatar' AND (p_byte_size>524288 OR p_width>512 OR p_height>512) THEN
  RAISE EXCEPTION 'PROFILE_MEDIA_INVALID_INPUT' USING ERRCODE='22023';
 END IF;
 IF v_asset.status IN ('ready','active') THEN
  IF v_asset.sha256 IS DISTINCT FROM p_sha256 OR v_asset.byte_size IS DISTINCT FROM p_byte_size
   OR v_asset.width IS DISTINCT FROM p_width OR v_asset.height IS DISTINCT FROM p_height THEN
   RAISE EXCEPTION 'PROFILE_MEDIA_RECEIPT_CONFLICT' USING ERRCODE='P0001';
  END IF;
 ELSIF v_asset.status='pending' AND v_asset.created_at>clock_timestamp()-interval '1 hour' THEN
  UPDATE profile_media_private.assets SET status='ready',sha256=p_sha256,byte_size=p_byte_size,
   width=p_width,height=p_height,ready_at=clock_timestamp() WHERE asset_id=p_asset_id RETURNING * INTO v_asset;
 ELSE
  RAISE EXCEPTION 'PROFILE_MEDIA_ASSET_UNAVAILABLE' USING ERRCODE='P0001';
 END IF;
 RETURN profile_media_private.asset_binding(v_asset)||jsonb_build_object('sha256',v_asset.sha256,
  'byte_size',v_asset.byte_size,'width',v_asset.width,'height',v_asset.height);
END;
$media$;

CREATE FUNCTION public.update_my_profile_media_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_expected_revision uuid,p_slot text,p_action text,p_asset_id uuid,p_focus_x integer,p_focus_y integer,p_zoom integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET lock_timeout='3s' AS $media$
DECLARE v_state profile_media_private.identity_state%ROWTYPE;v_asset profile_media_private.assets%ROWTYPE;v_old uuid;
BEGIN
 PERFORM profile_media_private.require_owner(p_expected_user_id,p_expected_identity_id);
 IF p_slot IS NULL OR p_slot NOT IN ('avatar','cover') OR p_action IS NULL OR p_action NOT IN ('set','remove','position')
  OR p_focus_x IS NULL OR p_focus_x NOT BETWEEN 0 AND 1000 OR p_focus_y IS NULL OR p_focus_y NOT BETWEEN 0 AND 1000
  OR p_zoom IS NULL OR p_zoom NOT BETWEEN 1000 AND 2000
  OR (p_action='remove' AND p_asset_id IS NOT NULL) OR (p_action IN ('set','position') AND p_asset_id IS NULL)
  OR (p_slot='avatar' AND (p_action='position' OR p_focus_x<>500 OR p_focus_y<>500 OR p_zoom<>1000)) THEN
  RAISE EXCEPTION 'PROFILE_MEDIA_INVALID_INPUT' USING ERRCODE='22023';
 END IF;
 INSERT INTO profile_media_private.identity_state(identity_id) VALUES(p_expected_identity_id) ON CONFLICT DO NOTHING;
 SELECT s.* INTO v_state FROM profile_media_private.identity_state s WHERE s.identity_id=p_expected_identity_id FOR UPDATE;
 IF v_state.revision IS DISTINCT FROM p_expected_revision THEN
  RAISE EXCEPTION 'PROFILE_MEDIA_CONFLICT' USING ERRCODE='P0001';
 END IF;
 v_old:=CASE WHEN p_slot='avatar' THEN v_state.avatar_asset_id ELSE v_state.cover_asset_id END;
 IF p_action='set' THEN
  SELECT a.* INTO v_asset FROM profile_media_private.assets a WHERE a.asset_id=p_asset_id FOR UPDATE;
  IF NOT FOUND OR v_asset.actor_user_id IS DISTINCT FROM p_expected_user_id OR v_asset.identity_id IS DISTINCT FROM p_expected_identity_id
   OR v_asset.slot IS DISTINCT FROM p_slot THEN RAISE EXCEPTION 'PROFILE_MEDIA_FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF v_asset.status IS DISTINCT FROM 'ready' OR v_asset.created_at<=clock_timestamp()-interval '1 hour' THEN
   RAISE EXCEPTION 'PROFILE_MEDIA_ASSET_UNAVAILABLE' USING ERRCODE='P0001';
  END IF;
  UPDATE profile_media_private.assets SET status='active' WHERE asset_id=p_asset_id;
 ELSIF p_action='position' THEN
  IF p_slot<>'cover' OR NOT v_state.cover_managed OR v_old IS DISTINCT FROM p_asset_id THEN
   RAISE EXCEPTION 'PROFILE_MEDIA_ASSET_UNAVAILABLE' USING ERRCODE='P0001';
  END IF;
  SELECT a.* INTO v_asset FROM profile_media_private.assets a WHERE a.asset_id=p_asset_id FOR UPDATE;
  IF NOT FOUND OR v_asset.identity_id IS DISTINCT FROM p_expected_identity_id OR v_asset.slot<>'cover' OR v_asset.status<>'active' THEN
   RAISE EXCEPTION 'PROFILE_MEDIA_ASSET_UNAVAILABLE' USING ERRCODE='P0001';
  END IF;
 END IF;
 IF p_action<>'position' AND v_old IS NOT NULL THEN
  UPDATE profile_media_private.assets SET status='retired',retired_at=clock_timestamp()
   WHERE asset_id=v_old AND identity_id=p_expected_identity_id AND slot=p_slot AND status='active';
 END IF;
 UPDATE profile_media_private.identity_state SET
  avatar_managed=CASE WHEN p_slot='avatar' THEN true ELSE avatar_managed END,
  avatar_asset_id=CASE WHEN p_slot='avatar' THEN CASE WHEN p_action='set' THEN p_asset_id ELSE NULL END ELSE avatar_asset_id END,
  cover_managed=CASE WHEN p_slot='cover' THEN true ELSE cover_managed END,
  cover_asset_id=CASE WHEN p_slot='cover' THEN CASE WHEN p_action IN ('set','position') THEN p_asset_id ELSE NULL END ELSE cover_asset_id END,
  focus_x=CASE WHEN p_slot<>'cover' THEN focus_x WHEN p_action='remove' THEN 500 ELSE p_focus_x END,
  focus_y=CASE WHEN p_slot<>'cover' THEN focus_y WHEN p_action='remove' THEN 500 ELSE p_focus_y END,
  zoom=CASE WHEN p_slot<>'cover' THEN zoom WHEN p_action='remove' THEN 1000 ELSE p_zoom END,
  revision=gen_random_uuid(),updated_at=clock_timestamp() WHERE identity_id=p_expected_identity_id;
 RETURN profile_media_private.snapshot(p_expected_user_id,p_expected_identity_id);
END;
$media$;

CREATE FUNCTION public.claim_profile_media_cleanup_v1(p_claim_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET lock_timeout='3s' AS $media$
DECLARE v_new uuid;v_asset profile_media_private.assets%ROWTYPE;v_now timestamptz:=clock_timestamp();v_result jsonb;
BEGIN
 IF p_claim_id IS NULL THEN RAISE EXCEPTION 'PROFILE_MEDIA_INVALID_INPUT' USING ERRCODE='22023'; END IF;
 INSERT INTO profile_media_private.cleanup_claims(claim_id) VALUES(p_claim_id) ON CONFLICT DO NOTHING RETURNING claim_id INTO v_new;
 IF v_new IS NOT NULL THEN
  FOR v_asset IN SELECT a.* FROM profile_media_private.assets a WHERE
   ((a.status IN ('pending','ready') AND a.created_at<=v_now-interval '65 minutes') OR a.status='retired'
    OR (a.status='deleting' AND a.claimed_at<=v_now-interval '10 minutes'))
   AND NOT EXISTS(SELECT 1 FROM profile_media_private.identity_state s WHERE s.avatar_asset_id=a.asset_id OR s.cover_asset_id=a.asset_id)
   ORDER BY a.created_at,a.asset_id FOR UPDATE OF a SKIP LOCKED LIMIT 4
  LOOP
   IF v_asset.status IN ('pending','ready') THEN
    UPDATE profile_media_private.assets SET status='retired',retired_at=v_now WHERE asset_id=v_asset.asset_id;
   END IF;
   UPDATE profile_media_private.assets SET status='deleting',claim_id=p_claim_id,claimed_at=v_now WHERE asset_id=v_asset.asset_id;
  END LOOP;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('asset_id',a.asset_id,'object_name',a.object_name,'claim_id',a.claim_id)
  ORDER BY a.asset_id),'[]'::jsonb) INTO v_result FROM profile_media_private.assets a WHERE a.claim_id=p_claim_id AND a.status='deleting';
 RETURN v_result;
END;
$media$;

CREATE FUNCTION public.finish_profile_media_cleanup_v1(p_asset_id uuid,p_claim_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET lock_timeout='3s' AS $media$
DECLARE v_asset profile_media_private.assets%ROWTYPE;
BEGIN
 IF p_asset_id IS NULL OR p_claim_id IS NULL THEN RAISE EXCEPTION 'PROFILE_MEDIA_INVALID_INPUT' USING ERRCODE='22023'; END IF;
 SELECT a.* INTO v_asset FROM profile_media_private.assets a WHERE a.asset_id=p_asset_id FOR UPDATE;
 IF NOT FOUND OR v_asset.claim_id IS DISTINCT FROM p_claim_id OR v_asset.status NOT IN ('deleting','deleted')
  OR EXISTS(SELECT 1 FROM profile_media_private.identity_state s WHERE s.avatar_asset_id=p_asset_id OR s.cover_asset_id=p_asset_id) THEN
  RAISE EXCEPTION 'PROFILE_MEDIA_CLEANUP_CONFLICT' USING ERRCODE='P0001';
 END IF;
 IF v_asset.status='deleting' THEN
  UPDATE profile_media_private.assets SET status='deleted',deleted_at=clock_timestamp() WHERE asset_id=p_asset_id;
 END IF;
 RETURN jsonb_build_object('asset_id',p_asset_id,'claim_id',p_claim_id,'status','deleted');
END;
$media$;

CREATE FUNCTION public.get_public_profile_media_v1(p_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $media$
DECLARE v_slug text;v_public record;v_cover jsonb;v_state profile_media_private.identity_state%ROWTYPE;
BEGIN
 SELECT ip.slug INTO v_slug FROM public.identity_profiles ip WHERE ip.identity_id=p_identity_id;
 IF v_slug IS NULL OR btrim(v_slug)='' THEN RETURN NULL; END IF;
 SELECT s.* INTO v_public FROM public.get_store_by_slug(v_slug) s WHERE s.identity_id=p_identity_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 v_cover:=profile_media_private.slot_asset(p_identity_id,'cover');
 SELECT s.* INTO v_state FROM profile_media_private.identity_state s WHERE s.identity_id=p_identity_id;
 RETURN jsonb_build_object('identity_id',p_identity_id,'slug',v_public.slug,
  'avatar_url',v_public.avatar_url,'banner_url',v_public.banner_url,
  'banner_width',v_cover->'width','banner_height',v_cover->'height',
  'focus_x',coalesce(v_state.focus_x,500),'focus_y',coalesce(v_state.focus_y,500),'zoom',coalesce(v_state.zoom,1000));
END;
$media$;

-- No implicit PUBLIC/default ACL survives on a new helper or writer.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA profile_media_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_my_profile_media_v1(uuid,uuid),
 public.begin_my_profile_media_v1(uuid,uuid,uuid,uuid,text),
 public.finish_profile_media_upload_v1(uuid,uuid,uuid,text,integer,integer,integer),
 public.update_my_profile_media_v1(uuid,uuid,uuid,text,text,uuid,integer,integer,integer),
 public.claim_profile_media_cleanup_v1(uuid),public.finish_profile_media_cleanup_v1(uuid,uuid),
 public.get_public_profile_media_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_profile_media_v1(uuid,uuid),
 public.begin_my_profile_media_v1(uuid,uuid,uuid,uuid,text),
 public.update_my_profile_media_v1(uuid,uuid,uuid,text,text,uuid,integer,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_profile_media_upload_v1(uuid,uuid,uuid,text,integer,integer,integer),
 public.claim_profile_media_cleanup_v1(uuid),public.finish_profile_media_cleanup_v1(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_media_v1(uuid) TO anon,authenticated,service_role;

-- Media projections only; all accepted eligibility and return shapes are preserved.

CREATE OR REPLACE FUNCTION public.get_store_by_slug(store_slug_input text)
RETURNS TABLE(identity_profile_id uuid,identity_id uuid,identity_type text,business_account_id uuid,
 display_name text,slug text,bio text,avatar_url text,banner_url text,banner_dominant_color text,
 contact_phone text,contact_email text,website_url text,address_text text,city text,country text,
 lat double precision,lng double precision,location_visibility text,legacy_user_id uuid,is_premium boolean)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp AS $privacy$
 WITH selected AS MATERIALIZED(
  SELECT ip.id identity_profile_id,i.id identity_id,i.type identity_type,i.business_account_id,
   ip.display_name,ip.slug,coalesce(ip.bio,p.bio) bio,profile_media_private.slot_url(i.id,'avatar') avatar_url,
   profile_media_private.slot_url(i.id,'cover') banner_url,coalesce(ip.banner_dominant_color,p.banner_dominant_color) banner_dominant_color,
   ip.contact_phone,ip.contact_email,ip.website_url,ip.address_text,ip.city,ip.country,
   ip.lat,ip.lng,ip.location_visibility,i.user_id legacy_user_id,coalesce(p.is_premium,false) is_premium,
   CASE WHEN i.type='private' THEN i.user_id ELSE business.owner_user_id END block_account_id,
   i.status identity_status,business.status business_status
  FROM public.identity_profiles ip JOIN public.identities i ON i.id=ip.identity_id
  LEFT JOIN public.profiles p ON p.id=i.user_id
  LEFT JOIN public.business_accounts business ON business.id=i.business_account_id
  WHERE ip.slug=store_slug_input OR p.store_slug=store_slug_input
  ORDER BY CASE WHEN ip.slug=store_slug_input THEN 0 ELSE 1 END LIMIT 1
 )
 SELECT s.identity_profile_id,s.identity_id,s.identity_type,s.business_account_id,s.display_name,s.slug,s.bio,
 s.avatar_url,s.banner_url,s.banner_dominant_color,s.contact_phone,s.contact_email,s.website_url,
 CASE WHEN s.identity_type='business' AND s.location_visibility='exact' THEN s.address_text ELSE NULL END,
 CASE WHEN s.location_visibility IN('city','exact') THEN s.city ELSE NULL END,
 CASE WHEN s.location_visibility IN('city','exact') THEN s.country ELSE NULL END,
 CASE WHEN s.identity_type='business' AND s.location_visibility='exact' THEN s.lat ELSE NULL END,
 CASE WHEN s.identity_type='business' AND s.location_visibility='exact' THEN s.lng ELSE NULL END,
 CASE WHEN s.identity_type='business' AND s.location_visibility='exact' THEN 'exact'
      WHEN s.location_visibility IN('city','exact') THEN 'city' ELSE 'hidden' END,
 s.legacy_user_id,s.is_premium FROM selected s
 WHERE s.identity_status='active' AND (s.identity_type='private' OR s.business_status='active')
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
 AND ((b.blocker_id=auth.uid() AND b.blocked_id=s.block_account_id)
 OR (b.blocked_id=auth.uid() AND b.blocker_id=s.block_account_id)));
$privacy$;

CREATE OR REPLACE FUNCTION public.get_my_active_identity_profile()
RETURNS TABLE(id uuid,identity_id uuid,display_name text,slug text,bio text,avatar_url text,
 banner_url text,banner_dominant_color text)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp AS $privacy$
 SELECT ip.id,ip.identity_id,ip.display_name,ip.slug,ip.bio,profile_media_private.slot_url(ip.identity_id,'avatar'),profile_media_private.slot_url(ip.identity_id,'cover'),ip.banner_dominant_color
 FROM public.profiles p JOIN public.identity_profiles ip ON ip.identity_id=p.active_identity_id
 WHERE p.id=auth.uid() AND public.user_has_identity_access_v2(auth.uid(),p.active_identity_id)
 LIMIT 1;
$privacy$;

CREATE OR REPLACE FUNCTION "public"."get_my_identities"() RETURNS TABLE("id" "uuid", "type" "text", "display_name" "text", "avatar_url" "text", "business_account_id" "uuid", "role" "text", "is_active" boolean, "slug" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    i.id,
    i.type,
    i.display_name,
    profile_media_private.slot_url(i.id,'avatar'),
    i.business_account_id,
    null::text as role,
    true as is_active,
    ip.slug
  from identities i
  left join identity_profiles ip
    on ip.identity_id = i.id
  where i.type = 'private'
    and i.user_id = auth.uid()
    and i.status = 'active'

  union all

  select
    i.id,
    i.type,
    i.display_name,
    profile_media_private.slot_url(i.id,'avatar'),
    i.business_account_id,
    bm.role,
    true as is_active,
    ip.slug
  from identities i
  join business_members bm
    on bm.business_account_id = i.business_account_id
  left join identity_profiles ip
    on ip.identity_id = i.id
  where i.type = 'business'
    and bm.user_id = auth.uid()
    and bm.status = 'active'
    and i.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.set_my_active_identity_v2(
  p_identity_id uuid
)
returns table (
  identity_id uuid,
  identity_type text,
  display_name text,
  avatar_url text,
  slug text,
  changed boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();

  v_previous_identity_id uuid;
  v_identity_type text;
  v_display_name text;
  v_avatar_url text;
  v_slug text;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_identity_id is null then
    raise exception
      'Identity ID is required.'
      using errcode = '22023';
  end if;

  /*
   * The target must be an existing active identity.
   */
  select
    i.type::text,
    i.display_name,
    profile_media_private.slot_url(i.id,'avatar'),
    ip.slug
  into
    v_identity_type,
    v_display_name,
    v_avatar_url,
    v_slug
  from public.identities i
  left join public.identity_profiles ip
    on ip.identity_id = i.id
  where i.id = p_identity_id
    and i.status = 'active';

  if not found then
    raise exception
      'The selected identity does not exist or is inactive.'
      using errcode = '22023';
  end if;

  /*
   * Private ownership or active business membership
   * must be valid for the authenticated user.
   */
  if not coalesce(
    public.current_user_has_identity_access(
      p_identity_id
    ),
    false
  ) then
    raise exception
      'The selected identity is not accessible to the authenticated user.'
      using errcode = '42501';
  end if;

  /*
   * Lock the user's profile so concurrent switches are
   * serialized.
   */
  select profile.active_identity_id
  into v_previous_identity_id
  from public.profiles profile
  where profile.id = v_user_id
  for update;

  if not found then
    raise exception
      'The authenticated user profile does not exist.'
      using errcode = '22023';
  end if;

  if v_previous_identity_id
    is distinct from p_identity_id
  then
    update public.profiles
    set active_identity_id = p_identity_id
    where id = v_user_id;
  end if;

  return query
  select
    p_identity_id,
    v_identity_type,
    v_display_name,
    v_avatar_url,
    v_slug,
    (
      v_previous_identity_id
      is distinct from p_identity_id
    );
end;
$function$;

CREATE OR REPLACE FUNCTION "public"."get_identity_profile_public"("p_identity_id" "uuid") RETURNS TABLE("display_name" "text", "slug" "text", "avatar_url" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    ip.display_name,
    ip.slug,
    profile_media_private.slot_url(ip.identity_id,'avatar')
  from identity_profiles ip
  where ip.identity_id = p_identity_id
  limit 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_legacy_profile_card_v1(p_user_id uuid)
RETURNS TABLE(display_name text,slug text,avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp AS $privacy$
 WITH candidates AS MATERIALIZED(
  SELECT ip.display_name,ip.slug,profile_media_private.slot_url(i.id,'avatar') avatar_url,i.status,i.user_id
  FROM public.identities i JOIN public.identity_profiles ip ON ip.identity_id=i.id
  WHERE i.type='private' AND i.user_id=p_user_id
 )
 SELECT c.display_name,c.slug,c.avatar_url FROM candidates c
 WHERE c.status='active' AND (SELECT count(*) FROM candidates)=1
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
 AND ((b.blocker_id=auth.uid() AND b.blocked_id=c.user_id)
 OR (b.blocked_id=auth.uid() AND b.blocker_id=c.user_id)));
$privacy$;

CREATE OR REPLACE FUNCTION messaging_private_v2.identity_card(p_identity uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('identity_id',p_identity,'name',coalesce(nullif(left(i.display_name,200),''),'Kasutaja'),
  'avatar_url',CASE WHEN length(profile_media_private.slot_url(p_identity,'avatar'))<=2048 AND profile_media_private.slot_url(p_identity,'avatar') ~ '^https://' THEN profile_media_private.slot_url(p_identity,'avatar') ELSE NULL END)
 FROM (VALUES(1)) AS one(n) LEFT JOIN public.identities i ON i.id=p_identity;
$f$;

DO $guard$
DECLARE actual text;
BEGIN
 SELECT encode(sha256(convert_to(scope::text,'UTF8')),'hex') INTO actual FROM (-- No application/user/Storage object rows are read. Fixed settings only.
-- pg_trigger.tgqual raw node hashes contain installation-specific object OIDs.
-- Their canonical pg_get_triggerdef text/hash, arguments and dependencies stay
-- in the Storage fingerprint; only that nonportable raw-node hash is omitted.
WITH observed_storage AS MATERIALIZED (
WITH RECURSIVE profile_scope AS MATERIALIZED (
-- Exact accepted read state plus bounded writer metadata; no application rows.
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

),
profile_fingerprint AS MATERIALIZED (
 SELECT scope,encode(sha256(convert_to(scope::text,'UTF8')),'hex') AS sha256 FROM profile_scope
), wanted_relations(name) AS (VALUES ('storage.buckets'),('storage.objects')),
relations AS MATERIALIZED (
 SELECT w.name,c.* FROM wanted_relations w LEFT JOIN pg_class c ON c.oid=to_regclass(w.name)
), actors AS MATERIALIZED (
 SELECT oid,rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')
), policies AS MATERIALIZED (
 -- Every policy on each shared relation, including policies without a bucket literal.
 SELECT p.*,r.name AS relation_name FROM pg_policy p JOIN relations r ON r.oid=p.polrelid
), triggers AS MATERIALIZED (
 SELECT t.*,r.name AS relation_name FROM pg_trigger t JOIN relations r ON r.oid=t.tgrelid
 WHERE NOT t.tgisinternal
), named_helpers(name) AS (VALUES ('auth.uid'),('storage.foldername')),
dependency_objects(source_kind,relation_name,object_name,classid,objid) AS MATERIALIZED (
 SELECT 'policy',p.relation_name,p.polname,'pg_policy'::regclass,p.oid FROM policies p
 UNION ALL SELECT 'trigger_dependency',t.relation_name,t.tgname,'pg_trigger'::regclass,t.oid FROM triggers t
 UNION ALL SELECT 'column_default',r.name,a.attname,'pg_attrdef'::regclass,d.oid
  FROM pg_attrdef d JOIN relations r ON r.oid=d.adrelid
  JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum AND NOT a.attisdropped
 UNION ALL SELECT 'constraint',r.name,c.conname,'pg_constraint'::regclass,c.oid
  FROM pg_constraint c JOIN relations r ON r.oid=c.conrelid
 UNION ALL SELECT 'index',r.name,i.indexrelid::regclass::text,'pg_class'::regclass,i.indexrelid
  FROM pg_index i JOIN relations r ON r.oid=i.indrelid
), routine_roots(source_kind,relation_name,object_name,oid) AS MATERIALIZED (
 SELECT o.source_kind,o.relation_name,o.object_name,d.refobjid
 FROM dependency_objects o JOIN pg_depend d ON d.classid=o.classid AND d.objid=o.objid
 WHERE d.refclassid='pg_proc'::regclass
 UNION SELECT o.source_kind,o.relation_name,o.object_name,op.oprcode::oid
 FROM dependency_objects o JOIN pg_depend d ON d.classid=o.classid AND d.objid=o.objid
 JOIN pg_operator op ON d.refclassid='pg_operator'::regclass AND op.oid=d.refobjid
 WHERE op.oprcode<>0
 UNION SELECT 'trigger_function',t.relation_name,t.tgname,t.tgfoid FROM triggers t
 UNION SELECT 'named_helper',NULL,h.name,p.oid FROM named_helpers h
 JOIN pg_namespace n ON n.nspname=split_part(h.name,'.',1)
 JOIN pg_proc p ON p.pronamespace=n.oid AND p.proname=split_part(h.name,'.',2)
), function_edges(caller,callee) AS MATERIALIZED (
 SELECT d.objid,d.refobjid FROM pg_depend d
 WHERE d.classid='pg_proc'::regclass AND d.refclassid='pg_proc'::regclass
 UNION SELECT d.objid,o.oprcode::oid FROM pg_depend d JOIN pg_operator o
 ON d.refclassid='pg_operator'::regclass AND o.oid=d.refobjid
 WHERE d.classid='pg_proc'::regclass AND o.oprcode<>0
), routine_walk(oid,depth,path) AS (
 SELECT DISTINCT r.oid,0,ARRAY[r.oid] FROM routine_roots r
 UNION ALL SELECT e.callee,w.depth+1,w.path||e.callee
 FROM routine_walk w JOIN function_edges e ON e.caller=w.oid
 WHERE w.depth<3 AND NOT e.callee=ANY(w.path)
), routine_ids AS MATERIALIZED (
 SELECT oid,min(depth) AS dependency_depth FROM routine_walk GROUP BY oid
), selected_routines AS MATERIALIZED (
 SELECT p.*,n.nspname||'.'||p.proname AS name,i.dependency_depth,
  CASE WHEN p.prokind='a' THEN NULL ELSE pg_get_functiondef(p.oid) END AS definition
 FROM routine_ids i JOIN pg_proc p ON p.oid=i.oid JOIN pg_namespace n ON n.oid=p.pronamespace
), routine_limits AS MATERIALIZED (
 SELECT count(*) AS matched_count,
  coalesce(sum(octet_length(prosrc)+coalesce(octet_length(definition),0)),0) AS definition_bytes,
  coalesce(bool_or(octet_length(prosrc)>131072 OR octet_length(definition)>147456),false) AS oversized_definition
 FROM selected_routines
), routines AS MATERIALIZED (
 -- Any truncation is explicit and rejected by the parser, never accepted as complete.
 SELECT * FROM selected_routines ORDER BY name COLLATE "C",oid::regprocedure::text COLLATE "C" LIMIT 129
), relevant_schemas AS MATERIALIZED (
 SELECT n.* FROM pg_namespace n WHERE n.nspname IN ('storage','auth')
 OR n.oid IN (SELECT pronamespace FROM routines)
), role_seeds(oid) AS (
 SELECT oid FROM actors UNION SELECT oid FROM pg_roles WHERE rolname=current_user
 UNION SELECT relowner FROM relations WHERE oid IS NOT NULL
 UNION SELECT proowner FROM routines UNION SELECT nspowner FROM relevant_schemas
 UNION SELECT x.grantee FROM relations r CROSS JOIN LATERAL aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantor FROM relations r CROSS JOIN LATERAL aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) x WHERE x.grantor<>0
 UNION SELECT x.grantee FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid IN (SELECT oid FROM relations) AND a.attnum>0 AND NOT a.attisdropped AND x.grantee<>0
 UNION SELECT x.grantor FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid IN (SELECT oid FROM relations) AND a.attnum>0 AND NOT a.attisdropped AND x.grantor<>0
 UNION SELECT x.grantee FROM routines p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantor FROM routines p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantor<>0
 UNION SELECT x.grantee FROM relevant_schemas n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantor FROM relevant_schemas n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE x.grantor<>0
 UNION SELECT u FROM policies p CROSS JOIN LATERAL unnest(p.polroles) u WHERE u<>0
), role_closure(oid) AS (
 SELECT oid FROM role_seeds UNION SELECT ancestor.oid FROM pg_auth_members m
 JOIN role_closure c ON c.oid=m.member CROSS JOIN LATERAL (VALUES(m.roleid),(m.grantor)) ancestor(oid)
), result AS MATERIALIZED (
 SELECT jsonb_build_object(
 'format','selqiro-profile-media-catalog-20261120-v1',
 'kind','profile_media_catalog','read_only',current_setting('transaction_read_only'),
 'user_rows_read',false,'source_commit','ab5d1d8cbe20499224541e283df9616304673122',
 'server_version',current_setting('server_version'),'current_role',current_user,
 'baseline',jsonb_build_object('expected_sha256','ecc5f60c52f42b3d1f67dae5bed0b0fefef2c38b51cdd0e03d3e59a534c454b5',
  'scope_sha256',f.sha256,'matched',f.sha256='ecc5f60c52f42b3d1f67dae5bed0b0fefef2c38b51cdd0e03d3e59a534c454b5'),
 'fixed_settings_unfiltered',(f.scope->>'fixed_settings_unfiltered')::boolean
  AND has_table_privilege(current_user,'storage.buckets','SELECT')
  AND NOT row_security_active('storage.buckets'::regclass),
 'hosted_context',f.scope->'hosted_context',
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
  'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.attname,'position',c.attnum,
   'type',format_type(c.atttypid,c.atttypmod),'not_null',c.attnotnull,'identity',c.attidentity,'generated',c.attgenerated,
   'default_expression',pg_get_expr(d.adbin,d.adrelid),
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
   'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),
   'function_dependencies',(SELECT coalesce(jsonb_agg(s.signature ORDER BY s.signature COLLATE "C"),'[]'::jsonb)
    FROM (SELECT DISTINCT rr.oid::regprocedure::text AS signature FROM routine_roots rr
     WHERE rr.source_kind='policy' AND rr.relation_name=r.name AND rr.object_name=p.polname) s)
   ) ORDER BY p.polname COLLATE "C"),'[]'::jsonb) FROM policies p WHERE p.polrelid=r.oid),
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
 'routine_census',jsonb_build_object('method','storage_policy_trigger_expression_catalog_dependencies_v1',
  'dynamic_sql_complete',false,'stored_body_dependencies_complete',false,'external_hooks_checked',false,
  'maximum',128,'max_dependency_depth',3,
  'matched_count',lim.matched_count,'definition_bytes',lim.definition_bytes,
  'overflow',lim.matched_count>128 OR lim.definition_bytes>1572864 OR lim.oversized_definition,
  'unexpanded_dependency_count',(SELECT count(*) FROM function_edges e JOIN routine_ids i ON i.oid=e.caller
   WHERE NOT EXISTS(SELECT 1 FROM routine_ids c WHERE c.oid=e.callee))),
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
  'name',p.name,'signature',p.oid::regprocedure::text,'kind',p.prokind,
  'owner',pg_get_userbyid(p.proowner),'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,
  'result',CASE WHEN p.prokind='p' THEN NULL ELSE pg_get_function_result(p.oid) END,
  'config',(SELECT coalesce(jsonb_agg(x ORDER BY x COLLATE "C"),'[]'::jsonb) FROM unnest(p.proconfig) x),
  'body',CASE WHEN lim.matched_count<=128 AND lim.definition_bytes<=1572864 AND NOT lim.oversized_definition THEN p.prosrc ELSE NULL END,
  'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
  'definition',CASE WHEN lim.matched_count<=128 AND lim.definition_bytes<=1572864 AND NOT lim.oversized_definition THEN p.definition ELSE NULL END,
  'definition_sha256',CASE WHEN p.definition IS NULL THEN NULL ELSE encode(sha256(convert_to(p.definition,'UTF8')),'hex') END,
  'definition_available',p.definition IS NOT NULL,'dependency_depth',p.dependency_depth,
  'sources',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',rr.source_kind,'relation',rr.relation_name,'object',rr.object_name)
   ORDER BY rr.source_kind COLLATE "C",rr.relation_name COLLATE "C" NULLS FIRST,rr.object_name COLLATE "C"),'[]'::jsonb)
   FROM routine_roots rr WHERE rr.oid=p.oid),
  'function_dependencies',(SELECT coalesce(jsonb_agg(e.callee::regprocedure::text ORDER BY e.callee::regprocedure::text COLLATE "C"),'[]'::jsonb)
   FROM function_edges e WHERE e.caller=p.oid),
  'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
   'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
   'privilege',x.privilege_type,'grantable',x.is_grantable)
   ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
   FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x),
  'effective_execute',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,'execute',has_function_privilege(a.oid,p.oid,'EXECUTE'))
   ORDER BY a.rolname COLLATE "C") FROM actors a)) ORDER BY p.name COLLATE "C",p.oid::regprocedure::text COLLATE "C"),'[]'::jsonb)
  FROM routines p JOIN pg_language l ON l.oid=p.prolang),
 'missing_named_helpers',(SELECT coalesce(jsonb_agg(h.name ORDER BY h.name COLLATE "C"),'[]'::jsonb)
  FROM named_helpers h WHERE NOT EXISTS(SELECT 1 FROM routines p WHERE p.name=h.name)),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.relation_name,'name',t.tgname,
  'enabled',t.tgenabled,'event_mask',t.tgtype,'function',t.tgfoid::regprocedure::text,
  'function_dependencies',(SELECT coalesce(jsonb_agg(s.signature ORDER BY s.signature COLLATE "C"),'[]'::jsonb)
   FROM (SELECT DISTINCT rr.oid::regprocedure::text AS signature FROM routine_roots rr
    WHERE rr.source_kind IN ('trigger_function','trigger_dependency') AND rr.relation_name=t.relation_name AND rr.object_name=t.tgname) s),
  'columns',(SELECT coalesce(jsonb_agg(a.attname ORDER BY a.attname COLLATE "C"),'[]'::jsonb)
   FROM pg_attribute a WHERE a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr) AND NOT a.attisdropped),
  'argument_count',t.tgnargs,'arguments_sha256',encode(sha256(t.tgargs),'hex'),
  'when_sha256',CASE WHEN t.tgqual IS NULL THEN NULL ELSE encode(sha256(convert_to(t.tgqual::text,'UTF8')),'hex') END,
  'constraint',t.tgconstraint<>0,'deferrable',t.tgdeferrable,'initially_deferred',t.tginitdeferred,
  'definition',pg_get_triggerdef(t.oid),
  'definition_sha256',encode(sha256(convert_to(pg_get_triggerdef(t.oid),'UTF8')),'hex'))
  ORDER BY t.relation_name COLLATE "C",t.tgname COLLATE "C"),'[]'::jsonb) FROM triggers t),
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
 'identity_media_bucket',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,
  'file_size_limit',b.file_size_limit,'allowed_mime_types',(SELECT jsonb_agg(m ORDER BY m COLLATE "C") FROM unnest(b.allowed_mime_types) m))
  ORDER BY b.id COLLATE "C"),'[]'::jsonb) FROM storage.buckets b WHERE b.id='identity-media')
 ) AS value FROM profile_fingerprint f CROSS JOIN routine_limits lim
)
SELECT value AS result FROM result
), media AS MATERIALIZED (
WITH RECURSIVE actors AS MATERIALIZED (
 SELECT oid,rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')
), media_schema AS MATERIALIZED (
 SELECT * FROM pg_namespace WHERE nspname='profile_media_private'
), media_relations AS MATERIALIZED (
 SELECT c.*,n.nspname||'.'||c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='profile_media_private' AND c.relkind IN ('r','p','v','m','f','S')
), media_functions AS MATERIALIZED (
 SELECT p.*,n.nspname||'.'||p.proname AS name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='profile_media_private' OR (n.nspname='public' AND p.proname IN
 ('get_my_profile_media_v1','begin_my_profile_media_v1','finish_profile_media_upload_v1','update_my_profile_media_v1',
  'claim_profile_media_cleanup_v1','finish_profile_media_cleanup_v1','get_public_profile_media_v1'))
), role_roots(oid) AS (
 SELECT oid FROM actors UNION SELECT nspowner FROM media_schema UNION SELECT relowner FROM media_relations
 UNION SELECT proowner FROM media_functions
 UNION SELECT x.grantee FROM media_schema n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM media_relations c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM media_functions p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantee<>0
), role_closure(oid) AS (
 SELECT oid FROM role_roots UNION SELECT m.roleid FROM pg_auth_members m JOIN role_closure r ON m.member=r.oid
)
SELECT jsonb_build_object(
 'schema',jsonb_build_object('exists',EXISTS(SELECT 1 FROM media_schema),'owner',(SELECT pg_get_userbyid(nspowner) FROM media_schema),
  'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
   'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
   ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
   FROM media_schema n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)),
 'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object(
  'name',c.name,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
  'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
   'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
   ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
   FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
  'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'position',a.attnum,'type',format_type(a.atttypid,a.atttypmod),
   'not_null',a.attnotnull,'generated',a.attgenerated,'identity',a.attidentity,'default_expression',pg_get_expr(d.adbin,d.adrelid),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
    'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
    ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb) FROM aclexplode(a.attacl) x))
   ORDER BY a.attnum),'[]'::jsonb) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
  'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',k.conname,'type',k.contype,'definition',pg_get_constraintdef(k.oid),
   'validated',k.convalidated,'deferrable',k.condeferrable,'initially_deferred',k.condeferred) ORDER BY k.conname COLLATE "C"),'[]'::jsonb) FROM pg_constraint k WHERE k.conrelid=c.oid AND k.contype<>'n'),
  'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,'definition',pg_get_indexdef(i.indexrelid),
   'valid',i.indisvalid,'ready',i.indisready,'unique',i.indisunique) ORDER BY i.indexrelid::regclass::text COLLATE "C"),'[]'::jsonb) FROM pg_index i WHERE i.indrelid=c.oid),
  'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
   'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY (CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END) COLLATE "C") FROM unnest(p.polroles) r),
   'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname COLLATE "C"),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid),
  'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid),
   'function',t.tgfoid::regprocedure::text,'arguments_sha256',encode(sha256(t.tgargs),'hex')) ORDER BY t.tgname COLLATE "C"),'[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rulename,'definition',pg_get_ruledef(r.oid)) ORDER BY r.rulename COLLATE "C"),'[]'::jsonb) FROM pg_rewrite r WHERE r.ev_class=c.oid)
 ) ORDER BY c.name COLLATE "C"),'[]'::jsonb) FROM media_relations c),
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.name,'signature',p.oid::regprocedure::text,
  'owner',pg_get_userbyid(p.proowner),'kind',p.prokind,'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,
  'config',coalesce(to_jsonb(p.proconfig),'[]'::jsonb),'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
  'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
  'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
   'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
   ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
   FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x),
  'effective_execute',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,'execute',has_function_privilege(a.oid,p.oid,'EXECUTE')) ORDER BY a.rolname COLLATE "C") FROM actors a)
 ) ORDER BY p.oid::regprocedure::text COLLATE "C"),'[]'::jsonb) FROM media_functions p JOIN pg_language l ON l.oid=p.prolang),
 'roles',(SELECT jsonb_agg(jsonb_build_object('name',r.rolname,'superuser',r.rolsuper,'inherit',r.rolinherit,'bypass_rls',r.rolbypassrls,
  'create_role',r.rolcreaterole,'create_db',r.rolcreatedb,'can_login',r.rolcanlogin) ORDER BY r.rolname COLLATE "C") FROM pg_roles r WHERE r.oid IN (SELECT oid FROM role_closure)),
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('member',pg_get_userbyid(m.member),'role',pg_get_userbyid(m.roleid),
  'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,'inherit',to_jsonb(m)->'inherit_option','set',to_jsonb(m)->'set_option')
  ORDER BY pg_get_userbyid(m.member) COLLATE "C",pg_get_userbyid(m.roleid) COLLATE "C",pg_get_userbyid(m.grantor) COLLATE "C"),'[]'::jsonb)
  FROM pg_auth_members m WHERE m.member IN (SELECT oid FROM role_closure))
) AS media_scope
)
SELECT jsonb_build_object(
 'format','selqiro-profile-media-scope-20261120-v1',
 'profile_scope_sha256',s.result#>'{baseline,scope_sha256}',
 'storage',(s.result-'baseline'-'format'-'kind'-'read_only'-'server_version'-'source_commit'-'user_rows_read'-'triggers')
  ||jsonb_build_object('triggers',(SELECT jsonb_agg(t.value-'when_sha256' ORDER BY t.ordinality)
   FROM jsonb_array_elements(s.result->'triggers') WITH ORDINALITY t(value,ordinality))),
 'media',m.media_scope) AS scope
FROM observed_storage s CROSS JOIN media m) captured;
 IF actual IS DISTINCT FROM '269efbc018c713d08847758d8dcdcd00e44a05958d23fd643b2af12df22199ee' THEN
  RAISE EXCEPTION 'profile_media_after_state_mismatch' USING ERRCODE='55000';
 END IF;
END;
$guard$;
WITH captured AS MATERIALIZED (-- No application/user/Storage object rows are read. Fixed settings only.
-- pg_trigger.tgqual raw node hashes contain installation-specific object OIDs.
-- Their canonical pg_get_triggerdef text/hash, arguments and dependencies stay
-- in the Storage fingerprint; only that nonportable raw-node hash is omitted.
WITH observed_storage AS MATERIALIZED (
WITH RECURSIVE profile_scope AS MATERIALIZED (
-- Exact accepted read state plus bounded writer metadata; no application rows.
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

),
profile_fingerprint AS MATERIALIZED (
 SELECT scope,encode(sha256(convert_to(scope::text,'UTF8')),'hex') AS sha256 FROM profile_scope
), wanted_relations(name) AS (VALUES ('storage.buckets'),('storage.objects')),
relations AS MATERIALIZED (
 SELECT w.name,c.* FROM wanted_relations w LEFT JOIN pg_class c ON c.oid=to_regclass(w.name)
), actors AS MATERIALIZED (
 SELECT oid,rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')
), policies AS MATERIALIZED (
 -- Every policy on each shared relation, including policies without a bucket literal.
 SELECT p.*,r.name AS relation_name FROM pg_policy p JOIN relations r ON r.oid=p.polrelid
), triggers AS MATERIALIZED (
 SELECT t.*,r.name AS relation_name FROM pg_trigger t JOIN relations r ON r.oid=t.tgrelid
 WHERE NOT t.tgisinternal
), named_helpers(name) AS (VALUES ('auth.uid'),('storage.foldername')),
dependency_objects(source_kind,relation_name,object_name,classid,objid) AS MATERIALIZED (
 SELECT 'policy',p.relation_name,p.polname,'pg_policy'::regclass,p.oid FROM policies p
 UNION ALL SELECT 'trigger_dependency',t.relation_name,t.tgname,'pg_trigger'::regclass,t.oid FROM triggers t
 UNION ALL SELECT 'column_default',r.name,a.attname,'pg_attrdef'::regclass,d.oid
  FROM pg_attrdef d JOIN relations r ON r.oid=d.adrelid
  JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum AND NOT a.attisdropped
 UNION ALL SELECT 'constraint',r.name,c.conname,'pg_constraint'::regclass,c.oid
  FROM pg_constraint c JOIN relations r ON r.oid=c.conrelid
 UNION ALL SELECT 'index',r.name,i.indexrelid::regclass::text,'pg_class'::regclass,i.indexrelid
  FROM pg_index i JOIN relations r ON r.oid=i.indrelid
), routine_roots(source_kind,relation_name,object_name,oid) AS MATERIALIZED (
 SELECT o.source_kind,o.relation_name,o.object_name,d.refobjid
 FROM dependency_objects o JOIN pg_depend d ON d.classid=o.classid AND d.objid=o.objid
 WHERE d.refclassid='pg_proc'::regclass
 UNION SELECT o.source_kind,o.relation_name,o.object_name,op.oprcode::oid
 FROM dependency_objects o JOIN pg_depend d ON d.classid=o.classid AND d.objid=o.objid
 JOIN pg_operator op ON d.refclassid='pg_operator'::regclass AND op.oid=d.refobjid
 WHERE op.oprcode<>0
 UNION SELECT 'trigger_function',t.relation_name,t.tgname,t.tgfoid FROM triggers t
 UNION SELECT 'named_helper',NULL,h.name,p.oid FROM named_helpers h
 JOIN pg_namespace n ON n.nspname=split_part(h.name,'.',1)
 JOIN pg_proc p ON p.pronamespace=n.oid AND p.proname=split_part(h.name,'.',2)
), function_edges(caller,callee) AS MATERIALIZED (
 SELECT d.objid,d.refobjid FROM pg_depend d
 WHERE d.classid='pg_proc'::regclass AND d.refclassid='pg_proc'::regclass
 UNION SELECT d.objid,o.oprcode::oid FROM pg_depend d JOIN pg_operator o
 ON d.refclassid='pg_operator'::regclass AND o.oid=d.refobjid
 WHERE d.classid='pg_proc'::regclass AND o.oprcode<>0
), routine_walk(oid,depth,path) AS (
 SELECT DISTINCT r.oid,0,ARRAY[r.oid] FROM routine_roots r
 UNION ALL SELECT e.callee,w.depth+1,w.path||e.callee
 FROM routine_walk w JOIN function_edges e ON e.caller=w.oid
 WHERE w.depth<3 AND NOT e.callee=ANY(w.path)
), routine_ids AS MATERIALIZED (
 SELECT oid,min(depth) AS dependency_depth FROM routine_walk GROUP BY oid
), selected_routines AS MATERIALIZED (
 SELECT p.*,n.nspname||'.'||p.proname AS name,i.dependency_depth,
  CASE WHEN p.prokind='a' THEN NULL ELSE pg_get_functiondef(p.oid) END AS definition
 FROM routine_ids i JOIN pg_proc p ON p.oid=i.oid JOIN pg_namespace n ON n.oid=p.pronamespace
), routine_limits AS MATERIALIZED (
 SELECT count(*) AS matched_count,
  coalesce(sum(octet_length(prosrc)+coalesce(octet_length(definition),0)),0) AS definition_bytes,
  coalesce(bool_or(octet_length(prosrc)>131072 OR octet_length(definition)>147456),false) AS oversized_definition
 FROM selected_routines
), routines AS MATERIALIZED (
 -- Any truncation is explicit and rejected by the parser, never accepted as complete.
 SELECT * FROM selected_routines ORDER BY name COLLATE "C",oid::regprocedure::text COLLATE "C" LIMIT 129
), relevant_schemas AS MATERIALIZED (
 SELECT n.* FROM pg_namespace n WHERE n.nspname IN ('storage','auth')
 OR n.oid IN (SELECT pronamespace FROM routines)
), role_seeds(oid) AS (
 SELECT oid FROM actors UNION SELECT oid FROM pg_roles WHERE rolname=current_user
 UNION SELECT relowner FROM relations WHERE oid IS NOT NULL
 UNION SELECT proowner FROM routines UNION SELECT nspowner FROM relevant_schemas
 UNION SELECT x.grantee FROM relations r CROSS JOIN LATERAL aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantor FROM relations r CROSS JOIN LATERAL aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) x WHERE x.grantor<>0
 UNION SELECT x.grantee FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid IN (SELECT oid FROM relations) AND a.attnum>0 AND NOT a.attisdropped AND x.grantee<>0
 UNION SELECT x.grantor FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
  WHERE a.attrelid IN (SELECT oid FROM relations) AND a.attnum>0 AND NOT a.attisdropped AND x.grantor<>0
 UNION SELECT x.grantee FROM routines p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantor FROM routines p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantor<>0
 UNION SELECT x.grantee FROM relevant_schemas n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantor FROM relevant_schemas n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE x.grantor<>0
 UNION SELECT u FROM policies p CROSS JOIN LATERAL unnest(p.polroles) u WHERE u<>0
), role_closure(oid) AS (
 SELECT oid FROM role_seeds UNION SELECT ancestor.oid FROM pg_auth_members m
 JOIN role_closure c ON c.oid=m.member CROSS JOIN LATERAL (VALUES(m.roleid),(m.grantor)) ancestor(oid)
), result AS MATERIALIZED (
 SELECT jsonb_build_object(
 'format','selqiro-profile-media-catalog-20261120-v1',
 'kind','profile_media_catalog','read_only',current_setting('transaction_read_only'),
 'user_rows_read',false,'source_commit','ab5d1d8cbe20499224541e283df9616304673122',
 'server_version',current_setting('server_version'),'current_role',current_user,
 'baseline',jsonb_build_object('expected_sha256','ecc5f60c52f42b3d1f67dae5bed0b0fefef2c38b51cdd0e03d3e59a534c454b5',
  'scope_sha256',f.sha256,'matched',f.sha256='ecc5f60c52f42b3d1f67dae5bed0b0fefef2c38b51cdd0e03d3e59a534c454b5'),
 'fixed_settings_unfiltered',(f.scope->>'fixed_settings_unfiltered')::boolean
  AND has_table_privilege(current_user,'storage.buckets','SELECT')
  AND NOT row_security_active('storage.buckets'::regclass),
 'hosted_context',f.scope->'hosted_context',
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
  'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.attname,'position',c.attnum,
   'type',format_type(c.atttypid,c.atttypmod),'not_null',c.attnotnull,'identity',c.attidentity,'generated',c.attgenerated,
   'default_expression',pg_get_expr(d.adbin,d.adrelid),
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
   'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid),
   'function_dependencies',(SELECT coalesce(jsonb_agg(s.signature ORDER BY s.signature COLLATE "C"),'[]'::jsonb)
    FROM (SELECT DISTINCT rr.oid::regprocedure::text AS signature FROM routine_roots rr
     WHERE rr.source_kind='policy' AND rr.relation_name=r.name AND rr.object_name=p.polname) s)
   ) ORDER BY p.polname COLLATE "C"),'[]'::jsonb) FROM policies p WHERE p.polrelid=r.oid),
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
 'routine_census',jsonb_build_object('method','storage_policy_trigger_expression_catalog_dependencies_v1',
  'dynamic_sql_complete',false,'stored_body_dependencies_complete',false,'external_hooks_checked',false,
  'maximum',128,'max_dependency_depth',3,
  'matched_count',lim.matched_count,'definition_bytes',lim.definition_bytes,
  'overflow',lim.matched_count>128 OR lim.definition_bytes>1572864 OR lim.oversized_definition,
  'unexpanded_dependency_count',(SELECT count(*) FROM function_edges e JOIN routine_ids i ON i.oid=e.caller
   WHERE NOT EXISTS(SELECT 1 FROM routine_ids c WHERE c.oid=e.callee))),
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
  'name',p.name,'signature',p.oid::regprocedure::text,'kind',p.prokind,
  'owner',pg_get_userbyid(p.proowner),'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,
  'result',CASE WHEN p.prokind='p' THEN NULL ELSE pg_get_function_result(p.oid) END,
  'config',(SELECT coalesce(jsonb_agg(x ORDER BY x COLLATE "C"),'[]'::jsonb) FROM unnest(p.proconfig) x),
  'body',CASE WHEN lim.matched_count<=128 AND lim.definition_bytes<=1572864 AND NOT lim.oversized_definition THEN p.prosrc ELSE NULL END,
  'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
  'definition',CASE WHEN lim.matched_count<=128 AND lim.definition_bytes<=1572864 AND NOT lim.oversized_definition THEN p.definition ELSE NULL END,
  'definition_sha256',CASE WHEN p.definition IS NULL THEN NULL ELSE encode(sha256(convert_to(p.definition,'UTF8')),'hex') END,
  'definition_available',p.definition IS NOT NULL,'dependency_depth',p.dependency_depth,
  'sources',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',rr.source_kind,'relation',rr.relation_name,'object',rr.object_name)
   ORDER BY rr.source_kind COLLATE "C",rr.relation_name COLLATE "C" NULLS FIRST,rr.object_name COLLATE "C"),'[]'::jsonb)
   FROM routine_roots rr WHERE rr.oid=p.oid),
  'function_dependencies',(SELECT coalesce(jsonb_agg(e.callee::regprocedure::text ORDER BY e.callee::regprocedure::text COLLATE "C"),'[]'::jsonb)
   FROM function_edges e WHERE e.caller=p.oid),
  'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
   'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
   'privilege',x.privilege_type,'grantable',x.is_grantable)
   ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
   FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x),
  'effective_execute',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,'execute',has_function_privilege(a.oid,p.oid,'EXECUTE'))
   ORDER BY a.rolname COLLATE "C") FROM actors a)) ORDER BY p.name COLLATE "C",p.oid::regprocedure::text COLLATE "C"),'[]'::jsonb)
  FROM routines p JOIN pg_language l ON l.oid=p.prolang),
 'missing_named_helpers',(SELECT coalesce(jsonb_agg(h.name ORDER BY h.name COLLATE "C"),'[]'::jsonb)
  FROM named_helpers h WHERE NOT EXISTS(SELECT 1 FROM routines p WHERE p.name=h.name)),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.relation_name,'name',t.tgname,
  'enabled',t.tgenabled,'event_mask',t.tgtype,'function',t.tgfoid::regprocedure::text,
  'function_dependencies',(SELECT coalesce(jsonb_agg(s.signature ORDER BY s.signature COLLATE "C"),'[]'::jsonb)
   FROM (SELECT DISTINCT rr.oid::regprocedure::text AS signature FROM routine_roots rr
    WHERE rr.source_kind IN ('trigger_function','trigger_dependency') AND rr.relation_name=t.relation_name AND rr.object_name=t.tgname) s),
  'columns',(SELECT coalesce(jsonb_agg(a.attname ORDER BY a.attname COLLATE "C"),'[]'::jsonb)
   FROM pg_attribute a WHERE a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr) AND NOT a.attisdropped),
  'argument_count',t.tgnargs,'arguments_sha256',encode(sha256(t.tgargs),'hex'),
  'when_sha256',CASE WHEN t.tgqual IS NULL THEN NULL ELSE encode(sha256(convert_to(t.tgqual::text,'UTF8')),'hex') END,
  'constraint',t.tgconstraint<>0,'deferrable',t.tgdeferrable,'initially_deferred',t.tginitdeferred,
  'definition',pg_get_triggerdef(t.oid),
  'definition_sha256',encode(sha256(convert_to(pg_get_triggerdef(t.oid),'UTF8')),'hex'))
  ORDER BY t.relation_name COLLATE "C",t.tgname COLLATE "C"),'[]'::jsonb) FROM triggers t),
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
 'identity_media_bucket',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,
  'file_size_limit',b.file_size_limit,'allowed_mime_types',(SELECT jsonb_agg(m ORDER BY m COLLATE "C") FROM unnest(b.allowed_mime_types) m))
  ORDER BY b.id COLLATE "C"),'[]'::jsonb) FROM storage.buckets b WHERE b.id='identity-media')
 ) AS value FROM profile_fingerprint f CROSS JOIN routine_limits lim
)
SELECT value AS result FROM result
), media AS MATERIALIZED (
WITH RECURSIVE actors AS MATERIALIZED (
 SELECT oid,rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')
), media_schema AS MATERIALIZED (
 SELECT * FROM pg_namespace WHERE nspname='profile_media_private'
), media_relations AS MATERIALIZED (
 SELECT c.*,n.nspname||'.'||c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='profile_media_private' AND c.relkind IN ('r','p','v','m','f','S')
), media_functions AS MATERIALIZED (
 SELECT p.*,n.nspname||'.'||p.proname AS name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='profile_media_private' OR (n.nspname='public' AND p.proname IN
 ('get_my_profile_media_v1','begin_my_profile_media_v1','finish_profile_media_upload_v1','update_my_profile_media_v1',
  'claim_profile_media_cleanup_v1','finish_profile_media_cleanup_v1','get_public_profile_media_v1'))
), role_roots(oid) AS (
 SELECT oid FROM actors UNION SELECT nspowner FROM media_schema UNION SELECT relowner FROM media_relations
 UNION SELECT proowner FROM media_functions
 UNION SELECT x.grantee FROM media_schema n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM media_relations c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x WHERE x.grantee<>0
 UNION SELECT x.grantee FROM media_functions p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE x.grantee<>0
), role_closure(oid) AS (
 SELECT oid FROM role_roots UNION SELECT m.roleid FROM pg_auth_members m JOIN role_closure r ON m.member=r.oid
)
SELECT jsonb_build_object(
 'schema',jsonb_build_object('exists',EXISTS(SELECT 1 FROM media_schema),'owner',(SELECT pg_get_userbyid(nspowner) FROM media_schema),
  'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
   'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
   ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
   FROM media_schema n CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)),
 'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object(
  'name',c.name,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
  'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
   'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
   ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
   FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
  'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'position',a.attnum,'type',format_type(a.atttypid,a.atttypmod),
   'not_null',a.attnotnull,'generated',a.attgenerated,'identity',a.attidentity,'default_expression',pg_get_expr(d.adbin,d.adrelid),
   'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
    'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
    ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb) FROM aclexplode(a.attacl) x))
   ORDER BY a.attnum),'[]'::jsonb) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
  'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',k.conname,'type',k.contype,'definition',pg_get_constraintdef(k.oid),
   'validated',k.convalidated,'deferrable',k.condeferrable,'initially_deferred',k.condeferred) ORDER BY k.conname COLLATE "C"),'[]'::jsonb) FROM pg_constraint k WHERE k.conrelid=c.oid AND k.contype<>'n'),
  'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,'definition',pg_get_indexdef(i.indexrelid),
   'valid',i.indisvalid,'ready',i.indisready,'unique',i.indisunique) ORDER BY i.indexrelid::regclass::text COLLATE "C"),'[]'::jsonb) FROM pg_index i WHERE i.indrelid=c.oid),
  'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
   'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY (CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END) COLLATE "C") FROM unnest(p.polroles) r),
   'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname COLLATE "C"),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid),
  'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid),
   'function',t.tgfoid::regprocedure::text,'arguments_sha256',encode(sha256(t.tgargs),'hex')) ORDER BY t.tgname COLLATE "C"),'[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rulename,'definition',pg_get_ruledef(r.oid)) ORDER BY r.rulename COLLATE "C"),'[]'::jsonb) FROM pg_rewrite r WHERE r.ev_class=c.oid)
 ) ORDER BY c.name COLLATE "C"),'[]'::jsonb) FROM media_relations c),
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.name,'signature',p.oid::regprocedure::text,
  'owner',pg_get_userbyid(p.proowner),'kind',p.prokind,'language',l.lanname,'definer',p.prosecdef,'volatility',p.provolatile,
  'config',coalesce(to_jsonb(p.proconfig),'[]'::jsonb),'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
  'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
  'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
   'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
   ORDER BY pg_get_userbyid(x.grantor) COLLATE "C",(CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END) COLLATE "C",x.privilege_type COLLATE "C"),'[]'::jsonb)
   FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x),
  'effective_execute',(SELECT jsonb_agg(jsonb_build_object('role',a.rolname,'execute',has_function_privilege(a.oid,p.oid,'EXECUTE')) ORDER BY a.rolname COLLATE "C") FROM actors a)
 ) ORDER BY p.oid::regprocedure::text COLLATE "C"),'[]'::jsonb) FROM media_functions p JOIN pg_language l ON l.oid=p.prolang),
 'roles',(SELECT jsonb_agg(jsonb_build_object('name',r.rolname,'superuser',r.rolsuper,'inherit',r.rolinherit,'bypass_rls',r.rolbypassrls,
  'create_role',r.rolcreaterole,'create_db',r.rolcreatedb,'can_login',r.rolcanlogin) ORDER BY r.rolname COLLATE "C") FROM pg_roles r WHERE r.oid IN (SELECT oid FROM role_closure)),
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('member',pg_get_userbyid(m.member),'role',pg_get_userbyid(m.roleid),
  'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,'inherit',to_jsonb(m)->'inherit_option','set',to_jsonb(m)->'set_option')
  ORDER BY pg_get_userbyid(m.member) COLLATE "C",pg_get_userbyid(m.roleid) COLLATE "C",pg_get_userbyid(m.grantor) COLLATE "C"),'[]'::jsonb)
  FROM pg_auth_members m WHERE m.member IN (SELECT oid FROM role_closure))
) AS media_scope
)
SELECT jsonb_build_object(
 'format','selqiro-profile-media-scope-20261120-v1',
 'profile_scope_sha256',s.result#>'{baseline,scope_sha256}',
 'storage',(s.result-'baseline'-'format'-'kind'-'read_only'-'server_version'-'source_commit'-'user_rows_read'-'triggers')
  ||jsonb_build_object('triggers',(SELECT jsonb_agg(t.value-'when_sha256' ORDER BY t.ordinality)
   FROM jsonb_array_elements(s.result->'triggers') WITH ORDINALITY t(value,ordinality))),
 'media',m.media_scope) AS scope
FROM observed_storage s CROSS JOIN media m), fingerprint AS (
 SELECT encode(sha256(convert_to(scope::text,'UTF8')),'hex') AS sha FROM captured
)
SELECT jsonb_build_object(
 'format','selqiro-profile-media-state-20261120-v1',
 'state',CASE sha WHEN '44d1a0dacd64ef6dd12860a3ec20321f3eb9fc2e5d02427bca7b4b9097ad8c7c' THEN 'before' WHEN '269efbc018c713d08847758d8dcdcd00e44a05958d23fd643b2af12df22199ee' THEN 'after' ELSE 'unknown' END,
 'recognized',sha IN ('44d1a0dacd64ef6dd12860a3ec20321f3eb9fc2e5d02427bca7b4b9097ad8c7c','269efbc018c713d08847758d8dcdcd00e44a05958d23fd643b2af12df22199ee'),'read_only',false,
 'project_ref','vyjletlmwoiwxsnsunlm','instance_id','2d088814-0900-448a-a9d1-7b05470cb1d2',
 'release_id','listing-publication-hosted-preview-v1','scope_sha256',sha,
 'expected_before_sha256','44d1a0dacd64ef6dd12860a3ec20321f3eb9fc2e5d02427bca7b4b9097ad8c7c','expected_after_sha256','269efbc018c713d08847758d8dcdcd00e44a05958d23fd643b2af12df22199ee','user_rows_read',false
) AS result FROM fingerprint;
NOTIFY pgrst, 'reload schema';
COMMIT;
