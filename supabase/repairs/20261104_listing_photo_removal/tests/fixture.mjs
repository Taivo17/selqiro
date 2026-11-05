// Focused SQL fixture, reusing exact accepted SOURCE/primary declarations only.
// Synthetic Storage metadata is not provider deletion or native concurrency evidence.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as base from '../../20261104_hosted_completed_source_cleanup/tests/fixture.mjs';
export const {db,actors,asActor,asRole,withActorContext,fn,claim,record,removeSyntheticMetadata,accounting}=base;
export const root=base.root;
export const here=path.dirname(fileURLToPath(import.meta.url));
export const repair=path.dirname(here);
export const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
export const provenance=[...base.provenance];
const pins=JSON.parse(read('source-pins.json'));
function source(relative){
 const bytes=fs.readFileSync(path.join(root,relative));
 const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 assert.equal(sha256,pins.inputs[relative],'retained source changed: '+relative);
 provenance.push({path:relative,sha256});return bytes.toString('utf8');
}
const core=source('supabase/releases/listing-publication-hosted-preview-v1/20_publication_core.sql');
const owner=source('supabase/releases/listing-publication-hosted-preview-v1/40_read_models_and_owner.sql');
const assembled=source('supabase/releases/listing-publication-hosted-preview-v1/release.sql');
const completed=source('supabase/repairs/20261104_hosted_completed_source_cleanup/changes.sql');
source('supabase/repairs/20261104_hosted_completed_source_cleanup/tests/fixture.mjs');
const additions=[
 [core,'listing_publication_private.guard_cleanup_web_fence'],
 [core,'public.get_public_listing_media_binding_v1'],
 [owner,'public.get_my_listing_media_binding_v2'],
 [owner,'public.get_my_managed_listing_v2']
];
for(const [sql,name] of additions)assert.equal(fn(sql,name),fn(assembled,name),'stale retained declaration: '+name);
export const dependencyNames=[...new Set([...base.dependencyNames,...additions.map(([,n])=>n),
 'listing_publication_private.protect_managed_image_presentation_v1',
 'listing_publication_private.require_managed_image_actor_v1',
 'listing_publication_private.validate_managed_image_intent_v1',
 'listing_publication_private.lock_managed_listing_images_v1',
 'public.get_my_managed_listing_images_v1','public.set_my_managed_listing_primary_image_v1',
 'listing_publication_private.hosted_completed_source_deleted_v1',
 'public.claim_listing_published_source_cleanup_v1','public.record_listing_published_source_cleanup_v1'])];
await db.exec(completed+'\n'+additions.map(([sql,n])=>fn(sql,n)).join('\n')+`
 REVOKE ALL ON FUNCTION listing_publication_private.guard_cleanup_web_fence(),
  public.get_public_listing_media_binding_v1(uuid,integer),
  public.get_my_listing_media_binding_v2(uuid,uuid,uuid,integer),
  public.get_my_managed_listing_v2(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
 GRANT EXECUTE ON FUNCTION listing_publication_private.guard_cleanup_web_fence() TO selqiro_listing_final_writer_v1;
 GRANT EXECUTE ON FUNCTION public.get_public_listing_media_binding_v1(uuid,integer) TO service_role;
 GRANT EXECUTE ON FUNCTION public.get_my_listing_media_binding_v2(uuid,uuid,uuid,integer),
  public.get_my_managed_listing_v2(uuid,uuid,text) TO authenticated;
`);
export async function seedCompletedListing(id,options={}){
 const item=await base.seedCompletedListing(id,options);
 if(item.author!==actors.outsider)await withActorContext(item.author,
  ()=>db.query("UPDATE public.listings SET active_until=clock_timestamp()+interval '1 day' WHERE id=$1",[id]));
 const slots=(await db.query('SELECT id,ordinal FROM listing_publication_private.slots WHERE attempt_id=$1',[item.attempt])).rows;
 for(const kind of ['source','web'])for(const object of item[kind]??[])object.ordinal=slots.find(s=>s.id===object.slot_id).ordinal;
 return item;
}
export async function seal(){
 await base.seal();
 const at=core.indexOf('CREATE TRIGGER guard_cleanup_web_fence ');assert(at>=0);
 await db.exec(core.slice(at,core.indexOf(';',at)+1));
}
export const gallery=async(item,user=item.author)=>(await asActor(user,
 'SELECT public.get_my_managed_listing_images_v1($1,$2,$3,$4) value',[user,item.identity,item.id,item.attempt])).rows[0].value;
export const remove=async(item,revision,ordinal,user=item.author)=>(await asActor(user,
 'SELECT public.remove_my_managed_listing_image_v1($1,$2,$3,$4,$5,$6) value',
 [user,item.identity,item.id,item.attempt,revision,ordinal])).rows[0].value;
export const primary=async(item,revision,ordinal,user=item.author)=>(await asActor(user,
 'SELECT public.set_my_managed_listing_primary_image_v1($1,$2,$3,$4,$5,$6) value',
 [user,item.identity,item.id,item.attempt,revision,ordinal])).rows[0].value;
export async function completeSources(item){
 const saved=[];
 for(let n=0;n<10;n++){
  const work=await claim(item);if(work===null)break;
  const object=item.source.find(o=>o.id===work.object_id);assert(object);
  await removeSyntheticMetadata(object);await record(item,work);saved.push(work);
 }
 assert.equal((await accounting(item)).receipt.files_remaining,0);return saved;
}
