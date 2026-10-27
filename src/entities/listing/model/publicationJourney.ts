import type { ListingCreationInput } from "./listingCreationInput";
import { isUploadUuid, uploadRecord } from "./privatePublicationUpload";
import { bindPrepareListingPublicationCommand } from "../../../server/listing-publication/attempts/prepareInput";
import { receipt, type FinalReceipt } from "../../../server/listing-publication/final/finalContract";

export type PublicationActor = Readonly<{userId: string; identityId: string}>;
export type PublicationSlot = Readonly<{slot_id: string; ordinal: number; client_file_id: string;
  expected_bytes: number; expected_sha256: string}>;
export type PublicationSnapshot = Readonly<{
  schema_version: 1; attempt_id: string; request_key: string; actor_user_id: string; identity_id: string;
  state: "open" | "cancelled" | "expired" | "published" | "deleted";
  created_at: string; expires_at: string; payload: ListingCreationInput | null; slots: readonly PublicationSlot[];
}>;
export type PublicationJourney = Readonly<{snapshot: PublicationSnapshot | null; receipt: FinalReceipt | null; intentClosed: boolean}>;
function check(value: unknown): asserts value { if (!value) throw new Error("publication_response"); }
export function publicationSnapshot(value: unknown, actor: PublicationActor, requestKey: string): PublicationSnapshot {
  const r = uploadRecord(value);
  const keys = ["schema_version", "attempt_id", "request_key", "actor_user_id", "identity_id", "state", "created_at", "expires_at", "payload", "slots"];
  check(Object.keys(r).filter(k => k !== "replayed" && k !== "changed").sort().join(",") === keys.sort().join(","));
  check(r.schema_version === 1 && isUploadUuid(r.attempt_id) && r.request_key === requestKey
    && r.actor_user_id === actor.userId && r.identity_id === actor.identityId);
  check(["open", "cancelled", "expired", "published", "deleted"].includes(String(r.state)));
  for (const k of ["created_at", "expires_at"]) check(typeof r[k] === "string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(r[k] as string) && Number.isFinite(Date.parse(r[k] as string)));
  check(Array.isArray(r.slots) && r.slots.length <= 10);
  const slots = r.slots.map((v, index) => {
    const s = uploadRecord(v, ["slot_id", "ordinal", "client_file_id", "expected_bytes", "expected_sha256"]);
    check(isUploadUuid(s.slot_id) && isUploadUuid(s.client_file_id) && s.ordinal === index
      && Number.isSafeInteger(s.expected_bytes) && Number(s.expected_bytes) > 0 && Number(s.expected_bytes) <= 25 * 1024 * 1024
      && typeof s.expected_sha256 === "string" && /^[0-9a-f]{64}$/.test(s.expected_sha256));
    return Object.freeze({...s}) as PublicationSlot;
  });
  check(new Set(slots.map(s => s.slot_id)).size === slots.length && new Set(slots.map(s => s.client_file_id)).size === slots.length);
  let payload: ListingCreationInput | null = null;
  if (r.state === "open") {
    // The stored SQL payload is explicitly versioned; the creation command isn't.
    // Validate the native envelope before passing only its command fields onward.
    const stored = uploadRecord(r.payload, ["version", "basics", "price", "category_path", "location", "attributes", "details", "language"]);
    check(stored.version === 1);
    const {version: _version, ...input} = stored;
    payload = bindPrepareListingPublicationCommand({expectedUserId: actor.userId, expectedIdentityId: actor.identityId,
      requestKey, listing: input as ListingCreationInput,
      images: slots.map(s => ({client_file_id: s.client_file_id, byte_length: s.expected_bytes, sha256: s.expected_sha256}))}).p_input;
  } else check(r.payload === null);
  return Object.freeze({schema_version: 1, attempt_id: r.attempt_id as string, request_key: requestKey,
    actor_user_id: actor.userId, identity_id: actor.identityId, state: r.state as PublicationSnapshot["state"],
    created_at: r.created_at as string, expires_at: r.expires_at as string, payload, slots: Object.freeze(slots)});
}
export function publicationJourney(value: unknown, actor: PublicationActor, requestKey: string): PublicationJourney {
  const r = uploadRecord(value, ["snapshot", "receipt", "intent_closed"]);
  check(typeof r.intent_closed === "boolean");
  const snapshot = r.snapshot === null ? null : publicationSnapshot(r.snapshot, actor, requestKey);
  const final = r.receipt === null ? null : receipt(r.receipt, {identityId: actor.identityId,
    userId: actor.userId, requestKey, attemptId: snapshot?.attempt_id});
  check(!final || !!snapshot && ["published", "deleted"].includes(snapshot.state));
  return Object.freeze({snapshot, receipt: final, intentClosed: r.intent_closed as boolean});
}
