import {isUploadUuid, uploadRecord, PRIVATE_UPLOAD} from "./privatePublicationUpload";
import type {PublicationSlot} from "./publicationJourney";
import {bindManagedListingImagesKey, bindManagedListingImagesSnapshot, confirmManagedListingImagesReadback,
  managedListingImagesReadArguments, parseManagedListingImages, MANAGED_LISTING_IMAGE_LIMIT, MAX_MANAGED_IMAGE_ORDINAL,
  type ManagedListingImagesKey, type ManagedListingImagesSnapshot} from "./managedListingImages";
import type {PublicationImageJournal} from "../api/completePublicationImage";

export type AdditionImage = Readonly<{client_file_id: string; byte_length: number; sha256: string}>;
export type PhotoAdditionJournal = PublicationImageJournal & {
  baseline: ManagedListingImagesSnapshot; image: AdditionImage; readyId: string | null;
};
export type PhotoAdditionSnapshot = Readonly<{
  attemptId: string; state: "open" | "cancelled" | "expired" | "published" | "deleted"; slot: PublicationSlot;
}>;
export type PhotoAttachmentReceipt = Readonly<{
  additionAttemptId: string; slotId: string; readyId: string; ordinal: number; url: string;
  attachedRevision: string; wasPrimary: boolean;
}>;
export type PhotoAdditionResult = Readonly<{
  snapshot: PhotoAdditionSnapshot | null; receipt: PhotoAttachmentReceipt | null; intentClosed: boolean;
  gallery: ManagedListingImagesSnapshot | null; acknowledged: ManagedListingImagesSnapshot | null;
}>;
const MAX_REVISION = BigInt("9223372036854775807");
const FIELDS = ["schema_version", "listing_id", "attempt_id", "request_key", "snapshot", "receipt", "intent_closed", "gallery"];
const uuid = (value: unknown): value is string => typeof value === "string" && value.length === 36 && isUploadUuid(value);
function check(condition: unknown): asserts condition { if (!condition) throw new Error("addition_response"); }
const sameKey = (a: ManagedListingImagesKey, b: ManagedListingImagesKey) =>
  a.userId === b.userId && a.identityId === b.identityId && a.listingId === b.listingId && a.attemptId === b.attemptId;
function timestamp(value: unknown) {
  return typeof value === "string" && value.length === 27 && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 23) === value.slice(0, 23);
}
export function bindAdditionImage(value: unknown): AdditionImage {
  const image = uploadRecord(value, ["client_file_id", "byte_length", "sha256"]);
  check(uuid(image.client_file_id) && Number.isSafeInteger(image.byte_length)
    && Number(image.byte_length) >= 1 && Number(image.byte_length) <= PRIVATE_UPLOAD.maxSourceBytes
    && typeof image.sha256 === "string" && image.sha256.length === 64 && /^[0-9a-f]{64}$/.test(image.sha256));
  return Object.freeze({client_file_id: image.client_file_id as string, byte_length: Number(image.byte_length), sha256: image.sha256 as string});
}
/** Only request identifiers, a bounded gallery baseline and byte metadata are kept.
 * File contents, filenames and signed upload URLs never enter this journal. */
