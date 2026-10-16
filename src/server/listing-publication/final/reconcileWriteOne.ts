import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { isUploadUuid } from "../../../entities/listing/model/privatePublicationUpload";
import { readWebObjectBytes } from "../web/webObjectHttp";
import { webHash } from "../web/webImageContract";
import { serviceConfig, type WorkerConfig } from "./cleanupOne";
import { row, fail, isHash } from "./finalContract";

export type WriteReconcileResult = Readonly<{kind:"idle"|"settled"|"retry_wait"|"needs_attention"|"reconcile"}>;
const keys = ["schema_version","object_id","work_key","kind","attempt_id","slot_id","bucket_id","object_path",
  "expected_sha256","expected_bytes","storage_object_id","storage_version","lease_until_epoch","try_count"] as const;
/** One bounded cleanup-only reconciliation. Never signs, uploads, publishes or deletes.
 * SOURCE is eligible ONLY when the persisted signing claim never started and the
 * attempt is terminal. A reusable signed SOURCE capability is never reconciled here.
 * WEB requires a committed PRIMARY metadata row and matching full bytes, followed by
 * another database check of that same row/version. This is NOT a fabricated POST ACK.
 * Exclusive writers and provider write-before-metadata semantics remain rollout gates.
 */
export function createWriteReconcileOne(config:WorkerConfig, fetcher:UploadFetch=fetch) {
  const {origin,headers}=serviceConfig(config);
  if(typeof fetcher!=="function") return fail("configuration");
  return async function reconcileWriteOne(signal?:AbortSignal):Promise<WriteReconcileResult> {
    if(signal?.aborted) return Object.freeze({kind:"reconcile"});
    const rpc=async(name:string,args:object):Promise<unknown>=>{
      const r=await privateUploadHttp(fetcher,origin+"/rest/v1/rpc/"+name,
        {method:"POST",headers,body:JSON.stringify(args)},{signal});
      if(r.status!==200) return fail("outcome_unknown");
      return r.json;
    };
    let task:Record<string,unknown>;
    try {
      const value=await rpc("claim_listing_write_reconcile_v1",{});
      if(value===null) return Object.freeze({kind:"idle"});
      task=Object.freeze({...row(value,keys)});
      const now=Math.floor(Date.now()/1000);
      if(task.schema_version!==1 || ![task.object_id,task.work_key,task.attempt_id,task.slot_id].every(isUploadUuid) ||
        !["source_unsigned","web_commit"].includes(String(task.kind)) || task.bucket_id!=="listing-publication-private" ||
        task.object_path!==`v1/${task.attempt_id}/${task.slot_id}/${task.kind==="source_unsigned"?"source.upload":"web-v1.webp"}` ||
        !Number.isSafeInteger(task.try_count) || Number(task.try_count)<1 || Number(task.try_count)>8 ||
        !Number.isSafeInteger(task.lease_until_epoch) || Number(task.lease_until_epoch)<=now+55 || Number(task.lease_until_epoch)>now+65)
          return fail("response");
      if(task.kind==="source_unsigned") {
        if([task.expected_sha256,task.expected_bytes,task.storage_object_id,task.storage_version].some(x=>x!==null)) return fail("response");
      } else if(!isHash(task.expected_sha256) || !Number.isSafeInteger(task.expected_bytes) ||
        Number(task.expected_bytes)<20 || Number(task.expected_bytes)>4*1024*1024 ||
        !((task.storage_object_id===null && task.storage_version===null) ||
          (isUploadUuid(task.storage_object_id)&&isUploadUuid(task.storage_version)))) return fail("response");
    } catch { return Object.freeze({kind:"reconcile"}); }
    let outcome:"observed"|"not_visible"|"mismatch"|"transport"="observed";
    let observedHash:string|null=null, observedBytes:number|null=null;
    if(task.kind==="web_commit") {
      if(task.storage_object_id===null) outcome="not_visible"; // absence is NOT settlement, no speculative GET
      else try {
        const bytes=await readWebObjectBytes(fetcher,origin+"/storage/v1/object/authenticated/"+task.bucket_id+"/"+task.object_path,
          headers,Number(task.expected_bytes),"image/webp",signal);
        if(bytes===null) outcome="not_visible";
        else if(bytes.length!==task.expected_bytes || webHash(bytes)!==task.expected_sha256) outcome="mismatch";
        else { observedHash=webHash(bytes);observedBytes=bytes.length; }
      } catch { outcome="transport"; }
    }
    // No automatic retry on an uncertain claim or receipt; the database retains its
    // own lease/backoff/eight-attempt limit for a separate future worker invocation.
    try {
      const r=row(await rpc("record_listing_write_reconcile_v1",{
        p_object_id:task.object_id,p_work_key:task.work_key,p_outcome:outcome,
        p_storage_object_id:outcome==="observed"?task.storage_object_id:null,
        p_storage_version:outcome==="observed"?task.storage_version:null,
        p_observed_sha256:observedHash,p_observed_bytes:observedBytes,
      }),["object_id","work_key","state"]);
      if(r.object_id!==task.object_id || r.work_key!==task.work_key ||
        !["settled","retry_wait","needs_attention"].includes(String(r.state)) ||
        (r.state==="settled")!==(outcome==="observed")) return fail("response");
      return Object.freeze({kind:r.state as "settled"|"retry_wait"|"needs_attention"});
    } catch { return Object.freeze({kind:"reconcile"}); }
  };
}
