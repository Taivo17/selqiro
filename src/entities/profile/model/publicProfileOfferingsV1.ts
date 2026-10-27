/** Public profile read contracts. These never infer ownership or retry as another viewer. */
import {
  getPublicServiceImageUrl,
  type PublicService,
} from "../../service/model/public";
import {
  SERVICE_PRICE_TYPES,
  type ServicePriceType,
} from "../../service/model/types";
import {
  getPublicProductShowcaseImageUrl,
  type PublicProductShowcase,
} from "../../product-showcase/model/public";

export type PublicProfileOfferingsRequest = {
  identityId: string;
  sellerSlug: string;
  limit: number;
};

type Row = Record<string, unknown>;
type Stamp = { value: string; order: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ENVELOPE_KEYS = [
  "schema_version", "content_scope", "seller_slug", "identity_id",
  "profile_available", "result_limit", "read_at", "items",
] as const;
const SERVICE_KEYS = [
  "id", "identity_id", "title", "description", "category", "subcategory",
  "image_url", "price_amount", "currency", "price_type", "country", "city",
  "location", "status", "sort_order", "published_at", "created_at", "updated_at", "images",
] as const;
const SHOWCASE_KEYS = [
  "id", "identity_id", "title", "description", "category", "status", "sort_order",
  "published_at", "active_until", "created_at", "updated_at", "images",
] as const;
const IMAGE_KEYS = [
  "id", "identity_id", "original_url", "medium_url", "thumb_url",
  "sort_order", "is_primary", "created_at",
] as const;

function ensure(condition: unknown): asserts condition {
  if (!condition) {
    throw new Error("Avaliku profiili andmeid ei saanud kontrollida. Proovi uuesti.");
  }
}

function record(value: unknown, keys: readonly string[]): Row {
  ensure(value !== null && typeof value === "object" && !Array.isArray(value));
  const row = value as Row;
  ensure(Object.keys(row).length === keys.length
    && keys.every(key => Object.prototype.hasOwnProperty.call(row, key)));
  return row;
}

function uuid(value: unknown): string {
  ensure(typeof value === "string" && UUID.test(value));
  return value;
}

function text(value: unknown, max: number, min = 0): string {
  ensure(typeof value === "string");
  const trimmed = value.trim();
  const length = Array.from(trimmed).length;
  ensure(length >= min && length <= max);
  return trimmed;
}

function optionalText(value: unknown, max: number): string | null {
  return value === null ? null : text(value, max, 1);
}

function sortOrder(value: unknown): number {
  ensure(typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2147483647);
  return value;
}

function stamp(value: unknown): Stamp {
  ensure(typeof value === "string");
  // PostgreSQL timestamptz is emitted in UTC with at most six fractional digits.
  // Compare the padded fraction, not Date's millisecond-rounded timestamp.
  const parts = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/.exec(value);
  ensure(parts);
  const parsed = new Date(parts[1] + "Z");
  ensure(Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 19) === parts[1]);
  return { value, order: parts[1] + "." + (parts[2] || "").padEnd(6, "0") };
}

function imageUrl(value: unknown): string {
  const clean = text(value, 2000, 1);
  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    throw new Error("Avaliku profiili andmeid ei saanud kontrollida. Proovi uuesti.");
  }
  ensure((parsed.protocol === "http:" || parsed.protocol === "https:")
    && !parsed.username && !parsed.password);
  return parsed.toString();
}

function optionalImageUrl(value: unknown): string | null {
  return value === null ? null : imageUrl(value);
}

/** Validate before dispatch, so an absent viewed slug cannot become an unscoped read. */
export function publicProfileOfferingsRequest(input: {
  identityId: string;
  sellerSlug: unknown;
  limit: number;
}): PublicProfileOfferingsRequest {
  const identityId = uuid(input.identityId);
  ensure(typeof input.sellerSlug === "string" && input.sellerSlug.length > 0
    && Array.from(input.sellerSlug).length <= 160
    && input.sellerSlug === input.sellerSlug.replace(/^ +| +$/g, ""));
  ensure(Number.isInteger(input.limit) && input.limit >= 1 && input.limit <= 80);
  return { identityId, sellerSlug: input.sellerSlug, limit: input.limit };
}

