import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { ProductListingDetail } from "../model/types";
import { mapListingDetailRow, type MarketplaceListingRow } from "./mappers";

type MutableListingRow = MarketplaceListingRow & {
  [key: string]: unknown;
};

type IdentityProfileRow = {
  display_name?: string | null;
  slug?: string | null;
  avatar_url?: string | null;
};

type LegacyProfileRow = {
  store_name?: string | null;
  store_slug?: string | null;
};

type PublicStoreProfileRow = {
  identity_id?: string | null;
  identity_type?: string | null;
  legacy_user_id?: string | null;
  display_name?: string | null;
  slug?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
};

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function sameListingId(row: MarketplaceListingRow, id: string): boolean {
  return String(row.listing_id || row.id || "") === String(id);
}

async function getMarketplaceListingSnapshot(
  id: string
): Promise<MarketplaceListingRow | null> {
  const { data, error } = await supabaseBrowserClient.rpc(
    "get_marketplace_listings",
    {
      result_limit: 200,
      result_offset: 0,
    }
  );

  if (error) {
    console.warn("Marketplace listing snapshot lookup failed:", error.message);
    return null;
  }

  return ((data || []) as MarketplaceListingRow[]).find((row) =>
    sameListingId(row, id)
  ) || null;
}

function applyMarketplaceSnapshot(
  row: MutableListingRow,
  snapshot: MarketplaceListingRow | null
): void {
  if (!snapshot) return;

  /**
   * Product Discovery uses marketplace RPC seller fields.
   * Listing Detail should prefer the same seller snapshot so card and detail match.
   */
  row.identity_id = snapshot.identity_id || row.identity_id || null;
  row.user_id = snapshot.user_id || row.user_id || null;

  row.seller_name = snapshot.seller_name || row.seller_name || null;
  row.seller_slug = snapshot.seller_slug || row.seller_slug || null;
  row.seller_type = snapshot.seller_type || row.seller_type || null;
  row.seller_avatar_url =
    snapshot.seller_avatar_url || snapshot.avatar_url || row.seller_avatar_url || null;

  row.distance_km = snapshot.distance_km ?? row.distance_km ?? null;
  row.price_amount = snapshot.price_amount ?? row.price_amount ?? null;
  row.currency = snapshot.currency || row.currency || "€";
  row.image = snapshot.image || row.image || null;

  row.category = snapshot.category || row.category || null;
  row.subcategory = snapshot.subcategory || row.subcategory || null;
  row.condition = snapshot.condition || row.condition || null;
  row.country = snapshot.country || row.country || null;
  row.city = snapshot.city || row.city || null;
  row.location = snapshot.location || row.location || null;
}

async function enrichSellerFromStoreSlugRpc(
  row: MutableListingRow
): Promise<void> {
  if (!row.seller_slug) return;
  if (row.seller_avatar_url && row.seller_name) return;

  const { data, error } = await supabaseBrowserClient
    .rpc("get_store_by_slug", {
      store_slug_input: row.seller_slug,
    });

  if (error || !data) {
    return;
  }

  const profile = firstRow(
    data as PublicStoreProfileRow | PublicStoreProfileRow[] | null
  );

  if (!profile) {
    return;
  }

  row.identity_id = row.identity_id || profile.identity_id || null;
  row.user_id = row.user_id || profile.legacy_user_id || null;
  row.seller_name = row.seller_name || profile.display_name || null;
  row.seller_slug = row.seller_slug || profile.slug || null;
  row.seller_avatar_url = row.seller_avatar_url || profile.avatar_url || null;
  row.seller_type = row.seller_type || profile.identity_type || null;
}

async function enrichSellerFromSlug(row: MutableListingRow): Promise<void> {
  if (!row.seller_slug) return;
  if (row.seller_avatar_url && row.seller_name) return;

  const { data, error } = await supabaseBrowserClient
    .from("identity_profiles")
    .select("display_name, slug, avatar_url")
    .eq("slug", row.seller_slug)
    .maybeSingle();

  if (error || !data) return;

  const profile = data as IdentityProfileRow;

  row.seller_name = row.seller_name || profile.display_name || null;
  row.seller_avatar_url = row.seller_avatar_url || profile.avatar_url || null;
}

async function enrichSellerFromIdentityProfile(
  row: MutableListingRow
): Promise<void> {
  if (!row.identity_id) return;
  if (row.seller_name && row.seller_slug && row.seller_avatar_url) return;

  const { data, error } = await supabaseBrowserClient
    .from("identity_profiles")
    .select("display_name, slug, avatar_url")
    .eq("identity_id", row.identity_id)
    .maybeSingle();

  if (error || !data) return;

  const profile = data as IdentityProfileRow;

  row.seller_name = row.seller_name || profile.display_name || null;
  row.seller_slug = row.seller_slug || profile.slug || null;
  row.seller_avatar_url = row.seller_avatar_url || profile.avatar_url || null;
  row.seller_type = row.seller_type || "Profiil";
}

async function enrichSellerFromLegacyProfile(
  row: MutableListingRow
): Promise<void> {
  if (!row.user_id) return;
  if (row.seller_name && row.seller_slug) return;

  const { data, error } = await supabaseBrowserClient
    .from("profiles")
    .select("store_name, store_slug")
    .eq("id", row.user_id)
    .maybeSingle();

  if (error || !data) return;

  const profile = data as LegacyProfileRow;

  row.seller_name = row.seller_name || profile.store_name || null;
  row.seller_slug = row.seller_slug || profile.store_slug || null;
}

export async function getListingById(
  id: string
): Promise<ProductListingDetail | null> {
  if (!id) {
    return null;
  }

  const { data, error } = await supabaseBrowserClient
    .from("listings")
    .select(
      "*, listing_images(id, thumb_url, medium_url, original_url, is_primary, sort_order)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load listing");
  }

  if (!data) {
    return null;
  }

  const row = data as MutableListingRow;
  const marketplaceSnapshot = await getMarketplaceListingSnapshot(id);

  applyMarketplaceSnapshot(row, marketplaceSnapshot);

  await enrichSellerFromStoreSlugRpc(row);
  await enrichSellerFromSlug(row);
  await enrichSellerFromIdentityProfile(row);
  await enrichSellerFromLegacyProfile(row);

  return mapListingDetailRow(row);
}
