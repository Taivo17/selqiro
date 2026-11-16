import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as f from './fixture.mjs';
export {f};
export const a=f.actors;
export const id=()=>crypto.randomUUID();
export const json=value=>value;
export const content=overrides=>({title:'Synthetic warehouse coordinator',description:'Synthetic local fixture job. No actual vacancy.',category:'logistics',
 countryCode:'EE',city:'Paide',locationLabel:'Paide piirkond',workplaceType:'on_site',employmentType:'permanent',workingTime:'full_time',
 salaryMin:null,salaryMax:null,salaryCurrency:null,salaryPeriod:null,...overrides});
export const denied=async(operation,code='42501')=>assert.rejects(operation,error=>error.code===code);
export const rpc=(user,name,args)=>f.call(user,name,args);
export const publicRpc=async(name,args=[],user=null)=>user?rpc(user,name,args):(await f.asRole('anon',
 'SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') value',args)).rows[0].value;
export const ownerContext=[a.member,a.businessIdentity];
export const policies=async()=>{
 const r=await rpc(a.member,'get_my_job_policies_v1',ownerContext);
 return r.documents.map(d=>({documentId:d.documentId,version:d.version,contentHash:d.contentHash,accepted:true}));
};
export const save=(data=content(),key=id(),old=null,shown=[])=>rpc(a.member,'save_my_job_v1',
 [...ownerContext,key,old?.job_id??null,old?.edit_revision??null,data,shown]);
export const publish=async(draft,key=id(),shown=null)=>rpc(a.member,'publish_my_job_v1',
 [...ownerContext,key,draft.job_id,draft.edit_revision,shown??await policies()]);
export const makeJob=async(overrides={})=>(await publish((await save(content(overrides))).job)).job;
export const owner=idValue=>rpc(a.member,'get_my_job_v1',[...ownerContext,idValue]);
export const receipt=key=>rpc(a.member,'get_my_job_request_v1',[...ownerContext,key]);
export const status=(job,value,key=id())=>rpc(a.member,'set_my_job_status_v1',
 [...ownerContext,key,job.job_id,job.edit_revision,job.status,value]);
export const renew=(job,key=id())=>rpc(a.member,'renew_my_job_activity_v1',
 [...ownerContext,key,job.job_id,job.edit_revision,job.active_until]);
export const search=(limit=24,cursor=null,user=null,filters={})=>publicRpc('search_public_jobs_v1',[
 filters.query??'',filters.category??null,filters.countryCode??null,filters.city??null,filters.workplaceType??null,
 filters.employmentType??null,filters.workingTime??null,limit,cursor],user);
export const profile=(slug,limit=24,cursor=null,user=null)=>publicRpc('get_public_profile_jobs_v1',[slug,limit,cursor],user);
export const detail=(jobId,user=null)=>publicRpc('get_public_job_v1',[jobId],user);
export const control=async(user,type,target)=>rpc(user,'get_my_provider_control_v1',[user,type,String(target)]);
export const action=(user,state,operation,next=null)=>rpc(user,'set_my_provider_control_v1',[
 user,state.target_type,state.target_id,operation,state.target_token,
 operation==='hide'||operation==='unhide'?state.hide_revision:null,next,
 operation==='block'||operation==='unblock'?state.block_id:null,
 operation==='block'||operation==='unblock'?state.block_created_at:null]);
export async function business(){await f.setIdentity(a.member,a.businessIdentity);
 const r=(await f.db.query('SELECT slug FROM public.identity_profiles WHERE identity_id=$1',[a.businessIdentity])).rows;
 assert.equal(r.length,1);assert(r[0].slug);return r[0].slug;}
