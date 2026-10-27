import { bindPrepareListingPublicationCommand } from "../attempts/prepareInput";
import { createFinalListingService } from "../final/finalizeListing";
import { isId, receipt, type FinalReceipt } from "../final/finalContract";
import { isUploadUuid, uploadRecord } from "../../../entities/listing/model/privatePublicationUpload";
import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { assertPublicationActor, type PublicationRuntimeConfig } from "./integrationRuntime";
import type { MultipartPublicationImages } from "./journeyTypes";

const ownerActions = {
  "owner-edit-read": {name: "get_my_listing_edit_v1", keys: ["p_listing_id", "p_expected_identity_id", "p_expected_actor_id"]},
  "owner-edit-save": {name: "save_my_listing_edit_v1", keys: ["p_listing_id", "p_expected_identity_id", "p_expected_actor_id", "p_expected_basics", "p_basics"]},
  "owner-set-status": {name: "set_my_managed_listing_status_v2", keys: ["p_listing_id", "p_expected_identity_id", "p_expected_user_id", "p_expected_status", "p_status"]},
  "owner-renew": {name: "renew_my_managed_listing_activity_v2", keys: ["p_listing_id", "p_expected_identity_id", "p_expected_user_id", "p_expected_active_until"]},
  "owner-cleanup-status": {name: "get_my_listing_cleanup_summary_v1", keys: ["p_expected_identity_id", "p_expected_user_id"]},
} as const;
const actions = new Set(["prepare", "status", "cancel", "image-prepare", "image-verify", "publish", "remove", "cleanup", "owner-status", ...Object.keys(ownerActions)]);
const response = (value: unknown, status = 200) => Response.json(value, {status,
  headers: {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}});
async function readBody(req: Request) {
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json" || !req.body) throw new Error("input");
  const declared = req.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > 131072)) throw new Error("input");
  const reader = req.body.getReader(); let length = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) { const r = await reader.read(); if (r.done) break;
      length += r.value.length; if (length > 131072) throw new Error("input"); chunks.push(r.value); }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
    return uploadRecord(JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes)));
  } finally { void reader.cancel().catch(() => {}); }
}
function actorArgs(v: Record<string, unknown>, last: "requestKey" | "listingId") {
  uploadRecord(v, ["expectedUserId", "expectedIdentityId", last]);
  if (!isUploadUuid(v.expectedUserId) || !isUploadUuid(v.expectedIdentityId)
      || (last === "requestKey" ? !isUploadUuid(v[last]) : !isId(v[last]))) throw new Error("input");
  return {p_expected_user_id: v.expectedUserId, p_expected_identity_id: v.expectedIdentityId,
    [last === "requestKey" ? "p_request_key" : "p_listing_id"]: v[last]};
}
function ownerContract(action: keyof typeof ownerActions, input: Record<string, unknown>) {
  const definition = ownerActions[action], keys: string[] = [...definition.keys];
  if (action === "owner-edit-save" && Object.hasOwn(input, "p_price_change")) keys.push("p_price_change", "p_expected_price_revision");
  uploadRecord(input, keys);
  if (!isUploadUuid(input.p_expected_identity_id)
    || !isUploadUuid(input[action.startsWith("owner-edit-") ? "p_expected_actor_id" : "p_expected_user_id"])
    || action !== "owner-cleanup-status" && !isId(input.p_listing_id)) throw new Error("input");
  return {name: definition.name, args: input};
}
function ownerContractError(value: unknown): {code: string; message: string} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  // Preserve only known CAS/authorization classes, never raw server details.
  if (r.code === "40001" && ["listing_basics_conflict", "listing_price_conflict", "listing_activity_conflict", "listing_status_conflict"].includes(String(r.message)))
    return {code: "40001", message: String(r.message)};
  if (r.code === "42501") return {code: "42501", message: "listing_activity_identity_required"};
  if (r.code === "22023" || r.code === "22P05") return {code: "22023", message: "listing_activity_deadline_invalid"};
  if (r.code === "55000" && r.message === "listing_activity_active_status_required") return {code: "55000", message: r.message};
  if (r.code === "PGRST202" || r.code === "42883") return {code: "PGRST202", message: "owner_contract_unavailable"};
  return null;
}
/** The one application boundary for the closed integrated publication journey.
 * External failures are unknown outcomes. It never retries a write or clears a journal. */
