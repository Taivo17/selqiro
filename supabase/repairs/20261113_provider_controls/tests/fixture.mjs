// Current applied chain from exact declarations in a disposable PostgreSQL/WASM.
// Imports fixture setup only: no earlier suite, installer, network or cloud run.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as previous from '../../20261111_service_activity/tests/fixture.mjs';
import {retainedFunction} from '../../20261108_service_publication/tests/fixture.mjs';
export * from '../../20261111_service_activity/tests/fixture.mjs';
export const {db,root,actors,asActor,asRole,setIdentity,call,sha,all,result}=previous;
export const repair=path.join(root,'supabase/repairs/20261113_provider_controls');
export const provenance=[...previous.provenance];
export function source(relative){const value=fs.readFileSync(path.join(root,relative),'utf8');
 provenance.push({path:relative,sha256:sha(value)});return value;}
const prior=await result(source('supabase/repairs/20261111_service_activity/apply.sql'));
assert.equal(prior.length,1);assert.equal(prior[0].state,'applied');
// These two real entrypoints were outside the earlier focused service fixture.
const baseline=source('supabase/migrations/20260722173530_baseline_20260722.sql');
// Restore the real read policies omitted by earlier photo/message fixtures.
// Do not add a permissive synthetic policy to make the invoker view pass.
for(const statement of baseline.matchAll(/^CREATE POLICY "[^"]+" ON "public"\."user_blocks"[^;]+;/gm))await db.exec(statement[0]);
for(const statement of baseline.matchAll(/^(?:GRANT|REVOKE) [^;]+ ON (?:TABLE "public"\."user_blocks"|SEQUENCE "public"\."user_blocks_id_seq")[^;]+;/gm))await db.exec(statement[0]);
const publicListings=baseline.match(/^CREATE POLICY "Public can view listings"[^;]+;/m);assert(publicListings);
await db.exec(publicListings[0]+'\nGRANT SELECT ON public.listings TO anon,authenticated;');
const translationStart=baseline.indexOf('CREATE TABLE IF NOT EXISTS "public"."listing_translations"');assert(translationStart>=0);
await db.exec(baseline.slice(translationStart,baseline.indexOf('\n);',translationStart)+3));
for(const pattern of [
 /^ALTER TABLE "public"\."listing_translations"[^;]+;/gm,
 /^ALTER TABLE ONLY "public"\."listing_translations"\s+ADD CONSTRAINT[^;]+;/gm,
 /^CREATE (?:UNIQUE )?INDEX [^;]+ ON "public"\."listing_translations"[^;]+;/gm,
 /^CREATE POLICY "[^"]+" ON "public"\."listing_translations"[^;]+;/gm,
 /^(?:GRANT|REVOKE) [^;]+ ON TABLE "public"\."listing_translations"[^;]+;/gm,
])for(const statement of baseline.matchAll(pattern))await db.exec(statement[0]);
const publicImages=baseline.match(/^CREATE POLICY "Users can view all images"[^;]+;/m);assert(publicImages);
await db.exec(publicImages[0]+'\nGRANT SELECT ON public.listing_images TO anon,authenticated;');
await db.exec(retainedFunction(baseline,'public.get_store_by_slug'));
for(const statement of baseline.matchAll(/^(?:ALTER FUNCTION|REVOKE ALL ON FUNCTION|GRANT ALL ON FUNCTION) "public"\."get_store_by_slug"[^;]+;/gm))
 await db.exec(statement[0]);
for(const name of ['get_marketplace_listings','get_marketplace_listings_nearby']){
 await db.exec(retainedFunction(baseline,'public.'+name));
 for(const statement of baseline.matchAll(new RegExp('^(?:ALTER FUNCTION|REVOKE ALL ON FUNCTION|GRANT ALL ON FUNCTION) "public"\\."'+name+'"[^;]+;','gm')))
  await db.exec(statement[0]);
}
const ordinary=source('supabase/migrations/20260926180000_add_public_listing_detail_keywords.sql');
await db.exec(retainedFunction(ordinary,'public.search_public_listings_v1')+`
 ALTER FUNCTION public.search_public_listings_v1(text,text,text,text,text,text,integer,integer) OWNER TO postgres;
 REVOKE ALL ON FUNCTION public.search_public_listings_v1(text,text,text,text,text,text,integer,integer) FROM PUBLIC,anon,authenticated,service_role;
 GRANT EXECUTE ON FUNCTION public.search_public_listings_v1(text,text,text,text,text,text,integer,integer) TO anon,authenticated,service_role;`);
const readers=source('supabase/releases/listing-publication-hosted-preview-v1/40_read_models_and_owner.sql');
const readerAuthority=source('supabase/releases/listing-publication-hosted-preview-v1/60_preview_authority.sql');
for(const [name,args,isPublic] of [
 ['search_public_listings_v2','text,text,text,text,text,text,integer,integer',true],
 ['public_listing_detail_field_spec_v1','text[]',false],['public_listing_detail_values_v1','public.listings',false],
 ['get_public_listing_detail_v1','text',true]]){
 const signature='public.'+name+'('+args+')';
 assert.equal((await db.query('SELECT to_regprocedure($1) value',[signature])).rows[0].value,null,'restore omitted original '+name);
 await db.exec(retainedFunction(readers,'public.'+name)+`\nALTER FUNCTION ${signature} OWNER TO postgres;
 REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC,anon,authenticated,service_role;`);
 if(isPublic){assert(readerAuthority.includes(signature),'retained hosted grant '+signature);
  await db.exec('GRANT EXECUTE ON FUNCTION '+signature+' TO anon,authenticated');}
}
export const modules=['01_state.sql','02_target.sql','03_reads.sql','04_actions.sql','05_search_ordinary_v1.sql',
 '06_search_ordinary_v2.sql','07_search_marketplace.sql','08_search_services.sql','09_public_profile.sql','10_legacy_search.sql','11_legacy_feed.sql','12_block_lookup_index.sql'];
export async function install(){for(const name of modules)await db.exec(source('supabase/repairs/20261113_provider_controls/'+name));}
export const snapshot=async()=>({...await previous.snapshot(),
 ...Object.fromEntries(await Promise.all(['public.user_blocks','public.conversations','public.conversation_participants','public.messages',
  'service_publication_private.activity','service_publication_private.activity_rollout'].map(async t=>[t,await all(t)])))});
export const get=(user,type,id)=>call(user,'get_my_provider_control_v1',[user,type,String(id)]);
export const list=(user,kind,limit=25,offset=0)=>call(user,'list_my_provider_controls_v1',[user,kind,limit,offset]);
export const action=(user,state,action,next=null)=>call(user,'set_my_provider_control_v1',[
 user,state.target_type,state.target_id,action,state.target_token,
 action==='hide'||action==='unhide'?state.hide_revision:null,next,
 action==='block'||action==='unblock'?state.block_id:null,
 action==='block'||action==='unblock'?state.block_created_at:null]);
