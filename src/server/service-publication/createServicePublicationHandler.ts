import "server-only";
import { privateUploadHttp, type UploadFetch } from "../../entities/listing/api/privateUploadHttp";
import { serviceOwnerPageHttp } from "../../entities/service/api/serviceOwnerPageHttp";
import { isUploadUuid, uploadRecord } from "../../entities/listing/model/privatePublicationUpload";
import { isPublicationCapacityError } from "../../entities/listing/model/publicationCapacity";
import { assertPublicationActor, isHostedPublicationRuntime, type PublicationRuntimeConfig } from "../listing-publication/journey/integrationRuntime";
import type { MultipartPublicationImages } from "../listing-publication/journey/journeyTypes";
import { createPublicationTiming, timePublicationStage } from "../listing-publication/journey/publicationTiming";
import type { AfterPublicationResponse } from "../listing-publication/journey/completePublishedSource";
import { copyWebCommand } from "../listing-publication/web/webImageContract";
import { createServiceCleanupPass } from "./settleServiceCleanup";
import { createAccountSourceCompletion } from "../listing-publication/journey/completeAccountSource";
import { bindServicePrepare, bindServiceOwnerSnapshot, bindServiceOwnerPage, bindServiceActivityReceipt } from "../../entities/service/model/servicePublication";
import { bindServiceValidityCommand, bindServiceValidityResponse, serviceValidityActions } from "./serviceActivityBindings";

const actions = new Set(["prepare", "status", "publish", "cancel", "owner-read", "image-prepare", "image-verify",
  "owner-list", "owner-set-status", ...serviceValidityActions]);
const receiptKeys = ["schema_version", "content_type", "state", "actor_user_id", "identity_id", "request_key",
  "attempt_id", "service_id", "edit_revision", "publication_event_id", "slots"];
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
  const validity = bindServiceValidityCommand(action, input);
  if (validity) return validity;
  if (action === "owner-read") {
    uploadRecord(input, ["expectedUserId", "expectedIdentityId", "serviceId"]);
    if (!uuid(input.serviceId)) throw new Error("input");
    return { name: "get_my_service_publication_snapshot_v1", args: { ...actor, p_service_id: input.serviceId } };
  }
  if (action === "owner-list") {
    uploadRecord(input, ["expectedUserId", "expectedIdentityId", "resultLimit", "resultOffset"]);
    if (!Number.isSafeInteger(input.resultLimit) || Number(input.resultLimit) < 1 || Number(input.resultLimit) > 50
      || !Number.isSafeInteger(input.resultOffset) || Number(input.resultOffset) < 0 || Number(input.resultOffset) > 1000000) throw new Error("input");
    return { name: "get_my_service_publications_v1", args: { ...actor, p_result_limit: input.resultLimit, p_result_offset: input.resultOffset } };
  }
  if (action === "owner-set-status") {
    uploadRecord(input, ["expectedUserId", "expectedIdentityId", "serviceId", "expectedRevision", "expectedStatus", "status"]);
    if (!uuid(input.serviceId) || !revision(input.expectedRevision)
      || typeof input.expectedStatus !== "string" || !["published", "archived"].includes(input.expectedStatus)
      || typeof input.status !== "string" || !["published", "archived"].includes(input.status)) throw new Error("input");
    return { name: "set_my_service_activity_v1", args: { ...actor, p_service_id: input.serviceId,
      p_expected_revision: input.expectedRevision, p_expected_status: input.expectedStatus, p_status: input.status } };
  }
  if (!uuid(input.requestKey)) throw new Error("input");
  if (action === "prepare") {
    let command;
    try { command = bindServicePrepare(input, { userId: String(input.expectedUserId), identityId: String(input.expectedIdentityId) }, input.serviceId as string | null); }
    catch { throw new Error("input"); }
    return { name: "prepare_my_service_publication_v1", args: { ...actor, p_request_key: command.requestKey,
      p_service_id: command.serviceId, p_expected_revision: command.expectedRevision, p_content: command.content,
      p_gallery: command.gallery, p_policy_snapshot: command.policySnapshot } };
  }
  uploadRecord(input, ["expectedUserId", "expectedIdentityId", "attemptId", "requestKey"]);
  if (!uuid(input.attemptId) && !(input.attemptId === null && (action === "status" || action === "cancel")))
    throw new Error("input");
  const names = { status: "get_my_service_publication_attempt_v1", publish: "publish_my_service_v1",
    cancel: "cancel_my_service_publication_v1" } as const;
  if (!Object.hasOwn(names, action)) throw new Error("input");
  return { name: names[action as keyof typeof names], args: { ...actor,
    p_attempt_id: input.attemptId, p_request_key: input.requestKey } };
}

/** Verify the database ACK belongs to this exact command before returning success
 * or scheduling cleanup. A 200 alone is not a publication receipt. */
