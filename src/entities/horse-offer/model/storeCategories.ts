import type { HorseDraftActor } from "./draftEdit";
import { isHorseDraftUuid } from "./draftEdit";
import type { StoreCategory } from "../../store-category/model/types";

export type HorseStoreCategoryKey = HorseDraftActor & { offerId: string };
export type HorseStoreCategorySnapshot = { key: HorseStoreCategoryKey; categories: StoreCategory[]; categoryIds: string[] };
export type HorseStoreCategoryReceipt = { offerId: string; identityId: string; categoryIds: string[]; assignedCount: number };
export type HorseStoreCategoryProblem = "context" | "read" | "invalid" | "forbidden" | "unknown";
const messages: Record<HorseStoreCategoryProblem, string> = {
  context: "storeAssignmentContextChanged", read: "storeAssignmentReadFailed", invalid: "storeAssignmentInvalid",
  forbidden: "storeAssignmentForbidden", unknown: "storeAssignmentUnconfirmed",
};
export class HorseStoreCategoryError extends Error {
  constructor(readonly code: HorseStoreCategoryProblem) { super(messages[code]); this.name = "HorseStoreCategoryError"; }
}
function ensure(value: unknown): asserts value { if (!value) throw new HorseStoreCategoryError("unknown"); }
function record(value: unknown, fields: readonly string[]): Record<string, unknown> {
  ensure(value !== null && typeof value === "object" && !Array.isArray(value));
  const result = value as Record<string, unknown>;
  ensure(Object.keys(result).length === fields.length && fields.every(field => Object.hasOwn(result, field)));
  return result;
}
export function bindHorseStoreCategoryKey(value: HorseStoreCategoryKey): HorseStoreCategoryKey {
  if (!value || !isHorseDraftUuid(value.userId) || !isHorseDraftUuid(value.identityId) || !isHorseDraftUuid(value.offerId))
    throw new HorseStoreCategoryError("invalid");
  return Object.freeze({ userId: value.userId.toLowerCase(), identityId: value.identityId.toLowerCase(), offerId: value.offerId.toLowerCase() });
}
export function parseHorseCategoryIds(value: unknown): string[] {
  ensure(Array.isArray(value) && value.every(isHorseDraftUuid));
  const ids = value.map(id => id.toLowerCase());
  ensure(new Set(ids).size === ids.length);
  return ids.sort();
}
export function sameHorseCategoryIds(first: readonly string[], second: readonly string[]) {
  const a = [...first].sort(), b = [...second].sort();
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
export function parseHorseStoreCategories(value: unknown, identityId: string): StoreCategory[] {
  ensure(Array.isArray(value));
  const categories = value.map(item => {
    const row = record(item, ["id", "identity_id", "name", "sort_order", "parent_id"]);
    ensure(isHorseDraftUuid(row.id) && row.identity_id === identityId && typeof row.name === "string"
      && row.name.trim().length > 0 && Array.from(row.name).length <= 60
      && (row.sort_order === null || Number.isSafeInteger(row.sort_order))
      && (row.parent_id === null || isHorseDraftUuid(row.parent_id) && row.parent_id !== row.id));
    return { id: row.id, name: row.name, sort_order: row.sort_order as number | null, parent_id: row.parent_id as string | null };
  });
  ensure(new Set(categories.map(category => category.id)).size === categories.length);
  return categories;
}
export function parseHorseStoreCategoryRead(value: unknown, key: HorseStoreCategoryKey): string[] {
  const row = record(value, ["offer_id", "identity_id", "category_ids"]);
  ensure(row.offer_id === key.offerId && row.identity_id === key.identityId);
  return parseHorseCategoryIds(row.category_ids);
}
export function parseHorseStoreCategoryReceipt(value: unknown, key: HorseStoreCategoryKey, requested: readonly string[]): HorseStoreCategoryReceipt {
  const row = record(value, ["offer_id", "identity_id", "category_ids", "assigned_count"]);
  const categoryIds = parseHorseCategoryIds(row.category_ids);
  ensure(row.offer_id === key.offerId && row.identity_id === key.identityId && sameHorseCategoryIds(categoryIds, requested)
    && Number.isSafeInteger(row.assigned_count) && row.assigned_count === categoryIds.length);
  return { offerId: key.offerId, identityId: key.identityId, categoryIds, assignedCount: categoryIds.length };
}
