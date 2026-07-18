"use client";

import { useMemo } from "react";
import type { StoreCategory } from "../../../entities/store-category/model/types";

type ListingStoreCategorySelectorProps = {
  categories: StoreCategory[];
  selectedCategoryIds: string[];
  disabled: boolean;
  onToggleCategory: (categoryId: string) => void;
};

type CategoryOptionProps = {
  category: StoreCategory;
  level: "root" | "child";
  parentName?: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
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

function buildCategoryTree(
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
  }

  for (const children of childrenByParent.values()) {
    children.sort(compareCategories);
  }

  return {
    roots,
    childrenByParent,
    deeperCategoryCount,
  };
}

function CategoryOption({
  category,
  level,
  parentName,
  selected,
  disabled,
  onToggle,
}: CategoryOptionProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      disabled={disabled}
      className={[
        "w-full rounded-2xl border p-4 text-left transition",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-emerald-200 bg-emerald-50 shadow-sm"
          : "border-neutral-200 bg-white hover:border-neutral-300",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-black",
            selected
              ? "border-black bg-black text-white"
              : "border-neutral-300 bg-white text-transparent",
          ].join(" ")}
          aria-hidden="true"
        >
          ✓
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-black uppercase tracking-[0.15em] text-neutral-400">
            {level === "root"
              ? "Ülemrubriik"
              : "Alamrubriik"}
          </span>

          <span className="mt-1 block break-words text-sm font-black leading-5 text-neutral-950">
            {category.name}
          </span>

          {level === "child" && parentName ? (
            <span className="mt-1 block text-xs leading-5 text-neutral-500">
              {parentName}
            </span>
          ) : null}
        </span>

        <span
          className={[
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black",
            selected
              ? "bg-white text-emerald-800"
              : "bg-neutral-100 text-neutral-500",
          ].join(" ")}
        >
          {selected ? "Valitud" : "Vali"}
        </span>
      </div>
    </button>
  );
}

export default function ListingStoreCategorySelector({
  categories,
  selectedCategoryIds,
  disabled,
  onToggleCategory,
}: ListingStoreCategorySelectorProps) {
  const selectedCategoryIdSet = useMemo(
    () => new Set(selectedCategoryIds),
    [selectedCategoryIds]
  );

  const {
    roots,
    childrenByParent,
    deeperCategoryCount,
  } = useMemo(
    () => buildCategoryTree(categories),
    [categories]
  );

  return (
    <>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {roots.map((rootCategory) => {
          const children =
            childrenByParent.get(
              rootCategory.id
            ) || [];

          return (
            <article
              key={rootCategory.id}
              className="rounded-[24px] border border-neutral-200 bg-[#fbfbfa] p-3"
            >
              <CategoryOption
                category={rootCategory}
                level="root"
                selected={selectedCategoryIdSet.has(
                  rootCategory.id
                )}
                disabled={disabled}
                onToggle={() =>
                  onToggleCategory(
                    rootCategory.id
                  )
                }
              />

              {children.length > 0 ? (
                <div className="mt-3 border-l-2 border-neutral-200 pl-3">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.15em] text-neutral-400">
                    Alamrubriigid
                  </p>

                  <div className="space-y-2">
                    {children.map(
                      (childCategory) => (
                        <CategoryOption
                          key={childCategory.id}
                          category={childCategory}
                          level="child"
                          parentName={
                            rootCategory.name
                          }
                          selected={selectedCategoryIdSet.has(
                            childCategory.id
                          )}
                          disabled={disabled}
                          onToggle={() =>
                            onToggleCategory(
                              childCategory.id
                            )
                          }
                        />
                      )
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-3 px-2 text-xs leading-5 text-neutral-400">
                  Selle ülemrubriigi all pole
                  alamrubriike.
                </p>
              )}
            </article>
          );
        })}
      </div>

      {deeperCategoryCount > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="font-black text-amber-950">
            {deeperCategoryCount} sügavama
            taseme rubriiki ei kuvata
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-900">
            V2 muutmisvaade toetab praegu
            ülemrubriiki ja selle otseseid
            alamrubriike.
          </p>
        </div>
      ) : null}
    </>
  );
}
