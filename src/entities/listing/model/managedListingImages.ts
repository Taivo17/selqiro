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
export type ManagedListingRemoveCommand = ManagedListingPrimaryCommand;
export type ManagedListingImagesSaved = Readonly<{ snapshot: ManagedListingImagesSnapshot; changed: boolean }>;
export type ManagedListingImagesProblem = "invalid" | "context" | "conflict" | "unavailable" | "unknown";

const messages: Record<ManagedListingImagesProblem, string> = {
  invalid: "Vali selle kuulutuse olemasolev foto ja kontrolli piltide seisu.",
  context: "Konto, aktiivne identiteet või kuulutuse haldusõigus muutus. Laadi kuulutuse seis uuesti.",
  conflict: "Kuulutuse pilte on vahepeal muudetud. Kontrolli salvestatud seisu enne järgmist toimingut.",
  unavailable: "Kuulutuse piltide muutmine pole praegu saadaval.",
  unknown: "Piltide muutmise tulemust ei saanud kinnitada. Kontrolli salvestatud seisu enne järgmist toimingut.",
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
  let previous = -1;
  const images = Array.from(value, item => {
    const row = record(item, ["ordinal", "url", wire ? "is_primary" : "isPrimary"], problem);
    // Active membership may have gaps. Original ordinals and URLs never change.
    ensure(Number.isInteger(row.ordinal) && Number(row.ordinal) > previous && Number(row.ordinal) <= 9
      && row.url === `/api/v2/listing-media/${key.attemptId}/${row.ordinal}`
      && typeof row[wire ? "is_primary" : "isPrimary"] === "boolean", problem);
    previous = Number(row.ordinal);
    return Object.freeze({ ordinal: previous, url: row.url as string, isPrimary: row[wire ? "is_primary" : "isPrimary"] as boolean });
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

function bindSnapshot(value: ManagedListingImagesSnapshot, problem: ManagedListingImagesProblem): ManagedListingImagesSnapshot {
  const raw = record(value, ["key", "revision", "images"], problem);
  const key = bindManagedListingImagesKey(raw.key as ManagedListingImagesKey);
  ensure(unsigned(raw.revision), problem);
  return Object.freeze({key, revision: raw.revision, images: parseImages(raw.images, key, false, problem)});
}
/** Capture the complete displayed baseline before any asynchronous actor/session read. */
function bindCommand(value: ManagedListingPrimaryCommand, remove: boolean): ManagedListingPrimaryCommand {
  const row = record(value, ["key", "baseline", "ordinal"], "invalid");
  const key = bindManagedListingImagesKey(row.key as ManagedListingImagesKey);
  const baseline = bindSnapshot(row.baseline as ManagedListingImagesSnapshot, "invalid");
  ensure(sameKey(key, baseline.key), "invalid");
  const selected = baseline.images.find(image => image.ordinal === row.ordinal);
  ensure(Number.isInteger(row.ordinal) && Number(row.ordinal) >= 0 && Number(row.ordinal) <= 9
    && selected, "invalid");
  ensure(baseline.revision !== String(MAX_BIGINT) || !remove && selected.isPrimary, "invalid");
  ensure(!remove || baseline.images.length >= 2 && !selected.isPrimary, "invalid");
  return Object.freeze({ key, baseline, ordinal: row.ordinal as number });
}
export const bindManagedListingPrimaryCommand = (value: ManagedListingPrimaryCommand) => bindCommand(value, false);
export const bindManagedListingRemoveCommand = (value: ManagedListingRemoveCommand) => bindCommand(value, true);

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
export function managedListingRemoveArguments(value: ManagedListingRemoveCommand): Readonly<Record<string, unknown>> {
  const command = bindManagedListingRemoveCommand(value);
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
  const expectedChanged = !command.baseline.images.find(image => image.ordinal === command.ordinal)!.isPrimary;
  ensure(changed === expectedChanged
    && BigInt(snapshot.revision) === BigInt(command.baseline.revision) + (expectedChanged ? BigInt(1) : BigInt(0))
    && snapshot.images.length === command.baseline.images.length
    && snapshot.images.every((image, index) => image.ordinal === command.baseline.images[index].ordinal
      && image.url === command.baseline.images[index].url && image.isPrimary === (image.ordinal === command.ordinal)));
  return Object.freeze({ snapshot, changed });
}

/** Removing one non-primary changes membership once; it cannot renumber or select another primary. */
export function parseManagedListingRemoveSaved(value: unknown, input: ManagedListingRemoveCommand): ManagedListingImagesSaved {
  const command = bindManagedListingRemoveCommand(input);
  const row = record(value, [...READ_FIELDS, "changed"]);
  const {changed, ...read} = row;
  const snapshot = parseManagedListingImages(read, command.key);
  const remaining = command.baseline.images.filter(image => image.ordinal !== command.ordinal);
  ensure(changed === true && BigInt(snapshot.revision) === BigInt(command.baseline.revision) + BigInt(1)
    && snapshot.images.length === remaining.length
    && snapshot.images.every((image, index) => image.ordinal === remaining[index].ordinal
      && image.url === remaining[index].url && image.isPrimary === remaining[index].isPrimary));
  return Object.freeze({snapshot, changed: true});
}

/** Readback can advance to a newer primary/removal, never restore a retired object or an older revision. */
export function confirmManagedListingImagesReadback(acknowledged: ManagedListingImagesSnapshot,
    observed: ManagedListingImagesSnapshot): ManagedListingImagesSnapshot {
  const saved = bindSnapshot(acknowledged, "unknown"), fresh = bindSnapshot(observed, "unknown");
  ensure(sameKey(saved.key, fresh.key) && BigInt(fresh.revision) >= BigInt(saved.revision)
    && (saved.images.length === 0 || fresh.images.length > 0));
  ensure(fresh.images.every(image => saved.images.some(previous => previous.ordinal === image.ordinal && previous.url === image.url)));
  if (fresh.revision === saved.revision) ensure(fresh.images.length === saved.images.length
    && fresh.images.every((image, index) => image.ordinal === saved.images[index].ordinal && image.isPrimary === saved.images[index].isPrimary));
  return fresh;
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
