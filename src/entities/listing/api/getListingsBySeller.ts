import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { ProductListingCard } from "../model/types";
import { mapMarketplaceListingRow, type MarketplaceListingRow } from "./mappers";

export type GetListingsBySellerInput = {
  identityId?: string | null;
  legacyUserId?: string | null;
  sellerName: string;
  sellerSlug: string | null;
  sellerAvatarUrl: string | null;
  sellerType: string | null;
  limit?: number;
};

export async function getListingsBySeller(
  input: GetListingsBySellerInput
): Promise<ProductListingCard[]> {
  const limit = input.limit ?? 12;

  if (!input.identityId && !input.legacyUserId) {
    return [];
  }

  let query = supabaseBrowserClient
    .from("listings")
    .select(
      "*, listing_images(id, thumb_url, medium_url, original_url, is_primary, sort_order)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (input.identityId) {
    query = query.eq("identity_id", input.identityId);
  } else if (input.legacyUserId) {
    query = query.eq("user_id", input.legacyUserId);
  }

  query = query
    .eq("status", "active")
    .gt("active_until", new Date().toISOString());

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "Failed to load seller listings");
  }

  return ((data || []) as MarketplaceListingRow[]).map((row) =>
    mapMarketplaceListingRow({
      ...row,
      seller_name: row.seller_name || input.sellerName,
      seller_slug: row.seller_slug || input.sellerSlug,
      seller_avatar_url: row.seller_avatar_url || input.sellerAvatarUrl,
      seller_type: row.seller_type || input.sellerType,
    })
  );
}
