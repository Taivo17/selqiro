import assert from 'node:assert/strict';
import {parts as previousParts,quote,array,digest} from '../../20261111_service_store_categories/tests/catalog.mjs';
export {quote,array,digest};
export const functionNames=['service_publication_private.start_activity','service_publication_private.activity_fields',
 'service_publication_private.is_public','public.get_my_service_activity_v1','public.renew_my_service_activity_v1',
 'public.get_my_service_publication_snapshot_v2','public.get_my_service_publications_v2'].sort();
export const relationNames=['service_publication_private.activity','service_publication_private.activity_rollout'];
export const guardNames=['installer','actor_roles','hosted_context_ready','retained_release','category_functions',
 'category_structure','category_delete_effects','service_delete_effects','retained_category_authority',
 'retained_link_authority','retained_horse_categories','retained_service_categories','api_roles_and_entrypoints','service_dates'];
const objectNames=['activity','activity_rollout','activity_pkey','activity_rollout_pkey','service_activity_until_idx'];
export function parts(profileVerify,servicePreflight,profilePins,retainedCapability=null){
 const p=previousParts(profileVerify,servicePreflight,profilePins);
 const where=" WHERE p.prokind IN('f','p') AND";
 assert.equal(p.retained.split(where).length,2);
 // Only the deliberately changed predicate and new objects are removed from
 // the retained aggregate; their complete definitions/ACLs are pinned in target.
 let retained=p.retained.replace(where,where+' n.nspname||\'.\'||p.proname<>ALL('+array(functionNames)+') AND');
 const rel="WHERE c.relkind IN('r','p')";
 assert.equal(retained.split(rel).length,2);
 retained=retained.replace(rel,rel+' AND n.nspname||\'.\'||c.relname<>ALL('+array(relationNames)+')');
 const trigger='WHERE t.tgrelid=c.oid AND NOT t.tgisinternal';
 assert.equal(retained.split(trigger).length,2);
 retained=retained.replace(trigger,trigger+" AND NOT (c.oid='public.services'::regclass AND t.tgname='service_activity_start')");
 const objects="FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='service_publication_private'";
 assert.equal(retained.split(objects).length,2);
 retained=retained.replace(objects,objects+' AND c.relname<>ALL('+array(objectNames)+')');
 if(retainedCapability){const old=profilePins.retained_capability_without_two_readers_sha256;
  assert.equal(retained.split(old).length,2);retained=retained.replace(old,retainedCapability);}
 const fStart=servicePreflight.indexOf('WITH function_facts AS (')+'WITH function_facts AS ('.length;
 const fEnd=servicePreflight.indexOf(' WHERE p.prokind IN',fStart);
 const rStart=servicePreflight.indexOf('),relation_facts AS (')+'),relation_facts AS ('.length;
 const rEnd=servicePreflight.indexOf('\n AND (n.nspname IN',rStart);
 assert(fEnd>fStart&&rEnd>rStart);
 const functions=servicePreflight.slice(fStart,fEnd)+" WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY("+array(functionNames)+')';
 const relations=servicePreflight.slice(rStart,rEnd)+" AND n.nspname||'.'||c.relname=ANY("+array(relationNames)+')';
 const extra=p.extra+',\n activity_functions AS ('+functions+'),\n activity_relations AS ('+relations+')';
 const serviceEffects=p.serviceEffects
  .replace("FROM pg_constraint q WHERE q.contype='f'","FROM pg_constraint q WHERE q.contype='f' AND q.conrelid IS DISTINCT FROM to_regclass('service_publication_private.activity')")
  .replace('WHERE NOT t.tgisinternal','WHERE NOT t.tgisinternal AND NOT (t.tgrelid=\'public.services\'::regclass AND t.tgname=\'service_activity_start\')');
 const effective=`(SELECT jsonb_agg(jsonb_build_object('table',t.name,'role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass(t.name),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass(t.name),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY t.name,a.role,p.privilege) FROM unnest(${array(relationNames)}) t(name)
  CROSS JOIN unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))`;
 const effects=p.serviceEffects.replaceAll("'public.services'::regclass,'public.service_images'::regclass",
  "to_regclass('service_publication_private.activity'),to_regclass('service_publication_private.activity_rollout')")
  .replace(" AND q.conrelid IS DISTINCT FROM to_regclass('public.service_store_categories')",'')
  .replace(" AND q.conrelid IS DISTINCT FROM to_regclass('public.horse_offer_store_categories')",'');
 const triggerFacts=`(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,
  'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]') FROM pg_trigger t
  WHERE t.tgrelid='public.services'::regclass AND t.tgname='service_activity_start')`;
 const target=`jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM activity_functions),
  'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM activity_relations),
  'trigger',${triggerFacts},'effects',${effects},'effective',${effective},
  'objects',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind) ORDER BY c.relname,c.relkind),'[]')
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='service_publication_private' AND c.relname=ANY(${array(objectNames)})),
  'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('kind',p.prokind,'name',n.nspname||'.'||p.proname,
   'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(${array(functionNames)})))`;
 const summary=`(SELECT jsonb_build_object('published_count',count(*) FILTER(WHERE status='published'),
  'archived_count',count(*) FILTER(WHERE status='archived'),'draft_count',count(*) FILTER(WHERE status='draft'),
  'invalid_date_count',count(*) FILTER(WHERE NOT isfinite(created_at) OR NOT isfinite(updated_at)
   OR (published_at IS NOT NULL AND NOT isfinite(published_at)) OR (status='published' AND published_at IS NULL))) FROM public.services)`;
 return {...p,retained,extra,serviceEffects,serviceCategoryTarget:p.target,target,effective,summary};
}
export function report(p,pins){
 const q=key=>quote(pins[key]);
 return `WITH retained AS (${p.retained}),
 ${p.extra}, measured AS (
 SELECT r.result retained,${digest(p.functions)} functions,${digest(p.structure)} structure,
 ${digest(p.effects)} effects,${digest(p.serviceEffects)} service_effects,${digest(p.categoryAuthority)} category_authority,
 ${digest(p.roleFacts)} api_roles,${digest(p.legacyTarget)} legacy_authority,${digest(p.horseTarget)} horse_capability,
 ${digest(p.serviceCategoryTarget)} service_categories,${digest(p.target)} capability,(${p.safeRoles}) safe_api_roles,
 ${p.summary} transition_summary,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'existing_functions','categories',"+p.functions+",'horse',"+p.horseTarget+",'service_categories',"+p.serviceCategoryTarget+')')} existing_functions,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'existing_authority','store_categories',"+p.categoryAuthority+",'ordinary_links',"+p.legacyTarget+",'horse',"+p.horseTarget+",'service_categories',"+p.serviceCategoryTarget+",'api_roles',"+p.roleFacts+')')} existing_authority,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'immutable_structure','categories',"+p.structure+",'effects',"+p.effects+",'service_effects',"+p.serviceEffects+",'horse',"+p.horseTarget+",'service_categories',"+p.serviceCategoryTarget+')')} immutable_structure
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
 'category_delete_effects',effects=${q('effects')},'service_delete_effects',service_effects=${q('serviceEffects')},
 'retained_category_authority',category_authority=${q('categoryAuthority')},
 'retained_link_authority',legacy_authority=${q('legacyAuthority')},
 'retained_horse_categories',horse_capability=${q('horseCapability')},
 'retained_service_categories',service_categories=${q('serviceCategories')},
 'api_roles_and_entrypoints',safe_api_roles AND api_roles=${q('apiRoles')},
 'service_dates',(transition_summary->>'invalid_date_count')::bigint=0) guards,
 capability=${q('before')} capability_absent,capability=${q('after')} capability_present FROM measured),
 assessed AS (SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb) dependencies_ok FROM checks)
 SELECT jsonb_build_object('schema_version',1,'kind','service-activity-v1',
 'state',CASE WHEN dependencies_ok AND capability_absent AND NOT capability_present THEN 'absent'
 WHEN dependencies_ok AND capability_present AND NOT capability_absent THEN 'applied' ELSE 'unknown' END,
 'recognized',dependencies_ok AND (capability_absent<>capability_present),
 'ready_to_apply',dependencies_ok AND capability_absent AND NOT capability_present,
 'dependencies_ok',dependencies_ok,'capability_absent',capability_absent,'capability_present',capability_present,
 'guards',guards,'hosted_context',retained->'hosted_context','transition_summary',transition_summary,
 'fingerprints',jsonb_build_object('dependencies',${digest("jsonb_build_object('retained',retained->'fingerprints','functions',functions,'structure',structure,'effects',effects,'service_effects',service_effects,'category_authority',category_authority,'ordinary_links',legacy_authority,'horse',horse_capability,'service_categories',service_categories,'api_roles',api_roles)")},'capability',capability),
 'invariants',jsonb_build_object('existing_functions',existing_functions,'existing_authority',existing_authority,'immutable_structure',immutable_structure)) result FROM assessed`;
}
