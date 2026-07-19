import type { StoreCategory } from "./types";

/**
 * Returns the selected category and every descendant
 * category reachable through parent_id.
 *
 * The V2 UI currently displays two levels, but this
 * traversal remains recursive so deeper future levels
 * already participate in branch filtering.
 */
export function getStoreCategoryScopeIds(
  categories: StoreCategory[],
  selectedCategoryId: string
): string[] {
  const cleanSelectedCategoryId =
    selectedCategoryId.trim();

  if (!cleanSelectedCategoryId) {
    return [];
  }

  const categoryIds = new Set(
    categories.map((category) => category.id)
  );

  /*
   * Fail closed: a stale or foreign category ID must
   * never turn into an unfiltered public listing query.
   */
  if (!categoryIds.has(cleanSelectedCategoryId)) {
    return [];
  }

  const childrenByParent =
    new Map<string, string[]>();

  for (const category of categories) {
    if (!category.parent_id) continue;

    const children =
      childrenByParent.get(
        category.parent_id
      ) || [];

    children.push(category.id);

    childrenByParent.set(
      category.parent_id,
      children
    );
  }

  const scope = new Set<string>();
  const queue = [cleanSelectedCategoryId];

  while (queue.length > 0) {
    const currentCategoryId =
      queue.shift();

    if (
      !currentCategoryId ||
      scope.has(currentCategoryId)
    ) {
      continue;
    }

    scope.add(currentCategoryId);

    const children =
      childrenByParent.get(
        currentCategoryId
      ) || [];

    for (const childId of children) {
      if (!scope.has(childId)) {
        queue.push(childId);
      }
    }
  }

  return Array.from(scope).sort(
    (first, second) =>
      first.localeCompare(second)
  );
}
