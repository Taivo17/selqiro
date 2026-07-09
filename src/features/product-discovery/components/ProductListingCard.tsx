"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductListingCard as ProductListingCardType } from "../../../entities/listing/model/types";

export default function ProductListingCard({
  listing,
}: {
  listing: ProductListingCardType;
}) {
  const router = useRouter();
  const listingHref = `/v2/listing/${listing.id}`;

  function openListingFromCard(event: { target: EventTarget | null }) {
    const target = event.target as HTMLElement | null;

    if (target?.closest("button, a, input, select, textarea")) return;

    router.push(listingHref);
  }

  return (
    <article onClick={openListingFromCard} role="link" tabIndex={0} onKeyDown={(event) => { if (event.key !== "Enter" && event.key !== " ") return; const target = event.target as HTMLElement | null; if (target?.closest("button, a, input, select, textarea")) return; event.preventDefault(); router.push(listingHref); }} className="group rounded-[26px] border border-black/5 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer">
      {listing.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt=""
          className="h-44 w-full rounded-[20px] object-cover object-[center_42%]"
          loading="lazy"
        />
      ) : (
        <div className="h-44 w-full rounded-[20px] bg-gradient-to-br from-neutral-100 to-neutral-200" />
      )}

      <div className="mt-4">
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

          <button className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-600">
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

        <div className="mt-3 flex items-end justify-between gap-3">
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
