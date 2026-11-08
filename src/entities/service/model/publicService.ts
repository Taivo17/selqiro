import type { Language } from "../../../../lib/i18n/translations";
import { getCatalogTranslation, localeForLanguage } from "../../../../lib/i18n/useTranslation";
import { serviceEditorMessages } from "../../../features/service-editor/model/serviceEditorMessages";
import type { ServicePriceType } from "./types";

export const serviceUuid = (value: unknown): value is string => typeof value === "string"
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
  && value !== "00000000-0000-0000-0000-000000000000";

/** Only the managed public endpoint or this project's legacy service bucket.
 * Owner endpoints, signed object URLs and arbitrary remote trackers are never public service photos. */
export function serviceMediaUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 4096 || /[\u0000-\u0020\\]/.test(value)) return null;
  if (/^\/api\/v2\/service-media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9]$/.test(value) && serviceUuid(value.split("/")[4])) return value;
  try {
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || ""), url = new URL(value);
    if (project.protocol !== "https:" || url.protocol !== "https:" || url.origin !== project.origin
      || url.username || url.password || url.search || url.hash || !url.pathname.startsWith("/storage/v1/object/public/service-images/")) return null;
    return url.href;
  } catch { return null; }
}

export type PublicServiceOffer = Readonly<{
  id: string; identityId: string; title: string; description: string; category: string | null; subcategory: string | null;
  priceType: ServicePriceType; priceAmount: string | null; currency: string; country: string | null; city: string | null; location: string | null;
  images: readonly Readonly<{id: string; url: string}>[]; sellerName: string; sellerSlug: string | null; sellerType: "private" | "business";
  publishedAt: string; updatedAt: string;
}>;
export type ServiceSearchInput = Readonly<{query: string; category: string | null; subcategory: string | null; country: string | null; city: string | null}>;
export type PublicServicePage = Readonly<{
  items: readonly PublicServiceOffer[]; totalCount: string; limit: number; offset: number; hasMore: boolean; nextOffset: number | null;
}>;

function ensure(value: unknown): asserts value { if (!value) throw new Error("service_public_response_invalid"); }
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  ensure(value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype);
  ensure(Reflect.ownKeys(value).every(k => typeof k === "string")
    && Object.values(Object.getOwnPropertyDescriptors(value)).every(d => "value" in d && d.enumerable)
    && Object.keys(value).sort().join(",") === [...keys].sort().join(","));
  return value as Record<string, unknown>;
}
const nullableText = (value: unknown, max: number): value is string | null => value === null
  || typeof value === "string" && !value.includes("\0") && value.length <= max;
const instant = (value: unknown): value is string => typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value));

