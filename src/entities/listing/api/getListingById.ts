import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { ProductListingDetail } from "../model/types";
import { mapListingDetailRow } from "./mappers";

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

  return mapListingDetailRow(data as Parameters<typeof mapListingDetailRow>[0]);
}
