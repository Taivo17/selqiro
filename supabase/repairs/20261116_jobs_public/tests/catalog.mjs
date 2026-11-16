// Deterministic metadata only. No user rows, secrets, or provider calls.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as blockCatalog from '../../20261114_block_removal_auth/tests/catalog.mjs';
export const repair=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const modules=['01_state.sql','02_context.sql','03_content.sql','04_reads.sql','05_search.sql','06_mutations.sql',
 '07_contact.sql','08_message_context.sql','09_authority.sql'];
export const publicNames=['get_jobs_capabilities_v1','get_job_categories_v1','get_public_job_v1','search_public_jobs_v1',
 'get_public_profile_jobs_v1','get_my_jobs_v1','get_my_job_v1','get_my_job_policies_v1','get_my_job_request_v1',
 'save_my_job_v1','publish_my_job_v1','set_my_job_status_v1','renew_my_job_activity_v1','contact_my_job_provider_v1',
 'get_my_marketplace_message_thread_v2'];
export const dependencyNames=[
 'listing_publication_private.require_actor','public.listing_actor_uid_hosted_v1','public.lock_listing_creation_actor_v1',
 'public.current_user_has_identity_access','public.normalize_listing_price_v1','public.listing_price_currency_scale_v1',
 'listing_publication_private.assert_hosted_preview_actor','listing_publication_private.require_policies',
 'service_publication_private.current_policies','service_publication_private.require_policies','service_publication_private.is_public',
 'public.get_public_service_v1','public.search_public_services_v1','public.get_public_profile_services_v1',
 'public.publish_my_service_v1','public.renew_my_service_activity_v1','public.set_my_service_activity_v1',
 'public.contact_my_service_provider_v1','public.contact_my_horse_seller_v1','public.get_my_marketplace_message_thread_v1',
 'listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_key','listing_contact_private.require_peer',
 'listing_contact_private.require_member','listing_contact_private.require_unblocked','listing_contact_private.positive_id',
 'listing_contact_private.guard_message','listing_contact_private.guard_conversation','listing_contact_private.guard_participant',
 'public.contact_my_listing_seller_v1','public.delete_my_published_listing_v1','listing_publication_private.apply_delete',
 'service_publication_private.contact_snapshot','horse_publication_private.contact_snapshot',
 'public.get_my_message_thread_v2','public.send_my_message_v2',
 'public.send_my_listing_message_v1','service_publication_private.select_current_context','service_publication_private.capture_message_card',
 'horse_publication_private.capture_message_card','public.get_required_publication_policies_v1',
 'public.require_my_current_publication_policy_acceptance_v1'];
export const existingRelations=['public.listings','public.listing_images','public.services','public.service_images',
 'public.horse_offers','public.horse_offer_images','public.identities','public.identity_profiles','public.business_accounts',
 'public.business_members','public.profiles','public.user_blocks','public.conversations','public.conversation_participants','public.messages',
 'public.publication_policy_documents','public.user_publication_policy_acceptances','listing_contact_private.channels',
 'provider_controls_private.hidden_providers','service_publication_private.thread_context','service_publication_private.message_cards',
 'horse_publication_private.thread_context','horse_publication_private.message_cards','service_publication_private.activity'];
export const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
export const array=values=>'ARRAY['+values.map(quote).join(',')+']::text[]';
export const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const digest=value=>"encode(sha256(convert_to(("+value+")::text,'UTF8')),'hex')";
const acl=expression=>`(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,
 'grantable',x.is_grantable) ORDER BY pg_get_userbyid(x.grantor),x.grantee::regrole::text,x.privilege_type),'[]'::jsonb)
 FROM aclexplode(${expression}) x)`;
const fnFacts=`jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
 'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,
 'result',pg_get_function_result(p.oid),'arguments',p.proargnames,'defaults',pg_get_expr(p.proargdefaults,0),
 'config',p.proconfig,'body',${digest('p.prosrc')},'acl',${acl("coalesce(p.proacl,acldefault('f',p.proowner))")})`;
