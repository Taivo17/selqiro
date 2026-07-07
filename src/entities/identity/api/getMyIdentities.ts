import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { IdentitySummary, IdentityType } from "../model/types";

type IdentityRpcRow = {
  id?: string | null;
  type?: string | null;
  identity_type?: string | null;
  display_name?: string | null;
  store_name?: string | null;
  avatar_url?: string | null;
  slug?: string | null;
};

type IdentityProfileSlugRow = {
  identity_id: string;
  slug?: string | null;
};

function normalizeIdentityType(value?: string | null): IdentityType {
  return value === "business" ? "business" : "private";
}

export async function getMyIdentities(): Promise<IdentitySummary[]> {
  const { data: identityRows, error: identitiesError } =
    await supabaseBrowserClient.rpc("get_my_identities");

  if (identitiesError) {
    throw new Error(identitiesError.message || "Failed to load identities");
  }

  const identities = ((identityRows || []) as IdentityRpcRow[])
    .filter((item) => item.id)
    .map((item) => ({
      id: item.id as string,
      type: normalizeIdentityType(item.type || item.identity_type),
      displayName: item.display_name || item.store_name || "Identiteet",
      avatarUrl: item.avatar_url || null,
      slug: item.slug || null,
    }));

  const identityIds = identities.map((item) => item.id);

  if (identityIds.length === 0) {
    return identities;
  }

  const { data: profileRows, error: profileError } =
    await supabaseBrowserClient
      .from("identity_profiles")
      .select("identity_id, slug")
      .in("identity_id", identityIds);

  if (profileError) {
    console.warn("V2 identity slug lookup failed:", profileError.message);
    return identities;
  }

  const slugByIdentityId = Object.fromEntries(
    ((profileRows || []) as IdentityProfileSlugRow[]).map((row) => [
      row.identity_id,
      row.slug || null,
    ])
  );

  return identities.map((identity) => ({
    ...identity,
    slug: identity.slug || slugByIdentityId[identity.id] || null,
  }));
}
