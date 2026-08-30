export const LISTING_CREATE_CONTENT_TYPES = {
  listing: "listing",
  horseOffer: "horse_offer",
} as const;

export type ListingCreateContentType =
  (typeof LISTING_CREATE_CONTENT_TYPES)[keyof typeof LISTING_CREATE_CONTENT_TYPES];

export const DEFAULT_LISTING_CREATE_CONTENT_TYPE:
  ListingCreateContentType =
    LISTING_CREATE_CONTENT_TYPES.listing;
