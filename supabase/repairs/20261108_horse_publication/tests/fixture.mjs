// Real PostgreSQL/WASM. Reuse retained declarations; never rerun old suites.
// Provider metadata is synthetic and is not evidence of live Storage traffic.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
// The inherited fixture exposes a local PGlite adapter hook. Keep its retained
// declarations unchanged while reproducing the provider's distinct bootstrap
// role and PostgreSQL 17 creator memberships in this disposable database.
const inheritedModule=process.env.SELQIRO_PGLITE_MODULE;
process.env.SELQIRO_HORSE_PGLITE_BACKEND=inheritedModule||'@electric-sql/pglite';
process.env.SELQIRO_PGLITE_MODULE=new URL('./provider-pglite.mjs',import.meta.url).href;
const base=await import('../../20261106_published_photo_addition/tests/fixture.mjs');
if(inheritedModule===undefined)delete process.env.SELQIRO_PGLITE_MODULE;
else process.env.SELQIRO_PGLITE_MODULE=inheritedModule;
const {denied, completeObject, setIdentity}=await import('../../20261106_published_photo_addition/tests/runtime-helpers.mjs');
process.on('uncaughtException',error=>{
 console.error(JSON.stringify({error:error.message,code:error.code,where:error.where,detail:error.detail,
  position:error.position,internalQuery:error.internalQuery,stack:error.code?undefined:error.stack},null,2));process.exit(1);
});
export const {db,actors,asActor,asRole,withActorContext}=base;
export {denied,setIdentity};
export const root=base.root;
export const repair=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const source=relative=>fs.readFileSync(path.join(root,relative),'utf8');
export const provenance=[...base.provenance];
const src=relative=>{const bytes=fs.readFileSync(path.join(root,relative));
 provenance.push({path:relative,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});return bytes.toString('utf8');};
for(const name of ['fixture.mjs','provider-pglite.mjs','public-contact-fixture.mjs'])
 src('supabase/repairs/20261108_horse_publication/tests/'+name);
function fn(sql,name){
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const escaped=name.split('.').map(p=>'(?:'+escape(p)+'|"'+escape(p)+'")').join('\\s*\\.\\s*');
 const match=new RegExp('create\\s+(?:or\\s+replace\\s+)?function\\s+'+escaped+'\\s*\\(','i').exec(sql);
 assert(match,name);const text=sql.slice(match.index),delimiter=/\bas\s+(\$[a-z_0-9]*\$)/i.exec(text);assert(delimiter,name);
 const end=text.indexOf(delimiter[1],delimiter.index+delimiter[0].length)+delimiter[1].length;
 return text.slice(0,text.indexOf(';',end)+1);
}
await db.exec(src('supabase/repairs/20261106_published_photo_addition/changes.sql'));
const publicationCore=src('supabase/releases/listing-publication-hosted-preview-v1/20_publication_core.sql');
await db.exec(fn(publicationCore,'public.get_my_listing_publication_v1')+`
 REVOKE ALL ON FUNCTION public.get_my_listing_publication_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
 GRANT EXECUTE ON FUNCTION public.get_my_listing_publication_v1(uuid,uuid,uuid) TO authenticated;`);
// Remove read-only shortcuts inherited from the old cleanup fixture. Restore
// the six private policies from their exact retained release components; no
// fixture_* policy is allowed to become a production acceptance requirement.
const syntheticPolicies=(await db.query(`SELECT n.nspname schema,c.relname relation,p.polname name
 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE p.polname LIKE 'fixture\\_%' ESCAPE '\\'`)).rows;
for(const row of syntheticPolicies)await db.exec('DROP POLICY '+row.name+' ON '+row.schema+'.'+row.relation);
for(const name of ['completion_internal_writer','settlement_internal','source_no_release_internal','tracking_insert_internal','recorded_no_release_insert_internal']){
 const start=publicationCore.indexOf('CREATE POLICY '+name+' ON ');assert(start>=0,name);
 await db.exec(publicationCore.slice(start,publicationCore.indexOf(';',start)+1));
}
for(const [name,relation,command] of [['final_internal_writer','upload_grants','FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true)'],
 ['release_read_internal','source_release_tracking','FOR SELECT TO selqiro_listing_final_writer_v1 USING(true)'],
 ['release_read_internal','source_recorded_no_release','FOR SELECT TO selqiro_listing_final_writer_v1 USING(true)']]){
 assert(publicationCore.includes('CREATE POLICY '+name+' ON listing_publication_private.%I '+command));
 await db.exec('CREATE POLICY '+name+' ON listing_publication_private.'+relation+' '+command);
}
await db.exec(`GRANT INSERT ON listing_publication_private.web_write_completions,listing_publication_private.write_settlements,
 listing_publication_private.source_no_release,listing_publication_private.source_release_tracking,
 listing_publication_private.source_recorded_no_release TO selqiro_listing_final_writer_v1`);
