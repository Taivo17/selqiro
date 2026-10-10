export type ListingEditActor = Readonly<{ userId: string; identityId: string }>;
export type ListingEditKey = ListingEditActor & Readonly<{ listingId: string }>;
export type ListingRawBasics = Readonly<{ title: string | null; description: string | null; condition: string | null }>;
export type ListingEditPrice = Readonly<{ version: 1; revision: string }> & (
  | Readonly<{ kind: null; amount: null; currency: null; legacy_text: string | null }>
  | Readonly<{ kind: "fixed"; amount: string; currency: string; legacy_text: null }>
  | Readonly<{ kind: "free" | "negotiable" | "unspecified"; amount: null; currency: null; legacy_text: null }>
);
export type ListingEditSnapshot = Readonly<{
  schema_version: 1; content_type: "listing"; listing_id: string; identity_id: string;
  basics: ListingRawBasics; price: ListingEditPrice;
}>;
export type ListingEditProblem = "invalid" | "context" | "conflict" | "forbidden" | "unavailable" | "unknown";
const messages: Record<ListingEditProblem, string> = {
  invalid: "Kontrolli kuulutuse pealkirja, kirjeldust, seisukorda ja hinda.",
  context: "Konto või aktiivne identiteet muutus. Sisestust ei salvestatud selle kontrolli kaudu.",
  conflict: "Kuulutust on vahepeal muudetud. Sinu sisestus on alles; kontrolli salvestatud versiooni.",
  forbidden: "Selle kuulutuse muutmiseks puudub praegu õigus.",
  unavailable: "Uus hinnasalvestus pole praegu saadaval. Vana salvestusteed ei kasutata asendusena.",
  unknown: "Salvestuse tulemust ei saanud kinnitada. Sisestus on alles. Ära korda salvestamist; kontrolli salvestatud versiooni.",
};
export class ListingEditError extends Error {
  constructor(readonly code: ListingEditProblem, message = messages[code]) { super(message); this.name = "ListingEditError"; }
}
export function editEnsure(value: unknown): asserts value {
  if (!value) throw new ListingEditError("unknown", "Kuulutuse muutmise vastuse vorming ei sobi.");
}
export function editRecord(value: unknown, fields: readonly string[]): Record<string, unknown> {
  editEnsure(value !== null && typeof value === "object" && !Array.isArray(value));
  const row = value as Record<string, unknown>;
  editEnsure(Object.keys(row).length === fields.length && fields.every(k => Object.hasOwn(row, k)));
  return row;
}
export function wholeMatch(pattern: RegExp, value: string): boolean { return value.match(pattern)?.[0] === value; }
export function validEditUuid(value: unknown): value is string {
  return typeof value === "string" && wholeMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, value);
}
export function editRevision(value: unknown): string {
  editEnsure(typeof value === "string" && value.length <= 19 && wholeMatch(/(?:0|[1-9][0-9]*)/, value));
  editEnsure(BigInt(value) <= BigInt("9223372036854775807")); return value;
}
export function validateListingEditKey(key: ListingEditKey): void {
  if (!key || !validEditUuid(key.userId) || !validEditUuid(key.identityId) || typeof key.listingId !== "string"
    || key.listingId.length > 19 || !wholeMatch(/[1-9][0-9]*/, key.listingId)
    || BigInt(key.listingId) > BigInt("9223372036854775807")) throw new ListingEditError("invalid");
}
function rawText(value: unknown): string | null {
  editEnsure(value === null || (typeof value === "string" && value.length <= 65536));
  return value as string | null;
}
/** Stored price validation is deliberately independent of NEW-input currency eligibility. */
function parseEditPrice(value: unknown): ListingEditPrice {
  const r = editRecord(value, ["version", "kind", "amount", "currency", "revision", "legacy_text"]);
  editEnsure(r.version === 1); const revision = editRevision(r.revision);
  if (r.kind === null) {
    editEnsure(r.amount === null && r.currency === null);
    return Object.freeze({ version: 1, kind: null, amount: null, currency: null, legacy_text: rawText(r.legacy_text), revision });
  }
  editEnsure(r.legacy_text === null && BigInt(revision) > BigInt(0));
  if (r.kind === "fixed") {
    editEnsure(typeof r.amount === "string" && r.amount.length <= 22
      && wholeMatch(/(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{0,2}[1-9])?/, r.amount));
    editEnsure(typeof r.currency === "string" && wholeMatch(/[A-Z]{3}/, r.currency));
    return Object.freeze({ version: 1, kind: "fixed", amount: r.amount, currency: r.currency, legacy_text: null, revision });
  }
  editEnsure(r.kind === "free" || r.kind === "negotiable" || r.kind === "unspecified");
  editEnsure(r.amount === null && r.currency === null);
  return Object.freeze({ version: 1, kind: r.kind, amount: null, currency: null, legacy_text: null, revision });
}
export function parseListingEditSnapshot(value: unknown, key: ListingEditKey): ListingEditSnapshot {
  validateListingEditKey(key);
  const r = editRecord(value, ["schema_version", "content_type", "listing_id", "identity_id", "basics", "price"]);
  editEnsure(r.schema_version === 1 && r.content_type === "listing" && r.listing_id === key.listingId
    && r.identity_id === key.identityId);
  const b = editRecord(r.basics, ["title", "description", "condition"]);
  const basics = Object.freeze({ title: rawText(b.title), description: rawText(b.description), condition: rawText(b.condition) });
  return Object.freeze({ schema_version: 1, content_type: "listing", listing_id: key.listingId,
    identity_id: key.identityId, basics, price: parseEditPrice(r.price) });
}
export function parseListingEditRead(value: unknown, key: ListingEditKey): ListingEditSnapshot {
  const r = editRecord(value, ["schema_version", "actor_id", "snapshot"]);
  editEnsure(r.schema_version === 1 && r.actor_id === key.userId);
  return parseListingEditSnapshot(r.snapshot, key);
}
/** Only explicit server errors establish rejection. Unknown transport/protocol errors do not prove rollback. */
export function classifyListingEditError(error: unknown): ListingEditError {
  if (error instanceof ListingEditError) return error;
  if (error && typeof error === "object") {
    const r = error as Record<string, unknown>;
    if (r.code === "40001" && (r.message === "listing_basics_conflict" || r.message === "listing_price_conflict")) return new ListingEditError("conflict");
    if (r.code === "42501") return new ListingEditError("forbidden");
    if (r.code === "22023" || r.code === "22P05") return new ListingEditError("invalid");
    if (r.code === "PGRST202" || r.code === "42883") return new ListingEditError("unavailable");
  }
  return new ListingEditError("unknown");
}
