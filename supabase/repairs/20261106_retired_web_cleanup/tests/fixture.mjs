// New narrow retired-WEB SQL tests composed from accepted photo-removal declarations.
// Synthetic provider metadata is not live Storage deletion or native concurrency.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as base from '../../20261104_listing_photo_removal/tests/fixture.mjs';
export const {db,actors,asActor,asRole,withActorContext,fn,claim,record,removeSyntheticMetadata,accounting,
 seedCompletedListing,seal,gallery,remove,primary,completeSources}=base;
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
source('supabase/repairs/20261104_listing_photo_removal/tests/fixture.mjs');
await db.exec(source('supabase/repairs/20261104_listing_photo_removal/changes.sql'));
export const dependencyNames=[...new Set([...base.dependencyNames,'public.remove_my_managed_listing_image_v1'])];
export const webClaimSql='SELECT public.claim_listing_retired_web_cleanup_v1($1,$2,$3,$4) value';
export const webRecordSql='SELECT public.record_listing_retired_web_cleanup_v1($1,$2,$3,$4,$5,$6,$7) value';
export const webStatusSql='SELECT public.get_my_listing_retired_web_cleanup_v1($1,$2,$3,$4) value';
export async function webClaim(item,user=item.author,identity=item.identity,request=item.request){
 return (await asRole('service_role',webClaimSql,[user,identity,item.attempt,request])).rows[0].value;
}
export async function webRecord(item,work,result='deleted',user=item.author,identity=item.identity){
 return (await asRole('service_role',webRecordSql,[user,identity,item.attempt,item.request,work.object_id,work.work_key,result])).rows[0].value;
}
export async function webStatus(item,user=item.author,identity=item.identity,request=item.request){
 return (await asActor(user,webStatusSql,[user,identity,item.attempt,request])).rows[0].value;
}
export async function retire(item,ordinal=1){
 await completeSources(item);
 const before=await gallery(item);
 await remove(item,before.revision,ordinal);
 return item.web.find(o=>o.ordinal===ordinal);
}
export const fullyDeleted=async object=>(await db.query(
 'SELECT listing_publication_private.multipart_object_fully_deleted($1) value',[object.id])).rows[0].value;
