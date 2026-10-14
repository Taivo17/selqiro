import { privateUploadHttp,type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { publicationStorageOrigin,isUploadUuid } from "../../../entities/listing/model/privatePublicationUpload";
import { readWebObjectBytes } from "../web/webObjectHttp";
import { row,fail } from "./finalContract";
export type WorkerConfig=Readonly<{projectOrigin:string;serviceKey:string}>;
export function serviceConfig(c:WorkerConfig):Readonly<{origin:string;headers:Record<string,string>}> {
 if(typeof window!=="undefined")return fail("configuration");let origin:string;
 try{origin=publicationStorageOrigin(c.projectOrigin);}catch{return fail("configuration");}
 if(typeof c.serviceKey!=="string"||!c.serviceKey||c.serviceKey.length>8192||/\s/.test(c.serviceKey))return fail("configuration");
 return Object.freeze({origin,headers:{apikey:c.serviceKey,authorization:"Bearer "+c.serviceKey,"content-type":"application/json"}});
}
/** ONE claimed immutable target per invocation. No listing/attempt enumeration, no
 * automatic retries, no expiry-based write settlement, no removal of active WEBs.
 * DB state persists leases/backoff/attempt limits. A lost claim response sends no DELETE. */
export function createCleanupOne(config:WorkerConfig,fetcher:UploadFetch=fetch) {
 const {origin,headers}=serviceConfig(config);
 return async function cleanupOne(signal?:AbortSignal):Promise<Readonly<{kind:"idle"|"deleted"|"retry_wait"|"needs_attention"|"reconcile"}>> {
  let task:Record<string,unknown>;
  const rpc=async(name:string,args:object)=>{
   const r=await privateUploadHttp(fetcher,origin+"/rest/v1/rpc/"+name,{method:"POST",headers,body:JSON.stringify(args)},{signal});
   if(r.status!==200)return fail("outcome_unknown");return r.json;
  };
  try {
   const claim=await rpc("claim_listing_cleanup_v1",{});if(claim===null)return Object.freeze({kind:"idle"});
   task=row(claim,["schema_version","object_id","work_key","bucket_id","object_path","try_count","lease_until_epoch"]);
   const path=task.object_path;
   if(task.schema_version!==1||![task.object_id,task.work_key].every(v=>typeof v==="string"&&v.length===36&&isUploadUuid(v))||
    task.bucket_id!=="listing-publication-private"||typeof path!=="string"||
    path.match(/^v1\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/(?:source\.upload|web-v1\.webp)$/)?.[0]!==path||
    !path.split("/").slice(1,3).every(isUploadUuid)||!Number.isSafeInteger(task.try_count)||Number(task.try_count)<1||Number(task.try_count)>8||
    !Number.isSafeInteger(task.lease_until_epoch)||Number(task.lease_until_epoch)<=Math.floor(Date.now()/1000)+55||
    Number(task.lease_until_epoch)>Math.floor(Date.now()/1000)+65)return fail("response");
  }catch{return Object.freeze({kind:"reconcile"});}
  let outcome="storage";
  try {
   const r=await privateUploadHttp(fetcher,origin+"/storage/v1/object/"+task.bucket_id,
    {method:"DELETE",headers,body:JSON.stringify({prefixes:[task.object_path]})},{signal,timeoutMs:10000});
   if(r.status===200&&Array.isArray(r.json)&&r.json.length<=1&&r.json.every(x=>row(x).name===task.object_path)) {
    // The claim proves the target cannot be reused and has no unsettled writers.
    // 404 is meaningful only at THIS boundary, after the confirmed claim and API delete.
    const bytes=await readWebObjectBytes(fetcher,origin+"/storage/v1/object/authenticated/"+task.bucket_id+"/"+task.object_path,
     headers,4*1024*1024,null,signal);
    outcome=bytes===null?"deleted":"response";
   }
  }catch{outcome=signal?.aborted?"timeout":"network";}
  try {
   const saved=row(await rpc("record_listing_cleanup_v1",{p_object_id:task.object_id,p_work_key:task.work_key,p_result:outcome}),["object_id","work_key","state"]);
   if(saved.object_id!==task.object_id||saved.work_key!==task.work_key||!["deleted","retry_wait","needs_attention"].includes(String(saved.state))||
    (saved.state==="deleted"&&outcome!=="deleted")||(outcome==="deleted"&&saved.state!=="deleted"))return fail("response");
   return Object.freeze({kind:saved.state as "deleted"|"retry_wait"|"needs_attention"});
  }catch{return Object.freeze({kind:"reconcile"});}
 };
}
