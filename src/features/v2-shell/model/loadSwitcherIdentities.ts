import { uiMessage } from "../../../../lib/i18n/interfaceMessage";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { getMyIdentities } from "../../../entities/identity/api/getMyIdentities";
import type { IdentitySummary } from "../../../entities/identity/model/types";

/** Match the stored active ID to accessible identities; never substitute the
 * first identity when the actual active identity could not be established. */
export async function loadSwitcherIdentities(userId: string) {
  const auth = await supabaseBrowserClient.auth.getUser();
  if (auth.error || auth.data.user?.id !== userId) throw new Error(uiMessage("the_signed_in_account_changed_check_your_account_again"));
  const [identities, profile] = await Promise.all([
    getMyIdentities(),
    supabaseBrowserClient.from("profiles").select("active_identity_id").eq("id", userId).maybeSingle(),
  ]);
  if (profile.error) throw new Error(uiMessage("could_not_verify_the_active_identity"));
  const unique = new Map<string, IdentitySummary>();
  for (const item of identities) {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(item.id))
      unique.set(item.id, { ...item, displayName: item.displayName.trim() });
  }
  return { identities: [...unique.values()], activeIdentity: unique.get(profile.data?.active_identity_id ?? "") ?? null };
}
