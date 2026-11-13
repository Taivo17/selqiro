import {supabaseBrowserClient as client} from "../../../shared/supabase/browserClient";
import {assertLegacyDiscoveryCurrent, readLegacyDiscovery, type LegacyDiscoveryReadContext} from "./legacyDiscoveryRead";
import {LEGACY_DISCOVERY_PAGE_SIZE, type LegacyCoordinates, type LegacyDiscoveryPage,
  type LegacyDiscoveryProfile, type LegacyListing, type LegacyMarketplaceMetadata} from "../model/legacyDiscoveryTypes";

async function profile(context: LegacyDiscoveryReadContext): Promise<LegacyDiscoveryProfile | null> {
  if (!context.actor) return null;
  const ownRows = await readLegacyDiscovery(client.from("profiles").select("id, language")
    .eq("id", context.actor.userId).limit(1), context);
  const own = (ownRows?.[0] ?? null) as LegacyDiscoveryProfile | null;
  let locations;
  try {locations = await readLegacyDiscovery(client.rpc("get_marketplace_identity_location"), context);}
  catch {assertLegacyDiscoveryCurrent(context);}
  const location = Array.isArray(locations) ? locations[0] : locations;
  return own ? {...own, home_country: location?.country ?? null, home_city: location?.city ?? null,
    home_lat: location?.lat ?? null, home_lng: location?.lng ?? null} : null;
}
async function geocode(country: string, city: string, context: LegacyDiscoveryReadContext): Promise<LegacyCoordinates | null> {
  if (!city.trim()) return null;
  assertLegacyDiscoveryCurrent(context);
  try {
    const response = await fetch("/api/location/geocode", {method: "POST", signal: context.signal,
      headers: {"Content-Type": "application/json"}, body: JSON.stringify({country, city: city.trim()})});
    const data = await response.json();
    assertLegacyDiscoveryCurrent(context);
    return response.ok && data.success && Number.isFinite(data.lat) && Number.isFinite(data.lng)
      ? {lat: data.lat, lng: data.lng} : null;
  } catch {
    assertLegacyDiscoveryCurrent(context);
    return null;
  }
}

/** Hidden providers and account blocks are excluded by the two server readers
 * before their offset/limit. Display filters remain in the legacy page. */
export async function loadLegacyMarketplacePage(context: LegacyDiscoveryReadContext,
  options: {nearOnly: boolean; searchNearCity: string}, offset: number, previous: LegacyMarketplaceMetadata | null,
): Promise<LegacyDiscoveryPage<LegacyListing, LegacyMarketplaceMetadata>> {
  const currentProfile = previous ? previous.profile : await profile(context);
  const searchNearCoords = previous ? previous.searchNearCoords : options.nearOnly
    ? await geocode(currentProfile?.home_country || "Estonia", options.searchNearCity, context) : null;
  const lat = options.nearOnly ? searchNearCoords?.lat ?? currentProfile?.home_lat : null;
  const lng = options.nearOnly ? searchNearCoords?.lng ?? currentProfile?.home_lng : null;
  const query = typeof lat === "number" && typeof lng === "number"
    ? client.rpc("get_marketplace_listings_nearby", {center_lat: lat, center_lng: lng,
        result_limit: LEGACY_DISCOVERY_PAGE_SIZE, result_offset: offset})
    : client.rpc("get_marketplace_listings", {result_limit: LEGACY_DISCOVERY_PAGE_SIZE, result_offset: offset});
  const rows = await readLegacyDiscovery(query, context);
  const items = ((rows || []) as Array<Omit<LegacyListing, "id"> & {listing_id: number}>).map(row => ({
    ...row, id: row.listing_id, distance_km: row.distance_km ?? null, listing_images: [], listing_translations: [],
  }));
  return {items, metadata: {profile: currentProfile, searchNearCoords},
    hasMore: items.length === LEGACY_DISCOVERY_PAGE_SIZE, nextOffset: offset + items.length};
}
