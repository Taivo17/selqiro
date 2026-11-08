import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { privateUploadHttp } from "../../listing/api/privateUploadHttp";
import type { PublicationActor } from "../../listing/model/publicationJourney";
import { measurePhotoTask, type PhotoPerformanceStage } from "../../listing/model/photoPerformance";

const actions = new Set(["prepare", "status", "publish", "cancel", "image-prepare", "image-verify", "owner-read"]);
const stages: Record<string, PhotoPerformanceStage> = {prepare: "prepare", status: "status", publish: "publish",
  "image-prepare": "image_prepare", "image-verify": "image_verify", "owner-read": "gallery"};

/** Horse UUIDs never enter the ordinary listing transport. Authentication is
 * checked again for every step; transport failure never implies rollback. */
export async function horsePublicationRequest(actor: PublicationActor, action: string, body: object, signal: AbortSignal) {
  if (!actions.has(action) || !v2IntegrationEnabled() || signal.aborted) throw new Error("context_changed");
  const {data, error} = await supabaseBrowserClient.auth.getSession();
  if (signal.aborted || error || data.session?.user.id !== actor.userId) throw new Error("context_changed");
  const work = () => privateUploadHttp(fetch, window.location.origin + "/api/v2/horse-publication/" + action, {
    method: "POST", headers: {authorization: "Bearer " + data.session!.access_token, "content-type": "application/json"}, body: JSON.stringify(body),
  }, {signal, timeoutMs: 120000, responseBytes: 65536, readErrorStatuses: [400, 403, 409, 422, 429, 503]});
  const result = await (stages[action] ? measurePhotoTask(stages[action], work) : work());
  if (result.status === 200) return result.json;
  const failure = result.json && typeof result.json === "object" ? result.json as Record<string, unknown> : null;
  if (failure?.error === "policy_changed") throw new Error("policies_changed");
  if (failure?.error === "capacity") throw new Error(failure.message === "publication_retained_bytes_limit" ? "storage_limited" : "temporarily_limited");
  if (failure?.error === "refused") throw new Error("details_rejected");
  if (failure && typeof failure.code === "string" && ["40001", "42501", "22023", "23514", "55000"].includes(failure.code)) {
    const e = new Error(failure.code === "40001" ? "revision_conflict" : failure.code === "42501" ? "context_changed" : "details_rejected");
    Object.assign(e, {code: failure.code}); throw e;
  }
  if (result.status === 401 || result.status === 403) throw new Error("context_changed");
  if (result.status === 429) throw new Error("temporarily_limited");
  throw new Error("outcome_unknown");
}
