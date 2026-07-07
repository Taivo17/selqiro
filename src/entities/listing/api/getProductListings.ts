import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { ProductListingCard } from "../model/types";
import { mapMarketplaceListingRow } from "./mappers";

export type GetProductListingsInput = {
  limit?: number;
  offset?: number;
  centerLat?: number | null;
  centerLng?: number | null;
};

export async function getProductListings(
  input: GetProductListingsInput = {}
): Promise<ProductListingCard[]> {
  const limit = input.limit ?? 30;
  const offset = input.offset ?? 0;

  const hasNearbyCenter =
    typeof input.centerLat === "number" &&
    Number.isFinite(input.centerLat) &&
    typeof input.centerLng === "number" &&
    Number.isFinite(input.centerLng);

  const { data, error } = hasNearbyCenter
    ? await supabaseBrowserClient.rpc("get_marketplace_listings_nearby", {
        center_lat: input.centerLat,
        center_lng: input.centerLng,
        result_limit: limit,
        result_offset: offset,
      })
    : await supabaseBrowserClient.rpc("get_marketplace_listings", {
        result_limit: limit,
        result_offset: offset,
      });

  if (error) {
    throw new Error(error.message || "Failed to load product listings");
  }

  return ((data || []) as unknown[]).map((row) =>
    mapMarketplaceListingRow(row as Parameters<typeof mapMarketplaceListingRow>[0])
  );
}
