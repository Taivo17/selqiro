import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { privateUploadHttp } from "./privateUploadHttp";
import type { PublicationActor } from "../model/publicationJourney";

export async function publicationJourneyRequest(actor: PublicationActor, action: string, body: object, signal: AbortSignal) {
  if (!v2IntegrationEnabled() || signal.aborted) throw new Error("context_changed");
  const {data, error} = await supabaseBrowserClient.auth.getSession();
  if (signal.aborted || error || data.session?.user.id !== actor.userId) throw new Error("context_changed");
  const r = await privateUploadHttp(fetch, window.location.origin + "/api/v2/publication/" + action, {
    method: "POST", headers: {authorization: "Bearer " + data.session.access_token, "content-type": "application/json"}, body: JSON.stringify(body),
  }, {signal, timeoutMs: 120000, responseBytes: 65536,
    ...(action.startsWith("owner-") ? {readErrorStatuses: [403, 409]} : {})});
  if ((r.status === 403 || r.status === 409) && action.startsWith("owner-") && r.json && typeof r.json === "object") {
    const error = r.json as Record<string, unknown>;
    if (error.error === "owner_contract" && typeof error.code === "string" && typeof error.message === "string"
      && ["40001", "42501", "22023", "55000", "PGRST202"].includes(error.code) && /^[a-z_]{1,80}$/.test(error.message))
      throw {code: error.code, message: error.message};
  }
  if (r.status === 403 || r.status === 401) throw new Error("context_changed");
  if (r.status !== 200) throw new Error("outcome_unknown"); return r.json;
}
export async function putPublicationPart(url: string, headers: Record<string, string>, bytes: Blob, signal: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort(); signal.addEventListener("abort", abort, {once: true});
  const timer = setTimeout(abort, 120000);
  try {
    if (signal.aborted) throw new Error("context_changed");
    const r = await fetch(url, {method: "PUT", headers, body: bytes, signal: controller.signal,
      credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer"});
    void r.body?.cancel().catch(() => {});
    if (r.status !== 200 || r.redirected || controller.signal.aborted) throw new Error("outcome_unknown");
  } finally { clearTimeout(timer); signal.removeEventListener("abort", abort); controller.abort(); }
}
