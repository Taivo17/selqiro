import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, ListPartsCommand,
  CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isUploadUuid } from "../../../entities/listing/model/privatePublicationUpload";
import { WEB_IMAGE, hashValid, webFail, webRecord, type WebCommand } from "../web/webImageContract";
import { isHostedPreviewConfig, type HostedPreviewConfig } from "../journey/hostedPreviewConfig";
import { hostedServerS3Credentials, hostedSourceS3Credentials, type HostedSourceS3Credentials } from "./hostedS3Credentials";

export type MultipartPublicationConfig = Readonly<{
  projectOrigin: string; publicKey: string; serviceKey: string;
  s3Endpoint: string; s3Region: string; s3TenantId: string; s3AccessKeyId: string; s3SecretAccessKey: string;
  integrationScope: "disposable-v2";
}>;
export type MultipartKind = "source" | "web";
export type MultipartSession = Readonly<{
  schema_version: 2; session_id: string; object_id: string; kind: MultipartKind;
  attempt_id: string; slot_id: string; request_key: string;
  bucket_id: "listing-publication-private"; object_path: string;
  expected_bytes: number; expected_sha256: string;
  state: "creating" | "open" | "completing" | "completed" | "needs_attention";
  upload_id: string | null; storage_version: string | null;
  part_key: string | null; part_sign_epoch: number | null;
  complete_key: string | null; part_etag: string | null;
  storage_object_id: string | null; completed: boolean; verified: boolean; problem: string | null;
}>;
export type BrowserPartGrant = Readonly<{ url: string; headers: Record<string, string>;
  expiresAt: number; expectedBytes: number; sha256: string }>;
const sessionKeys = ["schema_version", "session_id", "object_id", "kind", "attempt_id", "slot_id", "request_key",
  "bucket_id", "object_path", "expected_bytes", "expected_sha256", "state", "upload_id", "storage_version",
  "part_key", "part_sign_epoch", "complete_key", "part_etag", "storage_object_id", "completed", "verified", "problem"];
export function copyMultipartSession(value: unknown, cmd: WebCommand, kind: MultipartKind): MultipartSession {
  const r = webRecord(value, sessionKeys);
  const path = `v1/${cmd.attemptId}/${cmd.slotId}/${kind === "source" ? "source.upload" : "web-v1.webp"}`;
  if (r.schema_version !== 2 || ![r.session_id, r.object_id, r.attempt_id, r.slot_id, r.request_key].every(isUploadUuid) ||
      r.attempt_id !== cmd.attemptId || r.slot_id !== cmd.slotId || r.request_key !== cmd.requestKey || r.kind !== kind ||
      r.bucket_id !== WEB_IMAGE.bucket || r.object_path !== path || !Number.isSafeInteger(r.expected_bytes) ||
      Number(r.expected_bytes) < 1 || Number(r.expected_bytes) > (kind === "source" ? WEB_IMAGE.sourceMax : WEB_IMAGE.webMax) ||
      !hashValid(r.expected_sha256) || !["creating", "open", "completing", "completed", "needs_attention"].includes(String(r.state)) ||
      (r.upload_id !== null && (typeof r.upload_id !== "string" || !r.upload_id || r.upload_id.length > 2048 || /[\x00-\x1f\x7f]/.test(r.upload_id))) ||
      ![r.storage_version, r.part_key, r.complete_key, r.storage_object_id].every(v => v === null || isUploadUuid(v)) ||
      (r.part_sign_epoch !== null && (!Number.isSafeInteger(r.part_sign_epoch) || Number(r.part_sign_epoch) < 1)) ||
      (r.part_etag !== null && (typeof r.part_etag !== "string" || !r.part_etag || r.part_etag.length > 256)) ||
      typeof r.completed !== "boolean" || typeof r.verified !== "boolean" || (r.verified && !r.completed) ||
      (r.completed && (r.state !== "completed" || r.storage_object_id === null || r.complete_key === null)) ||
      ((r.upload_id === null) !== (r.storage_version === null)) || ((r.part_key === null) !== (r.part_sign_epoch === null)) ||
      (r.problem !== null && !["create_outcome_unknown", "part_outcome_unknown", "complete_outcome_unknown", "provider_mismatch",
        "source_mismatch", "web_mismatch", "part_window_expired", "image_rejected", "image_processor_unavailable"].includes(String(r.problem)))) return webFail("invalid_response");
  return Object.freeze({ ...r }) as MultipartSession;
}

/** This candidate is intentionally bound to an explicitly selected disposable local
 * stack. A production origin cannot accidentally activate it through env defaults. */
