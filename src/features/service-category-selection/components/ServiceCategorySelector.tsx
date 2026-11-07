"use client";

import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import {
  useEffect,
  useId,
  useMemo,
} from "react";
import {
  EMPTY_SERVICE_CATEGORY_SELECTION,
  buildServiceCategoryTree,
  type ServiceCategorySelection,
} from "../../../entities/service-category/model/types";
import { useServiceCategories } from "../model/useServiceCategories";

type ServiceCategorySelectorProps = {
  value: ServiceCategorySelection;
  onChange: (
    value: ServiceCategorySelection
  ) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

const EMPTY_CHILD_OPTIONS = [] as const;

export default function ServiceCategorySelector({
  value,
  onChange,
  disabled = false,
  required = false,
  className = "",
}: ServiceCategorySelectorProps) {
  const { language, r } = useMarketplaceTranslation();
  const rootSelectId =
    useId();

  const childSelectId =
    useId();

  const helpTextId =
    useId();

  const {
    categories,
    loading,
    error,
    refresh,
  } = useServiceCategories();

  const tree = useMemo(
    () =>
      buildServiceCategoryTree(
        categories
      ),
    [categories]
  );

  const childOptions = useMemo(
    () =>
      value.category
        ? tree.childrenByParent.get(
            value.category
          ) ||
          EMPTY_CHILD_OPTIONS
        : EMPTY_CHILD_OPTIONS,
    [
      tree.childrenByParent,
      value.category,
    ]
  );

  const selectedRoot =
    tree.roots.find(
      (category) =>
        category.code ===
        value.category
    ) || null;

  const selectedChild =
    childOptions.find(
      (category) =>
        category.code ===
        value.subcategory
    ) || null;

  useEffect(() => {
    if (
      loading ||
      error
    ) {
      return;
    }

    if (!value.category) {
      if (value.subcategory) {
        onChange({
          ...EMPTY_SERVICE_CATEGORY_SELECTION,
        });
      }

      return;
    }

    const rootExists =
      tree.roots.some(
        (category) =>
          category.code ===
          value.category
      );

    if (!rootExists) {
      onChange({
        ...EMPTY_SERVICE_CATEGORY_SELECTION,
      });

      return;
    }

    if (
      value.subcategory &&
      !childOptions.some(
        (category) =>
          category.code ===
          value.subcategory
      )
    ) {
      onChange({
        category:
          value.category,
        subcategory: null,
      });
    }
  }, [
    childOptions,
    error,
    loading,
    onChange,
    tree.roots,
    value.category,
    value.subcategory,
  ]);

  if (loading) {
    return (
      <div
        className={[
          "grid min-w-0 gap-3 sm:grid-cols-2",
          className,
        ].join(" ")}
        aria-label={r(marketplaceMessage("category.loading_service_categories.0ba362"))}
      >
        <div className="h-[82px] animate-pulse rounded-2xl bg-neutral-100" />
        <div className="h-[82px] animate-pulse rounded-2xl bg-neutral-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={[
          "rounded-2xl border border-red-100 bg-red-50 p-4",
          className,
        ].join(" ")}
      >
        <p className="font-black text-red-950">
          {r(marketplaceMessage("category.categories_could_not_be_loaded.acac19"))}</p>

        <p className="mt-2 break-words text-sm leading-6 text-red-800">
          {r(error)}
        </p>

        <button
          type="button"
          onClick={() =>
            void refresh()}
          className="mt-3 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-800"
        >
          {r(marketplaceMessage("horse.try_again.8c63df"))}</button>
      </div>
    );
  }

  if (tree.roots.length === 0) {
    return (
      <div
        className={[
          "rounded-2xl border border-dashed border-neutral-200 bg-white p-4",
          className,
        ].join(" ")}
      >
        <p className="font-black">
          {r(marketplaceMessage("category.no_service_categories.d29e95"))}</p>

        <p className="mt-2 text-sm leading-6 text-neutral-500">
          {r(marketplaceMessage("category.no_active_global_categories_were_found.ee2897"))}</p>
      </div>
    );
  }

  function handleRootChange(
    nextCategory: string
  ) {
    onChange({
      category:
        nextCategory || null,
      subcategory: null,
    });
  }

  function handleChildChange(
    nextSubcategory: string
  ) {
    onChange({
      category:
        value.category,
      subcategory:
        nextSubcategory || null,
    });
  }

  const selectionLabel =
    selectedRoot
      ? [
          language === "et" ? selectedRoot.labelEt : selectedRoot.labelEn,
          language === "et" ? selectedChild?.labelEt : selectedChild?.labelEn,
        ]
          .filter(Boolean)
          .join(" → ")
      : marketplaceMessage("category.no_category_selected.31172a");

  return (
    <div
      className={[
        "min-w-0",
        className,
      ].join(" ")}
    >
      <fieldset
        disabled={disabled}
        className="grid min-w-0 gap-3 sm:grid-cols-2"
        aria-describedby={helpTextId}
      >
        <label
          htmlFor={rootSelectId}
          className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4"
        >
          <span className="block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            {r(marketplaceMessage("category.parent_category.f3ddd3"))}{r(required ? " *" : "")}
          </span>

          <select
            id={rootSelectId}
            value={value.category || ""}
            required={required}
            onChange={(event) =>
              handleRootChange(
                event.target.value
              )}
            className="mt-2 min-h-11 w-full min-w-0 bg-transparent text-sm font-black outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {r(marketplaceMessage("category.select_a_parent_category.5f286d"))}</option>

            {r(tree.roots.map(
              (category) => (
                <option
                  key={category.code}
                  value={category.code}
                >
                  {r(language === "et" ? category.labelEt : category.labelEn)}
                </option>
              )
            ))}
          </select>
        </label>

        <label
          htmlFor={childSelectId}
          className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4"
        >
          <span className="block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            {r(marketplaceMessage("category.subcategory.ee4371"))}<span className="normal-case tracking-normal text-neutral-400">
              {r(" ")}
              {r(marketplaceMessage("service.optional.c6075a"))}</span>
          </span>

          <select
            id={childSelectId}
            value={value.subcategory ||
              ""}
            disabled={disabled ||
              !value.category ||
              childOptions.length === 0}
            onChange={(event) =>
              handleChildChange(
                event.target.value
              )}
            className="mt-2 min-h-11 w-full min-w-0 bg-transparent text-sm font-black outline-none disabled:cursor-not-allowed disabled:text-neutral-400"
          >
            <option value="">
              {r(!value.category
                ? marketplaceMessage("category.select_a_parent_category_first.86a2ad")
                : childOptions.length ===
                    0
                  ? marketplaceMessage("category.no_subcategories.f0f27c")
                  : marketplaceMessage("category.unspecified.99fb9b"))}
            </option>

            {r(childOptions.map(
              (category) => (
                <option
                  key={category.code}
                  value={category.code}
                >
                  {r(language === "et" ? category.labelEt : category.labelEn)}
                </option>
              )
            ))}
          </select>
        </label>
      </fieldset>

      <div
        id={helpTextId}
        aria-live="polite"
        className="mt-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5"
      >
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
          {r(marketplaceMessage("category.current_selection.03b773"))}</p>

        <p className="mt-1 break-words text-sm font-black text-neutral-700">
          {r(selectionLabel)}
        </p>
      </div>

      {r(tree.deeperCategoryCount > 0 ||
      tree.orphanCategoryCount > 0 ? (
        <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          {r(marketplaceMessage("category.some_categories_at_deeper_levels_or_without_a.d36593"))}</p>
      ) : null)}
    </div>
  );
}