const relationFacts=`jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('position',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
 'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid),'acl',${acl('a.attacl')}) ORDER BY a.attnum),'[]'::jsonb)
 FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
 'validated',q.convalidated) ORDER BY q.conname),'[]'::jsonb) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,'definition',pg_get_indexdef(i.indexrelid),
 'valid',i.indisvalid,'ready',i.indisready,'unique',i.indisunique) ORDER BY i.indexrelid::regclass::text),'[]'::jsonb) FROM pg_index i WHERE i.indrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb)
 FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND NOT (t.tgname IN('job_message_context','job_clear_context','job_clear_on_listing')
 AND (n.nspname||'.'||c.relname)=ANY(ARRAY['public.messages','public.conversations','service_publication_private.thread_context','horse_publication_private.thread_context']))),
 'acl',${acl("coalesce(c.relacl,acldefault('r',c.relowner))")},
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
 'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(p.polroles) r),
 'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid))`;

export function observationSql(){
 const blockPins=JSON.parse(fs.readFileSync(path.join(repair,'../20261114_block_removal_auth/catalog-pins.json'),'utf8'));
 // New incoming job FKs and one message trigger are assessed in our complete
 // capability inventory. Exclude only these additions from the unchanged
 // accepted block-removal structure; no old function/ACL/policy is excluded.
 let foundation=blockCatalog.report(blockPins);
 foundation=foundation.replace("AND t.tgname<>'user_blocks_cas_delete_v1'",
  "AND t.tgname<>'user_blocks_cas_delete_v1' AND NOT ((t.tgrelid='public.messages'::regclass AND t.tgname='job_message_context') OR (t.tgrelid='public.conversations'::regclass AND t.tgname='job_clear_on_listing'))");
 foundation=foundation.replace("WHERE q.contype='f' AND q.confrelid=c.oid)) structure",
  "WHERE q.contype='f' AND q.confrelid=c.oid AND q.conrelid::regclass::text NOT IN('jobs_private.contact_receipts','jobs_private.thread_context','jobs_private.message_cards'))) structure");
 return `WITH foundation AS MATERIALIZED (${foundation}),
 functions AS MATERIALIZED(SELECT n.nspname||'.'||p.proname name,p.oid::regprocedure::text signature,${fnFacts} facts
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname='jobs_private' OR (n.nspname='public' AND p.proname=ANY(${array(publicNames)})) OR n.nspname||'.'||p.proname=ANY(${array(dependencyNames)})),
 relations AS MATERIALIZED(SELECT n.nspname||'.'||c.relname name,${relationFacts} facts FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind IN('r','p') AND (n.nspname='jobs_private' OR n.nspname||'.'||c.relname='public.jobs'
 OR n.nspname||'.'||c.relname=ANY(${array(existingRelations)}))),
 policy_state AS MATERIALIZED(SELECT
 NOT EXISTS(SELECT 1 FROM public.publication_policy_documents p WHERE p.status='active' AND 'job'=ANY(p.applies_to_content_types)
 AND p.effective_from<=statement_timestamp() AND (p.effective_until IS NULL OR p.effective_until>statement_timestamp()) AND p.country_code IS NOT NULL)
 AND EXISTS(SELECT 1 FROM public.publication_policy_documents p WHERE p.status='active' AND 'job'=ANY(p.applies_to_content_types)
 AND p.country_code IS NULL AND p.locale='et-EE' AND p.requires_user_acceptance AND p.policy_key='marketplace-general'
 AND p.effective_from<=statement_timestamp() AND (p.effective_until IS NULL OR p.effective_until>statement_timestamp()))
 AND (SELECT count(*) FROM public.publication_policy_documents p WHERE p.status='active' AND 'job'=ANY(p.applies_to_content_types)
 AND p.country_code IS NULL AND p.locale='et-EE' AND p.requires_user_acceptance AND p.effective_from<=statement_timestamp()
 AND (p.effective_until IS NULL OR p.effective_until>statement_timestamp())) BETWEEN 1 AND 20 ready,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'version',p.policy_version,'content_hash',p.content_hash,
 'country',p.country_code,'locale',p.locale,'requires_acceptance',p.requires_user_acceptance,'effective_from',p.effective_from,
 'effective_until',p.effective_until) ORDER BY p.id),'[]'::jsonb) FROM public.publication_policy_documents p
 WHERE p.status='active' AND 'job'=ANY(p.applies_to_content_types) AND p.effective_from<=statement_timestamp()
 AND (p.effective_until IS NULL OR p.effective_until>statement_timestamp())) facts),
 observation AS MATERIALIZED(SELECT
 (SELECT result FROM foundation) foundation,(SELECT ready FROM policy_state) policy_ready,(SELECT facts FROM policy_state) policy_facts,
 (SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]'::jsonb) FROM functions WHERE name=ANY(${array(dependencyNames)})) dependencies,
 (SELECT coalesce(jsonb_agg(facts ORDER BY name),'[]'::jsonb) FROM relations WHERE name=ANY(${array(existingRelations)})) existing_relations,
 jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]'::jsonb) FROM functions WHERE name<>ALL(${array(dependencyNames)})),
 'tables',(SELECT coalesce(jsonb_agg(facts ORDER BY name),'[]'::jsonb) FROM relations WHERE name<>ALL(${array(existingRelations)})),
 'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),'acl',${acl("coalesce(n.nspacl,acldefault('n',n.nspowner))")})),'[]'::jsonb) FROM pg_namespace n WHERE n.nspname='jobs_private'),
 'added_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,'name',t.tgname,'enabled',t.tgenabled,
 'definition',pg_get_triggerdef(t.oid),'function_owner',pg_get_userbyid(p.proowner)) ORDER BY t.tgrelid::regclass::text,t.tgname),'[]'::jsonb)
 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal AND t.tgname IN('job_message_context','job_clear_context','job_clear_on_listing')
 AND t.tgrelid::regclass::text=ANY(ARRAY['public.messages','public.conversations','service_publication_private.thread_context','horse_publication_private.thread_context']))) capability,
 jsonb_build_object('schema',(SELECT jsonb_build_object('owner',pg_get_userbyid(n.nspowner),'acl',${acl("coalesce(n.nspacl,acldefault('n',n.nspowner))")}) FROM pg_namespace n WHERE n.nspname='auth'),
 'uid',(SELECT ${fnFacts} FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=to_regprocedure('auth.uid()'))) auth_authority)
`;
}
export function observe(){return observationSql()+`SELECT jsonb_build_object('foundation',foundation,'dependencies',dependencies,
 'existing_relations',existing_relations,'capability',capability,'auth_authority',auth_authority,
 'dependency_hash',${digest('dependencies')},'capability_hash',${digest('capability')},
 'invariants',jsonb_build_object('existing_functions',${digest('dependencies')},
 'existing_authority',${digest("jsonb_build_object('foundation',foundation->'invariants'->'existing_authority','relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',value->'name','acl',value->'acl','policies',value->'policies','columns',value->'columns') ORDER BY value->>'name'),'[]'::jsonb) FROM jsonb_array_elements(existing_relations)))")},
 'existing_structure',${digest("jsonb_build_object('foundation',foundation->'invariants'->'immutable_structure','relations',existing_relations)")},'auth_authority',${digest('auth_authority')})) result FROM observation`}
