import { isUploadUuid, uploadRecord } from "../../../entities/listing/model/privatePublicationUpload";
import { normalizeListingPriceWire, type ListingPriceInput } from "../../../entities/listing/model/listingPriceInput";
export type FinalProblem = "input"|"configuration"|"unauthorized"|"context_changed"|"refused"|"outcome_unknown"|"response"|"aborted";
export class FinalError extends Error { constructor(readonly code:FinalProblem) {super("listing_final_"+code);this.name="FinalError";} }
export const fail=(code:FinalProblem):never=>{throw new FinalError(code);};
export function row(v:unknown,keys?:readonly string[]):Record<string,unknown> {try{return uploadRecord(v,keys);}catch{return fail("response");}}
export const isId=(v:unknown):v is string=>typeof v==="string" && v.length<=19 && (v.match(/^[1-9][0-9]*$/)?.[0]===v) && BigInt(v)<=BigInt("9223372036854775807");
export const isHash=(v:unknown):v is string=>typeof v==="string" && v.length===64 && /^[0-9a-f]+$/.test(v);
export type FinalCommand=Readonly<{expectedUserId:string;expectedIdentityId:string;attemptId:string;requestKey:string;expectedPrice:ListingPriceInput}>;
export function command(value:unknown):FinalCommand {
 const r=row(value,["expectedUserId","expectedIdentityId","attemptId","requestKey","expectedPrice"]);
 if(![r.expectedUserId,r.expectedIdentityId,r.attemptId,r.requestKey].every(v=>typeof v==="string"&&v.length===36&&isUploadUuid(v)))return fail("input");
 let price:ListingPriceInput;try{row(r.expectedPrice,["kind","amount","currency"]);price=normalizeListingPriceWire(r.expectedPrice);}catch{return fail("input");}
 return Object.freeze({...r,expectedPrice:Object.freeze(price)}) as FinalCommand;
}
export type FinalReceipt=Readonly<{schema_version:1;attempt_id:string;request_key:string;actor_user_id:string;identity_id:string;listing_id:string;
 state:"published"|"deleting"|"deleted";published_at:string;content_deleted:boolean;files_remaining:number;replayed?:boolean}>;
export function receipt(value:unknown,context:{identityId:string;attemptId?:string;userId?:string;requestKey?:string;listingId?:string},withReplay=false):FinalReceipt {
 const keys=["schema_version","attempt_id","request_key","actor_user_id","identity_id","listing_id","state","published_at","content_deleted","files_remaining"];
 if(withReplay)keys.push("replayed");const r=row(value,keys);
 if(r.schema_version!==1 || ![r.attempt_id,r.request_key,r.actor_user_id,r.identity_id].every(v=>typeof v==="string"&&v.length===36&&isUploadUuid(v)) ||
 r.identity_id!==context.identityId || (context.attemptId!==undefined&&r.attempt_id!==context.attemptId) ||
 (context.userId!==undefined&&r.actor_user_id!==context.userId) || (context.requestKey!==undefined&&r.request_key!==context.requestKey) ||
 !isId(r.listing_id) || (context.listingId!==undefined&&r.listing_id!==context.listingId) ||
 typeof r.published_at!=="string" || r.published_at.length!==27 || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(r.published_at) || (!Number.isFinite(Date.parse(r.published_at)) || new Date(r.published_at).toISOString()!==r.published_at.slice(0,23)+"Z") ||
 !Number.isSafeInteger(r.files_remaining)||Number(r.files_remaining)<0||Number(r.files_remaining)>20 ||
 !["published","deleting","deleted"].includes(String(r.state))|| typeof r.content_deleted!=="boolean"||
 (r.state==="published"?r.content_deleted:!r.content_deleted)|| (r.state==="deleted"&&r.files_remaining!==0)||
 (r.state==="deleting"&&r.files_remaining===0)||(withReplay&&typeof r.replayed!=="boolean")) return fail("response");
 return Object.freeze({...r}) as FinalReceipt;
}
export function confirmation(value:unknown,c:FinalCommand):string {
 const r=row(value,["schema_version","attempt_id","request_key","actor_user_id","identity_id","price","image_count","confirmation_sha256"]);
 if(r.schema_version!==1||r.attempt_id!==c.attemptId||r.request_key!==c.requestKey||r.actor_user_id!==c.expectedUserId||r.identity_id!==c.expectedIdentityId||
 !isHash(r.confirmation_sha256)||!Number.isSafeInteger(r.image_count)||Number(r.image_count)<0||Number(r.image_count)>10)return fail("response");
 let p:ListingPriceInput;try{row(r.price,["kind","amount","currency"]);p=normalizeListingPriceWire(r.price);}catch{return fail("response");}
 if(p.kind!==c.expectedPrice.kind||p.amount!==c.expectedPrice.amount||p.currency!==c.expectedPrice.currency)return fail("context_changed");
 return r.confirmation_sha256;
}