const baseline=src('supabase/migrations/20260722173530_baseline_20260722.sql');
await db.exec(fn(baseline,'public.require_my_active_identity_v2')+'\n'+fn(baseline,'public.set_v2_profile_content_updated_at'));
for(const statement of baseline.matchAll(/^(?:REVOKE ALL|GRANT ALL) ON FUNCTION "public"\."(?:require_my_active_identity_v2|set_v2_profile_content_updated_at)"[^;]+;/gm))
 await db.exec(statement[0]);
// These exact baseline defaults were omitted by the earlier disposable fixture.
// Apply them before restoring the horse and policy migrations: their explicit
// REVOKEs intentionally leave some provider-default EXECUTE entries in place.
// The production installer does not change any retained default privileges.
const functionDefaults=[...baseline.matchAll(/^ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "(?:postgres|anon|authenticated|service_role)";/gm)];
assert.equal(functionDefaults.length,4,'retained public function defaults');
for(const statement of functionDefaults)await db.exec(statement[0]);
// PGlite does not bundle pgcrypto. This SHA-256-only fixture shim calls the same
// PostgreSQL core hash, preserving the retained event trigger's exact input.
await db.exec(`CREATE SCHEMA extensions;
 CREATE FUNCTION extensions.digest(bytea,text) RETURNS bytea LANGUAGE plpgsql IMMUTABLE AS $$
 BEGIN IF $2<>'sha256' THEN RAISE EXCEPTION 'fixture_hash_not_supported'; END IF; RETURN sha256($1); END $$;`);
const foundation=src('supabase/migrations/20260830170000_add_ee_horse_offer_foundation.sql');
await db.exec(foundation.slice(foundation.indexOf('create table public.horse_offers')).replace(/commit;\s*$/i,''));
await db.exec(src('supabase/migrations/20260913113000_add_owner_horse_offer_detail_read.sql'));
await db.exec(src('supabase/migrations/20260913190000_add_owner_horse_offer_draft_update.sql'));
const policies=src('supabase/migrations/20260822130000_add_publication_policy_acceptance_foundation.sql');
export const horsePolicyId='f2222222-2222-2222-2222-222222222222';
await db.query(`UPDATE public.publication_policy_documents SET applies_to_content_types=ARRAY['listing','horse_offer'],
 metadata='{"immediate_low_risk_publication":true,"risk_based_prepublication_review":true,"post_publication_review":true,
 "notice_and_action":true,"ai_moderation_mode":"off"}' WHERE id=$1`,[base.policyId]);
await db.query(`INSERT INTO public.publication_policy_documents(id,policy_key,policy_version,country_code,title,body_text,
 content_hash,status,applies_to_content_types,effective_from,metadata)
 VALUES($1,'horse-offer-ee','ee-horse-v1','EE','Synthetic horse rules','Synthetic horse policy body for isolated SQL validation.',
 repeat('b',64),'active',ARRAY['horse_offer'],now()-interval '1 day',
 '{"market_country_code":"EE","horse_location_country_code":"EE","cross_border_flow":false,"ai_moderation_mode":"off",
 "supported_offer_types":["sale","free_transfer","lease","co_rider","wanted"],"immediate_low_risk_publication":true,
 "universal_admin_prepublication_review":false,"risk_based_prepublication_review":true,"post_publication_review":true,
 "notice_and_action":true,"default_passport_upload":false,"default_id_document_check":false}')`,[horsePolicyId]);
// Preserve exact policy functions, indexes, triggers and authority. The earlier
// ordinary fixture restored table declarations only; neither an absent append-
// only guard nor fixture-default EXECUTE rights may become an installer pin.
for(const match of policies.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(public\.[a-z0-9_]+)\s*\(/gi))
 await db.exec(fn(policies,match[1]));
for(const pattern of [/create\s+(?:unique\s+)?index\s+[\s\S]*?;/gi,/create\s+trigger\s+[\s\S]*?;/gi,/create\s+policy\s+[\s\S]*?;/gi,
 /(?:revoke all|grant (?:all|select|execute))\s+on\s+(?:table|function)\s+[\s\S]*?;/gi])
 for(const statement of policies.matchAll(pattern))await db.exec(statement[0]);
export const shownPolicies=[{documentId:base.policyId,version:'v1',contentHash:'a'.repeat(64),accepted:true},
 {documentId:horsePolicyId,version:'ee-horse-v1',contentHash:'b'.repeat(64),accepted:true}];