export function multipartConfig(config: MultipartPublicationConfig): Readonly<{ origin: string; endpoint: string }> {
  if (typeof window !== "undefined" || config.integrationScope !== "disposable-v2") return webFail("configuration");
  let origin: URL, endpoint: URL;
  try { origin = new URL(config.projectOrigin); endpoint = new URL(config.s3Endpoint); }
  catch { return webFail("configuration"); }
  if (origin.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(origin.hostname) ||
      origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/" ||
      endpoint.origin !== origin.origin || endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      !["/s3", "/storage/v1/s3"].includes(endpoint.pathname)) return webFail("configuration");
  for (const key of [config.publicKey, config.serviceKey, config.s3AccessKeyId, config.s3SecretAccessKey]) {
    if (typeof key !== "string" || !key || key.length > 8192 || /\s/.test(key)) return webFail("configuration");
  }
  if (typeof config.s3Region !== "string" || !/^[a-z0-9-]{1,64}$/.test(config.s3Region)) return webFail("configuration");
  if (typeof config.s3TenantId !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(config.s3TenantId)) return webFail("configuration");
  return Object.freeze({ origin: origin.origin, endpoint: endpoint.toString() });
}
function uploadId(session: MultipartSession): string {
  if (!session.upload_id || !session.storage_version) return webFail("invalid_response");
  return session.upload_id;
}
function etag(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 256 || /[\x00-\x1f\x7f]/.test(value)) return webFail("invalid_response");
  return value;
}

/** AWS SDK supplies signing/XML parsing only. Semantics come from the pinned
 * Supabase implementation, not inferred AWS guarantees. No automatic SDK retries. */
export function createMultipartS3Transport(config: MultipartPublicationConfig) {
  const { endpoint } = multipartConfig(config);
  // The retained local provider contract uses tenantId as its signing secret.
  // This exception is deliberately confined to the disposable-only entrypoint.
  return createBoundS3Transport(endpoint, config.s3Region,
    { accessKeyId: config.s3AccessKeyId, secretAccessKey: config.s3SecretAccessKey },
    token => ({ accessKeyId: config.s3TenantId, secretAccessKey: config.s3TenantId, sessionToken: token }), false);
}

/** The managed endpoint and both credential classes come only from validated
 * server configuration. This does not replace Auth, SQL actor or RLS checks. */
export function createHostedMultipartS3Transport(config: HostedPreviewConfig) {
  if (!isHostedPreviewConfig(config)) return webFail("configuration");
  const serverCredentials = hostedServerS3Credentials(config);
  if (!serverCredentials) return webFail("configuration");
  return createBoundS3Transport(config.s3Endpoint, config.s3Region, serverCredentials, token => {
    const credentials = hostedSourceS3Credentials(config, token);
    return credentials ?? webFail("unauthorized");
  }, true);
}

/** Match the raw query representation admitted by the hosted SQL helper.
 * Canonical RFC3986 encoding keeps an opaque ID distinct from query syntax. */
