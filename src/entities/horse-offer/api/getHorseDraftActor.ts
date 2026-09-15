import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { isHorseDraftUuid, type HorseDraftActor } from "../model/draftEdit";

/** UI context precheck only; the RPC still owns authorization. No fallback identity. */
export async function getHorseDraftActor(expectedUserId: string): Promise<HorseDraftActor> {
  const { data, error } = await supabaseBrowserClient.auth.getUser();
  if (error || data.user?.id !== expectedUserId || !isHorseDraftUuid(expectedUserId)) {
    throw new Error("Mustandi salvestamiseks logi õige kontoga sisse.");
  }
  const profile = await supabaseBrowserClient.from("profiles")
    .select("active_identity_id").eq("id", expectedUserId).maybeSingle();
  if (profile.error || !isHorseDraftUuid(profile.data?.active_identity_id)) {
    throw new Error("Vali ligipääsetav aktiivne identiteet.");
  }
  return { userId: expectedUserId, identityId: profile.data.active_identity_id };
}
