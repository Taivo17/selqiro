import "server-only";
import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { isUploadUuid } from "../../../entities/listing/model/privatePublicationUpload";
import type { MultipartSettlementCommand, MultipartSettlementResult } from "../multipart/multipartPublicationImages";
import { createCleanupOne, serviceConfig, type WorkerConfig } from "./cleanupOne";
import { fail, row } from "./finalContract";

type HostedCleanupConfig = WorkerConfig & Readonly<{ publicKey: string }>;
const source = {claim: "claim_listing_published_source_cleanup_v1",
  record: "record_listing_published_source_cleanup_v1", suffix: "/source.upload"} as const;
const retiredWeb = {claim: "claim_listing_retired_web_cleanup_v1",
  record: "record_listing_retired_web_cleanup_v1", suffix: "/web-v1.webp"} as const;

/** One exact ledger object through one Storage transport. SQL authorizes the
 * actor, attempt, lease and deletion proof. A response never settles a quota. */
function createScopedHostedCleanup(config: HostedCleanupConfig, fetcher: UploadFetch, includeRetiredWeb: boolean) {
  const { origin, headers } = serviceConfig(config);
  if (typeof fetcher !== "function" || typeof config.publicKey !== "string" || !config.publicKey
      || config.publicKey.length > 8192 || /\s/.test(config.publicKey)) return fail("configuration");
  return async function settleHostedCleanupOne(accessToken: string, input: MultipartSettlementCommand,
      signal?: AbortSignal): Promise<MultipartSettlementResult> {
    const value = row(input, ["expectedUserId", "expectedIdentityId", "attemptId", "requestKey"]);
    if (!Object.values(value).every(v => typeof v === "string" && v.length === 36 && isUploadUuid(v)))
      return fail("input");
    const cmd = Object.freeze({ ...value }) as MultipartSettlementCommand;
    const result = (kind: "pending" | "needs_attention"): MultipartSettlementResult =>
      Object.freeze({ kind, attemptId: cmd.attemptId, filesRemaining: null });
    if (signal?.aborted) return result("pending");
    if (typeof accessToken !== "string" || accessToken.match(/^[A-Za-z0-9._-]{1,8192}$/)?.[0] !== accessToken)
      return fail("unauthorized");
    const auth = await privateUploadHttp(fetcher, origin + "/auth/v1/user", {
      method: "GET", headers: { apikey: config.publicKey, authorization: "Bearer " + accessToken },
    }, { signal, responseBytes: 65536 });
    if (auth.status !== 200) return fail("unauthorized");
    if (row(auth.json).id !== cmd.expectedUserId) return fail("context_changed");
    const scope = { p_expected_user_id: cmd.expectedUserId, p_expected_identity_id: cmd.expectedIdentityId,
      p_attempt_id: cmd.attemptId, p_request_key: cmd.requestKey };
    const rpc = async (name: string, args: object, callSignal?: AbortSignal) => {
      const response = await privateUploadHttp(fetcher, origin + "/rest/v1/rpc/" + name,
        { method: "POST", headers, body: JSON.stringify(args) },
        { signal: callSignal, responseBytes: 4096, timeoutMs: 5000 });
      if (response.status !== 200) return fail("outcome_unknown");
      return response.json;
    };
    let operations: typeof source | typeof retiredWeb = source;
    const cleanupOne = createCleanupOne(config, fetcher, {
      async claim(callSignal) {
        let task = await rpc(source.claim, scope, callSignal);
        // Only a literal null permits the second closed scope. A failed or
        // malformed SOURCE claim must stop, never broaden the deletion target.
        if (task === null && includeRetiredWeb) {
          operations = retiredWeb;
          task = await rpc(retiredWeb.claim, scope, callSignal);
        }
        if (task !== null) {
          const path = row(task).object_path;
          if (typeof path !== "string" || !path.startsWith("v1/" + cmd.attemptId + "/")
              || !path.endsWith(operations.suffix)) return fail("response");
        }
        return task;
      },
      record: (objectId, workKey, outcome, callSignal) => rpc(operations.record, {
        ...scope, p_object_id: objectId, p_work_key: workKey, p_result: outcome,
      }, callSignal),
    });
    const outcome = await cleanupOne(signal);
    // Null can mean a held lease; deleting one object cannot prove an attempt
    // clean. The separate authoritative SOURCE and retired-WEB reads do that.
    return result(outcome.kind === "needs_attention" ? "needs_attention" : "pending");
  };
}
/** Preserves the completed-SOURCE-only contract for existing callers. */
export function createSettleHostedSourceOne(config: HostedCleanupConfig, fetcher: UploadFetch = fetch) {
  return createScopedHostedCleanup(config, fetcher, false);
}
/** One SOURCE, or one already retired WEB when SOURCE has no eligible claim. */
export function createSettleHostedCleanupOne(config: HostedCleanupConfig, fetcher: UploadFetch = fetch) {
  return createScopedHostedCleanup(config, fetcher, true);
}
