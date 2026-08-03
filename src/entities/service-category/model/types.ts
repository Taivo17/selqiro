export const SERVICE_CATEGORY_CODE_PATTERN =
  /^[a-z0-9_]{2,80}$/;

export type ServiceCategory = {
  code: string;
  parentCode: string | null;
  labelEt: string;
  labelEn: string;
  sortOrder: number;
};

export type ServiceCategorySelection = {
  category: string | null;
  subcategory: string | null;
};

export type ServiceCategoryTree = {
  roots: ServiceCategory[];
  childrenByParent: Map<
    string,
    ServiceCategory[]
  >;
  deeperCategoryCount: number;
  orphanCategoryCount: number;
};

export const EMPTY_SERVICE_CATEGORY_SELECTION:
  ServiceCategorySelection = {
    category: null,
    subcategory: null,
  };

export function compareServiceCategories(
  first: ServiceCategory,
  second: ServiceCategory
): number {
  if (
    first.sortOrder !==
    second.sortOrder
  ) {
    return (
      first.sortOrder -
      second.sortOrder
    );
  }

  const labelComparison =
    first.labelEt.localeCompare(
      second.labelEt,
      "et"
    );

  if (labelComparison !== 0) {
    return labelComparison;
  }

  return first.code.localeCompare(
    second.code
  );
}

export function buildServiceCategoryTree(
  categories: ServiceCategory[]
): ServiceCategoryTree {
  const roots = categories
    .filter(
      (category) =>
        category.parentCode === null
    )
    .sort(compareServiceCategories);

  const rootCodes = new Set(
    roots.map(
      (category) =>
        category.code
    )
  );

  const allCodes = new Set(
    categories.map(
      (category) =>
        category.code
    )
  );

  const childrenByParent = new Map<
    string,
    ServiceCategory[]
  >();

  let deeperCategoryCount = 0;
  let orphanCategoryCount = 0;

  for (const category of categories) {
    const parentCode =
      category.parentCode;

    if (!parentCode) {
      continue;
    }

    if (rootCodes.has(parentCode)) {
      const children =
        childrenByParent.get(
          parentCode
        ) || [];

      children.push(category);

      childrenByParent.set(
        parentCode,
        children
      );

      continue;
    }

    if (allCodes.has(parentCode)) {
      deeperCategoryCount += 1;
    } else {
      orphanCategoryCount += 1;
    }
  }

  for (
    const children
    of childrenByParent.values()
  ) {
    children.sort(
      compareServiceCategories
    );
  }

  return {
    roots,
    childrenByParent,
    deeperCategoryCount,
    orphanCategoryCount,
  };
}
