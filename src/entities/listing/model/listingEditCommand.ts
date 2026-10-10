import { normalizeListingPriceWire, type ListingPriceInput } from "./listingPriceInput";
import { editEnsure, editRecord, ListingEditError, parseListingEditSnapshot, validateListingEditKey,
  type ListingEditKey, type ListingEditSnapshot, type ListingRawBasics } from "./listingEditSnapshot";

export type ListingEditableBasics = Readonly<{ title: string; description: string; condition: string | null }>;
export type ListingEditCommand = Readonly<{
  key: ListingEditKey; baseline: ListingEditSnapshot; basics: ListingEditableBasics; priceChange?: ListingPriceInput;
}>;
export type ListingEditSaved = Readonly<{ snapshot: ListingEditSnapshot; basicsChanged: boolean; priceChanged: boolean }>;
const equalBasics = (a: ListingRawBasics, b: ListingRawBasics) => a.title === b.title && a.description === b.description && a.condition === b.condition;
/** Reject NUL/unpaired surrogates before PostgreSQL jsonb decoding; count code points, not UTF-16 units. */
function validText(text: unknown): text is string {
  if (typeof text !== "string" || text.includes("\0")) return false;
  for (const ch of text) { const n = ch.codePointAt(0)!; if (n >= 0xd800 && n <= 0xdfff) return false; }
  return true;
}
export function normalizeListingEditableBasics(value: ListingEditableBasics): ListingEditableBasics {
  if (!value || !validText(value.title) || !validText(value.description)
    || Array.from(value.title).length > 1024 || Array.from(value.description).length > 5000
    || (value.condition !== null && !["new", "used", "damaged"].includes(value.condition))) throw new ListingEditError("invalid");
  const title = value.title.replace(/[ \t\r\n\f\v]+/g, " ").replace(/^ +| +$/g, "");
  const description = value.description.replace(/^[ \t\r\n\f\v]+|[ \t\r\n\f\v]+$/g, "");
  if (Array.from(title).length < 2 || Array.from(title).length > 140) throw new ListingEditError("invalid");
  return Object.freeze({ title, description, condition: value.condition });
}
/** Names and omission semantics match the closed SQL actor-bound adapter exactly. */
export function listingEditRpcArguments(command: ListingEditCommand): Record<string, unknown> {
  validateListingEditKey(command.key);
  const baseline = parseListingEditSnapshot(command.baseline, command.key);
  const basics = normalizeListingEditableBasics(command.basics);
  // PostgreSQL jsonb adds spaces after three colons and two commas. No baseline trimming.
  if (new TextEncoder().encode(JSON.stringify(baseline.basics)).length + 5 > 65536) throw new ListingEditError("invalid");
  const args: Record<string, unknown> = {
    p_listing_id: command.key.listingId, p_expected_identity_id: command.key.identityId,
    p_expected_actor_id: command.key.userId, p_expected_basics: { ...baseline.basics }, p_basics: { ...basics },
  };
  if (command.priceChange !== undefined) {
    args.p_price_change = normalizeListingPriceWire(command.priceChange);
    args.p_expected_price_revision = baseline.price.revision;
  }
  return args;
}
export function parseListingEditSaved(value: unknown, command: ListingEditCommand): ListingEditSaved {
  const r = editRecord(value, ["schema_version", "actor_id", "snapshot", "basics_changed", "price_changed"]);
  editEnsure(r.schema_version === 1 && r.actor_id === command.key.userId
    && typeof r.basics_changed === "boolean" && typeof r.price_changed === "boolean");
  const snapshot = parseListingEditSnapshot(r.snapshot, command.key);
  const normalized = normalizeListingEditableBasics(command.basics);
  editEnsure(equalBasics(snapshot.basics, normalized));
  editEnsure(r.basics_changed === !equalBasics(command.baseline.basics, normalized));
  const before = command.baseline.price;
  editEnsure(BigInt(snapshot.price.revision) >= BigInt(before.revision));
  if (command.priceChange === undefined) {
    // A different session may have changed the price; accept the authoritative result,
    // but do not pretend this request changed or CAS-checked the omitted price.
    editEnsure(r.price_changed === false);
  } else {
    const expected = normalizeListingPriceWire(command.priceChange), actual = snapshot.price;
    editEnsure(actual.kind === expected.kind && actual.kind !== null);
    if (expected.kind === "fixed") editEnsure(actual.kind === "fixed" && actual.amount === expected.amount && actual.currency === expected.currency);
    const changed = before.kind !== expected.kind || (expected.kind === "fixed"
      && (before.kind !== "fixed" || before.amount !== expected.amount || before.currency !== expected.currency));
    editEnsure(r.price_changed === changed);
    editEnsure(BigInt(actual.revision) === BigInt(before.revision) + (changed ? BigInt(1) : BigInt(0)));
  }
  return Object.freeze({ snapshot, basicsChanged: r.basics_changed, priceChanged: r.price_changed });
}
