import assert from 'node:assert/strict';
import {catalogParts,quote,array,digest} from '../../20261109_service_profile_polish/tests/catalog.mjs';
import {parts as managementParts,dependencyNames} from '../../20261110_store_category_management/tests/catalog.mjs';
export {quote,array,digest};
export const guardNames=['installer','actor_roles','hosted_context_ready','retained_release',
 'category_functions','category_structure','category_delete_effects','retained_category_authority',
 'api_roles_and_entrypoints'];
const aggregate=table=>`(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM ${table})`;
export function parts(profileVerify,servicePreflight,profilePins){
 const m=managementParts(profileVerify,servicePreflight),p=catalogParts(servicePreflight);
 const old='f95c0cd0cbb13e51962ade6842c6faa0dad1aacf3ba9a3a50a34ca33c769fe6f';
 assert.equal(p.retainedQuery.split(old).length-1,1);
 // The two changed service readers have their own exact fingerprint below.
 // Other service functions, tables, settings and hosted guards stay retained.
 const retained=p.retainedQuery.replace(old,profilePins.retained_capability_without_two_readers_sha256);
 const categoryAuthority="(SELECT authority FROM store_relations WHERE name='public.store_categories')";
 const linkAuthority="(SELECT authority FROM store_relations WHERE name='public.listing_store_categories')";
 const functions=`jsonb_build_object('readers',${aggregate('reader_facts')},'profile',${aggregate('profile_functions')},
  'category',${aggregate('category_functions')},'management',${aggregate('capability_functions')})`;
 const roleFacts=`jsonb_build_object('roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'super',rolsuper,
  'createrole',rolcreaterole,'createdb',rolcreatedb,'replication',rolreplication,'bypassrls',rolbypassrls) ORDER BY rolname)
  FROM pg_roles WHERE rolname IN('anon','authenticated')),
  'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),
   'member',pg_get_userbyid(member),'grantor',pg_get_userbyid(grantor),'admin',admin_option,
   'inherit',inherit_option,'set',set_option) ORDER BY roleid::regrole::text,member::regrole::text,grantor::regrole::text),'[]')
   FROM pg_auth_members WHERE member IN(to_regrole('anon'),to_regrole('authenticated'))))`;
 const effective=`jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',has_table_privilege(a.role,'public.listing_store_categories',p.privilege),
  'grantable',has_table_privilege(a.role,'public.listing_store_categories',p.privilege||' WITH GRANT OPTION'))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege)),
  'columns',(SELECT jsonb_agg(jsonb_build_object('role',r.role,'column',a.attname,'privilege',p.privilege,
  'allowed',has_column_privilege(r.role,a.attrelid,a.attname,p.privilege)) ORDER BY r.role,a.attname,p.privilege)
  FROM pg_attribute a CROSS JOIN unnest(ARRAY['anon','authenticated']) r(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES']) p(privilege)
  WHERE a.attrelid='public.listing_store_categories'::regclass AND a.attnum>0 AND NOT a.attisdropped))`;
 const safeRoles=`(SELECT count(*) FROM pg_roles WHERE rolname IN('anon','authenticated'))=2
  AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN('anon','authenticated')
   AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls))
  AND NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE member IN(to_regrole('anon'),to_regrole('authenticated')))
  AND NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.listing_store_categories'::regclass
   AND relowner IN(to_regrole('anon'),to_regrole('authenticated')))
  AND NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.listing_store_categories'::regclass
   AND attnum>0 AND NOT attisdropped AND cardinality(attacl)>0)
  AND has_function_privilege('authenticated','public.set_my_listing_store_categories_v2(text,uuid[])','EXECUTE')
  AND NOT has_function_privilege('anon','public.set_my_listing_store_categories_v2(text,uuid[])','EXECUTE')
  AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY['anon','authenticated']) a
   WHERE has_schema_privilege(a,'public','CREATE'))`;
 return {retained,extra:m.extra,functions,structure:p.storeStructure,effects:m.effects,
  categoryAuthority,roleFacts,safeRoles,effective,
  target:`jsonb_build_object('authority',${linkAuthority},'effective',${effective})`,
  functionCounts:`(SELECT count(*) FROM reader_facts)=3 AND (SELECT count(*) FROM profile_functions)=3
   AND (SELECT count(*) FROM category_functions)=${dependencyNames.length}
   AND (SELECT count(*) FROM capability_functions)=1`};
}
export function report(p,pins){
 const q=key=>quote(pins[key]);
 return `WITH retained AS (${p.retained}),
 ${p.extra}, measured AS (
 SELECT r.result retained,${digest(p.functions)} functions,${digest(p.structure)} structure,
 ${digest(p.effects)} effects,${digest(p.categoryAuthority)} category_authority,
 ${digest(p.roleFacts)} api_roles,${digest(p.target)} capability,
 (${p.safeRoles}) safe_api_roles,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'existing_functions','categories',"+p.functions+')')} existing_functions,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'existing_authority','store_categories',"+p.categoryAuthority+",'api_roles',"+p.roleFacts+')')} existing_authority,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'immutable_structure','categories',"+p.structure+",'effects',"+p.effects+')')} immutable_structure
 FROM retained r), checks AS (
 SELECT *,jsonb_build_object(
 'installer',coalesce((retained->'guards'->>'installer')::boolean,false),
 'actor_roles',coalesce((retained->'guards'->>'actor_roles')::boolean,false),
 'hosted_context_ready',coalesce((retained->'guards'->>'hosted_context_ready')::boolean,false),
 'retained_release',coalesce(retained->>'state'='applied' AND (retained->>'recognized')::boolean
   AND (retained->>'dependencies_ok')::boolean AND NOT EXISTS(SELECT 1 FROM jsonb_each(retained->'guards') g WHERE g.value<>'true'::jsonb)
   AND retained->'fingerprints'->>'dependencies'=${q('retainedDependencies')}
   AND retained->'fingerprints'->>'capability'=${q('retainedCapability')},false),
 'category_functions',functions=${q('functions')} AND ${p.functionCounts},
 'category_structure',structure=${q('structure')} AND (SELECT count(*) FROM store_relations)=2,
 'category_delete_effects',effects=${q('effects')},
 'retained_category_authority',category_authority=${q('categoryAuthority')},
 'api_roles_and_entrypoints',safe_api_roles AND api_roles=${q('apiRoles')}) guards,
 capability=${q('before')} capability_absent,capability=${q('after')} capability_present FROM measured),
 assessed AS (SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb) dependencies_ok FROM checks)
 SELECT jsonb_build_object('schema_version',1,'kind','store-category-authority-v1',
 'state',CASE WHEN dependencies_ok AND capability_absent AND NOT capability_present THEN 'absent'
  WHEN dependencies_ok AND capability_present AND NOT capability_absent THEN 'applied' ELSE 'unknown' END,
 'recognized',dependencies_ok AND (capability_absent<>capability_present),
 'ready_to_apply',dependencies_ok AND capability_absent AND NOT capability_present,
 'dependencies_ok',dependencies_ok,'capability_absent',capability_absent,'capability_present',capability_present,
 'guards',guards,'hosted_context',retained->'hosted_context',
 'fingerprints',jsonb_build_object('dependencies',${digest("jsonb_build_object('retained',retained->'fingerprints','functions',functions,'structure',structure,'effects',effects,'category_authority',category_authority,'api_roles',api_roles)")},'capability',capability),
 'invariants',jsonb_build_object('existing_functions',existing_functions,'existing_authority',existing_authority,'immutable_structure',immutable_structure)) result FROM assessed`;
}
