import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { ListingRenewalError, type ListingActivityActor } from "../model/listingRenewal";

const uuid = (value: unknown): value is string => typeof value === "string"
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** One minimized context read per batch/action, never per displayed listing. Not authorization. */
export async function getListingActivityActor(): Promise<ListingActivityActor> {
  const { data, error } = await supabaseBrowserClient.auth.getUser();
  if (error || !uuid(data.user?.id)) throw new ListingRenewalError("forbidden");
  const { data: profile, error: profileError } = await supabaseBrowserClient.from("profiles")
    .select("active_identity_id").eq("id", data.user.id).maybeSingle();
  if (profileError || !uuid(profile?.active_identity_id)) throw new ListingRenewalError("forbidden");
  return { userId: data.user.id, identityId: profile.active_identity_id };
}
