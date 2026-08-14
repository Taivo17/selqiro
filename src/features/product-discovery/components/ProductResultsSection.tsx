"use client";

import ProductListingCard from "./ProductListingCard";
import { useProductDiscoveryListings } from "../model/useProductDiscoveryListings";
import {
  useListingReturnRestoration,
} from "../../listing-navigation/model/useListingReturnRestoration";

function LoadingGrid() {
  return (
    <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <article
          key={index}
          className="rounded-[26px] border border-black/5 bg-white p-3 shadow-sm"
        >
          <div className="aspect-[16/10] rounded-[20px] bg-gradient-to-br from-neutral-100 to-neutral-200" />
          <div className="mt-4 h-5 w-3/4 rounded-full bg-neutral-100" />
          <div className="mt-3 h-4 w-1/2 rounded-full bg-neutral-100" />
          <div className="mt-6 h-7 w-1/3 rounded-full bg-neutral-100" />
        </article>
      ))}
    </div>
  );
}

export default function ProductResultsSection() {
  const {
    listings,
    loading,
    error,
  } =
    useProductDiscoveryListings();

  useListingReturnRestoration({
    source: "products",
    ready:
      !loading &&
      !error,
    listingIds: listings.map(
      (listing) => listing.id
    ),
  });

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-amber-200 bg-amber-50 p-6 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-amber-500 before:content-[''] md:p-8">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-800">
            Tulemused
          </p>
          <h2 className="mt-2 text-3xl font-black">Tooted sinu lähedal</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
            See plokk kasutab nüüd V2 listing entity API-t. Esiletõstetud ja
            seotud teenused jäävad praegu eraldi skeletoniks.
          </p>
        </div>

        <p className="text-sm font-semibold text-neutral-500">
          {loading ? "Laen..." : `${listings.length} näidatud`}
        </p>
      </div>

      {loading ? <LoadingGrid /> : null}

      {!loading && error ? (
        <div className="rounded-[26px] border border-red-100 bg-red-50 p-5">
          <h3 className="font-black text-red-900">Kuulutusi ei saanud laadida</h3>
          <p className="mt-2 text-sm leading-6 text-red-800">{error}</p>
        </div>
      ) : null}

      {!loading && !error && listings.length === 0 ? (
        <div className="rounded-[26px] border border-dashed border-neutral-200 bg-[#fbfbfa] p-8 text-center">
          <h3 className="text-xl font-black">Kuulutusi ei leitud</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Kui päris andmed on olemas, ilmuvad aktiivsed kuulutused siia.
          </p>
        </div>
      ) : null}

      {!loading && !error && listings.length > 0 ? (
        <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <ProductListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
