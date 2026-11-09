"use client";

import { getCategoryLabel } from "@/lib/categories";
import { getFieldLabel } from "@/lib/categoryFields";
import { searchConditionLabel } from "@/src/entities/listing/model/publicSearch";

import { renderUiMessage } from "@/lib/i18n/interfaceMessage";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";
import { getCatalogTranslation, type TranslationParams } from "@/lib/i18n/useTranslation";
import type { Language } from "@/lib/i18n/translations";
import { publicUiMessages } from "@/lib/i18n/catalogs/publicUi";


import ListingPrice from "../../../entities/listing/ui/ListingPrice";
import ListingContactButton from "../../listing-conversation/components/ListingContactButton";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";

import Link from "next/link";
import { useState } from "react";
import PublicPhotoGallery from "../../../shared/media/PublicPhotoGallery";
import { listingGalleryPhotos } from "../model/listingGalleryPhotos";
import { useListingDetail } from "../model/useListingDetail";
import ListingReturnBackButton from "../../listing-navigation/components/ListingReturnBackButton";
import type {
  ProductListingDetail,
} from "../../../entities/listing/model/types";

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
  listing: ProductListingDetail, uiLanguage: Language = "en"
): Array<[string, string]> {
  const t = (key: keyof typeof publicUiMessages.en, params?: TranslationParams) => getCatalogTranslation(uiLanguage, publicUiMessages, key, params);

  const baseRows: Array<[string, string | null]> = [
    [t("category"), listing.category ? getCategoryLabel(listing.category, listing.category, uiLanguage) : null],
    [t("subcategory"), listing.subcategory ? getCategoryLabel(listing.subcategory, listing.subcategory, uiLanguage) : null],
    [t("condition"), searchConditionLabel(listing.condition, uiLanguage)],
    [t("location"), listing.locationLabel],
    [t("seller"), listing.sellerName],
  ];

  const detailRows = Object.entries(listing.details || {})
    .map(
      ([key, value]) =>
        [getFieldLabel(key, formatDetailLabel(key), uiLanguage), typeof value === "boolean" ? t(value ? "yes" : "no") : stringifyDetailValue(value)] as [string, string]
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
          <PlaceholderImage className="aspect-[4/3] w-full" />

          <div className="mt-4 flex max-w-full gap-3 overflow-x-auto pb-3 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <PlaceholderImage
                key={index}
                className="h-20 w-24 flex-none rounded-[18px]"
              />
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

function ErrorState({
  error,
  listingId,
}: {
  error: string;
  listingId: string;
}) {
  const { language: uiLanguage, t } = useV2Translation(publicUiMessages);

  return (
    <section className="rounded-[34px] border border-red-100 bg-red-50 p-8">
      <h1 className="text-3xl font-black text-red-950">
        {t("could_not_load_listing")} </h1>
      <p className="mt-3 text-sm leading-6 text-red-800">{renderUiMessage(uiLanguage, error)}</p>
      <ListingReturnBackButton
        listingId={listingId}
        className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-black text-white"
      />
    </section>
  );
}

function EmptyState({
  listingId,
}: {
  listingId: string;
}) {
  const { t } = useV2Translation(publicUiMessages);

  return (
    <section className="rounded-[34px] border border-black/5 bg-white p-8 text-center shadow-sm">
      <h1 className="text-3xl font-black">{t("listing_not_found")}</h1>
      <p className="mt-3 text-sm leading-6 text-neutral-500">
        {t("this_listing_may_have_been_removed_expired_or_made_private")} </p>
      <ListingReturnBackButton
        listingId={listingId}
        className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-black text-white"
      />
    </section>
  );
}

export default function ListingDetailPage({ listingId }: { listingId: string }) {
  const { language: uiLanguage, t } = useV2Translation(publicUiMessages);

  const [showMore, setShowMore] = useState(false);
  const { listing, loading, error } = useListingDetail(listingId);

  if (loading) return <LoadingState />;
  if (error) {
    return (
      <ErrorState
        error={error}
        listingId={listingId}
      />
    );
  }

  if (!listing) {
    return (
      <EmptyState
        listingId={listingId}
      />
    );
  }

  const galleryPhotos = listingGalleryPhotos(listing.images, listing.imageUrl);

  const detailRows = buildDetailRows(listing, uiLanguage);
  const visibleDetails = showMore ? detailRows : detailRows.slice(0, 6);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[34px] border border-black/5 bg-white p-5 shadow-sm md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <ListingReturnBackButton
            listingId={listingId}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-bold shadow-sm"
          />

          <p className="text-sm font-semibold text-neutral-500">
            {listing.category ? getCategoryLabel(listing.category, listing.category, uiLanguage) : t("listing_2")}
            {listing.subcategory ? ` · ${getCategoryLabel(listing.subcategory, listing.subcategory, uiLanguage)}` : ""}
          </p>
        </div>

        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <PublicPhotoGallery key={listing.id} title={listing.title || t("untitled_listing")} photos={galleryPhotos} />

          <aside className="min-w-0 space-y-4">
            <div className="rounded-[28px] border border-black/5 bg-[#fbfbfa] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                    {t("listing_2")} </p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight">
                    {listing.title || t("untitled_listing")}
                  </h1>
                </div>

                <button className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-bold">
                  ♡
                </button>
              </div>

              <ListingPrice price={listing} className="mt-5" labelClassName="text-4xl" />

              <div className="mt-5 rounded-2xl bg-white p-4">
                <p className="text-sm font-bold">{listing.locationLabel || t("location_unspecified")}</p>
                {listing.distanceLabel ? (
                  <p className="mt-1 text-sm text-neutral-500">
                    {listing.distanceLabel}  {t("from_you")} </p>
                ) : null}
                <p className="mt-3 text-xs leading-5 text-neutral-400">
                  {t("a_private_seller_s_location_may_be_approximate_agree_the_exact_location_wit")} </p>
              </div>

              <div className="mt-5 grid gap-3">
                {v2IntegrationEnabled() ? <ListingContactButton listingId={listing.id} className="w-full rounded-full bg-black px-5 py-3 text-sm font-black text-white disabled:opacity-50" /> : <button className="rounded-full bg-black px-5 py-3 text-sm font-black text-white">
                  {t("contact_seller")} </button>}
                <button className="rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black">
                  {t("save_listing")} </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-400">
                {t("seller")} </p>

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
                  <h2 className="font-black">{listing.sellerName || t("seller")}</h2>
                  <p className="text-sm text-neutral-500">
                    {listing.sellerType === "private" ? t("private_seller") : listing.sellerType === "business" ? t("business_seller") : t("seller")}
                  </p>
                </div>
              </div>

              {listing.sellerSlug ? (
                <Link
                  href={`/v2/profile/${listing.sellerSlug}`}
                  className="mt-5 inline-flex w-full justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black"
                >
                  {t("view_profile")} </Link>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            {t("description")} </p>

          {listing.description ? (
            <p className="mt-4 text-base leading-8 text-neutral-700">
              {listing.description}
            </p>
          ) : (
            <p className="mt-4 text-base leading-8 text-neutral-500">
              {t("the_seller_has_not_added_a_description")} </p>
          )}

          <button
            onClick={() => setShowMore((value) => !value)}
            className="mt-5 rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-black shadow-sm"
          >
            {showMore ? t("show_less") : t("show_more")}
          </button>
        </div>

        <div className="rounded-[34px] border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-neutral-400">
            {t("key_details")} </p>

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
              {t("no_detail_fields_have_been_added")} </p>
          )}

          <p className="mt-5 text-sm text-neutral-500">
            {t("show_more_displays_further_listing_information_when_available")} </p>
        </div>
      </section>

    </div>
  );
}
