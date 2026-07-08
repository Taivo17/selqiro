import type {
  ListingImage,
  ProductListingCard,
  ProductListingDetail,
} from "../model/types";
import { getPrimaryListingImageUrl, sortListingImages } from "../model/image";
import {
  formatDistanceLabel,
  formatLocationLabel,
  formatPriceLabel,
} from "../model/format";

export type MarketplaceListingRow = {
  listing_id?: string | number | null;
  id?: string | number | null;
  user_id?: string | null;
  identity_id?: string | null;
  seller_name?: string | null;
  seller_slug?: string | null;
  seller_avatar_url?: string | null;
  avatar_url?: string | null;
  seller_type?: string | null;
  is_premium?: boolean | null;
  distance_km?: number | null;
  title?: string | null;
  description?: string | null;
  price?: string | null;
  price_amount?: number | null;
  currency?: string | null;
  image?: string | null;
  category?: string | null;
  subcategory?: string | null;
  condition?: string | null;
  country?: string | null;
  city?: string | null;
  location?: string | null;
  details?: Record<string, unknown> | null;
  active_until?: string | null;
  created_at?: string | null;
  status?: string | null;
  listing_images?: ListingImage[] | null;
};

function normalizeId(value?: string | number | null): string {
  return value === null || typeof value === "undefined" ? "" : String(value);
}

export function mapMarketplaceListingRow(
  row: MarketplaceListingRow
): ProductListingCard {
  const id = normalizeId(row.listing_id || row.id);

  return {
    id,
    title: row.title || "Pealkiri puudub",
    description: row.description || null,
    priceLabel: formatPriceLabel({
      price: row.price,
      priceAmount: row.price_amount ?? null,
      currency: row.currency || "€",
    }),
    priceAmount: row.price_amount ?? null,
    currency: row.currency || "€",
    imageUrl: getPrimaryListingImageUrl({
      images: row.listing_images || [],
      fallbackImage: row.image || null,
    }),
    category: row.category || null,
    subcategory: row.subcategory || null,
    condition: row.condition || null,
    locationLabel: formatLocationLabel({
      city: row.city,
      location: row.location,
      country: row.country,
    }),
    distanceLabel: formatDistanceLabel(row.distance_km ?? null),
    sellerName: row.seller_name || "Müüja",
    sellerAvatarUrl: row.seller_avatar_url || row.avatar_url || null,
    sellerSlug: row.seller_slug || null,
    sellerType: row.seller_type || null,
    isHighlighted: Boolean(row.is_premium),
    href: `/v2/listing/${id}`,
  };
}

export function mapListingDetailRow(row: MarketplaceListingRow): ProductListingDetail {
  const card = mapMarketplaceListingRow(row);
  const images = sortListingImages(row.listing_images || []);

  return {
    ...card,
    userId: row.user_id || null,
    identityId: row.identity_id || null,
    country: row.country || null,
    city: row.city || null,
    rawLocation: row.location || null,
    details: row.details || {},
    images,
    createdAt: row.created_at || null,
    activeUntil: row.active_until || null,
    status: row.status || null,
  };
}
