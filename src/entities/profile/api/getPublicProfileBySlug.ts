import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { PublicProfile } from "../model/types";

type PublicProfileRpcRow = {
  identity_id?: string | null;
  identity_type?: string | null;
  legacy_user_id?: string | null;
  display_name?: string | null;
  store_name?: string | null;
  slug?: string | null;
  store_slug?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  banner_dominant_color?: string | null;
  country?: string | null;
  city?: string | null;
  location?: string | null;
};

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function formatLocationLabel(input: {
  city?: string | null;
  country?: string | null;
  location?: string | null;
}): string {
  return input.city || input.location || input.country || "Asukoht puudub";
}

function mapPublicProfile(row: PublicProfileRpcRow, fallbackSlug: string): PublicProfile {
  const displayName = row.display_name || row.store_name || "Profiil";
  const slug = row.slug || row.store_slug || fallbackSlug;

  return {
    identityId: row.identity_id || null,
    identityType: row.identity_type || null,
    legacyUserId: row.legacy_user_id || null,
    displayName,
    slug,
    bio: row.bio || null,
    avatarUrl: row.avatar_url || null,
    bannerUrl: row.banner_url || null,
    bannerDominantColor: row.banner_dominant_color || null,
    country: row.country || null,
    city: row.city || null,
    locationLabel: formatLocationLabel({
      city: row.city,
      country: row.country,
      location: row.location,
    }),
  };
}

export async function getPublicProfileBySlug(
  slug: string
): Promise<PublicProfile | null> {
  if (!slug) {
    return null;
  }

  const { data, error } = await supabaseBrowserClient.rpc("get_store_by_slug", {
    store_slug_input: slug,
  });

  if (error) {
    throw new Error(error.message || "Failed to load public profile");
  }

  const row = firstRow(data as PublicProfileRpcRow | PublicProfileRpcRow[] | null);

  if (!row) {
    return null;
  }

  return mapPublicProfile(row, slug);
}
