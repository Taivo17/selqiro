import { safeUiError, uiMessage } from "../../../../lib/i18n/interfaceMessage";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { IdentitySummary } from "../model/types";
import { getMyIdentities } from "./getMyIdentities";

const uuid = (value: unknown): value is string => typeof value === "string"
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
  && value !== "00000000-0000-0000-0000-000000000000";
const unavailable = () => new Error(uiMessage("could_not_verify_the_active_identity"));
const changed = () => new Error(uiMessage("the_active_account_or_identity_changed"));

async function requireAccount(userId: string): Promise<void> {
  const {data,error} = await supabaseBrowserClient.auth.getUser();
  if (error || data.user?.id !== userId) {
    throw new Error(uiMessage("the_signed_in_account_changed_check_your_account_again"));
  }
}

async function readActiveId(userId: string): Promise<string | null> {
  const {data,error} = await supabaseBrowserClient.from("profiles")
    .select("active_identity_id").eq("id",userId).maybeSingle();
  if (error) throw unavailable();
  if (data === null || data.active_identity_id === null) return null;
  if (!uuid(data.active_identity_id)) throw unavailable();
  return data.active_identity_id;
}

/** This RPC supplies public profile fields, not an identity type or identity row ID. */
function publicProfile(value: unknown,expectedId: string): Record<string,unknown> | null {
  const rows = Array.isArray(value) ? value : value === null ? [] : [value];
  if (rows.length > 1) throw unavailable();
  const row = rows[0];
  if (row === undefined) return null;
  if (!row || typeof row !== "object" || Array.isArray(row)) throw unavailable();
  const result = row as Record<string,unknown>;
  // row.id is identity_profiles.id and must never become identity.id.
  if (result.identity_id !== expectedId) throw changed();
  return result;
}

function profileText(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw unavailable();
  return value;
}

/** A presentation read. Mutations retain their existing server-side authority checks. */
export async function getActiveIdentity(input: {
  userId: string | null;
  userEmail?: string | null;
}): Promise<IdentitySummary | null> {
  const {userId} = input;
  if (!userId) return null;
  try {
    if (!uuid(userId)) throw unavailable();
    await requireAccount(userId);
    const before = await readActiveId(userId);
    let identities: IdentitySummary[] = [], profile: {data: unknown;error: unknown} | null = null;
    if (before) [identities,profile] = await Promise.all([
      getMyIdentities(),supabaseBrowserClient.rpc("get_my_active_identity_profile"),
    ]);
    const after = await readActiveId(userId);
    await requireAccount(userId);
    if (before !== after) throw changed();
    if (!before) return null;
    const identity = identities.find(item => item.id === before);
    if (!identity) throw unavailable();
    // A profile RPC failure may omit decoration, never the verified identity kind.
    if (!profile || profile.error) return identity;
    const row = publicProfile(profile.data,before);
    if (!row) return identity;
    const name = profileText(row.display_name) || profileText(row.store_name);
    if (!name) return identity;
    return {...identity,displayName: name,avatarUrl: profileText(row.avatar_url),
      slug: profileText(row.slug) || profileText(row.store_slug)};
  } catch (error) {throw new Error(safeUiError(error,"could_not_verify_the_active_identity"));}
}
