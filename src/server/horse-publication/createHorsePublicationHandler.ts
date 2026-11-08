import "server-only";
import { privateUploadHttp, type UploadFetch } from "../../entities/listing/api/privateUploadHttp";
import { isUploadUuid, uploadRecord } from "../../entities/listing/model/privatePublicationUpload";
import { isPublicationCapacityError } from "../../entities/listing/model/publicationCapacity";
import { assertPublicationActor, isHostedPublicationRuntime, type PublicationRuntimeConfig } from "../listing-publication/journey/integrationRuntime";
import type { MultipartPublicationImages } from "../listing-publication/journey/journeyTypes";
import { createPublicationTiming, timePublicationStage } from "../listing-publication/journey/publicationTiming";
import type { AfterPublicationResponse } from "../listing-publication/journey/completePublishedSource";
import { copyWebCommand } from "../listing-publication/web/webImageContract";
import { createHorseCleanupPass } from "./settleHorseCleanup";
import { createAccountSourceCompletion } from "../listing-publication/journey/completeAccountSource";
import { horseActivityStatus, parseHorseActivitySnapshot } from "../../entities/horse-offer/model/horseActivity";
import { listingDeadlineMicros } from "../../entities/listing/model/listingActivity";

const actions = new Set(["prepare", "status", "publish", "cancel", "owner-read", "image-prepare", "image-verify",
  "owner-activity", "owner-set-status", "owner-renew"]);
const receiptKeys = ["schema_version", "content_type", "state", "actor_user_id", "identity_id", "request_key",
  "attempt_id", "horse_offer_id", "edit_revision", "publication_event_id", "slots"];
const uuid = (v: unknown): v is string => typeof v === "string" && v.length === 36 && isUploadUuid(v);
const revision = (v: unknown) => typeof v === "string" && /^[1-9][0-9]{0,18}$/.test(v)
  && BigInt(v) <= BigInt("9223372036854775807");
const response = (value: unknown, status = 200) => Response.json(value, { status,
  headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });

async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json" || !request.body)
    throw new Error("input");
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > 131072)) throw new Error("input");
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      if (size > 131072) throw new Error("input");
      chunks.push(item.value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return uploadRecord(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
  } catch { throw new Error("input"); }
  finally { void reader.cancel().catch(() => {}); }
}

function bind(action: string, input: Record<string, unknown>): { name: string; args: Record<string, unknown> } {
  const actor = { p_expected_user_id: input.expectedUserId, p_expected_identity_id: input.expectedIdentityId };
  if (!uuid(input.expectedUserId) || !uuid(input.expectedIdentityId)) throw new Error("input");
  if (action === "owner-read" || action === "owner-activity") {
    uploadRecord(input, ["expectedUserId", "expectedIdentityId", "offerId"]);
    if (!uuid(input.offerId)) throw new Error("input");
    return { name: action === "owner-read" ? "get_my_horse_offer_publication_snapshot_v1" : "get_my_horse_offer_lifecycle_v1",
      args: { ...actor, p_offer_id: input.offerId } };
  }
  if (action === "owner-set-status" || action === "owner-renew") {
    uploadRecord(input, ["expectedUserId", "expectedIdentityId", "offerId", "expectedRevision", "expectedStatus",
      "expectedActiveUntil", ...(action === "owner-set-status" ? ["status"] : [])]);
    if (!uuid(input.offerId) || !revision(input.expectedRevision)
      || typeof input.expectedStatus !== "string" || !["published", "paused", "closed"].includes(input.expectedStatus)
      || typeof input.expectedActiveUntil !== "string" || listingDeadlineMicros(input.expectedActiveUntil) === null
      || (action === "owner-set-status" && (typeof input.status !== "string"
        || !["active", "paused", "sold"].includes(input.status)))) throw new Error("input");
    return { name: action === "owner-set-status" ? "set_my_horse_offer_status_v1" : "renew_my_horse_offer_activity_v1",
      args: { ...actor, p_offer_id: input.offerId, p_expected_revision: input.expectedRevision,
        p_expected_status: input.expectedStatus, p_expected_active_until: input.expectedActiveUntil,
        ...(action === "owner-set-status" ? { p_status: input.status } : {}) } };
  }
  if (!uuid(input.requestKey)) throw new Error("input");
  if (action === "prepare") {
    uploadRecord(input, ["expectedUserId", "expectedIdentityId", "requestKey", "offerId", "expectedRevision",
      "content", "gallery", "confirmations", "policySnapshot"]);
    if (!(input.offerId === null && input.expectedRevision === null)
      && !(uuid(input.offerId) && revision(input.expectedRevision))) throw new Error("input");
    uploadRecord(input.content);
    const confirmations = uploadRecord(input.confirmations);
    // A saved confirmation is a reference, never a newly supplied true flag.
    // The database resolves and re-checks immutable evidence for the same actor.
    if (Object.hasOwn(confirmations, "reusePublicationEventId")) {
      uploadRecord(confirmations, ["reusePublicationEventId"]);
      if (!uuid(input.offerId) || !uuid(confirmations.reusePublicationEventId)) throw new Error("input");
    }
    if (!Array.isArray(input.gallery) || input.gallery.length > 10
      || !Array.isArray(input.policySnapshot) || input.policySnapshot.length !== 2) throw new Error("input");
    return { name: "prepare_my_horse_publication_v1", args: { ...actor, p_request_key: input.requestKey,
      p_offer_id: input.offerId, p_expected_revision: input.expectedRevision, p_content: input.content,
      p_gallery: input.gallery, p_confirmations: input.confirmations, p_policy_snapshot: input.policySnapshot } };
  }
  uploadRecord(input, ["expectedUserId", "expectedIdentityId", "attemptId", "requestKey"]);
  if (!uuid(input.attemptId) && !(input.attemptId === null && (action === "status" || action === "cancel")))
    throw new Error("input");
  const names = { status: "get_my_horse_publication_attempt_v1", publish: "publish_my_horse_offer_v1",
    cancel: "cancel_my_horse_publication_v1" } as const;
  if (!Object.hasOwn(names, action)) throw new Error("input");
  return { name: names[action as keyof typeof names], args: { ...actor,
    p_attempt_id: input.attemptId, p_request_key: input.requestKey } };
}

