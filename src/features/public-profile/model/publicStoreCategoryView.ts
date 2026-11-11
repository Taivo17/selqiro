import { localeForLanguage } from "../../../../lib/i18n/useTranslation";
import type { Language } from "../../../../lib/i18n/translations";
import type { StoreCategory } from "../../../entities/store-category/model/types";

export function buildPublicStoreCategoryView(categories: StoreCategory[], language: Language) {
  const compare = (a: StoreCategory, b: StoreCategory) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    || a.name.localeCompare(b.name, localeForLanguage(language));
  const roots = categories.filter(category => !category.parent_id).sort(compare);
  const rootIds = new Set(roots.map(category => category.id));
  const childrenByParent = new Map<string, StoreCategory[]>();
  let directChildCount = 0, deeperCategoryCount = 0;
  for (const category of categories) {
    if (!category.parent_id) continue;
    if (!rootIds.has(category.parent_id)) {deeperCategoryCount++; continue;}
    const children = childrenByParent.get(category.parent_id) ?? [];
    children.push(category); childrenByParent.set(category.parent_id, children); directChildCount++;
  }
  for (const children of childrenByParent.values()) children.sort(compare);
  return {roots, childrenByParent, directChildCount, deeperCategoryCount};
}
