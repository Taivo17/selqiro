import { getMyAreaWantedSummaryLabels } from "./myAreaWantedSummary";
import type {
  OwnerMarketplaceItem,
} from "../../../entities/marketplace-item/model/types";
import type {
  MyIdentityListingCard,
} from "../../../entities/listing/model/types";
import {
  MY_AREA_LISTING_STATUS_ACTIONS,
  type MyAreaHorseOfferMarketplaceItemRow,
  type MyAreaListingMarketplaceItemRow,
  type MyAreaMarketplaceItemCardFields,
  type MyAreaMarketplaceItemRow,
} from "./myAreaMarketplaceItemRow";

const NO_MY_AREA_STATUS_ACTIONS = [] as const;
const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

const priceNumberFormatter =
  new Intl.NumberFormat("et-EE", {
    maximumFractionDigits: 2,
  });

const HORSE_VARIANT_LABELS: Record<
  string,
  string
> = {
  sale: "Müük",
  free_transfer: "Tasuta üleandmine",
  lease: "Rent",
  co_rider: "Kaasratsaniku otsing",
  wanted: "Otsin hobust",
};

const STATUS_LABELS: Record<string, string> = {
  active: "aktiivne",
  paused: "peatatud",
  sold: "müüdud",
  draft: "mustand",
  pending_review: "kontrollimisel",
  published: "aktiivne",
  closed: "lõpetatud",
  rejected: "tagasi lükatud",
  archived: "arhiveeritud",
};

function encodeContentId(
  contentId: string
): string {
  return encodeURIComponent(contentId);
}

function normalizeOptionalText(
  value: string | null
): string | null {
  const normalized = value?.trim() || "";
  return normalized || null;
}

function isNumericPriceText(
  value: string
): boolean {
  const normalized = value
    .replace(/\s+/g, "")
    .replace(",", ".");

  return /^\d+(?:\.\d{1,2})?$/.test(
    normalized
  );
}

function getPriceCurrencySuffix(
  currency: string | null
): string {
  const normalized =
    currency?.trim().toUpperCase() || "";

  if (!normalized || normalized === "EUR") {
    return " €";
  }

  return ` ${normalized}`;
}

function getPriceLabel(
  item: OwnerMarketplaceItem
): string {
  if (item.priceType === "free") {
    return "Tasuta";
  }

  const priceText =
    normalizeOptionalText(item.priceText);

  if (
    priceText
    && item.priceAmount !== null
    && isNumericPriceText(priceText)
  ) {
    return (
      priceNumberFormatter.format(
        item.priceAmount
      )
      + getPriceCurrencySuffix(
        item.currency
      )
    );
  }

  if (priceText) {
    return priceText;
  }

  if (item.priceAmount !== null) {
    return (
      priceNumberFormatter.format(
        item.priceAmount
      )
      + getPriceCurrencySuffix(
        item.currency
      )
    );
  }

  return "Hind kokkuleppel";
}

function getLocationLabel(
  item: OwnerMarketplaceItem
): string {
  return (
    normalizeOptionalText(
      item.locationLabel
    )
    || normalizeOptionalText(item.city)
    || normalizeOptionalText(item.region)
    || "Asukoht täpsustamata"
  );
}

function getDaysLeft(
  activeUntil: string | null
): number | null {
  if (!activeUntil) {
    return null;
  }

  const expiresAt = Date.parse(activeUntil);

  if (!Number.isFinite(expiresAt)) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil(
      (expiresAt - Date.now())
      / MILLISECONDS_PER_DAY
    )
  );
}

function getStatusLabel(
  sourceStatus: string
): string {
  return (
    STATUS_LABELS[sourceStatus]
    || sourceStatus
  );
}

function getHorseVariantLabel(
  contentVariant: string | null
): string | null {
  if (!contentVariant) {
    return null;
  }

  return (
    HORSE_VARIANT_LABELS[contentVariant]
    || contentVariant
  );
}

function buildCardFields(
  item: OwnerMarketplaceItem,
  href: string
): MyAreaMarketplaceItemCardFields {
  const horseVariant =
    item.contentType === "horse_offer"
      ? getHorseVariantLabel(
          item.contentVariant
        )
      : null;

  // Wanted uses only the validated summary, never seller-price/location fallbacks.
  const wanted = item.contentType === "horse_offer" && item.contentVariant === "wanted"
    ? getMyAreaWantedSummaryLabels(item.wantedSummary)
    : null;

  return {
    id: item.contentId,
    title: item.title,
    description: item.description,
    priceLabel: wanted?.priceLabel ?? getPriceLabel(item),
    priceAmount: item.priceAmount,
    currency: item.currency,
    imageUrl: item.imageUrl,
    category:
      item.contentType === "horse_offer"
        ? "Hobusepakkumine"
        : item.category,
    subcategory:
      item.contentType === "horse_offer"
        ? horseVariant
        : item.subcategory,
    condition:
      item.contentType === "horse_offer"
        ? null
        : item.condition,
    locationLabel: wanted?.locationLabel ?? getLocationLabel(item),
    distanceLabel: null,
    sellerName: "",
    sellerAvatarUrl: null,
    sellerSlug: null,
    sellerType: null,
    isHighlighted: false,
    href,
    status: item.sourceStatus,
    statusLabel:
      getStatusLabel(item.sourceStatus),
    activeUntil: item.activeUntil,
    daysLeft: getDaysLeft(item.activeUntil),
  };
}

function mapListingRow(
  item: Extract<
    OwnerMarketplaceItem,
    { contentType: "listing" }
  >
): MyAreaListingMarketplaceItemRow {
  const encodedContentId =
    encodeContentId(item.contentId);
  const detailHref =
    `/v2/listing/${encodedContentId}`;
  const editHref =
    `/v2/my-area/listings/${encodedContentId}/edit`;

  return {
    ...item,
    ...buildCardFields(item, detailHref),
    detailHref,
    editHref,
    canChangeStatus: true,
    allowedStatusActions:
      MY_AREA_LISTING_STATUS_ACTIONS,
  };
}

function mapHorseOfferRow(
  item: Extract<
    OwnerMarketplaceItem,
    { contentType: "horse_offer" }
  >
): MyAreaHorseOfferMarketplaceItemRow {
  return {
    ...item,
    ...buildCardFields(item, "#"),
    detailHref: null,
    editHref: null,
    canChangeStatus: false,
    allowedStatusActions:
      NO_MY_AREA_STATUS_ACTIONS,
  };
}

function assertNever(
  value: never
): never {
  throw new Error(
    `Tundmatu Minu ala marketplace-item tüüp: ${JSON.stringify(
      value
    )}`
  );
}

export function mapMyAreaMarketplaceItemRow(
  item: OwnerMarketplaceItem
): MyAreaMarketplaceItemRow {
  if (item.contentType === "listing") {
    return mapListingRow(item);
  }

  if (item.contentType === "horse_offer") {
    return mapHorseOfferRow(item);
  }

  return assertNever(item);
}

export function mapMyAreaMarketplaceItemRows(
  items: readonly OwnerMarketplaceItem[]
): MyAreaMarketplaceItemRow[] {
  return items.map(
    mapMyAreaMarketplaceItemRow
  );
}
