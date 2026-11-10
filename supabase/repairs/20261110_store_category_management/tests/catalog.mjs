import assert from 'node:assert/strict';
import {catalogParts,quote,array,digest} from '../../20261109_service_profile_polish/tests/catalog.mjs';
export {quote,array,digest};
export const capabilityName='public.manage_my_store_category_v1';
export const dependencyNames=['public.create_my_store_root_category_v2','public.create_my_store_child_category_v2',
 'public.rename_my_store_category_v2','public.delete_my_store_category_v2','public.set_my_listing_store_categories_v2',
 'public.current_user_has_identity_access','public.require_my_active_identity_v2',
 'public.prepare_store_category_name','public.validate_store_category_parent'].sort();
export const guardNames=['installer','actor_roles','hosted_context_ready','retained_release',
 'category_functions','category_relations','category_delete_effects'];
export function parts(retainedProfile,retainedService){
 const start=retainedProfile.indexOf('WITH retained AS ('),end=retainedProfile.lastIndexOf('COMMIT;');
 assert(start>=0&&end>start);
 const retained=retainedProfile.slice(start,end).trim().replace(/;$/,'');
 const scopes=catalogParts(retainedService);
 const fStart=retainedService.indexOf('WITH function_facts AS (')+'WITH function_facts AS ('.length;
 const fEnd=retainedService.indexOf(' WHERE p.prokind IN',fStart);
 assert(fEnd>fStart);
 const functionScope=names=>retainedService.slice(fStart,fEnd)+" WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY("+array(names)+')';
 const functionAggregate=table=>`(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM ${table})`;
 const effects=`jsonb_build_object(
  'incoming_foreign_keys',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,
   'target',q.confrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid),
   'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
   FROM pg_constraint q WHERE q.contype='f' AND q.confrelid IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass)),
  'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',r.ev_class::regclass::text,
   'name',r.rulename,'enabled',r.ev_enabled,'definition',pg_get_ruledef(r.oid)) ORDER BY r.ev_class::regclass::text,r.rulename),'[]')
   FROM pg_rewrite r WHERE r.ev_class IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass)),
  'trigger_functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',t.tgrelid::regclass::text,
   'name',t.tgname,'definition',pg_get_functiondef(t.tgfoid),'owner',pg_get_userbyid(p.proowner),
   'language',l.lanname,'leakproof',p.proleakproof,'parallel',p.proparallel)
   ORDER BY t.tgrelid::regclass::text,t.tgname),'[]')
   FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_language l ON l.oid=p.prolang
   WHERE NOT t.tgisinternal AND t.tgrelid IN('public.store_categories'::regclass,'public.listing_store_categories'::regclass)))`;
 return {retained,extra:scopes.extra+',\n category_functions AS ('+functionScope(dependencyNames)+'),\n capability_functions AS ('+functionScope([capabilityName])+')',
  functions:functionAggregate('category_functions'),capability:functionAggregate('capability_functions'),effects,
  relations:`jsonb_build_object('structure',${scopes.storeStructure},'authority',${scopes.storeAuthority})`,
  structure:scopes.storeStructure,authority:scopes.storeAuthority};
}
export function report(p,pins){
 const hash=key=>quote(pins[key]);
 return `WITH retained AS (${p.retained}),\n ${p.extra},\n measured AS (
 SELECT r.result retained,${digest(p.functions)} functions,${digest(p.relations)} relations,
 ${digest(p.effects)} effects,${digest(p.capability)} capability,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'existing_functions','categories',"+p.functions+')')} existing_functions,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'existing_authority','categories',"+p.authority+')')} existing_authority,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'immutable_structure','categories',"+p.structure+",'effects',"+p.effects+')')} immutable_structure
 FROM retained r), checks AS (
 SELECT *,jsonb_build_object(
 'installer',coalesce((retained->'guards'->>'installer')::boolean,false),
 'actor_roles',coalesce((retained->'guards'->>'actor_roles')::boolean,false),
 'hosted_context_ready',coalesce((retained->'guards'->>'hosted_context_ready')::boolean,false),
 'retained_release',coalesce(retained->>'state'='applied' AND (retained->>'recognized')::boolean
   AND (retained->>'dependencies_ok')::boolean AND NOT EXISTS(SELECT 1 FROM jsonb_each(retained->'guards') g WHERE g.value<>'true'::jsonb)
   AND retained->'fingerprints'->>'dependencies'=${hash('retainedDependencies')}
   AND retained->'fingerprints'->>'capability'=${hash('retainedCapability')},false),
 'category_functions',functions=${hash('functions')} AND (SELECT count(*) FROM category_functions)=${dependencyNames.length},
 'category_relations',relations=${hash('relations')} AND (SELECT count(*) FROM store_relations)=2,
 'category_delete_effects',effects=${hash('effects')}) guards,
 capability=${hash('before')} AND (SELECT count(*) FROM capability_functions)=0 capability_absent,
 capability=${hash('after')} AND (SELECT count(*) FROM capability_functions)=1 capability_present FROM measured),
 assessed AS (SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb) dependencies_ok FROM checks)
 SELECT jsonb_build_object('schema_version',1,'kind','store-category-management-v1',
 'state',CASE WHEN dependencies_ok AND capability_absent AND NOT capability_present THEN 'absent'
  WHEN dependencies_ok AND capability_present AND NOT capability_absent THEN 'applied' ELSE 'unknown' END,
 'recognized',dependencies_ok AND (capability_absent<>capability_present),
 'ready_to_apply',dependencies_ok AND capability_absent AND NOT capability_present,
 'dependencies_ok',dependencies_ok,'capability_absent',capability_absent,'capability_present',capability_present,
 'guards',guards,'hosted_context',retained->'hosted_context',
 'fingerprints',jsonb_build_object('dependencies',${digest("jsonb_build_object('retained',retained->'fingerprints','functions',functions,'relations',relations,'effects',effects)")},'capability',capability),
 'invariants',jsonb_build_object('existing_functions',existing_functions,'existing_authority',existing_authority,'immutable_structure',immutable_structure)) result FROM assessed`;
}
