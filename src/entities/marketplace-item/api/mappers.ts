import { parseOwnerWantedSummary } from "../model/ownerWantedSummary";
import {
  MARKETPLACE_ITEM_CONTENT_TYPES,
  OWNER_MARKETPLACE_ITEM_LIFECYCLE_STATUSES,
  getOwnerMarketplaceItemKey,
  type MarketplaceItemContentType,
  type OwnerMarketplaceItem,
  type OwnerMarketplaceItemLifecycleStatus,
} from "../model/types";

export type OwnerMarketplaceItemRow = {
  content_type?: unknown;
  content_id?: unknown;
  identity_id?: unknown;
  owner_user_id?: unknown;
  source_status?: unknown;
  lifecycle_status?: unknown;
  content_variant?: unknown;
  title?: unknown;
  description?: unknown;
  price_text?: unknown;
  price_amount?: unknown;
  price_type?: unknown;
  currency?: unknown;
  image_url?: unknown;
  category?: unknown;
  subcategory?: unknown;
  condition?: unknown;
  city?: unknown;
  region?: unknown;
  location_label?: unknown;
  active_until?: unknown;
  published_at?: unknown;
  created_at?: unknown;
  sort_at?: unknown;
  search_text?: unknown;
  wanted_summary?: unknown;
};

function requireString(
  value: unknown,
  field: string
): string {
  if (typeof value !== "string") {
    throw new Error(
      `Owner marketplace-item real puudub tekstiväli: ${field}.`
    );
  }

  return value;
}

function requireNonEmptyString(
  value: unknown,
  field: string
): string {
  const text = requireString(value, field).trim();

  if (!text) {
    throw new Error(
      `Owner marketplace-item real on tühi väli: ${field}.`
    );
  }

  return text;
}

function nullableString(
  value: unknown
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text || null;
}

function nullableNumber(
  value: unknown
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function parseContentType(
  value: unknown
): MarketplaceItemContentType {
  const contentType = requireNonEmptyString(
    value,
    "content_type"
  );

  if (
    !MARKETPLACE_ITEM_CONTENT_TYPES.includes(
      contentType as MarketplaceItemContentType
    )
  ) {
    throw new Error(
      `Tundmatu owner marketplace-item content_type: ${contentType}.`
    );
  }

  return contentType as MarketplaceItemContentType;
}

function parseLifecycleStatus(
  value: unknown
): OwnerMarketplaceItemLifecycleStatus {
  const lifecycleStatus = requireNonEmptyString(
    value,
    "lifecycle_status"
  );

  if (
    !OWNER_MARKETPLACE_ITEM_LIFECYCLE_STATUSES.includes(
      lifecycleStatus as OwnerMarketplaceItemLifecycleStatus
    )
  ) {
    throw new Error(
      `Tundmatu owner marketplace-item lifecycle_status: ${lifecycleStatus}.`
    );
  }

  return lifecycleStatus as OwnerMarketplaceItemLifecycleStatus;
}

export function mapOwnerMarketplaceItemRow(
  row: OwnerMarketplaceItemRow
): OwnerMarketplaceItem {
  if (row === null || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("Omaniku kuulutuste vastuses on vigane rida.");
  }

  const contentType = parseContentType(
    row.content_type
  );
  const contentId = requireNonEmptyString(
    row.content_id,
    "content_id"
  );

  const base = {
    key: getOwnerMarketplaceItemKey(
      contentType,
      contentId
    ),
    contentId,
    identityId: nullableString(
      row.identity_id
    ),
    ownerUserId: nullableString(
      row.owner_user_id
    ),
    sourceStatus: requireNonEmptyString(
      row.source_status,
      "source_status"
    ),
    lifecycleStatus: parseLifecycleStatus(
      row.lifecycle_status
    ),
    contentVariant: nullableString(
      row.content_variant
    ),
    title: requireString(
      row.title,
      "title"
    ),
    description: requireString(
      row.description,
      "description"
    ),
    priceText: nullableString(
      row.price_text
    ),
    priceAmount: nullableNumber(
      row.price_amount
    ),
    priceType: nullableString(
      row.price_type
    ),
    currency: nullableString(
      row.currency
    ),
    imageUrl: nullableString(
      row.image_url
    ),
    category: nullableString(
      row.category
    ),
    subcategory: nullableString(
      row.subcategory
    ),
    condition: nullableString(
      row.condition
    ),
    city: nullableString(
      row.city
    ),
    region: nullableString(
      row.region
    ),
    locationLabel: nullableString(
      row.location_label
    ),
    activeUntil: nullableString(
      row.active_until
    ),
    publishedAt: nullableString(
      row.published_at
    ),
    createdAt: requireNonEmptyString(
      row.created_at,
      "created_at"
    ),
    sortAt: requireNonEmptyString(
      row.sort_at,
      "sort_at"
    ),
    searchText: requireString(
      row.search_text,
      "search_text"
    ),
  };

  if (contentType === "listing") {
    return {
      ...base,
      contentType,
    };
  }

  return {
    ...base,
    contentType,
    wantedSummary: base.contentVariant === "wanted"
      ? parseOwnerWantedSummary(row.wanted_summary)
      : null,
  };
}

export function mapOwnerMarketplaceItemRows(
  value: unknown
): OwnerMarketplaceItem[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(
      "Owner marketplace-item RPC vastus ei ole massiiv."
    );
  }

  return value.map((row) =>
    mapOwnerMarketplaceItemRow(
      row as OwnerMarketplaceItemRow
    )
  );
}
