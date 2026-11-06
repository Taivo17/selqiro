// The accepted fixture plus exact retained publication/multipart/policy helpers.
// No previous test suite runs. Provider metadata below is entirely synthetic.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as base from '../../20261106_retired_web_cleanup/tests/fixture.mjs';
import {retainedAuthority} from './retained-authority.mjs';
export const {db,actors,asActor,asRole,withActorContext,seedCompletedListing,gallery,remove,primary,
 claim,record,webClaim,webRecord,webStatus,removeSyntheticMetadata,completeSources,accounting}=base;
export const root=base.root;
export const here=path.dirname(fileURLToPath(import.meta.url));
export const repair=path.dirname(here);
export const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
export const provenance=[...base.provenance];
const pins=JSON.parse(read('source-pins.json'));
function source(relative){
 const bytes=fs.readFileSync(path.join(root,relative)),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 assert.equal(sha256,pins.inputs[relative],'retained source changed: '+relative);
 provenance.push({path:relative,sha256});return bytes.toString('utf8');
}
export function fn(sql,name){
 const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const matches=[...sql.matchAll(new RegExp('CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+'+escape(name)+'\\s*\\(','gi'))];
 assert(matches.length,name);const text=sql.slice(matches.at(-1).index);
 const delimiter=/\bAS\s+(\$[a-z_0-9]*\$)/i.exec(text);assert(delimiter,name);
 const end=text.indexOf(delimiter[1],delimiter.index+delimiter[0].length)+delimiter[1].length;
 return text.slice(0,text.indexOf(';',end)+1);
}
function table(sql,name){
 const start=sql.toLowerCase().indexOf('create table '+name+' (');assert(start>=0,name);
 return sql.slice(start,sql.indexOf('\n);',start)+3);
}
const before=source('supabase/releases/listing-publication-hosted-preview-v1/00_preconditions.sql');
const price=source('supabase/releases/listing-publication-hosted-preview-v1/10_price_core.sql');
const core=source('supabase/releases/listing-publication-hosted-preview-v1/20_publication_core.sql');
const multi=source('supabase/releases/listing-publication-hosted-preview-v1/30_multipart_and_journey.sql');
const assembled=source('supabase/releases/listing-publication-hosted-preview-v1/release.sql');
const authority=source('supabase/releases/listing-publication-hosted-preview-v1/60_preview_authority.sql');
const policy=source('supabase/migrations/20260822130000_add_publication_policy_acceptance_foundation.sql');
const baseline=source('supabase/migrations/20260722173530_baseline_20260722.sql');
source('supabase/repairs/20261106_retired_web_cleanup/tests/fixture.mjs');
await db.exec(source('supabase/repairs/20261106_retired_web_cleanup/changes.sql'));
// The accepted read-only cleanup fixture did not exercise abort INSERTs. Restore
// the retained multipart authority for the newly affected terminal family path.
await db.exec('DROP POLICY fixture_read_dependency ON listing_publication_private.multipart_abort_observations');
await db.exec(multi.slice(multi.indexOf('ALTER TABLE listing_publication_private.multipart_abort_observations ENABLE'),
 multi.indexOf('CREATE FUNCTION listing_publication_private.protect_multipart_abort()')));
const priceNames=['listing_price_currency_scale_v1','normalize_listing_price_v1','normalize_listing_basics_v1',
 'listing_create_category_path_valid_v1','normalize_listing_create_location_v1','normalize_listing_creation_v1',
 'listing_price_legacy_label_v1','listing_price_tuple_valid_v1','listing_basics_search_text_v1'];
const coreNames=['require_policies','normalize_images','snapshot','close_locked_attempt','lock_web_context','web_binding',
 'web_receipt','final_material','apply_final','assert_final_last_boundary'];
const corePublic=['cancel_my_listing_publication_v1','get_my_listing_publication_confirmation_v1','publish_my_listing_v1',
 'prepare_listing_web_write_v1'];
const multiPrivate=['guard_closed_journey_request','multipart_binding','lock_multipart_context','lock_multipart_object'];
const multiPublic=['get_my_listing_publication_journey_v2','cancel_my_listing_publication_journey_v2',
 'prepare_my_listing_publication_v1','reserve_listing_multipart_v2','get_listing_multipart_v2',
 'record_listing_multipart_created_v2','claim_listing_multipart_part_v2','claim_listing_multipart_complete_v2',
 'record_listing_multipart_completed_v2','record_listing_multipart_verified_v2','claim_listing_web_image_v1',
 'record_listing_web_ready_v1','prepare_listing_multipart_cleanup_v2','record_listing_multipart_abort_v2'];
const extra=[...priceNames.map(name=>[price,'public.'+name]),...coreNames.map(name=>[core,'listing_publication_private.'+name]),
 ...corePublic.map(name=>[core,'public.'+name]),...multiPrivate.map(name=>[multi,'listing_publication_private.'+name]),
 ...multiPublic.map(name=>[multi,'public.'+name]),[before,'listing_publication_private.assert_hosted_preview_object']];
