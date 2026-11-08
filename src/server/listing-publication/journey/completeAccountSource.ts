import "server-only";
import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { isUploadUuid, uploadRecord } from "../../../entities/listing/model/privatePublicationUpload";
import { createCleanupOne, serviceConfig, type WorkerConfig } from "../final/cleanupOne";

type Scope = Readonly<{ expectedUserId: string; expectedIdentityId: string }>;
type Config = WorkerConfig & Readonly<{ publicKey: string }>;

/** Complete at most twenty published SOURCE objects originally uploaded by this
 * account. SQL independently checks the current active identity and access to
 * each target identity; it never switches the profile's active identity.
 * A count advances only after fresh Storage absence and a bound durable record.
 * This does not delete gallery WEB objects or release uncertain reservations. */
export function createAccountSourceCompletion(config: Config, fetcher: UploadFetch = fetch) {
  const { origin, headers } = serviceConfig(config);
  return async (accessToken: string, input: Scope, signal?: AbortSignal): Promise<number> => {
    const controller = new AbortController(), abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    const timer = setTimeout(abort, 25_000);
    let completed = 0;
    try {
      const value = uploadRecord(input, ["expectedUserId", "expectedIdentityId"]);
      if (!Object.values(value).every(v => typeof v === "string" && v.length === 36 && isUploadUuid(v))
        || accessToken.match(/^[A-Za-z0-9._-]{1,8192}$/)?.[0] !== accessToken || controller.signal.aborted) return 0;
      // Copy before the first asynchronous boundary. Neither the caller nor a
      // target claim can replace the account/current identity used by record.
      const args = Object.freeze({ p_expected_user_id: String(value.expectedUserId),
        p_expected_identity_id: String(value.expectedIdentityId) });
      const auth = await privateUploadHttp(fetcher, origin + "/auth/v1/user", { method: "GET",
        headers: { apikey: config.publicKey, authorization: "Bearer " + accessToken },
      }, { signal: controller.signal, responseBytes: 65536, timeoutMs: 5000 });
      if (auth.status !== 200 || uploadRecord(auth.json).id !== args.p_expected_user_id) return 0;
      const rpc = async (name: string, body: object, passSignal?: AbortSignal) => {
        const result = await privateUploadHttp(fetcher, origin + "/rest/v1/rpc/" + name,
          { method: "POST", headers, body: JSON.stringify(body) },
          { signal: passSignal, responseBytes: 4096, timeoutMs: 5000 });
        if (result.status !== 200) throw new Error("outcome_unknown");
        return result.json;
      };
      const cleanup = createCleanupOne(config, fetcher, {
        claim: async passSignal => {
          const task = await rpc("claim_listing_account_source_cleanup_v1", args, passSignal);
          if (task === null) return null;
          // The shared worker also supports WEB cleanup. This caller deliberately
          // accepts only SOURCE paths from its narrower database capability.
          const row = uploadRecord(task);
          if (typeof row.object_path !== "string" || !row.object_path.endsWith("/source.upload"))
            throw new Error("invalid_response");
          return task;
        },
        record: (objectId, workKey, outcome, passSignal) => rpc("record_listing_account_source_cleanup_v1", {
          ...args, p_object_id: objectId, p_work_key: workKey, p_result: outcome,
        }, passSignal),
      });
      for (let i = 0; i < 20 && !controller.signal.aborted; i++) {
        if ((await cleanup(controller.signal)).kind !== "deleted") break;
        completed += 1;
      }
    } catch { /* The durable queue retains any failed, expired or uncertain work. */ }
    finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); controller.abort(); }
    return completed;
  };
}
