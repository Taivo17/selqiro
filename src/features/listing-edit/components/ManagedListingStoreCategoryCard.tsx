"use client";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingEditMessages, translateListingEditMessage } from "../model/listingEditMessages";
import { useManagedListingStoreCategories } from "../model/useManagedListingStoreCategories";
import ListingStoreCategorySelector from "./ListingStoreCategorySelector";
import { storeCategoryManagementMessages } from "../../store-category-management/model/storeCategoryManagementMessages";

export default function ManagedListingStoreCategoryCard({ actor, listingId, blocked = false }: {
  actor: PublicationActor; listingId: string; blocked?: boolean;
}) {
  const { language, t } = useV2Translation(listingEditMessages);
  const { t: managementText } = useV2Translation(storeCategoryManagementMessages);
  const assignment = useManagedListingStoreCategories({ actor, listingId, blocked });
  const button = "rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40";
  return <section className="space-y-4 rounded-[30px] border bg-white p-6" aria-label={t("storeSections")}
    aria-busy={assignment.loading || assignment.saving}>
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
      {translateListingEditMessage(language, assignment.error)}
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
        {translateListingEditMessage(language, assignment.message, { count: assignment.savedCategoryIds.length })}
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
