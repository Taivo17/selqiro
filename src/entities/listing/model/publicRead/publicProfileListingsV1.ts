/** Public viewed identity, not active-owner state. No API call, fallback or currency inference. */
import {ensure,record} from "./priceRead";
import {uuid} from "./publicDetailV1";
import {parsePublicSearchV2,type SearchPageV2} from "./publicSearchV2";
export type ProfileListingRequest = {sellerSlug:string;storeCategoryId:string|null;offset:number;limit:number};
export function parsePublicProfileListingsV1(value:unknown,request:ProfileListingRequest):SearchPageV2&{
  sellerSlug:string;storeCategoryId:string|null;profileAvailable:boolean
} {
  ensure(typeof request.sellerSlug==="string"&&request.sellerSlug.length>0
    &&Array.from(request.sellerSlug).length<=160&&request.sellerSlug===request.sellerSlug.replace(/^ +| +$/g,""));
  if(request.storeCategoryId!==null)uuid(request.storeCategoryId);
  const e=record(value,["schema_version","content_scope","seller_slug","profile_available","store_category_id","sort",
    "items","total_count","result_limit","result_offset","has_more","next_offset","window_limit_reached"]);
  ensure(e.schema_version===1&&e.content_scope==="public_profile_ordinary_listings");
  ensure(e.seller_slug===request.sellerSlug&&e.store_category_id===request.storeCategoryId);
  ensure(typeof e.profile_available==="boolean");
  // The card and pagination grammar is EXACTLY search v2. Reuse its strict validator;
  // this is not accepting a wrong external envelope or issuing a fallback network call.
  const page=parsePublicSearchV2({schema_version:2,content_scope:"ordinary_listings",sort:e.sort,
    items:e.items,total_count:e.total_count,result_limit:e.result_limit,result_offset:e.result_offset,
    has_more:e.has_more,next_offset:e.next_offset,window_limit_reached:e.window_limit_reached},request.offset,request.limit);
  ensure(e.profile_available||page.totalCount==="0");
  ensure(page.items.every(x=>x.sellerSlug===request.sellerSlug));
  return {...page,sellerSlug:request.sellerSlug,storeCategoryId:request.storeCategoryId,profileAvailable:e.profile_available};
}
