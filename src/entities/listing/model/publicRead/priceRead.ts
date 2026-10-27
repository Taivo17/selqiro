/** Closed-lab wire contract. Never parse a formatted label or coerce a number to text.
 * This validates shape; accepted currencies are enforced by the server registry.
 * Currency conversion and monetary display do not belong in this module. */
export type PriceRead =
  | { version: 1; kind: "fixed"; amount: string; currency: string; legacy_text: null; legacy_amount: null }
  | { version: 1; kind: "free" | "negotiable" | "unspecified"; amount: null; currency: null; legacy_text: null; legacy_amount: null }
  | { version: 1; kind: null; amount: null; currency: null; legacy_text: string | null; legacy_amount: string | null };

export function ensure(value: unknown): asserts value {
  if (!value) throw new Error("Hinna lugemise vastuse vorming ei sobi.");
}
export function record(value: unknown, names: readonly string[]): Record<string, unknown> {
  ensure(value !== null && typeof value === "object" && !Array.isArray(value));
  const row = value as Record<string, unknown>;
  ensure(Object.keys(row).length === names.length && names.every(k => Object.hasOwn(row, k)));
  return row;
}
export function text(value: unknown): string | null {
  ensure(value === null || typeof value === "string");
  return value as string | null;
}
export function unsignedBigint(value: unknown): string {
  ensure(typeof value === "string" && /^(0|[1-9][0-9]{0,18})$/.test(value));
  ensure(BigInt(value) <= BigInt("9223372036854775807"));
  return value;
}
export function listingId(value: unknown): string {
  ensure(typeof value === "string" && /^(0|[1-9][0-9]{0,18}|-[1-9][0-9]{0,18})$/.test(value));
  ensure(BigInt(value) >= BigInt("-9223372036854775808") && BigInt(value) <= BigInt("9223372036854775807"));
  return value;
}
export function parsePriceRead(value: unknown): PriceRead {
  const r = record(value, ["version", "kind", "amount", "currency", "legacy_text", "legacy_amount"]);
  ensure(r.version === 1);
  if (r.kind === null) {
    ensure(r.amount === null && r.currency === null);
    text(r.legacy_text);
    const a = text(r.legacy_amount);
    ensure(a === null || /^[0-9]+(?:\.[0-9]+)?$/.test(a));
  } else {
    ensure(r.legacy_text === null && r.legacy_amount === null);
    if (r.kind === "fixed") {
      ensure(typeof r.amount === "string" && /^(0|[1-9][0-9]{0,17})(?:\.[0-9]{0,2}[1-9])?$/.test(r.amount));
      ensure(typeof r.currency === "string" && /^[A-Z]{3}$/.test(r.currency));
    } else {
      ensure(r.kind === "free" || r.kind === "negotiable" || r.kind === "unspecified");
      ensure(r.amount === null && r.currency === null);
    }
  }
  return {version: 1, kind: r.kind, amount: r.amount, currency: r.currency,
    legacy_text: r.legacy_text, legacy_amount: r.legacy_amount} as PriceRead;
}
