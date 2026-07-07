"use client";

import Link from "next/link";
import { useState } from "react";
import { useListingDetail } from "../model/useListingDetail";
import type { ListingImage, ProductListingDetail } from "../../../entities/listing/model/types";

function getLargeImageUrl(image: ListingImage): string | null {
  return image.medium_url || image.original_url || image.thumb_url || null;
}

function getThumbImageUrl(image: ListingImage): string | null {
  return image.thumb_url || image.medium_url || image.original_url || null;
}

function PlaceholderImage({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "rounded-[26px] bg-gradient-to-br from-neutral-100 to-neutral-200",
        className,
      ].join(" ")}
    />
  );
}

function stringifyDetailValue(value: unknown): string {
  if (value === null || typeof value === "undefined" || value === "") {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatDetailLabel(label: string): string {
  return label
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDetailRows(listing: ProductListingDetail): Array<[string, string]> {
  const baseRows: Array<[string, string | null]> = [
    ["Kategooria", listing.category],
    ["Alamkategooria", listing.subcategory],
    ["Seisukord", listing.condition],
    ["Asukoht", listing.locationLabel],
    ["Müüja", listing.sellerName],
  ];

  const detailRows = Object.entries(listing.details || {})
    .map(([key, value]) => [formatDetailLabel(key), stringifyDetailValue(value)] as [string, string])
    .filter(([, value]) => Boolean(value));

  return [
    ...baseRows
      .filter(([, value]) => Boolean(value))
      .map(([label, value]) => [label, value || ""] as [string, string]),
    ...detailRows,
  ].slice(0, 12);
}

function LoadingState() {
  return (
    <section className="rounded-[34px] border border-black/5 bg-white p-5 shadow-sm md:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <PlaceholderImage className="h-[280px] md:h-[460px]" />
          <div className="mt-4 flex gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <PlaceholderImage key={index} className="h-20 min-w-24 rounded-[18px]" />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] bg-[#fbfbfa] p-6">
            <div className="h-8 w-3/4 rounded-full bg-neutral-100" />
            <div className="mt-5 h-10 w-1/2 rounded-full bg-neutral-100" />
            <div className="mt-6 h-14 rounded-2xl bg-neutral-100" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <section className="rounded-[34px] border border-red-100 bg-red-50 p-8">
      <h1 className="text-3xl font-black text-red-950">
        Kuulutust ei saanud laadida
      </h1>
      <p className="mt-3 text-sm leading-6 text-red-800">{error}</p>
      <Link
        href="/v2/products"
        className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-black text-white"
      >
        Tagasi toodete juurde
      </Link>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="rounded-[34px] border border-black/5 bg-white p-8 text-center shadow-sm">
      <h1 className="text-3xl font-black">Kuulutust ei leitud</h1>
      <p className="mt-3 text-sm leading-6 text-neutral-500">
        See kuulutus võib olla eemaldatud, aegunud või mitte avalik.
      </p>
      <Link
        href="/v2/products"
        className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-black text-white"
      >
        Tagasi toodete juurde
      </Link>
    </section>
  );
}

export default function ListingDetailPage({ listingId }: { listingId: string }) {
  const [showMore, setShowMore] = useState(false);
  const { listing, loading, error } = useListingDetail(listingId);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!listing) return <EmptyState />;

  const mainImageUrl =
    listing.images.map(getLargeImageUrl).find(Boolean) || listing.imageUrl;
  const thumbUrls = listing.images.map(getThumbImageUrl).filter(Boolean) as string[];
  const detailRows = buildDetailRows(listing);
  const visibleDetails = showMore ? detailRows : detailRows.slice(0, 6);

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-black/5 bg-white p-5 shadow-sm md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/v2/products"
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-bold shadow-sm"
          >
            ← Tagasi toodete juurde
          </Link>

          <p className="text-sm font-semibold text-neutral-500">
            {listing.category || "Toode"}
            {listing.subcategory ? ` · ${listing.subcategory}` : ""}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            {mainImageUrl ? (
              <img
                src={mainImageUrl}
                alt=""
                className="h-[280px] w-full rounded-[26px] object-cover md:h-[460px]"
              />
            ) : (
              <PlaceholderImage className="h-[280px] md:h-[460px]" />
            )}

            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {thumbUrls.length > 0
                ? thumbUrls.map((url, index) => (
                    <img
                      key={`${url}-${index}`}
                      src={url}
                      alt=""
                      className="h-20 min-w-24 rounded-[18px] object-cover"
                    />
                  ))
                : Array.from({ length: 4 }).map((_, index) => (
                    <PlaceholderImage key={index} className="h-20 min-w-24 rounded-[18px]" />
                  ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[28px] border border-black/5 bg-[#fbfbfa] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                    Kuulutus
                  </p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight">
                    {listing.title}
                  </h1>
                </div>

                <button className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-bold">
                  ♡
                </button>
              </div>

              <p className="mt-5 text-4xl font-black">{listing.priceLabel}</p>

              <div className="mt-5 rounded-2xl bg-white p-4">
                <p className="text-sm font-bold">{listing.locationLabel}</p>
                {listing.distanceLabel ? (
                  <p className="mt-1 text-sm text-neutral-500">
                    {listing.distanceLabel} sinust
                  </p>
                ) : null}
                <p className="mt-3 text-xs leading-5 text-neutral-400">
                  Eraisiku asukoht võib olla ligikaudne. Täpne koht lepitakse
                  kokku müüjaga.
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                <button className="rounded-full bg-black px-5 py-3 text-sm font-black text-white">
                  Kirjuta müüjale
                </button>
                <button className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black">
                  Salvesta kuulutus
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-400">
                Müüja
              </p>

              <div className="mt-4 flex items-center gap-4">
                {listing.sellerAvatarUrl ? (
                  <img
                    src={listing.sellerAvatarUrl}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 text-lg font-black text-neutral-500">
                    {listing.sellerName.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div>
                  <h2 className="font-black">{listing.sellerName}</h2>
                  <p className="text-sm text-neutral-500">
                    {listing.sellerType || "Müüja"}
                  </p>
                </div>
              </div>

              {listing.sellerSlug ? (
                <Link
                  href={`/v2/profile/${listing.sellerSlug}`}
                  className="mt-5 inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black"
                >
                  Vaata profiili
                </Link>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            Kirjeldus
          </p>

          {listing.description ? (
            <p className="mt-4 text-base leading-8 text-neutral-700">
              {listing.description}
            </p>
          ) : (
            <p className="mt-4 text-base leading-8 text-neutral-500">
              Müüja ei ole kirjeldust lisanud.
            </p>
          )}

          <button
            onClick={() => setShowMore((value) => !value)}
            className="mt-5 rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm"
          >
            {showMore ? "Näita vähem" : "Näita rohkem"}
          </button>
        </div>

        <div className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            Olulised detailid
          </p>

          {visibleDetails.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {visibleDetails.map(([label, value]) => (
                <div key={`${label}-${value}`} className="rounded-2xl bg-[#fbfbfa] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
                    {label}
                  </p>
                  <p className="mt-1 font-black">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-neutral-500">
              Detailvälju ei ole lisatud.
            </p>
          )}

          <p className="mt-5 text-sm text-neutral-500">
            “Näita rohkem” avab rohkem kuulutuse infot, kui seda on lisatud.
          </p>
        </div>
      </section>
    </div>
  );
}
