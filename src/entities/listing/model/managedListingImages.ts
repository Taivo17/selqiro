export type ManagedListingImagesKey = Readonly<{
  userId: string; identityId: string; listingId: string; attemptId: string;
}>;
export type ManagedListingImage = Readonly<{ ordinal: number; url: string; isPrimary: boolean }>;
export type ManagedListingImagesSnapshot = Readonly<{
  key: ManagedListingImagesKey; revision: string; images: readonly ManagedListingImage[];
}>;
export type ManagedListingPrimaryCommand = Readonly<{
  key: ManagedListingImagesKey; baseline: ManagedListingImagesSnapshot; ordinal: number;
}>;
export type ManagedListingImagesSaved = Readonly<{ snapshot: ManagedListingImagesSnapshot; changed: boolean }>;
export type ManagedListingImagesProblem = "invalid" | "context" | "conflict" | "unavailable" | "unknown";

const messages: Record<ManagedListingImagesProblem, string> = {
  invalid: "Vali selle kuulutuse olemasolev foto ja kontrolli piltide seisu.",
  context: "Konto, aktiivne identiteet või kuulutuse haldusõigus muutus. Laadi kuulutuse seis uuesti.",
  conflict: "Kuulutuse põhipilti on vahepeal muudetud. Kontrolli salvestatud seisu enne uut valikut.",
  unavailable: "Kuulutuse põhipildi muutmine pole praegu saadaval.",
  unknown: "Põhipildi muutmise tulemust ei saanud kinnitada. Kontrolli salvestatud seisu enne uut valikut.",
};
export class ManagedListingImagesError extends Error {
  constructor(readonly code: ManagedListingImagesProblem) {
    super(messages[code]); this.name = "ManagedListingImagesError";
  }
}

const MAX_BIGINT = BigInt("9223372036854775807");
const KEY_FIELDS = ["userId", "identityId", "listingId", "attemptId"] as const;
const READ_FIELDS = ["schema_version", "actor_user_id", "identity_id", "listing_id", "attempt_id", "revision", "images"] as const;
const whole = (pattern: RegExp, value: string) => value.match(pattern)?.[0] === value;
function uuid(value: unknown): value is string {
  return typeof value === "string" && whole(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, value)
    && value !== "00000000-0000-0000-0000-000000000000";
}
function unsigned(value: unknown, positive = false): value is string {
  return typeof value === "string" && value.length <= 19
    && whole(positive ? /[1-9][0-9]*/ : /(?:0|[1-9][0-9]*)/, value)
    && BigInt(value) <= MAX_BIGINT;
}
function ensure(value: unknown, problem: ManagedListingImagesProblem = "unknown"): asserts value {
  if (!value) throw new ManagedListingImagesError(problem);
}
function record(value: unknown, fields: readonly string[], problem: ManagedListingImagesProblem = "unknown"): Record<string, unknown> {
  ensure(value !== null && typeof value === "object" && !Array.isArray(value), problem);
  const row = value as Record<string, unknown>;
  ensure(Object.keys(row).length === fields.length && fields.every(field => Object.hasOwn(row, field)), problem);
  return row;
}
function sameKey(left: ManagedListingImagesKey, right: ManagedListingImagesKey): boolean {
  return KEY_FIELDS.every(field => left[field] === right[field]);
}
export function bindManagedListingImagesKey(value: ManagedListingImagesKey): ManagedListingImagesKey {
  const row = record(value, KEY_FIELDS, "invalid");
  ensure(uuid(row.userId) && uuid(row.identityId) && uuid(row.attemptId) && unsigned(row.listingId, true), "invalid");
  return Object.freeze({ userId: row.userId, identityId: row.identityId, listingId: row.listingId, attemptId: row.attemptId });
}

function parseImages(value: unknown, key: ManagedListingImagesKey, wire: boolean,
    problem: ManagedListingImagesProblem = "unknown"): readonly ManagedListingImage[] {
  ensure(Array.isArray(value) && value.length <= 10, problem);
  const images = Array.from(value, (item, index) => {
    const row = record(item, ["ordinal", "url", wire ? "is_primary" : "isPrimary"], problem);
    // Original ordinal is immutable. The primary flag never reorders or renames an object.
    ensure(row.ordinal === index && Number.isInteger(row.ordinal) && index <= 9
      && row.url === `/api/v2/listing-media/${key.attemptId}/${index}`
      && typeof row[wire ? "is_primary" : "isPrimary"] === "boolean", problem);
    return Object.freeze({ ordinal: index, url: row.url as string, isPrimary: row[wire ? "is_primary" : "isPrimary"] as boolean });
  });
  ensure(images.length === 0 || images.filter(image => image.isPrimary).length === 1, problem);
  return Object.freeze(images);
}

