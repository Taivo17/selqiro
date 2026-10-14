import {createHash} from "node:crypto";
import {privateUploadHttp,type UploadFetch} from "../../../entities/listing/api/privateUploadHttp";
import {isUploadUuid} from "../../../entities/listing/model/privatePublicationUpload";
import {readWebObjectBytes} from "../web/webObjectHttp";
import {serviceConfig,type WorkerConfig} from "./cleanupOne";
import {row,isHash,fail} from "./finalContract";
/** Dormant handler for the stable /api/v2/listing-media/{attempt}/{ordinal} path.
 * No route is installed by this lab. Never serves SOURCE, trusts metadata, caches,
 * redirects or leaks a signed/private Storage URL. Rechecks eligibility after I/O. */
export function createListingMediaHandler(config:WorkerConfig,fetcher:UploadFetch=fetch) {
 const {origin,headers}=serviceConfig(config);
 return async function serve(attemptId:string,ordinalText:string,signal?:AbortSignal):Promise<Response> {
  const out=(status:number,body:Uint8Array|null=null)=>new Response(body===null?null:new Uint8Array(body).buffer,{status,headers:{
   "Cache-Control":"private, no-store, max-age=0","Content-Type":body?"image/webp":"text/plain",
   "X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Cross-Origin-Resource-Policy":"same-origin"}});
  if(typeof attemptId!=="string"||attemptId.length!==36||!isUploadUuid(attemptId)||typeof ordinalText!=="string"||ordinalText.length!==1||!/^\d$/.test(ordinalText))return out(404);
  const ordinal=Number(ordinalText);
  const get=async()=>{
   const res=await privateUploadHttp(fetcher,origin+"/rest/v1/rpc/get_public_listing_media_binding_v1",
    {method:"POST",headers,body:JSON.stringify({p_attempt_id:attemptId,p_ordinal:ordinal})},{signal});
   if(res.status!==200)return fail("outcome_unknown");if(res.json===null)return null;
   const b=row(res.json,["schema_version","attempt_id","ordinal","bucket_id","object_path","sha256","bytes"]);
   if(b.schema_version!==1||b.attempt_id!==attemptId||b.ordinal!==ordinal||b.bucket_id!=="listing-publication-private"||
    typeof b.object_path!=="string"||!b.object_path.startsWith("v1/"+attemptId+"/")||
    b.object_path.match(/^v1\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/web-v1\.webp$/)?.[0]!==b.object_path||
    !isUploadUuid(b.object_path.split("/")[2])||!isHash(b.sha256)||!Number.isSafeInteger(b.bytes)||Number(b.bytes)<20||Number(b.bytes)>4*1024*1024)return fail("response");
   return b;
  };
  try {
   const binding=await get();if(binding===null)return out(404);
   const bytes=await readWebObjectBytes(fetcher,origin+"/storage/v1/object/authenticated/"+binding.bucket_id+"/"+binding.object_path,
    headers,Number(binding.bytes),"image/webp",signal);
   if(bytes===null||bytes.length!==binding.bytes||createHash("sha256").update(bytes).digest("hex")!==binding.sha256)return out(503);
   const after=await get();if(after===null)return out(404);
   if(Object.keys(binding).some(k=>binding[k]!==after[k]))return out(503);
   return out(200,new Uint8Array(bytes));
  }catch{return out(503);}
 };
}
