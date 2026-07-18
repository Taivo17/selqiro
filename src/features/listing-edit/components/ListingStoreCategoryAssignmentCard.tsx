"use client";

import { useMemo } from "react";
import type { StoreCategory } from "../../../entities/store-category/model/types";
import { useMyAreaStoreCategories } from "../../my-area/model/useMyAreaStoreCategories";
import { useListingStoreCategoryAssignment } from "../model/useListingStoreCategoryAssignment";

type ListingStoreCategoryAssignmentCardProps = {
  listingId: string;
};

type AssignedCategoryView = {
  id: string;
  label: string;
  level: "root" | "child";
};

function buildCategoryMap(categories: StoreCategory[]) {
  return new Map(
    categories.map((category) => [
      category.id,
      category,
    ])
  );
}

function getCategoryLabel(
  category: StoreCategory,
  categoryById: Map<string, StoreCategory>
) {
  if (!category.parent_id) {
    return category.name;
  }

  const parent = categoryById.get(category.parent_id);

  return parent
    ? `${parent.name} → ${category.name}`
    : category.name;
}

export default function ListingStoreCategoryAssignmentCard({
  listingId,
}: ListingStoreCategoryAssignmentCardProps) {
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useMyAreaStoreCategories();

  const assignment =
    useListingStoreCategoryAssignment({
      listingId,
    });

  const categoryById = useMemo(
    () => buildCategoryMap(categories),
    [categories]
  );

  const assignedCategories = useMemo(
    () =>
      assignment.savedCategoryIds
        .map((categoryId): AssignedCategoryView | null => {
          const category = categoryById.get(categoryId);

          if (!category) {
            return null;
          }

          return {
            id: category.id,
            label: getCategoryLabel(
              category,
              categoryById
            ),
            level: category.parent_id
              ? "child"
              : "root",
          };
        })
        .filter(
          (
            item
          ): item is AssignedCategoryView =>
            Boolean(item)
        )
        .sort((first, second) =>
          first.label.localeCompare(
            second.label,
            "et"
          )
        ),
    [
      assignment.savedCategoryIds,
      categoryById,
    ]
  );

  const missingCategoryCount =
    assignment.savedCategoryIds.length -
    assignedCategories.length;

  const loading =
    categoriesLoading || assignment.loading;

  const error =
    categoriesError || assignment.error;

  return (
    <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            Poe rubriigid
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Kuulutuse praegune määrang
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Praegu kontrollime olemasolevate
            rubriigiseoste laadimist. Valiku
            muutmise võimalus lisatakse järgmises
            sammus.
          </p>
        </div>

        {!loading && !error ? (
          <span className="w-fit shrink-0 rounded-full bg-neutral-100 px-3 py-2 text-xs font-black text-neutral-600">
            {assignment.savedCategoryIds.length}{" "}
            määratud
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          <div className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
          <div className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="font-black text-red-950">
            Poe-rubriike ei saanud laadida
          </p>

          <p className="mt-2 text-sm leading-6 text-red-800">
            {error}
          </p>
        </div>
      ) : null}

      {!loading &&
      !error &&
      categories.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-[#fbfbfa] p-5">
          <p className="font-black">
            Aktiivsel identiteedil pole poe
            rubriike
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Rubriike saab lisada Minu ala poe
            ülesehituse plokis.
          </p>
        </div>
      ) : null}

      {!loading &&
      !error &&
      categories.length > 0 &&
      assignment.savedCategoryIds.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-[#fbfbfa] p-5">
          <p className="font-black">
            Sellele kuulutusele pole poe-rubriike
            määratud
          </p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Tühi määrang on lubatud. Kuulutus jääb
            endiselt Selqiro üldisesse kategooriasse.
          </p>
        </div>
      ) : null}

      {!loading &&
      !error &&
      assignedCategories.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {assignedCategories.map((category) => (
            <div
              key={category.id}
              className="rounded-2xl border border-neutral-200 bg-[#fbfbfa] p-4"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
                {category.level === "root"
                  ? "Ülemrubriik"
                  : "Alamrubriik"}
              </p>

              <p className="mt-2 break-words font-black leading-6">
                {category.label}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {!loading &&
      !error &&
      missingCategoryCount > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="font-black text-amber-950">
            {missingCategoryCount} rubriigiseost ei
            saanud kuvada
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-900">
            Seos ei vasta aktiivse identiteedi
            praegusele rubriigiloendile. Seda ei
            muudeta enne salvestamisfunktsiooni
            lisamist.
          </p>
        </div>
      ) : null}
    </section>
  );
}
