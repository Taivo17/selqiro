import { isLocationCountry } from "./countries";

export type SelectedLocation = Readonly<{
  country_code: string; country_name: string; place_name: string; region_name: string;
  latitude: number; longitude: number; precision: "locality" | "region";
  source: "geoapify"; source_id: string; source_kind: "city" | "county" | "state";
}>;
export type LocationSuggestion = Readonly<{location: SelectedLocation; proof: string; expires_at: number}>;
export type LocationCommand = Readonly<{action: "keep"}> | Readonly<{action: "clear"}>
  | Readonly<{action: "select"; proof: string}>;
export const LOCATION_KEYS = ["country_code", "country_name", "place_name", "region_name", "latitude", "longitude",
  "precision", "source", "source_id", "source_kind"] as const;
export function exactLocationKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
}
export function locationText(value: unknown, maximum: number, empty = false): value is string {
  return typeof value === "string" && value === value.trim() && (empty || value.length > 0)
    && Array.from(value).length <= maximum && !/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value);
}
export function parseSelectedLocation(value: unknown): SelectedLocation | null {
  if (!exactLocationKeys(value, LOCATION_KEYS) || !isLocationCountry(value.country_code)
    || !locationText(value.country_name, 100) || !locationText(value.place_name, 120)
    || !locationText(value.region_name, 160, true) || !locationText(value.source_id, 2048)
    || value.source !== "geoapify" || !["city", "county", "state"].includes(String(value.source_kind))
    || value.precision !== (value.source_kind === "city" ? "locality" : "region")
    || typeof value.latitude !== "number" || !Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90
    || typeof value.longitude !== "number" || !Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180) return null;
  return Object.freeze({...value}) as SelectedLocation;
}
export function sameSelectedLocation(a: SelectedLocation | null, b: SelectedLocation | null): boolean {
  return a === b || (!!a && !!b && LOCATION_KEYS.every(key => a[key] === b[key]));
}
export function locationLabel(location: SelectedLocation): string {
  return [location.place_name, ...(location.region_name && location.region_name !== location.place_name ? [location.region_name] : []),
    location.country_name].join(", ");
}
