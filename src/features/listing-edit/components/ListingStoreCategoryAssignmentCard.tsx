"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingEditMessages, translateListingEditMessage } from "../model/listingEditMessages";

import { useMemo } from "react";
import { useMyAreaStoreCategories } from "../../my-area/model/useMyAreaStoreCategories";
import { useListingStoreCategoryAssignment } from "../model/useListingStoreCategoryAssignment";
import ListingStoreCategorySelector from "./ListingStoreCategorySelector";

type ListingStoreCategoryAssignmentCardProps = {
  listingId: string;
};

export default function ListingStoreCategoryAssignmentCard({
  listingId,
}: ListingStoreCategoryAssignmentCardProps) {
  const { language, t } = useV2Translation(listingEditMessages);

  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useMyAreaStoreCategories();

  const assignment =
    useListingStoreCategoryAssignment({
      listingId,
    });

  const availableCategoryIdSet = useMemo(
    () =>
      new Set(
        categories.map(
          (category) => category.id
        )
      ),
    [categories]
  );

  const missingCategoryCount = useMemo(
    () =>
      assignment.selectedCategoryIds.filter(
        (categoryId) =>
          !availableCategoryIdSet.has(
            categoryId
          )
      ).length,
    [
      assignment.selectedCategoryIds,
      availableCategoryIdSet,
    ]
  );

  const assignmentPending =
    !assignment.loaded &&
    !assignment.error;

  const loading =
    categoriesLoading ||
    assignment.loading ||
    assignmentPending;

  const loadError =
    categoriesError ||
    (!assignment.loaded
      ? assignment.error
      : null);

  const actionError =
    assignment.loaded
      ? assignment.error
      : null;

  const interactionDisabled =
    loading ||
    !assignment.loaded ||
    assignment.saving;

  const saveDisabled =
    interactionDisabled ||
    !assignment.dirty ||
    missingCategoryCount > 0;

  async function handleSave() {
    try {
      await assignment.saveSelection();
    } catch {
      // Hook stores and exposes the user-facing error.
    }
  }

  return (
    <section className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">{t("storeSections")}</p>

          <h2 className="mt-2 text-2xl font-black">{t("assignStoreSections")}</h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">{t("storeSectionHelp")}</p>
        </div>

        {!loading && !loadError ? (
          <span className="w-fit shrink-0 rounded-full bg-neutral-100 px-3 py-2 text-xs font-black text-neutral-600">
            {t("selectedSectionCount", { count: assignment.selectedCategoryIds.length })}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-[24px] bg-neutral-100"
            />
          ))}
        </div>
      ) : null}

      {!loading && loadError ? (
        <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="font-black text-red-950">{t("storeSectionLoadTitle")}</p>

          <p className="mt-2 text-sm leading-6 text-red-800">
            {categoriesError ? t("storeSectionLoadTitle") : translateListingEditMessage(language, loadError)}
          </p>

          <p className="mt-2 text-xs leading-5 text-red-700">{t("existingLinksPreserved")}</p>
        </div>
      ) : null}

      {!loading &&
      !loadError &&
      categories.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-[#fbfbfa] p-5">
          <p className="font-black">{t("noStoreSections")}</p>

          <p className="mt-2 text-sm leading-6 text-neutral-500">{t("addStoreSectionsHelp")}</p>
        </div>
      ) : null}

      {!loading &&
      !loadError &&
      categories.length > 0 ? (
        <ListingStoreCategorySelector
          categories={categories}
          selectedCategoryIds={
            assignment.selectedCategoryIds
          }
          disabled={interactionDisabled}
          onToggleCategory={
            assignment.toggleCategory
          }
        />
      ) : null}

      {!loading &&
      !loadError &&
      missingCategoryCount > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="font-black text-amber-950">
            {t("missingSectionCount", { count: missingCategoryCount })}
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-900">{t("restoreStoreSelectionHelp")}</p>
        </div>
      ) : null}

      {!loading &&
      !loadError &&
      categories.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-[#fbfbfa] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-black">
                {assignment.dirty
                  ? t("storeSelectionUnsaved")
                  : t("storeSelectionSaved")}
              </p>

              <p className="mt-1 text-sm leading-6 text-neutral-500">{t("storeSectionsSavedSeparately")}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  assignment.clearSelection
                }
                disabled={
                  interactionDisabled ||
                  assignment
                    .selectedCategoryIds
                    .length === 0
                }
                className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-black text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >{t("clearSelection")}</button>

              <button
                type="button"
                onClick={
                  assignment.resetSelection
                }
                disabled={
                  interactionDisabled ||
                  !assignment.dirty
                }
                className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-black text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >{t("restore")}</button>

              <button
                type="button"
                onClick={() =>
                  void handleSave()
                }
                disabled={saveDisabled}
                className="rounded-full bg-black px-5 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
              >
                {assignment.saving
                  ? t("savingDots")
                  : t("saveSections")}
              </button>
            </div>
          </div>

          {actionError ? (
            <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
              {translateListingEditMessage(language, actionError)}
            </p>
          ) : null}

          {assignment.success ? (
            <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold leading-6 text-emerald-800">
              {translateListingEditMessage(language, assignment.success, assignment.successParams)}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
