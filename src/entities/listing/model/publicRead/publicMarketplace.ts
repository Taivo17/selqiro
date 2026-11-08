import { ensure, record, text, unsignedBigint } from "./priceRead";
import { parsePublicSearchCardV2 } from "./publicSearchV2";
import { priceReadDisplay } from "./presentation";
import { HORSE_TYPES, horseMediaUrl, horseUuid, parseHorsePrice, type PublicHorseType } from "../../../horse-offer/model/publicHorse";
import type { PublicSearchCard, PublicSearchPage } from "../publicSearchResponse";

export function parsePublicMarketplace(value: unknown, offset: number, limit = 24): PublicSearchPage {
 const r = record(value, ["schema_version", "content_scope", "sort", "items", "total_count", "result_limit", "result_offset", "has_more", "next_offset", "window_limit_reached"]);
 ensure(r.schema_version === 1 && r.content_scope === "marketplace" && r.sort === "newest");
 ensure(Number.isInteger(offset) && offset >= 0 && offset <= 100000 && Number.isInteger(limit) && limit >= 1 && limit <= 60);
 ensure(r.result_offset === offset && r.result_limit === limit && Array.isArray(r.items));
 const totalCount = unsignedBigint(r.total_count), count = BigInt(totalCount), remaining = count > BigInt(offset) ? count - BigInt(offset) : BigInt(0);
 ensure(r.items.length === (remaining > BigInt(limit) ? limit : Number(remaining)));
 const hasMore = count > BigInt(offset + limit), capped = hasMore && offset + limit > 100000, nextOffset = hasMore && !capped ? offset + limit : null;
 ensure(r.has_more === hasMore && r.next_offset === nextOffset && r.window_limit_reached === capped);
 const items: PublicSearchCard[] = r.items.map(value => {
  const c = record(value, ["content_type", "content_id", "offer_type", "title", "description_preview", "price", "category", "subcategory",
   "detail_category", "condition", "country", "city", "image_url", "seller_name", "seller_slug", "seller_avatar_url", "seller_type", "created_at"]);
  if (c.content_type === "listing") {
   ensure(c.offer_type === null);
   const { offer_type: ignored, ...ordinary } = c; void ignored;
   const item = parsePublicSearchCardV2(ordinary);
   return { ...item, contentType: "listing", title: item.title || "", sellerName: item.sellerName || "", price: item.price.legacy_text,
    priceAmount: item.price.amount ?? item.price.legacy_amount, displayPrice: priceReadDisplay(item.price) };
  }
  ensure(c.content_type === "horse_offer" && horseUuid(c.content_id) && HORSE_TYPES.includes(c.offer_type as PublicHorseType));
  ensure(c.category === "horses" && c.subcategory === c.offer_type && c.detail_category === null && c.condition === null && c.country === "EE");
  ensure(c.image_url === null || horseMediaUrl(c.image_url));
  ensure(["private", "business"].includes(c.seller_type as string));
  const createdAt = text(c.created_at); ensure(createdAt && Number.isFinite(Date.parse(createdAt)));
  text(c.seller_slug); text(c.seller_avatar_url);
  return { id: c.content_id, contentType: "horse_offer", offerType: c.offer_type as PublicHorseType, title: text(c.title) || "",
   description: text(c.description_preview), price: null, priceAmount: null, horsePrice: parseHorsePrice(c.price, c.offer_type as PublicHorseType), imageUrl: horseMediaUrl(c.image_url),
   category: "horses", subcategory: c.offer_type as string, detailCategory: null, condition: null, country: "EE", city: text(c.city),
   sellerName: text(c.seller_name) || "", createdAt };
 });
 ensure(new Set(items.map(i => i.contentType + ":" + i.id)).size === items.length);
 return { items, totalCount, offset, hasMore, nextOffset, windowLimitReached: capped };
}