function hostedSourceQueryMatches(url: URL, id: string): boolean {
  const fields = url.search.slice(1).split("&"), names = fields.map(field => field.split("=", 1)[0]);
  if (names.some(name => !/^[A-Za-z0-9_-]+$/.test(name))
      || new Set(names.map(name => name.toLowerCase())).size !== names.length) return false;
  const encoded = encodeURIComponent(id).replace(/[!'()*]/g, character => "%" + character.charCodeAt(0).toString(16).toUpperCase());
  return fields.filter(field => field.startsWith("uploadId=")).length === 1
    && fields.includes("uploadId=" + encoded) && fields.includes("partNumber=1")
    && url.searchParams.getAll("partNumber").length === 1;
}

function createBoundS3Transport(endpoint: string, region: string,
    serverCredentials: Readonly<{ accessKeyId: string; secretAccessKey: string }>,
    sourceCredentials: (token: string) => HostedSourceS3Credentials,
    hosted: boolean) {
  const client = new S3Client({ endpoint, region, forcePathStyle: true, maxAttempts: 1,
    // The SDK annotates its credentials with feature metadata. Give it an owned
    // mutable copy while the validated configuration/credential records stay frozen.
    credentials: { ...serverCredentials },
    requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" });
  async function bounded<T>(operation: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) return webFail("aborted");
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    const timer = setTimeout(abort, WEB_IMAGE.transferTimeoutMs);
    try { return await operation(controller.signal); }
    finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
  }
  return Object.freeze({
    async create(session: MultipartSession, signal?: AbortSignal): Promise<string> {
      const r = await bounded(s => client.send(new CreateMultipartUploadCommand({ Bucket: session.bucket_id,
        Key: session.object_path, ContentType: session.kind === "web" ? "image/webp" : "application/octet-stream",
        CacheControl: "no-store" }), { abortSignal: s }), signal);
      if (r.$metadata.httpStatusCode !== 200 || r.Bucket !== session.bucket_id || r.Key !== session.object_path ||
          typeof r.UploadId !== "string" || !r.UploadId || r.UploadId.length > 2048) return webFail("invalid_response");
      return r.UploadId;
    },
    async presignSourcePart(session: MultipartSession, accessToken: string): Promise<BrowserPartGrant> {
      if (session.kind !== "source" || session.state !== "open" || !session.part_key || !session.part_sign_epoch) return webFail("invalid_response");
      const expiresAt = (session.part_sign_epoch + 600) * 1000;
      if (expiresAt <= Date.now() || session.part_sign_epoch * 1000 > Date.now() + 60000) return webFail("write_window_expired");
      if (typeof accessToken !== "string" || !accessToken || accessToken.length > 8192 || /\s/.test(accessToken)) return webFail("unauthorized");
      // Only user-scoped credentials sign browser SOURCE. Operation-aware RLS
      // remains responsible for rejecting alternate unsigned S3 routing headers.
      const sourceClient = new S3Client({ endpoint, region, forcePathStyle: true, maxAttempts: 1,
        credentials: { ...sourceCredentials(accessToken) },
        requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" });
      const url = await getSignedUrl(sourceClient, new UploadPartCommand({ Bucket: session.bucket_id, Key: session.object_path,
        UploadId: uploadId(session), PartNumber: 1, ContentLength: session.expected_bytes }),
      { expiresIn: 600, signingDate: new Date(session.part_sign_epoch * 1000) });
      const parsed = new URL(url), ep = new URL(endpoint);
      if (parsed.origin !== ep.origin || parsed.pathname !== `${ep.pathname}/${session.bucket_id}/${session.object_path}` ||
          parsed.searchParams.get("partNumber") !== "1" || parsed.searchParams.get("uploadId") !== session.upload_id ||
          parsed.searchParams.get("X-Amz-Expires") !== "600" || !parsed.searchParams.has("X-Amz-Signature") ||
          parsed.searchParams.get("X-Amz-Security-Token") !== accessToken ||
          !parsed.searchParams.get("X-Amz-SignedHeaders")?.split(";").includes("content-length") ||
          (hosted && !hostedSourceQueryMatches(parsed, session.upload_id!))) return webFail("invalid_response");
      // Browsers set Content-Length from the real body; script must not set that
      // forbidden header. RLS binds it; a full GET later verifies length and hash.
      return Object.freeze({ url, headers: { "content-type": "application/octet-stream" }, expiresAt,
        expectedBytes: session.expected_bytes, sha256: session.expected_sha256 });
    },
    async putWebPart(session: MultipartSession, bytes: Buffer, signal?: AbortSignal): Promise<void> {
      if (session.kind !== "web" || session.state !== "open" || !session.part_key || bytes.length !== session.expected_bytes) return webFail("invalid_response");
      const r = await bounded(s => client.send(new UploadPartCommand({ Bucket: session.bucket_id, Key: session.object_path,
        UploadId: uploadId(session), PartNumber: 1, ContentLength: bytes.length, Body: bytes }), { abortSignal: s }), signal);
      if (r.$metadata.httpStatusCode !== 200) return webFail("invalid_response");
      etag(r.ETag); // Not content verification and never the client's assertion.
    },
    async listOnePart(session: MultipartSession, signal?: AbortSignal): Promise<string | null> {
      const r = await bounded(s => client.send(new ListPartsCommand({ Bucket: session.bucket_id,
        Key: session.object_path, UploadId: uploadId(session), MaxParts: 2 }), { abortSignal: s }), signal);
      if (r.$metadata.httpStatusCode !== 200 || r.Bucket !== session.bucket_id || r.Key !== session.object_path ||
          r.UploadId !== session.upload_id || r.IsTruncated === true) return webFail("invalid_response");
      const parts = r.Parts ?? [];
      if (parts.length === 0) return null;
      if (parts.length !== 1 || parts[0].PartNumber !== 1) return webFail("invalid_response");
      // v1.83.5 omits Size in this XML and its insertUploadPart omits parts.size.
      // The claim binds the primary part ETag/version; full GET checks length/hash.
      return etag(parts[0].ETag);
    },
    async complete(session: MultipartSession, signal?: AbortSignal): Promise<string> {
      if (session.state !== "completing" || !session.complete_key || !session.part_etag) return webFail("invalid_response");
      const r = await bounded(s => client.send(new CompleteMultipartUploadCommand({ Bucket: session.bucket_id,
        Key: session.object_path, UploadId: uploadId(session), MultipartUpload: { Parts: [{ PartNumber: 1, ETag: session.part_etag! }] } }),
      { abortSignal: s }), signal);
      if (r.$metadata.httpStatusCode !== 200 || r.Bucket !== session.bucket_id || r.Key !== session.object_path) return webFail("invalid_response");
      return etag(r.ETag);
    },
    async abort(session: MultipartSession, signal?: AbortSignal): Promise<"aborted" | "absent"> {
      // Caller holds a terminal-attempt withdrawal claim for this known uploadId.
      // Even a genuine Abort response is NOT a drain or final-deletion receipt.
      try {
        const r = await bounded(s => client.send(new AbortMultipartUploadCommand({ Bucket: session.bucket_id,
          Key: session.object_path, UploadId: uploadId(session) }), { abortSignal: s }), signal);
        if (r.$metadata.httpStatusCode !== 200 && r.$metadata.httpStatusCode !== 204) return webFail("invalid_response");
        return "aborted";
      } catch (error) {
        const r = error as { name?: string; $metadata?: { httpStatusCode?: number } };
        if (r?.name === "NoSuchUpload" && r.$metadata?.httpStatusCode === 404) return "absent";
        throw error;
      }
    },
  });
}
