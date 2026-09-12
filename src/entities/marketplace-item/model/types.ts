export const MARKETPLACE_ITEM_CONTENT_TYPES = [
  "listing",
  "horse_offer",
] as const;

export type MarketplaceItemContentType =
  (typeof MARKETPLACE_ITEM_CONTENT_TYPES)[number];

export const OWNER_MARKETPLACE_ITEM_LIFECYCLE_STATUSES = [
  "draft",
  "pending_review",
  "active",
  "paused",
  "closed",
  "rejected",
  "archived",
] as const;

export type OwnerMarketplaceItemLifecycleStatus =
  (typeof OWNER_MARKETPLACE_ITEM_LIFECYCLE_STATUSES)[number];

export type OwnerMarketplaceItemBase = {
  key: string;
  contentId: string;
  identityId: string | null;
  ownerUserId: string | null;
  sourceStatus: string;
  lifecycleStatus: OwnerMarketplaceItemLifecycleStatus;
  contentVariant: string | null;
  title: string;
  description: string;
  priceText: string | null;
  priceAmount: number | null;
  priceType: string | null;
  currency: string | null;
  imageUrl: string | null;
  category: string | null;
  subcategory: string | null;
  condition: string | null;
  city: string | null;
  region: string | null;
  locationLabel: string | null;
  activeUntil: string | null;
  publishedAt: string | null;
  createdAt: string;
  sortAt: string;
  searchText: string;
};

export type OwnerListingMarketplaceItem =
  OwnerMarketplaceItemBase & {
    contentType: "listing";
  };

export type OwnerHorseOfferMarketplaceItem =
  OwnerMarketplaceItemBase & {
    contentType: "horse_offer";
  };

export type OwnerMarketplaceItem =
  | OwnerListingMarketplaceItem
  | OwnerHorseOfferMarketplaceItem;

export type GetMyMarketplaceItemsInput = {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
  storeCategoryId?: string | null;
};

export function getOwnerMarketplaceItemKey(
  contentType: MarketplaceItemContentType,
  contentId: string
): string {
  return `${contentType}:${contentId}`;
}
