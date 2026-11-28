import { isLocationCountry } from "../../location/model/countries";
import { exactLocationKeys, locationText } from "../../location/model/location";
import { profileMediaUuid } from "./profileMedia";

/** A public locality/region centre. This is never a building or a user's GPS point. */
export type CoarseProfileLocation = Readonly<{
  country_code: string;
  country_name: string;
  place_name: string;
  region_name: string;
  latitude: number;
  longitude: number;
  precision: "locality" | "region";
}>;
export type PublicProfileLocation = Readonly<{
  identity_id: string;
  location: CoarseProfileLocation | null;
}>;

const PUBLIC_LOCATION_KEYS = ["country_code", "country_name", "place_name", "region_name",
  "latitude", "longitude", "precision"] as const;

export function parseCoarseProfileLocation(value: unknown): CoarseProfileLocation | null {
  if (!exactLocationKeys(value, PUBLIC_LOCATION_KEYS) || !isLocationCountry(value.country_code)
    || !locationText(value.country_name, 100) || !locationText(value.place_name, 120)
    || !locationText(value.region_name, 160, true)
    || (value.precision !== "locality" && value.precision !== "region")
    || typeof value.latitude !== "number" || !Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90
    || typeof value.longitude !== "number" || !Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180) return null;
  return Object.freeze({...value}) as CoarseProfileLocation;
}

export function parsePublicProfileLocation(value: unknown, expectedIdentityId: string): PublicProfileLocation | null {
  if (!profileMediaUuid(expectedIdentityId)) throw new Error("profile_location_identity_invalid");
  // A successful null response means the canonical profile is no longer readable.
  if (value === null) return null;
  if (!exactLocationKeys(value, ["identity_id", "location"]) || value.identity_id !== expectedIdentityId)
    throw new Error("public_profile_location_response_invalid");
  const location = value.location === null ? null : parseCoarseProfileLocation(value.location);
  if (value.location !== null && !location) throw new Error("public_profile_location_response_invalid");
  return Object.freeze({identity_id: expectedIdentityId, location});
}
