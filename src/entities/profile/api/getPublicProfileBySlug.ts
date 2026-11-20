import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import type { PublicProfile } from "../model/types";
import { publicBusinessAddress, publicProfileWebsite } from "../model/publicProfileFields";
import { getPublicProfileMedia } from "./getPublicProfileMedia";
import { DEFAULT_COVER_FIT } from "../../../shared/profile-media/coverFit";

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
  website_url?: string | null;
  address_text?: string | null;
  location_visibility?: string | null;
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
  return [...new Set([input.city || input.location, input.country].filter(Boolean))].join(", ");
}

export function mapPublicProfile(row: PublicProfileRpcRow, fallbackSlug: string): PublicProfile {
  const displayName = row.display_name || row.store_name || "";
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
    bannerFit: DEFAULT_COVER_FIT,
    bannerWidth: null,
    bannerHeight: null,
    country: row.country || null,
    city: row.city || null,
    locationLabel: formatLocationLabel({
      city: row.city,
      country: row.country,
      location: row.location,
    }),
    websiteUrl: publicProfileWebsite(row.website_url),
    businessAddress: publicBusinessAddress(row),
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

  const profile = mapPublicProfile(row, slug);
  if (!profile.identityId) return profile;
  try {
    const media = await getPublicProfileMedia(profile.identityId);
    if (!media) return null;
    return {...profile, avatarUrl: media.avatar_url, bannerUrl: media.banner_url,
      bannerFit: {focus_x: media.focus_x, focus_y: media.focus_y, zoom: media.zoom},
      bannerWidth: media.banner_width, bannerHeight: media.banner_height};
  } catch {
    // A failed decorative read must not hide a readable profile. Do not invent
    // a centered crop for a managed cover whose saved position is unavailable.
    return {...profile, bannerUrl: profile.bannerUrl?.includes("/managed-profile-v1/") ? null : profile.bannerUrl};
  }
}
