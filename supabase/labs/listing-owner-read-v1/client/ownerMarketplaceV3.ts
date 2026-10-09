/** Future owner list contract ONLY. Not imported by the live UI and not an edit payload. */
import { ensure, record, text, listingId } from "./priceRead";
import { parseOwnerMoney, uuid, type OwnerMoney } from "./ownerMoney";
export type OwnerReadContext = { actorId: string; identityId: string };
export type OwnerReadInput = { limit?: number; offset?: number; status?: string; search?: string; storeCategoryId?: string | null };
export type OwnerReadRequest = {
  p_expected_identity_id: string; p_result_limit: number; p_result_offset: number;
  p_status_filter: string; p_search_query: string; p_store_category_filter: string | null;
};
export function ownerReadRequest(context: OwnerReadContext, input: OwnerReadInput = {}): OwnerReadRequest {
  uuid(context.actorId); const identity = uuid(context.identityId);
  const limit = input.limit === undefined ? 30 : input.limit;
  const offset = input.offset === undefined ? 0 : input.offset;
  ensure(Number.isInteger(limit) && limit >= 1 && limit <= 100);
  ensure(Number.isInteger(offset) && offset >= 0 && offset <= 100000);
  const status = input.status === undefined ? "all" : input.status;
  const search = input.search === undefined ? "" : input.search;
  ensure(typeof status === "string" && typeof search === "string");
  const s = status.trim().toLowerCase() || "all", q = search.trim();
  ensure(Array.from(s).length <= 40 && Array.from(q).length <= 200 && !s.includes("\0") && !q.includes("\0"));
  const category = input.storeCategoryId == null ? null : uuid(input.storeCategoryId);
  return { p_expected_identity_id: identity, p_result_limit: limit, p_result_offset: offset,
    p_status_filter: s, p_search_query: q, p_store_category_filter: category };
}
export type OwnerReadItem = {
  content_type: "listing" | "horse_offer"; content_id: string; identity_id: string;
  source_status: string | null; lifecycle_status: string | null; content_variant: string | null;
  title: string; title_truncated: boolean; description_excerpt: string; description_truncated: boolean;
  image_url: string | null; category: string | null; subcategory: string | null; condition: string | null;
  city: string | null; region: string | null; location_label: string | null;
  active_until: string | null; published_at: string | null; created_at: string; sort_at: string;
  money: OwnerMoney;
};
export type OwnerReadPage = {
  schema_version: 3; actor_id: string; identity_id: string;
  result_limit: number; result_offset: number; has_more: boolean;
  next_offset: number | null; window_limit_reached: boolean; items: OwnerReadItem[];
};
const ITEM_FIELDS = ["content_type","content_id","identity_id","source_status","lifecycle_status","content_variant",
  "title","title_truncated","description_excerpt","description_truncated","image_url","category","subcategory","condition",
  "city","region","location_label","active_until","published_at","created_at","sort_at","money"];
function date(value: unknown, nullable: boolean): string | null {
  if (nullable && value === null) return null;
  ensure(typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value)));
  return value; // Validation only: preserve microseconds/zone exactly, no Date reserialization.
}
function excerpt(value: unknown, truncated: unknown): string {
  ensure(typeof value === "string" && typeof truncated === "boolean");
  const size = Array.from(value).length;
  ensure(size <= 512 && (!truncated || size === 512));
  return value;
}
function image(value: unknown): string | null {
  const s = text(value);
  if (s === null || s.trim() === "") return null;
  // Rejected URL schemes/credentials are never made into an img src.
  try {
    const u = new URL(s);
    return (u.protocol === "https:" || u.protocol === "http:") && !u.username && !u.password ? s : null;
  } catch { return null; }
}
function parseItem(value: unknown, identity: string): OwnerReadItem {
  const r = record(value, ITEM_FIELDS);
  ensure(r.content_type === "listing" || r.content_type === "horse_offer");
  const type = r.content_type;
  const id = type === "listing" ? listingId(r.content_id) : uuid(r.content_id);
  ensure(uuid(r.identity_id) === identity);
  const variant = text(r.content_variant);
  if (type === "listing") ensure(variant === null);
  else ensure(["sale","free_transfer","lease","co_rider","wanted"].includes(variant as string));
  const status = text(r.source_status), lifecycle = text(r.lifecycle_status);
  ensure(lifecycle === (type === "listing" && status === "sold" ? "closed" : type === "horse_offer" && status === "published" ? "active" : status));
  if (type === "horse_offer") ensure(status !== null && ["draft","published","held_for_review","paused","closed","rejected","archived"].includes(status));
  const category = text(r.category), subcategory = text(r.subcategory), condition = text(r.condition);
  const city = text(r.city), region = text(r.region), location = text(r.location_label);
  if (type === "horse_offer") ensure(category === null && subcategory === null && condition === null);
  if (variant === "wanted") ensure(city === null && region === null && location === null);
  return { content_type: type, content_id: id, identity_id: identity, source_status: status, lifecycle_status: lifecycle,
    content_variant: variant, title: excerpt(r.title,r.title_truncated), title_truncated: r.title_truncated as boolean,
    description_excerpt: excerpt(r.description_excerpt,r.description_truncated), description_truncated: r.description_truncated as boolean,
    image_url: image(r.image_url), category, subcategory, condition, city, region, location_label: location,
    active_until: date(r.active_until,true), published_at: date(r.published_at,true), created_at: date(r.created_at,false) as string,
    sort_at: date(r.sort_at,false) as string, money: parseOwnerMoney(r.money,type,variant) };
}
export function parseOwnerReadPage(value: unknown, context: OwnerReadContext, request: OwnerReadRequest): OwnerReadPage {
  const r = record(value,["schema_version","actor_id","identity_id","result_limit","result_offset","has_more","next_offset","window_limit_reached","items"]);
  ensure(r.schema_version === 3 && uuid(r.actor_id) === uuid(context.actorId) && uuid(r.identity_id) === uuid(context.identityId));
  const normalized = ownerReadRequest(context,{limit:request.p_result_limit,offset:request.p_result_offset,
    status:request.p_status_filter,search:request.p_search_query,storeCategoryId:request.p_store_category_filter});
  ensure(request.p_expected_identity_id === context.identityId && r.result_limit === normalized.p_result_limit && r.result_offset === normalized.p_result_offset);
  ensure(typeof r.has_more === "boolean" && typeof r.window_limit_reached === "boolean" && Array.isArray(r.items) && r.items.length <= normalized.p_result_limit);
  ensure(!r.has_more || r.items.length === normalized.p_result_limit);
  const next = normalized.p_result_offset + normalized.p_result_limit;
  const capped = r.has_more && next > 100000;
  ensure(r.window_limit_reached === capped && r.next_offset === (r.has_more && !capped ? next : null));
  const items = (r.items as unknown[]).map(v => parseItem(v,context.identityId));
  ensure(new Set(items.map(v => v.content_type+":"+v.content_id)).size === items.length);
  return { schema_version:3, actor_id:context.actorId, identity_id:context.identityId,
    result_limit:normalized.p_result_limit,result_offset:normalized.p_result_offset,has_more:r.has_more,
    next_offset:r.next_offset as number | null,window_limit_reached:capped,items };
}
