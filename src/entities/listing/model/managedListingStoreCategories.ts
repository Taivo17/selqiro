import type { StoreCategory } from "../../store-category/model/types";
import { validateListingEditKey, type ListingEditKey } from "./listingEditSnapshot";
import { isUploadUuid } from "./privatePublicationUpload";

export type StoreCategoryAssignmentKey = ListingEditKey;
export type StoreCategoryAssignmentSnapshot = {
  key: StoreCategoryAssignmentKey; categories: StoreCategory[]; categoryIds: string[];
};
export type StoreCategoryAssignmentReceipt = {
  listingId: string; categoryIds: string[]; assignedCount: number; removedPreviousLinks: number;
};
export type StoreCategoryAssignmentProblem = "context" | "read" | "invalid" | "forbidden" | "unknown";
const messages: Record<StoreCategoryAssignmentProblem, string> = {
  context: "storeAssignmentContextChanged", read: "storeAssignmentReadFailed", invalid: "storeAssignmentInvalid",
  forbidden: "storeAssignmentForbidden", unknown: "storeAssignmentUnconfirmed",
};
export class StoreCategoryAssignmentError extends Error {
  constructor(readonly code: StoreCategoryAssignmentProblem) { super(messages[code]); this.name = "StoreCategoryAssignmentError"; }
}
function ensure(value: unknown): asserts value {
  if (!value) throw new StoreCategoryAssignmentError("unknown");
}
function record(value: unknown, fields: readonly string[]): Record<string, unknown> {
  ensure(value !== null && typeof value === "object" && !Array.isArray(value));
  const result = value as Record<string, unknown>;
  ensure(Object.keys(result).length === fields.length && fields.every(field => Object.hasOwn(result, field)));
  return result;
}
export function bindStoreCategoryAssignmentKey(key: StoreCategoryAssignmentKey): StoreCategoryAssignmentKey {
  try { validateListingEditKey(key); }
  catch { throw new StoreCategoryAssignmentError("invalid"); }
  if (!isUploadUuid(key.userId) || !isUploadUuid(key.identityId)) throw new StoreCategoryAssignmentError("invalid");
  return Object.freeze({ userId: key.userId, identityId: key.identityId, listingId: key.listingId });
}
/** A set is order-independent, but duplicates, nulls and coercion are not accepted. */
export function parseStoreCategoryIds(value: unknown): string[] {
  ensure(Array.isArray(value) && value.every(isUploadUuid));
  ensure(new Set(value).size === value.length);
  return [...value].sort();
}
export function sameStoreCategoryIds(first: readonly string[], second: readonly string[]) {
  const a = [...first].sort(), b = [...second].sort();
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
function listingIdMatches(value: unknown, expected: string) {
  return (typeof value === "string" || typeof value === "number" && Number.isSafeInteger(value) && value > 0)
    && String(value) === expected;
}
export function parseManagedStoreCategories(value: unknown, key: StoreCategoryAssignmentKey): StoreCategory[] {
  ensure(Array.isArray(value));
  const categories = value.map(item => {
    const row = record(item, ["id", "identity_id", "name", "sort_order", "parent_id"]);
    ensure(isUploadUuid(row.id) && row.identity_id === key.identityId && typeof row.name === "string"
      && row.name.trim().length > 0 && Array.from(row.name).length <= 60
      && (row.sort_order === null || Number.isSafeInteger(row.sort_order))
      && (row.parent_id === null || isUploadUuid(row.parent_id) && row.parent_id !== row.id));
    return { id: row.id, name: row.name, sort_order: row.sort_order as number | null, parent_id: row.parent_id as string | null };
  });
  ensure(new Set(categories.map(category => category.id)).size === categories.length);
  return categories;
}
export function parseManagedStoreCategoryAssignments(value: unknown, key: StoreCategoryAssignmentKey): string[] {
  ensure(Array.isArray(value));
  return parseStoreCategoryIds(value.map(item => {
    const row = record(item, ["listing_id", "store_category_id", "listings"]);
    const listing = record(row.listings, ["identity_id"]);
    ensure(listingIdMatches(row.listing_id, key.listingId) && listing.identity_id === key.identityId);
    return row.store_category_id;
  }));
}
export function confirmStoreCategoryListing(value: unknown, key: StoreCategoryAssignmentKey): void {
  const row = record(value, ["id", "identity_id"]);
  ensure(listingIdMatches(row.id, key.listingId) && row.identity_id === key.identityId);
}
/** The TABLE RPC must acknowledge the exact requested set, including an empty set. */
export function parseManagedStoreCategorySaved(value: unknown, key: StoreCategoryAssignmentKey,
  requested: readonly string[]): StoreCategoryAssignmentReceipt {
  ensure(Array.isArray(value) && value.length === 1);
  const row = record(value[0], ["listing_id", "category_ids", "assigned_count", "removed_previous_links"]);
  const categoryIds = parseStoreCategoryIds(row.category_ids);
  ensure(listingIdMatches(row.listing_id, key.listingId) && sameStoreCategoryIds(categoryIds, requested)
    && Number.isSafeInteger(row.assigned_count) && row.assigned_count === categoryIds.length
    && Number.isSafeInteger(row.removed_previous_links) && Number(row.removed_previous_links) >= 0);
  return { listingId: key.listingId, categoryIds, assignedCount: categoryIds.length,
    removedPreviousLinks: row.removed_previous_links as number };
}
