/** Closed candidate: public read only, not an owner/editor snapshot or UI integration. */
import {ensure, record, text, listingId, parsePriceRead, type PriceRead} from "./priceRead";
export type PublicImage = {id:string;thumb_url:string|null;medium_url:string|null;original_url:string|null;
  is_primary:boolean|null;sort_order:number|null};
export type DetailField = {key:string;label:string;value:string};
export type PublicDetail = {
  content_type:"listing";content_id:string;title:string|null;description:string|null;
  title_truncated:boolean;description_truncated:boolean;price:PriceRead;
  category:string|null;subcategory:string|null;detail_category:string|null;condition:string|null;
  country:string|null;city:string|null;image_url:string|null;images:PublicImage[];images_has_more:boolean;
  details:DetailField[];details_truncated:boolean;seller_name:string|null;seller_slug:string|null;
  seller_avatar_url:string|null;seller_type:"private"|"business";created_at:string;active_until:string|null;
};
export function uuid(value:unknown):string {
  ensure(typeof value==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value));
  return value;
}
function bounded(value:unknown,limit:number):string|null {
  const s=text(value);ensure(s===null || Array.from(s).length<=limit);return s;
}
function bool(value:unknown):boolean {ensure(typeof value==="boolean");return value;}
function date(value:unknown,nullable:boolean):string|null {
  const s=text(value);ensure(s===null?nullable:Number.isFinite(Date.parse(s)));return s;
}
function imageUrl(value:unknown):string|null {
  const s=text(value);if(!s)return null;
  try {const u=new URL(s);return (u.protocol==="https:"||u.protocol==="http:")&&!u.username&&!u.password?u.href:null;}
  catch{return null;}
}
function image(value:unknown):PublicImage {
  const r=record(value,["id","thumb_url","medium_url","original_url","is_primary","sort_order"]);
  ensure(r.is_primary===null||typeof r.is_primary==="boolean");
  ensure(r.sort_order===null||(typeof r.sort_order==="number"&&Number.isInteger(r.sort_order)
    &&r.sort_order>=-2147483648&&r.sort_order<=2147483647));
  return {id:uuid(r.id),thumb_url:imageUrl(r.thumb_url),medium_url:imageUrl(r.medium_url),
    original_url:imageUrl(r.original_url),is_primary:r.is_primary,sort_order:r.sort_order};
}
function field(value:unknown):DetailField {
  const r=record(value,["key","label","value"]);
  ensure(typeof r.key==="string"&&/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(r.key));
  const label=bounded(r.label,160),v=bounded(r.value,1000);
  ensure(label!==null&&label!==""&&v!==null&&v!=="");return {key:r.key,label,value:v};
}
export function parsePublicDetailV1(value:unknown,requestedId:string):{requestedId:string;item:PublicDetail|null} {
  listingId(requestedId);
  const e=record(value,["schema_version","content_scope","requested_id","item"]);
  ensure(e.schema_version===1&&e.content_scope==="public_ordinary_listing_detail"&&e.requested_id===requestedId);
  if(e.item===null)return {requestedId,item:null};
  const r=record(e.item,["content_type","content_id","title","description","title_truncated","description_truncated",
    "price","category","subcategory","detail_category","condition","country","city","image_url","images",
    "images_has_more","details","details_truncated","seller_name","seller_slug","seller_avatar_url","seller_type","created_at","active_until"]);
  ensure(r.content_type==="listing"&&listingId(r.content_id)===requestedId);
  ensure(r.seller_type==="private"||r.seller_type==="business");
  ensure(Array.isArray(r.images)&&r.images.length<=10);const images=r.images.map(image);
  ensure(new Set(images.map(x=>x.id)).size===images.length);
  const imagesMore=bool(r.images_has_more);ensure(!imagesMore||images.length===10);
  ensure(Array.isArray(r.details)&&r.details.length<=32);const details=r.details.map(field);
  ensure(new Set(details.map(x=>x.key)).size===details.length);
  const created=date(r.created_at,false);ensure(created!==null);
  return {requestedId,item:{content_type:"listing",content_id:requestedId,title:bounded(r.title,4096),
    description:bounded(r.description,32768),title_truncated:bool(r.title_truncated),
    description_truncated:bool(r.description_truncated),price:parsePriceRead(r.price),category:text(r.category),
    subcategory:text(r.subcategory),detail_category:text(r.detail_category),condition:text(r.condition),
    country:text(r.country),city:text(r.city),image_url:imageUrl(r.image_url),images,images_has_more:imagesMore,
    details,details_truncated:bool(r.details_truncated),seller_name:text(r.seller_name),seller_slug:text(r.seller_slug),
    seller_avatar_url:imageUrl(r.seller_avatar_url),seller_type:r.seller_type,created_at:created,active_until:date(r.active_until,true)}};
}
