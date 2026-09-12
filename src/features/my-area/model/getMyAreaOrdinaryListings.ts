import {
  getMyMarketplaceItems,
} from "../../../entities/marketplace-item/api/getMyMarketplaceItems";
import type {
  GetMyMarketplaceItemsInput,
  OwnerListingMarketplaceItem,
} from "../../../entities/marketplace-item/model/types";
import type {
  MyIdentityListingCard,
} from "../../../entities/listing/model/types";

type LegacyGetMyIdentityListings = typeof import(
  "../../../entities/listing/api/getMyIdentityListings"
).getMyIdentityListings;

type LegacyOwnerListingsArgs =
  Parameters<LegacyGetMyIdentityListings>;

type LegacyOwnerListingsResult =
  Awaited<ReturnType<LegacyGetMyIdentityListings>>;

type UnknownRecord = Record<string, unknown>;

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

const priceNumberFormatter =
  new Intl.NumberFormat("et-EE", {
    maximumFractionDigits: 2,
  });

function isRecord(
  value: unknown
): value is UnknownRecord {
  return Boolean(
    value
    && typeof value === "object"
    && !Array.isArray(value)
  );
}

function getObjectInput(
  args: readonly unknown[]
): UnknownRecord | null {
  if (args.length !== 1 || !isRecord(args[0])) {
    return null;
  }

  return args[0];
}

function readObjectValue(
  input: UnknownRecord | null,
  keys: readonly string[]
): unknown {
  if (!input) {
    return undefined;
  }

  for (const key of keys) {
    if (key in input) {
      return input[key];
    }
  }

  return undefined;
}

function readNumber(
  value: unknown,
  fallback: number
): number {
  if (
    typeof value === "number"
    && Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string"
    && value.trim()
    && Number.isFinite(Number(value))
  ) {
    return Number(value);
  }

  return fallback;
}

function readText(
  value: unknown,
  fallback: string
): string {
  return typeof value === "string"
    ? value
    : fallback;
}

function readNullableText(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function toSharedReadInput(
  legacyArgs: LegacyOwnerListingsArgs
): GetMyMarketplaceItemsInput {
  const args: readonly unknown[] =
    legacyArgs;
  const objectInput = getObjectInput(args);

  const limitValue =
    readObjectValue(
      objectInput,
      ["resultLimit", "limit"]
    )
    ?? args[0];

  const offsetValue =
    readObjectValue(
      objectInput,
      ["resultOffset", "offset"]
    )
    ?? args[1];

  const statusValue =
    readObjectValue(
      objectInput,
      ["statusFilter", "status"]
    )
    ?? args[2];

  const searchValue =
    readObjectValue(
      objectInput,
      ["searchQuery", "search"]
    )
    ?? args[3];

  const storeCategoryValue =
    readObjectValue(
      objectInput,
      [
        "storeCategoryFilter",
        "storeCategoryId",
      ]
    )
    ?? args[4];

  return {
    limit: readNumber(limitValue, 500),
    offset: readNumber(offsetValue, 0),
    status: readText(statusValue, "all"),
    search: readText(searchValue, ""),
    storeCategoryId:
      readNullableText(storeCategoryValue),
  };
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
  item: OwnerListingMarketplaceItem
): string {
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
  item: OwnerListingMarketplaceItem
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

  const expiresAt =
    Date.parse(activeUntil);

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

function toMyIdentityListingCard(
  item: OwnerListingMarketplaceItem
): MyIdentityListingCard {
  return {
    id: item.contentId,
    title: item.title,
    description:
      normalizeOptionalText(
        item.description
      ),
    priceLabel: getPriceLabel(item),
    priceAmount: item.priceAmount,
    currency: item.currency,
    imageUrl: item.imageUrl,
    category: item.category,
    subcategory: item.subcategory,
    condition: item.condition,
    locationLabel:
      getLocationLabel(item),
    distanceLabel: null,
    sellerName: "",
    sellerAvatarUrl: null,
    sellerSlug: null,
    sellerType: null,
    isHighlighted: false,
    href:
      `/v2/listing/${encodeURIComponent(
        item.contentId
      )}`,
    status: item.sourceStatus,
    activeUntil: item.activeUntil,
    daysLeft:
      getDaysLeft(item.activeUntil),
  };
}

/**
 * Temporary compatibility boundary for the first shared owner-read connection.
 *
 * The canonical read is getMyMarketplaceItems. This adapter returns the exact
 * MyIdentityListingCard contract already consumed by Minu ala and intentionally
 * filters out horse offers until routes, actions and mutations become
 * content-type aware in separate checkpoints.
 */
export async function getMyAreaOrdinaryListings(
  ...legacyArgs: LegacyOwnerListingsArgs
): Promise<LegacyOwnerListingsResult> {
  const items = await getMyMarketplaceItems(
    toSharedReadInput(legacyArgs)
  );

  const ordinaryItems = items.filter(
    (
      item
    ): item is OwnerListingMarketplaceItem =>
      item.contentType === "listing"
  );

  return ordinaryItems.map(
    toMyIdentityListingCard
  );
}
