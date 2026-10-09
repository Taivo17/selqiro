import { getListingCurrency, type ListingCurrencyCode } from "../../../shared/currency/listingCurrencies.generated";

/** New ordinary-listing input, not a validator for old saved/historical prices. */
export type ListingPriceKind = "fixed" | "free" | "negotiable" | "unspecified";
export type ListingPriceInput =
  | Readonly<{ kind: "fixed"; amount: string; currency: ListingCurrencyCode }>
  | Readonly<{ kind: Exclude<ListingPriceKind, "fixed">; amount: null; currency: null }>;

export type ListingPriceErrorCode = "shape" | "kind" | "currency" | "amount" | "precision" | "nonfixed";
const messages: Record<ListingPriceErrorCode, string> = {
  shape: "Hinna andmed ei ole õiges vormingus.",
  kind: "Vali hinna liik.",
  currency: "Vali toetatud valuuta. Valuutat ei tuletata asukohast.",
  amount: "Sisesta summa numbritena. Ära kasuta tuhandete eraldajaid, valuutamärki ega eksponenti.",
  precision: "Summal on selle valuuta jaoks liiga palju komakohti. Paranda summat või valuutat; hinda ei ümardata.",
  nonfixed: "Tasuta, kokkuleppehinna ja lisamata hinna puhul jäta summa ning valuuta tühjaks.",
};
export class ListingPriceInputError extends Error {
  constructor(readonly code: ListingPriceErrorCode) {
    super(messages[code]);
    this.name = "ListingPriceInputError";
  }
}
const fail = (code: ListingPriceErrorCode): never => { throw new ListingPriceInputError(code); };

/** Unlike RegExp.test(...$), reject a trailing newline as well. */
function whole(pattern: RegExp, value: string): RegExpMatchArray | null {
  const matched = value.match(pattern);
  return matched?.[0] === value ? matched : null;
}

/** Strict network grammar. No coercion or silent excess-zero precision removal. */
export function normalizeListingPriceWire(value: unknown): ListingPriceInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("shape");
  const row = value as Record<string, unknown>;
  const keys = Object.keys(row).sort();
  if (keys.length !== 3 || keys.join(",") !== "amount,currency,kind") return fail("shape");
  const kind = row.kind;
  if (kind !== "fixed" && kind !== "free" && kind !== "negotiable" && kind !== "unspecified") return fail("kind");
  if (kind !== "fixed") {
    if (row.amount !== null || row.currency !== null) return fail("nonfixed");
    return { kind, amount: null, currency: null };
  }
  if (typeof row.amount !== "string" || typeof row.currency !== "string") return fail("shape");
  const currency = getListingCurrency(row.currency);
  if (!currency) return fail("currency");
  const amount = row.amount;
  if (amount.length > 22) return fail("amount");
  const matched = whole(/^(0|[1-9][0-9]{0,17})(?:\.([0-9]{1,3}))?$/, amount);
  if (!matched) return fail("amount");
  const fraction = matched[2] ?? "";
  if (fraction.length > currency.minorUnits) return fail("precision");
  const trimmedFraction = fraction.replace(/0+$/, "");
  return { kind, amount: matched[1] + (trimmedFraction ? "." + trimmedFraction : ""), currency: currency.code };
}

export const LISTING_PRICE_INPUT_HELP =
  "Koma või punkt tähistab kümnendkohta. Ära kasuta tuhandete eraldajaid. Valuuta vahetamine summat ei teisenda.";

/** This is a field grammar, not a locale/number guesser. Original form text is not mutated.
 * Both single separators explicitly mean DECIMAL; '1,234' KWD means 1.234 KWD,
 * never 1234. Mixed/multiple separators are rejected. The UI must show the help
 * and normalized amount+currency before confirmation when this is connected. */
export function normalizeListingPriceForm(
  kind: ListingPriceKind, amountInput: string, currencyInput: string,
): ListingPriceInput {
  if (typeof amountInput !== "string" || typeof currencyInput !== "string") return fail("shape");
  if (amountInput.length > 64 || currencyInput.length > 3) return fail("amount");
  const amount = amountInput.replace(/^[ \t\r\n\f\v]+|[ \t\r\n\f\v]+$/g, "");
  if (kind !== "fixed") {
    if (amount !== "" || currencyInput !== "") return fail("nonfixed");
    return normalizeListingPriceWire({ kind, amount: null, currency: null });
  }
  if (!whole(/(?:0|[1-9][0-9]{0,17})(?:[.,][0-9]{1,3})?/, amount)) return fail("amount");
  return normalizeListingPriceWire({ kind, amount: amount.replace(",", "."), currency: currencyInput });
}
