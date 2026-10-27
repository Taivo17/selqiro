import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { isUploadUuid, PrivateUploadError } from "../../../entities/listing/model/privatePublicationUpload";
import type { SanitizedListingImage } from "../images/sanitize.cjs";
import { WEB_IMAGE, WebImageError, webFail, webRecord, copyWebCommand, copyWebBinding, copyWebIntent,
  copyWebReceipt, detachSanitizedImage, sameRecord, webHash, type WebCommand, type WebReceipt,
  type WebBinding, type WebIntent } from "../web/webImageContract";
import { readWebObjectBytes } from "../web/webObjectHttp";
import { createCleanupOne } from "../final/cleanupOne";
import { multipartConfig, copyMultipartSession, createMultipartS3Transport, createHostedMultipartS3Transport,
  type MultipartPublicationConfig, type MultipartKind, type MultipartSession, type BrowserPartGrant } from "./s3Transport";
import { isHostedPreviewConfig, type HostedPreviewConfig } from "../journey/hostedPreviewConfig";
export type { MultipartPublicationConfig } from "./s3Transport";

export type MultipartImageResult = Readonly<{ kind: "ready"; receipt: WebReceipt }> |
  Readonly<{ kind: "part"; upload: BrowserPartGrant; attemptId: string; slotId: string }> |
  Readonly<{ kind: "pending" | "needs_attention"; attemptId: string; slotId: string;
    reason?: "image_rejected" | "image_processor_unavailable" }>;
export type MultipartSettlementCommand = Readonly<{ expectedUserId: string; expectedIdentityId: string; attemptId: string; requestKey: string }>;
export type MultipartSettlementResult = Readonly<{ kind: "pending" | "needs_attention" | "settled"; attemptId: string; filesRemaining: number | null }>;
type Sanitizer = (input: Buffer) => Promise<SanitizedListingImage>;
type Rpc = (name: string, body: object, detached?: boolean) => Promise<unknown>;
let active = false; // Same bounded native/binary rule as the accepted WEB verifier.

/** Integrated SOURCE -> native sanitizer -> WEB path for newly created isolated
 * sessions. Browser receives exactly one UploadPart capability. Create/Complete
 * remain server-only, with acknowledged once-only database claims before I/O.
 * There is no compatibility fallback to the old signed full-object SOURCE URL.
 * The existing attempt, intent, web receipt, publication and cleanup contracts stay
 * in the same flow. Auxiliary part deletion remains separately unproved here. */
export function createMultipartPublicationImages(config: MultipartPublicationConfig,
    sanitizer: Sanitizer, fetcher: UploadFetch = fetch) {
  const { origin } = multipartConfig(config);
  return createMultipartImageFlow(config, sanitizer, fetcher, origin, origin, createMultipartS3Transport(config), false);
}

/** Managed preview uses the same verified SOURCE -> native WEB protocol. Its
 * cleanup entrypoint only reads retained state: no provider finality is invented. */
export function createHostedMultipartPublicationImages(config: HostedPreviewConfig,
    sanitizer: Sanitizer, fetcher: UploadFetch = fetch) {
  if (!isHostedPreviewConfig(config)) return webFail("configuration");
  return createMultipartImageFlow(config, sanitizer, fetcher, config.projectOrigin, config.storageOrigin,
    createHostedMultipartS3Transport(config), true);
}

