"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { messagesUiMessages } from "@/lib/i18n/catalogs/messagesUi";

import Link from "next/link";
import { useState } from "react";
import { safeListingCardImage, type ListingMessageCard } from "../../../entities/conversation/model/listingMessageCards";

export default function ConversationListingCard({ listing }: { listing: ListingMessageCard }) {
  const { t } = useV2Translation(messagesUiMessages);

  const src = safeListingCardImage(listing.image);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return <Link href={"/v2/listing/" + listing.id} prefetch={false}
    className="flex min-w-0 items-center gap-3 rounded-xl border border-black/10 bg-white p-3 text-left hover:border-black/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
    aria-label={t("view_listing_2") + (listing.title || t("listing"))}>
    <span className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 text-center text-xs text-neutral-500">
      {src && failedImage !== src
        // The existing media endpoint owns image access and immutable bytes.
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" width={80} height={64} loading="lazy" referrerPolicy="no-referrer"
          className="h-full w-full object-cover" onError={() => setFailedImage(src)} />
        : <span>{t("no_image")}</span>}
    </span>
    <span className="min-w-0 space-y-1">
      <span className="block break-words text-sm font-semibold">{listing.title || t("listing")}</span>
      {listing.price !== null && <span className="block break-words text-sm text-neutral-700">{listing.price}</span>}
      <span className="block text-xs font-semibold underline underline-offset-2">{t("view_listing")}</span>
    </span>
  </Link>;
}
