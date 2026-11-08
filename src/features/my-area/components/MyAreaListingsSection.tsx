"use client";

import { renderUiMessage } from "@/lib/i18n/interfaceMessage";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { accountUiMessages } from "@/lib/i18n/catalogs/accountUi";


import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {v2IntegrationEnabled} from "../../../shared/config/v2Integration";
import { useMyAreaListings, type MyAreaListingsStatusFilter } from "../model/useMyAreaListings";
import { useMyAreaStoreCategories } from "../model/useMyAreaStoreCategories";
import { useListingActivityClock } from "../model/useListingActivityClock";
import StoreCategoryHierarchyFilter from "../../store-category-filter/components/StoreCategoryHierarchyFilter";
import MyAreaHorseOfferRow from "./MyAreaHorseOfferRow";
import MyAreaListingRow from "./MyAreaListingRow";
import ListingRenewalConfirmation from "./ListingRenewalConfirmation";
import PublicationCleanupStatus from "./PublicationCleanupStatus";

const LISTING_PREVIEW_LIMIT = 5;
const ALL_CATEGORIES = "all";
const control = "min-h-11 min-w-0 rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50";

export default function MyAreaListingsSection() {
  const { language: uiLanguage, t } = useV2Translation(accountUiMessages);

  const listingManagementLimit = v2IntegrationEnabled() ? 100 : 500;
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MyAreaListingsStatusFilter>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState(ALL_CATEGORIES);
  const [showAll, setShowAll] = useState(false);
  const state = useMyAreaListings({ limit: listingManagementLimit, offset: 0, statusFilter,
    searchQuery: debouncedSearch, storeCategoryFilter: selectedCategoryId === ALL_CATEGORIES ? null : selectedCategoryId });
  const { listings, loading, error, session } = state;
  const { categories, loading: categoriesLoading, error: categoriesError } = useMyAreaStoreCategories();
  const now = useListingActivityClock();
  const lastIdentity = useRef<string | null>(null);
  useEffect(() => {
    if (!categoriesLoading && selectedCategoryId !== ALL_CATEGORIES && !categories.some(c => c.id === selectedCategoryId)) {
      setSelectedCategoryId(ALL_CATEGORIES); setShowAll(false);
    }
  }, [categories, categoriesLoading, selectedCategoryId]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  // Same-filter refresh after renewal does not collapse an expanded list.
  useEffect(() => { setShowAll(false); }, [statusFilter, selectedCategoryId, debouncedSearch]);
  useEffect(() => {
    const id = state.actor?.identityId;
    if (id && id !== lastIdentity.current) { lastIdentity.current = id; setShowAll(false); }
  }, [state.actor?.identityId]);
  const editingSearch = searchInput.trim() !== debouncedSearch;
  const busy = state.busyKey !== null;
  const disabled = busy || loading || editingSearch || state.needsReload || state.confirmation !== null;
  const visible = showAll ? listings : listings.slice(0, LISTING_PREVIEW_LIMIT);
  const capped = listings.length >= listingManagementLimit;
  const filtersActive = !!searchInput.trim() || statusFilter !== "all" || selectedCategoryId !== ALL_CATEGORIES;
  function clearFilters() {
    setSearchInput(""); setDebouncedSearch(""); setStatusFilter("all"); setSelectedCategoryId(ALL_CATEGORIES); setShowAll(false);
  }
  return <section className="relative min-w-0 overflow-hidden rounded-[30px] border border-amber-200 bg-amber-50 p-4 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-amber-500 before:content-[''] sm:p-6">
    <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-800">{t("listings")}</p>
        <h2 className="mt-2 text-2xl font-black">{t("your_listings")}</h2>
        {v2IntegrationEnabled() ? <Link href="/v2/messages" className="mt-2 inline-block text-sm font-bold underline">{t("open_conversations")}</Link> : null}</div>
      {listings.length > LISTING_PREVIEW_LIMIT ? <button type="button" disabled={busy} onClick={() => setShowAll(v => !v)}
        className="min-h-11 w-full rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-bold text-amber-900 sm:w-auto">
        {showAll ? t("show_less") : capped ? t("show_loaded_count", {count: listings.length}) : t("view_all_count", {count: listings.length})}
      </button> : null}
    </div>
    <div className="mb-5 rounded-3xl border border-amber-200 bg-white p-4">
      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
        <input aria-label={t("search_your_listings")} value={searchInput} disabled={busy}
          onChange={e => setSearchInput(e.target.value)} placeholder={t("search_your_listings_2")} className={control} />
        <select aria-label={t("listing_status")} value={statusFilter} disabled={busy}
          onChange={e => setStatusFilter(e.target.value as MyAreaListingsStatusFilter)} className={control}>
          <option value="all">{t("all_statuses")}</option>
          <option value="active">{t("active_and_expired")}</option>
          <option value="paused">{t("paused")}</option><option value="sold">{t("sold")}</option>
        </select>
        {filtersActive ? <button type="button" disabled={busy} onClick={clearFilters} className={control}>{t("clear")}</button> : null}
      </div>
      {categories.length > 0 ? <fieldset disabled={busy} className="min-w-0">
        <legend className="sr-only">{t("your_categories")}</legend>
        <StoreCategoryHierarchyFilter categories={categories} selectedCategoryId={selectedCategoryId} allCategoryId={ALL_CATEGORIES}
          onSelectCategory={id => { if (!busy) { setSelectedCategoryId(id); setShowAll(false); } }} />
      </fieldset> : null}
      {categoriesLoading ? <p className="mt-3 text-xs text-neutral-500">{t("loading_categories")}</p> : null}
      {categoriesError ? <p className="mt-3 text-xs text-amber-800">{t("could_not_load_categories")} {renderUiMessage(uiLanguage, categoriesError)}</p> : null}
      <p className="mt-3 text-xs leading-5 text-neutral-600">
        {t("active_and_expired_includes_listings_whose_expiry_date_has_passed_expired_l")} </p>
      <p role="status" className="mt-2 text-xs font-semibold text-neutral-500">
        {loading || editingSearch ? t("searching_listings") : error ? t("the_list_needs_to_be_reloaded")
          : capped ? t("first_matches_loaded", {count: listings.length})
          : t("listings_loaded", {count: listings.length})}
      </p>
    </div>
    {state.notice ? <p role="status" className="mb-4 rounded-2xl bg-neutral-50 p-4 text-sm">{renderUiMessage(uiLanguage, state.notice)}</p> : null}
    {state.problem || error ? <div role="alert" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm leading-6">{renderUiMessage(uiLanguage, state.problem || error)}</p>
      <button type="button" disabled={busy || loading} onClick={() => { void session.reload(); }} className={`${control} mt-3`}>
        {t("reload_list")} </button>
    </div> : null}
    <div className="mb-2 hidden grid-cols-[minmax(0,1fr)_105px_150px] px-1 text-xs font-bold uppercase tracking-wider text-neutral-400 md:grid">
      <span>{t("listing_2")}</span><span className="text-right">{t("price_budget")}</span><span className="text-center">{t("actions")}</span>
    </div>
    {loading ? <p role="status" className="p-5 text-sm text-neutral-600">{t("loading_your_listings")}</p> : null}
    {!loading && !error && !state.problem && listings.length === 0 ? <div className="rounded-3xl border border-dashed border-amber-200 bg-white p-6 text-center">
      <h3 className="font-bold">{t("no_listings_found")}</h3><p className="mt-2 text-sm text-neutral-600">{t("change_your_search_status_or_category")}</p>
    </div> : null}
    {!loading && !error ? <div className="divide-y divide-black/5 rounded-2xl bg-white">
      {visible.map(listing => listing.contentType === "horse_offer"
        ? <MyAreaHorseOfferRow key={listing.key} item={listing} now={now} busy={state.busyKey === listing.key}
            disabled={disabled} activeIdentityId={state.actor?.identityId ?? null} ownerActor={state.actor}
            onRenew={() => session.requestRenewal(listing.key)}
            onStatus={status => { void session.changeStatus(listing.key, status); }} />
        : <MyAreaListingRow key={listing.key} listing={listing} now={now} busy={state.busyKey === listing.key}
            disabled={disabled} activeIdentityId={state.actor?.identityId ?? null} ownerActor={state.actor}
            onRenew={() => session.requestRenewal(listing.key)}
            onStatus={status => { void session.changeStatus(listing.key, status); }} />)}
    </div> : null}
    {state.confirmation ? <ListingRenewalConfirmation confirmation={state.confirmation} busy={busy}
      onCancel={() => session.cancelRenewal()} onConfirm={() => { void session.confirmRenewal(state.confirmation); }} /> : null}
    {v2IntegrationEnabled() && state.actor ? <PublicationCleanupStatus actor={state.actor} /> : null}
  </section>;
}
