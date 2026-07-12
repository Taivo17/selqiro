"use client";

import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { ProductListingCard as ProductListingCardType } from "../../../entities/listing/model/types";

export default function ProductListingCard({
  listing,
}: {
  listing: ProductListingCardType;
}) {
  const router = useRouter();
  const listingHref = `/v2/listing/${listing.id}`;

  function openListing() {
    router.push(listingHref);
  }

  function openListingFromCard(event: { target: EventTarget | null }) {
    const target = event.target as HTMLElement | null;

    if (target?.closest("button, a, input, select, textarea")) return;

    openListing();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;

    const target = event.target as HTMLElement | null;

    if (target?.closest("button, a, input, select, textarea")) return;

    event.preventDefault();
    openListing();
  }

  return (
    <article
      onClick={openListingFromCard}
      role="link"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="group flex h-full cursor-pointer flex-col rounded-[26px] border border-black/5 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
    >
      <div className="w-full overflow-hidden rounded-[20px] bg-gradient-to-br from-neutral-100 to-neutral-200 aspect-[4/3] md:aspect-[16/10]">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt=""
            className="w-full object-cover transition duration-300 group-hover:scale-[1.02] aspect-[4/3] md:aspect-[16/10] object-[center_42%] md:object-cover md:object-[center_42%] rounded-[26px]"
            loading="lazy"
          />
        ) : null}
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {listing.isHighlighted ? (
              <span className="mb-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                Esiletõstetud
              </span>
            ) : null}

            <h3 className="line-clamp-2 text-lg font-black leading-tight">
              {listing.title}
            </h3>
          </div>

          <button
            type="button"
            aria-label="Salvesta kuulutus"
            className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-600 transition hover:bg-neutral-50"
          >
            ♡
          </button>
        </div>

        {listing.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-500">
            {listing.description}
          </p>
        ) : null}

        <p className="mt-2 text-xs font-semibold text-neutral-400">
          {listing.category || "Kategooria puudub"} · {listing.sellerName}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="text-xl font-black">{listing.priceLabel}</p>

          <p className="text-right text-xs text-neutral-500">
            {listing.locationLabel}
            {listing.distanceLabel ? (
              <>
                <br />
                <span className="text-neutral-400">{listing.distanceLabel}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </article>
  );
}
