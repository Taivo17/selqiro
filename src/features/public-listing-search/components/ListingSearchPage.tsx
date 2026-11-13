"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { publicUiMessages } from "@/lib/i18n/catalogs/publicUi";


import { useEffect, useRef, useState } from "react";
import { uiMessage } from "../../../../lib/i18n/interfaceMessage";
import { useViewerReadScope } from "../../../shared/provider-controls/useViewerReadScope";
import ProviderControlsBoundary from "../../viewer-provider-controls/components/ProviderControlsBoundary";
import { EMPTY_PUBLIC_SEARCH, publicCategoryPath, publicFilterCount, publicSearchKey, searchConditionLabel,
  type PublicSearchFields } from "../../../entities/listing/model/publicSearch";
import V2DiscoveryTypeSwitcher from "../../v2-shell/components/V2DiscoveryTypeSwitcher";
import { usePublicSearchUrl } from "../model/usePublicSearchUrl";
import { usePublicListingSearch } from "../model/usePublicListingSearch";
import { usePublicSearchReturn } from "../model/usePublicSearchReturn";
import SearchFilters from "./SearchFilters";
import SearchResults from "./SearchResults";

export default function ListingSearchPage() {
  return <ProviderControlsBoundary><ListingSearchContent /></ProviderControlsBoundary>;
}
function ListingSearchContent() {
  const { language: uiLanguage, t } = useV2Translation(publicUiMessages);

  const url = usePublicSearchUrl();
  const audience = useViewerReadScope("discovery");
  const [open, setOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(80);
  const resultRef = useRef<HTMLElement>(null);
  const moveToResults = useRef(false);
  const data = usePublicListingSearch(url.input, audience.key, audience.ready && !url.error);
  const loading = (!audience.ready && !audience.error) || data.loading;
  const error = audience.error ? uiMessage("could_not_load_listings_check_your_connection_and_try_again") : data.error;
  const count = publicFilterCount(url.input);
  const searchKey = publicSearchKey(url.input);
  usePublicSearchReturn(!loading && !data.error && !url.error && !!data.page && !open,
    data.page?.items.map(i => i.id) || [], data.key);

  useEffect(() => {
    // Read the actual shared header size, including narrow layouts and zoom.
    const header = document.querySelector<HTMLElement>("[data-v2-header]");
    if (!header) return;
    const measure = () => setHeaderHeight(Math.ceil(header.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure); observer.observe(header);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (open || loading || !moveToResults.current) return;
    moveToResults.current = false;
    resultRef.current?.scrollIntoView({block: "start", behavior: "auto"});
  }, [open, loading, searchKey]);
  function change(fields: Partial<PublicSearchFields>) {
    const next = {...url.input, ...fields, offset: 0};
    if (publicSearchKey(next) !== searchKey) moveToResults.current = true;
    url.change(fields);
  }
  function clearFilters() {
    change({category: "", subcategory: "", detailCategory: "", condition: "", location: ""});
  }
  const category = publicCategoryPath(url.input, uiLanguage);
  const condition = searchConditionLabel(url.input.condition, uiLanguage);
  return <div className="min-w-0 space-y-5">
    <V2DiscoveryTypeSwitcher active="products" />
    <div><h1 className="text-3xl font-black sm:text-4xl">{t("listings")}</h1>
      <p className="mt-2 text-sm text-neutral-600">{t("search_by_keywords_and_refine_the_results_with_filters")}</p></div>
    <div className="sticky z-30 -mx-1 rounded-2xl border border-amber-200 bg-white p-2 shadow-sm" style={{top: headerHeight + 8}}>
      <form role="search" className="flex min-w-0 items-center gap-2" onSubmit={e => e.preventDefault()}>
        <label className="min-w-0 flex-1"><span className="sr-only">{t("search_listings")}</span>
          <input type="search" value={url.input.query} maxLength={160} placeholder={t("search_listings_2")} aria-describedby="public-search-help"
            className="min-h-11 w-full min-w-0 rounded-xl bg-neutral-50 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-amber-500"
            onChange={e => change({query: e.target.value})} />
        </label>
        <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}
          className="min-h-11 shrink-0 rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-900">{t("filters")}{count ? ` (${count})` : ""}</button>
      </form>
    </div>
    <p id="public-search-help" className="text-sm leading-6 text-neutral-600">{t("enter_a_name_brand_model_or_key_feature_such_as_audi_a4_automatic_all_enter")}</p>
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {category ? <button type="button" className="min-h-10 rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-left"
        aria-label={t("remove_category") + category} onClick={() => change({category: "", subcategory: "", detailCategory: ""})}>{category} ×</button> : null}
      {condition ? <button type="button" className="min-h-10 rounded-full border border-neutral-300 bg-white px-3 py-2"
        aria-label={t("remove_condition") + condition} onClick={() => change({condition: ""})}>{condition} ×</button> : null}
      {url.input.location.trim() ? <button type="button" className="min-h-10 rounded-full border border-neutral-300 bg-white px-3 py-2 text-left"
        aria-label={t("remove_location_filter")} onClick={() => change({location: ""})}>{url.input.location} ×</button> : null}
      <span className="ml-auto text-neutral-500">{t("newest_first")}</span>
    </div>
    <section ref={resultRef} className="relative min-w-0 overflow-hidden rounded-[30px] border border-amber-200 bg-amber-50 p-3 pt-5 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-amber-500 before:content-[''] sm:p-6" style={{scrollMarginTop: headerHeight + 88}}>
      <SearchResults page={url.error ? null : data.page} loading={loading && !url.error} error={url.error || error}
        offset={url.input.offset} onRetry={audience.error ? audience.refresh : data.retry}
        onReset={() => {moveToResults.current = true; url.replace({...EMPTY_PUBLIC_SEARCH});}}
        onPage={offset => {moveToResults.current = true; url.goToOffset(offset);}} />
    </section>
    {open ? <SearchFilters input={url.input} onChange={change} onClear={clearFilters} onClose={() => setOpen(false)} /> : null}
  </div>;
}
