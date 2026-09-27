import { PUBLIC_SEARCH_PAGE_SIZE, PUBLIC_SEARCH_MAX_OFFSET } from "./publicSearch";

export type PublicSearchCard = {
  id: string; title: string; description: string | null; price: string | null; priceAmount: string | null;
  imageUrl: string | null; category: string | null; subcategory: string | null; detailCategory: string | null;
  condition: string | null; country: string | null; city: string | null;
  sellerName: string; createdAt: string;
};
export type PublicSearchPage = {
  items: PublicSearchCard[]; totalCount: string; offset: number;
  hasMore: boolean; nextOffset: number | null; windowLimitReached: boolean;
};
function check(value: unknown): asserts value {
  if (!value) throw new Error("Otsingu vastuse vorming ei sobi. Proovi uuesti.");
}
function record(value: unknown): Record<string, unknown> {
  check(value && typeof value === "object" && !Array.isArray(value)); return value as Record<string, unknown>;
}
function keys(row: Record<string, unknown>, expected: string[]) {
  check(Object.keys(row).length === expected.length && expected.every(k => Object.hasOwn(row, k)));
}
function text(value: unknown): string | null {
  check(value === null || typeof value === "string"); return value as string | null;
}
function decimal(value: unknown): string {
  check(typeof value === "string" && /^(0|[1-9]\d{0,18})$/.test(value));
  check(BigInt(value) <= BigInt("9223372036854775807")); return value;
}
function identifier(value: unknown): string {
  check(typeof value === "string" && /^(0|[1-9]\d{0,18}|-[1-9]\d{0,18})$/.test(value));
  check(BigInt(value) >= BigInt("-9223372036854775808") && BigInt(value) <= BigInt("9223372036854775807"));
  return value;
}
function image(value: unknown): string | null {
  const source = text(value);
  if (!source) return null;
  try {
    const url = new URL(source);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
function card(value: unknown): PublicSearchCard {
  const r = record(value);
  keys(r, ["content_type", "content_id", "title", "description_preview", "price", "price_amount", "currency",
    "category", "subcategory", "detail_category", "condition", "country", "city", "image_url", "seller_name",
    "seller_slug", "seller_avatar_url", "seller_type", "created_at"]);
  check(r.content_type === "listing" && r.currency === null);
  const amount = text(r.price_amount);
  check(amount === null || /^\d+(?:\.\d+)?$/.test(amount));
  const createdAt = text(r.created_at);
  check(createdAt !== null && Number.isFinite(Date.parse(createdAt)));
  text(r.seller_slug); text(r.seller_avatar_url);
  check(r.seller_type === "private" || r.seller_type === "business");
  return {id: identifier(r.content_id), title: text(r.title) || "Pealkirjata kuulutus",
    description: text(r.description_preview), price: text(r.price), priceAmount: amount,
    imageUrl: image(r.image_url), category: text(r.category), subcategory: text(r.subcategory),
    detailCategory: text(r.detail_category), condition: text(r.condition), country: text(r.country),
    city: text(r.city), sellerName: text(r.seller_name) || "Avaldaja", createdAt};
}
export function parsePublicSearchPage(value: unknown, requestedOffset: number): PublicSearchPage {
  const r = record(value);
  keys(r, ["schema_version", "content_scope", "sort", "items", "total_count", "result_limit", "result_offset",
    "has_more", "next_offset", "window_limit_reached"]);
  check(r.schema_version === 1 && r.content_scope === "ordinary_listings" && r.sort === "newest");
  check(Number.isInteger(requestedOffset) && requestedOffset >= 0 && requestedOffset <= PUBLIC_SEARCH_MAX_OFFSET);
  check(r.result_limit === PUBLIC_SEARCH_PAGE_SIZE && r.result_offset === requestedOffset && Array.isArray(r.items));
  const totalCount = decimal(r.total_count), total = BigInt(totalCount), offset = BigInt(requestedOffset);
  const remaining = total > offset ? total - offset : BigInt(0);
  const expectedItems = remaining > BigInt(PUBLIC_SEARCH_PAGE_SIZE) ? PUBLIC_SEARCH_PAGE_SIZE : Number(remaining);
  check(r.items.length === expectedItems);
  const more = total > offset + BigInt(PUBLIC_SEARCH_PAGE_SIZE);
  const next = requestedOffset + PUBLIC_SEARCH_PAGE_SIZE;
  const capped = more && next > PUBLIC_SEARCH_MAX_OFFSET;
  check(r.has_more === more && r.window_limit_reached === capped && r.next_offset === (more && !capped ? next : null));
  const items = r.items.map(card);
  check(new Set(items.map(i => i.id)).size === items.length);
  return {items, totalCount, offset: requestedOffset, hasMore: more,
    nextOffset: more && !capped ? next : null, windowLimitReached: capped};
}
