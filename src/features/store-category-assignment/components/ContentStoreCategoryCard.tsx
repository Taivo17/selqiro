"use client";
import { useEffect } from "react";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingEditMessages, type ListingEditMessageKey } from "../../listing-edit/model/listingEditMessages";
import type { useContentStoreCategories } from "../model/useContentStoreCategories";
import { serviceStoreCategoryMessages } from "../model/contentStoreCategoryMessages";
import ListingStoreCategorySelector from "../../listing-edit/components/ListingStoreCategorySelector";
import { storeCategoryManagementMessages } from "../../store-category-management/model/storeCategoryManagementMessages";

export default function ContentStoreCategoryCard({ assignment, kind, contentId, blocked = false, onPendingChange }: {
  assignment: ReturnType<typeof useContentStoreCategories>; kind: "horse" | "service"; contentId: string;
  blocked?: boolean; onPendingChange?: (pending: boolean) => void;
}) {
  const catalog = kind === "service" ? serviceStoreCategoryMessages : listingEditMessages;
  const { t } = useV2Translation(catalog);
  const { t: managementText } = useV2Translation(storeCategoryManagementMessages);
  const message = (value: string, params?: {count: number}) =>
    t(Object.hasOwn(catalog.en, value) ? value as ListingEditMessageKey : "unknownError", params);
  const pending = assignment.dirty || assignment.saving || assignment.reviewRequired;
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  useEffect(() => () => { onPendingChange?.(false); }, [onPendingChange]);
  const button = "rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40";
  return <section className="space-y-4 rounded-[30px] border bg-white p-6" aria-label={t("storeSections")}
    aria-busy={assignment.loading || assignment.saving} data-horse-store-categories={kind === "horse" ? contentId : undefined}
    data-service-store-categories={kind === "service" ? contentId : undefined}>
    <div>
      <h2 className="text-2xl font-black">{t("storeSections")}</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{t("storeSectionsSavedSeparately")}</p>
      <p className="mt-1 text-sm leading-6 text-neutral-500">{t("storeSectionHelp")}</p>
      <a href="/v2/my-area#my-area-categories" target="_blank" rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">
        {managementText("manageLink")}</a>
    </div>
    {assignment.loading ? <p role="status">{t("storeAssignmentsLoading")}</p> : null}
    {!assignment.loading && assignment.error ? <p role="alert" className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
      {message(assignment.error)}
    </p> : null}
    {assignment.loaded ? <>
      <p className="text-sm font-bold">{t("selectedSectionCount", { count: assignment.selectedCategoryIds.length })}</p>
      {assignment.categories.length > 0 ? <ListingStoreCategorySelector categories={assignment.categories}
        selectedCategoryIds={assignment.selectedCategoryIds} disabled={assignment.disabled} onToggleCategory={assignment.toggleCategory} />
        : <div className="rounded-2xl border border-dashed p-4">
          <p className="font-bold">{t("noStoreSections")}</p>
          <p className="mt-1 text-sm leading-6 text-neutral-500">{t("managedStoreSectionsEmpty")}</p>
        </div>}
      {assignment.missingCategoryCount > 0 ? <p role="status" className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        {t("missingSectionCount", { count: assignment.missingCategoryCount })} {t("restoreStoreSelectionHelp")}
      </p> : null}
      {assignment.reviewRequired ? <p className="text-sm leading-6 text-neutral-600">{t("storeAssignmentReviewHelp")}</p> : null}
      {assignment.message ? <p role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-950">
        {message(assignment.message, { count: assignment.savedCategoryIds.length })}
      </p> : null}
      {assignment.dirty && !assignment.reviewRequired ? <p className="text-sm font-bold">{t("storeSelectionUnsaved")}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={assignment.disabled || assignment.selectedCategoryIds.length === 0}
          onClick={assignment.clearSelection}>{t("clearSelection")}</button>
        <button type="button" className={button} disabled={assignment.disabled || !assignment.dirty}
          onClick={assignment.resetSelection}>{t("restore")}</button>
        <button type="button" className="rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
          disabled={!assignment.canSave} onClick={() => { void assignment.saveSelection(); }}>
          {assignment.saving ? t("savingDots") : t("saveSections")}</button>
      </div>
    </> : null}
    <button type="button" className={button} disabled={blocked || assignment.loading || assignment.saving}
      onClick={() => { void assignment.refresh(); }}>{assignment.reviewRequired ? t("storeCheckSavedSelection") : t("storeRefreshSections")}</button>
  </section>;
}
