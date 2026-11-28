import type { PublicProfile } from "../../../entities/profile/model/types";
import { parseCoarseProfileLocation, type CoarseProfileLocation } from "../../../entities/profile/model/publicProfileLocation";
import { locationText } from "../../../entities/location/model/location";

type MapProfile = Pick<PublicProfile, "identityType" | "locationVisibility" | "mapLocation" | "country" | "city">;

export function visibleProfileMapLocation(profile: MapProfile): CoarseProfileLocation | null {
  if (profile.locationVisibility !== "city"
    && !(profile.identityType === "business" && profile.locationVisibility === "exact")) return null;
  if (profile.identityType !== "private" && profile.identityType !== "business") return null;
  const location = parseCoarseProfileLocation(profile.mapLocation);
  return location && location.place_name === profile.city && location.country_name === profile.country ? location : null;
}

const MERCATOR_LIMIT = 85.05112878;
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const coordinate = (value: number) => String(Number(value.toFixed(6)));

/** Isolated renderer contract: only the approved coarse centre goes to OSM. */
export function publicProfileMapUrls(value: CoarseProfileLocation): Readonly<{embedUrl: string; mapUrl: string}> | null {
  const location = parseCoarseProfileLocation(value);
  if (!location) return null;
  const latitude = clamp(location.latitude, -MERCATOR_LIMIT, MERCATOR_LIMIT);
  const longitude = location.longitude;
  // At a fixed sidebar size, a regional view covers a wider area than a city.
  const zoom = location.precision === "region" ? 8 : 12;
  const x = (longitude + 180) / 360;
  const sin = Math.sin(latitude * Math.PI / 180);
  const y = (1 - Math.log((1 + sin) / (1 - sin)) / (2 * Math.PI)) / 2;
  const halfWidth = 320 / (2 * 256 * 2 ** zoom), halfHeight = 240 / (2 * 256 * 2 ** zoom);
  const latFromY = (fraction: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * fraction))) * 180 / Math.PI;
  const west = clamp((x - halfWidth) * 360 - 180, -180, 180);
  const east = clamp((x + halfWidth) * 360 - 180, -180, 180);
  const south = latFromY(clamp(y + halfHeight, 0, 1));
  const north = latFromY(clamp(y - halfHeight, 0, 1));
  const embed = new URL("https://www.openstreetmap.org/export/embed.html");
  embed.searchParams.set("bbox", [west, south, east, north].map(coordinate).join(","));
  embed.searchParams.set("layer", "mapnik");
  // No marker: the saved centre is not the person's home or business premises.
  return Object.freeze({embedUrl: embed.href,
    mapUrl: `https://www.openstreetmap.org/#map=${zoom}/${coordinate(latitude)}/${coordinate(longitude)}`});
}

/** An explicit user click opens the already-public business address in Google Maps. */
export function publicBusinessMapUrl(profile: Pick<PublicProfile, "identityType" | "locationVisibility" | "businessAddress" | "country" | "city">): string | null {
  if (profile.identityType !== "business" || profile.locationVisibility !== "exact"
    || !locationText(profile.businessAddress, 240) || !locationText(profile.country, 100)
    || !locationText(profile.city, 120)) return null;
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", [...new Set([profile.businessAddress, profile.city, profile.country])].join(", "));
  // Maps URLs have a documented maximum length, even for percent-encoded text.
  return url.href.length <= 2048 ? url.href : null;
}
