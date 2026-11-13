export type LegacyListingImage = {
  id?: string; thumb_url?: string | null; medium_url?: string | null;
  original_url?: string | null; is_primary?: boolean | null; sort_order?: number | null;
};
export type LegacyListingTranslation = {
  language: string; title: string; description?: string | null;
  ai_summary?: string | null; status?: string | null;
};
export type LegacyListing = {
  id: number; user_id?: string | null; identity_id?: string | null;
  seller_name?: string | null; seller_slug?: string | null; seller_type?: string | null;
  is_premium?: boolean | null; distance_km?: number | null; created_at?: string | null;
  title: string; description: string; price: string; price_amount?: number | null;
  image?: string | null; status?: "active" | "paused" | "sold"; active_until?: string | null;
  category?: string | null; condition?: string | null; location?: string | null;
  country?: string | null; city?: string | null; listing_lat?: number | null; listing_lng?: number | null;
  subcategory?: string | null; search_text?: string | null; details?: Record<string, unknown> | null;
  listing_images?: LegacyListingImage[]; listing_translations?: LegacyListingTranslation[];
  seller_profile?: {store_name?: string | null; store_slug?: string | null; avatar_url?: string | null} | null;
};
export type LegacyDiscoveryProfile = {
  id: string; language?: string | null; active_identity_id?: string | null;
  home_country?: string | null; home_city?: string | null; home_lat?: number | null; home_lng?: number | null;
};
export type LegacyCoordinates = {lat: number; lng: number};
export type LegacyMarketplaceMetadata = {
  profile: LegacyDiscoveryProfile | null; searchNearCoords: LegacyCoordinates | null;
};
export type LegacyFeedMetadata = {profile: LegacyDiscoveryProfile | null; followedIds: string[]};
export const LEGACY_DISCOVERY_PAGE_SIZE = 30;
export type LegacyDiscoveryPage<T, M> = {items: T[]; metadata: M; hasMore: boolean; nextOffset: number};
