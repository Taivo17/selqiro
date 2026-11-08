"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { messagesUiMessages } from "@/lib/i18n/catalogs/messagesUi";

import Link from "next/link";
import { useState } from "react";
import { safeListingCardImage, type ListingMessageCard } from "../../../entities/conversation/model/listingMessageCards";
import { horseMediaUrl } from "../../../entities/horse-offer/model/publicHorse";
import { serviceMediaUrl } from "../../../entities/service/model/publicService";
import { serviceEditorMessages } from "../../service-editor/model/serviceEditorMessages";

export default function ConversationListingCard({ listing }: { listing: ListingMessageCard }) {
  const { t } = useV2Translation(messagesUiMessages);
  const {t: serviceText} = useV2Translation(serviceEditorMessages);

  const horse = listing.content_type === "horse_offer";
  const service = listing.content_type === "service";
  const src = service ? serviceMediaUrl(listing.image) : horse ? horseMediaUrl(listing.image) : safeListingCardImage(listing.image);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return <Link href={(service ? "/v2/service/" : horse ? "/v2/horse-offer/" : "/v2/listing/") + listing.id} prefetch={false}
    className="flex min-w-0 items-center gap-3 rounded-xl border border-black/10 bg-white p-3 text-left hover:border-black/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
    aria-label={service ? serviceText("openService", {title: listing.title || serviceText("services")}) : t("view_listing_2") + (listing.title || t("listing"))}>
    <span className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 text-center text-xs text-neutral-500">
      {src && failedImage !== src
        // The existing media endpoint owns image access and immutable bytes.
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" width={80} height={64} loading="lazy" referrerPolicy="no-referrer"
          className="h-full w-full object-cover" onError={() => setFailedImage(src)} />
        : <span>{t("no_image")}</span>}
    </span>
    <span className="min-w-0 space-y-1">
      <span className="block break-words text-sm font-semibold">{listing.title || (service ? serviceText("services") : t("listing"))}</span>
      {listing.price !== null && <span className="block break-words text-sm text-neutral-700">{listing.price}</span>}
      <span className="block text-xs font-semibold underline underline-offset-2">{service ? serviceText("viewPublic") : t("view_listing")}</span>
    </span>
  </Link>;
}
