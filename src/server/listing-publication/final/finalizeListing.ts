import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { publicationStorageOrigin } from "../../../entities/listing/model/privatePublicationUpload";
import { command,confirmation,receipt,row,fail,FinalError,isId,type FinalReceipt } from "./finalContract";
export type FinalConfig=Readonly<{projectOrigin:string;publicKey:string}>;
/** Dormant factory. One confirmed final RPC, no automatic retries/new attempt/image I/O.
 * All authorization and mutable policy/image/price checks are repeated transactionally in SQL. */
export function createFinalListingService(config:FinalConfig,fetcher:UploadFetch=fetch) {
 if(typeof window!=="undefined")return fail("configuration");
 let origin:string;try{origin=publicationStorageOrigin(config.projectOrigin);}catch{return fail("configuration");}
 if(typeof config.publicKey!=="string"||!config.publicKey||config.publicKey.length>8192||/\s/.test(config.publicKey)||typeof fetcher!=="function")return fail("configuration");
 const publicKey=config.publicKey;
 async function connect(token:string,userId:string,signal?:AbortSignal) {
  if(typeof token!=="string"||!token||token.length>8192||/\s/.test(token))return fail("unauthorized");
  if(signal?.aborted)return fail("aborted");
  const headers={apikey:publicKey,authorization:"Bearer "+token,"content-type":"application/json"};
  const auth=await privateUploadHttp(fetcher,origin+"/auth/v1/user",{method:"GET",headers},{signal,responseBytes:65536});
  if(auth.status!==200)return fail("unauthorized");if(row(auth.json).id!==userId)return fail("context_changed");
  return async(name:string,args:object)=>{
   const r=await privateUploadHttp(fetcher,origin+"/rest/v1/rpc/"+name,{method:"POST",headers,body:JSON.stringify(args)},{signal});
   if(r.status===401||r.status===403)return fail("unauthorized");
   if([400,404,409,422].includes(r.status))return fail("refused");
   if(r.status!==200)return fail("outcome_unknown");return r.json;
  };
 }
 return Object.freeze({
  async publish(accessToken:string,input:unknown,signal?:AbortSignal):Promise<FinalReceipt> {
   const c=command(input);const context={identityId:c.expectedIdentityId,attemptId:c.attemptId,userId:c.expectedUserId,requestKey:c.requestKey};
   try {
    const rpc=await connect(accessToken,c.expectedUserId,signal);
    const args={p_expected_user_id:c.expectedUserId,p_expected_identity_id:c.expectedIdentityId,p_attempt_id:c.attemptId};
    const r=row(await rpc("get_my_listing_publication_confirmation_v1",args));
    if(Object.keys(r).length===1&&Object.hasOwn(r,"receipt"))return receipt(r.receipt,context);
    row(r,["confirmation"]);const hash=confirmation(r.confirmation,c);
    return receipt(await rpc("publish_my_listing_v1",{...args,p_confirmation_sha256:hash}),context,true);
   }catch(e){if(e instanceof FinalError)throw e;return fail(signal?.aborted?"aborted":"outcome_unknown");}
  },
  async remove(accessToken:string,input:unknown,signal?:AbortSignal):Promise<FinalReceipt> {
   const v=row(input,["expectedUserId","expectedIdentityId","listingId"]);
   // Reuse the strict actor UUID command validation; no money decision is made for deletion.
   const c=command({expectedUserId:v.expectedUserId,expectedIdentityId:v.expectedIdentityId,attemptId:v.expectedUserId,requestKey:v.expectedUserId,
    expectedPrice:{kind:"unspecified",amount:null,currency:null}});
   if(!isId(v.listingId))return fail("input");
   try {
    const rpc=await connect(accessToken,c.expectedUserId,signal);
    return receipt(await rpc("delete_my_published_listing_v1",{p_expected_user_id:c.expectedUserId,p_expected_identity_id:c.expectedIdentityId,p_listing_id:v.listingId}),
     {identityId:c.expectedIdentityId,listingId:v.listingId});
   }catch(e){if(e instanceof FinalError)throw e;return fail(signal?.aborted?"aborted":"outcome_unknown");}
  }
 });
}
