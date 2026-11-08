import "server-only";
import { privateUploadHttp, type UploadFetch } from "../../entities/listing/api/privateUploadHttp";
import { isUploadUuid, uploadRecord } from "../../entities/listing/model/privatePublicationUpload";
import { createCleanupOne, serviceConfig, type WorkerConfig } from "../listing-publication/final/cleanupOne";

type Scope = Readonly<{ expectedUserId: string; expectedIdentityId: string; attemptId: string; requestKey: string }>;
type Config = WorkerConfig & Readonly<{ publicKey: string }>;

/** At most twenty objects from one service's immutable command lineage, with a
 * separate deadline. Database claims retain actor checks, exact paths and leases;
 * the shared worker verifies physical absence before recording quota release. */
export function createServiceCleanupPass(config: Config, fetcher: UploadFetch = fetch) {
  const { origin, headers } = serviceConfig(config);
  return async (accessToken: string, scope: Scope): Promise<void> => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 25_000);
    try {
      uploadRecord(scope, ["expectedUserId", "expectedIdentityId", "attemptId", "requestKey"]);
      if (!Object.values(scope).every(v => typeof v === "string" && v.length === 36 && isUploadUuid(v))
        || accessToken.match(/^[A-Za-z0-9._-]{1,8192}$/)?.[0] !== accessToken) return;
      const auth = await privateUploadHttp(fetcher, origin + "/auth/v1/user", { method: "GET",
        headers: { apikey: config.publicKey, authorization: "Bearer " + accessToken },
      }, { signal: controller.signal, responseBytes: 65536, timeoutMs: 5000 });
      if (auth.status !== 200 || uploadRecord(auth.json).id !== scope.expectedUserId) return;
      const args = { p_expected_user_id: scope.expectedUserId, p_expected_identity_id: scope.expectedIdentityId,
        p_attempt_id: scope.attemptId, p_request_key: scope.requestKey };
      const rpc = async (name: string, body: object, signal?: AbortSignal) => {
        const r = await privateUploadHttp(fetcher, origin + "/rest/v1/rpc/" + name,
          { method: "POST", headers, body: JSON.stringify(body) }, { signal, responseBytes: 4096, timeoutMs: 5000 });
        if (r.status !== 200) throw new Error("outcome_unknown");
        return r.json;
      };
      const cleanup = createCleanupOne(config, fetcher, {
        claim: signal => rpc("claim_service_publication_cleanup_v1", args, signal),
        record: (objectId, workKey, outcome, signal) => rpc("record_service_publication_cleanup_v1", {
          ...args, p_object_id: objectId, p_work_key: workKey, p_result: outcome,
        }, signal),
      });
      for (let i = 0; i < 20 && !controller.signal.aborted; i++) {
        if ((await cleanup(controller.signal)).kind !== "deleted") break;
      }
    } catch { /* The retained queue provides recovery; a cleanup failure cannot undo publication. */ }
    finally { clearTimeout(timer); controller.abort(); }
  };
}