/** Verify the database ACK belongs to this exact command before returning success
 * or scheduling cleanup. A 200 alone is not a publication receipt. */
export function boundHorseReceipt(value: unknown, input: Record<string, unknown>, action: string) {
  const result = uploadRecord(value, receiptKeys);
  if (result.schema_version !== 1 || result.content_type !== "horse_offer"
    || result.actor_user_id !== input.expectedUserId || result.identity_id !== input.expectedIdentityId
    || result.request_key !== input.requestKey || !Array.isArray(result.slots) || result.slots.length > 10
    || !["prepared", "published", "cancelled", "not_found"].includes(String(result.state))) throw new Error("invalid_response");
  if ((action === "publish" && result.state !== "published")
    || (action === "prepare" && !["prepared", "published"].includes(String(result.state)))
    || (action === "cancel" && !["cancelled", "published"].includes(String(result.state)))) throw new Error("invalid_response");
  if (result.attempt_id === null) {
    if (!(["status", "cancel"].includes(action) && input.attemptId === null)
      || !["not_found", "cancelled"].includes(String(result.state)) || result.horse_offer_id !== null
      || result.edit_revision !== null || result.publication_event_id !== null || result.slots.length)
      throw new Error("invalid_response");
    return result;
  }
  if (!uuid(result.attempt_id) || !uuid(result.horse_offer_id) || !revision(result.edit_revision)
    || result.state === "not_found" || (uuid(input.attemptId) && result.attempt_id !== input.attemptId)
    || (uuid(input.offerId) && result.horse_offer_id !== input.offerId)
    || (result.state === "published" ? !uuid(result.publication_event_id) : result.publication_event_id !== null))
    throw new Error("invalid_response");
  const ids = new Set(), clientIds = new Set(), ordinals = new Set();
  for (const value of result.slots) {
    const slot = uploadRecord(value, ["slot_id", "client_file_id", "ordinal", "expected_bytes", "expected_sha256"]);
    if (!uuid(slot.slot_id) || !uuid(slot.client_file_id) || !Number.isInteger(slot.ordinal)
      || Number(slot.ordinal) < 0 || Number(slot.ordinal) > 9 || ids.has(slot.slot_id)
      || clientIds.has(slot.client_file_id) || ordinals.has(slot.ordinal)
      || !Number.isSafeInteger(slot.expected_bytes) || Number(slot.expected_bytes) < 1
      || Number(slot.expected_bytes) > 26214400 || typeof slot.expected_sha256 !== "string"
      || !/^[0-9a-f]{64}$/.test(slot.expected_sha256)) throw new Error("invalid_response");
    ids.add(slot.slot_id); clientIds.add(slot.client_file_id); ordinals.add(slot.ordinal);
    if (action === "prepare") {
      const planned = Array.isArray(input.gallery) ? input.gallery[Number(slot.ordinal)] : undefined;
      const file = uploadRecord(planned);
      if (file.clientFileId !== slot.client_file_id || file.byteLength !== slot.expected_bytes
        || file.sha256 !== slot.expected_sha256) throw new Error("invalid_response");
    }
  }
  if (action === "prepare" && Array.isArray(input.gallery)
    && input.gallery.filter(v => v && typeof v === "object" && Object.hasOwn(v, "clientFileId")).length !== result.slots.length)
    throw new Error("invalid_response");
  return result;
}

