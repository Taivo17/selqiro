"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MyIdentityListingCard } from "../../../entities/listing/model/types";
import {
  updateListingStatus,
  type ListingStatus,
} from "../../../entities/listing/api/updateListingStatus";
import {
  useMyAreaListings,
  type MyAreaListingsStatusFilter,
} from "../model/useMyAreaListings";
import { useMyAreaStoreCategories } from "../model/useMyAreaStoreCategories";
import StoreCategoryHierarchyFilter from "../../store-category-filter/components/StoreCategoryHierarchyFilter";

const LISTING_PREVIEW_LIMIT = 5;
const LISTING_MANAGEMENT_LIMIT = 500;
const ALL_CATEGORIES = "all";

function normalizeStatus(status: string): ListingStatus {
  if (status === "paused" || status === "sold") return status;

  return "active";
}

function statusClass(status: string) {
  if (status === "active") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (status === "paused") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  if (status === "sold") {
    return "border-neutral-200 bg-neutral-100 text-neutral-600";
  }

  return "border-neutral-200 bg-neutral-100 text-neutral-700";
}

function MyAreaListingRow({
  listing,
  statusFilter,
  onStatusChanged,
}: {
  listing: MyIdentityListingCard;
  statusFilter: MyAreaListingsStatusFilter;
  onStatusChanged: (listingId: string, status: ListingStatus) => void;
}) {
  const [savingStatus, setSavingStatus] = useState(false);
  const currentStatus = normalizeStatus(listing.status);

  async function handleStatusChange(nextStatus: ListingStatus) {
    if (nextStatus === currentStatus || savingStatus) return;

    setSavingStatus(true);

    try {
      await updateListingStatus({
        listingId: listing.id,
        status: nextStatus,
      });

      onStatusChanged(listing.id, nextStatus);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Staatuse muutmine ebaõnnestus."
      );
    } finally {
      setSavingStatus(false);
    }
  }

  const willDisappearAfterStatusChange =
    statusFilter !== "all" && statusFilter !== currentStatus;

  return (
    <div className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_105px_112px] md:items-center">
      <Link
        href={listing.href}
        className="-m-2 flex min-w-0 items-center gap-4 rounded-2xl p-2 transition hover:bg-neutral-50"
      >
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt=""
            className="h-16 w-28 shrink-0 rounded-2xl object-cover object-[center_42%]"
            loading="lazy"
          />
        ) : (
          <div className="h-16 w-28 shrink-0 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200" />
        )}

        <div className="min-w-0">
          <h3 className="truncate text-base font-black">{listing.title}</h3>

          <p className="mt-1 truncate text-sm text-neutral-500">
            {listing.category || "Kategooria puudub"} · {listing.locationLabel}
          </p>

          {listing.daysLeft !== null ? (
            <p className="mt-1 text-xs text-neutral-400">
              {listing.daysLeft > 0
                ? `${listing.daysLeft} päeva aktiivne`
                : "Aegunud või vajab uuendamist"}
            </p>
          ) : null}

          {willDisappearAfterStatusChange ? (
            <p className="mt-1 text-xs text-amber-600">
              Staatus ei vasta praegusele filtrile.
            </p>
          ) : null}
        </div>
      </Link>

      <div className="flex items-center justify-between gap-3 md:block md:text-right">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400 md:hidden">
          Hind
        </span>
        <p className="whitespace-nowrap text-base font-black">
          {listing.priceLabel}
        </p>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3 md:block">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400 md:hidden">
            Staatus
          </span>

          <select
            value={currentStatus}
            disabled={savingStatus}
            onChange={(event) =>
              handleStatusChange(event.target.value as ListingStatus)
            }
            className={[
              "w-full cursor-pointer appearance-none rounded-full border px-3 py-2 text-center text-xs font-black outline-none transition disabled:cursor-wait disabled:opacity-60",
              statusClass(currentStatus),
            ].join(" ")}
            title="Muuda kuulutuse staatust"
          >
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="sold">sold</option>
          </select>
        </div>

        <Link
          href={`/v2/my-area/listings/${listing.id}/edit`}
          className="inline-flex justify-center rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs font-black shadow-sm"
        >
          Muuda
        </Link>
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-black/5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="grid gap-3 py-4 first:pt-0 md:grid-cols-[minmax(0,1fr)_105px_112px] md:items-center"
        >
          <div className="flex items-center gap-4">
            <div className="h-16 w-20 rounded-2xl bg-neutral-100" />
            <div className="min-w-0 flex-1">
              <div className="h-5 w-2/3 rounded-full bg-neutral-100" />
              <div className="mt-2 h-4 w-1/3 rounded-full bg-neutral-100" />
            </div>
          </div>

          <div className="h-5 rounded-full bg-neutral-100" />
          <div className="grid gap-2">
            <div className="h-8 rounded-full bg-neutral-100" />
            <div className="h-8 rounded-full bg-neutral-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyAreaListingsSection() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<MyAreaListingsStatusFilter>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState(ALL_CATEGORIES);
  const [displayListings, setDisplayListings] = useState<
    MyIdentityListingCard[]
  >([]);
  const [showAll, setShowAll] = useState(false);

  const storeCategoryFilter =
    selectedCategoryId === ALL_CATEGORIES ? null : selectedCategoryId;

  const { listings, loading, error } = useMyAreaListings({
    limit: LISTING_MANAGEMENT_LIMIT,
    offset: 0,
    statusFilter,
    searchQuery: debouncedSearch,
    storeCategoryFilter,
  });

  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useMyAreaStoreCategories();

  useEffect(() => {
    if (
      categoriesLoading ||
      selectedCategoryId === ALL_CATEGORIES
    ) {
      return;
    }

    const selectedCategoryStillExists =
      categories.some(
        (category) =>
          category.id === selectedCategoryId
      );

    if (!selectedCategoryStillExists) {
      setSelectedCategoryId(ALL_CATEGORIES);
      setShowAll(false);
    }
  }, [
    categories,
    categoriesLoading,
    selectedCategoryId,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setDisplayListings(listings);
    setShowAll(false);
  }, [listings]);

  const visibleListings = showAll
    ? displayListings
    : displayListings.slice(0, LISTING_PREVIEW_LIMIT);

  const canToggleListings = displayListings.length > LISTING_PREVIEW_LIMIT;

  const filtersActive = useMemo(
    () =>
      Boolean(searchInput.trim()) ||
      statusFilter !== "all" ||
      selectedCategoryId !== ALL_CATEGORIES,
    [searchInput, statusFilter, selectedCategoryId]
  );

  function clearFilters() {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setSelectedCategoryId(ALL_CATEGORIES);
    setShowAll(false);
  }

  function handleStatusChanged(listingId: string, status: ListingStatus) {
    setDisplayListings((current) =>
      current
        .map((listing) =>
          listing.id === listingId
            ? {
                ...listing,
                status,
              }
            : listing
        )
        .filter((listing) => {
          if (statusFilter === "all") return true;

          return normalizeStatus(listing.status) === statusFilter;
        })
    );
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[30px] border border-black/5 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            Kuulutused
          </p>
          <h2 className="mt-2 text-2xl font-black">Sinu kuulutused</h2>
        </div>

        {canToggleListings ? (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-black shadow-sm sm:w-auto"
          >
            {showAll ? "Näita vähem" : `Vaata kõiki (${displayListings.length})`}
          </button>
        ) : null}
      </div>

      <div className="mb-5 rounded-[24px] border border-neutral-100 bg-[#fbfbfa] p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Otsi oma kuulutusi..."
            className="min-h-11 rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as MyAreaListingsStatusFilter)
            }
            className="min-h-11 rounded-full border border-neutral-200 bg-white px-4 text-sm font-black outline-none transition focus:border-neutral-400"
          >
            <option value="all">Kõik staatused</option>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="sold">sold</option>
          </select>

          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 rounded-full border border-neutral-200 bg-white px-4 text-sm font-black shadow-sm"
            >
              Tühjenda
            </button>
          ) : null}
        </div>

          {categories.length > 0 ? (
            <StoreCategoryHierarchyFilter
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              allCategoryId={ALL_CATEGORIES}
              onSelectCategory={(categoryId) => {
                setSelectedCategoryId(categoryId);
                setShowAll(false);
              }}
            />
          ) : null}

        {categoriesLoading ? (
          <p className="mt-3 text-xs font-semibold text-neutral-400">
            Rubriike laetakse...
          </p>
        ) : null}

        {categoriesError ? (
          <p className="mt-3 text-xs font-semibold text-amber-700">
            Rubriike ei saanud laadida: {categoriesError}
          </p>
        ) : null}

        <p className="mt-3 text-xs font-semibold text-neutral-400">
          {loading
            ? "Otsin kuulutusi..."
            : `${displayListings.length} tulemust praeguste filtritega`}
        </p>
      </div>

      <div className="mb-2 hidden grid-cols-[minmax(0,1fr)_105px_112px] px-1 text-xs font-black uppercase tracking-[0.16em] text-neutral-400 md:grid">
        <span>Kuulutus</span>
        <span className="text-right">Hind</span>
        <span className="text-center">Tegevused</span>
      </div>

      {loading ? <LoadingRows /> : null}

      {!loading && error ? (
        <div className="rounded-[22px] border border-red-100 bg-red-50 p-5">
          <h3 className="font-black text-red-950">
            Kuulutusi ei saanud laadida
          </h3>
          <p className="mt-2 text-sm leading-6 text-red-800">{error}</p>
        </div>
      ) : null}

      {!loading && !error && displayListings.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-6 text-center">
          <h3 className="font-black">Ühtegi kuulutust ei leitud</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Muuda otsingut, staatust või rubriiki.
          </p>
        </div>
      ) : null}

      {!loading && !error && displayListings.length > 0 ? (
        <div className="divide-y divide-black/5">
          {visibleListings.map((listing) => (
            <MyAreaListingRow
              key={listing.id}
              listing={listing}
              statusFilter={statusFilter}
              onStatusChanged={handleStatusChanged}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