for(const [sql,name] of extra)assert.equal(fn(sql,name),fn(assembled,name),'stale retained declaration: '+name);
const policies=['public.get_required_publication_policies_v1','public.require_my_current_publication_policy_acceptance_v1'];
export const dependencyNames=[...new Set([...base.dependencyNames,...extra.map(([,name])=>name),...policies,
 'listing_publication_private.hosted_retired_web_deleted_v1','listing_publication_private.lock_retired_web_cleanup_context_v1',
 'public.claim_listing_retired_web_cleanup_v1','public.record_listing_retired_web_cleanup_v1','public.get_my_listing_retired_web_cleanup_v1'])];
await db.exec(table(policy,'public.publication_policy_documents')+'\n'+table(policy,'public.user_publication_policy_acceptances')+'\n'+
 table(multi,'listing_publication_private.closed_journey_requests')+'\n'+policies.map(name=>fn(policy,name)).join('\n')+'\n'+
 extra.map(([sql,name])=>fn(sql,name)).join('\n')+`
 ALTER TABLE public.publication_policy_documents ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.user_publication_policy_acceptances ENABLE ROW LEVEL SECURITY;
 ALTER TABLE listing_publication_private.closed_journey_requests ENABLE ROW LEVEL SECURITY;
 REVOKE ALL ON listing_publication_private.closed_journey_requests FROM PUBLIC,anon,authenticated,service_role;
 CREATE TRIGGER guard_closed_journey_request BEFORE INSERT ON listing_publication_private.attempts
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_closed_journey_request();
 CREATE SEQUENCE public.listings_id_seq START 100000;
 ALTER TABLE public.listings ALTER COLUMN id SET DEFAULT nextval('public.listings_id_seq');
 GRANT USAGE,SELECT ON SEQUENCE public.listings_id_seq TO selqiro_listing_final_writer_v1;
 GRANT EXECUTE ON FUNCTION public.normalize_listing_price_v1(jsonb),public.listing_price_currency_scale_v1(text),
 public.listing_price_legacy_label_v1(jsonb),public.listing_price_tuple_valid_v1(text,numeric,text,bigint,text),
 public.listing_basics_search_text_v1(public.listings) TO selqiro_listing_final_writer_v1;
 REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
 GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA listing_publication_private TO selqiro_listing_final_writer_v1;
 GRANT CREATE ON SCHEMA public,listing_publication_private TO selqiro_listing_final_writer_v1;
 ALTER FUNCTION listing_publication_private.apply_final(uuid,jsonb,text) OWNER TO selqiro_listing_final_writer_v1;
`);
const protocolNames=multiPublic.filter(name=>['reserve_listing_multipart_v2','get_listing_multipart_v2',
 'record_listing_multipart_created_v2','claim_listing_multipart_part_v2','claim_listing_multipart_complete_v2',
 'record_listing_multipart_completed_v2','record_listing_multipart_verified_v2','prepare_listing_multipart_cleanup_v2',
 'record_listing_multipart_abort_v2'].includes(name));
for(const name of [...corePublic,...multiPublic]){
 const row=(await db.query(`SELECT oid::regprocedure::text signature FROM pg_proc
 WHERE pronamespace='public'::regnamespace AND proname=$1`,[name])).rows[0];assert(row,name);
 await db.exec(`REVOKE ALL ON FUNCTION ${row.signature} FROM PUBLIC,anon,authenticated,service_role`);
 if(protocolNames.includes(name))await db.exec(`ALTER FUNCTION ${row.signature} OWNER TO selqiro_listing_final_writer_v1`);
 // Match the exact retained preview allowlists. Generic deletion claim stays closed.
 for(const grant of authority.matchAll(/GRANT EXECUTE ON FUNCTION([\s\S]*?)\sTO (authenticated|service_role);/g)){
  if(grant[1].includes('public.'+name+'('))await db.exec(`GRANT EXECUTE ON FUNCTION ${row.signature} TO ${grant[2]}`);
 }
}
await db.exec('REVOKE CREATE ON SCHEMA public,listing_publication_private FROM selqiro_listing_final_writer_v1');
await retainedAuthority(db,assembled,policy);
for(const statement of baseline.matchAll(/^GRANT ALL ON FUNCTION "public"\."set_listing_primary_image_v2"[^;]+;/gm)) {
 await db.exec(statement[0]);
}
export const policyId='f1111111-1111-1111-1111-111111111111';
await db.query(`INSERT INTO public.publication_policy_documents(id,policy_key,policy_version,title,body_text,content_hash,
 status,applies_to_content_types,effective_from) VALUES($1,'marketplace-general','v1','Synthetic policy',
 'Synthetic publication policy body used only by this isolated fixture.',repeat('a',64),'active',ARRAY['listing'],now()-interval '1 day')`,[policyId]);
for(const user of [actors.owner,actors.peer,actors.member])await db.query(`INSERT INTO public.user_publication_policy_acceptances
 (user_id,policy_document_id,policy_key,policy_version,locale,content_hash) VALUES($1,$2,'marketplace-general','v1','et-EE',repeat('a',64))`,[user,policyId]);
export const seal=base.seal;
