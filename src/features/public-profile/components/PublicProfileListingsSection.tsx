"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { publicUiMessages } from "../../../../lib/i18n/catalogs/publicUi";
import type { PublicProfile } from "../../../entities/profile/model/types";
import { PROFILE_LISTING_PREVIEW_SIZE, usePublicProfileListingView } from "../model/usePublicProfileListingView";
import PublicProfileListingCard from "./PublicProfileListingCard";
import PublicProfileStoreCategoryFilter from "./PublicProfileStoreCategoryFilter";

const button = "min-h-11 rounded-full border border-amber-200 bg-white px-4 py-2.5 text-sm font-black text-amber-800 shadow-sm hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-600 disabled:opacity-40";

export default function PublicProfileListingsSection({profile, showAll, onShowAllChange}: {
  profile: PublicProfile; showAll: boolean; onShowAllChange: (value: boolean) => void;
}) {
  const {t} = useV2Translation(publicUiMessages);
  const view = usePublicProfileListingView(profile, showAll, onShowAllChange);
  const {results, loading, categories} = view;
  if (!loading && !results.error && view.selectedCategoryId === null && results.page?.totalCount === "0") return null;
  const total = results.page?.totalCount ?? "0";
  const canExpand = showAll || categories.loading || !!categories.error || BigInt(total) > BigInt(PROFILE_LISTING_PREVIEW_SIZE) || categories.categories.length > 0;
  return <section data-profile-marketplace aria-busy={loading}
    className="relative min-w-0 overflow-hidden rounded-[30px] border border-amber-200 bg-amber-50 p-5 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-amber-500 before:content-[''] sm:p-6">
    <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-800">{t("listings")}</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">{t("this_profile_s_listings")}</h2>
      </div>
      {canExpand ? <button type="button" className={button} aria-expanded={showAll} onClick={() => onShowAllChange(!showAll)}>
        {showAll ? t("view_less") : results.page ? t("view_all_count", {count: total}) : t("view_details")}
      </button> : null}
    </header>
    {showAll ? <PublicProfileStoreCategoryFilter categories={categories.categories}
      loading={categories.loading} error={categories.error} selectedCategoryId={view.selectedCategoryId}
      expandedRootId={view.expandedRootId} onSelectAll={view.selectAll}
      onSelectRoot={view.selectRoot} onSelectChild={view.selectChild} onRetry={categories.retry} /> : null}
    {loading ? <p role="status" className="py-8 text-sm text-neutral-600">{t("searching")}</p> : null}
    {!loading && results.error ? <div role="alert" className="rounded-[22px] border border-red-100 bg-red-50 p-5">
      <h3 className="font-black text-red-950">{t("could_not_load_listings")}</h3>
      <button type="button" className={`${button} mt-3`} onClick={results.retry}>{t("try_again")}</button>
    </div> : null}
    {!loading && !results.error && view.items.length === 0 ? <div className="rounded-[22px] border border-dashed border-neutral-200 bg-white p-6 text-center">
      <h3 className="font-black">{t("no_active_listings_in_this_category")}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-500">{t("choose_another_category_or_show_all_listings")}</p>
    </div> : null}
    {!loading && !results.error && view.visibleItems.length > 0 ? <div ref={view.horizontalScrollRef}
      className={showAll ? "grid min-w-0 gap-4 sm:grid-cols-2" : "flex w-full max-w-full gap-4 overflow-x-auto overscroll-x-contain px-1 pb-2"}>
      {view.visibleItems.map(item => <PublicProfileListingCard key={`${item.contentType}:${item.id}`}
        item={item} expanded={showAll} onOpen={view.openListing} />)}
    </div> : null}
    {showAll && !loading && !results.error && (view.resultOffset > 0 || results.page?.hasMore) ?
      <nav aria-label={t("search_result_pages")} className="mt-5 flex flex-wrap justify-between gap-3">
        <button type="button" disabled={view.resultOffset === 0} onClick={view.previousPage} className={button}>{t("previous")}</button>
        <button type="button" disabled={results.page?.nextOffset == null} onClick={view.nextPage} className={button}>{t("next")}</button>
      </nav> : null}
    {showAll && results.page?.windowLimitReached ? <p role="status" className="mt-4 text-sm text-neutral-600">
      {t("there_are_many_results_refine_your_search_to_see_more")}
    </p> : null}
  </section>;
}
