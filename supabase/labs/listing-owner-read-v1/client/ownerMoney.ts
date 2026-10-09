/** Closed owner-list wire types. No currency inference, display formatting or writes. */
import { ensure, record, text, parsePriceRead, type PriceRead } from "./priceRead";
export type HorsePrice = {
  version: 1; kind: "fixed" | "from" | "contact" | "free";
  amount: string | null; currency: "EUR";
};
export type WantedSummary = {
  version: 2;
  budget: { mode: "maximum"; amount: string; currency: "EUR" }
    | { mode: "contact"; amount: null; currency: "EUR" } | null;
  search_area: { country_code: "EE"; city_or_municipality: string | null; region: string | null } | null;
};
export type OwnerMoney =
  | { role: "listing_price"; value: PriceRead }
  | { role: "horse_offer_price"; value: HorsePrice }
  | { role: "wanted_budget"; value: WantedSummary };
export function uuid(value: unknown): string {
  ensure(typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value));
  return value;
}
export function exactHorseAmount(value: unknown): string {
  ensure(typeof value === "string" && /^(0|[1-9][0-9]{0,9})(?:\.[0-9]?[1-9])?$/.test(value));
  return value;
}
function areaLabel(value: unknown): string | null {
  const s = text(value);
  ensure(s === null || (s === s.trim() && s.length > 0 && Array.from(s).length <= 160));
  return s;
}
export function parseWantedSummary(value: unknown): WantedSummary {
  const r = record(value, ["version", "budget", "search_area"]);
  ensure(r.version === 2);
  let budget: WantedSummary["budget"] = null;
  let area: WantedSummary["search_area"] = null;
  if (r.budget !== null) {
    const b = record(r.budget, ["mode", "amount", "currency"]);
    ensure(b.currency === "EUR");
    if (b.mode === "maximum") budget = { mode: "maximum", amount: exactHorseAmount(b.amount), currency: "EUR" };
    else {
      ensure(b.mode === "contact" && b.amount === null);
      budget = { mode: "contact", amount: null, currency: "EUR" };
    }
  }
  if (r.search_area !== null) {
    const a = record(r.search_area, ["country_code", "city_or_municipality", "region"]);
    ensure(a.country_code === "EE");
    area = { country_code: "EE", city_or_municipality: areaLabel(a.city_or_municipality), region: areaLabel(a.region) };
  }
  return { version: 2, budget, search_area: area };
}
export function parseOwnerMoney(value: unknown, type: "listing" | "horse_offer", variant: string | null): OwnerMoney {
  const r = record(value, ["role", "value"]);
  if (type === "listing") {
    ensure(variant === null && r.role === "listing_price");
    return { role: "listing_price", value: parsePriceRead(r.value) };
  }
  if (variant === "wanted") {
    ensure(r.role === "wanted_budget");
    return { role: "wanted_budget", value: parseWantedSummary(r.value) };
  }
  ensure(r.role === "horse_offer_price");
  const p = record(r.value, ["version", "kind", "amount", "currency"]);
  ensure(p.version === 1 && p.currency === "EUR");
  if (variant === "free_transfer") ensure(p.kind === "free" && p.amount === null);
  else {
    ensure(variant === "sale" || variant === "lease" || variant === "co_rider");
    if (p.kind === "fixed" || p.kind === "from") exactHorseAmount(p.amount);
    else ensure(p.kind === "contact" && p.amount === null);
  }
  return { role: "horse_offer_price", value: { version: 1, kind: p.kind as HorsePrice["kind"], amount: p.amount as string | null, currency: "EUR" } };
}