export function parsePublicService(value: unknown, serviceId?: string): PublicServiceOffer | null {
  if (value === null) return null;
  const row = record(value, ["schema_version", "content_type", "content_id", "identity_id", "title", "description", "category", "subcategory", "price_type", "price_amount", "currency", "country", "city", "location_label", "images", "seller_name", "seller_slug", "seller_type", "published_at", "updated_at"]);
  ensure(row.schema_version === 1 && row.content_type === "service" && serviceUuid(row.content_id) && (!serviceId || row.content_id === serviceId) && serviceUuid(row.identity_id));
  ensure(typeof row.title === "string" && row.title.trim().length >= 2 && row.title.length <= 140 && !row.title.includes("\0"));
  ensure(typeof row.description === "string" && row.description.length <= 5000 && !row.description.includes("\0"));
  ensure(nullableText(row.category, 120) && nullableText(row.subcategory, 160) && nullableText(row.country, 120)
    && nullableText(row.city, 160) && nullableText(row.location_label, 300));
  ensure(["fixed", "from", "hourly", "contact"].includes(row.price_type as string) && typeof row.currency === "string" && /^[A-Z]{3}$/.test(row.currency));
  ensure(row.price_amount === null || typeof row.price_amount === "string" && /^\d{1,10}(?:\.\d{1,2})?$/.test(row.price_amount));
  // Legacy published services may have a pricing mode without an amount. Read
  // that value faithfully; new publication completeness is checked by its writer.
  ensure(typeof row.seller_name === "string" && row.seller_name.length <= 200 && !row.seller_name.includes("\0")
    && nullableText(row.seller_slug, 200) && (row.seller_slug === null || /^[a-zA-Z0-9_-]+$/.test(row.seller_slug))
    && ["private", "business"].includes(row.seller_type as string) && instant(row.published_at) && instant(row.updated_at));
  ensure(Array.isArray(row.images) && row.images.length <= 10);
  const images = row.images.map(value => {
    const image = record(value, ["id", "url"]), url = serviceMediaUrl(image.url);
    ensure(serviceUuid(image.id) && url); return Object.freeze({id: image.id, url});
  });
  ensure(new Set(images.map(image => image.id)).size === images.length && new Set(images.map(image => image.url)).size === images.length);
  return Object.freeze({id: row.content_id, identityId: row.identity_id, title: row.title, description: row.description,
    category: row.category, subcategory: row.subcategory, priceType: row.price_type as ServicePriceType, priceAmount: row.price_amount as string | null,
    currency: row.currency, country: row.country, city: row.city, location: row.location_label, images: Object.freeze(images),
    sellerName: row.seller_name, sellerSlug: row.seller_slug, sellerType: row.seller_type as "private" | "business",
    publishedAt: row.published_at, updatedAt: row.updated_at});
}

export function parsePublicServicePage(value: unknown, expectedOffset: number, expectedLimit: number): PublicServicePage {
  const row = record(value, ["schema_version", "items", "total_count", "result_limit", "result_offset", "has_more", "next_offset"]);
  ensure(row.schema_version === 1 && row.result_offset === expectedOffset && row.result_limit === expectedLimit
    && Number.isSafeInteger(expectedOffset) && expectedOffset >= 0 && Number.isSafeInteger(expectedLimit) && expectedLimit > 0 && expectedLimit <= 100
    && typeof row.total_count === "string" && /^(0|[1-9]\d{0,18})$/.test(row.total_count)
    && Array.isArray(row.items) && row.items.length <= expectedLimit && typeof row.has_more === "boolean");
  const items = row.items.map(value => {const item = parsePublicService(value); ensure(item); return item;});
  ensure(new Set(items.map(item => item.id)).size === items.length);
  const count = BigInt(row.total_count), end = BigInt(expectedOffset + items.length);
  ensure(count >= BigInt(items.length) && (!items.length || count >= end));
  ensure(row.has_more ? items.length === expectedLimit && count > end && row.next_offset === expectedOffset + items.length
    : row.next_offset === null && (items.length ? count === end : count <= BigInt(expectedOffset)));
  return Object.freeze({items: Object.freeze(items), totalCount: row.total_count, limit: expectedLimit, offset: expectedOffset,
    hasMore: row.has_more, nextOffset: row.next_offset as number | null});
}

export function servicePriceLabel(service: {priceType: ServicePriceType; priceAmount: string | number | null; currency: string}, language: Language): string {
  const t = (key: "contactPrice" | "from" | "hourly", params?: {amount: string}) => getCatalogTranslation(language, serviceEditorMessages, key, params);
  if (service.priceType === "contact" || service.priceAmount === null) return t("contactPrice");
  const amount = new Intl.NumberFormat(localeForLanguage(language), {style: "currency", currency: service.currency, minimumFractionDigits: 0, maximumFractionDigits: 2}).format(Number(service.priceAmount));
  return service.priceType === "from" ? t("from", {amount}) : service.priceType === "hourly" ? t("hourly", {amount}) : amount;
}
export const serviceLocationLabel = (service: {city: string | null; country: string | null; location?: string | null}) =>
  [service.city || service.location, service.country].filter(Boolean).join(" · ");
