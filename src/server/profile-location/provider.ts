import "server-only";
import { getLocationCountryName, isLocationCountry } from "../../entities/location/model/countries";
import { locationText, parseSelectedLocation, type SelectedLocation } from "../../entities/location/model/location";
import { boundedMediaFetch, type MessageMediaFetch } from "../messaging-media/transport";
import { locationFail } from "./errors";

const ENDPOINT = "https://api.geoapify.com/v1/geocode/autocomplete";
const text = (value: unknown, maximum: number, empty = false): string | null => {
  if (typeof value !== "string") return null;
  const result = value.normalize("NFC").trim();
  return locationText(result, maximum, empty) ? result : null;
};
/** Only city/county/state results may become public representative points.
 * Provider street/building/postcode fields and raw payloads are never persisted. */
export function normalizeLocationSuggestions(value: unknown, country: string, language: "en" | "et"): SelectedLocation[] {
  if (!isLocationCountry(country) || !value || typeof value !== "object" || Array.isArray(value)) return locationFail("unavailable");
  const rows = (value as {results?: unknown}).results;
  if (!Array.isArray(rows) || rows.length > 8) return locationFail("unavailable");
  const result: SelectedLocation[] = [], seen = new Set<string>();
  for (const raw of rows) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>, kind = row.result_type;
    if (typeof row.country_code !== "string" || row.country_code.toUpperCase() !== country
      || !["city", "county", "state"].includes(String(kind))
      || [row.street, row.housenumber, row.building].some(field => field !== undefined && field !== null && field !== "")) continue;
    const placeName = kind === "city" ? text(row.city, 120) ?? text(row.name, 120)
      : kind === "county" ? text(row.county, 120) ?? text(row.name, 120) : text(row.state, 120) ?? text(row.name, 120);
    const regionParts = [text(row.county, 160), text(row.state, 160)].filter((part): part is string => !!part && part !== placeName);
    const regionName = [...new Set(regionParts)].join(", ");
    const location = parseSelectedLocation({country_code: country, country_name: getLocationCountryName(country, language),
      place_name: placeName, region_name: regionName, latitude: row.lat, longitude: row.lon,
      precision: kind === "city" ? "locality" : "region", source: "geoapify", source_id: text(row.place_id, 2048), source_kind: kind});
    if (!location || seen.has(location.source_id)) continue;
    seen.add(location.source_id); result.push(location);
  }
  return result;
}
export function createLocationProvider(apiKey: string | null, fetcher: MessageMediaFetch = fetch) {
  const configured = typeof apiKey === "string" && /^[A-Za-z0-9_-]{16,256}$/.test(apiKey);
  return Object.freeze({configured,
    async suggest(country: string, query: string, language: "en" | "et", signal: AbortSignal): Promise<SelectedLocation[]> {
      if (!configured || !isLocationCountry(country)) return locationFail("unavailable");
      const url = new URL(ENDPOINT);
      url.searchParams.set("text", query); url.searchParams.set("type", "locality");
      url.searchParams.set("filter", "countrycode:" + country.toLowerCase());
      url.searchParams.set("lang", language); url.searchParams.set("limit", "8");
      url.searchParams.set("format", "json"); url.searchParams.set("apiKey", apiKey!);
      try {
        const response = await boundedMediaFetch(fetcher, url.toString(), {method: "GET", headers: {accept: "application/json"}}, 262144, signal, 8000);
        if (response.status !== 200 || signal.aborted) return locationFail("unavailable");
        return normalizeLocationSuggestions(JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(response.bytes)), country, language);
      } catch { return locationFail("unavailable"); }
    },
  });
}
