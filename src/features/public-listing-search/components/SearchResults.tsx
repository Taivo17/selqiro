"use client";

import { renderUiMessage } from "@/lib/i18n/interfaceMessage";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { publicUiMessages } from "@/lib/i18n/catalogs/publicUi";


import type { PublicSearchPage } from "../../../entities/listing/model/publicSearchResponse";
import { PUBLIC_SEARCH_PAGE_SIZE, formatSearchCount } from "../../../entities/listing/model/publicSearch";
import SearchResultCard from "./SearchResultCard";

export default function SearchResults({page, loading, error, offset, onPage, onRetry, onReset}: {
  page: PublicSearchPage | null; loading: boolean; error: string | null; offset: number;
  onPage: (offset: number) => void; onRetry: () => void; onReset: () => void;
}) {
  const { language: uiLanguage, t } = useV2Translation(publicUiMessages);

  const button = "min-h-11 rounded-full border border-neutral-300 bg-white px-5 py-2 text-sm font-bold disabled:opacity-40";
  return <div aria-busy={loading}>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <h2 className="text-xl font-black">{t("search_results")}</h2>
      <p role="status" className="text-sm text-neutral-600">{loading ? t("searching") : page
        ? t(page.totalCount === "1" ? "listing_count_one" : "listing_count_other", {count: formatSearchCount(page.totalCount, uiLanguage)}) : ""}</p>
    </div>
    {loading ? <div aria-hidden="true" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({length: 6}, (_, i) => <div key={i} className="rounded-[26px] border border-neutral-200 bg-white p-3">
        <div className="aspect-[4/3] rounded-[20px] bg-neutral-100 md:aspect-[16/10]" />
        <div className="my-4 h-6 w-3/4 rounded bg-neutral-100" /><div className="my-4 h-5 w-1/2 rounded bg-neutral-100" />
      </div>)}
    </div> : null}
    {!loading && error ? <div role="alert" className="space-y-4 rounded-2xl border border-red-200 bg-white p-5">
      <h3 className="font-bold">{t("could_not_load_listings")}</h3><p>{renderUiMessage(uiLanguage, error)}</p>
      <button type="button" className={button} onClick={onRetry}>{t("try_again")}</button>
      <button type="button" className={button + " ml-2"} onClick={onReset}>{t("start_again")}</button>
    </div> : null}
    {!loading && page && !page.items.length ? <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
      <h3 className="text-lg font-bold">{t("no_listings_found")}</h3>
      <p className="text-sm text-neutral-600">{t("try_fewer_keywords_or_a_broader_category_and_location")}</p>
      {offset > 0 ? <button type="button" className={button} onClick={() => onPage(0)}>{t("first_page")}</button> : null}
      <button type="button" className={button} onClick={onReset}>{t("clear_search")}</button>
    </div> : null}
    {!loading && page && page.items.length > 0 ? <>
      <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
        {page.items.map(item => <SearchResultCard key={(item.contentType ?? "listing") + ":" + item.id} item={item} />)}
      </div>
      <nav aria-label={t("search_result_pages")} className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={button} disabled={!offset} onClick={() => onPage(Math.max(0, offset - PUBLIC_SEARCH_PAGE_SIZE))}>{t("previous")}</button>
        <span className="text-sm text-neutral-600">{formatSearchCount(String(offset + 1), uiLanguage)}–{formatSearchCount(String(offset + page.items.length), uiLanguage)}</span>
        <button type="button" className={button} disabled={page.nextOffset === null}
          onClick={() => {if (page.nextOffset !== null) onPage(page.nextOffset);}}>{t("next")}</button>
      </nav>
      {page.windowLimitReached ? <p role="status" className="mt-4 text-sm">{t("there_are_many_results_refine_your_search_to_see_more")}</p> : null}
    </> : null}
  </div>;
}
