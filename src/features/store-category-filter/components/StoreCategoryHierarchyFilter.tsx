"use client";

import { useEffect, useMemo, useState } from "react";
import type { StoreCategory } from "../../../entities/store-category/model/types";

type StoreCategoryHierarchyFilterProps = {
  categories: StoreCategory[];
  selectedCategoryId: string;
  allCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
};

function compareCategories(
  first: StoreCategory,
  second: StoreCategory
) {
  const firstOrder =
    typeof first.sort_order === "number" ? first.sort_order : 0;

  const secondOrder =
    typeof second.sort_order === "number" ? second.sort_order : 0;

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder;
  }

  return first.name.localeCompare(second.name, "et");
}

function buildHierarchy(categories: StoreCategory[]) {
  const roots = categories
    .filter((category) => !category.parent_id)
    .sort(compareCategories);

  const rootIds = new Set(
    roots.map((category) => category.id)
  );

  const childrenByRoot = new Map<string, StoreCategory[]>();

  for (const category of categories) {
    if (
      !category.parent_id ||
      !rootIds.has(category.parent_id)
    ) {
      continue;
    }

    const currentChildren =
      childrenByRoot.get(category.parent_id) || [];

    currentChildren.push(category);
    childrenByRoot.set(
      category.parent_id,
      currentChildren
    );
  }

  for (const children of childrenByRoot.values()) {
    children.sort(compareCategories);
  }

  return {
    roots,
    childrenByRoot,
  };
}

export default function StoreCategoryHierarchyFilter({
  categories,
  selectedCategoryId,
  allCategoryId,
  onSelectCategory,
}: StoreCategoryHierarchyFilterProps) {
  const { roots, childrenByRoot } = useMemo(
    () => buildHierarchy(categories),
    [categories]
  );

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) => category.id === selectedCategoryId
      ) || null,
    [categories, selectedCategoryId]
  );

  const selectedRootId = selectedCategory
    ? selectedCategory.parent_id || selectedCategory.id
    : null;

  const [expandedRootId, setExpandedRootId] =
    useState<string | null>(selectedRootId);

  useEffect(() => {
    if (selectedCategoryId === allCategoryId) {
      setExpandedRootId(null);
      return;
    }

    setExpandedRootId(selectedRootId);
  }, [
    allCategoryId,
    selectedCategoryId,
    selectedRootId,
  ]);

  function selectAllCategories() {
    setExpandedRootId(null);
    onSelectCategory(allCategoryId);
  }

  function selectRoot(rootId: string) {
    setExpandedRootId(rootId);
    onSelectCategory(rootId);
  }

  function selectChild(
    rootId: string,
    childId: string
  ) {
    setExpandedRootId(rootId);
    onSelectCategory(childId);
  }

  return (
    <div className="mt-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={selectAllCategories}
          className={[
            "w-fit rounded-full px-4 py-2 text-sm font-black transition",
            selectedCategoryId === allCategoryId
              ? "bg-black text-white"
              : "border border-neutral-200 bg-white text-neutral-700",
          ].join(" ")}
        >
          Kõik rubriigid
        </button>

        <p className="text-xs leading-5 text-neutral-500">
          Ülemrubriik näitab kogu haru. Alamrubriik
          kitsendab tulemusi.
        </p>
      </div>

      <div className="mt-3 grid items-start gap-2 sm:grid-cols-2">
        {roots.map((rootCategory) => {
          const children =
            childrenByRoot.get(rootCategory.id) || [];

          const hasChildren = children.length > 0;

          const rootSelected =
            selectedCategoryId === rootCategory.id;

          const branchSelected =
            selectedRootId === rootCategory.id;

          const expanded =
            expandedRootId === rootCategory.id;

          const childRegionId =
            `store-category-children-${rootCategory.id}`;

          return (
            <article
              key={rootCategory.id}
              className={[
                "overflow-hidden rounded-2xl border bg-white transition",
                branchSelected
                  ? "border-black/25 shadow-sm"
                  : "border-neutral-200",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => selectRoot(rootCategory.id)}
                aria-expanded={
                  hasChildren ? expanded : undefined
                }
                aria-controls={
                  hasChildren ? childRegionId : undefined
                }
                className={[
                  "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition",
                  rootSelected
                    ? "bg-black text-white"
                    : branchSelected
                      ? "bg-neutral-100 text-black"
                      : "bg-white text-neutral-800 hover:bg-neutral-50",
                ].join(" ")}
              >
                <span className="min-w-0">
                  <span
                    className={[
                      "block text-[10px] font-black uppercase tracking-[0.14em]",
                      rootSelected
                        ? "text-white/55"
                        : "text-neutral-400",
                    ].join(" ")}
                  >
                    Ülemrubriik
                  </span>

                  <span className="mt-1 block break-words text-sm font-black leading-5">
                    {rootCategory.name}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-2">
                  {hasChildren ? (
                    <span
                      className={[
                        "rounded-full px-2 py-1 text-[11px] font-black",
                        rootSelected
                          ? "bg-white/15 text-white"
                          : "bg-neutral-100 text-neutral-500",
                      ].join(" ")}
                    >
                      {children.length}
                    </span>
                  ) : null}

                  {hasChildren ? (
                    <span
                      aria-hidden="true"
                      className={[
                        "text-sm font-black",
                        rootSelected
                          ? "text-white/70"
                          : "text-neutral-400",
                      ].join(" ")}
                    >
                      {expanded ? "▾" : "›"}
                    </span>
                  ) : null}
                </span>
              </button>

              {expanded && hasChildren ? (
                <div
                  id={childRegionId}
                  className="border-t border-neutral-200 bg-[#fbfbfa] p-3"
                >
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-400">
                    Alamrubriigid
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {children.map((childCategory) => {
                      const childSelected =
                        selectedCategoryId ===
                        childCategory.id;

                      return (
                        <button
                          key={childCategory.id}
                          type="button"
                          onClick={() =>
                            selectChild(
                              rootCategory.id,
                              childCategory.id
                            )
                          }
                          className={[
                            "max-w-full rounded-full px-3 py-2 text-left text-xs font-black transition",
                            childSelected
                              ? "bg-black text-white"
                              : "border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300",
                          ].join(" ")}
                        >
                          <span className="break-words">
                            {childCategory.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
