import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as previous from '../../20261111_service_store_categories/tests/fixture.mjs';
export * from '../../20261111_service_store_categories/tests/fixture.mjs';
export const {db,root,actors,asActor,asRole,setIdentity,manage}=previous;
export const repair=path.join(root,'supabase/repairs/20261111_service_activity');
export const provenance=[...previous.provenance];
export function source(relative){const value=fs.readFileSync(path.join(root,relative),'utf8');
 provenance.push({path:relative,sha256:previous.sha(value)});return value;}
const prior=await previous.result(source('supabase/repairs/20261111_service_store_categories/apply.sql'));
assert.equal(prior.length,1);assert.equal(prior[0].state,'applied');
export const modules=['01_state.sql','02_owner_reads.sql','03_renewal.sql'];
export async function install(){for(const name of modules)await db.exec(source('supabase/repairs/20261111_service_activity/'+name));}
export const readActivity=(serviceId,user=actors.owner,identity=actors.ownerIdentity)=>
 previous.call(user,'get_my_service_activity_v1',[user,identity,serviceId]);
export const renew=(serviceId,deadline,user=actors.owner,identity=actors.ownerIdentity)=>
 previous.call(user,'renew_my_service_activity_v1',[user,identity,serviceId,deadline]);
export const ownerV2=(serviceId,user=actors.owner,identity=actors.ownerIdentity)=>
 previous.call(user,'get_my_service_publication_snapshot_v2',[user,identity,serviceId]);
export const listV2=(user=actors.owner,identity=actors.ownerIdentity,limit=200,offset=0)=>
 previous.call(user,'get_my_service_publications_v2',[user,identity,limit,offset]);
export const snapshot=async()=>({...await previous.snapshot(),serviceCategories:await previous.all('public.service_store_categories')});
