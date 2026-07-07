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

  const row = data as any;

  if (row.identity_id) {
    const { data: profileData, error: profileError } =
      await supabaseBrowserClient
        .from("identity_profiles")
        .select("display_name, slug")
        .eq("identity_id", row.identity_id)
        .maybeSingle();

    if (!profileError && profileData) {
      row.seller_name = row.seller_name || (profileData as any).display_name;
      row.seller_slug = row.seller_slug || (profileData as any).slug;
    }
  }

  return mapListingDetailRow(row as Parameters<typeof mapListingDetailRow>[0]);
}
