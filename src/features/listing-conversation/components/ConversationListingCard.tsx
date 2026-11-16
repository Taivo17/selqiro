"use client";
import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";
import { messagesUiMessages } from "@/lib/i18n/catalogs/messagesUi";
import Link from "next/link";
import { useState } from "react";
import { safeListingCardImage, type ListingMessageCard } from "../../../entities/conversation/model/listingMessageCards";
import { horseMediaUrl } from "../../../entities/horse-offer/model/publicHorse";
import { serviceMediaUrl } from "../../../entities/service/model/publicService";
import { getOfferTheme } from "../../../shared/marketplace/offerTheme";
import { conversationOfferKind, conversationSubjectHref, conversationSubjectMessages } from "../model/conversationSubject";

export default function ConversationListingCard({ listing }: { listing: ListingMessageCard }) {
  const { t } = useV2Translation(messagesUiMessages), { t: subjectText } = useV2Translation(conversationSubjectMessages);
  const kind = conversationOfferKind(listing), href = conversationSubjectHref(listing), theme = getOfferTheme(kind);
  const src = kind === "job" ? null : kind === "service" ? serviceMediaUrl(listing.image)
    : kind === "horse" ? horseMediaUrl(listing.image) : safeListingCardImage(listing.image);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  if (!href) return null;
  return <Link href={href} prefetch={false}
    className={"flex min-w-0 items-center gap-3 rounded-xl p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 " + theme.card}
    aria-label={subjectText("view") + ": " + (listing.title || subjectText(kind))}>
    {kind !== "job" && <span className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/70 text-center text-xs text-neutral-500">
      {src && failedImage !== src
        // Existing media routes retain their own public eligibility checks.
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" width={80} height={64} loading="lazy" referrerPolicy="no-referrer"
          className="h-full w-full object-cover" onError={() => setFailedImage(src)} />
        : <span>{t("no_image")}</span>}
    </span>}
    <span className="min-w-0 space-y-1">
      <span className="block text-xs font-semibold">{subjectText(kind)}</span>
      <span className="block break-words text-sm font-semibold">{listing.title || subjectText(kind)}</span>
      {listing.price !== null && <span className="block break-words text-sm">{listing.price}</span>}
      <span className="block text-xs font-semibold underline underline-offset-2">{subjectText("view")}</span>
    </span>
  </Link>;
}
