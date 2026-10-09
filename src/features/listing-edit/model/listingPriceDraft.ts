import { normalizeListingPriceForm, type ListingPriceInput, type ListingPriceKind } from "../../../entities/listing/model/listingPriceInput";

/** Seed only from the authoritative owner-detail snapshot, never a list excerpt.
 * This seed is already parsed by the reader. Input-currency eligibility must not
 * invalidate an unchanged historical price or an unrelated title edit. */
export type ListingPriceSeed =
  | { kind: null; legacy_text: string | null }
  | { kind: "fixed"; amount: string; currency: string }
  | { kind: "free" | "negotiable" | "unspecified"; amount: null; currency: null };
export type ListingPriceDraft = Readonly<{
  kind: ListingPriceKind | null;
  amountInput: string;
  currencyInput: string;
  legacyText: string | null;
}>;
export type ListingPriceDraftChange =
  | { changed: false }
  | { changed: true; price: ListingPriceInput };

export function buildListingPriceDraft(seed: ListingPriceSeed): ListingPriceDraft {
  if (seed.kind === null) return { kind: null, amountInput: "", currencyInput: "", legacyText: seed.legacy_text };
  return {
    kind: seed.kind,
    amountInput: seed.kind === "fixed" ? seed.amount : "",
    currencyInput: seed.kind === "fixed" ? seed.currency : "",
    legacyText: null,
  };
}

/** A deliberate kind choice clears irrelevant field inputs, not any saved data. */
export function selectListingPriceKind(draft: ListingPriceDraft, kind: ListingPriceKind): ListingPriceDraft {
  return { ...draft, kind,
    amountInput: kind === "fixed" ? draft.amountInput : "",
    currencyInput: kind === "fixed" ? draft.currencyInput : "" };
}

/** Only a value result: does not fetch, save, supply a revision or retry a conflict. */
export function getListingPriceDraftChange(
  current: ListingPriceDraft, initial: ListingPriceDraft,
): ListingPriceDraftChange {
  if (current.legacyText !== initial.legacyText) {
    throw new Error("Algset hinnateksti ei muudeta automaatselt. Vali uus hinnaliik.");
  }
  if (current.kind === initial.kind && current.amountInput === initial.amountInput &&
      current.currencyInput === initial.currencyInput) return { changed: false };
  if (current.kind === null) throw new Error("Hinna muutmiseks vali hinnaliik; vana tekst ei ole uus struktureeritud hind.");
  return { changed: true, price: normalizeListingPriceForm(current.kind, current.amountInput, current.currencyInput) };
}
