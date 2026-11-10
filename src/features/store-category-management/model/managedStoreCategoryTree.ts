import type { StoreCategory } from "../../../entities/store-category/model/types";

/** Preserve every existing row, including legacy deeper levels and orphan rows. */
export function managedStoreCategoryTree(categories: readonly StoreCategory[]) {
  const ordered = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id.localeCompare(b.id));
  const roots = ordered.filter(category => category.parent_id === null);
  const rootIds = new Set(roots.map(category => category.id));
  const byId = new Map(ordered.map(category => [category.id, category]));
  const childrenByParent = new Map<string, StoreCategory[]>();
  for (const category of ordered) {
    if (category.parent_id !== null) {
      const children = childrenByParent.get(category.parent_id) ?? [];
      children.push(category);
      childrenByParent.set(category.parent_id, children);
    }
  }
  const other = ordered.filter(category => category.parent_id !== null && !rootIds.has(category.parent_id));
  return { roots, rootIds, byId, childrenByParent, other };
}
