"use client";

import { getCategoryLabel } from "@/lib/categories";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { accountUiMessages } from "@/lib/i18n/catalogs/accountUi";


import ListingPrice from "../../../entities/listing/ui/ListingPrice";
import Link from "next/link";
import type { ListingStatus } from "../../../entities/listing/api/updateListingStatus";
import { getListingActivity, isRenewableListingId } from "../../../entities/listing/model/listingActivity";
import type { MyAreaListingMarketplaceItemRow } from "../model/myAreaMarketplaceItemRow";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { managedListingMedia } from "../../../entities/listing/model/listingMediaUrl";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import ManagedOwnerImage from "../../listing-edit/components/ManagedOwnerImage";

type Props = { listing: MyAreaListingMarketplaceItemRow; now: number; busy: boolean; disabled: boolean;
  activeIdentityId: string | null; ownerActor?: PublicationActor | null; onRenew: () => void; onStatus: (status: ListingStatus) => void };
export default function MyAreaListingRow({ listing, now, busy, disabled, activeIdentityId, ownerActor, onRenew, onStatus }: Props) {
  const { language: uiLanguage, t } = useV2Translation(accountUiMessages);

  const activity = getListingActivity(listing.status, listing.activeUntil, now, uiLanguage);
  const knownStatus = ["active", "paused", "sold"].includes(listing.status);
  const canRenew = activity.canRenew && listing.identityId === activeIdentityId && isRenewableListingId(listing.id);
  const managed = v2IntegrationEnabled() && !!managedListingMedia(listing.imageUrl);
  const imageClass = "h-16 w-24 shrink-0 rounded-2xl object-cover object-[center_42%] sm:w-28";
  const tone = activity.state === "active" ? "border-emerald-100 bg-emerald-50 text-emerald-800"
    : activity.state === "expired" || activity.state === "unknown" ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-neutral-200 bg-neutral-100 text-neutral-700";
  return (
    <div className="grid w-full min-w-0 gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_105px_150px] md:items-center">
      <div className="flex min-w-0 items-center gap-3 rounded-2xl p-2 sm:gap-4">
        {managed && listing.imageUrl && ownerActor ? <ManagedOwnerImage source={listing.imageUrl} actor={ownerActor} className={imageClass} compact />
          : listing.imageUrl && !managed ? <img src={listing.imageUrl} alt="" loading="lazy" className={imageClass} />
          : <div className="h-16 w-24 shrink-0 rounded-2xl bg-neutral-100 sm:w-28" />}
        <Link href={v2IntegrationEnabled() && activity.state !== "active" ? listing.editHref : listing.href} className="min-w-0 flex-1 rounded-xl hover:bg-neutral-50">
          <h3 className="truncate text-base font-black">{listing.title}</h3>
          <p className="mt-1 truncate text-sm text-neutral-500">{listing.category ? getCategoryLabel(listing.category, listing.category, uiLanguage) : t("no_category")} · {listing.locationLabel || t("location_unspecified")}</p>
          <p className="mt-1 text-xs font-semibold text-neutral-600">{activity.label}</p>
          {activity.deadlineLabel ? <p className="mt-1 text-xs text-neutral-500">{activity.deadlineLabel}</p> : null}
          {activity.state === "expired" ? <p className="mt-1 text-xs text-amber-800">{t("expired_listings_are_not_shown_in_search")}</p> : null}
        </Link>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3 md:block md:text-right">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 md:hidden">{t("price")}</span>
        <ListingPrice price={listing} labelClassName="text-base" />
      </div>
      <div className="grid min-w-0 gap-2">
        <label className="sr-only" htmlFor={`listing-status-${listing.id}`}>{t("status_for_listing", {title: listing.title})}</label>
        <select id={`listing-status-${listing.id}`} value={knownStatus ? listing.status : "unknown"}
          disabled={disabled || !knownStatus} onChange={e => onStatus(e.target.value as ListingStatus)}
          className={`min-h-10 w-full min-w-0 rounded-full border px-3 py-2 text-xs font-bold disabled:opacity-60 ${tone}`}>
          {!knownStatus ? <option value="unknown">{t("status_needs_checking")}</option> : null}
          <option value="active">{listing.status === "active" ? activity.label : t("activate")}</option>
          <option value="paused">{t("paused")}</option><option value="sold">{t("sold")}</option>
        </select>
        {canRenew ? <button type="button" disabled={disabled} onClick={onRenew}
          className="min-h-11 rounded-full border border-neutral-300 bg-white px-3 py-2 text-sm font-bold disabled:opacity-50">
          {busy ? t("please_wait") : t("renew_listing")}
        </button> : null}
        <Link href={listing.editHref} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined}
          onClick={e => { if (disabled) e.preventDefault(); }}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-neutral-200 px-3 py-2 text-xs font-bold">
          {t("edit")} </Link>
      </div>
    </div>
  );
}
