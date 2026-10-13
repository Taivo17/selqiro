import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { isUploadUuid, publicationStorageOrigin, PrivateUploadError } from "../../../entities/listing/model/privatePublicationUpload";
import { PublicationImageError, type sanitizeListingImage } from "../images/sanitize.cjs";
import { WEB_IMAGE, WebImageError, webFail, copyWebCommand, copyWebBinding, copyWebIntent, copyWebReceipt,
  detachSanitizedImage, sameRecord, webRecord, webHash, type WebCommand, type WebReceipt, type WebIntent } from "./webImageContract";
import { readWebObjectBytes } from "./webObjectHttp";
export type WebImageResult = Readonly<{kind:"ready";receipt:WebReceipt}> |
  Readonly<{kind:"reconcile_same_slot";attemptId:string;slotId:string}>;
type Config = Readonly<{projectOrigin:string;publicKey:string;serviceKey:string}>;
let active = false; // One bounded binary/native operation per Node process, across factory instances.
/** Internal trusted composition; the production bridge supplies the EXISTING sanitizer.
 * There is NO caller-supplied path/URL, output buffer or 'verified' flag. No route calls this yet. */
export function createPrivateWebVerifier(config:Config, sanitizer:typeof sanitizeListingImage, fetcher:UploadFetch=fetch) {
  if(typeof window!=="undefined") return webFail("configuration");
  let origin:string;
  try { origin=publicationStorageOrigin(config.projectOrigin); } catch { return webFail("configuration"); }
  const {publicKey,serviceKey}=config;
  if(typeof sanitizer!=="function" || typeof fetcher!=="function") return webFail("configuration");
  for(const key of [publicKey,serviceKey]) if(typeof key!=="string" || !key || key.length>8192 || /\s/.test(key)) webFail("configuration");
  return async function verifyPrivateWebImage(accessToken:string,input:WebCommand,signal?:AbortSignal):Promise<WebImageResult> {
    const cmd=copyWebCommand(input);
    if(typeof accessToken!=="string" || !accessToken || accessToken.length>8192 || /\s/.test(accessToken)) return webFail("unauthorized");
    if(signal?.aborted) return webFail("aborted");
    if(active) return webFail("busy");
    active=true;
    const pending=():WebImageResult => Object.freeze({kind:"reconcile_same_slot",attemptId:cmd.attemptId,slotId:cmd.slotId});
    const userHeaders={apikey:publicKey,authorization:"Bearer "+accessToken,"content-type":"application/json"};
    const serviceHeaders={apikey:serviceKey,authorization:"Bearer "+serviceKey,"content-type":"application/json"};
    const args={p_expected_user_id:cmd.expectedUserId,p_expected_identity_id:cmd.expectedIdentityId,
      p_attempt_id:cmd.attemptId,p_slot_id:cmd.slotId};
    async function rpc(name:string,body:object):Promise<unknown> {
      const response=await privateUploadHttp(fetcher,origin+"/rest/v1/rpc/"+name,
        {method:"POST",headers:serviceHeaders,body:JSON.stringify(body)},{signal});
      if(response.status===401 || response.status===403) return webFail("unauthorized");
      if(response.status!==200) return webFail("outcome_unknown");
      return response.json;
    }
    try {
      const auth=await privateUploadHttp(fetcher,origin+"/auth/v1/user",{method:"GET",headers:userHeaders},{signal,responseBytes:65536});
      if(auth.status!==200) return webFail("unauthorized");
      if(webRecord(auth.json).id!==cmd.expectedUserId) return webFail("context_changed");
      const claim=webRecord(await rpc("claim_listing_web_image_v1",{...args,p_request_key:cmd.requestKey}),
        ["binding","state","process_allowed","claim_id","process_before_epoch","intent","receipt"]);
      const binding=copyWebBinding(claim.binding,cmd);
      if(typeof claim.process_allowed!=="boolean" || !Number.isSafeInteger(claim.process_before_epoch) || Number(claim.process_before_epoch)<1 ||
          (claim.process_allowed ? !isUploadUuid(claim.claim_id) : claim.claim_id!==null)) return webFail("invalid_response");
      let intent:WebIntent;
      if(claim.state==="ready") {
        if(claim.process_allowed) return webFail("invalid_response");
        intent=copyWebIntent(claim.intent,binding);
        return Object.freeze({kind:"ready",receipt:copyWebReceipt(claim.receipt,binding,intent)});
      }
      if(claim.receipt!==null) return webFail("invalid_response");
      if(claim.state==="processing") {
        if(claim.intent!==null) return webFail("invalid_response");
        if(!claim.process_allowed) return pending();
        const t=Math.floor(Date.now()/1000);
        if(Number(claim.process_before_epoch)<=t || Number(claim.process_before_epoch)>t+WEB_IMAGE.processSeconds+60) return webFail("write_window_expired");
        const source=await readWebObjectBytes(fetcher,origin+"/storage/v1/object/authenticated/"+binding.bucket_id+"/"+binding.source_path,
          serviceHeaders,binding.source_bytes,null,signal);
        if(source===null) return pending();
        if(source.length!==binding.source_bytes || webHash(source)!==binding.source_sha256) return webFail("source_mismatch");
        if(signal?.aborted) return webFail("aborted");
        let result;
        try { result=await sanitizer(source); } catch(error) {
          if(error instanceof PublicationImageError && (error.code.startsWith("image_processor_") || error.code==="image_processing_timeout"))
            return pending(); // Infrastructure failure is not evidence that the photo is invalid.
          return webFail("image_rejected");
        }
        // No Promise.race around native processing: existing supervisor kills its worker and
        // keeps its own busy lock until close. The outer binary lock is kept until await ends.
        const owned=detachSanitizedImage(result,binding); intent=owned.intent;
        if(signal?.aborted) return webFail("aborted");
        const prepared=webRecord(await rpc("prepare_listing_web_write_v1",{...args,p_job_id:binding.job_id,
          p_claim_id:claim.claim_id,p_intent:intent}),["binding","intent","write_allowed","write_before_epoch"]);
        if(!sameRecord(copyWebBinding(prepared.binding,cmd),binding) || !sameRecord(copyWebIntent(prepared.intent,binding),intent) ||
            typeof prepared.write_allowed!=="boolean" || !Number.isSafeInteger(prepared.write_before_epoch) || Number(prepared.write_before_epoch)<1) return webFail("invalid_response");
        if(prepared.write_allowed) {
          const now=Math.floor(Date.now()/1000);
          if(Number(prepared.write_before_epoch)<=now || Number(prepared.write_before_epoch)>now+WEB_IMAGE.sendSeconds+60) return webFail("write_window_expired");
          // Detach again at the external write boundary. The DB already retains its exact intent.
          const sent=Buffer.from(owned.bytes);
          if(sent.length!==intent.web_bytes || webHash(sent)!==intent.web_sha256) return webFail("invalid_response");
          const ack=await privateUploadHttp(fetcher,origin+"/storage/v1/object/"+binding.bucket_id+"/"+binding.web_path,
            {method:"POST",headers:{...serviceHeaders,"content-type":"image/webp","x-upsert":"false","cache-control":"no-store"},
              body:new Uint8Array(sent)},{signal,timeoutMs:WEB_IMAGE.transferTimeoutMs});
          if(ack.status!==200) return pending(); // 400/409/5xx: never overwrite or retry. New explicit call can read back.
        }
      } else if(claim.state==="prepared") {
        if(claim.process_allowed) return webFail("invalid_response");
        intent=copyWebIntent(claim.intent,binding); // Reconcile ONLY. No download of source, decode or POST.
      } else return webFail("invalid_response");
      const stored=await readWebObjectBytes(fetcher,origin+"/storage/v1/object/authenticated/"+binding.bucket_id+"/"+binding.web_path,
        serviceHeaders,intent.web_bytes,"image/webp",signal);
      if(stored===null) return pending();
      const observed=webHash(stored);
      if(stored.length!==intent.web_bytes || observed!==intent.web_sha256) return webFail("readback_mismatch");
      const ready=webRecord(await rpc("record_listing_web_ready_v1",{...args,p_job_id:binding.job_id,
        p_observed_sha256:observed,p_observed_bytes:stored.length}),["receipt"]);
      return Object.freeze({kind:"ready",receipt:copyWebReceipt(ready.receipt,binding,intent)});
    } catch(error) {
      if(error instanceof PrivateUploadError) {
        if(error.code==="outcome_unknown") return pending();
        return webFail(error.code==="aborted" ? "aborted" : "invalid_response");
      }
      if(error instanceof WebImageError) { if(error.code==="outcome_unknown") return pending(); throw error; }
      return webFail("invalid_response"); // Never echo raw HTTP/token/decoder errors.
    } finally { active=false; }
  };
}
