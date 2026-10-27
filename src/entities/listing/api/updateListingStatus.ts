import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import {v2IntegrationEnabled} from "../../../shared/config/v2Integration";
import type {ListingActivityActor} from "../model/listingRenewal";
import {publicationJourneyRequest} from "./publicationJourneyClient";
import {uploadRecord} from "../model/privatePublicationUpload";

export type ListingStatus = "active" | "paused" | "sold";

type ListingOwnerRow = {
  id: string | number;
  identity_id?: string | null;
  user_id?: string | null;
};

export type UpdateListingStatusInput = {
  listingId: string;
  status: ListingStatus;
  expectedActor?: ListingActivityActor;
  expectedStatus?: string;
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
  if (v2IntegrationEnabled()) {
    if (!input.expectedActor || !input.expectedStatus) throw new Error("Kontrolli aktiivset identiteeti ja kuulutuse seisu uuesti.");
    const data = uploadRecord(await publicationJourneyRequest(input.expectedActor, "owner-set-status", {
      p_expected_user_id: input.expectedActor.userId, p_expected_identity_id: input.expectedActor.identityId,
      p_listing_id: input.listingId, p_expected_status: input.expectedStatus, p_status: input.status}, new AbortController().signal));
    if (data.listing_id !== input.listingId || data.status !== input.status)
      throw new Error("Staatuse muutmist ei saanud kinnitada. Laadi kuulutuse seis uuesti.");
    return;
  }
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