export function report(pins){return observationSql()+`,measured AS MATERIALIZED(SELECT *,
 ${digest('dependencies')} dependency_hash,${digest('capability')} capability_hash,
 jsonb_build_object('existing_functions',${digest('dependencies')},'existing_authority',${digest("jsonb_build_object('foundation',foundation->'invariants'->'existing_authority','relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',value->'name','acl',value->'acl','policies',value->'policies','columns',value->'columns') ORDER BY value->>'name'),'[]'::jsonb) FROM jsonb_array_elements(existing_relations)))")},
 'existing_structure',${digest("jsonb_build_object('foundation',foundation->'invariants'->'immutable_structure','relations',existing_relations)")},'auth_authority',${digest('auth_authority')}) invariants FROM observation),
 checked AS MATERIALIZED(SELECT *,jsonb_build_object(
 'installer',foundation->'guards'->'installer','hosted_context',foundation->'guards'->'hosted_context_ready',
 'block_removal_current',foundation->>'state'='applied' AND foundation->>'dependencies_ok'='true',
 'publication_foundation',dependency_hash=${quote(pins.dependencies)},'service_horse_foundation',dependency_hash=${quote(pins.dependencies)},
 'policy_foundation',dependency_hash=${quote(pins.dependencies)} AND policy_ready,'messaging_foundation',dependency_hash=${quote(pins.dependencies)}) guards FROM measured),
 assessed AS MATERIALIZED(SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value IS DISTINCT FROM 'true'::jsonb) dependencies_ok FROM checked)
 SELECT jsonb_build_object('schema_version',1,'kind','jobs-public-v1',
 'state',CASE WHEN dependencies_ok AND capability_hash=${quote(pins.before)} THEN 'absent'
 WHEN dependencies_ok AND capability_hash=${quote(pins.after)} THEN 'applied' ELSE 'incompatible' END,
 'recognized',dependencies_ok AND capability_hash IN(${quote(pins.before)},${quote(pins.after)}),
 'ready_to_apply',dependencies_ok AND capability_hash=${quote(pins.before)},'dependencies_ok',dependencies_ok,
 'fingerprints',jsonb_build_object('dependencies',${digest("jsonb_build_object('functions',dependency_hash,'policy',policy_facts)")},'capability',capability_hash),
 'invariants',invariants,'guards',guards,'hosted_context',foundation->'hosted_context',
 'rollout',jsonb_build_object('public_search',true,'validity','one_calendar_month_utc')) result FROM assessed`}
