import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { isUploadUuid } from "../../../entities/listing/model/privatePublicationUpload";
import { serviceConfig, type WorkerConfig } from "./cleanupOne";
import { row } from "./finalContract";

/** One DB-only settlement for a terminal, recorded SOURCE grant tracked from birth
 * by this protocol, with NO committed release intent. Unknown historical grants and
 * every released/uncertain-delivery intent remain blocked, even after expiry/purge.
 * This is not token revocation, provider quiescence, deletion or a readiness proof. */
export function createSettleRecordedSourceOne(config: WorkerConfig, fetcher: UploadFetch = fetch) {
  const { origin, headers } = serviceConfig(config);
  if (typeof fetcher !== "function") throw new TypeError("invalid_fetcher");
  return async function settleRecordedSourceOne(signal?: AbortSignal): Promise<Readonly<{
    kind: "idle" | "settled" | "reconcile";
  }>> {
    if (signal?.aborted) return Object.freeze({ kind: "reconcile" });
    try {
      const response = await privateUploadHttp(fetcher,
        origin + "/rest/v1/rpc/settle_recorded_unreleased_source_one_v1",
        { method: "POST", headers, body: "{}" }, { signal });
      if (response.status !== 200) return Object.freeze({ kind: "reconcile" });
      if (response.json === null) return Object.freeze({ kind: "idle" });
      const r = row(response.json, ["schema_version", "object_id", "grant_id", "claim_id", "proof", "state"]);
      if (r.schema_version !== 1 || ![r.object_id, r.grant_id, r.claim_id].every(isUploadUuid) ||
          r.proof !== "source_recorded_never_released" || r.state !== "settled") {
        return Object.freeze({ kind: "reconcile" });
      }
      return Object.freeze({ kind: "settled" });
    } catch {
      return Object.freeze({ kind: "reconcile" });
    }
  };
}
