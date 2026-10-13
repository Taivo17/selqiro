import { createHash } from "node:crypto";
import { isUploadUuid, uploadRecord } from "../../../entities/listing/model/privatePublicationUpload";
import type { SanitizedListingImage } from "../images/sanitize.cjs";

export const WEB_IMAGE = Object.freeze({ bucket: "listing-publication-private", sourceMax: 26214400,
  webMax: 4194304, edgeMax: 2048, transferTimeoutMs: 30000, processSeconds: 120, sendSeconds: 30 });
export type WebCommand = Readonly<{ expectedUserId: string; expectedIdentityId: string;
  attemptId: string; slotId: string; requestKey: string }>;
export type WebIntent = Readonly<{ pipeline_version: "listing-web-v1"; content_type: "image/webp";
  source_sha256: string; source_bytes: number; source_format: "jpeg" | "png" | "webp";
  web_sha256: string; web_bytes: number; width: number; height: number; sharp_version: string; libvips_version: string }>;
export type WebBinding = Readonly<{ schema_version: 1; actor_user_id: string; identity_id: string;
  attempt_id: string; slot_id: string; job_id: string; request_key: string; source_object_id: string;
  web_object_id: string; bucket_id: "listing-publication-private"; source_path: string; web_path: string;
  source_bytes: number; source_sha256: string }>;
export type WebReceipt = Readonly<{ schema_version: 1; receipt_id: string; job_id: string; attempt_id: string;
  slot_id: string; web_sha256: string; web_bytes: number; width: number; height: number; pipeline_version: "listing-web-v1" }>;
export type WebProblem = "invalid_input" | "invalid_response" | "configuration" | "unauthorized" |
  "context_changed" | "busy" | "outcome_unknown" | "aborted" | "source_mismatch" | "image_rejected" |
  "write_window_expired" | "readback_mismatch";
export class WebImageError extends Error {
  constructor(readonly code: WebProblem) { super("publication_web_" + code); this.name = "WebImageError"; }
}
export const webFail = (code: WebProblem): never => { throw new WebImageError(code); };
export const webHash = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
export const hashValid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{64}$/.test(v);
const integer = (v: unknown, min: number, max: number): v is number => Number.isSafeInteger(v) && Number(v) >= min && Number(v) <= max;
export function webRecord(v: unknown, keys?: readonly string[]): Record<string, unknown> {
  try { return uploadRecord(v, keys); } catch { return webFail("invalid_response"); }
}
export function copyWebCommand(v: unknown): WebCommand {
  let r: Record<string, unknown>;
  try { r = webRecord(v, ["expectedUserId", "expectedIdentityId", "attemptId", "slotId", "requestKey"]); }
  catch { return webFail("invalid_input"); }
  if (!Object.values(r).every(isUploadUuid)) return webFail("invalid_input");
  return Object.freeze({ ...r }) as WebCommand;
}
const bindingKeys = ["schema_version", "actor_user_id", "identity_id", "attempt_id", "slot_id", "job_id", "request_key",
  "source_object_id", "web_object_id", "bucket_id", "source_path", "web_path", "source_bytes", "source_sha256"];
export function copyWebBinding(value: unknown, cmd: WebCommand): WebBinding {
  const r = webRecord(value, bindingKeys);
  if (r.schema_version !== 1 || ![r.actor_user_id,r.identity_id,r.attempt_id,r.slot_id,r.job_id,r.request_key,
      r.source_object_id,r.web_object_id].every(isUploadUuid) || r.actor_user_id !== cmd.expectedUserId ||
      r.identity_id !== cmd.expectedIdentityId || r.attempt_id !== cmd.attemptId || r.slot_id !== cmd.slotId ||
      r.request_key !== cmd.requestKey || r.source_object_id === r.web_object_id || r.bucket_id !== WEB_IMAGE.bucket ||
      r.source_path !== `v1/${cmd.attemptId}/${cmd.slotId}/source.upload` ||
      r.web_path !== `v1/${cmd.attemptId}/${cmd.slotId}/web-v1.webp` ||
      !integer(r.source_bytes,1,WEB_IMAGE.sourceMax) || !hashValid(r.source_sha256)) return webFail("invalid_response");
  return Object.freeze({ ...r }) as WebBinding;
}
const intentKeys = ["pipeline_version","content_type","source_sha256","source_bytes","source_format","web_sha256",
  "web_bytes","width","height","sharp_version","libvips_version"];
