"use client";
import { useMemo } from "react";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { publicUiMessages } from "../../../../lib/i18n/catalogs/publicUi";
import type { PublicProfile } from "../../../entities/profile/model/types";
import { useServiceCategories } from "../../service-category-selection/model/useServiceCategories";
import { PROFILE_SERVICE_PREVIEW_SIZE, usePublicProfileServiceView } from "../model/usePublicProfileServiceView";
import { publicProfileCategoryMessages } from "../model/publicProfileCategoryMessages";
import PublicProfileStoreCategoryFilter from "./PublicProfileStoreCategoryFilter";
import ServiceCard from "./PublicProfileServiceCard";

const button = "min-h-11 rounded-full border border-teal-200 bg-white px-4 py-2.5 text-sm font-black text-teal-700 shadow-sm hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 disabled:opacity-40";

export default function PublicProfileServicesSection({profile, expanded, onExpandedChange}: {
  profile: PublicProfile; expanded: boolean; onExpandedChange: (expanded: boolean) => void;
}) {
  const {language, t} = useV2Translation(publicUiMessages), {t: contextText} = useV2Translation(publicProfileCategoryMessages);
  const view = usePublicProfileServiceView(profile, expanded, onExpandedChange);
  const {services, loading, error, categories, results} = view;
  const {categories: serviceCategories} = useServiceCategories();
  const categoryLabelByCode = useMemo(() => new Map(serviceCategories.map(category => [category.code,
    language === "et" ? category.labelEt || category.labelEn : category.labelEn])), [serviceCategories, language]);
  if (!profile.identityId) return null;
  if (!loading && !error && view.selectedCategoryId === null && results.page?.totalCount === "0") return null;
  const total = results.page?.totalCount ?? "0";
  const canExpand = expanded || categories.loading || !!categories.error || BigInt(total) > BigInt(PROFILE_SERVICE_PREVIEW_SIZE) || categories.categories.length > 0
    || services.some(service => service.images.length > 1 || service.description.length > 180);
  return <section data-profile-services aria-busy={loading}
    className="relative min-w-0 overflow-hidden rounded-[30px] border border-teal-200 bg-teal-50 p-5 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-teal-500 before:content-[''] sm:p-6">
    <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="inline-flex rounded-full border border-teal-200 bg-teal-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-teal-700">{t("services")}</p>
        <h2 className="mt-2 break-words text-2xl font-black tracking-tight md:text-3xl">{t("services_offered")}</h2>
      </div>
      {canExpand ? <button type="button" className={button} aria-expanded={expanded} onClick={() => onExpandedChange(!expanded)}>
        {expanded ? t("show_less") : results.page ? t("view_all_count", {count: total}) : t("view_details")}</button> : null}
    </header>
    {expanded ? <PublicProfileStoreCategoryFilter contentKind="services" categories={categories.categories}
      loading={categories.loading} error={categories.error} selectedCategoryId={view.selectedCategoryId}
      expandedRootId={view.expandedRootId} onSelectAll={view.selectAll} onSelectRoot={view.selectRoot}
      onSelectChild={view.selectChild} onRetry={categories.retry} /> : null}
    {view.categoryRemoved || view.pageChanged ? <p role="status" className="mb-4 text-sm text-neutral-600">{contextText(view.categoryRemoved ? "categoryRemoved" : "pageChanged")}</p> : null}
    {loading ? <p role="status" className="py-8 text-sm text-neutral-600">{t("searching")}</p> : null}
    {!loading && error ? <div role="alert" className="rounded-[22px] border border-red-100 bg-red-50 p-5">
      <h3 className="font-black text-red-950">{t("could_not_load_services")}</h3>
      <button type="button" className={`${button} mt-3`} onClick={results.retry}>{t("try_again")}</button>
    </div> : null}
    {!loading && !error && services.length === 0 ? <div className="rounded-[22px] border border-dashed border-neutral-200 bg-white p-6 text-center">
      <h3 className="font-black">{contextText("noServicesCategory")}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-500">{contextText("chooseServices")}</p>
    </div> : null}
    {!loading && !error && services.length > 0 ? <div ref={view.horizontalScrollRef}
      className={expanded ? "grid min-w-0 gap-4 sm:grid-cols-2" : "w-full max-w-full overflow-x-auto overscroll-x-contain pb-2"}>
      {expanded ? services.map(service => <ServiceCard key={service.id} service={service} onOpen={view.remember} expanded categoryLabelByCode={categoryLabelByCode} />)
        : <div className="flex w-max gap-4 px-1">{services.map(service => <ServiceCard key={service.id} service={service}
          onOpen={view.remember} expanded={false} categoryLabelByCode={categoryLabelByCode} />)}</div>}
    </div> : null}
    {expanded && !loading && !error ? <p role="status" className="mt-4 text-sm text-neutral-600">{contextText("serviceCount", {count: total})}</p> : null}
    {expanded && !loading && !error && (view.resultOffset > 0 || results.page?.hasMore) ? <nav aria-label={t("search_result_pages")} className="mt-5 flex flex-wrap justify-between gap-3">
      <button type="button" disabled={view.resultOffset === 0} onClick={view.previousPage} className={button}>{t("previous")}</button>
      <button type="button" disabled={results.page?.nextOffset == null} onClick={view.nextPage} className={button}>{t("next")}</button>
    </nav> : null}
    {expanded && results.page?.windowLimitReached ? <p role="status" className="mt-4 text-sm text-neutral-600">{t("there_are_many_results_refine_your_search_to_see_more")}</p> : null}
  </section>;
}
