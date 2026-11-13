import {supabaseBrowserClient as client} from "../../../shared/supabase/browserClient";
import {assertLegacyDiscoveryCurrent, readLegacyDiscovery, type LegacyDiscoveryReadContext} from "./legacyDiscoveryRead";
import {LEGACY_DISCOVERY_PAGE_SIZE, type LegacyDiscoveryPage, type LegacyDiscoveryProfile,
  type LegacyFeedMetadata, type LegacyListing} from "../model/legacyDiscoveryTypes";

async function feedMetadata(context: LegacyDiscoveryReadContext): Promise<LegacyFeedMetadata> {
  if (!context.actor) return {profile: null, followedIds: []};
  const profileRows = await readLegacyDiscovery(client.from("profiles").select("id, language, active_identity_id")
    .eq("id", context.actor.userId).limit(1), context);
  const profile = (profileRows?.[0] ?? null) as LegacyDiscoveryProfile | null;
  if (!profile?.active_identity_id) return {profile, followedIds: []};
  const follows = await readLegacyDiscovery(client.from("store_follows").select("store_identity_id")
    .eq("follower_identity_id", profile.active_identity_id), context);
  const followedIds = Array.from(new Set((follows || []).map(row => row.store_identity_id).filter(Boolean))) as string[];
  return {profile, followedIds};
}
/** Follows still belong to the active identity. Discovery visibility belongs
 * to the viewer account and is enforced in the view before pagination. */
export async function loadLegacyFeedPage(context: LegacyDiscoveryReadContext, offset: number,
  previous: LegacyFeedMetadata | null,
): Promise<LegacyDiscoveryPage<LegacyListing, LegacyFeedMetadata>> {
  const metadata = previous ?? await feedMetadata(context);
  if (!metadata.followedIds.length) return {items: [], metadata, hasMore: false, nextOffset: offset};
  const rows = await readLegacyDiscovery(client.from("discovery_listings_v1").select(
    "id, user_id, identity_id, created_at, title, description, price, category, condition, country, city, image, listing_images(thumb_url, medium_url, original_url, is_primary, sort_order), listing_translations(language, title, description, ai_summary, status)"
  ).in("identity_id", metadata.followedIds).eq("status", "active").gt("active_until", new Date().toISOString())
    .order("created_at", {ascending: false}).range(offset, offset + LEGACY_DISCOVERY_PAGE_SIZE - 1), context);
  const listings = (rows || []) as LegacyListing[];
  const ids = Array.from(new Set(listings.map(item => item.identity_id).filter(Boolean))) as string[];
  type Identity = {identity_id: string; display_name: string | null; slug: string | null; avatar_url: string | null};
  let identities: Identity[] = [];
  if (ids.length) {
    try {identities = (await readLegacyDiscovery(client.rpc("get_feed_identity_profiles", {p_identity_ids: ids}), context) || []) as Identity[];}
    catch {assertLegacyDiscoveryCurrent(context); /* Preserve listings when optional seller enrichment fails. */}
  }
  const identityMap = new Map(identities.map(identity => [identity.identity_id, {
    store_name: identity.display_name, store_slug: identity.slug, avatar_url: identity.avatar_url,
  }]));
  const items = listings.map(item => ({...item, seller_profile: item.identity_id ? identityMap.get(item.identity_id) ?? null : null}));
  return {items, metadata, hasMore: listings.length === LEGACY_DISCOVERY_PAGE_SIZE, nextOffset: offset + listings.length};
}
