"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ReactNode,
  RefObject,
} from "react";
import { useRouter } from "next/navigation";
import type { PublicProfile } from "../../../entities/profile/model/types";
import type { ProductListingCard } from "../../../entities/listing/model/types";
import { getStoreCategoryScopeIds } from "../../../entities/store-category/model/getStoreCategoryScopeIds";
import { usePublicProfileListings } from "../model/usePublicProfileListings";
import { usePublicProfileStoreCategories } from "../model/usePublicProfileStoreCategories";
import PublicProfileStoreCategoryFilter from "./PublicProfileStoreCategoryFilter";
import {
  getCurrentRelativeUrl,
  isListingReturnNavigation,
  readListingReturnContext,
  saveListingReturnContext,
} from "../../listing-navigation/model/listingReturnContext";
import {
  useListingReturnRestoration,
} from "../../listing-navigation/model/useListingReturnRestoration";

const LISTING_PREVIEW_LIMIT = 4;

function ProfileListingCard({
  listing,
  expanded,
  onOpen,
}: {
  listing: ProductListingCard;
  expanded: boolean;
  onOpen: (input: {
    listingId: string;
    cardViewportTop: number;
  }) => void;
}) {
  const router = useRouter();

  const cardRef =
    useRef<HTMLElement>(null);

  const listingHref =
    `/v2/listing/${listing.id}`;

  function openListing() {
    onOpen({
      listingId: listing.id,
      cardViewportTop:
        cardRef.current
          ?.getBoundingClientRect()
          .top ?? 0,
    });

    router.push(listingHref);
  }

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

    openListing();
  }

  return (
    <article
      ref={cardRef}
      data-listing-card-id={listing.id}
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
        openListing();
      }}
      className={[
        "min-w-0 cursor-pointer rounded-[24px] border border-black/5 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        expanded
          ? "w-full"
          : "w-[78vw] max-w-[290px] flex-none sm:w-[260px]",
      ].join(" ")}
    >
      {listing.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt=""
          className={[
            "w-full rounded-[20px] object-cover",
            expanded
              ? "aspect-[4/3]"
              : "h-36",
          ].join(" ")}
          loading="lazy"
        />
      ) : (
        <div
          className={[
            "rounded-[20px] bg-gradient-to-br from-neutral-100 to-neutral-200",
            expanded
              ? "aspect-[4/3]"
              : "h-36",
          ].join(" ")}
        />
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
          Kuulutus
        </span>

        <button
          type="button"
          className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-500"
        >
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

      <p className="mt-3 text-lg font-black">
        {listing.priceLabel}
      </p>
    </article>
  );
}

function HorizontalScrollArea({
  children,
  scrollRef,
}: {
  children: ReactNode;
  scrollRef?:
    RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={scrollRef}
      className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-2"
    >
      <div className="flex w-max gap-4 px-1">
        {children}
      </div>
    </div>
  );
}

function LoadingCard({
  expanded,
}: {
  expanded: boolean;
}) {
  return (
    <article
      className={[
        "min-w-0 rounded-[24px] border border-black/5 bg-white p-3 shadow-sm",
        expanded
          ? "w-full"
          : "w-[78vw] max-w-[290px] flex-none sm:w-[260px]",
      ].join(" ")}
    >
      <div
        className={[
          "rounded-[20px] bg-gradient-to-br from-neutral-100 to-neutral-200",
          expanded
            ? "aspect-[4/3]"
            : "h-36",
        ].join(" ")}
      />

      <div className="mt-4 h-5 w-3/4 rounded-full bg-neutral-100" />
      <div className="mt-3 h-4 w-1/2 rounded-full bg-neutral-100" />
    </article>
  );
}

