// Disposable PostgreSQL/WASM fixture for the service publication adapter.
// Retained SQL declarations establish the baseline; no older test suite or
// provider network operation runs here. Synthetic policy/Storage scaffolding
// is identified explicitly and is never a production catalog requirement.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as base from '../../20261108_horse_confirmation_reuse/tests/fixture.mjs';
export * from '../../20261108_horse_confirmation_reuse/tests/fixture.mjs';

export const {db,root,actors,asActor,asRole,call,service,readyImage,newImage,denied,setIdentity}=base;
export const repair=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const provenance=[...base.provenance];
export const restoredRetainedPrivate=base.restoredRetainedPrivate;
export const shownPolicies=[base.shownPolicies[0]];
export const horseShownPolicies=base.shownPolicies;

function source(relative){
 const bytes=fs.readFileSync(path.join(root,relative));
 provenance.push({path:relative,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 return bytes.toString('utf8');
}
export function retainedFunction(sql,name){
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const escaped=name.split('.').map(p=>'(?:'+escape(p)+'|"'+escape(p)+'")').join('\\s*\\.\\s*');
 const match=new RegExp('create\\s+(?:or\\s+replace\\s+)?function\\s+'+escaped+'\\s*\\(','i').exec(sql);
 assert(match,'retained function '+name);
 const text=sql.slice(match.index),delimiter=/\bas\s+(\$[a-z_0-9]*\$)/i.exec(text);
 assert(delimiter,'function delimiter '+name);
 const bodyEnd=text.indexOf(delimiter[1],delimiter.index+delimiter[0].length);
 assert(bodyEnd>=0,'function body '+name);
 return text.slice(0,text.indexOf(';',bodyEnd+delimiter[1].length)+1);
}
function retainedTable(sql,name){
 const start=sql.indexOf('CREATE TABLE IF NOT EXISTS "public"."'+name+'"');
 assert(start>=0,'retained table '+name);
 const end=sql.indexOf('\n);',start);
 assert(end>start,'table end '+name);
 return sql.slice(start,end+3);
}

// Prove the inherited current repair chain before adding service declarations.
const confirmationVerify=source('supabase/repairs/20261108_horse_confirmation_reuse/verify.sql');
const previous=(await db.exec(confirmationVerify)).flatMap(r=>r.rows).filter(r=>r.result);
assert.equal(previous.length,1);
assert.equal(previous[0].result.state,'applied',JSON.stringify(previous[0].result));
export const priorCatalog=previous[0].result;

const baseline=source('supabase/migrations/20260722173530_baseline_20260722.sql');
assert.equal((await db.query("SELECT to_regclass('public.services') value")).rows[0].value,null,
 'service relation must be restored from its exact retained declaration');
await db.exec(retainedTable(baseline,'services'));
for(const pattern of [
 /^ALTER TABLE "public"\."services" OWNER TO "postgres";/gm,
 /^ALTER TABLE ONLY "public"\."services"\s+ADD CONSTRAINT[^;]+;/gm,
 /^CREATE (?:UNIQUE )?INDEX [^;]+ ON "public"\."services"[^;]+;/gm,
 /^CREATE OR REPLACE TRIGGER [^;]+ ON "public"\."services"[^;]+;/gm,
 /^ALTER TABLE "public"\."services" ENABLE ROW LEVEL SECURITY;/gm,
 /^CREATE POLICY [^;]+ ON "public"\."services"[^;]+;/gm,
 /^(?:GRANT|REVOKE) [^;]+ ON TABLE "public"\."services"[^;]+;/gm,
])for(const statement of baseline.matchAll(pattern))await db.exec(statement[0]);

// The accepted shared fixture already restores the business account relation.
// Require the authoritative recipient column rather than inventing a member.
assert.equal((await db.query(`SELECT count(*)::int value FROM information_schema.columns
 WHERE table_schema='public' AND table_name='business_accounts' AND column_name='owner_user_id'
 AND data_type='uuid' AND is_nullable='NO'`)).rows[0].value,1);
// The old binary fixture seeded business membership without an account row.
// Service contact resolves the actual account owner, so seed that synthetic
// account explicitly; the publishing member remains a different test actor.
await db.query(`INSERT INTO public.business_accounts(id,owner_user_id,name)
 SELECT $1::uuid,$2::uuid,'Synthetic service business'
 WHERE NOT EXISTS(SELECT 1 FROM public.business_accounts WHERE id=$1::uuid)`,[actors.business,actors.owner]);

for(const name of ['save_my_service_v2','set_my_service_status_v2']){
 await db.exec(retainedFunction(baseline,'public.'+name));
 // These functions already existed in the baseline dump. The inherited
 // fixture has since restored that dump's defaults for future functions.
 // Clear those synthetic inherited API grants before replaying each existing
 // function's exact dumped ACL; otherwise anon incorrectly keeps EXECUTE.
 const signature=(await db.query(`SELECT p.oid::regprocedure::text value
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname=$1`,[name])).rows;
 assert.equal(signature.length,1,'one exact retained service writer '+name);
 await db.exec('REVOKE ALL ON FUNCTION '+signature[0].value+' FROM PUBLIC,anon,authenticated,service_role');
 const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 for(const statement of baseline.matchAll(new RegExp('^(?:ALTER FUNCTION|REVOKE ALL ON FUNCTION|GRANT ALL ON FUNCTION) "public"\\."'+escaped+'"[^;]+;','gm')))
  await db.exec(statement[0]);
}

// The category/image tables were introduced after the baseline. Restore the
// baseline's exact defaults for future public tables before replaying those
// migrations. In particular category migration revokes PUBLIC only, so its
// later SELECT grants do not erase the inherited anon/authenticated grants.
// This affects the disposable fixture only; installation changes no defaults.
const tableDefaults=[...baseline.matchAll(/^ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "(?:postgres|anon|authenticated|service_role)";/gm)];
assert.equal(tableDefaults.length,4,'retained public table defaults');
for(const statement of tableDefaults)await db.exec(statement[0]);

// The old binary fixture models only Storage columns used by ordinary photos.
// Add the provider's bucket name and folder-name helper for the exact retained
// service image migration. Neither shim participates in production pinning.
await db.exec(`ALTER TABLE storage.buckets ADD COLUMN name text;
 UPDATE storage.buckets SET name=id;
 CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE
 SET search_path=pg_catalog AS $$
  SELECT CASE WHEN cardinality(string_to_array($1,'/'))>1
   THEN (string_to_array($1,'/'))[1:cardinality(string_to_array($1,'/'))-1]
   ELSE ARRAY[]::text[] END
 $$;`);
for(const name of ['20260802213000_add_service_category_foundation.sql',
 '20260805123000_add_service_image_foundation.sql','20260805150000_add_service_image_rpcs.sql'])
 await db.exec(source('supabase/migrations/'+name));

const publicReads=source('supabase/releases/listing-publication-hosted-preview-v1/40_read_models_and_owner.sql');
await db.exec(retainedFunction(publicReads,'public.get_public_profile_services_v1'));
// The hosted authority file grants this reader with the other public readers.
// Replay its exact grant for this restored function, not the closed lab ACL.
const publicAuthority=source('supabase/releases/listing-publication-hosted-preview-v1/60_preview_authority.sql');
const profileGrant='GRANT EXECUTE ON FUNCTION public.get_public_profile_services_v1(text,integer) TO anon,authenticated;';
assert([...publicAuthority.matchAll(/GRANT EXECUTE ON FUNCTION[\s\S]*?;/g)].some(match=>
 match[0].includes('public.get_public_profile_services_v1(text,integer)')
 && /TO anon,authenticated;\s*$/.test(match[0])),'retained public service profile grant');
await db.exec(`ALTER FUNCTION public.get_public_profile_services_v1(text,integer) OWNER TO postgres;
 REVOKE ALL ON FUNCTION public.get_public_profile_services_v1(text,integer) FROM PUBLIC,anon,authenticated,service_role;
 ${profileGrant}`);

// Earlier isolated horse seeds intentionally narrowed the synthetic general
// policy's content types. Complete that same synthetic seed for service tests
// inside one transaction, then restore the exact immutable trigger before any
// tested operation. This is data setup only, not a deployable SQL workaround.
const policyBefore=(await db.query(`SELECT id,applies_to_content_types FROM public.publication_policy_documents
 WHERE id=$1`,[shownPolicies[0].documentId])).rows[0];
assert(policyBefore && policyBefore.applies_to_content_types.includes('horse_offer'));
await db.exec('BEGIN; ALTER TABLE public.publication_policy_documents DISABLE TRIGGER trg_publication_policy_documents_version_immutable;');
try{
 await db.query(`UPDATE public.publication_policy_documents SET applies_to_content_types=
  array_append(applies_to_content_types,'service') WHERE id=$1 AND NOT ('service'=ANY(applies_to_content_types))`,
  [shownPolicies[0].documentId]);
 await db.exec('ALTER TABLE public.publication_policy_documents ENABLE TRIGGER trg_publication_policy_documents_version_immutable; COMMIT;');
}catch(error){await db.exec('ROLLBACK;');throw error;}
assert.equal((await db.query(`SELECT tgenabled FROM pg_trigger WHERE tgrelid='public.publication_policy_documents'::regclass
 AND tgname='trg_publication_policy_documents_version_immutable'`)).rows[0].tgenabled,'O');

export const serviceModules=['01_state.sql','02_content.sql','03_commands.sql','04_cancel.sql',
 '05_media_bridge.sql','06_reads_status.sql','07_contact.sql','08_authority.sql'];
export async function applyServiceModules(names=serviceModules){
 for(const name of names)await db.exec(fs.readFileSync(path.join(repair,name),'utf8'));
}
export function content(overrides={}){
 return {serviceId:null,title:'Synthetic transport service',description:'Synthetic service for isolated validation.',
 category:'transport_roadside',subcategory:null,priceAmount:null,priceType:'contact',currency:'EUR',
 country:'Estonia',city:'Rapla',location:null,...overrides};
}
export async function prepare(data=content(),images=[],options={}){
 const user=options.user??actors.owner,identity=options.identity??actors.ownerIdentity,key=options.key??crypto.randomUUID();
 const args=[user,identity,key,options.serviceId??null,options.revision??null,data,images,options.policies??shownPolicies];
 const result=await call(user,'prepare_my_service_publication_v1',args);
 return {...result,args};
}
export const publish=p=>call(p.actor_user_id,'publish_my_service_v1',[p.actor_user_id,p.identity_id,p.attempt_id,p.request_key]);
export const status=p=>call(p.actor_user_id,'get_my_service_publication_attempt_v1',[p.actor_user_id,p.identity_id,p.attempt_id,p.request_key]);
export const cancel=p=>call(p.actor_user_id,'cancel_my_service_publication_v1',[p.actor_user_id,p.identity_id,p.attempt_id,p.request_key]);
export const ownerRead=p=>call(p.actor_user_id,'get_my_service_publication_snapshot_v1',[p.actor_user_id,p.identity_id,p.service_id]);
if(process.env.SELQIRO_SERVICE_BASELINE_ONLY!=='1')await applyServiceModules();
