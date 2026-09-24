/** Minimized owner-list contract, NOT the full horse details/edit snapshot. */
export type OwnerWantedBudget =
  | { mode: "maximum"; amount: number; currency: "EUR" }
  | { mode: "contact"; amount: null; currency: "EUR" };

export type OwnerWantedSearchArea = {
  countryCode: "EE";
  cityOrMunicipality: string | null;
  region: string | null;
};

export type OwnerWantedSummary = {
  version: 1;
  budget: OwnerWantedBudget | null;
  searchArea: OwnerWantedSearchArea | null;
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function parseBudget(value: unknown): OwnerWantedBudget | null {
  const budget = record(value);
  if (!budget || budget.currency !== "EUR") return null;

  // SQL always emits an explicit null for contact. Absence is not a promise.
  if (budget.mode === "contact" && budget.amount === null) {
    return { mode: "contact", amount: null, currency: "EUR" };
  }

  const amount = budget.amount;
  if (budget.mode !== "maximum" || typeof amount !== "number"
    || !Number.isFinite(amount) || amount < 0 || amount > 9999999999.99
    || !/^\d+(?:\.\d{1,2})?$/.test(String(amount))) return null;

  // No string-to-number coercion, arithmetic or silent rounding of invalid input.
  return { mode: "maximum", amount, currency: "EUR" };
}

function areaText(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  // Match the SQL character limit without counting UTF-16 surrogate pairs twice.
  if (Array.from(text).length > 160) return undefined;
  return text || null;
}

function parseSearchArea(value: unknown): OwnerWantedSearchArea | null {
  const area = record(value);
  if (!area || area.country_code !== "EE") return null;
  const cityOrMunicipality = areaText(area.city_or_municipality);
  const region = areaText(area.region);
  if (cityOrMunicipality === undefined || region === undefined) return null;
  return { countryCode: "EE", cityOrMunicipality, region };
}

export function parseOwnerWantedSummary(value: unknown): OwnerWantedSummary | null {
  const summary = record(value);
  if (!summary || summary.version !== 1) return null;
  // Parse sections independently. One unsupported section must not hide a valid
  // other section or abort the list. Only known fields enter the UI model.
  return {
    version: 1,
    budget: parseBudget(summary.budget),
    searchArea: parseSearchArea(summary.search_area),
  };
}
