import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";

export type ListingStatus = "active" | "paused" | "sold";

type ListingOwnerRow = {
  id: string | number;
  identity_id?: string | null;
  user_id?: string | null;
};

export type UpdateListingStatusInput = {
  listingId: string;
  status: ListingStatus;
};

function canEditListing(input: {
  row: ListingOwnerRow;
  userId: string;
  activeIdentityId: string | null;
}): boolean {
  const rowIdentityId = input.row.identity_id || null;
  const rowUserId = input.row.user_id || null;

  if (rowIdentityId) {
    return Boolean(input.activeIdentityId && rowIdentityId === input.activeIdentityId);
  }

  return Boolean(rowUserId && rowUserId === input.userId);
}

export async function updateListingStatus(
  input: UpdateListingStatusInput
): Promise<void> {
  if (!["active", "paused", "sold"].includes(input.status)) {
    throw new Error("Vigane staatus.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseBrowserClient.auth.getUser();

  if (userError || !user?.id) {
    throw new Error("Sisselogimine puudub.");
  }

  const { data: profileRow } = await supabaseBrowserClient
    .from("profiles")
    .select("active_identity_id")
    .eq("id", user.id)
    .maybeSingle();

  const activeIdentityId = (profileRow as any)?.active_identity_id || null;

  const { data: ownerRow, error: ownerError } = await supabaseBrowserClient
    .from("listings")
    .select("id, identity_id, user_id")
    .eq("id", input.listingId)
    .maybeSingle();

  if (ownerError) {
    throw new Error(ownerError.message || "Kuulutuse kontroll ebaõnnestus.");
  }

  if (!ownerRow) {
    throw new Error("Kuulutust ei leitud.");
  }

  if (
    !canEditListing({
      row: ownerRow as ListingOwnerRow,
      userId: user.id,
      activeIdentityId,
    })
  ) {
    throw new Error("Sul ei ole õigust seda kuulutust muuta.");
  }

  const { error: updateError } = await supabaseBrowserClient
    .from("listings")
    .update({ status: input.status })
    .eq("id", input.listingId);

  if (updateError) {
    throw new Error(updateError.message || "Staatuse muutmine ebaõnnestus.");
  }
}
