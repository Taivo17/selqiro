import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { isHorseDraftUuid, type HorseDraftActor } from "../model/draftEdit";

/** UI context precheck only; the RPC still owns authorization. No fallback identity. */
export async function getHorseDraftActor(expectedUserId: string): Promise<HorseDraftActor> {
  const { data, error } = await supabaseBrowserClient.auth.getUser();
  if (error || data.user?.id !== expectedUserId || !isHorseDraftUuid(expectedUserId)) {
    throw new Error(marketplaceMessage("horse.sign_in_with_the_correct_account_to_save.c85172"));
  }
  const profile = await supabaseBrowserClient.from("profiles")
    .select("active_identity_id").eq("id", expectedUserId).maybeSingle();
  if (profile.error || !isHorseDraftUuid(profile.data?.active_identity_id)) {
    throw new Error(marketplaceMessage("horse.select_an_active_identity_you_can_access.944fd2"));
  }
  return { userId: expectedUserId, identityId: profile.data.active_identity_id };
}
