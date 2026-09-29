"use client";

import { useEffect, useRef, useState } from "react";
import { useMyAreaListings, type MyAreaListingsStatusFilter } from "../model/useMyAreaListings";
import { useMyAreaStoreCategories } from "../model/useMyAreaStoreCategories";
import { useListingActivityClock } from "../model/useListingActivityClock";
import StoreCategoryHierarchyFilter from "../../store-category-filter/components/StoreCategoryHierarchyFilter";
import MyAreaHorseOfferRow from "./MyAreaHorseOfferRow";
import MyAreaListingRow from "./MyAreaListingRow";
import ListingRenewalConfirmation from "./ListingRenewalConfirmation";

const LISTING_PREVIEW_LIMIT = 5;
const LISTING_MANAGEMENT_LIMIT = 500;
const ALL_CATEGORIES = "all";
const control = "min-h-11 min-w-0 rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-neutral-400 disabled:opacity-50";

export default function MyAreaListingsSection() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MyAreaListingsStatusFilter>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState(ALL_CATEGORIES);
  const [showAll, setShowAll] = useState(false);
  const state = useMyAreaListings({ limit: LISTING_MANAGEMENT_LIMIT, offset: 0, statusFilter,
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
  const capped = listings.length >= LISTING_MANAGEMENT_LIMIT;
  const filtersActive = !!searchInput.trim() || statusFilter !== "all" || selectedCategoryId !== ALL_CATEGORIES;
  function clearFilters() {
    setSearchInput(""); setDebouncedSearch(""); setStatusFilter("all"); setSelectedCategoryId(ALL_CATEGORIES); setShowAll(false);
  }
  return <section className="min-w-0 overflow-hidden rounded-[30px] border border-black/5 bg-white p-4 shadow-sm sm:p-6">
    <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">Kuulutused</p>
        <h2 className="mt-2 text-2xl font-black">Sinu kuulutused</h2></div>
      {listings.length > LISTING_PREVIEW_LIMIT ? <button type="button" disabled={busy} onClick={() => setShowAll(v => !v)}
        className="min-h-11 w-full rounded-full border border-neutral-200 px-4 py-2 text-sm font-bold sm:w-auto">
        {showAll ? "Näita vähem" : capped ? `Näita laaditud (${listings.length})` : `Vaata kõiki (${listings.length})`}
      </button> : null}
    </div>
    <div className="mb-5 rounded-3xl border border-neutral-100 bg-neutral-50 p-4">
      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
        <input aria-label="Otsi oma kuulutusi" value={searchInput} disabled={busy}
          onChange={e => setSearchInput(e.target.value)} placeholder="Otsi oma kuulutusi…" className={control} />
        <select aria-label="Kuulutuste staatus" value={statusFilter} disabled={busy}
          onChange={e => setStatusFilter(e.target.value as MyAreaListingsStatusFilter)} className={control}>
          <option value="all">Kõik staatused</option>
          <option value="active">Aktiivsed ja aegunud</option>
          <option value="paused">Peatatud</option><option value="sold">Müüdud</option>
        </select>
        {filtersActive ? <button type="button" disabled={busy} onClick={clearFilters} className={control}>Tühjenda</button> : null}
      </div>
      {categories.length > 0 ? <fieldset disabled={busy} className="min-w-0">
        <legend className="sr-only">Sinu rubriigid</legend>
        <StoreCategoryHierarchyFilter categories={categories} selectedCategoryId={selectedCategoryId} allCategoryId={ALL_CATEGORIES}
          onSelectCategory={id => { if (!busy) { setSelectedCategoryId(id); setShowAll(false); } }} />
      </fieldset> : null}
      {categoriesLoading ? <p className="mt-3 text-xs text-neutral-500">Rubriike laetakse…</p> : null}
      {categoriesError ? <p className="mt-3 text-xs text-amber-800">Rubriike ei saanud laadida: {categoriesError}</p> : null}
      <p className="mt-3 text-xs leading-5 text-neutral-600">
        „Aktiivsed ja aegunud” sisaldab ka lõppenud tähtajaga kuulutusi. Aegunud kuulutused jäävad siin haldamiseks alles.
        Staatuse muutmine ei pikenda tähtaega.
      </p>
      <p role="status" className="mt-2 text-xs font-semibold text-neutral-500">
        {loading || editingSearch ? "Otsin kuulutusi…" : error ? "Nimekiri vajab uuesti laadimist."
          : capped ? `Laaditud esimesed ${listings.length} vastet. Täpsusta otsingut või rubriiki.`
          : `Laaditud ${listings.length} kuulutust praeguste filtritega`}
      </p>
    </div>
    {state.notice ? <p role="status" className="mb-4 rounded-2xl bg-neutral-50 p-4 text-sm">{state.notice}</p> : null}
    {state.problem || error ? <div role="alert" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm leading-6">{state.problem || error}</p>
      <button type="button" disabled={busy || loading} onClick={() => { void session.reload(); }} className={`${control} mt-3`}>
        Laadi nimekiri uuesti
      </button>
    </div> : null}
    <div className="mb-2 hidden grid-cols-[minmax(0,1fr)_105px_150px] px-1 text-xs font-bold uppercase tracking-wider text-neutral-400 md:grid">
      <span>Kuulutus</span><span className="text-right">Hind / eelarve</span><span className="text-center">Tegevused</span>
    </div>
    {loading ? <p role="status" className="p-5 text-sm text-neutral-600">Laen sinu kuulutusi…</p> : null}
    {!loading && !error && !state.problem && listings.length === 0 ? <div className="rounded-3xl border border-dashed border-neutral-200 p-6 text-center">
      <h3 className="font-bold">Ühtegi kuulutust ei leitud</h3><p className="mt-2 text-sm text-neutral-600">Muuda otsingut, staatust või rubriiki.</p>
    </div> : null}
    {!loading && !error ? <div className="divide-y divide-black/5">
      {visible.map(listing => listing.contentType === "horse_offer"
        ? <MyAreaHorseOfferRow key={listing.key} item={listing} />
        : <MyAreaListingRow key={listing.key} listing={listing} now={now} busy={state.busyKey === listing.key}
            disabled={disabled} activeIdentityId={state.actor?.identityId ?? null}
            onRenew={() => session.requestRenewal(listing.key)}
            onStatus={status => { void session.changeStatus(listing.key, status); }} />)}
    </div> : null}
    {state.confirmation ? <ListingRenewalConfirmation confirmation={state.confirmation} busy={busy}
      onCancel={() => session.cancelRenewal()} onConfirm={() => { void session.confirmRenewal(state.confirmation); }} /> : null}
  </section>;
}
