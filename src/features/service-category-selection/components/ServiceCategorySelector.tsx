"use client";

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
        aria-label="Teenuste rubriike laetakse"
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
          Rubriike ei saanud laadida
        </p>

        <p className="mt-2 break-words text-sm leading-6 text-red-800">
          {error}
        </p>

        <button
          type="button"
          onClick={() =>
            void refresh()
          }
          className="mt-3 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-800"
        >
          Proovi uuesti
        </button>
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
          Teenuste rubriike ei ole
        </p>

        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Aktiivseid globaalseid rubriike ei leitud.
        </p>
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
          selectedRoot.labelEt,
          selectedChild?.labelEt,
        ]
          .filter(Boolean)
          .join(" → ")
      : "Rubriiki ei ole valitud";

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
        aria-describedby={
          helpTextId
        }
      >
        <label
          htmlFor={rootSelectId}
          className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4"
        >
          <span className="block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            Ülemrubriik
            {required ? " *" : ""}
          </span>

          <select
            id={rootSelectId}
            value={
              value.category || ""
            }
            required={required}
            onChange={(event) =>
              handleRootChange(
                event.target.value
              )
            }
            className="mt-2 min-h-11 w-full min-w-0 bg-transparent text-sm font-black outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              Vali ülemrubriik
            </option>

            {tree.roots.map(
              (category) => (
                <option
                  key={
                    category.code
                  }
                  value={
                    category.code
                  }
                >
                  {category.labelEt}
                </option>
              )
            )}
          </select>
        </label>

        <label
          htmlFor={childSelectId}
          className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4"
        >
          <span className="block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
            Alamrubriik
            <span className="normal-case tracking-normal text-neutral-400">
              {" "}
              (valikuline)
            </span>
          </span>

          <select
            id={childSelectId}
            value={
              value.subcategory ||
              ""
            }
            disabled={
              disabled ||
              !value.category ||
              childOptions.length === 0
            }
            onChange={(event) =>
              handleChildChange(
                event.target.value
              )
            }
            className="mt-2 min-h-11 w-full min-w-0 bg-transparent text-sm font-black outline-none disabled:cursor-not-allowed disabled:text-neutral-400"
          >
            <option value="">
              {!value.category
                ? "Vali esmalt ülemrubriik"
                : childOptions.length ===
                    0
                  ? "Alamrubriike ei ole"
                  : "Täpsustamata"}
            </option>

            {childOptions.map(
              (category) => (
                <option
                  key={
                    category.code
                  }
                  value={
                    category.code
                  }
                >
                  {category.labelEt}
                </option>
              )
            )}
          </select>
        </label>
      </fieldset>

      <div
        id={helpTextId}
        aria-live="polite"
        className="mt-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5"
      >
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
          Praegune valik
        </p>

        <p className="mt-1 break-words text-sm font-black text-neutral-700">
          {selectionLabel}
        </p>
      </div>

      {tree.deeperCategoryCount > 0 ||
      tree.orphanCategoryCount > 0 ? (
        <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          Mõnda sügavama taseme või puuduva ülemaga rubriiki selles kahetasandilises vaates ei kuvata.
        </p>
      ) : null}
    </div>
  );
}
