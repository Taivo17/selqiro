import { getListingPriceDisplay, type ListingPriceDisplay } from "../priceDisplay";
import type { PriceRead } from "./priceRead";
import type { SearchCardV2 } from "./publicSearchV2";
import type { PublicDetail } from "./publicDetailV1";
import type { ProductListingCard, ProductListingDetail } from "../types";
export function priceReadDisplay(price: PriceRead): ListingPriceDisplay {
  if (price.kind === "fixed") return getListingPriceDisplay({priceAmount: price.amount, currency: price.currency});
  if (price.kind === null) return getListingPriceDisplay({price: price.legacy_text, priceAmount: price.legacy_amount});
  return {priceLabel: {free: "Tasuta", negotiable: "Kokkuleppel", unspecified: "Küsi hinda"}[price.kind], priceNote: null};
}
export function publicCard(item: SearchCardV2): ProductListingCard {
  return {id: item.id, title: item.title || "Pealkirjata kuulutus", description: item.description, ...priceReadDisplay(item.price),
    priceAmount: item.price.kind === "fixed" ? item.price.amount : item.price.kind === null ? item.price.legacy_amount : null,
    currency: item.price.currency, imageUrl: item.imageUrl, category: item.category, subcategory: item.subcategory,
    condition: item.condition, locationLabel: [...new Set([item.city, item.country].filter(Boolean))].join(" · ") || "Asukoht täpsustamata",
    distanceLabel: null, sellerName: item.sellerName || "Avaldaja", sellerAvatarUrl: item.sellerAvatarUrl,
    sellerSlug: item.sellerSlug, sellerType: item.sellerType, isHighlighted: false, href: `/v2/listing/${item.id}`};
}
export function publicDetail(item: PublicDetail): ProductListingDetail {
  return {...publicCard({id: item.content_id, title: item.title, description: item.description, price: item.price,
    category: item.category, subcategory: item.subcategory, detailCategory: item.detail_category, condition: item.condition,
    country: item.country, city: item.city, imageUrl: item.image_url, sellerName: item.seller_name, sellerSlug: item.seller_slug,
    sellerAvatarUrl: item.seller_avatar_url, sellerType: item.seller_type, createdAt: item.created_at}),
    rawPrice: item.price.kind === null ? item.price.legacy_text : null,
    userId: null, identityId: null, country: item.country, city: item.city, rawLocation: null,
    listingLat: null, listingLng: null, details: Object.fromEntries(item.details.map(f => [f.key, f.value])),
    images: item.images, createdAt: item.created_at, activeUntil: item.active_until, status: "active"};
}
