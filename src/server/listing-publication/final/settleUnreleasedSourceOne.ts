import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { isUploadUuid } from "../../../entities/listing/model/privatePublicationUpload";
import { serviceConfig, type WorkerConfig } from "./cleanupOne";
import { row } from "./finalContract";

/** One database-only settlement, never an upload/revocation/delete or provider probe.
 * The unchanged issuer must persist its token BEFORE reading it through the owner RPC.
 * SQL seals only a terminal attempt's still-signing grant with NO recorded token/hash.
 * An already recorded grant stays blocked even when its token was never retrieved,
 * expired or purged. Lost acknowledgement is "reconcile", never fabricated success.
 */
export function createSettleUnreleasedSourceOne(config: WorkerConfig, fetcher: UploadFetch = fetch) {
  const { origin, headers } = serviceConfig(config);
  if (typeof fetcher !== "function") throw new TypeError("invalid_fetcher");
  return async function settleUnreleasedSourceOne(signal?: AbortSignal): Promise<Readonly<{
    kind: "idle" | "settled" | "reconcile";
  }>> {
    if (signal?.aborted) return Object.freeze({ kind: "reconcile" });
    try {
      const response = await privateUploadHttp(fetcher,
        origin + "/rest/v1/rpc/settle_unreleased_listing_source_one_v1",
        { method: "POST", headers, body: "{}" }, { signal });
      if (response.status !== 200) return Object.freeze({ kind: "reconcile" });
      if (response.json === null) return Object.freeze({ kind: "idle" });
      const r = row(response.json, ["schema_version", "object_id", "grant_id", "claim_id", "proof", "state"]);
      if (r.schema_version !== 1 || ![r.object_id, r.grant_id, r.claim_id].every(isUploadUuid) ||
          r.proof !== "source_signing_never_released" || r.state !== "settled") {
        return Object.freeze({ kind: "reconcile" });
      }
      return Object.freeze({ kind: "settled" });
    } catch {
      return Object.freeze({ kind: "reconcile" });
    }
  };
}
