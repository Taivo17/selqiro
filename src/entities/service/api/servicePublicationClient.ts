import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { privateUploadHttp } from "../../listing/api/privateUploadHttp";
import { serviceOwnerPageHttp } from "./serviceOwnerPageHttp";
import type { PublicationActor } from "../../listing/model/publicationJourney";
import { isUploadUuid } from "../../listing/model/privatePublicationUpload";
import { measurePhotoTask, type PhotoPerformanceStage } from "../../listing/model/photoPerformance";
import { bindServiceActivityReceipt, bindServiceOwnerPage, bindServiceOwnerSnapshot, isServiceRevision } from "../model/servicePublication";

const actions = new Set(["prepare", "status", "publish", "cancel", "image-prepare", "image-verify", "owner-read", "owner-list", "owner-set-status"]);
const stages: Record<string, PhotoPerformanceStage> = { prepare: "prepare", status: "status", publish: "publish",
  "image-prepare": "image_prepare", "image-verify": "image_verify", "owner-read": "gallery" };
async function actorSession(actor: PublicationActor, signal: AbortSignal) {
  if (!v2IntegrationEnabled() || signal.aborted || !isUploadUuid(actor.userId) || !isUploadUuid(actor.identityId)) throw new Error("context_changed");
  const { data, error } = await supabaseBrowserClient.auth.getSession();
  if (signal.aborted || error || data.session?.user.id !== actor.userId) throw new Error("context_changed");
  return data.session;
}
/** Service UUIDs use only their own content authority. Every request rechecks
 * authentication; a network failure leaves the operation outcome unknown. */
export async function servicePublicationRequest(actor: PublicationActor, action: string, body: object, signal: AbortSignal): Promise<unknown> {
  if (!actions.has(action)) throw new Error("context_changed");
  const session = await actorSession(actor, signal);
  const work = () => (action === "owner-list" ? serviceOwnerPageHttp : privateUploadHttp)(fetch, window.location.origin + "/api/v2/service-publication/" + action, {
    method: "POST", headers: { authorization: "Bearer " + session.access_token, "content-type": "application/json" }, body: JSON.stringify(body),
  }, { signal, timeoutMs: 120000, responseBytes: action === "owner-list" ? 4 * 1024 * 1024 : 65536,
    readErrorStatuses: [400, 401, 403, 409, 422, 429, 503] });
  const result = await (stages[action] ? measurePhotoTask(stages[action], work) : work());
  if (result.status === 200) return result.json;
  const failure = result.json && typeof result.json === "object" ? result.json as Record<string, unknown> : null;
  if (failure?.error === "policy_changed") throw new Error("policies_changed");
  if (failure?.error === "capacity") throw new Error(failure.message === "publication_retained_bytes_limit" ? "storage_limited" : "temporarily_limited");
  if (failure && typeof failure.code === "string" && ["40001", "42501", "22023", "23514", "55000"].includes(failure.code)) {
    const error = new Error(failure.code === "40001" ? "revision_conflict" : failure.code === "42501" ? "context_changed" : "details_rejected");
    Object.assign(error, { code: failure.code }); throw error;
  }
  if (failure?.error === "refused") throw new Error("details_rejected");
  if (result.status === 401 || result.status === 403) throw new Error("context_changed");
  if (result.status === 429) throw new Error("temporarily_limited");
  throw new Error("outcome_unknown");
}
export async function readServiceOwner(actor: PublicationActor, serviceId: string, signal: AbortSignal) {
  if (!isUploadUuid(serviceId)) throw new Error("details_invalid");
  return bindServiceOwnerSnapshot(await servicePublicationRequest(actor, "owner-read", {
    expectedUserId: actor.userId, expectedIdentityId: actor.identityId, serviceId,
  }, signal), actor, serviceId);
}
export async function listServiceOwners(actor: PublicationActor, signal: AbortSignal, offset = 0, limit = 50) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw new Error("details_invalid");
  return bindServiceOwnerPage(await servicePublicationRequest(actor, "owner-list", {
    expectedUserId: actor.userId, expectedIdentityId: actor.identityId, resultOffset: offset, resultLimit: limit,
  }, signal), actor, offset, limit);
}
/** No automatic retry: an uncertain status change must be checked by reading
 * the service again before the owner decides the next action. */
export async function setServiceOwnerStatus(actor: PublicationActor, serviceId: string, expectedRevision: string,
  expectedStatus: "published" | "archived", status: "published" | "archived", signal: AbortSignal) {
  if (!isUploadUuid(serviceId) || !isServiceRevision(expectedRevision)
    || !["published", "archived"].includes(expectedStatus) || !["published", "archived"].includes(status)) throw new Error("details_invalid");
  return bindServiceActivityReceipt(await servicePublicationRequest(actor, "owner-set-status", {
    expectedUserId: actor.userId, expectedIdentityId: actor.identityId, serviceId, expectedRevision, expectedStatus, status,
  }, signal), actor, serviceId, expectedRevision, expectedStatus, status);
}
/** Auth headers only go to the same application's exact owner-media route.
 * Historical public service images remain same-project bounded reads. */
export async function fetchServiceOwnerImage(actor: PublicationActor, source: string, signal: AbortSignal): Promise<Blob> {
  const session = await actorSession(actor, signal);
  let url: URL; try { url = new URL(source, window.location.origin); } catch { throw new Error("image_unavailable"); }
  if (url.username || url.password || url.search || url.hash) throw new Error("image_unavailable");
  const managed = url.origin === window.location.origin && /^\/api\/v2\/service-owner-media\/[0-9a-f-]{36}\/[0-9]$/.test(url.pathname)
    && isUploadUuid(url.pathname.split("/")[4]);
  let legacy = false;
  try { legacy = url.origin === new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin
    && url.protocol === "https:" && url.pathname.startsWith("/storage/v1/object/public/service-images/"); } catch { /* Invalid configuration fails closed. */ }
  if (!managed && !legacy) throw new Error("image_unavailable");
  const deadline = new AbortController(), timer = setTimeout(() => deadline.abort(), 30000);
  const abort = () => deadline.abort(); signal.addEventListener("abort", abort, { once: true });
  try {
    if (signal.aborted) throw new Error("context_changed");
    const response = await fetch(url.href, { headers: managed ? { authorization: "Bearer " + session.access_token,
      "x-selqiro-user": actor.userId, "x-selqiro-identity": actor.identityId } : {},
      signal: deadline.signal, cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer" });
    const mime = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (response.status !== 200 || !response.body || (managed ? mime !== "image/webp" : !["image/webp", "image/jpeg", "image/png"].includes(mime))) {
      void response.body?.cancel().catch(() => {}); throw new Error("image_unavailable");
    }
    const reader = response.body.getReader(), chunks: Uint8Array<ArrayBuffer>[] = []; let length = 0;
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        length += part.value.byteLength;
        if (signal.aborted || deadline.signal.aborted || length > (managed ? 4 : 25) * 1024 * 1024) throw new Error("image_unavailable");
        chunks.push(new Uint8Array(part.value));
      }
    } finally { void reader.cancel().catch(() => {}); }
    if (!length || signal.aborted || deadline.signal.aborted) throw new Error("image_unavailable");
    return new Blob(chunks, { type: mime });
  } finally { clearTimeout(timer); signal.removeEventListener("abort", abort); deadline.abort(); }
}