function envelope(value: unknown, request: PublicProfileOfferingsRequest, scope: string) {
  publicProfileOfferingsRequest(request);
  const row = record(value, ENVELOPE_KEYS);
  ensure(row.schema_version === 1 && row.content_scope === scope
    && row.seller_slug === request.sellerSlug && row.result_limit === request.limit
    && typeof row.profile_available === "boolean");
  const readAt = stamp(row.read_at);
  ensure(Array.isArray(row.items) && row.items.length <= request.limit);
  if (row.profile_available) {
    ensure(uuid(row.identity_id) === request.identityId);
  } else {
    ensure(row.identity_id === null && row.items.length === 0);
  }
  return { items: row.items as unknown[], readAt };
}

function parent(row: Row, request: PublicProfileOfferingsRequest, seen: Set<string>) {
  const id = uuid(row.id);
  ensure(!seen.has(id) && uuid(row.identity_id) === request.identityId && row.status === "published");
  seen.add(id);
  return {
    id,
    identityId: request.identityId,
    title: text(row.title, 140, 2),
    description: text(row.description, 5000),
    category: optionalText(row.category, 120),
    status: "published" as const,
    sortOrder: sortOrder(row.sort_order),
    publishedAt: stamp(row.published_at).value,
    createdAt: stamp(row.created_at).value,
    updatedAt: stamp(row.updated_at).value,
  };
}

function images(
  value: unknown,
  parentKey: "service_id" | "showcase_id",
  parentId: string,
  identityId: string,
  seen: Set<string>
) {
  ensure(Array.isArray(value) && value.length <= 10);
  let primaryCount = 0;
  return value.map(raw => {
    const row = record(raw, [...IMAGE_KEYS, parentKey]);
    const id = uuid(row.id);
    ensure(!seen.has(id) && uuid(row[parentKey]) === parentId && uuid(row.identity_id) === identityId);
    seen.add(id);
    ensure(typeof row.is_primary === "boolean");
    if (row.is_primary) primaryCount++;
    ensure(primaryCount <= 1);
    return {
      id,
      originalUrl: imageUrl(row.original_url),
      mediumUrl: optionalImageUrl(row.medium_url),
      thumbUrl: optionalImageUrl(row.thumb_url),
      sortOrder: sortOrder(row.sort_order),
      isPrimary: row.is_primary,
      createdAt: stamp(row.created_at).value,
    };
  });
}

function serviceAmount(value: unknown): number | null {
  if (value === null) return null;
  ensure(typeof value === "string" && /^(0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/.test(value));
  const amount = Number(value);
  ensure(Number.isFinite(amount) && amount <= 9999999999.99);
  return amount;
}

export function parsePublicProfileServicesV1(
  value: unknown,
  request: PublicProfileOfferingsRequest
): PublicService[] {
  const result = envelope(value, request, "public_profile_services");
  const seenParents = new Set<string>();
  const seenImages = new Set<string>();
  return result.items.map(raw => {
    const row = record(raw, SERVICE_KEYS);
    const base = parent(row, request, seenParents);
    const gallery = images(row.images, "service_id", base.id, request.identityId, seenImages)
      .map(image => ({ ...image, serviceId: base.id }));
    ensure(typeof row.currency === "string" && /^[A-Z]{3}$/.test(row.currency));
    ensure(typeof row.price_type === "string" && SERVICE_PRICE_TYPES.includes(row.price_type as ServicePriceType));
    const fallbackImage = optionalImageUrl(row.image_url);
    return {
      ...base,
      subcategory: optionalText(row.subcategory, 160),
      imageUrl: gallery.length ? getPublicServiceImageUrl(gallery[0]) : fallbackImage,
      images: gallery,
      priceAmount: serviceAmount(row.price_amount),
      currency: row.currency,
      priceType: row.price_type as ServicePriceType,
      country: optionalText(row.country, 120),
      city: optionalText(row.city, 160),
      location: optionalText(row.location, 300),
    };
  });
}

export function parsePublicProfileShowcasesV1(
  value: unknown,
  request: PublicProfileOfferingsRequest
): PublicProductShowcase[] {
  const result = envelope(value, request, "public_profile_product_showcases");
  const seenParents = new Set<string>();
  const seenImages = new Set<string>();
  return result.items.map(raw => {
    const row = record(raw, SHOWCASE_KEYS);
    const base = parent(row, request, seenParents);
    const activeUntil = stamp(row.active_until);
    ensure(activeUntil.order > result.readAt.order);
    const gallery = images(row.images, "showcase_id", base.id, request.identityId, seenImages)
      .map(image => ({ ...image, showcaseId: base.id }));
    return {
      ...base,
      activeUntil: activeUntil.value,
      imageUrl: gallery.length ? getPublicProductShowcaseImageUrl(gallery[0]) : "",
      images: gallery,
    };
  });
}
