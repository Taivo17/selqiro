"use client";

import Link from "next/link";
import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { accountUiMessages } from "../../../../lib/i18n/catalogs/accountUi";
import { OWNER_HORSE_KIND_LABELS, OWNER_HORSE_STATUS_LABELS } from "../../horse-offer-detail/model/ownerHorseDetailLabels";
import { formatOwnerHorseMoney } from "../../../entities/horse-offer/model/ownerMoney";
import { horseActivityStatus } from "../../../entities/horse-offer/model/horseActivity";
import { managedHorseMedia } from "../../../entities/marketplace-item/model/ownerMediaUrl";
import { getListingActivity } from "../../../entities/listing/model/listingActivity";
import { isUploadUuid } from "../../../entities/listing/model/privatePublicationUpload";
import type { ListingStatus } from "../../../entities/listing/api/updateListingStatus";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { getMyAreaWantedSummaryLabels } from "../model/myAreaWantedSummary";
import type { MyAreaHorseOfferMarketplaceItemRow } from "../model/myAreaMarketplaceItemRow";
import ManagedOwnerImage from "../../listing-edit/components/ManagedOwnerImage";
import OwnerListingActions from "./OwnerListingActions";

type Props = { item: MyAreaHorseOfferMarketplaceItemRow; now: number; busy: boolean; disabled: boolean;
  activeIdentityId: string | null; ownerActor?: PublicationActor | null;
  onRenew: () => void; onStatus: (status: ListingStatus) => void };

export default function MyAreaHorseOfferRow({ item, now, busy, disabled, activeIdentityId, ownerActor, onRenew, onStatus }: Props) {
  const { language, r } = useMarketplaceTranslation();
  const { t } = useV2Translation(accountUiMessages);
  const isWanted = item.contentVariant === "wanted";
  const wanted = isWanted ? getMyAreaWantedSummaryLabels(item.wantedSummary, language) : null;
  const rawPrice = item.priceText?.trim() || "";
  const plainNumeric = /^\d+(?:[.,]\d{1,2})?$/.test(rawPrice.replace(/\s+/g, ""));
  const sellerPrice = item.priceType === "free" ? marketplaceMessage("horse.free.e5aa0d")
    : rawPrice && !plainNumeric ? rawPrice
    : typeof item.priceAmount === "number" ? formatOwnerHorseMoney(item.priceAmount, item.currency || "EUR", language)
    : rawPrice || marketplaceMessage("service.price_by_agreement.299166");
  const priceLabel = wanted?.priceLabel ?? sellerPrice;
  const title = item.title || marketplaceMessage("horse.untitled_horse_listing.9905c6");
  const meta = [OWNER_HORSE_KIND_LABELS[item.contentVariant || ""] || item.subcategory,
    wanted?.locationLabel ?? (item.locationLabel || marketplaceMessage("horse.location_not_added.8c8234")),
  ].filter(Boolean).join(" · ");
  const status = horseActivityStatus(item.sourceStatus);
  const activity = getListingActivity(status ?? "unknown", item.activeUntil, now, language);
  const editable = item.sourceStatus === "draft" || status !== null;
  const ownerHref = `/v2/my-area/horse-offers/${encodeURIComponent(item.contentId)}`;
  const editHref = item.editHref;
  const href = activity.state === "active" && item.activeUntil !== null ? item.detailHref : editable ? editHref : ownerHref;
  const canRenew = !!status && activity.canRenew && item.identityId === activeIdentityId && isUploadUuid(item.contentId);
  const imageClass = "h-16 w-24 shrink-0 rounded-2xl object-cover sm:w-28";
  const managed = !!managedHorseMedia(item.imageUrl);
  const label = r(title);

  return <article className="grid w-full min-w-0 gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_105px_150px] md:items-center"
    data-content-id={item.contentId} data-content-type="horse_offer">
    <div className="flex min-w-0 items-center gap-3 rounded-2xl p-2 sm:gap-4">
      {managed && item.imageUrl && ownerActor ? <ManagedOwnerImage source={item.imageUrl} contentType="horse_offer"
        actor={ownerActor} className={imageClass} compact href={href} linkLabel={label} />
        : <Link href={href} aria-label={label} className="shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">
          {item.imageUrl && !managed ? <img src={item.imageUrl} alt="" loading="lazy" className={imageClass} />
            : <div aria-hidden="true" className={`${imageClass} flex items-center justify-center bg-neutral-100 text-sm font-semibold text-neutral-500`}>
              {r(marketplaceMessage("horse.horse.e6dbc2"))}
            </div>}
        </Link>}
      <Link href={href} className="group min-w-0 flex-1 rounded-xl hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">
        <span className="mb-1 inline-flex max-w-full truncate rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-900">
          {r(marketplaceMessage("horse.horse_listing.f28ecd"))}
        </span>
        <h3 className="truncate text-base font-black" title={label}>{label}</h3>
        {meta ? <p className={`mt-1 text-sm text-neutral-500 ${isWanted ? "break-words" : "truncate"}`} title={r(meta)}>{r(meta)}</p> : null}
        {status ? <>
          <p className="mt-1 text-xs font-semibold text-neutral-600">{activity.label}</p>
          {activity.deadlineLabel ? <p className="mt-1 text-xs text-neutral-500">{activity.deadlineLabel}</p> : null}
          {activity.state === "expired" ? <p className="mt-1 text-xs text-amber-800">{t("expired_listings_are_not_shown_in_search")}</p> : null}
        </> : null}
      </Link>
    </div>
    <div className="flex min-w-0 items-center justify-between gap-3 md:block md:text-right">
      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 md:hidden">{t("price")}</span>
      <p className="min-w-0 break-words text-base font-black">{r(priceLabel)}</p>
    </div>
    {status ? <OwnerListingActions itemKey={item.key} title={label} status={status} activity={activity} busy={busy}
      disabled={disabled || !item.canChangeStatus} canRenew={canRenew} editHref={editHref} onRenew={onRenew} onStatus={onStatus} />
      : <div className="grid min-w-0 gap-2">
        <span className="inline-flex min-h-10 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700">
          {r(OWNER_HORSE_STATUS_LABELS[item.sourceStatus] || item.statusLabel)}
        </span>
        {editable ? <Link href={editHref} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined}
          onClick={event => { if (disabled) event.preventDefault(); }}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-neutral-200 px-3 py-2 text-xs font-bold">{t("edit")}</Link> : null}
      </div>}
  </article>;
}
