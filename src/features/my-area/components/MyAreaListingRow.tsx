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
import OwnerListingActions from "./OwnerListingActions";

type Props = { listing: MyAreaListingMarketplaceItemRow; now: number; busy: boolean; disabled: boolean;
  activeIdentityId: string | null; ownerActor?: PublicationActor | null; onRenew: () => void; onStatus: (status: ListingStatus) => void };
export default function MyAreaListingRow({ listing, now, busy, disabled, activeIdentityId, ownerActor, onRenew, onStatus }: Props) {
  const { language: uiLanguage, t } = useV2Translation(accountUiMessages);

  const activity = getListingActivity(listing.status, listing.activeUntil, now, uiLanguage);
  const canRenew = activity.canRenew && listing.identityId === activeIdentityId && isRenewableListingId(listing.id);
  const managed = v2IntegrationEnabled() && !!managedListingMedia(listing.imageUrl);
  const imageClass = "h-16 w-24 shrink-0 rounded-2xl object-cover object-[center_42%] sm:w-28";
  const href = v2IntegrationEnabled() && activity.state !== "active" ? listing.editHref : listing.href;
  return (
    <div className="grid w-full min-w-0 gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_105px_150px] md:items-center">
      <div className="flex min-w-0 items-center gap-3 rounded-2xl p-2 sm:gap-4">
        {managed && listing.imageUrl && ownerActor ? <ManagedOwnerImage source={listing.imageUrl} actor={ownerActor}
          className={imageClass} compact href={href} linkLabel={listing.title} />
          : <Link href={href} aria-label={listing.title} className="shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">
            {listing.imageUrl && !managed ? <img src={listing.imageUrl} alt="" loading="lazy" className={imageClass} />
              : <div className="h-16 w-24 rounded-2xl bg-neutral-100 sm:w-28" />}
          </Link>}
        <Link href={href} className="min-w-0 flex-1 rounded-xl hover:bg-neutral-50">
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
      <OwnerListingActions itemKey={listing.key} title={listing.title} status={listing.status} activity={activity}
        canRenew={canRenew} disabled={disabled} busy={busy} editHref={listing.editHref} onRenew={onRenew} onStatus={onStatus} />
    </div>
  );
}