export function createJourneyRequestHandler(c: PublicationRuntimeConfig, images: MultipartPublicationImages, fetcher: UploadFetch = fetch) {
  const final = createFinalListingService(c, fetcher);
  async function refreshFinalReceipt(known: FinalReceipt, expectedUserId: unknown,
      headers: Record<string, string>, signal: AbortSignal): Promise<FinalReceipt> {
    const r = await privateUploadHttp(fetcher, c.projectOrigin + "/rest/v1/rpc/get_my_managed_listing_v2",
      {method: "POST", headers, body: JSON.stringify({p_expected_user_id: expectedUserId,
        p_expected_identity_id: known.identity_id, p_listing_id: known.listing_id})},
      {signal, responseBytes: 65536, timeoutMs: 5000});
    if (r.status !== 200) throw new Error("outcome_unknown");
    const owner = uploadRecord(r.json, ["receipt", "activity", "images"]);
    const current = receipt(owner.receipt, {identityId: known.identity_id, userId: known.actor_user_id,
      attemptId: known.attempt_id, requestKey: known.request_key, listingId: known.listing_id});
    const order = {published: 0, deleting: 1, deleted: 2};
    if (current.published_at !== known.published_at || order[current.state] < order[known.state]
        || current.state === known.state && current.files_remaining > known.files_remaining) throw new Error("invalid_response");
    // Keep the content operation's replay fact. Cleanup/readback is not another
    // publication, and only the authoritative owner receipt can advance its state.
    return Object.freeze({...current, ...(known.replayed === undefined ? {} : {replayed: known.replayed})});
  }
  async function settle(token: string, command: unknown, signal: AbortSignal) {
    const controller = new AbortController(), abort = () => controller.abort();
    signal.addEventListener("abort", abort, {once: true});
    if (signal.aborted) abort();
    const timer = setTimeout(abort, 20_000);
    try { return await images.settle(token, command, controller.signal); }
    finally { clearTimeout(timer); signal.removeEventListener("abort", abort); controller.abort(); }
  }
  return async (request: Request, action: string): Promise<Response> => {
    if (!actions.has(action)) return response({error: "not_found"}, 404);
    if (request.method !== "POST") return response({error: "method"}, 405);
    // Next may normalize Request.url to localhost while retaining the real Host.
    // Match the configured origin and actual Host; forwarded headers are not trusted.
    if (request.headers.get("origin") !== c.appOrigin || request.headers.get("host") !== new URL(c.appOrigin).host)
      return response({error: "origin"}, 403);
    const authorization = request.headers.get("authorization") ?? "";
    if (!/^Bearer [A-Za-z0-9._-]{1,8192}$/.test(authorization)) return response({error: "unauthorized"}, 401);
    const token = authorization.slice(7);
    try {
      const input = await readBody(request);
      const expectedUserId = Object.hasOwn(ownerActions, action)
        ? input[action.startsWith("owner-edit-") ? "p_expected_actor_id" : "p_expected_user_id"]
        : input.expectedUserId;
      await assertPublicationActor(c, token, expectedUserId, request.signal, fetcher);
      const headers = {apikey: c.publicKey, authorization, "content-type": "application/json"};
      if (Object.hasOwn(ownerActions, action)) {
        const bound = ownerContract(action as keyof typeof ownerActions, input);
        const r = await privateUploadHttp(fetcher, c.projectOrigin + "/rest/v1/rpc/" + bound.name,
          {method: "POST", headers, body: JSON.stringify(bound.args)}, {signal: request.signal, responseBytes: 65536,
            readErrorStatuses: [400, 401, 403, 404, 409, 422, 500, 503]});
        if (r.status === 200) return response(r.json);
        const error = ownerContractError(r.json);
        if (error) return response({error: "owner_contract", ...error}, error.code === "42501" ? 403 : 409);
        return response({error: "outcome_unknown"}, 503);
      }
      const rpc = async (name: string, args: unknown) => {
        const r = await privateUploadHttp(fetcher, c.projectOrigin + "/rest/v1/rpc/" + name,
          {method: "POST", headers, body: JSON.stringify(args)}, {signal: request.signal, responseBytes: 65536});
        if (r.status === 401 || r.status === 403) throw new Error("unauthorized");
        if ([400,404,409,422].includes(r.status)) throw new Error("refused");
        if (r.status !== 200) throw new Error("outcome_unknown"); return r.json;
      };
      if (action === "prepare") return response(await rpc("prepare_my_listing_publication_v1",
        bindPrepareListingPublicationCommand(input as Parameters<typeof bindPrepareListingPublicationCommand>[0])));
      if (action === "status" || action === "cancel") {
        const result = await rpc(action === "status" ? "get_my_listing_publication_journey_v2" : "cancel_my_listing_publication_journey_v2", actorArgs(input, "requestKey"));
        if (action === "cancel") {
          const state = uploadRecord(result);
          if (state.intent_closed === true && state.snapshot) {
            const snapshot = uploadRecord(state.snapshot);
            try { await settle(token, {...input, attemptId: snapshot.attempt_id}, request.signal); }
            catch { /* Keep the committed cancellation result; its cleanup ledger is durable. */ }
          }
        }
        return response(result);
      }
      if (action === "owner-status") return response(await rpc("get_my_managed_listing_v2", actorArgs(input, "listingId")));
      if (action === "image-prepare" || action === "image-verify") return response(await images[action === "image-prepare" ? "prepare" : "verify"](token, input, request.signal));
      if (action === "cleanup") return response(await settle(token, input, request.signal));
      if (action === "publish" || action === "remove") {
        const result = action === "publish" ? await final.publish(token, input, request.signal) : await final.remove(token, input, request.signal);
        // Content commit and file cleanup remain separately observable. A bounded
        // first cleanup pass is part of the user action, never a new publication.
        try {
          await settle(token, {expectedUserId: input.expectedUserId, expectedIdentityId: input.expectedIdentityId,
            attemptId: result.attempt_id, requestKey: result.request_key}, request.signal);
          return response(await refreshFinalReceipt(result, input.expectedUserId, headers, request.signal));
        }
        catch { /* Do not turn a known content commit into an invented rollback. */ }
        return response(result);
      }
      return response({error: "not_found"}, 404);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code)
        : error instanceof Error ? error.message : "outcome_unknown";
      if (code === "integration_unverified") return response({error: "integration_unverified"}, 503);
      if (["unauthorized", "context_changed"].includes(code)) return response({error: code}, 403);
      if (["input", "context", "images", "count", "bytes", "invalid_input", "refused"].includes(code))
        return response({error: "refused"}, 409);
      return response({error: "outcome_unknown"}, 503);
    }
  };
}
