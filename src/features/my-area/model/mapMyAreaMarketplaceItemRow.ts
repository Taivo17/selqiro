import type {
  OwnerMarketplaceItem,
} from "../../../entities/marketplace-item/model/types";
import {
  MY_AREA_LISTING_STATUS_ACTIONS,
  type MyAreaHorseOfferMarketplaceItemRow,
  type MyAreaListingMarketplaceItemRow,
  type MyAreaMarketplaceItemRow,
} from "./myAreaMarketplaceItemRow";

const NO_MY_AREA_STATUS_ACTIONS = [] as const;

function encodeContentId(
  contentId: string
): string {
  return encodeURIComponent(contentId);
}

function mapListingRow(
  item: Extract<
    OwnerMarketplaceItem,
    { contentType: "listing" }
  >
): MyAreaListingMarketplaceItemRow {
  const encodedContentId =
    encodeContentId(item.contentId);

  return {
    ...item,
    detailHref:
      `/v2/listing/${encodedContentId}`,
    editHref:
      `/v2/my-area/listings/${encodedContentId}/edit`,
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
