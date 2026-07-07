import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { ProductListingDetail } from "../model/types";
import { mapListingDetailRow } from "./mappers";

type MutableListingRow = Record<string, unknown> & {
  id?: string | number | null;
  user_id?: string | null;
  identity_id?: string | null;
  seller_name?: string | null;
  seller_slug?: string | null;
  seller_type?: string | null;
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

async function enrichSellerFromIdentityProfile(
  row: MutableListingRow
): Promise<void> {
  if (!row.identity_id) return;
  if (row.seller_name && row.seller_slug) return;

  const { data, error } = await supabaseBrowserClient
    .from("identity_profiles")
    .select("display_name, slug, avatar_url")
    .eq("identity_id", row.identity_id)
    .maybeSingle();

  if (error || !data) {
    return;
  }

  const profile = data as IdentityProfileRow;

  row.seller_name = row.seller_name || profile.display_name || null;
  row.seller_slug = row.seller_slug || profile.slug || null;
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

  if (error || !data) {
    return;
  }

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

  await enrichSellerFromIdentityProfile(row);
  await enrichSellerFromLegacyProfile(row);

  return mapListingDetailRow(row as Parameters<typeof mapListingDetailRow>[0]);
}
