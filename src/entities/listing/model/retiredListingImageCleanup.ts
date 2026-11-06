import {isUploadUuid, uploadRecord} from "./privatePublicationUpload";

export type RetiredImageCleanupKey = Readonly<{
  userId: string; identityId: string; attemptId: string; requestKey: string;
}>;
export type RetiredImageCleanupStatus = Readonly<{
  attemptId: string; requestKey: string; filesRemaining: number; needsAttention: number; reservedBytes: number;
}>;
export function bindRetiredImageCleanupKey(value: unknown): RetiredImageCleanupKey {
  const key = uploadRecord(value, ["userId", "identityId", "attemptId", "requestKey"]);
  if (!Object.values(key).every(v => typeof v === "string" && v.length === 36 && isUploadUuid(v)))
    throw new Error("invalid_cleanup_context");
  return Object.freeze({...key}) as RetiredImageCleanupKey;
}
/** This narrow database projection is distinct from the SOURCE-only published
 * final receipt. reservedBytes is the logical reservation, not provider usage. */
export function retiredImageCleanupStatus(value: unknown, key: RetiredImageCleanupKey): RetiredImageCleanupStatus {
  const bound = bindRetiredImageCleanupKey(key);
  const r = uploadRecord(value, ["schema_version", "attempt_id", "request_key", "files_remaining", "needs_attention", "reserved_bytes"]);
  if (r.schema_version !== 1 || r.attempt_id !== bound.attemptId || r.request_key !== bound.requestKey
    || !Number.isSafeInteger(r.files_remaining) || Number(r.files_remaining) < 0 || Number(r.files_remaining) > 2147483647
    || !Number.isSafeInteger(r.needs_attention) || Number(r.needs_attention) < 0 || Number(r.needs_attention) > Number(r.files_remaining)
    || !Number.isSafeInteger(r.reserved_bytes) || Number(r.reserved_bytes) < 0
    // The v1 ledger reserves exactly 4 MiB for each WEB object. Validate the
    // projection; never calculate a new quota balance from a client operation.
    || r.reserved_bytes !== Number(r.files_remaining) * 4194304) throw new Error("invalid_cleanup_response");
  return Object.freeze({attemptId: bound.attemptId, requestKey: bound.requestKey,
    filesRemaining: Number(r.files_remaining), needsAttention: Number(r.needs_attention), reservedBytes: Number(r.reserved_bytes)});
}