/** The HTTP envelope is bound to the actor, listing and displayed publication attempt. */
export function parseManagedListingImages(value: unknown, expected: ManagedListingImagesKey): ManagedListingImagesSnapshot {
  const key = bindManagedListingImagesKey(expected);
  const row = record(value, READ_FIELDS);
  ensure(row.schema_version === 1 && row.actor_user_id === key.userId && row.identity_id === key.identityId
    && row.listing_id === key.listingId && row.attempt_id === key.attemptId && unsigned(row.revision));
  return Object.freeze({ key, revision: row.revision, images: parseImages(row.images, key, true) });
}

/** Capture the complete displayed baseline before any asynchronous actor/session read. */
export function bindManagedListingPrimaryCommand(value: ManagedListingPrimaryCommand): ManagedListingPrimaryCommand {
  const row = record(value, ["key", "baseline", "ordinal"], "invalid");
  const key = bindManagedListingImagesKey(row.key as ManagedListingImagesKey);
  const raw = record(row.baseline, ["key", "revision", "images"], "invalid");
  const baselineKey = bindManagedListingImagesKey(raw.key as ManagedListingImagesKey);
  ensure(sameKey(key, baselineKey) && unsigned(raw.revision), "invalid");
  const images = parseImages(raw.images, key, false, "invalid");
  ensure(Number.isInteger(row.ordinal) && Number(row.ordinal) >= 0 && Number(row.ordinal) <= 9
    && images.some(image => image.ordinal === row.ordinal), "invalid");
  ensure(raw.revision !== String(MAX_BIGINT) || images[Number(row.ordinal)].isPrimary, "invalid");
  const baseline = Object.freeze({ key, revision: raw.revision, images });
  return Object.freeze({ key, baseline, ordinal: row.ordinal as number });
}

export function managedListingImagesReadArguments(value: ManagedListingImagesKey): Readonly<Record<string, unknown>> {
  const key = bindManagedListingImagesKey(value);
  return Object.freeze({ p_expected_user_id: key.userId, p_expected_identity_id: key.identityId,
    p_listing_id: key.listingId, p_attempt_id: key.attemptId });
}
export function managedListingPrimaryArguments(value: ManagedListingPrimaryCommand): Readonly<Record<string, unknown>> {
  const command = bindManagedListingPrimaryCommand(value);
  return Object.freeze({ ...managedListingImagesReadArguments(command.key),
    p_expected_revision: command.baseline.revision, p_ordinal: command.ordinal });
}

/** An acknowledgement must prove the requested primary, unchanged image objects and exact CAS revision. */
export function parseManagedListingPrimarySaved(value: unknown, input: ManagedListingPrimaryCommand): ManagedListingImagesSaved {
  const command = bindManagedListingPrimaryCommand(input);
  const row = record(value, [...READ_FIELDS, "changed"]);
  ensure(typeof row.changed === "boolean");
  const { changed, ...read } = row;
  const snapshot = parseManagedListingImages(read, command.key);
  const expectedChanged = !command.baseline.images[command.ordinal].isPrimary;
  ensure(changed === expectedChanged
    && BigInt(snapshot.revision) === BigInt(command.baseline.revision) + (expectedChanged ? BigInt(1) : BigInt(0))
    && snapshot.images.length === command.baseline.images.length
    && snapshot.images.every((image, index) => image.ordinal === command.baseline.images[index].ordinal
      && image.url === command.baseline.images[index].url && image.isPrimary === (image.ordinal === command.ordinal)));
  return Object.freeze({ snapshot, changed });
}

/** Only an explicit rejection establishes that the server did not perform this write. */
export function classifyManagedListingImagesError(error: unknown): ManagedListingImagesError {
  if (error instanceof ManagedListingImagesError) return error;
  if (error && typeof error === "object") {
    const row = error as Record<string, unknown>;
    if (row.code === "40001" && row.message === "listing_images_conflict") return new ManagedListingImagesError("conflict");
    if (row.code === "42501") return new ManagedListingImagesError("context");
    if (row.code === "22023") return new ManagedListingImagesError("invalid");
    if (row.code === "55000" && row.message === "listing_images_unavailable") return new ManagedListingImagesError("unavailable");
    if (row.code === "PGRST202" || row.code === "42883") return new ManagedListingImagesError("unavailable");
  }
  return new ManagedListingImagesError("unknown");
}
