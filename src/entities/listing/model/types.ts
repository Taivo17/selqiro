export type ListingCondition = "new" | "used" | "damaged" | string;

export type ProductListingCard = {
  id: string;
  title: string;
  description: string | null;
  priceLabel: string;
  priceAmount: number | null;
  currency: string | null;
  imageUrl: string | null;
  category: string | null;
  subcategory: string | null;
  condition: ListingCondition | null;
  locationLabel: string;
  distanceLabel: string | null;
  sellerName: string;
  sellerAvatarUrl: string | null;
  sellerSlug: string | null;
  sellerType: string | null;
  isHighlighted: boolean;
  href: string;
};

export type ListingImage = {
  id?: string;
  thumb_url?: string | null;
  medium_url?: string | null;
  original_url?: string | null;
  is_primary?: boolean | null;
  sort_order?: number | null;
};

export type ProductListingDetail = ProductListingCard & {
  userId: string | null;
  identityId: string | null;
  country: string | null;
  city: string | null;
  rawLocation: string | null;
  details: Record<string, unknown>;
  images: ListingImage[];
  createdAt: string | null;
  activeUntil: string | null;
};

export type MyIdentityListingCard = ProductListingCard & {
  status: "active" | "paused" | "sold" | string;
  activeUntil: string | null;
  daysLeft: number | null;
};