/** A lifecycle ACK must bind the exact actor, UUID, previous revision and
 * requested outcome. An HTTP 200 cannot by itself confirm a status/renewal. */
export function boundHorseLifecycleReceipt(value: unknown, input: Record<string, unknown>, action: string) {
  const parsed = parseHorseActivitySnapshot(value, { userId: String(input.expectedUserId),
    identityId: String(input.expectedIdentityId) }, String(input.offerId));
  if (action === "owner-activity") {
    if (parsed.changed) throw new Error("invalid_response");
    return value;
  }
  const oldRevision = BigInt(String(input.expectedRevision)), nextRevision = BigInt(parsed.editRevision);
  const oldDeadline = listingDeadlineMicros(input.expectedActiveUntil), nextDeadline = listingDeadlineMicros(parsed.activeUntil);
  if (nextRevision !== oldRevision + (parsed.changed ? BigInt(1) : BigInt(0))
    || oldDeadline === null || nextDeadline === null) throw new Error("invalid_response");
  if (action === "owner-set-status") {
    if (parsed.status !== input.status || oldDeadline !== nextDeadline
      || parsed.changed !== (horseActivityStatus(String(input.expectedStatus)) !== input.status)) throw new Error("invalid_response");
  } else if (action === "owner-renew") {
    if (input.expectedStatus !== "published" || parsed.sourceStatus !== "published"
      || (parsed.changed ? nextDeadline <= oldDeadline : nextDeadline !== oldDeadline)) throw new Error("invalid_response");
  } else throw new Error("invalid_response");
  return value;
}

function safeDatabaseError(value: unknown): { error: string; code?: string; message?: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  if (isPublicationCapacityError(r)) return { error: "capacity", code: r.code, message: r.message };
  if (r.code === "40001") return { error: "conflict", code: "40001", message: "horse_offer_edit_conflict" };
  if (r.code === "42501" && r.message === "publication_policy_changed")
    return { error: "policy_changed", code: "42501", message: "publication_policy_changed" };
  if (r.code === "42501") return { error: "context_changed", code: "42501" };
  if (["22023", "22P02", "22P05"].includes(String(r.code))) return { error: "refused", code: "22023" };
  if (r.code === "55000") return { error: "refused", code: "55000" };
  if (["PGRST202", "42883"].includes(String(r.code))) return { error: "unavailable" };
  return null;
}

/** Horse publication owns content authority. The binary pipeline is shared only
 * after an authenticated horse attempt/slot binding has been independently read. */
