import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { EditableListingResult } from "../model/editableTypes";
import { mapListingDetailRow, type MarketplaceListingRow } from "./mappers";

type EditableListingRow = MarketplaceListingRow & {
  [key: string]: unknown;
};

export async function getEditableListingById(input: {
  listingId: string;
  userId: string | null;
  activeIdentityId: string | null;
}): Promise<EditableListingResult> {
  const { listingId, userId, activeIdentityId } = input;

  if (!userId) {
    return {
      status: "not_authenticated",
      listing: null,
    };
  }

  if (!listingId) {
    return {
      status: "not_found",
      listing: null,
    };
  }

  const { data, error } = await supabaseBrowserClient
    .from("listings")
    .select(
      "*, listing_images(id, thumb_url, medium_url, original_url, is_primary, sort_order)"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load editable listing");
  }

  if (!data) {
    return {
      status: "not_found",
      listing: null,
    };
  }

  const row = data as EditableListingRow;

  const identityOwnsListing =
    Boolean(activeIdentityId) &&
    Boolean(row.identity_id) &&
    row.identity_id === activeIdentityId;

  /*
   * user_id is only a fallback for genuine legacy
   * listings that do not yet have identity ownership.
   *
   * Once identity_id exists, the active identity must
   * match it even when both identities belong to the
   * same authenticated account.
   */
  const legacyUserOwnsListing =
    !row.identity_id &&
    Boolean(userId) &&
    Boolean(row.user_id) &&
    row.user_id === userId;

  if (!identityOwnsListing && !legacyUserOwnsListing) {
    return {
      status: "forbidden",
      listing: null,
    };
  }

  return {
    status: "ok",
    listing: mapListingDetailRow(row),
  };
}
