"use client";
import Link from "next/link";
import { useMemo, type MouseEvent } from "react";
import V2DiscoveryTypeSwitcher from "../../../src/features/v2-shell/components/V2DiscoveryTypeSwitcher";
import { useV2Translation } from "../../../src/shared/i18n/V2LanguageProvider";
import { serviceEditorMessages } from "../../../src/features/service-editor/model/serviceEditorMessages";
import { useServiceDiscoveryView } from "../../../src/features/service-navigation/model/useServiceDiscoveryView";
import { isPlainServiceClick } from "../../../src/features/service-navigation/model/serviceReturnContext";
import { serviceLocationLabel, servicePriceLabel } from "../../../src/entities/service/model/publicService";
import { useServiceCategories } from "../../../src/features/service-category-selection/model/useServiceCategories";
import { buildServiceCategoryTree } from "../../../src/entities/service-category/model/types";

const input = "min-h-12 w-full min-w-0 rounded-full border border-neutral-200 bg-white px-4 py-3 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";
export default function V2ServicesPage() {
  const {language, t} = useV2Translation(serviceEditorMessages), categories = useServiceCategories();
  const tree = useMemo(() => buildServiceCategoryTree(categories.categories), [categories.categories]);
  const {filters: {query, category, subcategory, city}, results, change, clear, remember} = useServiceDiscoveryView();
  const categoryLabel = (code: string | null) => {const item = categories.categories.find(value => value.code === code); return item ? language === "et" ? item.labelEt : item.labelEn : code;};
  const children = tree.childrenByParent.get(category) ?? [];
  const rememberCard = (event: MouseEvent<HTMLAnchorElement>, serviceId: string) => {
    if (isPlainServiceClick(event)) remember(serviceId, event.currentTarget.getBoundingClientRect().top);
  };
  return <div className="min-w-0 space-y-8">
    <V2DiscoveryTypeSwitcher active="services" />
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-4xl font-black tracking-tight sm:text-5xl">{t("services")}</h1><p className="mt-3 leading-7 text-neutral-600">{t("discoveryHelp")}</p></div>
      <Link href="/v2/services/new" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-black px-6 py-3 font-bold text-white">{t("addService")}</Link>
    </header>
    <section aria-label={t("browse")} className="rounded-[28px] border border-teal-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]">
        <label className="block min-w-0"><span className="sr-only">{t("search")}</span><input type="search" maxLength={200} value={query} onChange={event => change({query: event.target.value})} placeholder={t("search")} className={input} /></label>
        <label className="block min-w-0"><span className="sr-only">{t("category")}</span><select value={category} className={input} disabled={categories.loading || !!categories.error} onChange={event => change({category: event.target.value, subcategory: ""})}>
          <option value="">{t("allCategories")}</option>{tree.roots.map(item => <option key={item.code} value={item.code}>{language === "et" ? item.labelEt : item.labelEn}</option>)}
        </select></label>
        <label className="block min-w-0"><span className="sr-only">{t("city")}</span><input type="search" maxLength={160} value={city} onChange={event => change({city: event.target.value})} placeholder={t("allLocations")} className={input} /></label>
      </div>
      {children.length ? <label className="mt-3 block max-w-lg"><span className="sr-only">{t("subcategory")}</span><select value={subcategory} onChange={event => change({subcategory: event.target.value})} className={input}>
        <option value="">{t("noSubcategory")}</option>{children.map(item => <option key={item.code} value={item.code}>{language === "et" ? item.labelEt : item.labelEn}</option>)}
      </select></label> : null}
      {categories.error ? <p role="status" className="mt-3 text-sm text-neutral-600">{t("categoryError")} <button type="button" onClick={() => void categories.refresh()} className="font-bold underline">{t("retry")}</button></p> : null}
      {query || category || city ? <button type="button" className="mt-3 min-h-10 px-2 text-sm font-bold underline" onClick={clear}>{t("clearFilters")}</button> : null}
    </section>
    <section aria-busy={results.loading} className="min-w-0 rounded-[30px] border border-teal-200 bg-teal-50/60 p-4 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black">{t("results")}</h2>
        {results.page ? <p className="text-sm text-neutral-600">{t("resultCount", {count: results.page.totalCount})}</p> : null}</header>
      {results.loading && !results.page ? <p role="status" className="py-8">{t("loading")}</p> : null}
      {results.error ? <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-white p-4"><p>{t("publicError")}</p>
        <button type="button" className="mt-3 min-h-11 rounded-full border px-5 font-bold" onClick={results.retry}>{t("retry")}</button></div> : null}
      {results.page?.items.length === 0 && !results.loading ? <div className="rounded-2xl bg-white p-6"><h3 className="text-xl font-bold">{t("emptyPublic")}</h3>
        <p className="mt-2 text-neutral-600">{t("emptyPublicHelp")}</p><button type="button" className="mt-4 min-h-11 rounded-full border px-5 font-bold" onClick={clear}>{t("clearFilters")}</button></div> : null}
      {results.firstOffset > 0 ? <div className="mb-5"><button type="button" disabled={results.loading}
        onClick={() => void results.loadPrevious()} className="min-h-12 rounded-full border border-teal-300 bg-white px-6 py-3 font-bold disabled:opacity-50">{t("earlierResults")}</button></div> : null}
      <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {results.page?.items.map(service => <Link key={service.id} href={`/v2/service/${service.id}`} prefetch={false}
          data-service-card-id={service.id} onClick={event => rememberCard(event, service.id)} aria-label={t("openService", {title: service.title})}
          className="group min-w-0 overflow-hidden rounded-[26px] border border-black/5 bg-white p-3 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600">
          {/* Already processed public media must retain the endpoint's publication checks. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {service.images[0] ? <img src={service.images[0].url} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-[20px] object-cover" referrerPolicy="no-referrer" />
            : <div className="flex aspect-[4/3] items-center justify-center rounded-[20px] bg-neutral-100 text-neutral-500">{t("noImage")}</div>}
          <div className="space-y-2 px-1 pb-2 pt-4"><p className="text-xs font-bold text-teal-800">{[categoryLabel(service.category), categoryLabel(service.subcategory)].filter(Boolean).join(" › ")}</p>
            <h3 className="break-words text-xl font-black group-hover:underline">{service.title}</h3><p className="line-clamp-2 break-words text-sm leading-6 text-neutral-600">{service.description}</p>
            <p className="text-sm text-neutral-500">{service.sellerName}</p><p className="text-sm text-neutral-500">{serviceLocationLabel(service) || t("locationMissing")}</p>
            <p className="pt-2 text-xl font-black">{servicePriceLabel(service, language)}</p></div>
        </Link>)}
      </div>
      {results.page?.hasMore ? <div className="mt-6 text-center"><button type="button" disabled={results.loading} onClick={() => void results.loadMore()} className="min-h-12 rounded-full border border-teal-300 bg-white px-6 py-3 font-bold disabled:opacity-50">{t(results.loading ? "loading" : "loadMore")}</button></div> : null}
    </section>
  </div>;
}
