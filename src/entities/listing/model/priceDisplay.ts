/** Display only: original text wins. No locale/identity/country or exchange-rate inference. */
export type ListingPriceDisplay = {
  priceLabel: string;
  priceNote: string | null;
};

export type ListingPriceDisplayInput = {
  price?: string | null;
  priceAmount?: string | number | null;
  currency?: string | null;
};

// Only classify plain numeric notation for a missing-currency note. Never parse an amount
// out of prose, ranges, unit prices or currency-bearing text; preserve those verbatim.
function isBareNumber(text: string): boolean {
  return /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+|\d{1,3}(?:[ \u00a0\u202f'’]\d{3})+(?:[.,]\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{1,3}(?:\.\d{3})+(?:,\d+)?)$/.test(text);
}

/** Preserve an RPC decimal string before any legacy Number conversion. No new write contract. */
export function listingPriceAmountText(value: unknown): string | null {
  if (typeof value === "string") {
    const text = value.trim();
    return /^[+-]?\d+(?:\.\d+)?$/.test(text) ? text : null;
  }
  // A transport Number has already passed through IEEE-754; lost digits cannot be recovered.
  return typeof value === "number" && Number.isFinite(value) ? String(value) : null;
}

export function getListingPriceDisplay(input: ListingPriceDisplayInput): ListingPriceDisplay {
  const text = typeof input.price === "string" ? input.price.trim() : "";
  const amount = text ? null : listingPriceAmountText(input.priceAmount);
  const label = text || amount;
  if (label === null || label === "") return { priceLabel: "Küsi hinda", priceNote: null };
  const numeric = text ? isBareNumber(text) : true;
  if (!numeric) return { priceLabel: label, priceNote: null };

  // This is only a supplied label, NOT proof of an ISO currency or permission to do FX.
  const currency = typeof input.currency === "string" ? input.currency.trim() : "";
  const suffix = currency.toUpperCase() === "EUR" ? "€" : currency;
  return suffix
    ? { priceLabel: `${label} ${suffix}`, priceNote: null }
    : { priceLabel: label, priceNote: "Valuuta täpsustamata" };
}
