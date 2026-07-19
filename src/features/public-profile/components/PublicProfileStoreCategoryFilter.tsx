"use client";

import { useMemo } from "react";
import type { StoreCategory } from "../../../entities/store-category/model/types";

type PublicProfileStoreCategoryFilterProps = {
  categories: StoreCategory[];
  loading: boolean;
  error: string | null;
  selectedCategoryId: string | null;
  expandedRootId: string | null;
  onSelectAll: () => void;
  onSelectRoot: (
    categoryId: string,
    hasChildren: boolean
  ) => void;
  onSelectChild: (
    categoryId: string,
    parentId: string
  ) => void;
};

function compareCategories(
  first: StoreCategory,
  second: StoreCategory
) {
  const firstOrder =
    typeof first.sort_order === "number"
      ? first.sort_order
      : 0;

  const secondOrder =
    typeof second.sort_order === "number"
      ? second.sort_order
      : 0;

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder;
  }

  return first.name.localeCompare(
    second.name,
    "et"
  );
}

function buildCategoryView(
  categories: StoreCategory[]
) {
  const roots = categories
    .filter((category) => !category.parent_id)
    .sort(compareCategories);

  const rootIds = new Set(
    roots.map((category) => category.id)
  );

  const childrenByParent =
    new Map<string, StoreCategory[]>();

  let directChildCount = 0;
  let deeperCategoryCount = 0;

  for (const category of categories) {
    if (!category.parent_id) continue;

    if (!rootIds.has(category.parent_id)) {
      deeperCategoryCount += 1;
      continue;
    }

    const children =
      childrenByParent.get(
        category.parent_id
      ) || [];

    children.push(category);

    childrenByParent.set(
      category.parent_id,
      children
    );

    directChildCount += 1;
  }

  for (const children of childrenByParent.values()) {
    children.sort(compareCategories);
  }

  return {
    roots,
    childrenByParent,
    directChildCount,
    deeperCategoryCount,
  };
}

export default function PublicProfileStoreCategoryFilter({
  categories,
  loading,
  error,
  selectedCategoryId,
  expandedRootId,
  onSelectAll,
  onSelectRoot,
  onSelectChild,
}: PublicProfileStoreCategoryFilterProps) {
  const {
    roots,
    childrenByParent,
    directChildCount,
    deeperCategoryCount,
  } = useMemo(
    () => buildCategoryView(categories),
    [categories]
  );

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) =>
          category.id === selectedCategoryId
      ) || null,
    [categories, selectedCategoryId]
  );

  const selectedChildParentId =
    selectedCategory?.parent_id || null;

  const expandedRoot =
    roots.find(
      (category) =>
        category.id === expandedRootId
    ) || null;

  const expandedChildren =
    expandedRoot
      ? childrenByParent.get(
          expandedRoot.id
        ) || []
      : [];

  if (loading) {
    return (
      <div className="mb-5 rounded-[22px] border border-neutral-100 bg-[#fbfbfa] p-4">
        <div className="h-4 w-32 animate-pulse rounded-full bg-neutral-200" />

        <div className="mt-3 flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-10 w-32 animate-pulse rounded-full bg-neutral-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-5 rounded-[22px] border border-amber-100 bg-amber-50 p-4">
        <p className="text-sm font-black text-amber-950">
          Poe rubriike ei saanud laadida
        </p>

        <p className="mt-1 text-xs leading-5 text-amber-900">
          {error}
        </p>

        <p className="mt-1 text-xs leading-5 text-amber-800">
          Kõik avalikud kuulutused jäävad siiski
          nähtavaks.
        </p>
      </div>
    );
  }

  /*
   * Rubriikideta profiil ei vaja avalikus vaates
   * eraldi tühja filtriplokki.
   */
  if (roots.length === 0) {
    return null;
  }

  return (
    <div className="mb-5 rounded-[22px] border border-neutral-100 bg-[#fbfbfa] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
            Poe rubriigid
          </p>

          <p className="mt-1 text-sm font-black">
            Filtreeri selle profiili kuulutusi
          </p>
        </div>

        <span className="w-fit rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-neutral-500 shadow-sm">
          {roots.length} ülemrubriiki ·{" "}
          {directChildCount} alamrubriiki
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSelectAll}
          className={[
            "rounded-full px-4 py-2.5 text-sm font-black transition",
            selectedCategoryId === null
              ? "bg-black text-white shadow-sm"
              : "border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300",
          ].join(" ")}
        >
          Kõik kuulutused
        </button>

        {roots.map((rootCategory) => {
          const children =
            childrenByParent.get(
              rootCategory.id
            ) || [];

          const hasChildren =
            children.length > 0;

          const expanded =
            hasChildren &&
            expandedRootId === rootCategory.id;

          const rootSelected =
            selectedCategoryId ===
            rootCategory.id;

          const branchSelected =
            rootSelected ||
            selectedChildParentId ===
              rootCategory.id;

          return (
            <button
              key={rootCategory.id}
              type="button"
              onClick={() =>
                onSelectRoot(
                  rootCategory.id,
                  hasChildren
                )
              }
              aria-expanded={
                hasChildren
                  ? expanded
                  : undefined
              }
              aria-controls={
                hasChildren
                  ? `public-store-category-${rootCategory.id}`
                  : undefined
              }
              className={[
                "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-black transition",
                rootSelected
                  ? "border-black bg-black text-white shadow-sm"
                  : branchSelected
                    ? "border-black bg-neutral-100 text-black"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300",
              ].join(" ")}
            >
              <span>{rootCategory.name}</span>

              {hasChildren ? (
                <>
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-[10px] font-black",
                      rootSelected
                        ? "bg-white/15 text-white"
                        : "bg-neutral-100 text-neutral-500",
                    ].join(" ")}
                  >
                    {children.length}
                  </span>

                  <span
                    aria-hidden="true"
                    className="text-xs"
                  >
                    {expanded ? "⌃" : "⌄"}
                  </span>
                </>
              ) : null}
            </button>
          );
        })}
      </div>

      {expandedRoot &&
      expandedChildren.length > 0 ? (
        <div
          id={`public-store-category-${expandedRoot.id}`}
          className="mt-3 rounded-2xl border border-neutral-200 bg-white p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
              {expandedRoot.name} · alamrubriigid
            </p>

            <span className="text-[11px] font-bold text-neutral-400">
              Vali täpsem rubriik
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {expandedChildren.map(
              (childCategory) => {
                const selected =
                  selectedCategoryId ===
                  childCategory.id;

                return (
                  <button
                    key={childCategory.id}
                    type="button"
                    onClick={() =>
                      onSelectChild(
                        childCategory.id,
                        expandedRoot.id
                      )
                    }
                    className={[
                      "rounded-full border px-3.5 py-2 text-xs font-black transition",
                      selected
                        ? "border-black bg-black text-white"
                        : "border-neutral-200 bg-[#fbfbfa] text-neutral-700 hover:border-neutral-300",
                    ].join(" ")}
                  >
                    {childCategory.name}
                  </button>
                );
              }
            )}
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-xs leading-5 text-neutral-500">
        Ülemrubriik näitab kogu selle haru
        kuulutusi. Alamrubriik kitsendab tulemuse
        ainult valitud rubriigile.
      </p>

      {deeperCategoryCount > 0 ? (
        <p className="mt-2 text-xs leading-5 text-amber-800">
          {deeperCategoryCount} sügavama taseme
          rubriiki osaleb filtris, kuid seda ei
          kuvata veel kahetasandilises menüüs.
        </p>
      ) : null}
    </div>
  );
}
