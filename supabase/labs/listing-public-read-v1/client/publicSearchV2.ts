/** Not imported by the running application. Activate only after coordinated rollout. */
import {ensure, record, text, unsignedBigint, listingId, parsePriceRead, type PriceRead} from "./priceRead";
export type SearchCardV2 = {
  id: string; title: string | null; description: string | null; price: PriceRead;
  category: string | null; subcategory: string | null; detailCategory: string | null;
  condition: string | null; country: string | null; city: string | null;
  imageUrl: string | null; sellerName: string | null; sellerSlug: string | null;
  sellerAvatarUrl: string | null; sellerType: "private" | "business"; createdAt: string;
};
export type SearchPageV2 = {
  items: SearchCardV2[]; totalCount: string; limit: number; offset: number;
  hasMore: boolean; nextOffset: number | null; windowLimitReached: boolean;
};
function safeImage(value: unknown): string | null {
  const source = text(value);
  if (!source) return null;
  try {
    const url = new URL(source);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
function card(value: unknown): SearchCardV2 {
  const r = record(value, ["content_type", "content_id", "title", "description_preview", "price",
    "category", "subcategory", "detail_category", "condition", "country", "city", "image_url",
    "seller_name", "seller_slug", "seller_avatar_url", "seller_type", "created_at"]);
  ensure(r.content_type === "listing");
  ensure(r.seller_type === "private" || r.seller_type === "business");
  const createdAt = text(r.created_at);
  ensure(createdAt !== null && Number.isFinite(Date.parse(createdAt)));
  return {id: listingId(r.content_id), title: text(r.title), description: text(r.description_preview),
    price: parsePriceRead(r.price), category: text(r.category), subcategory: text(r.subcategory),
    detailCategory: text(r.detail_category), condition: text(r.condition), country: text(r.country),
    city: text(r.city), imageUrl: safeImage(r.image_url), sellerName: text(r.seller_name),
    sellerSlug: text(r.seller_slug), sellerAvatarUrl: safeImage(r.seller_avatar_url),
    sellerType: r.seller_type, createdAt};
}
export function parsePublicSearchV2(value: unknown, requestedOffset: number, requestedLimit = 24): SearchPageV2 {
  const r = record(value, ["schema_version", "content_scope", "sort", "items", "total_count", "result_limit",
    "result_offset", "has_more", "next_offset", "window_limit_reached"]);
  ensure(r.schema_version === 2 && r.content_scope === "ordinary_listings" && r.sort === "newest");
  ensure(Number.isInteger(requestedOffset) && requestedOffset >= 0 && requestedOffset <= 100000);
  ensure(Number.isInteger(requestedLimit) && requestedLimit >= 1 && requestedLimit <= 60);
  ensure(r.result_offset === requestedOffset && r.result_limit === requestedLimit && Array.isArray(r.items));
  const totalCount = unsignedBigint(r.total_count), total = BigInt(totalCount);
  const offset = BigInt(requestedOffset), limit = BigInt(requestedLimit);
  const remaining = total > offset ? total - offset : BigInt(0);
  const expectedCount = remaining > limit ? requestedLimit : Number(remaining); // <= 60, never a price
  ensure(r.items.length === expectedCount);
  const more = total > offset + limit, capped = more && requestedOffset + requestedLimit > 100000;
  const next = more && !capped ? requestedOffset + requestedLimit : null;
  ensure(r.has_more === more && r.next_offset === next && r.window_limit_reached === capped);
  const items = r.items.map(card);
  ensure(new Set(items.map(i => i.id)).size === items.length);
  return {items, totalCount, limit: requestedLimit, offset: requestedOffset,
    hasMore: more, nextOffset: next, windowLimitReached: capped};
}
