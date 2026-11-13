import type { UploadFetch } from "../../listing/api/privateUploadHttp";
import { serviceOwnerPageHttp as boundedPageHttp } from "../../service/api/serviceOwnerPageHttp";
import { publicationStorageOrigin } from "../../listing/model/privatePublicationUpload";
import { PROVIDER_CONTROLS_PAGE_SIZE, ProviderControlsError, copyProviderControlActor, copyProviderControlTarget,
  type ProviderControlActor, type ProviderControlTarget, type ProviderControlKind, type ProviderControlState,
  isProviderControlUuid, type ProviderControlAction } from "../model/types";
import { parseProviderControlState, parseProviderControlPage, parseProviderControlReceipt } from "../model/parsers";

type Options = Readonly<{ projectOrigin?: string; publicKey?: string; fetcher?: UploadFetch; newRevision?: () => string }>;

/** Account-bound, one request per user action/page. No per-card lookup, automatic
 * write retry, active-identity requirement, or private remote error text. SQL is
 * the authority and checks the captured JWT against expected_user_id. */
export function createProviderControlsClient(options: Options = {}) {
  const fetcher = options.fetcher ?? fetch;
  async function request(name: string, suppliedActor: ProviderControlActor, args: object, signal?: AbortSignal,
    writing = false, attemptedRevision?: string) {
    const actor = copyProviderControlActor(suppliedActor);
    if (signal?.aborted) throw new ProviderControlsError("aborted", attemptedRevision);
    let origin: string;
    try { origin = publicationStorageOrigin(options.projectOrigin ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""); }
    catch { throw new ProviderControlsError("configuration", attemptedRevision); }
    const key = options.publicKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key || !/^[A-Za-z0-9._-]{1,8192}$/.test(key)) throw new ProviderControlsError("configuration", attemptedRevision);
    let result: Awaited<ReturnType<typeof boundedPageHttp>>;
    try {
      result = await boundedPageHttp(fetcher, origin + "/rest/v1/rpc/" + name, { method: "POST",
        headers: { apikey: key, authorization: "Bearer " + actor.accessToken, "content-type": "application/json" },
        body: JSON.stringify({ p_expected_user_id: actor.userId, ...args }) }, {
        signal, timeoutMs: 15000, responseBytes: 524288, readErrorStatuses: [400, 401, 403, 404, 409, 422, 500],
      });
    } catch { throw new ProviderControlsError(writing ? "outcome_unknown" : signal?.aborted ? "aborted" : "unavailable", attemptedRevision); }
    if (result.status !== 200) {
      const code = result.json && typeof result.json === "object" && !Array.isArray(result.json)
        ? (result.json as Record<string, unknown>).code : null;
      const error = code === "40001" || result.status === 409 ? "stale"
        : result.status === 401 ? "unauthorized" : code === "42501" || result.status === 403 ? "refused"
        : code === "22023" ? "input" : result.status === 404 ? "unavailable"
        : writing ? "outcome_unknown" : "unavailable";
      throw new ProviderControlsError(error, attemptedRevision);
    }
    return result.json;
  }
  return Object.freeze({
    async get(suppliedActor: ProviderControlActor, suppliedTarget: ProviderControlTarget, signal?: AbortSignal) {
      const actor = copyProviderControlActor(suppliedActor), target = copyProviderControlTarget(suppliedTarget);
      return parseProviderControlState(await request("get_my_provider_control_v1", actor,
        { p_target_type: target.type, p_target_id: target.id }, signal), actor.userId, target);
    },
    async list(suppliedActor: ProviderControlActor, kind: ProviderControlKind, offset = 0, signal?: AbortSignal) {
      const actor = copyProviderControlActor(suppliedActor);
      if (!["hidden", "blocked"].includes(kind) || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
        throw new ProviderControlsError("input");
      return parseProviderControlPage(await request("list_my_provider_controls_v1", actor,
        { p_kind: kind, p_result_limit: PROVIDER_CONTROLS_PAGE_SIZE, p_result_offset: offset }, signal), actor.userId, kind, offset);
    },
    async set(suppliedActor: ProviderControlActor, state: ProviderControlState, action: ProviderControlAction, signal?: AbortSignal) {
      const actor = copyProviderControlActor(suppliedActor), target = copyProviderControlTarget(state.target);
      if (state.actorUserId !== actor.userId) throw new ProviderControlsError("context_changed");
      if (!state.targetAvailable || !state.targetToken || !/^[0-9a-f]{64}$/.test(state.targetToken)) throw new ProviderControlsError("unavailable");
      if (!["hide", "unhide", "block", "unblock"].includes(action)) throw new ProviderControlsError("input");
      if ((action === "hide" && !state.canHide) || (action === "block" && !state.canBlock)) throw new ProviderControlsError("refused");
      const attemptedRevision = action === "hide" || action === "unhide"
        ? (options.newRevision ?? (() => crypto.randomUUID()))() : undefined;
      if (attemptedRevision !== undefined && !isProviderControlUuid(attemptedRevision)) throw new ProviderControlsError("input");
      const args = { p_target_type: target.type, p_target_id: target.id, p_action: action,
        p_expected_target_token: state.targetToken, p_expected_revision: attemptedRevision ? state.hideRevision : null,
        p_next_revision: attemptedRevision ?? null, p_expected_block_id: attemptedRevision ? null : state.blockId,
        p_expected_block_created_at: attemptedRevision ? null : state.blockCreatedAt };
      const value = await request("set_my_provider_control_v1", actor, args, signal, true, attemptedRevision);
      try { return parseProviderControlReceipt(value, actor.userId, target, action); }
      catch { throw new ProviderControlsError("outcome_unknown", attemptedRevision); }
    },
  });
}
export type ProviderControlsClient = ReturnType<typeof createProviderControlsClient>;
export const providerControlsClient = createProviderControlsClient();