function createMultipartImageFlow(config: Readonly<{ publicKey: string; serviceKey: string }>,
    sanitizer: Sanitizer, fetcher: UploadFetch, origin: string, objectOrigin: string,
    s3: ReturnType<typeof createMultipartS3Transport>, holdCleanup: boolean) {
  if (typeof sanitizer !== "function" || typeof fetcher !== "function") return webFail("configuration");
  const serviceHeaders = { apikey: config.serviceKey, authorization: `Bearer ${config.serviceKey}`, "content-type": "application/json" };

  async function run(accessToken: string, input: WebCommand, allowSourcePart: boolean,
      signal?: AbortSignal): Promise<MultipartImageResult> {
    const cmd = copyWebCommand(input);
    if (typeof accessToken !== "string" || !accessToken || accessToken.length > 8192 || /\s/.test(accessToken)) return webFail("unauthorized");
    if (signal?.aborted) return webFail("aborted");
    const pending = (): MultipartImageResult => Object.freeze({ kind: "pending", attemptId: cmd.attemptId, slotId: cmd.slotId });
    const attention = (problem?: string | null): MultipartImageResult => Object.freeze({ kind: "needs_attention", attemptId: cmd.attemptId, slotId: cmd.slotId,
      ...(problem === "image_rejected" || problem === "image_processor_unavailable" ? { reason: problem } : {}) });
    if (active) return pending();
    active = true;
    const args = { p_expected_user_id: cmd.expectedUserId, p_expected_identity_id: cmd.expectedIdentityId,
      p_attempt_id: cmd.attemptId, p_slot_id: cmd.slotId };
    const commandArgs = { ...args, p_request_key: cmd.requestKey };
    const rpc: Rpc = async (name, body, detached = false) => {
      const r = await privateUploadHttp(fetcher, `${origin}/rest/v1/rpc/${name}`,
        { method: "POST", headers: serviceHeaders, body: JSON.stringify(body) },
        { signal: detached ? undefined : signal, ...(detached ? { timeoutMs: 5000 } : {}) });
      if (r.status === 401 || r.status === 403) return webFail("unauthorized");
      if (r.status !== 200) return webFail("outcome_unknown");
      return r.json;
    };
    const parse = (value: unknown, kind: MultipartKind) => copyMultipartSession(value, cmd, kind);
    async function problem(session: MultipartSession, code: string): Promise<boolean> {
      // Cleanup lineage may be recorded after HTTP cancellation/logout. This does
      // not reacquire publication authority or issue any external capability.
      try {
        const saved = parse(await rpc("record_listing_multipart_problem_v2", { p_object_id: session.object_id, p_problem: code }, true), session.kind);
        return saved.problem === code;
      } catch { return false; /* The earlier creating/completing claim still durably blocks deletion. */ }
    }
    async function getSession(kind: MultipartKind): Promise<MultipartSession | null> {
      const r = await rpc("get_listing_multipart_v2", { ...commandArgs, p_kind: kind });
      return r === null ? null : parse(r, kind);
    }
    async function reserveSession(kind: MultipartKind): Promise<MultipartSession | null> {
      const claim = webRecord(await rpc("reserve_listing_multipart_v2", { ...commandArgs, p_kind: kind }),
        ["session", "create_allowed", "create_key"]);
      let session = parse(claim.session, kind);
      if (typeof claim.create_allowed !== "boolean" || (claim.create_allowed ? !isUploadUuid(claim.create_key) : claim.create_key !== null)) return webFail("invalid_response");
      if (!claim.create_allowed) return session;
      if (session.state !== "creating" || session.upload_id !== null) return webFail("invalid_response");
      try {
        const id = await s3.create(session, signal); // One external Create; SDK retries are disabled.
        session = parse(await rpc("record_listing_multipart_created_v2", {
          p_object_id: session.object_id, p_create_key: claim.create_key, p_upload_id: id }, true), kind);
        if (session.upload_id !== id || session.state !== "open") return webFail("invalid_response");
        return session;
      } catch {
        await problem(session, "create_outcome_unknown");
        return null;
      }
    }
    async function completeSession(session: MultipartSession, listedEtag?: string | null): Promise<MultipartSession | null> {
      if (session.completed) return session;
      if (session.state !== "open" || session.problem !== null) return null;
      const part = listedEtag === undefined ? await s3.listOnePart(session, signal) : listedEtag;
      if (part === null) return null;
      const claimed = webRecord(await rpc("claim_listing_multipart_complete_v2", {
        ...commandArgs, p_kind: session.kind, p_part_etag: part }), ["session", "complete_allowed"]);
      session = parse(claimed.session, session.kind);
      if (typeof claimed.complete_allowed !== "boolean") return webFail("invalid_response");
      if (!claimed.complete_allowed) return session.completed ? session : null;
      if (session.state !== "completing" || !session.complete_key || session.part_etag !== part) return webFail("invalid_response");
      try {
        const completedEtag = await s3.complete(session, signal);
        // This is the only callsite that can record Complete success. It has the
        // fully parsed genuine successful provider response for this one dispatch.
        return parse(await rpc("record_listing_multipart_completed_v2", { p_object_id: session.object_id,
          p_complete_key: session.complete_key, p_complete_etag: completedEtag }, true), session.kind);
      } catch {
        await problem(session, "complete_outcome_unknown");
        return null;
      }
    }
    async function verifyBytes(session: MultipartSession): Promise<{ session: MultipartSession; bytes: Buffer } | null> {
      if (!session.completed || session.problem !== null) return null;
      const bytes = await readWebObjectBytes(fetcher,
        `${objectOrigin}/storage/v1/object/authenticated/${session.bucket_id}/${session.object_path}`,
        serviceHeaders, session.expected_bytes, session.kind === "web" ? "image/webp" : null, signal);
      if (bytes === null) return null; // Absence never settles any outstanding writer.
      const observed = webHash(bytes);
      if (bytes.length !== session.expected_bytes || observed !== session.expected_sha256) {
        await problem(session, session.kind === "source" ? "source_mismatch" : "web_mismatch");
        return null;
      }
      session = parse(await rpc("record_listing_multipart_verified_v2", { ...commandArgs, p_kind: session.kind,
        p_observed_sha256: observed, p_observed_bytes: bytes.length }), session.kind);
      if (!session.completed || !session.verified) return webFail("invalid_response");
      return { session, bytes };
    }
    async function finishWeb(binding: WebBinding, intent: WebIntent, web: MultipartSession): Promise<MultipartImageResult> {
      if (web.problem !== null || web.state === "needs_attention") return attention(web.problem);
      const done = await completeSession(web);
      if (!done) return pending();
      if (done.expected_sha256 !== intent.web_sha256 || done.expected_bytes !== intent.web_bytes ||
          done.object_id !== binding.web_object_id) return webFail("invalid_response");
      const observed = await verifyBytes(done);
      if (!observed) return pending();
      const ready = webRecord(await rpc("record_listing_web_ready_v1", { ...args, p_job_id: binding.job_id,
        p_observed_sha256: webHash(observed.bytes), p_observed_bytes: observed.bytes.length }), ["receipt"]);
      return Object.freeze({ kind: "ready", receipt: copyWebReceipt(ready.receipt, binding, intent) });
    }
    try {
      const auth = await privateUploadHttp(fetcher, `${origin}/auth/v1/user`, { method: "GET",
        headers: { apikey: config.publicKey, authorization: `Bearer ${accessToken}` } }, { signal, responseBytes: 65536 });
      if (auth.status !== 200) return webFail("unauthorized");
      if (webRecord(auth.json).id !== cmd.expectedUserId) return webFail("context_changed");
      let source = allowSourcePart ? await reserveSession("source") : await getSession("source");
      if (!source) return allowSourcePart ? attention() : pending();
      if (source.problem !== null || source.state === "needs_attention") return attention(source.problem);
      if (source.state === "creating" || source.state === "completing") return pending();
      if (source.state === "open") {
        const part = await s3.listOnePart(source, signal);
        if (part === null) {
          if (!allowSourcePart) return pending();
          const claimed = webRecord(await rpc("claim_listing_multipart_part_v2", { ...commandArgs, p_kind: "source" }),
            ["session", "part_allowed"]);
          source = parse(claimed.session, "source");
          if (claimed.part_allowed !== true) return pending();
          try {
            const upload = await s3.presignSourcePart(source, accessToken);
            return Object.freeze({ kind: "part", upload, attemptId: cmd.attemptId, slotId: cmd.slotId });
          } catch (error) {
            if (error instanceof WebImageError && error.code === "write_window_expired") {
              await problem(source, "part_window_expired"); return attention();
            }
            throw error;
          }
        }
        const completed = await completeSession(source, part);
        if (!completed) return pending();
        source = completed;
      }
      const verifiedSource = await verifyBytes(source);
      if (!verifiedSource) return pending();
      const claim = webRecord(await rpc("claim_listing_web_image_v1", commandArgs),
        ["binding", "state", "process_allowed", "claim_id", "process_before_epoch", "intent", "receipt"]);
      const binding = copyWebBinding(claim.binding, cmd);
      if (binding.source_object_id !== source.object_id || binding.source_sha256 !== source.expected_sha256 ||
          binding.source_bytes !== source.expected_bytes || typeof claim.process_allowed !== "boolean" ||
          (claim.process_allowed ? !isUploadUuid(claim.claim_id) : claim.claim_id !== null)) return webFail("invalid_response");
      if (claim.state === "ready") {
        if (claim.process_allowed) return webFail("invalid_response");
        const intent = copyWebIntent(claim.intent, binding);
        return Object.freeze({ kind: "ready", receipt: copyWebReceipt(claim.receipt, binding, intent) });
      }
      if (claim.receipt !== null) return webFail("invalid_response");
      if (claim.state === "prepared") {
        // No second sanitizer or second part writer after an unknown WEB dispatch.
        const intent = copyWebIntent(claim.intent, binding), web = await getSession("web");
        return web ? await finishWeb(binding, intent, web) : pending();
      }
      if (claim.state !== "processing" || claim.intent !== null) return webFail("invalid_response");
      if (!claim.process_allowed) return pending();
      if (!Number.isSafeInteger(claim.process_before_epoch) || Number(claim.process_before_epoch) <= Math.floor(Date.now() / 1000)) return pending();
      let result: SanitizedListingImage;
      try { result = await sanitizer(verifiedSource.bytes); }
      catch (error) {
        // The native CJS supervisor and Next's compiled module may have different
        // class identities. Read only the trusted boundary's own data properties.
        const own = error && typeof error === "object" ? Object.getOwnPropertyDescriptors(error) : {};
        const code = own.name?.value === "PublicationImageError" && typeof own.code?.value === "string" ? own.code.value : null;
        const rejected = code !== null && ["image_input_required", "image_source_too_large", "image_type_unsupported", "image_structure_invalid",
          "image_animation_unsupported", "image_pixels_exceeded", "image_decode_failed", "image_output_invalid", "image_output_too_large"].includes(code);
        const reason = rejected ? "image_rejected" : "image_processor_unavailable";
        // No processing-claim takeover. The durable reason tells the owner to
        // cancel this attempt and choose again, instead of retrying forever.
        const saved = await problem(source, reason);
        return attention(saved ? reason : undefined);
      }
      // Native supervisor is awaited; no Promise.race releases its binary lock early.
      const owned = detachSanitizedImage(result, binding), intent = owned.intent;
      if (signal?.aborted) return pending();
      const prepared = webRecord(await rpc("prepare_listing_web_write_v1", { ...args, p_job_id: binding.job_id,
        p_claim_id: claim.claim_id, p_intent: intent }), ["binding", "intent", "write_allowed", "write_before_epoch"]);
      if (!sameRecord(copyWebBinding(prepared.binding, cmd), binding) || !sameRecord(copyWebIntent(prepared.intent, binding), intent) ||
          typeof prepared.write_allowed !== "boolean" || !Number.isSafeInteger(prepared.write_before_epoch)) return webFail("invalid_response");
      if (!prepared.write_allowed || Number(prepared.write_before_epoch) <= Math.floor(Date.now() / 1000)) return pending();
      let web = await reserveSession("web");
      if (!web) return attention();
      if (web.problem !== null || web.state === "needs_attention") return attention(web.problem);
      if (web.state !== "open") return await finishWeb(binding, intent, web);
      const partClaim = webRecord(await rpc("claim_listing_multipart_part_v2", { ...commandArgs, p_kind: "web" }), ["session", "part_allowed"]);
      web = parse(partClaim.session, "web");
      if (typeof partClaim.part_allowed !== "boolean") return webFail("invalid_response");
      if (partClaim.part_allowed) {
        const sent = Buffer.from(owned.bytes);
        if (sent.length !== web.expected_bytes || webHash(sent) !== web.expected_sha256) return webFail("invalid_response");
        try { await s3.putWebPart(web, sent, signal); }
        catch { await problem(web, "part_outcome_unknown"); return attention(); }
      }
      return await finishWeb(binding, intent, web);
    } catch (error) {
      if (error instanceof PrivateUploadError) return pending();
      if (error instanceof WebImageError) {
        if (["unauthorized", "context_changed", "configuration", "invalid_input", "image_rejected"].includes(error.code)) throw error;
        return pending();
      }
      // Provider/network exceptions can contain URLs/credentials. Never echo them.
      return pending();
    } finally { active = false; }
  }
  async function readHeldSettlement(accessToken: string, input: MultipartSettlementCommand,
      signal?: AbortSignal): Promise<MultipartSettlementResult> {
    const r = webRecord(input, ["expectedUserId", "expectedIdentityId", "attemptId", "requestKey"]);
    if (!Object.values(r).every(isUploadUuid)) return webFail("invalid_input");
    const cmd = Object.freeze({ ...r }) as MultipartSettlementCommand;
    if (typeof accessToken !== "string" || !accessToken || accessToken.length > 8192 || /\s/.test(accessToken)) return webFail("unauthorized");
    const headers = { apikey: config.publicKey, authorization: `Bearer ${accessToken}` };
    const auth = await privateUploadHttp(fetcher, `${origin}/auth/v1/user`,
      { method: "GET", headers }, { signal, responseBytes: 65536 });
    if (auth.status !== 200) return webFail("unauthorized");
    if (webRecord(auth.json).id !== cmd.expectedUserId) return webFail("context_changed");
    const response = await privateUploadHttp(fetcher, `${origin}/rest/v1/rpc/get_my_listing_cleanup_summary_v1`, {
      method: "POST", headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ p_expected_user_id: cmd.expectedUserId, p_expected_identity_id: cmd.expectedIdentityId }),
    }, { signal, responseBytes: 2048 });
    if (response.status === 401 || response.status === 403) return webFail("unauthorized");
    if (response.status !== 200) return webFail("outcome_unknown");
    const summary = webRecord(response.json,
      ["schema_version", "pending", "blocked", "needs_attention", "oldest_pending_seconds", "reserved_bytes"]);
    if (summary.schema_version !== 1 || [summary.pending, summary.blocked, summary.needs_attention,
      summary.oldest_pending_seconds, summary.reserved_bytes].some(value => !Number.isSafeInteger(value) || Number(value) < 0))
      return webFail("invalid_response");
    // This account-scoped summary is not an attempt-scoped terminal receipt.
    // Even zero counts cannot authorize file deletion, quota release or "settled".
    return Object.freeze({ kind: "pending", attemptId: cmd.attemptId, filesRemaining: null });
  }
  async function settle(accessToken: string, input: MultipartSettlementCommand, signal?: AbortSignal): Promise<MultipartSettlementResult> {
    const r = webRecord(input, ["expectedUserId", "expectedIdentityId", "attemptId", "requestKey"]);
    if (!Object.values(r).every(isUploadUuid)) return webFail("invalid_input");
    const cmd = Object.freeze({ ...r }) as MultipartSettlementCommand;
    if (typeof accessToken !== "string" || !accessToken || accessToken.length > 8192 || /\s/.test(accessToken)) return webFail("unauthorized");
    const result = (kind: MultipartSettlementResult["kind"], filesRemaining: number | null): MultipartSettlementResult =>
      Object.freeze({ kind, attemptId: cmd.attemptId, filesRemaining });
    if (active || signal?.aborted) return result("pending", null);
    active = true;
    const args = { p_expected_user_id: cmd.expectedUserId, p_expected_identity_id: cmd.expectedIdentityId,
      p_attempt_id: cmd.attemptId, p_request_key: cmd.requestKey };
    const rpc = async (name: string, body: object, detached = false): Promise<unknown> => {
      const response = await privateUploadHttp(fetcher, `${origin}/rest/v1/rpc/${name}`,
        { method: "POST", headers: serviceHeaders, body: JSON.stringify(body) },
        { signal: detached ? undefined : signal, responseBytes: 65536 });
      if (response.status === 401 || response.status === 403) return webFail("unauthorized");
      if (response.status !== 200) return webFail("outcome_unknown");
      return response.json;
    };
    type Item = { session: MultipartSession | null; abortKey: string | null; abortAllowed: boolean };
    const snapshot = (value: unknown): { items: Item[]; remaining: number; unresolved: number;
        attention: number; blocked: number; auxiliaryPending: number } => {
      const s = webRecord(value, ["schema_version", "attempt_id", "request_key", "files_remaining", "unresolved",
        "needs_attention", "blocked", "auxiliary_pending", "items"]);
      if (s.schema_version !== 3 || s.attempt_id !== cmd.attemptId || s.request_key !== cmd.requestKey ||
          !Number.isSafeInteger(s.files_remaining) || Number(s.files_remaining) < 0 || Number(s.files_remaining) > 20 ||
          [s.unresolved, s.needs_attention, s.blocked, s.auxiliary_pending].some(v =>
            !Number.isSafeInteger(v) || Number(v) < 0 || Number(v) > Number(s.files_remaining)) ||
          !Array.isArray(s.items) || s.items.length > 20 || Number(s.files_remaining) > s.items.length) return webFail("invalid_response");
      const seen = new Set<string>();
      const items = s.items.map(value => {
        const item = webRecord(value, ["object_id", "session", "abort_key", "abort_allowed", "abort_observed", "auxiliary_observed"]);
        if (!isUploadUuid(item.object_id) || seen.has(item.object_id) ||
            (item.abort_key !== null && !isUploadUuid(item.abort_key)) ||
            [item.abort_allowed, item.abort_observed, item.auxiliary_observed].some(v => typeof v !== "boolean")) return webFail("invalid_response");
        seen.add(item.object_id);
        let session: MultipartSession | null = null;
        if (item.session !== null) {
          const raw = webRecord(item.session);
          if (!isUploadUuid(raw.slot_id) || !isUploadUuid(raw.request_key) || !["source", "web"].includes(String(raw.kind))) return webFail("invalid_response");
          session = copyMultipartSession(raw, { expectedUserId: cmd.expectedUserId, expectedIdentityId: cmd.expectedIdentityId,
            attemptId: cmd.attemptId, slotId: raw.slot_id, requestKey: raw.request_key }, raw.kind as MultipartKind);
          if (session.object_id !== item.object_id) return webFail("invalid_response");
        }
        if (item.abort_allowed && (!session?.upload_id || !item.abort_key || item.abort_observed)) return webFail("invalid_response");
        return { session, abortKey: item.abort_key as string | null, abortAllowed: item.abort_allowed as boolean };
      });
      return { items, remaining: Number(s.files_remaining), unresolved: Number(s.unresolved),
        attention: Number(s.needs_attention), blocked: Number(s.blocked), auxiliaryPending: Number(s.auxiliary_pending) };
    };
    try {
      const auth = await privateUploadHttp(fetcher, `${origin}/auth/v1/user`, { method: "GET",
        headers: { apikey: config.publicKey, authorization: `Bearer ${accessToken}` } }, { signal, responseBytes: 65536 });
      if (auth.status !== 200) return webFail("unauthorized");
      if (webRecord(auth.json).id !== cmd.expectedUserId) return webFail("context_changed");
      const before = snapshot(await rpc("prepare_listing_multipart_cleanup_v2", args));
      let unknown = false;
      for (const item of before.items) {
        if (!item.abortAllowed || !item.session || !item.abortKey) continue;
        if (signal?.aborted) { unknown = true; break; }
        try {
          const outcome = await s3.abort(item.session, signal);
          const saved = webRecord(await rpc("record_listing_multipart_abort_v2", { p_object_id: item.session.object_id,
            p_abort_key: item.abortKey, p_outcome: outcome }, true), ["object_id", "abort_key", "outcome", "observed"]);
          if (saved.object_id !== item.session.object_id || saved.abort_key !== item.abortKey || saved.observed !== true ||
              !["aborted", "absent"].includes(String(saved.outcome))) return webFail("invalid_response");
        } catch { unknown = true; }
      }
      // Reuse the accepted cleaner unchanged. Only its claim is narrowed to this
      // authenticated terminal attempt. No generic/global worker is activated.
      const scopedFetch: UploadFetch = (url, init) => {
        const target = new URL(url);
        if (target.origin !== origin) return webFail("configuration");
        if (target.pathname === "/rest/v1/rpc/claim_listing_cleanup_v1") {
          if (init.method !== "POST") return webFail("invalid_response");
          return fetcher(`${origin}/rest/v1/rpc/claim_listing_cleanup_for_attempt_v2`, { ...init, body: JSON.stringify(args) });
        }
        if (init.method === "DELETE") {
          const body = webRecord(JSON.parse(String(init.body)), ["prefixes"]);
          if (target.pathname !== `/storage/v1/object/${WEB_IMAGE.bucket}` || !Array.isArray(body.prefixes) ||
              body.prefixes.length !== 1 || typeof body.prefixes[0] !== "string" ||
              !body.prefixes[0].startsWith(`v1/${cmd.attemptId}/`)) return webFail("invalid_response");
        }
        return fetcher(url, init);
      };
      const cleanup = createCleanupOne({ projectOrigin: origin, serviceKey: config.serviceKey }, scopedFetch);
      for (let i = 0; i < before.items.length; i += 1) {
        const cleaned = await cleanup(signal);
        if (cleaned.kind === "idle") break;
        if (cleaned.kind !== "deleted") { unknown = true; break; }
      }
      const after = snapshot(await rpc("prepare_listing_multipart_cleanup_v2", args));
      // An idle claim cannot erase an earlier durable failure. Auxiliary absence
      // still needs its genuine finality receipt; waiting for it alone is pending.
      return result(after.remaining === 0 ? "settled"
        : (unknown || after.unresolved > 0 || after.attention > 0 || after.blocked > 0) ? "needs_attention" : "pending", after.remaining);
    } catch (error) {
      if (error instanceof WebImageError && ["unauthorized", "context_changed", "configuration", "invalid_input"].includes(error.code)) throw error;
      return result("needs_attention", null);
    } finally { active = false; }
  }
  return Object.freeze({
    prepare: (token: string, command: WebCommand, signal?: AbortSignal) => run(token, command, true, signal),
    verify: (token: string, command: WebCommand, signal?: AbortSignal) => run(token, command, false, signal),
    settle: holdCleanup ? readHeldSettlement : settle,
  });
}
