import type {
  OwnerHorseOfferMarketplaceItem,
  OwnerListingMarketplaceItem,
} from "../../../entities/marketplace-item/model/types";

export const MY_AREA_LISTING_STATUS_ACTIONS = [
  "active",
  "paused",
  "sold",
] as const;

export type MyAreaListingStatusAction =
  (typeof MY_AREA_LISTING_STATUS_ACTIONS)[number];

export type MyAreaListingMarketplaceItemRow =
  OwnerListingMarketplaceItem & {
    detailHref: string;
    editHref: string;
    canChangeStatus: true;
    allowedStatusActions:
      readonly MyAreaListingStatusAction[];
  };

export type MyAreaHorseOfferMarketplaceItemRow =
  OwnerHorseOfferMarketplaceItem & {
    detailHref: null;
    editHref: null;
    canChangeStatus: false;
    allowedStatusActions: readonly [];
  };

export type MyAreaMarketplaceItemRow =
  | MyAreaListingMarketplaceItemRow
  | MyAreaHorseOfferMarketplaceItemRow;
