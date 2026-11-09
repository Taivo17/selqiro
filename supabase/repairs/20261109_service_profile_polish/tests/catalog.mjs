// Reuse the accepted r2 catalog checks without rerunning its test suites.
// The two replaced readers are fingerprinted separately with the new reader;
// no function definition or privilege is omitted from both comparisons.
import assert from 'node:assert/strict';
export const changedReaders=['public.get_my_service_publications_v1','public.get_public_profile_services_v1'];
export const readerNames=[...changedReaders,'public.get_public_profile_marketplace_v1'].sort();
export const profileDependencies=['public.get_public_profile_listings_v1','public.prepare_store_category_name','public.validate_store_category_parent'];
export const quote=s=>"'"+s.replaceAll("'","''")+"'";
export const array=xs=>'ARRAY['+xs.map(quote).join(',')+']::text[]';
export const digest=expression=>`encode(sha256(convert_to((${expression})::text,'UTF8')),'hex')`;
export function catalogParts(retained){
 const start=retained.indexOf('WITH function_facts AS (');
 const end=retained.lastIndexOf('COMMIT;');assert(start>=0&&end>start);
 let query=retained.slice(start,end).trim().replace(/;$/,'');
 const functionStart='WITH function_facts AS (';
 const relationStart='),relation_facts AS (';
 const relationEnd='),\n hosted AS (';
 const functions=query.slice(functionStart.length,query.indexOf(relationStart));
 const relations=query.slice(query.indexOf(relationStart)+relationStart.length,query.indexOf(relationEnd));
 assert(functions.includes('pg_get_functiondef')&&relations.includes('pg_get_constraintdef'));
 const targetPattern=/( FROM function_facts WHERE )(name=ANY\([^\n]+\) OR name LIKE 'service_publication_private\.%')(\),\n)/g;
 const matches=[...query.matchAll(targetPattern)];assert.equal(matches.length,1,'one r2 capability function aggregate');
 query=query.replace(targetPattern,(_,prefix,condition,suffix)=>prefix+'('+condition+') AND name<>ALL('+array(changedReaders)+')'+suffix);
 const functionScope=names=>functions.slice(0,functions.indexOf(" WHERE p.prokind IN"))+
  " WHERE p.prokind IN('f','p') AND n.nspname||'.'||p.proname=ANY("+array(names)+')';
 const relationScope=relations.slice(0,relations.lastIndexOf('\n AND (n.nspname IN'))+
  "\n AND n.nspname||'.'||c.relname=ANY(ARRAY['public.store_categories','public.listing_store_categories']::text[])";
 assert(relationScope.includes('FROM pg_class')&&!relationScope.includes('undefined'));
 const extra=`reader_facts AS (${functionScope(readerNames)}),\n profile_functions AS (${functionScope(profileDependencies)}),\n store_relations AS (${relationScope})`;
 const f=table=>`(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM ${table})`;
 const profile=`jsonb_build_object('functions',${f('profile_functions')},'relations',
  (SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM store_relations))`;
 return {retainedQuery:query,extra,readerFacts:f('reader_facts'),profileFacts:profile,
  profileFunctionFacts:f('profile_functions'),
  storeAuthority:"(SELECT coalesce(jsonb_agg(jsonb_build_object('name',name,'authority',authority) ORDER BY name),'[]') FROM store_relations)",
  storeStructure:"(SELECT coalesce(jsonb_agg(structure ORDER BY name),'[]') FROM store_relations)"};
}
export function buildReport(parts,pins){
 const old='f95c0cd0cbb13e51962ade6842c6faa0dad1aacf3ba9a3a50a34ca33c769fe6f';
 assert.equal(parts.retainedQuery.split(old).length-1,1,'one accepted r2 capability pin');
 const retained=parts.retainedQuery.replace(old,pins.retainedCapability);
 return `WITH retained AS (${retained}),\n ${parts.extra},\n measured AS (
 SELECT r.result retained,${digest(parts.readerFacts)} readers,${digest(parts.profileFacts)} profile,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'existing_functions','profile',"+parts.profileFunctionFacts+')')} existing_functions,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'existing_authority','profile',"+parts.storeAuthority+')')} existing_authority,
 ${digest("jsonb_build_object('retained',r.result->'invariants'->>'immutable_structure','profile',"+parts.storeStructure+')')} immutable_structure
 FROM retained r),\n assessed AS (
 SELECT *,coalesce(retained->>'state'='applied' AND (retained->>'dependencies_ok')::boolean
  AND NOT EXISTS(SELECT 1 FROM jsonb_each(retained->'guards') g WHERE g.value<>'true'::jsonb)
  AND profile=${quote(pins.profile)},false) dependencies_ok,
 readers=${quote(pins.before)} AND (SELECT count(*) FROM reader_facts)=2 capability_absent,
 readers=${quote(pins.after)} AND (SELECT count(*) FROM reader_facts)=3 capability_present FROM measured)
 SELECT jsonb_build_object('schema_version',1,'kind','service-profile-polish-v1',
 'state',CASE WHEN dependencies_ok AND capability_absent AND NOT capability_present THEN 'absent'
  WHEN dependencies_ok AND capability_present AND NOT capability_absent THEN 'applied' ELSE 'unknown' END,
 'recognized',dependencies_ok AND (capability_absent<>capability_present),
 'ready_to_apply',dependencies_ok AND capability_absent AND NOT capability_present,
 'dependencies_ok',dependencies_ok,'capability_absent',capability_absent,'capability_present',capability_present,
 'guards',(retained->'guards')||jsonb_build_object('profile_dependencies',profile=${quote(pins.profile)}),
 'hosted_context',retained->'hosted_context',
 'fingerprints',jsonb_build_object('dependencies',${digest("jsonb_build_object('retained',retained->'fingerprints','profile',profile)")},'capability',readers),
 'invariants',jsonb_build_object('existing_functions',existing_functions,'existing_authority',existing_authority,'immutable_structure',immutable_structure)) result
 FROM assessed`;
}