export function createHorsePublicationRequestHandler(config: PublicationRuntimeConfig,
    images: Pick<MultipartPublicationImages, "prepare" | "verify">, fetcher: UploadFetch = fetch,
    afterResponse?: AfterPublicationResponse) {
  const cleanup = createHorseCleanupPass(config, fetcher);
  const completeSources = isHostedPublicationRuntime(config) ? createAccountSourceCompletion(config, fetcher) : null;
  return async (request: Request, action: string): Promise<Response> => {
    if (!actions.has(action)) return response({ error: "not_found" }, 404);
    if (request.method !== "POST") return response({ error: "method" }, 405);
    if (request.headers.get("origin") !== config.appOrigin
      || request.headers.get("host") !== new URL(config.appOrigin).host) return response({ error: "origin" }, 403);
    const authorization = request.headers.get("authorization") ?? "";
    if (!/^Bearer [A-Za-z0-9._-]{1,8192}$/.test(authorization)) return response({ error: "unauthorized" }, 401);
    const token = authorization.slice(7), timing = createPublicationTiming();
    const reply = (value: unknown, status = 200) => {
      const result = response(value, status);
      try { result.headers.set("Server-Timing", timing.header()); } catch { /* Timing is optional. */ }
      return result;
    };
    try {
      const input = await readBody(request);
      // Bind/validate before any remote operation. The database checks the full
      // content, policies, current identity and revision in the same transaction.
      const image = action === "image-prepare" || action === "image-verify" ? copyWebCommand(input) : null;
      const bound = image ? null : bind(action, input);
      await timePublicationStage(timing.record, "gate", () =>
        assertPublicationActor(config, token, input.expectedUserId, request.signal, fetcher));
      const rpc = async (name: string, args: object) => privateUploadHttp(fetcher,
        config.projectOrigin + "/rest/v1/rpc/" + name, {
          method: "POST", headers: { apikey: config.publicKey, authorization, "content-type": "application/json" },
          body: JSON.stringify(args),
        }, { signal: request.signal, responseBytes: 65536,
          readErrorStatuses: [400, 401, 403, 404, 409, 422, 500, 503] });
      if (image) {
        const auth = await rpc("get_my_horse_publication_image_binding_v1", {
          p_expected_user_id: image.expectedUserId, p_expected_identity_id: image.expectedIdentityId,
          p_attempt_id: image.attemptId, p_slot_id: image.slotId, p_client_file_id: image.requestKey,
        });
        if (auth.status !== 200) return reply(safeDatabaseError(auth.json) ?? { error: "outcome_unknown" }, 409);
        const b = uploadRecord(auth.json, ["schema_version", "content_type", "actor_user_id", "identity_id",
          "attempt_id", "slot_id", "client_file_id", "expected_bytes", "expected_sha256"]);
        if (b.schema_version !== 1 || b.content_type !== "horse_offer" || b.actor_user_id !== image.expectedUserId
          || b.identity_id !== image.expectedIdentityId || b.attempt_id !== image.attemptId
          || b.slot_id !== image.slotId || b.client_file_id !== image.requestKey
          || !Number.isSafeInteger(b.expected_bytes) || Number(b.expected_bytes) < 1 || Number(b.expected_bytes) > 26214400
          || typeof b.expected_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(b.expected_sha256)) throw new Error("invalid_response");
        return reply(await images[action === "image-prepare" ? "prepare" : "verify"](token, image, request.signal, timing.record));
      }
      if (!bound) throw new Error("input");
      const callBound = () => timePublicationStage(timing.record, "owner_rpc", () => rpc(bound.name, bound.args));
      let call = await callBound();
      if (action === "prepare" && call.status !== 200 && completeSources && isPublicationCapacityError(call.json)
        && call.json.message === "publication_retained_bytes_limit") {
        // This known allocator exception rolls back before creating the attempt.
        // A confirmed SOURCE completion permits one retry of these same arguments.
        if (await completeSources(token, { expectedUserId: String(input.expectedUserId),
          expectedIdentityId: String(input.expectedIdentityId) }, request.signal) > 0) call = await callBound();
      }
      if (call.status !== 200) {
        const error = safeDatabaseError(call.json);
        return reply(error ?? { error: "outcome_unknown" }, error ? error.error === "context_changed" ? 403 : 409 : 503);
      }
      if (action === "owner-read") {
        const owner = uploadRecord(call.json);
        if (owner.content_type !== "horse_offer" || owner.offer_id !== input.offerId
          || owner.content_id !== input.offerId || owner.identity_id !== input.expectedIdentityId
          || !revision(owner.edit_revision)) throw new Error("invalid_response");
        return reply(owner);
      }
      if (["owner-activity", "owner-set-status", "owner-renew"].includes(action)) {
        return reply(boundHorseLifecycleReceipt(call.json, input, action));
      }
      const saved = boundHorseReceipt(call.json, input, action);
      if (afterResponse && saved.state === "published" && uuid(saved.attempt_id)
        && ["publish", "status"].includes(action)) {
        const scope = { expectedUserId: String(saved.actor_user_id), expectedIdentityId: String(saved.identity_id),
          attemptId: saved.attempt_id, requestKey: String(saved.request_key) };
        try { afterResponse(async () => {
          await cleanup(token, scope);
          if (completeSources) await completeSources(token, {
            expectedUserId: scope.expectedUserId, expectedIdentityId: scope.expectedIdentityId,
          });
        }); } catch { /* The committed receipt and cleanup ledger remain valid. */ }
      }
      return reply(saved);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code)
        : error instanceof Error ? error.message : "outcome_unknown";
      if (["integration_unverified", "unavailable"].includes(code)) return reply({ error: code }, 503);
      if (["unauthorized", "context_changed"].includes(code)) return reply({ error: code }, 403);
      if (["input", "invalid_input"].includes(code)) return reply({ error: "refused" }, 409);
      return reply({ error: "outcome_unknown" }, 503);
    }
  };
}
