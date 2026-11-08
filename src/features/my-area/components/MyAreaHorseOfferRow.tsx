"use client";

import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import Link from "next/link";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { horsePublicationMessages } from "../../horse-publication/model/horsePublicationMessages";
import { OWNER_HORSE_KIND_LABELS, OWNER_HORSE_STATUS_LABELS } from "../../horse-offer-detail/model/ownerHorseDetailLabels";
import { formatOwnerHorseMoney } from "../../../entities/horse-offer/model/ownerMoney";
import { getMyAreaWantedSummaryLabels } from "../model/myAreaWantedSummary";

import type {
  MyAreaHorseOfferMarketplaceItemRow,
} from "../model/myAreaMarketplaceItemRow";

type MyAreaHorseOfferRowProps = {
  item: MyAreaHorseOfferMarketplaceItemRow;
};

function getStatusClasses(
  lifecycleStatus:
    MyAreaHorseOfferMarketplaceItemRow["lifecycleStatus"]
): string {
  if (lifecycleStatus === "active") {
    return (
      "border-emerald-200 bg-emerald-50 "
      + "text-emerald-700"
    );
  }

  if (lifecycleStatus === "paused") {
    return (
      "border-amber-200 bg-amber-50 "
      + "text-amber-800"
    );
  }

  return (
    "border-zinc-200 bg-zinc-50 "
    + "text-zinc-600"
  );
}

export default function MyAreaHorseOfferRow({
  item,
}: MyAreaHorseOfferRowProps) {
  const { language, r } = useMarketplaceTranslation();
  const {t} = useV2Translation(horsePublicationMessages);
  const isWanted = item.contentVariant === "wanted";
  const wanted = isWanted ? getMyAreaWantedSummaryLabels(item.wantedSummary, language) : null;
  const rawPrice = item.priceText?.trim() || "";
  const plainNumeric = /^\d+(?:[.,]\d{1,2})?$/.test(rawPrice.replace(/\s+/g, ""));
  const sellerPrice = item.priceType === "free"
    ? marketplaceMessage("horse.free.e5aa0d")
    : rawPrice && !plainNumeric ? rawPrice
    : typeof item.priceAmount === "number" ? formatOwnerHorseMoney(item.priceAmount, item.currency || "EUR", language)
    : rawPrice || marketplaceMessage("service.price_by_agreement.299166");
  const priceLabel = wanted?.priceLabel ?? sellerPrice;
  const statusLabel = OWNER_HORSE_STATUS_LABELS[item.sourceStatus] || item.statusLabel;
  const meta = [
    OWNER_HORSE_KIND_LABELS[item.contentVariant || ""] || item.subcategory,
    wanted?.locationLabel ?? (item.locationLabel || marketplaceMessage("horse.location_not_added.8c8234")),
  ].filter(Boolean).join(" · ");

  const title =
    item.title || marketplaceMessage("horse.untitled_horse_listing.9905c6");

  const editable = item.sourceStatus === "draft" || item.sourceStatus === "published";

  const detailHref =
    `/v2/my-area/horse-offers/${
      encodeURIComponent(item.contentId)
    }`;

  return (
    <article
      className={[
        "grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 border-t border-zinc-200 py-3.5",
        "first:border-t-0",
        "md:grid-cols-[minmax(0,1fr)_90px_120px]",
        "md:items-center",
      ].join(" ")}
      data-content-id={item.contentId}
      data-content-type="horse_offer"
    >
      <Link
        className={[
          "group flex min-w-0 items-center gap-3",
          "rounded-xl md:pl-2",
          "focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-zinc-900",
          "focus-visible:ring-offset-2",
        ].join(" ")}
        href={detailHref}
      >
        {r(item.imageUrl ? (
          <img
            alt=""
            className={[
              "h-16 w-28 flex-none rounded-xl",
              "bg-zinc-100 object-cover",
            ].join(" ")}
            src={item.imageUrl}
          />
        ) : (
          <div
            aria-hidden="true"
            className={[
              "flex h-16 w-28 flex-none items-center",
              "justify-center rounded-xl bg-zinc-100",
              "text-sm font-semibold text-zinc-500",
            ].join(" ")}
          >
            {r(marketplaceMessage("horse.horse.e6dbc2"))}</div>
        ))}

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex min-w-0 items-center">
            <span
              className={[
                "max-w-full truncate whitespace-nowrap",
                "rounded-full border border-amber-200",
                "bg-amber-50 px-2 py-0.5 text-[10px]",
                "font-semibold uppercase tracking-[0.08em]",
                "text-amber-900",
              ].join(" ")}
            >
              {r(marketplaceMessage("horse.horse_listing.f28ecd"))}</span>
          </div>

          <h3
            className={[
              "truncate text-base font-semibold text-zinc-950",
              "transition-colors group-hover:text-zinc-700",
            ].join(" ")}
            title={r(title)}
          >
            {r(title)}
          </h3>

          {r(meta ? (
            <p
              className={isWanted
                ? "mt-0.5 break-words text-sm text-zinc-500"
                : "mt-0.5 truncate text-sm text-zinc-500"}
              title={r(meta)}
            >
              {r(meta)}
            </p>
          ) : null)}

          {r(typeof item.daysLeft === "number" ? (
            <p className="mt-0.5 text-xs text-zinc-400">
              {r(item.daysLeft === 1 ? marketplaceMessage("horse.daysLeftOne") : marketplaceMessage("horse.daysLeftMany", { count: item.daysLeft }))}</p>
          ) : null)}
        </div>
      </Link>

      <p className="min-w-0 break-words text-sm font-semibold text-zinc-900 md:text-right">
        {r(priceLabel)}
      </p>

      <div className="flex flex-col items-stretch gap-1 md:items-end">
        <span
          className={[
            "inline-flex min-w-24 justify-center rounded-full",
            "border px-3 py-1.5 text-xs font-semibold",
            getStatusClasses(item.lifecycleStatus),
          ].join(" ")}
        >
          {r(statusLabel)}
        </span>
        {editable ? <Link href={`${detailHref}/edit`} className="rounded-full border px-4 py-2 text-center text-xs font-bold">{t("edit")}</Link> : null}
        {item.sourceStatus === "published" ? <Link href={`/v2/horse-offer/${encodeURIComponent(item.contentId)}`} className="text-center text-xs underline">{t("publicView")}</Link> : null}
      </div>
    </article>
  );
}
