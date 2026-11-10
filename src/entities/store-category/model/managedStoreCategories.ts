import { isUploadUuid } from "../../listing/model/privatePublicationUpload";
import { normalizeStoreCategoryName, STORE_CATEGORY_NAME_MAX_LENGTH, type StoreCategory } from "./types";

export type ManagedStoreCategoryKey = Readonly<{ userId: string; identityId: string }>;
export type ManagedStoreCategoryOperation = "create_root" | "create_child" | "rename" | "delete";
export type ManagedStoreCategoryCommand = {
  operation: ManagedStoreCategoryOperation; categoryId: string; parentId: string | null;
  name: string; expectedName: string | null;
};
export type ManagedStoreCategorySnapshot = { key: ManagedStoreCategoryKey; categories: StoreCategory[] };
export type ManagedStoreCategoryReceipt = {
  operation: ManagedStoreCategoryOperation; categoryId: string; name: string;
  parentId: string | null; sortOrder: number | null; changed: boolean; removedListingLinks: number;
};
export type StoreCategoryManagementProblem = "context" | "read" | "invalid" | "forbidden"
  | "duplicate" | "stale" | "has_children" | "unknown";
export class StoreCategoryManagementError extends Error {
  constructor(readonly code: StoreCategoryManagementProblem) { super(code); this.name = "StoreCategoryManagementError"; }
}
function ensure(value: unknown): asserts value {
  if (!value) throw new StoreCategoryManagementError("unknown");
}
function record(value: unknown, fields: readonly string[]): Record<string, unknown> {
  ensure(value !== null && typeof value === "object" && !Array.isArray(value));
  const row = value as Record<string, unknown>;
  ensure(Object.keys(row).length === fields.length && fields.every(field => Object.hasOwn(row, field)));
  return row;
}
export function bindManagedStoreCategoryKey(key: ManagedStoreCategoryKey): ManagedStoreCategoryKey {
  if (!key || !isUploadUuid(key.userId) || !isUploadUuid(key.identityId)) throw new StoreCategoryManagementError("invalid");
  return Object.freeze({ userId: key.userId, identityId: key.identityId });
}
export function validManagedStoreCategoryName(name: unknown): name is string {
  return typeof name === "string" && name.trim().length > 0 && Array.from(name).length <= STORE_CATEGORY_NAME_MAX_LENGTH;
}
export function prepareManagedStoreCategoryCommand(input: ManagedStoreCategoryCommand): ManagedStoreCategoryCommand {
  const creating = input.operation === "create_root" || input.operation === "create_child";
  const name = input.operation === "delete" ? input.name : typeof input.name === "string" ? normalizeStoreCategoryName(input.name) : "";
  if (!["create_root", "create_child", "rename", "delete"].includes(input.operation)
    || !isUploadUuid(input.categoryId) || !(input.parentId === null || isUploadUuid(input.parentId) && input.parentId !== input.categoryId)
    || !validManagedStoreCategoryName(name) || creating && input.expectedName !== null
    || !creating && !validManagedStoreCategoryName(input.expectedName)
    || input.operation === "create_root" && input.parentId !== null
    || input.operation === "create_child" && input.parentId === null
    || input.operation === "delete" && input.name !== input.expectedName) throw new StoreCategoryManagementError("invalid");
  return Object.freeze({ operation: input.operation, categoryId: input.categoryId, parentId: input.parentId,
    name, expectedName: input.expectedName });
}
/** Keep deeper/orphan legacy rows visible; only new creation is limited to two levels. */
export function parseManagedStoreCategoryRows(value: unknown, key: ManagedStoreCategoryKey): StoreCategory[] {
  ensure(Array.isArray(value));
  const categories = value.map(item => {
    const row = record(item, ["id", "identity_id", "name", "sort_order", "parent_id"]);
    ensure(isUploadUuid(row.id) && row.identity_id === key.identityId && validManagedStoreCategoryName(row.name)
      && (row.sort_order === null || Number.isSafeInteger(row.sort_order))
      && (row.parent_id === null || isUploadUuid(row.parent_id) && row.parent_id !== row.id));
    return { id: row.id, name: row.name, sort_order: row.sort_order as number | null, parent_id: row.parent_id as string | null };
  });
  ensure(new Set(categories.map(row => row.id)).size === categories.length);
  return categories;
}
/** A JSONB RPC must acknowledge this exact actor, command and material content. */
export function parseManagedStoreCategoryReceipt(value: unknown, key: ManagedStoreCategoryKey,
  command: ManagedStoreCategoryCommand): ManagedStoreCategoryReceipt {
  const row = record(value, ["schema_version", "operation", "actor_user_id", "identity_id", "category_id", "name",
    "sort_order", "parent_id", "changed", "removed_listing_links"]);
  ensure(row.schema_version === 1 && row.operation === command.operation && row.actor_user_id === key.userId
    && row.identity_id === key.identityId && row.category_id === command.categoryId && row.name === command.name
    && row.parent_id === command.parentId && (row.sort_order === null || Number.isSafeInteger(row.sort_order))
    && typeof row.changed === "boolean" && Number.isSafeInteger(row.removed_listing_links) && Number(row.removed_listing_links) >= 0
    && (command.operation === "delete" ? row.changed === true : row.removed_listing_links === 0));
  return { operation: command.operation, categoryId: command.categoryId, name: command.name, parentId: command.parentId,
    sortOrder: row.sort_order as number | null, changed: row.changed, removedListingLinks: row.removed_listing_links as number };
}
