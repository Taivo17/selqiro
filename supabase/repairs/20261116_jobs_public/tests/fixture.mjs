// Local PostgreSQL/WASM only. Prior fixtures restore accepted declarations;
// their historical test suites and all remote services remain uncalled.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
// Seed one ordinary managed listing before the retained fixture seals its
// protections. The normal provider adapter and exact original seed helper are
// used; no deployed guard is disabled for the new test.
const inheritedModule=process.env.SELQIRO_PGLITE_MODULE;
process.env.SELQIRO_HORSE_PGLITE_BACKEND=inheritedModule||'@electric-sql/pglite';
process.env.SELQIRO_PGLITE_MODULE=new URL('../../20261108_horse_publication/tests/provider-pglite.mjs',import.meta.url).href;
const listingSeed=await import('../../20261104_listing_photo_removal/tests/fixture.mjs');
await listingSeed.db.query('UPDATE public.profiles SET active_identity_id=$2 WHERE id=$1',[listingSeed.actors.owner,listingSeed.actors.businessIdentity]);
export const ordinary=await listingSeed.seedCompletedListing('910001',{identity:listingSeed.actors.businessIdentity,author:listingSeed.actors.owner,count:1});
await listingSeed.db.query('UPDATE public.profiles SET active_identity_id=$2 WHERE id=$1',[listingSeed.actors.owner,listingSeed.actors.ownerIdentity]);
if(inheritedModule===undefined)delete process.env.SELQIRO_PGLITE_MODULE;else process.env.SELQIRO_PGLITE_MODULE=inheritedModule;
const prior=await import('../../20261114_block_removal_auth/tests/fixture.mjs');
import {modules,repair,sha} from './catalog.mjs';
export const {db,root,actors,asActor,asRole,call,setIdentity,authSnapshot,authBaseline,installerFacts}=prior;
export {modules,repair,sha};
export const provenance=[...prior.provenance];
export function source(relative){const bytes=fs.readFileSync(path.join(root,relative));
 provenance.push({path:relative,sha256:sha(bytes)});return bytes.toString('utf8');}
export const result=async sql=>(await db.exec(sql)).flatMap(x=>x.rows).filter(x=>x.result).map(x=>x.result);
const accepted=await result(source('supabase/repairs/20261114_block_removal_auth/apply.sql'));
assert.equal(accepted.length,1);assert.equal(accepted[0].state,'applied');
assert.deepEqual(await authSnapshot(),authBaseline);
export const baselineReceipt=accepted[0];
// The inherited media fixture omitted this baseline FK while restoring the
// conversation columns. Restore its exact declaration for real terminal-delete
// semantics; do not substitute a manual pointer reset for the FK behavior.
const baseline=source('supabase/migrations/20260722173530_baseline_20260722.sql');
const listingFk=baseline.match(/ALTER TABLE ONLY "public"\."conversations"\s+ADD CONSTRAINT "conversations_listing_id_fkey"[^;]+;/);
assert(listingFk&&listingFk[0].includes('ON DELETE SET NULL'));
await db.exec(listingFk[0]);
// RLS was enabled by the later contact fixture. Restore the two exact retained
// final-writer snapshot policies that its narrow declaration chain omitted.
const publicationCore=source('supabase/releases/listing-publication-hosted-preview-v1/20_publication_core.sql');
for(const table of ['conversations','messages']){
 const statement=publicationCore.split('\n').find(line=>line.startsWith('CREATE POLICY final_snapshot_scrub ON public.'+table+' '));
 assert(statement);await db.exec(statement);
}
// Earlier fixtures narrowed this synthetic policy seed to other content kinds.
// Complete the seed for job tests, then restore the retained immutable trigger.
// No production installer performs this setup or edits policy documents.
await db.exec('BEGIN;ALTER TABLE public.publication_policy_documents DISABLE TRIGGER trg_publication_policy_documents_version_immutable;');
try{
 await db.exec("UPDATE public.publication_policy_documents SET applies_to_content_types=array_append(applies_to_content_types,'job') WHERE policy_key='marketplace-general' AND NOT('job'=ANY(applies_to_content_types));");
 await db.exec('ALTER TABLE public.publication_policy_documents ENABLE TRIGGER trg_publication_policy_documents_version_immutable;COMMIT;');
}catch(error){await db.exec('ROLLBACK');throw error;}
export const jobsSources=()=>modules.map(name=>source('supabase/repairs/20261116_jobs_public/'+name)).join('\n');
export async function install(){await db.exec(jobsSources());}
export const snapshot=async()=>{
 const names=['public.listings','public.listing_images','public.services','public.service_images','public.horse_offers','public.horse_offer_images',
 'public.conversations','public.conversation_participants','public.messages','public.user_blocks','provider_controls_private.hidden_providers',
 'service_publication_private.activity','service_publication_private.thread_context','service_publication_private.message_cards',
 'horse_publication_private.thread_context','horse_publication_private.message_cards'];
 const out={};for(const name of names)out[name]=(await db.query('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),\'[]\'::jsonb) value FROM '+name+' t')).rows[0].value;
 return out;
};