export function copyWebIntent(value: unknown, binding: WebBinding): WebIntent {
  const r = webRecord(value, intentKeys), semver = (v: unknown) => typeof v === "string" && /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(v);
  if (r.pipeline_version !== "listing-web-v1" || r.content_type !== "image/webp" || typeof r.source_format!=="string" || !["jpeg","png","webp"].includes(r.source_format) ||
      r.source_sha256 !== binding.source_sha256 || r.source_bytes !== binding.source_bytes || !hashValid(r.web_sha256) ||
      !integer(r.web_bytes,20,WEB_IMAGE.webMax) || !integer(r.width,1,WEB_IMAGE.edgeMax) || !integer(r.height,1,WEB_IMAGE.edgeMax) ||
      !semver(r.sharp_version) || !semver(r.libvips_version)) return webFail("invalid_response");
  return Object.freeze({ ...r }) as WebIntent;
}
export function sameRecord(a: object, b: object): boolean {
  const r = a as Record<string,unknown>, s = b as Record<string,unknown>;
  return Object.keys(r).length === Object.keys(s).length && Object.keys(r).every(k => r[k] === s[k]);
}
export function copyWebReceipt(value: unknown, b: WebBinding, i: WebIntent): WebReceipt {
  const r = webRecord(value, ["schema_version","receipt_id","job_id","attempt_id","slot_id","web_sha256","web_bytes","width","height","pipeline_version"]);
  if (r.schema_version !== 1 || !isUploadUuid(r.receipt_id) || r.job_id !== b.job_id || r.attempt_id !== b.attempt_id ||
      r.slot_id !== b.slot_id || r.web_sha256 !== i.web_sha256 || r.web_bytes !== i.web_bytes || r.width !== i.width ||
      r.height !== i.height || r.pipeline_version !== i.pipeline_version) return webFail("invalid_response");
  return Object.freeze({ ...r }) as WebReceipt;
}
/** The existing sanitizer's Buffer is mutable. Detach and hash before the next await.
 * This validates trusted native-worker evidence, NEVER accepts a client 'verified' object. */
export function detachSanitizedImage(result: SanitizedListingImage, binding: WebBinding): Readonly<{ bytes: Buffer; intent: WebIntent }> {
  const r = webRecord(result,["buffer","contentType","byteLength","width","height","sha256","sourceSha256",
    "sourceByteLength","sourceFormat","pipelineVersion","engine"]);
  if (!Buffer.isBuffer(r.buffer) || r.buffer.buffer instanceof SharedArrayBuffer || r.buffer.byteLength > WEB_IMAGE.webMax) return webFail("invalid_response");
  const bytes = Buffer.from(r.buffer);
  const e = webRecord(r.engine,["sharp","libvips"]);
  const intent = copyWebIntent({ pipeline_version:r.pipelineVersion,content_type:r.contentType,source_sha256:r.sourceSha256,
    source_bytes:r.sourceByteLength,source_format:r.sourceFormat,web_sha256:r.sha256,web_bytes:r.byteLength,
    width:r.width,height:r.height,sharp_version:e.sharp,libvips_version:e.libvips },binding);
  if (bytes.length !== intent.web_bytes || webHash(bytes) !== intent.web_sha256 || bytes.toString("ascii",0,4) !== "RIFF" ||
      bytes.toString("ascii",8,12) !== "WEBP" || bytes.readUInt32LE(4) !== bytes.length-8) return webFail("invalid_response");
  return Object.freeze({ bytes, intent });
}