export const files=['01_policy_schema.sql','02_commands_prepare.sql','03_finality.sql','04_media_bridge.sql','05_authority.sql'];
export async function installHorseModules(names=files){for(const file of names){const full=path.join(repair,file);if(!fs.existsSync(full)){
 if(process.env.SELQIRO_HORSE_COMPILE_ONLY==='1')continue;throw Error('repair module missing: '+file);}
 await db.exec(fs.readFileSync(full,'utf8'));}}
if(process.env.SELQIRO_HORSE_BASELINE_ONLY!=='1')await installHorseModules();
await base.seal();
export const call=async(user,name,args)=>(await asActor(user,
 'SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') value',args)).rows[0].value;
export const service=async(name,args)=>(await asRole('service_role',
 'SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') value',args)).rows[0].value;
export function content(type='sale',overrides={}){
 return {offerId:null,offerType:type,marketCountryCode:'EE',horseLocationCountryCode:'EE',currency:'EUR',
 title:'Synthetic horse '+type,description:'A complete synthetic horse offer description.',priceAmount:null,
 priceType:type==='free_transfer'?'free':'contact',horseName:null,birthYear:null,sex:null,breed:null,color:null,heightCm:null,
 discipline:null,trainingLevel:null,suitability:null,healthNotes:null,behaviorNotes:null,city:null,region:null,
 locationText:null,horseLat:null,horseLng:null,recurringFeePeriod:['lease','co_rider'].includes(type)?'month':null,
 wantedPreferredSex:null,wantedPreferredBreed:null,wantedPreferredDiscipline:null,wantedPreferredTrainingLevel:null,
 wantedIntendedUse:null,wantedHealthPreferences:null,wantedBehaviorPreferences:null,wantedBudgetMode:'contact',
 wantedBudgetAmount:null,wantedCity:null,wantedRegion:null,...overrides};
}
export const confirmations={publisher_confirms_age_18_or_over:true,publisher_confirms_information_accurate:true,
 publisher_accepts_transaction_responsibility:true,publisher_confirms_not_for_slaughter:true,publisher_is_owner_or_authorized:true,
 publisher_confirms_horse_identified:true,publisher_confirms_passport_available:true};
export const newImage=()=>({clientFileId:crypto.randomUUID(),byteLength:100,sha256:'b'.repeat(64),isPrimary:true});
export async function prepare(data=content(),images=[],options={}){
 const user=options.user??actors.owner,identity=options.identity??actors.ownerIdentity,key=options.key??crypto.randomUUID();
 const args=[user,identity,key,options.offerId??null,options.revision??null,data,images,options.confirmations??confirmations,options.policies??shownPolicies];
 const result=await call(user,'prepare_my_horse_publication_v1',args);return {...result,args};
}
export const publish=p=>call(p.actor_user_id,'publish_my_horse_offer_v1',[p.actor_user_id,p.identity_id,p.attempt_id,p.request_key]);
export const status=p=>call(p.actor_user_id,'get_my_horse_publication_attempt_v1',[p.actor_user_id,p.identity_id,p.attempt_id,p.request_key]);
export const cancel=p=>call(p.actor_user_id,'cancel_my_horse_publication_v1',[p.actor_user_id,p.identity_id,p.attempt_id,p.request_key]);
export const ownerRead=p=>call(p.actor_user_id,'get_my_horse_offer_publication_snapshot_v1',[p.actor_user_id,p.identity_id,p.horse_offer_id]);
// The retained binary RPCs are exercised unchanged. Horse image request keys
// are the exact prepared client-file IDs, rather than arbitrary operation IDs.
export async function readyImage(p,index=0){
 const snapshot={...p,slots:[p.slots[index]]},slot=snapshot.slots[0],uploadRequest=slot.client_file_id;
 const context=[snapshot.actor_user_id,snapshot.identity_id,snapshot.attempt_id,slot.slot_id];
 const source=await completeObject(snapshot,uploadRequest,'source');
 const claim=await service('claim_listing_web_image_v1',[...context,uploadRequest]);assert(claim.process_allowed);
 const intent={pipeline_version:'listing-web-v1',content_type:'image/webp',source_sha256:slot.expected_sha256,
  source_bytes:100,source_format:'jpeg',web_sha256:'c'.repeat(64),web_bytes:100,width:200,height:100,
  sharp_version:'0.34.3',libvips_version:'8.17.1'};
 const write=await service('prepare_listing_web_write_v1',[...context,claim.binding.job_id,claim.claim_id,intent]);assert(write.write_allowed);
 const web=await completeObject(snapshot,uploadRequest,'web');
 const result=await service('record_listing_web_ready_v1',[...context,claim.binding.job_id,intent.web_sha256,100]);
 return {ready:result.receipt.receipt_id,receipt:result.receipt,source,web,uploadRequest};
}
export const isPublic=async id=>(await db.query('SELECT horse_publication_private.is_public($1) value',[id])).rows[0].value;
