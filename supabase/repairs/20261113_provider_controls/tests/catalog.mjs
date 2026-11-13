import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {quote,array,digest,guardNames as priorGuards} from '../../20261111_service_activity/tests/catalog.mjs';
export {quote,array,digest};
export const replacedNames=['public.search_public_listings_v1','public.search_public_listings_v2',
 'public.search_public_marketplace_v1','public.search_public_services_v1','public.get_store_by_slug',
 'public.get_marketplace_listings','public.get_marketplace_listings_nearby'].sort();
export const publicNames=[...replacedNames,'public.get_my_provider_control_v1','public.list_my_provider_controls_v1',
 'public.set_my_provider_control_v1','public.hidden_provider_ids_for_viewer_v1','public.listing_images','public.listing_translations'].sort();
export const guardNames=[...priorGuards,'retained_activity','account_block_authority'];
export function queryOnly(preflight){
 const start=/^WITH retained AS (?:MATERIALIZED )?\(/m.exec(preflight),end=preflight.lastIndexOf('COMMIT;');
 assert(start&&end>start.index,'complete report SQL');
 return preflight.slice(start.index,end).trim().replace(/;$/,'');
}
export function functionBody(query){const from=query.indexOf('WITH function_facts AS (')+'WITH function_facts AS ('.length;
 const end=query.indexOf('),relation_facts AS (',from);assert(from>25&&end>from);return query.slice(from,end);}
export function parts(activityVerify,servicePreflight,originalFunctions){
 const original=queryOnly(activityVerify),body=functionBody(original);
 // Deliberately replaced functions remain represented by their exact original
 // facts in the retained verifier. Their REAL complete current facts are pinned
 // independently in capability, before and after. No other object is replaced.
 const normalized=body+' AND n.nspname||\'.\'||p.proname<>ALL('+array(replacedNames)+')\n UNION ALL SELECT x.name,x.signature,x.facts,x.acl\n FROM jsonb_to_recordset('+quote(JSON.stringify(originalFunctions))+'::jsonb) x(name text,signature text,facts jsonb,acl jsonb)';
 const indexPattern='FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid';
 assert(original.includes(indexPattern));
 const retained=original.replace(body,()=>normalized).replaceAll(indexPattern,indexPattern+
  " AND NOT (c.oid='public.user_blocks'::regclass AND i.indexrelid IS NOT DISTINCT FROM to_regclass('public.user_blocks_blocked_blocker_idx_v1'))");
 const fStart=servicePreflight.indexOf('WITH function_facts AS (')+'WITH function_facts AS ('.length;
 const fEnd=servicePreflight.indexOf(' WHERE p.prokind IN',fStart);
 const rStart=servicePreflight.indexOf('),relation_facts AS (')+'),relation_facts AS ('.length;
 const rEnd=servicePreflight.indexOf('\n AND (n.nspname IN',rStart);assert(fEnd>fStart&&rEnd>rStart);
 const functions=servicePreflight.slice(fStart,fEnd)+" WHERE p.prokind IN('f','p') AND (n.nspname='provider_controls_private' OR n.nspname||'.'||p.proname=ANY("+array(publicNames)+'))';
 const relations=servicePreflight.slice(rStart,rEnd)+" AND n.nspname='provider_controls_private'";
 const extra='control_functions AS ('+functions+'), control_relations AS ('+relations+')';
 const blockAuthority=`jsonb_build_object('owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,
 'pair_index_ready',EXISTS(SELECT 1 FROM pg_index ix
 WHERE ix.indrelid=c.oid AND ix.indisunique AND ix.indisvalid AND ix.indisready AND ix.indnkeyatts=2 AND ix.indpred IS NULL AND ix.indexprs IS NULL
 AND strpos(pg_get_indexdef(ix.indexrelid),' USING btree ')>0
 AND (SELECT array_agg(a.attname::text ORDER BY key.ord) FROM unnest(ix.indkey) WITH ORDINALITY key(attnum,ord)
 JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=key.attnum WHERE key.ord<=ix.indnkeyatts)=ARRAY['blocker_id','blocked_id']::text[]),
 'primary_id_ready',EXISTS(SELECT 1 FROM pg_index ix WHERE ix.indrelid=c.oid AND ix.indisprimary AND ix.indisvalid AND ix.indisready AND ix.indnkeyatts=1
 AND (SELECT array_agg(a.attname::text) FROM unnest(ix.indkey) key(attnum) JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=key.attnum)=ARRAY['id']::text[]),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
 'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
 'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]') FROM pg_policy q WHERE q.polrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]')
 FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
 'rules',(SELECT coalesce(jsonb_agg(pg_get_ruledef(r.oid) ORDER BY r.rulename),'[]') FROM pg_rewrite r WHERE r.ev_class=c.oid),
 'incoming',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,'definition',pg_get_constraintdef(q.oid)) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
 FROM pg_constraint q WHERE q.contype='f' AND q.confrelid=c.oid))`;
 const blockFacts='(SELECT '+blockAuthority+" FROM pg_class c WHERE c.oid='public.user_blocks'::regclass)";
 const effective=`(SELECT jsonb_agg(jsonb_build_object('role',a.role,'privilege',p.privilege,
  'allowed',coalesce(has_table_privilege(a.role,to_regclass('provider_controls_private.hidden_providers'),p.privilege),false),
  'grantable',coalesce(has_table_privilege(a.role,to_regclass('provider_controls_private.hidden_providers'),p.privilege||' WITH GRANT OPTION'),false))
  ORDER BY a.role,p.privilege) FROM unnest(ARRAY['anon','authenticated','service_role']) a(role)
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege))`;
 const target=`jsonb_build_object(
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM control_functions),
 'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('structure',structure,'authority',authority) ORDER BY name),'[]') FROM control_relations),
 'effective',${effective},
 'reverse_block_index',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,
 'owner',pg_get_userbyid(c.relowner),'definition',CASE WHEN ix.indexrelid IS NOT NULL THEN pg_get_indexdef(ix.indexrelid) END,
 'valid',ix.indisvalid,'ready',ix.indisready,'unique',ix.indisunique,'options',c.reloptions) ORDER BY c.relname),'[]')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_index ix ON ix.indexrelid=c.oid
 WHERE n.nspname='public' AND c.relname='user_blocks_blocked_blocker_idx_v1'),
 'view',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,
 'owner',pg_get_userbyid(c.relowner),'options',c.reloptions,'definition',CASE WHEN c.relkind='v' THEN pg_get_viewdef(c.oid,true) END,
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY x.grantee::regrole::text,x.privilege_type) FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'acl',a.attacl::text)
 ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped)) ORDER BY c.relname),'[]')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='discovery_listings_v1'),
 'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY x.grantee::regrole::text,x.privilege_type)
 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname),'[]') FROM pg_namespace n WHERE n.nspname='provider_controls_private'),
 'objects',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner)) ORDER BY c.relname,c.relkind),'[]')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='provider_controls_private'),
 'types',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.typname,'kind',t.typtype,'owner',pg_get_userbyid(t.typowner)) ORDER BY t.typname),'[]')
 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='provider_controls_private'),
 'function_names',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||p.proname,'kind',p.prokind,
 'signature',oidvectortypes(p.proargtypes)) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]')
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='provider_controls_private' OR n.nspname||'.'||p.proname=ANY(${array(publicNames)})),
 'incoming',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'source',q.conrelid::regclass::text,'definition',pg_get_constraintdef(q.oid)) ORDER BY q.conrelid::regclass::text,q.conname),'[]')
 FROM pg_constraint q WHERE q.contype='f' AND q.confrelid=to_regclass('provider_controls_private.hidden_providers')),
 'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rulename,'definition',pg_get_ruledef(r.oid)) ORDER BY r.rulename),'[]')
 FROM pg_rewrite r WHERE r.ev_class=to_regclass('provider_controls_private.hidden_providers')),
 'defaults',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(d.defaclrole),'kind',d.defaclobjtype,
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY x.grantee::regrole::text,x.privilege_type) FROM aclexplode(d.defaclacl) x))
 ORDER BY d.defaclrole::regrole::text,d.defaclobjtype),'[]') FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='provider_controls_private'))`;
 return {retained,extra,target,effective,blockFacts};
}
export function report(p,pins){return `WITH retained AS (${p.retained}),${p.extra}, measured AS (
 SELECT r.result retained,${digest(p.target)} capability,${digest(p.blockFacts)} block_authority FROM retained r), checks AS (
 SELECT *,retained->'guards'||jsonb_build_object('retained_activity',coalesce(retained->>'state'='applied'
 AND (retained->>'recognized')::boolean AND (retained->>'dependencies_ok')::boolean
 AND retained->'fingerprints'=${quote(JSON.stringify(pins.retainedFingerprints))}::jsonb,false),
 'account_block_authority',block_authority=${quote(pins.blockAuthority)}) guards,
 capability=${quote(pins.before)} capability_absent,capability=${quote(pins.after)} capability_present FROM measured),
 assessed AS(SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb) dependencies_ok FROM checks)
 SELECT jsonb_build_object('schema_version',1,'kind','provider-controls-v1',
 'state',CASE WHEN dependencies_ok AND capability_absent AND NOT capability_present THEN 'absent'
 WHEN dependencies_ok AND capability_present AND NOT capability_absent THEN 'applied' ELSE 'unknown' END,
 'recognized',dependencies_ok AND (capability_absent<>capability_present),'ready_to_apply',dependencies_ok AND capability_absent AND NOT capability_present,
 'dependencies_ok',dependencies_ok,'capability_absent',capability_absent,'capability_present',capability_present,
 'fingerprints',jsonb_build_object('dependencies',${digest("jsonb_build_object('retained',retained->'fingerprints','account_blocks',block_authority)")},'capability',capability),
 'invariants',retained->'invariants','hosted_context',retained->'hosted_context','guards',guards) result FROM assessed`;}

// Tokenize SQL structure only. Function-definition literals are fingerprint
// inputs and must never be searched/replaced as executable CTE syntax.
export function controlReportTokens(sql){
 const tokens=[];
 for(let i=0;i<sql.length;){
  if(/\s/.test(sql[i])){i++;continue;}
  if(sql.startsWith('--',i)){const end=sql.indexOf('\n',i);i=end<0?sql.length:end;continue;}
  if(sql.startsWith('/*',i)){
   let depth=1;i+=2;
   while(i<sql.length&&depth){
    if(sql.startsWith('/*',i)){depth++;i+=2;}
    else if(sql.startsWith('*/',i)){depth--;i+=2;}else i++;
   }
   assert.equal(depth,0,'closed SQL comment');continue;
  }
  if(sql[i]==="'"||sql[i]==='"'){
   const delimiter=sql[i],escaped=delimiter==="'"&&i>0&&/[eE]/.test(sql[i-1])&&
    (i<2||!/[a-zA-Z_0-9$]/.test(sql[i-2]));
   let closed=false;i++;
   while(i<sql.length){
    if(escaped&&sql[i]==='\\'){i+=2;continue;}
    if(sql[i]===delimiter){if(sql[i+1]===delimiter){i+=2;continue;}i++;closed=true;break;}
    i++;
   }
   assert(closed,'closed SQL literal or identifier');continue;
  }
  if(sql[i]==='$'){
   const delimiter=/^\$(?:[a-zA-Z_][a-zA-Z_0-9]*)?\$/.exec(sql.slice(i));
   if(delimiter){const end=sql.indexOf(delimiter[0],i+delimiter[0].length);
    assert(end>=0,'closed SQL dollar literal');i=end+delimiter[0].length;continue;}
  }
  const word=/^[a-zA-Z_][a-zA-Z_0-9$]*/.exec(sql.slice(i));
  const value=word?word[0]:sql[i];tokens.push({value:value.toLowerCase(),start:i,end:i+value.length});i+=value.length;
 }
 return tokens;
}
export function controlMaterializationSites(query){
 const tokens=controlReportTokens(query),wanted={retained:2,measured:3,checks:3,assessed:3},sites=[];
 for(let i=1;i+2<tokens.length;i++){
  const name=tokens[i].value;
  if(!Object.hasOwn(wanted,name)||tokens[i+1].value!=='as'||tokens[i+2].value!=='(')continue;
  if(!['with',','].includes(tokens[i-1].value))continue;
  sites.push({name,insert_at:tokens[i+1].end});
 }
 assert.deepEqual(Object.fromEntries(Object.keys(wanted).map(name=>[name,sites.filter(x=>x.name===name).length])),
  wanted,'exact eleven original single-row CTE stages');
 return sites;
}
export function materializeControlReport(query){
 const sites=controlMaterializationSites(query);let optimized=query;
 for(const site of sites.slice().reverse())optimized=optimized.slice(0,site.insert_at)+' MATERIALIZED'+optimized.slice(site.insert_at);
 return optimized;
}
export function compileControlSql(rawQuery,changes){
 const query=materializeControlReport(rawQuery),sites=controlMaterializationSites(rawQuery);
 assert(!changes.includes('$controls$'),'DDL delimiter is not part of module bodies');
 const modulesSha256=createHash('sha256').update(changes).digest('hex');
 const header='-- GENERATED from source-verified retained declarations. No content/preference backfill.\n'+
  '-- Modules SHA-256: '+modulesSha256+'\n'+
  '-- Report plan: materialized single-row stages and strict one-row control gates.\n';
 const preflight=header+"BEGIN TRANSACTION READ ONLY;\nSET LOCAL search_path=pg_catalog,pg_temp;\nSET LOCAL statement_timeout='20s';\n"+query+';\nCOMMIT;\n';
 const beforeGate=`DO $before$ DECLARE before_report jsonb; BEGIN
 SELECT result INTO STRICT before_report FROM pg_temp.provider_controls_before;
 IF (before_report->>'state' IN('absent','applied') AND (before_report->>'recognized')::boolean
 AND (before_report->>'dependencies_ok')::boolean) IS NOT TRUE THEN
 RAISE EXCEPTION 'PROVIDER_CONTROLS_PRECONDITIONS_NOT_MATCHED' USING ERRCODE='55000';END IF;
 EXCEPTION WHEN no_data_found OR too_many_rows THEN
 RAISE EXCEPTION 'PROVIDER_CONTROLS_PRECONDITIONS_NOT_MATCHED' USING ERRCODE='55000';END $before$;`;
 const applyGate=`DO $apply$ DECLARE before_report jsonb; BEGIN
 SELECT result INTO STRICT before_report FROM pg_temp.provider_controls_before;
 IF before_report->>'state'='absent' THEN
 EXECUTE $controls$${changes}$controls$;END IF;
 EXCEPTION WHEN no_data_found OR too_many_rows THEN
 RAISE EXCEPTION 'PROVIDER_CONTROLS_PRECONDITIONS_NOT_MATCHED' USING ERRCODE='55000';END $apply$;`;
 const afterGate=`DO $after$ DECLARE before_report jsonb;after_report jsonb; BEGIN
 SELECT result INTO STRICT before_report FROM pg_temp.provider_controls_before;
 SELECT result INTO STRICT after_report FROM pg_temp.provider_controls_after;
 IF (after_report->>'state'='applied' AND (after_report->>'recognized')::boolean AND (after_report->>'dependencies_ok')::boolean
 AND after_report->'invariants'=before_report->'invariants'
 AND after_report->'fingerprints'->>'dependencies'=before_report->'fingerprints'->>'dependencies'
 AND after_report->'hosted_context'=before_report->'hosted_context') IS NOT TRUE THEN
 RAISE EXCEPTION 'PROVIDER_CONTROLS_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000';END IF;
 EXCEPTION WHEN no_data_found OR too_many_rows THEN
 RAISE EXCEPTION 'PROVIDER_CONTROLS_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000';END $after$;`;
 const apply=header+`BEGIN;
 SET LOCAL search_path=pg_catalog,pg_temp;
 SET LOCAL lock_timeout='3s';SET LOCAL statement_timeout='45s';SET LOCAL timezone='UTC';
 DO $lock$ BEGIN PERFORM pg_advisory_xact_lock(hashtextextended('selqiro-provider-controls-v1',0));END $lock$;
 LOCK TABLE public.profiles,public.identities,public.business_accounts,public.business_members,public.identity_profiles,
 public.user_blocks,public.listings,public.horse_offers,public.services IN ACCESS SHARE MODE;
 CREATE TEMP TABLE provider_controls_before ON COMMIT DROP AS ${query};
 ${beforeGate}
 ${applyGate}
 CREATE TEMP TABLE provider_controls_after ON COMMIT DROP AS ${query};
 ${afterGate}
 NOTIFY pgrst,'reload schema';SELECT result FROM provider_controls_after;COMMIT;\n`;
 const hash=value=>createHash('sha256').update(value).digest('hex');
 const optimization={kind:'materialized-single-row-guards-v1',
  original_query_sha256:hash(rawQuery),optimized_query_sha256:hash(query),
  original_query_bytes:Buffer.byteLength(rawQuery),optimized_query_bytes:Buffer.byteLength(query),
  materialized_stages:sites.map(site=>({...site})),
  strict_one_row_gates:['before','apply','after'],null_predicates_fail_closed:true,
  module_ddl_sha256:modulesSha256,sql_sha256:{preflight:hash(preflight),apply:hash(apply),verify:hash(preflight)}};
 return {query,sites,header,preflight,verify:preflight,apply,beforeGate,applyGate,afterGate,modulesSha256,optimization};
}
