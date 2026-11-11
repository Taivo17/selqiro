import type { StoreCategory } from "./types";

export type ContentStoreCategoryKey = { userId: string; identityId: string; contentId: string };
export type ContentStoreCategorySnapshot = { key: ContentStoreCategoryKey; categories: StoreCategory[]; categoryIds: string[] };
export type ContentStoreCategoryReceipt = { contentId: string; identityId: string; categoryIds: string[]; assignedCount: number };
export type ContentStoreCategoryProblem = "context" | "read" | "invalid" | "forbidden" | "unknown";
export const contentCategoryUuid = (value: unknown): value is string => typeof value === "string"
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const messages: Record<ContentStoreCategoryProblem, string> = {
  context: "storeAssignmentContextChanged", read: "storeAssignmentReadFailed", invalid: "storeAssignmentInvalid",
  forbidden: "storeAssignmentForbidden", unknown: "storeAssignmentUnconfirmed",
};
export class ContentStoreCategoryError extends Error {
  constructor(readonly code: ContentStoreCategoryProblem) { super(messages[code]); this.name = "ContentStoreCategoryError"; }
}
function ensure(value: unknown): asserts value { if (!value) throw new ContentStoreCategoryError("unknown"); }
function record(value: unknown, fields: readonly string[]): Record<string, unknown> {
  ensure(value !== null && typeof value === "object" && !Array.isArray(value));
  const result = value as Record<string, unknown>;
  ensure(Object.keys(result).length === fields.length && fields.every(field => Object.hasOwn(result, field)));
  return result;
}
export function bindContentStoreCategoryKey(value: ContentStoreCategoryKey): ContentStoreCategoryKey {
  if (!value || !contentCategoryUuid(value.userId) || !contentCategoryUuid(value.identityId) || !contentCategoryUuid(value.contentId))
    throw new ContentStoreCategoryError("invalid");
  return Object.freeze({ userId: value.userId.toLowerCase(), identityId: value.identityId.toLowerCase(), contentId: value.contentId.toLowerCase() });
}
export function parseContentCategoryIds(value: unknown): string[] {
  ensure(Array.isArray(value) && value.every(contentCategoryUuid));
  const ids = value.map(id => id.toLowerCase());
  ensure(new Set(ids).size === ids.length);
  return ids.sort();
}
export function sameContentCategoryIds(first: readonly string[], second: readonly string[]) {
  const a = [...first].sort(), b = [...second].sort();
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
export function parseContentStoreCategories(value: unknown, identityId: string): StoreCategory[] {
  ensure(Array.isArray(value));
  const categories = value.map(item => {
    const row = record(item, ["id", "identity_id", "name", "sort_order", "parent_id"]);
    ensure(contentCategoryUuid(row.id) && row.identity_id === identityId && typeof row.name === "string"
      && row.name.trim().length > 0 && Array.from(row.name).length <= 60
      && (row.sort_order === null || Number.isSafeInteger(row.sort_order))
      && (row.parent_id === null || contentCategoryUuid(row.parent_id) && row.parent_id !== row.id));
    return { id: row.id, name: row.name, sort_order: row.sort_order as number | null, parent_id: row.parent_id as string | null };
  });
  ensure(new Set(categories.map(category => category.id)).size === categories.length);
  return categories;
}
export function parseContentStoreCategoryRead(value: unknown, key: ContentStoreCategoryKey, idField: string): string[] {
  const row = record(value, [idField, "identity_id", "category_ids"]);
  ensure(row[idField] === key.contentId && row.identity_id === key.identityId);
  return parseContentCategoryIds(row.category_ids);
}
export function parseContentStoreCategoryReceipt(value: unknown, key: ContentStoreCategoryKey, requested: readonly string[], idField: string): ContentStoreCategoryReceipt {
  const row = record(value, [idField, "identity_id", "category_ids", "assigned_count"]);
  const categoryIds = parseContentCategoryIds(row.category_ids);
  ensure(row[idField] === key.contentId && row.identity_id === key.identityId && sameContentCategoryIds(categoryIds, requested)
    && Number.isSafeInteger(row.assigned_count) && row.assigned_count === categoryIds.length);
  return { contentId: key.contentId, identityId: key.identityId, categoryIds, assignedCount: categoryIds.length };
}
