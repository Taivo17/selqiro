import type {
  OwnerHorseOfferMarketplaceItem,
  OwnerListingMarketplaceItem,
} from "../../../entities/marketplace-item/model/types";
import type {
  MyIdentityListingCard,
} from "../../../entities/listing/model/types";

export const MY_AREA_LISTING_STATUS_ACTIONS = [
  "active",
  "paused",
  "sold",
] as const;

export type MyAreaListingStatusAction =
  (typeof MY_AREA_LISTING_STATUS_ACTIONS)[number];

export type MyAreaMarketplaceItemCardFields =
  Omit<
    MyIdentityListingCard,
    "description"
  > & {
    description: string;
    statusLabel: string;
  };

export type MyAreaListingMarketplaceItemRow =
  OwnerListingMarketplaceItem &
    MyAreaMarketplaceItemCardFields & {
      detailHref: string;
      editHref: string;
      canChangeStatus: true;
      allowedStatusActions:
        readonly MyAreaListingStatusAction[];
    };

export type MyAreaHorseOfferMarketplaceItemRow =
  OwnerHorseOfferMarketplaceItem &
    MyAreaMarketplaceItemCardFields & {
      detailHref: null;
      editHref: null;
      canChangeStatus: false;
      allowedStatusActions: readonly [];
    };

export type MyAreaMarketplaceItemRow =
  | MyAreaListingMarketplaceItemRow
  | MyAreaHorseOfferMarketplaceItemRow;

export function isMyAreaHorseOfferMarketplaceItemRow(
  item: MyIdentityListingCard
): item is MyAreaHorseOfferMarketplaceItemRow {
  return (
    "contentType" in item
    && item.contentType === "horse_offer"
    && "canChangeStatus" in item
    && item.canChangeStatus === false
  );
}
