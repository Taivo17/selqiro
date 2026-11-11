import assert from 'node:assert/strict';
import {parts as horseParts,quote,array,digest} from '../../20261110_horse_store_categories/tests/catalog.mjs';
export {quote,array,digest};
export const functionNames=['public.get_my_service_store_categories_v1','public.set_my_service_store_categories_v1',
 'public.get_public_profile_services_v2','public.get_public_profile_store_categories_v2'].sort();
export const guardNames=['installer','actor_roles','hosted_context_ready','retained_release',
 'category_functions','category_structure','category_delete_effects','service_delete_effects',
 'retained_category_authority','retained_link_authority','retained_horse_categories','api_roles_and_entrypoints'];
export function parts(profileVerify,servicePreflight,profilePins){
 const old=horseParts(profileVerify,servicePreflight,profilePins);
 const fStart=servicePreflight.indexOf('WITH function_facts AS (')+'WITH function_facts AS ('.length;
 const fEnd=servicePreflight.indexOf(' WHERE p.prokind IN',fStart);
 const rStart=servicePreflight.indexOf('),relation_facts AS (')+'),relation_facts AS ('.length;
 const rEnd=servicePreflight.indexOf('\n AND (n.nspname IN',rStart);
 assert(fEnd>fStart&&rEnd>rStart);
 const newFunctions=servicePreflight.slice(fStart,fEnd)+" WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY("+array(functionNames)+')';
 const newRelation=servicePreflight.slice(rStart,rEnd)+" AND n.nspname||'.'||c.relname='public.service_store_categories'";
 const extra=old.extra+',\n service_category_functions AS ('+newFunctions+'),\n service_category_relations AS ('+newRelation+')';
 // Exclude exactly our added FK from retained parent effects; the entire new
 // relation, both FKs, every grant, rule and trigger are separately pinned.
 const incoming="FROM pg_constraint q WHERE q.contype='f'";
 assert.equal(old.effects.split(incoming).length,2);
 const effects=old.effects.replace(incoming,incoming+" AND q.conrelid IS DISTINCT FROM to_regclass('public.service_store_categories')");
 const pair="'public.store_categories'::regclass,'public.listing_store_categories'::regclass";
 assert.equal(effects.split(pair).length,4);
 const serviceEffects=effects.replaceAll(pair,"'public.services'::regclass,'public.service_images'::regclass");
 // Neither deliberately excluded table can be a source of an incoming FK to
 // its own new service link relation. Include all sources in its own effects.
 const newEffects=old.effects.replaceAll(pair,"to_regclass('public.service_store_categories')")
  .replace(" AND q.conrelid IS DISTINCT FROM to_regclass('public.horse_offer_store_categories')",'');
 const effective=`jsonb_build_object('table',(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('public.service_store_categories'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege)))`;
 const target=`jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM service_category_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM service_category_relations),
  'effects',${newEffects},'effective',${effective},
  'object_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',c.relkind,'name',n.nspname||'.'||c.relname) ORDER BY n.nspname,c.relname,c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    AND c.relname=ANY(ARRAY['service_store_categories','service_store_categories_pkey','service_store_categories_category_idx'])),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(${array(functionNames)})))`;
 return {...old,extra,effects,serviceEffects,horseTarget:old.target,target,effective};
}
export function report(p,pins){
 const q=key=>quote(pins[key]);
 return `WITH retained AS (${p.retained}),
 ${p.extra}, measured AS (
 SELECT r.result retained,${digest(p.functions)} functions,${digest(p.structure)} structure,
 ${digest(p.effects)} effects,${digest(p.serviceEffects)} service_effects,${digest(p.categoryAuthority)} category_authority,
 ${digest(p.roleFacts)} api_roles,${digest(p.legacyTarget)} legacy_authority,${digest(p.horseTarget)} horse_capability,
 ${digest(p.target)} capability,(${p.safeRoles}) safe_api_roles,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'existing_functions','categories',"+p.functions+",'horse_capability',"+p.horseTarget+')')} existing_functions,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'existing_authority','store_categories',"+p.categoryAuthority+",'ordinary_links',"+p.legacyTarget+",'horse_capability',"+p.horseTarget+",'api_roles',"+p.roleFacts+')')} existing_authority,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'immutable_structure','categories',"+p.structure+",'effects',"+p.effects+",'service_effects',"+p.serviceEffects+",'horse_capability',"+p.horseTarget+')')} immutable_structure
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
 'service_delete_effects',service_effects=${q('serviceEffects')},
 'retained_category_authority',category_authority=${q('categoryAuthority')},
 'retained_link_authority',legacy_authority=${q('legacyAuthority')},
 'retained_horse_categories',horse_capability=${q('horseCapability')},
 'api_roles_and_entrypoints',safe_api_roles AND api_roles=${q('apiRoles')}) guards,
 capability=${q('before')} capability_absent,capability=${q('after')} capability_present FROM measured),
 assessed AS (SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb) dependencies_ok FROM checks)
 SELECT jsonb_build_object('schema_version',1,'kind','service-store-categories-v1',
 'state',CASE WHEN dependencies_ok AND capability_absent AND NOT capability_present THEN 'absent'
  WHEN dependencies_ok AND capability_present AND NOT capability_absent THEN 'applied' ELSE 'unknown' END,
 'recognized',dependencies_ok AND (capability_absent<>capability_present),
 'ready_to_apply',dependencies_ok AND capability_absent AND NOT capability_present,
 'dependencies_ok',dependencies_ok,'capability_absent',capability_absent,'capability_present',capability_present,
 'guards',guards,'hosted_context',retained->'hosted_context',
 'fingerprints',jsonb_build_object('dependencies',${digest("jsonb_build_object('retained',retained->'fingerprints','functions',functions,'structure',structure,'effects',effects,'service_effects',service_effects,'category_authority',category_authority,'ordinary_links',legacy_authority,'horse_capability',horse_capability,'api_roles',api_roles)")},'capability',capability),
 'invariants',jsonb_build_object('existing_functions',existing_functions,'existing_authority',existing_authority,'immutable_structure',immutable_structure)) result FROM assessed`;
}
