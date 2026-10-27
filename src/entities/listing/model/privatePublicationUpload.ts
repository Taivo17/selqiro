import { localPublicationOrigin } from "../../../shared/config/v2Integration";
/** V2 private SOURCE upload only. Neither a Storage acknowledgement nor a token is
 * evidence of a verified image or a published listing. No public image URL here. */
export const PRIVATE_UPLOAD = Object.freeze({
  bucket: "listing-publication-private", maxSourceBytes: 25 * 1024 * 1024,
  tokenSeconds: 7200, signWindowSeconds: 30, maxTokenChars: 4096,
  rpcTimeoutMs: 10000, uploadTimeoutMs: 120000, maxResponseBytes: 16384,
});
export type UploadCommand = Readonly<{
  expectedUserId: string; expectedIdentityId: string; attemptId: string;
  slotId: string; dispatchKey: string;
}>;
export type UploadBinding = Readonly<{
  schema_version: 1; actor_user_id: string; identity_id: string; attempt_id: string;
  slot_id: string; object_id: string; dispatch_key: string; grant_id: string;
  bucket_id: "listing-publication-private"; object_path: string;
  expected_bytes: number; expected_sha256: string;
}>;
export type PrivateUploadGrant = UploadBinding & Readonly<{
  token: string; issued_epoch: number; expires_epoch: number;
}>;
export type UploadProblem = "invalid_input" | "invalid_response" | "unauthorized" |
  "context_changed" | "grant_unavailable" | "outcome_unknown" | "aborted" |
  "file_mismatch" | "configuration";
export class PrivateUploadError extends Error {
  constructor(readonly code: UploadProblem) { super("private_upload_" + code); this.name = "PrivateUploadError"; }
}
export const uploadFail = (code: UploadProblem): never => { throw new PrivateUploadError(code); };
export function isUploadUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
    && v !== "00000000-0000-0000-0000-000000000000";
}
export function uploadRecord(v: unknown, keys?: readonly string[]): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.getPrototypeOf(v) !== Object.prototype) return uploadFail("invalid_response");
  const ds = Object.getOwnPropertyDescriptors(v);
  if (Reflect.ownKeys(v).some(k => typeof k !== "string") ||
      Object.values(ds).some(d => !d.enumerable || !("value" in d))) return uploadFail("invalid_response");
  if (keys && (Object.keys(v).sort().join(",") !== [...keys].sort().join(","))) return uploadFail("invalid_response");
  return v as Record<string, unknown>;
}
export function copyUploadCommand(v: unknown): UploadCommand {
  const r = uploadRecord(v, ["expectedUserId", "expectedIdentityId", "attemptId", "slotId", "dispatchKey"]);
  if (!Object.values(r).every(isUploadUuid)) return uploadFail("invalid_input");
  return Object.freeze({ ...r }) as UploadCommand;
}
export function publicationStorageOrigin(v: string): string {
  // A deployment configuration, NEVER a request-supplied destination. No custom hosts,
  // credentials, ports, paths, querystrings, redirects or a public-bucket fallback.
  if (typeof v !== "string" || (!/^https:\/\/[a-z]{20}\.supabase\.co$/.test(v) && !localPublicationOrigin(v))) return uploadFail("configuration");
  return v;
}
const bindingKeys = ["schema_version", "actor_user_id", "identity_id", "attempt_id", "slot_id", "object_id",
  "dispatch_key", "grant_id", "bucket_id", "object_path", "expected_bytes", "expected_sha256"] as const;
export function copyUploadBinding(v: unknown, cmd: UploadCommand): UploadBinding {
  const r = uploadRecord(v, bindingKeys);
  if (r.schema_version !== 1 || ![r.actor_user_id, r.identity_id, r.attempt_id, r.slot_id, r.object_id,
      r.dispatch_key, r.grant_id].every(isUploadUuid) || r.actor_user_id !== cmd.expectedUserId ||
      r.identity_id !== cmd.expectedIdentityId || r.attempt_id !== cmd.attemptId || r.slot_id !== cmd.slotId ||
      r.dispatch_key !== cmd.dispatchKey || r.bucket_id !== PRIVATE_UPLOAD.bucket ||
      r.object_path !== `v1/${cmd.attemptId}/${cmd.slotId}/source.upload` ||
      !Number.isSafeInteger(r.expected_bytes) || Number(r.expected_bytes) < 1 || Number(r.expected_bytes) > PRIVATE_UPLOAD.maxSourceBytes ||
      typeof r.expected_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(r.expected_sha256)) return uploadFail("invalid_response");
  return Object.freeze({ ...r }) as UploadBinding;
}
/** Parse consistency fields ONLY. This does NOT verify JWT signatures or authenticate
 * a caller. The server may use this only on its own authenticated HTTPS Storage response;
 * the browser receives the grant from the authenticated application. Storage verifies it. */
export function inspectUploadToken(token: unknown, path: string): Readonly<{issued_epoch: number; expires_epoch: number}> {
  if (typeof token !== "string" || token.length > PRIVATE_UPLOAD.maxTokenChars ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return uploadFail("invalid_response");
  const parts = token.split(".");
  function decode(part: string): Record<string, unknown> {
    try {
      const b = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
      return uploadRecord(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(b, c => c.charCodeAt(0)))));
    } catch { return uploadFail("invalid_response"); }
  }
  const header = decode(parts[0]), claims = decode(parts[1]);
  if (typeof header.alg !== "string" || !["HS256", "RS256", "ES256"].includes(header.alg) ||
      claims.url !== PRIVATE_UPLOAD.bucket + "/" + path || claims.upsert !== false ||
      !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) || Number(claims.iat) < 1 ||
      Number(claims.exp) - Number(claims.iat) !== PRIVATE_UPLOAD.tokenSeconds) return uploadFail("invalid_response");
  // Scope, owner and provider-specific fields are not authorization inputs here.
  return Object.freeze({ issued_epoch: Number(claims.iat), expires_epoch: Number(claims.exp) });
}
export function copyPrivateUploadGrant(v: unknown, cmd: UploadCommand, nowMs: number): PrivateUploadGrant {
  const r = uploadRecord(v, [...bindingKeys, "token", "issued_epoch", "expires_epoch"]);
  const b = Object.fromEntries(bindingKeys.map(k => [k, r[k]]));
  const binding = copyUploadBinding(b, cmd), times = inspectUploadToken(r.token, binding.object_path);
  if (!Number.isFinite(nowMs) || r.issued_epoch !== times.issued_epoch || r.expires_epoch !== times.expires_epoch ||
      times.issued_epoch > Math.floor(nowMs / 1000) + 60 || times.expires_epoch <= Math.floor(nowMs / 1000)) return uploadFail("grant_unavailable");
  return Object.freeze({ ...binding, token: r.token as string, ...times });
}
export function privateUploadUrl(origin: string, grant: PrivateUploadGrant): string {
  return publicationStorageOrigin(origin) + "/storage/v1/object/upload/sign/" + grant.bucket_id + "/" +
    grant.object_path + "?token=" + encodeURIComponent(grant.token);
}
export async function uploadSha256(bytes: Uint8Array): Promise<string> {
  // Copy into owned memory before the await; never hash a later mutable buffer view.
  const own = new Uint8Array(bytes);
  const out = await globalThis.crypto.subtle.digest("SHA-256", own);
  return Array.from(new Uint8Array(out), x => x.toString(16).padStart(2, "0")).join("");
}
