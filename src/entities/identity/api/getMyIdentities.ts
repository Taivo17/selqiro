import { uiMessage } from "../../../../lib/i18n/interfaceMessage";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { IdentitySummary, IdentityType } from "../model/types";

const unavailable = () => new Error(uiMessage("could_not_verify_the_identity_try_again"));
const uuid = (value: unknown): value is string => typeof value === "string"
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
  && value !== "00000000-0000-0000-0000-000000000000";
function identityType(value: unknown): IdentityType {
  if (value !== "private" && value !== "business") throw unavailable();
  return value;
}
function optionalText(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw unavailable();
  return value;
}

/** get_my_identities returns the actual identities.type and public slug together.
 * Do not query identity_profiles separately: that browser query may recurse through membership RLS. */
export async function getMyIdentities(): Promise<IdentitySummary[]> {
  try {
    const {data,error} = await supabaseBrowserClient.rpc("get_my_identities");
    if (error) throw unavailable();
    const rows: unknown = data ?? [];
    if (!Array.isArray(rows)) throw unavailable();
    const seen = new Set<string>();
    return rows.map(value => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw unavailable();
      const row = value as Record<string,unknown>;
      if (!uuid(row.id) || seen.has(row.id)) throw unavailable();
      seen.add(row.id);
      return {id: row.id,type: identityType(row.type),
        displayName: (optionalText(row.display_name) || optionalText(row.store_name) || "").trim(),
        avatarUrl: optionalText(row.avatar_url),slug: optionalText(row.slug)};
    });
  } catch {throw unavailable();}
}