function LoadingCards({
  expanded,
}: {
  expanded: boolean;
}) {
  if (expanded) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({
          length: 6,
        }).map((_, index) => (
          <LoadingCard
            key={index}
            expanded
          />
        ))}
      </div>
    );
  }

  return (
    <HorizontalScrollArea>
      {Array.from({
        length: 3,
      }).map((_, index) => (
        <LoadingCard
          key={index}
          expanded={false}
        />
      ))}
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

  const [showAll, setShowAll] =
    useState(false);

  const horizontalScrollRef =
    useRef<HTMLDivElement>(null);

  const profileReturnKey = [
    profile.identityId || "",
    profile.slug,
  ].join("\u001f");

  const [
    preparedProfileReturnKey,
    setPreparedProfileReturnKey,
  ] = useState<string | null>(null);

  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } =
    usePublicProfileStoreCategories(
      profile
    );

  /*
   * Ülemrubriigi valik hõlmab kogu selle
   * haru. Alamrubriigi valik hõlmab valitud
   * rubriiki ja selle võimalikke järglasi.
   */
  const storeCategoryScopeIds =
    useMemo(
      () =>
        selectedCategoryId
          ? getStoreCategoryScopeIds(
              categories,
              selectedCategoryId
            )
          : null,
      [
        categories,
        selectedCategoryId,
      ]
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
   * Sama ajalookirje kaudu kuulutusest tagasi
   * tulles taastame enne andmepäringu lõplikku
   * valmimist profiili kuulutuste UI oleku.
   *
   * Tavalise profiilivahetuse korral lähtume
   * alati kompaktsest ja filtreerimata vaatest.
   */
  useEffect(() => {
    const returnContext =
      readListingReturnContext();

    if (
      returnContext &&
      returnContext.source ===
        "public-profile" &&
      returnContext.sourceUrl ===
        getCurrentRelativeUrl() &&
      isListingReturnNavigation(
        returnContext
      )
    ) {
      const returnState =
        returnContext.publicProfileState;

      setSelectedCategoryId(
        returnState
          ?.selectedCategoryId ??
          null
      );

      setExpandedRootId(
        returnState
          ?.expandedRootId ??
          null
      );

      setShowAll(
        returnState?.showAll === true
      );
    } else {
      setSelectedCategoryId(null);
      setExpandedRootId(null);
      setShowAll(false);
    }

    setPreparedProfileReturnKey(
      profileReturnKey
    );
  }, [profileReturnKey]);

  /*
   * Rubriigipuu muutumisel eemaldame
   * kadunud valiku. See ei muuda Vaata kõiki
   * olekut.
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

    if (
      selectedCategory.parent_id
    ) {
      setExpandedRootId(
        selectedCategory.parent_id
      );
    }
  }, [
    categories,
    categoriesLoading,
    selectedCategoryId,
  ]);

  const selectedCategoryReady =
    !selectedCategoryId ||
    categories.some(
      (category) =>
        category.id ===
        selectedCategoryId
    );

  useListingReturnRestoration({
    source: "public-profile",
    ready:
      preparedProfileReturnKey ===
        profileReturnKey &&
      !categoriesLoading &&
      selectedCategoryReady &&
      !loading &&
      !error,
    listingIds: listings.map(
      (listing) => listing.id
    ),
    horizontalScrollRef,
  });

  function handleOpenListing(input: {
    listingId: string;
    cardViewportTop: number;
  }) {
    saveListingReturnContext({
      source: "public-profile",
      listingId: input.listingId,
      cardViewportTop:
        input.cardViewportTop,
      publicProfileState: {
        showAll,
        selectedCategoryId,
        expandedRootId,
        horizontalScrollLeft:
          horizontalScrollRef.current
            ?.scrollLeft ?? 0,
      },
    });
  }

  function handleSelectAll() {
    setSelectedCategoryId(null);
    setExpandedRootId(null);
  }

  function handleSelectRoot(
    categoryId: string,
    hasChildren: boolean
  ) {
    setSelectedCategoryId(
      categoryId
    );

    setExpandedRootId(
      (current) => {
        if (!hasChildren) {
          return null;
        }

        /*
         * Esimene vajutus valib ja avab
         * ülemrubriigi. Teine vajutus samal
         * rubriigil peidab ainult alamrubriigid.
         */
        if (
          selectedCategoryId ===
            categoryId &&
          current === categoryId
        ) {
          return null;
        }

        return categoryId;
      }
    );
  }

  function handleSelectChild(
    categoryId: string,
    parentId: string
  ) {
    setSelectedCategoryId(
      categoryId
    );
    setExpandedRootId(parentId);
  }

  /*
   * Kui valimata filtriga ei ole ühtegi
   * aktiivset kuulutust, ei kuvata profiilis
   * kogu kuulutuste plokki.
   *
   * Filtreeritud nulltulemuse korral jääb
   * plokk nähtavaks, et kasutaja saaks valida
   * teise rubriigi.
   */
  const profileHasNoListings =
    !loading &&
    !error &&
    selectedCategoryId === null &&
    listings.length === 0;

  if (profileHasNoListings) {
    return null;
  }

  const visibleListings =
    showAll
      ? listings
      : listings.slice(
          0,
          LISTING_PREVIEW_LIMIT
        );

  const canToggleListings =
    showAll ||
    listings.length >
      LISTING_PREVIEW_LIMIT;

  return (
    <section className="overflow-hidden rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-neutral-400">
            Kuulutused
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
            Müügis praegu
          </h2>
        </div>

        {canToggleListings ? (
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() =>
              setShowAll(
                (current) =>
                  !current
              )
            }
            className="inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-black shadow-sm transition hover:border-neutral-300 sm:w-auto"
          >
            {showAll
              ? "Vaata vähem"
              : `Vaata kõiki (${listings.length})`}
          </button>
        ) : null}
      </div>

      <PublicProfileStoreCategoryFilter
        categories={categories}
        loading={
          categoriesLoading
        }
        error={categoriesError}
        selectedCategoryId={
          selectedCategoryId
        }
        expandedRootId={
          expandedRootId
        }
        onSelectAll={
          handleSelectAll
        }
        onSelectRoot={
          handleSelectRoot
        }
        onSelectChild={
          handleSelectChild
        }
      />

      {loading ? (
        <LoadingCards
          expanded={showAll}
        />
      ) : null}

      {!loading && error ? (
        <div className="rounded-[22px] border border-red-100 bg-red-50 p-5">
          <h3 className="font-black text-red-950">
            Kuulutusi ei saanud
            laadida
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
            Selles rubriigis
            aktiivseid kuulutusi ei
            ole
          </h3>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Vali teine rubriik või
            kuva kõik kuulutused.
          </p>
        </div>
      ) : null}

      {!loading &&
      !error &&
      visibleListings.length >
        0 ? (
        showAll ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleListings.map(
              (listing) => (
                <ProfileListingCard
                  key={listing.id}
                  listing={listing}
                  expanded
                  onOpen={
                    handleOpenListing
                  }
                />
              )
            )}
          </div>
        ) : (
          <HorizontalScrollArea
            scrollRef={
              horizontalScrollRef
            }
          >
            {visibleListings.map(
              (listing) => (
                <ProfileListingCard
                  key={listing.id}
                  listing={listing}
                  expanded={
                    false
                  }
                  onOpen={
                    handleOpenListing
                  }
                />
              )
            )}
          </HorizontalScrollArea>
        )
      ) : null}
    </section>
  );
}
