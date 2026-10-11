import { normalizeListingEditableBasics } from "../../../entities/listing/model/listingEditCommand";
import { normalizeListingPriceForm } from "../../../entities/listing/model/listingPriceInput";
import type { ListingCreationInput } from "../../../entities/listing/model/listingCreationInput";
import { ordinaryCategoryIsComplete, ordinaryDetailFields, type OrdinaryListingFieldState } from "./ordinaryListingFields";

export class OrdinaryListingInputError extends Error {
  constructor(message: string) { super(message); this.name = "OrdinaryListingInputError"; }
}
function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new OrdinaryListingInputError(message);
}
function text(value: unknown, limit: number): value is string {
  if (typeof value !== "string" || value.includes("\0")) return false;
  const points = Array.from(value);
  return points.length <= limit && points.every(ch => {
    const n = ch.codePointAt(0)!; return n < 0xd800 || n > 0xdfff;
  });
}
const ATTRIBUTES = ["manufacturer", "part_number", "oem_number", "vehicle_brand", "vehicle_model", "vehicle_year", "engine"] as const;
const ATTR_SET: ReadonlySet<string> = new Set(ATTRIBUTES);
export function ordinaryDetailMaxLength(key: string): number {
  return key === "vehicle_year" ? 20 : ATTR_SET.has(key) ? 160 : 1000;
}
/** PostgreSQL jsonb text includes spaces between object/array members and after colons.
 * Only this bounded strings/nulls/arrays/objects input is accepted; no Number(amount). */
function jsonbText(value: unknown): string {
  if (value === null || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(jsonbText).join(", ") + "]";
  ensure(value && typeof value === "object", "Kuulutuse andmete vorming ei sobi.");
  return "{" + Object.entries(value).map(([k, v]) => JSON.stringify(k) + ": " + jsonbText(v)).join(", ") + "}";
}

/** Pure future-row input preparation. No RPC, Storage, ID generation, AI or persistence.
 * Deliberately stricter UX than the closed lab: complete taxonomy and country/city required.
 * The unchanged lab input remains authoritative once separately integrated server-side. */
export function buildOrdinaryListingInput(
  state: OrdinaryListingFieldState, title: string, description: string,
): ListingCreationInput {
  ensure(state && ordinaryCategoryIsComplete(state.categoryPath), "Vali kategooria kuni viimase pakutava astmeni.");
  ensure(["new", "used", "damaged"].includes(state.condition), "Vali eseme seisukord.");
  let basics: ReturnType<typeof normalizeListingEditableBasics>;
  try { basics = normalizeListingEditableBasics({ title, description, condition: state.condition }); }
  catch { throw new OrdinaryListingInputError("Lisa 2–140 märgiga pealkiri ja kuni 5000 märgiga kirjeldus."); }
  ensure(basics.description.length > 0, "Kirjelda pakkumist oma sõnadega.");
  ensure(new TextEncoder().encode(jsonbText({ title, description, condition: state.condition })).length <= 24000,
    "Pealkirja ja kirjelduse kogumaht on liiga suur.");
  ensure(text(state.country, 120) && state.country.trim().length > 0, "Lisa riik (kuni 120 märki).");
  ensure(text(state.city, 160) && state.city.trim().length > 0, "Lisa linn või piirkond (kuni 160 märki).");
  const price = normalizeListingPriceForm(state.priceKind, state.amountInput, state.currencyInput);
  ensure(state.detailValues && typeof state.detailValues === "object" && !Array.isArray(state.detailValues),
    "Detailide vorming ei sobi.");
  const allowed = new Set(ordinaryDetailFields(state.categoryPath).map(field => field.key));
  const attributes: ListingCreationInput["attributes"] = {
    manufacturer: "", part_number: "", oem_number: "", vehicle_brand: "", vehicle_model: "", vehicle_year: "", engine: "",
  };
  const mutableAttributes = { ...attributes };
  const details: Record<string, string> = {};
  for (const [key, value] of Object.entries(state.detailValues)) {
    ensure(allowed.has(key), "Väljade hulgas on valitud kategooriale võõras detail. Vali kategooria uuesti.");
    ensure(text(value, ordinaryDetailMaxLength(key)), "Üks detail on liiga pikk või sisaldab sobimatuid märke.");
    if (ATTR_SET.has(key)) mutableAttributes[key as keyof typeof mutableAttributes] = value;
    else if (value !== "") details[key] = value; // original free text; never units/AI conversion
  }
  const result: ListingCreationInput = {
    basics: { ...basics, condition: state.condition as "new" | "used" | "damaged" },
    price, category_path: [...state.categoryPath],
    location: { country: state.country.trim(), city: state.city.trim(), latitude: null, longitude: null },
    attributes: mutableAttributes, details, language: "et",
  };
  ensure(Object.keys(details).length <= 64 && new TextEncoder().encode(jsonbText(result)).length <= 65536,
    "Kuulutuse detailide kogumaht on liiga suur.");
  return result;
}
