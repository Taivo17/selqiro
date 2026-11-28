import { LOCATION_COUNTRY_DATA } from "./countries.generated";

/** ISO territory codes are location boundaries, not permission to publish in a market. */
export const COUNTRY_CODES: readonly string[] = Object.freeze(LOCATION_COUNTRY_DATA.map(row => row.code));
const codes = new Set(COUNTRY_CODES);
export type CountryChoice = Readonly<{code: string; name: string}>;
export function isLocationCountry(value: unknown): value is string {
  return typeof value === "string" && codes.has(value);
}
export function getLocationCountryName(code: string, language: "en" | "et" = "en"): string {
  const row = LOCATION_COUNTRY_DATA.find(item => item.code === code);
  return row ? row[language] : code;
}
// Alternate spellings help typing; they never change the selected ISO identity.
const extra: Readonly<Record<string, readonly string[]>> = {
  GB: ["UK", "United Kingdom", "Suurbritannia"], US: ["USA", "United States of America"],
  AE: ["UAE"], CZ: ["Czech Republic"], TR: ["Turkey", "Türkiye"],
};
function folded(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/gu, " ").trim();
}
export function searchLocationCountries(query: string, language: "en" | "et", limit = 12): CountryChoice[] {
  const needle = folded(query);
  if (Array.from(needle).length > 100 || !Number.isInteger(limit) || limit < 1 || limit > 249) return [];
  return LOCATION_COUNTRY_DATA.map(row => {
    const terms = [...row.aliases, ...(extra[row.code] ?? [])].map(folded);
    const score = !needle ? 2 : terms.some(term => term === needle) ? 0
      : terms.some(term => term.startsWith(needle)) ? 1 : terms.some(term => term.includes(needle)) ? 2 : 3;
    return {code: row.code, name: row[language], score};
  }).filter(row => row.score < 3).sort((a, b) => a.score - b.score
    || a.name.localeCompare(b.name, language) || a.code.localeCompare(b.code))
    .slice(0, limit).map(({code, name}) => Object.freeze({code, name}));
}