export function bindPhotoAdditionJournal(value: unknown, expected: ManagedListingImagesKey): PhotoAdditionJournal {
  const row = uploadRecord(value, ["version", "requestKey", "dispatched", "baseline", "image", "readyId"]);
  const baseline = bindManagedListingImagesSnapshot(row.baseline as ManagedListingImagesSnapshot);
  check(row.version === 1 && uuid(row.requestKey) && sameKey(baseline.key, bindManagedListingImagesKey(expected))
    && baseline.images.length < MANAGED_LISTING_IMAGE_LIMIT && BigInt(baseline.revision) < MAX_REVISION
    && Array.isArray(row.dispatched) && row.dispatched.length <= 1 && row.dispatched.every(uuid)
    && (row.readyId === null || uuid(row.readyId)));
  return {version: 1, requestKey: row.requestKey as string, dispatched: [...row.dispatched] as string[],
    baseline, image: bindAdditionImage(row.image), readyId: row.readyId as string | null};
}
export function photoAdditionArguments(key: ManagedListingImagesKey, requestKey: string) {
  check(uuid(requestKey));
  return Object.freeze({...managedListingImagesReadArguments(key), p_request_key: requestKey});
}
export function preparePhotoAdditionArguments(journal: PhotoAdditionJournal) {
  const j = bindPhotoAdditionJournal(journal, journal.baseline.key);
  return Object.freeze({...photoAdditionArguments(j.baseline.key, j.requestKey),
    p_expected_revision: j.baseline.revision, p_image: j.image});
}
export function appendPhotoAdditionArguments(journal: PhotoAdditionJournal, snapshot: PhotoAdditionSnapshot) {
  const j = bindPhotoAdditionJournal(journal, journal.baseline.key);
  check(snapshot.state === "open" && uuid(snapshot.attemptId) && snapshot.attemptId !== j.baseline.key.attemptId
    && uuid(j.readyId));
  return Object.freeze({...photoAdditionArguments(j.baseline.key, j.requestKey), p_addition_attempt_id: snapshot.attemptId,
    p_ready_id: j.readyId, p_expected_revision: j.baseline.revision});
}
function additionSnapshot(value: unknown, j: PhotoAdditionJournal): PhotoAdditionSnapshot {
  const r = uploadRecord(value);
  const fields = ["schema_version", "attempt_id", "request_key", "actor_user_id", "identity_id", "state", "created_at", "expires_at", "payload", "slots"];
  check(Object.keys(r).filter(k => k !== "replayed" && k !== "changed").sort().join(",") === fields.sort().join(","));
  const key = j.baseline.key;
  check(r.schema_version === 1 && uuid(r.attempt_id) && r.attempt_id !== key.attemptId
    && r.request_key === j.requestKey && r.actor_user_id === key.userId && r.identity_id === key.identityId
    && ["open", "cancelled", "expired", "published", "deleted"].includes(String(r.state))
    && timestamp(r.created_at) && timestamp(r.expires_at) && Array.isArray(r.slots) && r.slots.length === 1);
  const slot = uploadRecord(r.slots[0], ["slot_id", "ordinal", "client_file_id", "expected_bytes", "expected_sha256"]);
  check(uuid(slot.slot_id) && slot.ordinal === 0 && slot.client_file_id === j.image.client_file_id
    && slot.expected_bytes === j.image.byte_length && slot.expected_sha256 === j.image.sha256
    && (j.dispatched.length === 0 || j.dispatched[0] === slot.slot_id));
  if (r.state === "open") {
    const payload = uploadRecord(r.payload, ["schema_version", "purpose", "parent_attempt_id", "listing_id"]);
    check(payload.schema_version === 1 && payload.purpose === "listing_image_addition"
      && payload.parent_attempt_id === key.attemptId && payload.listing_id === key.listingId);
  } else check(r.payload === null);
  return Object.freeze({attemptId: r.attempt_id as string, state: r.state as PhotoAdditionSnapshot["state"],
    slot: Object.freeze({...slot}) as PublicationSlot});
}
function attachmentReceipt(value: unknown, j: PhotoAdditionJournal, snapshot: PhotoAdditionSnapshot): PhotoAttachmentReceipt {
  const r = uploadRecord(value, ["schema_version", "listing_id", "attempt_id", "addition_attempt_id", "request_key",
    "actor_user_id", "identity_id", "slot_id", "ready_id", "ordinal", "media_attempt_id", "media_ordinal", "url",
    "attached_at", "attached_revision", "was_primary"]);
  const key = j.baseline.key;
  check(r.schema_version === 1 && r.listing_id === key.listingId && r.attempt_id === key.attemptId
    && r.request_key === j.requestKey && r.actor_user_id === key.userId && r.identity_id === key.identityId
    && r.addition_attempt_id === snapshot.attemptId && r.slot_id === snapshot.slot.slot_id
    && uuid(r.ready_id) && r.ready_id === j.readyId
    && Number.isInteger(r.ordinal) && Number(r.ordinal) > Math.max(-1, ...j.baseline.images.map(image => image.ordinal))
    && Number(r.ordinal) <= MAX_MANAGED_IMAGE_ORDINAL && r.media_attempt_id === snapshot.attemptId && r.media_ordinal === 0
    && r.url === `/api/v2/listing-media/${snapshot.attemptId}/0` && timestamp(r.attached_at)
    && r.attached_revision === String(BigInt(j.baseline.revision) + BigInt(1))
    && r.was_primary === (j.baseline.images.length === 0) && ["published", "deleted"].includes(snapshot.state));
  return Object.freeze({additionAttemptId: snapshot.attemptId, slotId: snapshot.slot.slot_id, readyId: r.ready_id as string,
    ordinal: Number(r.ordinal), url: r.url as string, attachedRevision: r.attached_revision as string, wasPrimary: r.was_primary as boolean});
}
/** The durable attachment receipt records the exact append even after a later
 * primary change or retirement. A current read cannot turn that into a retry. */
export function parsePhotoAdditionResult(value: unknown, journal: PhotoAdditionJournal): PhotoAdditionResult {
  const j = bindPhotoAdditionJournal(journal, journal.baseline.key), key = j.baseline.key;
  const r = uploadRecord(value);
  check(Object.keys(r).filter(k => k !== "replayed" && k !== "changed").sort().join(",") === [...FIELDS].sort().join(",")
    && (!Object.hasOwn(r, "replayed") || typeof r.replayed === "boolean")
    && (!Object.hasOwn(r, "changed") || typeof r.changed === "boolean")
    && r.schema_version === 1 && r.listing_id === key.listingId && r.attempt_id === key.attemptId
    && r.request_key === j.requestKey && typeof r.intent_closed === "boolean");
  const snapshot = r.snapshot === null ? null : additionSnapshot(r.snapshot, j);
  const gallery = r.gallery === null ? null : parseManagedListingImages(r.gallery, key);
  let receipt: PhotoAttachmentReceipt | null = null, acknowledged: ManagedListingImagesSnapshot | null = null;
  if (r.receipt !== null) {
    check(snapshot); receipt = attachmentReceipt(r.receipt, j, snapshot);
    acknowledged = bindManagedListingImagesSnapshot({key, revision: receipt.attachedRevision,
      images: [...j.baseline.images, {ordinal: receipt.ordinal, mediaAttemptId: receipt.additionAttemptId,
        mediaOrdinal: 0, url: receipt.url, isPrimary: receipt.wasPrimary}]});
    if (gallery) confirmManagedListingImagesReadback(acknowledged, gallery);
  } else check(!snapshot || !["published", "deleted"].includes(snapshot.state));
  return Object.freeze({snapshot, gallery, receipt, acknowledged, intentClosed: r.intent_closed as boolean});
}
