export type CountryCode =
  | "EE"
  | "FI"
  | "LV"
  | "LT"
  | "SE"
  | "DE"
  | "US"
  | "GB"
  | "FR"
  | "ES"
  | "IT"
  | "NL"
  | "NO"
  | "DK"
  | "PL"
  | "UA"
  | "BR"
  | "IN"
  | "JP"
  | "CN"
  | "AU"
  | "CA";

export type CountryOption = {
  code: CountryCode;
  name: string;
};

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "SE", name: "Sweden" },
  { code: "DE", name: "Germany" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "PL", name: "Poland" },
  { code: "UA", name: "Ukraine" },
  { code: "BR", name: "Brazil" },
  { code: "IN", name: "India" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
];

export function getCountryName(code: string) {
  return COUNTRY_OPTIONS.find((country) => country.code === code)?.name || code;
}
