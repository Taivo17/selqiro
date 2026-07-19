"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicProfile } from "../../../entities/profile/model/types";
import type { ProductListingCard } from "../../../entities/listing/model/types";
import { getStoreCategoryScopeIds } from "../../../entities/store-category/model/getStoreCategoryScopeIds";
import { usePublicProfileListings } from "../model/usePublicProfileListings";
import { usePublicProfileStoreCategories } from "../model/usePublicProfileStoreCategories";
import PublicProfileStoreCategoryFilter from "./PublicProfileStoreCategoryFilter";

function ProfileListingCard({
  listing,
}: {
  listing: ProductListingCard;
}) {
  const router = useRouter();
  const listingHref =
    `/v2/listing/${listing.id}`;

  function openListingFromCard(event: {
    target: EventTarget | null;
  }) {
    const target =
      event.target as HTMLElement | null;

    if (
      target?.closest(
        "button, a, input, select, textarea"
      )
    ) {
      return;
    }

    router.push(listingHref);
  }

  return (
    <article
      onClick={openListingFromCard}
      role="link"
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          event.key !== "Enter" &&
          event.key !== " "
        ) {
          return;
        }

        const target =
          event.target as HTMLElement | null;

        if (
          target?.closest(
            "button, a, input, select, textarea"
          )
        ) {
          return;
        }

        event.preventDefault();
        router.push(listingHref);
      }}
      className="w-[230px] flex-none cursor-pointer rounded-[24px] border border-black/5 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {listing.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt=""
          className="h-28 w-full rounded-[20px] object-cover"
          loading="lazy"
        />
      ) : (
        <div className="h-28 rounded-[20px] bg-gradient-to-br from-neutral-100 to-neutral-200" />
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
          Kuulutus
        </span>

        <button className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-500">
          ♡
        </button>
      </div>

      <h3 className="mt-2 line-clamp-2 text-base font-black">
        {listing.title}
      </h3>

      <p className="mt-1 text-sm leading-5 text-neutral-500">
        {listing.category ||
          "Kategooria puudub"}{" "}
        · {listing.locationLabel}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-lg font-black">
          {listing.priceLabel}
        </p>
      </div>
    </article>
  );
}

function HorizontalScrollArea({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-2">
      <div className="flex w-max gap-4 px-1">
        {children}
      </div>
    </div>
  );
}

function LoadingCards() {
  return (
    <HorizontalScrollArea>
      {Array.from({ length: 3 }).map(
        (_, index) => (
          <article
            key={index}
            className="w-[230px] flex-none rounded-[24px] border border-black/5 bg-white p-3 shadow-sm"
          >
            <div className="h-28 rounded-[20px] bg-gradient-to-br from-neutral-100 to-neutral-200" />
            <div className="mt-4 h-5 w-3/4 rounded-full bg-neutral-100" />
            <div className="mt-3 h-4 w-1/2 rounded-full bg-neutral-100" />
          </article>
        )
      )}
    </HorizontalScrollArea>
  );
}

export default function PublicProfileListingsSection({
  profile,
}: {
  profile: PublicProfile;
}) {
  const [
    selectedCategoryId,
    setSelectedCategoryId,
  ] = useState<string | null>(null);

  const [
    expandedRootId,
    setExpandedRootId,
  ] = useState<string | null>(null);

  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = usePublicProfileStoreCategories(profile);

  /*
   * Root selection receives the complete recursive
   * branch. Child selection normally receives only
   * that child and any future descendants.
   */
  const storeCategoryScopeIds = useMemo(
    () =>
      selectedCategoryId
        ? getStoreCategoryScopeIds(
            categories,
            selectedCategoryId
          )
        : null,
    [categories, selectedCategoryId]
  );

  const {
    listings,
    loading,
    error,
  } = usePublicProfileListings(
    profile,
    storeCategoryScopeIds
  );

  /*
   * A different viewed profile must never retain the
   * previous profile's selected store category.
   */
  useEffect(() => {
    setSelectedCategoryId(null);
    setExpandedRootId(null);
  }, [profile.identityId, profile.slug]);

  /*
   * If the viewed profile changes its category tree,
   * remove a stale selected category safely.
   */
  useEffect(() => {
    if (
      categoriesLoading ||
      !selectedCategoryId
    ) {
      return;
    }

    const selectedCategory =
      categories.find(
        (category) =>
          category.id ===
          selectedCategoryId
      );

    if (!selectedCategory) {
      setSelectedCategoryId(null);
      setExpandedRootId(null);
      return;
    }

    if (selectedCategory.parent_id) {
      setExpandedRootId(
        selectedCategory.parent_id
      );
    }
  }, [
    categories,
    categoriesLoading,
    selectedCategoryId,
  ]);

  function handleSelectAll() {
    setSelectedCategoryId(null);
    setExpandedRootId(null);
  }

  function handleSelectRoot(
    categoryId: string,
    hasChildren: boolean
  ) {
    setSelectedCategoryId(categoryId);

    setExpandedRootId((current) => {
      if (!hasChildren) {
        return null;
      }

      /*
       * First click selects and opens the root.
       * A second click on the already-selected root
       * only collapses its child row.
       */
      if (
        selectedCategoryId === categoryId &&
        current === categoryId
      ) {
        return null;
      }

      return categoryId;
    });
  }

  function handleSelectChild(
    categoryId: string,
    parentId: string
  ) {
    setSelectedCategoryId(categoryId);
    setExpandedRootId(parentId);
  }

  return (
    <section className="overflow-hidden rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
            Kuulutused
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
            Müügis praegu
          </h2>
        </div>

        <button className="hidden rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-bold shadow-sm transition hover:border-neutral-300 md:inline-flex">
          Vaata kõiki
        </button>
      </div>

      <PublicProfileStoreCategoryFilter
        categories={categories}
        loading={categoriesLoading}
        error={categoriesError}
        selectedCategoryId={
          selectedCategoryId
        }
        expandedRootId={expandedRootId}
        onSelectAll={handleSelectAll}
        onSelectRoot={handleSelectRoot}
        onSelectChild={handleSelectChild}
      />

      {loading ? <LoadingCards /> : null}

      {!loading && error ? (
        <div className="rounded-[22px] border border-red-100 bg-red-50 p-5">
          <h3 className="font-black text-red-950">
            Kuulutusi ei saanud laadida
          </h3>

          <p className="mt-2 text-sm leading-6 text-red-800">
            {error}
          </p>
        </div>
      ) : null}

      {!loading &&
      !error &&
      listings.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-6 text-center">
          <h3 className="font-black">
            {selectedCategoryId
              ? "Selles rubriigis aktiivseid kuulutusi ei ole"
              : "Aktiivseid kuulutusi ei ole"}
          </h3>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {selectedCategoryId
              ? "Vali teine rubriik või kuva kõik kuulutused."
              : "Kui profiilil on aktiivsed kuulutused, ilmuvad need siia."}
          </p>
        </div>
      ) : null}

      {!loading &&
      !error &&
      listings.length > 0 ? (
        <HorizontalScrollArea>
          {listings.map((listing) => (
            <ProfileListingCard
              key={listing.id}
              listing={listing}
            />
          ))}
        </HorizontalScrollArea>
      ) : null}
    </section>
  );
}
