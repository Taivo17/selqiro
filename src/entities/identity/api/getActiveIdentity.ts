import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { IdentitySummary, IdentityType } from "../model/types";
import { getMyIdentities } from "./getMyIdentities";

type ProfileRow = {
  store_slug?: string | null;
  active_identity_id?: string | null;
  store_name?: string | null;
};

type ActiveIdentityProfileRpcRow = {
  id?: string | null;
  identity_id?: string | null;
  type?: string | null;
  identity_type?: string | null;
  display_name?: string | null;
  store_name?: string | null;
  avatar_url?: string | null;
  slug?: string | null;
  store_slug?: string | null;
};

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function normalizeIdentityType(value?: string | null): IdentityType {
  return value === "business" ? "business" : "private";
}

function mapActiveProfileToIdentity(
  row: ActiveIdentityProfileRpcRow | null,
  activeIdentityId?: string | null
): IdentitySummary | null {
  if (!row) {
    return null;
  }

  const displayName = row.display_name || row.store_name;

  if (!displayName) {
    return null;
  }

  return {
    id: activeIdentityId || row.identity_id || row.id || "fallback-private",
    type: normalizeIdentityType(row.type || row.identity_type),
    displayName,
    avatarUrl: row.avatar_url || null,
    slug: row.slug || row.store_slug || null,
  };
}

function fallbackIdentity(input: {
  profile: ProfileRow | null;
  userEmail?: string | null;
}): IdentitySummary {
  const { profile, userEmail } = input;

  return {
    id: "fallback-private",
    type: "private",
    displayName:
      profile?.store_name ||
      userEmail?.split("@")[0] ||
      "Kasutaja",
    avatarUrl: null,
    slug: profile?.store_slug || null,
  };
}

export async function getActiveIdentity(input: {
  userId: string | null;
  userEmail?: string | null;
}): Promise<IdentitySummary | null> {
  const { userId, userEmail } = input;

  if (!userId) {
    return null;
  }

  const { data: profileData, error: profileError } =
    await supabaseBrowserClient
      .from("profiles")
      .select("store_slug, active_identity_id, store_name")
      .eq("id", userId)
      .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message || "Failed to load profile");
  }

  const profile = (profileData || null) as ProfileRow | null;

  const { data: activeProfileRows, error: activeProfileError } =
    await supabaseBrowserClient.rpc("get_my_active_identity_profile");

  if (!activeProfileError) {
    const activeFromRpc = mapActiveProfileToIdentity(
      firstRow(activeProfileRows as ActiveIdentityProfileRpcRow | ActiveIdentityProfileRpcRow[] | null),
      profile?.active_identity_id
    );

    if (activeFromRpc) {
      return activeFromRpc;
    }
  } else {
    console.warn(
      "V2 active identity profile RPC failed:",
      activeProfileError.message
    );
  }

  try {
    const identities = await getMyIdentities();

    const resolvedIdentity =
      identities.find((identity) => identity.id === profile?.active_identity_id) ||
      identities[0] ||
      null;

    if (resolvedIdentity) {
      return resolvedIdentity;
    }
  } catch (error) {
    console.warn(
      "V2 getMyIdentities fallback failed:",
      error instanceof Error ? error.message : error
    );
  }

  return fallbackIdentity({ profile, userEmail });
}
