import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import {v2IntegrationEnabled} from "../../../shared/config/v2Integration";
import {publicationJourneyRequest} from "./publicationJourneyClient";
import { listingRenewalError, parseListingRenewalResult, validateListingRenewalInput,
  type RenewListingActivityInput, type RenewListingActivityResult } from "../model/listingRenewal";

export async function renewMyListingActivity(input: RenewListingActivityInput): Promise<RenewListingActivityResult> {
  validateListingRenewalInput(input);
  const integrated = v2IntegrationEnabled();
  if (integrated && !input.expectedActor) throw listingRenewalError({code: "42501", message: "listing_activity_identity_required"});
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const args = {
      p_listing_id: input.listingId,
      // Original server string: no Date round-trip, precision loss, new deadline or identity input.
      p_expected_active_until: input.expectedActiveUntil,
      ...(integrated ? {p_expected_user_id: input.expectedActor!.userId, p_expected_identity_id: input.expectedActor!.identityId} : {}),
    };
    if (integrated) return parseListingRenewalResult(await publicationJourneyRequest(input.expectedActor!, "owner-renew", args, controller.signal), input);
    const { data, error } = await supabaseBrowserClient.rpc("renew_my_listing_activity_v1", args).abortSignal(controller.signal);
    if (error) throw listingRenewalError(error);
    return parseListingRenewalResult(data, input);
  } catch (error) {
    // Abort/network/unknown response is NOT proof of rollback. No automatic write retry.
    throw listingRenewalError(error);
  } finally { clearTimeout(timer); }
}
