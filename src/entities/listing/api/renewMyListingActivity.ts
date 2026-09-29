import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { listingRenewalError, parseListingRenewalResult, validateListingRenewalInput,
  type RenewListingActivityInput, type RenewListingActivityResult } from "../model/listingRenewal";

export async function renewMyListingActivity(input: RenewListingActivityInput): Promise<RenewListingActivityResult> {
  validateListingRenewalInput(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const { data, error } = await supabaseBrowserClient.rpc("renew_my_listing_activity_v1", {
      p_listing_id: input.listingId,
      // Original server string: no Date round-trip, precision loss, new deadline or identity input.
      p_expected_active_until: input.expectedActiveUntil,
    }).abortSignal(controller.signal);
    if (error) throw listingRenewalError(error);
    return parseListingRenewalResult(data, input);
  } catch (error) {
    // Abort/network/unknown response is NOT proof of rollback. No automatic write retry.
    throw listingRenewalError(error);
  } finally { clearTimeout(timer); }
}