export function boundServiceReceipt(value: unknown, input: Record<string, unknown>, action: string) {
  const result = uploadRecord(value, receiptKeys);
  if (result.schema_version !== 1 || result.content_type !== "service"
    || result.actor_user_id !== input.expectedUserId || result.identity_id !== input.expectedIdentityId
    || result.request_key !== input.requestKey || !Array.isArray(result.slots) || result.slots.length > 10
    || !["prepared", "published", "cancelled", "not_found"].includes(String(result.state))) throw new Error("invalid_response");
  if ((action === "publish" && result.state !== "published")
    || (action === "prepare" && !["prepared", "published"].includes(String(result.state)))
    || (action === "cancel" && !["cancelled", "published"].includes(String(result.state)))) throw new Error("invalid_response");
  if (result.attempt_id === null) {
    if (!(["status", "cancel"].includes(action) && input.attemptId === null)
      || !["not_found", "cancelled"].includes(String(result.state)) || result.service_id !== null
      || result.edit_revision !== null || result.publication_event_id !== null || result.slots.length)
      throw new Error("invalid_response");
    return result;
  }
  if (!uuid(result.attempt_id) || !uuid(result.service_id) || !revision(result.edit_revision)
    || result.state === "not_found" || (uuid(input.attemptId) && result.attempt_id !== input.attemptId)
    || (uuid(input.serviceId) && result.service_id !== input.serviceId)
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

function safeDatabaseError(value: unknown): { error: string; code?: string; message?: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  if (isPublicationCapacityError(r)) return { error: "capacity", code: r.code, message: r.message };
  if (r.code === "40001") return { error: "conflict", code: "40001",
    message: r.message === "service_activity_conflict" ? "service_activity_conflict" : "service_edit_conflict" };
  if (r.code === "42501" && r.message === "publication_policy_changed")
    return { error: "policy_changed", code: "42501", message: "publication_policy_changed" };
  if (r.code === "42501") return { error: "context_changed", code: "42501" };
  if (["22023", "22P02", "22P05"].includes(String(r.code))) return { error: "refused", code: "22023" };
  if (r.code === "55000") return { error: "refused", code: "55000" };
  if (["PGRST202", "42883"].includes(String(r.code))) return { error: "unavailable" };
  return null;
}

/** Service publication owns content authority. The binary pipeline is shared only
 * after an authenticated service attempt/slot binding has been independently read. */
export function createServicePublicationRequestHandler(config: PublicationRuntimeConfig,
    images: Pick<MultipartPublicationImages, "prepare" | "verify">, fetcher: UploadFetch = fetch,
    afterResponse?: AfterPublicationResponse) {
  const cleanup = createServiceCleanupPass(config, fetcher);
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
      const ownerPage = action === "owner-list" || action === "owner-activity-list";
      const rpc = async (name: string, args: object) => (ownerPage ? serviceOwnerPageHttp : privateUploadHttp)(fetcher,
        config.projectOrigin + "/rest/v1/rpc/" + name, {
          method: "POST", headers: { apikey: config.publicKey, authorization, "content-type": "application/json" },
          body: JSON.stringify(args),
        }, { signal: request.signal, responseBytes: ownerPage ? 4 * 1024 * 1024 : 65536,
          readErrorStatuses: [400, 401, 403, 404, 409, 422, 500, 503] });
      if (image) {
        const auth = await rpc("get_my_service_publication_image_binding_v1", {
          p_expected_user_id: image.expectedUserId, p_expected_identity_id: image.expectedIdentityId,
          p_attempt_id: image.attemptId, p_slot_id: image.slotId, p_client_file_id: image.requestKey,
        });
        if (auth.status !== 200) return reply(safeDatabaseError(auth.json) ?? { error: "outcome_unknown" }, 409);
        const b = uploadRecord(auth.json, ["schema_version", "content_type", "actor_user_id", "identity_id",
          "attempt_id", "slot_id", "client_file_id", "expected_bytes", "expected_sha256"]);
        if (b.schema_version !== 1 || b.content_type !== "service" || b.actor_user_id !== image.expectedUserId
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
      const actor = { userId: String(input.expectedUserId), identityId: String(input.expectedIdentityId) };
      if (bindServiceValidityResponse(action, call.json, input)) return reply(call.json);
      if (action === "owner-read") {
        bindServiceOwnerSnapshot(call.json, actor, String(input.serviceId));
        return reply(call.json);
      }
      if (action === "owner-list") {
        bindServiceOwnerPage(call.json, actor, Number(input.resultOffset), Number(input.resultLimit));
        return reply(call.json);
      }
      if (action === "owner-set-status") {
        bindServiceActivityReceipt(call.json, actor, String(input.serviceId), String(input.expectedRevision),
          input.expectedStatus as "published" | "archived", input.status as "published" | "archived");
        return reply(call.json);
      }
      const saved = boundServiceReceipt(call.json, input, action);
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
