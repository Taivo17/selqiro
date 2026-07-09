"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useListingDetail } from "../model/useListingDetail";
import type {
  ListingImage,
  ProductListingDetail,
} from "../../../entities/listing/model/types";

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

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
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

function buildDetailRows(
  listing: ProductListingDetail
): Array<[string, string]> {
  const baseRows: Array<[string, string | null]> = [
    ["Kategooria", listing.category],
    ["Alamkategooria", listing.subcategory],
    ["Seisukord", listing.condition],
    ["Asukoht", listing.locationLabel],
    ["Müüja", listing.sellerName],
  ];

  const detailRows = Object.entries(listing.details || {})
    .map(
      ([key, value]) =>
        [formatDetailLabel(key), stringifyDetailValue(value)] as [string, string]
    )
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
    <section className="overflow-hidden rounded-[34px] border border-black/5 bg-white p-5 shadow-sm md:p-8">
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="min-w-0">
          <PlaceholderImage className="h-[280px] md:h-[460px]" />
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <PlaceholderImage key={index} className="h-20 rounded-[18px]" />
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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [galleryControlsVisible, setGalleryControlsVisible] = useState(true);
  const [galleryControlsPulse, setGalleryControlsPulse] = useState(0);
  const { listing, loading, error } = useListingDetail(listingId);

  function revealGalleryControls() {
    if (!listing || listing.images.length <= 1) return;

    setGalleryControlsVisible(true);
    setGalleryControlsPulse((value) => value + 1);
  }

  useEffect(() => {
    if (!listing || listing.images.length <= 1) {
      setGalleryControlsVisible(false);
      return;
    }

    setGalleryControlsVisible(true);

    const timer = window.setTimeout(() => {
      setGalleryControlsVisible(false);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [
    listing?.id,
    listing?.images.length,
    selectedImageIndex,
    galleryControlsPulse,
  ]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!listing) return <EmptyState />;

  const galleryImages = listing.images
    .map((image, index) => ({
      index,
      largeUrl: getLargeImageUrl(image),
      thumbUrl: getThumbImageUrl(image),
    }))
    .filter((image) => Boolean(image.largeUrl || image.thumbUrl));

  const normalizedSelectedIndex =
    galleryImages.length > 0
      ? Math.min(selectedImageIndex, galleryImages.length - 1)
      : 0;

  const selectedGalleryImage = galleryImages[normalizedSelectedIndex] || null;

  const mainImageUrl =
    selectedGalleryImage?.largeUrl ||
    selectedGalleryImage?.thumbUrl ||
    listing.imageUrl;

  const detailRows = buildDetailRows(listing);
  const visibleDetails = showMore ? detailRows : detailRows.slice(0, 6);

  function showPreviousImage() {
    if (galleryImages.length <= 1) return;

    setSelectedImageIndex((current) =>
      current <= 0 ? galleryImages.length - 1 : current - 1
    );
  }

  function showNextImage() {
    if (galleryImages.length <= 1) return;

    setSelectedImageIndex((current) =>
      current >= galleryImages.length - 1 ? 0 : current + 1
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[34px] border border-black/5 bg-white p-5 shadow-sm md:p-8">
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

        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div className="min-w-0">
            <div className="relative overflow-hidden rounded-[26px]">
              {mainImageUrl ? (
                <img
                  src={mainImageUrl}
                  alt=""
                  className="h-[280px] w-full rounded-[26px] object-cover object-[center_40%] md:h-[460px]"
                />
              ) : (
                <PlaceholderImage className="h-[280px] md:h-[460px]" />
              )}

              {galleryImages.length > 1 && !galleryControlsVisible ? (
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Näita galerii nuppe"
                    className="absolute inset-0 z-10 cursor-default bg-transparent focus:outline-none"
                    onMouseMove={revealGalleryControls}
                    onPointerMove={revealGalleryControls}
                    onTouchStart={revealGalleryControls}
                    onFocus={revealGalleryControls}
                  />
                ) : null}

                {galleryImages.length > 1 && galleryControlsVisible ? (
                <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between">
                  <button
                    type="button"
                    onClick={showPreviousImage}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-2xl font-black shadow-sm backdrop-blur transition hover:bg-white"
                    aria-label="Eelmine pilt"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={showNextImage}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-2xl font-black shadow-sm backdrop-blur transition hover:bg-white"
                    aria-label="Järgmine pilt"
                  >
                    ›
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid max-w-full grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {galleryImages.length > 0
                ? galleryImages.map((image, index) => {
                    const url = image.thumbUrl || image.largeUrl || "";
                    const isSelected = index === normalizedSelectedIndex;

                    return (
                      <button
                        key={`${url}-${index}`}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        className={[
                          "h-20 w-full rounded-[18px] border p-0.5 transition",
                          isSelected
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-transparent hover:border-neutral-200",
                        ].join(" ")}
                        aria-label={`Näita pilt ${index + 1}`}
                      >
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full rounded-[15px] object-cover object-[center_40%]"
                        />
                      </button>
                    );
                  })
                : Array.from({ length: 4 }).map((_, index) => (
                    <PlaceholderImage
                      key={index}
                      className="h-20 w-full rounded-[18px]"
                    />
                  ))}
            </div>
          </div>

          <aside className="min-w-0 space-y-4">
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
                <div
                  key={`${label}-${value}`}
                  className="rounded-2xl bg-[#fbfbfa] p-4"
                >
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
