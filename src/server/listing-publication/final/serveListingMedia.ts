import {createHash} from "node:crypto";
import {privateUploadHttp,type UploadFetch} from "../../../entities/listing/api/privateUploadHttp";
import {isUploadUuid} from "../../../entities/listing/model/privatePublicationUpload";
import {readWebObjectBytes} from "../web/webObjectHttp";
import {serviceConfig,type WorkerConfig} from "./cleanupOne";
import {row,isHash,fail} from "./finalContract";
export type ListingMediaFailure = Readonly<{
 stage: "binding_request" | "binding_response" | "binding_absent" | "object_read" | "object_integrity"
  | "recheck_request" | "recheck_response" | "recheck_absent" | "binding_changed";
 status: number;
 databaseCode?: string;
}>;
/** Serves an authorized WEB image through the stable public or owner media route.
 * Never serves SOURCE, trusts metadata, caches, redirects or leaks a signed/private
 * Storage URL. Rechecks eligibility after I/O. */
export function createListingMediaHandler(config:WorkerConfig,fetcher:UploadFetch=fetch,owner?:{
 userId:string;identityId:string;accessToken:string;publicKey:string;
},onFailure?:(failure:ListingMediaFailure)=>void) {
 const {origin,headers}=serviceConfig(config);
 if(owner&&(!isUploadUuid(owner.userId)||!isUploadUuid(owner.identityId)||!owner.accessToken||!owner.publicKey))return fail("input");
 return async function serve(attemptId:string,ordinalText:string,signal?:AbortSignal):Promise<Response> {
  const out=(status:number,body:Uint8Array|null=null)=>new Response(body===null?null:new Uint8Array(body).buffer,{status,headers:{
   "Cache-Control":"private, no-store, max-age=0","Content-Type":body?"image/webp":"text/plain",
   "X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Cross-Origin-Resource-Policy":"same-origin"}});
  if(typeof attemptId!=="string"||attemptId.length!==36||!isUploadUuid(attemptId)||typeof ordinalText!=="string"||ordinalText.length!==1||!/^\d$/.test(ordinalText))return out(404);
  const ordinal=Number(ordinalText);
  let stage:ListingMediaFailure["stage"]="binding_request",reported=false;
  const report=(failure:ListingMediaFailure)=>{
   if(reported)return;reported=true;
   // Finite step/status only: never include tokens, paths, object data or RPC messages.
   try{onFailure?.(failure);}catch{/* Diagnostics cannot alter the media decision. */}
  };
  const get=async(recheck=false)=>{
   stage=recheck?"recheck_request":"binding_request";
   const res=await privateUploadHttp(fetcher,origin+"/rest/v1/rpc/"+(owner?"get_my_listing_media_binding_v2":"get_public_listing_media_binding_v1"),
    {method:"POST",headers:owner?{apikey:owner.publicKey,authorization:"Bearer "+owner.accessToken,"content-type":"application/json"}:headers,
     body:JSON.stringify({p_attempt_id:attemptId,p_ordinal:ordinal,...(owner?{p_expected_user_id:owner.userId,p_expected_identity_id:owner.identityId}:{})})},{signal});
   if(res.status!==200){
    const code=res.json&&typeof res.json==="object"&&!Array.isArray(res.json)?(res.json as Record<string,unknown>).code:null;
    const databaseCode=typeof code==="string"&&/^(?:[0-9A-Z]{5}|PGRST[0-9]{3})$/.test(code)?code:undefined;
    report({stage,status:res.status,...(databaseCode?{databaseCode}:{})});
    return fail("outcome_unknown");
   }
   if(res.json===null){report({stage:recheck?"recheck_absent":"binding_absent",status:404});return null;}
   stage=recheck?"recheck_response":"binding_response";
   const b=row(res.json,["schema_version","attempt_id","ordinal","bucket_id","object_path","sha256","bytes"]);
   if(b.schema_version!==1||b.attempt_id!==attemptId||b.ordinal!==ordinal||b.bucket_id!=="listing-publication-private"||
    typeof b.object_path!=="string"||!b.object_path.startsWith("v1/"+attemptId+"/")||
    b.object_path.match(/^v1\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/web-v1\.webp$/)?.[0]!==b.object_path||
    !isUploadUuid(b.object_path.split("/")[2])||!isHash(b.sha256)||!Number.isSafeInteger(b.bytes)||Number(b.bytes)<20||Number(b.bytes)>4*1024*1024)return fail("response");
   return b;
  };
  try {
   const binding=await get();if(binding===null)return out(404);
   stage="object_read";
   const bytes=await readWebObjectBytes(fetcher,origin+"/storage/v1/object/authenticated/"+binding.bucket_id+"/"+binding.object_path,
    headers,Number(binding.bytes),"image/webp",signal);
   if(bytes===null||bytes.length!==binding.bytes||createHash("sha256").update(bytes).digest("hex")!==binding.sha256){report({stage:"object_integrity",status:503});return out(503);}
   const after=await get(true);if(after===null)return out(404);
   if(Object.keys(binding).some(k=>binding[k]!==after[k])){report({stage:"binding_changed",status:503});return out(503);}
   return out(200,new Uint8Array(bytes));
  }catch{report({stage,status:503});return out(503);}
 };
}
