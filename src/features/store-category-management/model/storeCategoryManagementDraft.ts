import { normalizeStoreCategoryName, type StoreCategory } from "../../../entities/store-category/model/types";
import { validManagedStoreCategoryName, type ManagedStoreCategoryCommand } from "../../../entities/store-category/model/managedStoreCategories";

export type StoreCategoryManagementEditor = {
  kind: "create"; categoryId: string; parentId: string | null; name: string;
} | {
  kind: "rename" | "delete"; categoryId: string; parentId: string | null; name: string; originalName: string;
};
export function managementDraftMatchesSnapshot(editor: StoreCategoryManagementEditor, categories: readonly StoreCategory[]) {
  const row = categories.find(category => category.id === editor.categoryId);
  if (editor.kind === "create") return !row && (editor.parentId === null
    || categories.some(category => category.id === editor.parentId && category.parent_id === null));
  return !!row && row.name === editor.originalName && row.parent_id === editor.parentId
    && (editor.kind !== "delete" || !categories.some(category => category.parent_id === editor.categoryId));
}
export function managementDraftHasResult(editor: StoreCategoryManagementEditor, categories: readonly StoreCategory[]) {
  const row = categories.find(category => category.id === editor.categoryId);
  return editor.kind === "delete" ? !row : !!row && row.name === normalizeStoreCategoryName(editor.name)
    && row.parent_id === editor.parentId;
}
export function managementDraftCanSubmit(editor: StoreCategoryManagementEditor | null, categories: readonly StoreCategory[]) {
  return !!editor && managementDraftMatchesSnapshot(editor, categories)
    && validManagedStoreCategoryName(editor.kind === "delete" ? editor.originalName : normalizeStoreCategoryName(editor.name));
}
export function managementDraftCommand(editor: StoreCategoryManagementEditor): ManagedStoreCategoryCommand {
  return { operation: editor.kind === "create" ? editor.parentId === null ? "create_root" : "create_child" : editor.kind,
    categoryId: editor.categoryId, parentId: editor.parentId,
    name: editor.kind === "delete" ? editor.originalName : normalizeStoreCategoryName(editor.name),
    expectedName: editor.kind === "create" ? null : editor.originalName };
}