export function compose(query,changes){
 const settings=["SET LOCAL search_path=pg_catalog,pg_temp;","SET LOCAL timezone=\'UTC\';","SET LOCAL jit=off;","SET LOCAL lock_timeout='3s';"];
 const read=['BEGIN READ ONLY;',...settings,"SET LOCAL statement_timeout='20s';",query+';','COMMIT;',''].join('\n');
 const apply=['BEGIN;',...settings,"SET LOCAL statement_timeout='45s';","SET LOCAL idle_in_transaction_session_timeout='10s';",
 "SET LOCAL transaction_timeout='60s';","SELECT pg_advisory_xact_lock(hashtextextended('selqiro:jobs-public:v1',0));",
 'CREATE TEMP TABLE jobs_before ON COMMIT DROP AS '+query+';',
 "DO $guard$ DECLARE b jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.jobs_before;",
 "IF (b->>'recognized'='true' AND b->>'dependencies_ok'='true' AND b->>'state' IN('absent','applied')) IS NOT TRUE THEN",
 "RAISE EXCEPTION 'JOBS_STATE_NOT_RECOGNIZED' USING ERRCODE='55000';END IF;END $guard$;",
 "DO $install$ DECLARE b jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.jobs_before;IF b->>'state'='absent' THEN EXECUTE "+quote(changes)+";END IF;END $install$;",
 'CREATE TEMP TABLE jobs_after ON COMMIT DROP AS '+query+';',
 "DO $verify$ DECLARE b jsonb;a jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.jobs_before;SELECT result INTO STRICT a FROM pg_temp.jobs_after;",
 "IF (a->>'state'='applied' AND a->>'recognized'='true' AND a->>'dependencies_ok'='true' AND a->'invariants'=b->'invariants'",
 "AND a->'hosted_context'=b->'hosted_context' AND a->'fingerprints'->>'dependencies'=b->'fingerprints'->>'dependencies') IS NOT TRUE THEN",
 "RAISE EXCEPTION 'JOBS_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000';END IF;END $verify$;",
 "NOTIFY pgrst,'reload schema';",'SELECT result FROM pg_temp.jobs_after;','COMMIT;',''].join('\n');
 return {preflight:read,verify:read,apply};
}
