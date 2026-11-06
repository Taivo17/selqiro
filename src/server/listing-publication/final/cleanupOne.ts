import { randomUUID } from "node:crypto";
import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { publicationStorageOrigin, isUploadUuid } from "../../../entities/listing/model/privatePublicationUpload";
import { readWebObjectBytes } from "../web/webObjectHttp";
import { row, fail } from "./finalContract";

export type WorkerConfig = Readonly<{ projectOrigin: string; serviceKey: string }>;
export type CleanupOutcome = "deleted" | "network" | "timeout" | "storage" | "response";
export type CleanupResult = Readonly<{
  kind: "idle" | "deleted" | "retry_wait" | "needs_attention" | "reconcile";
}>;
export type CleanupOperations = Readonly<{
  claim(signal?: AbortSignal): Promise<unknown>;
  record(objectId: string, workKey: string, outcome: CleanupOutcome, signal?: AbortSignal): Promise<unknown>;
}>;

export function serviceConfig(c: WorkerConfig): Readonly<{ origin: string; headers: Record<string, string> }> {
  if (typeof window !== "undefined") return fail("configuration");
  let origin: string;
  try { origin = publicationStorageOrigin(c.projectOrigin); }
  catch { return fail("configuration"); }
  if (typeof c.serviceKey !== "string" || !c.serviceKey || c.serviceKey.length > 8192 || /\s/.test(c.serviceKey))
    return fail("configuration");
  return Object.freeze({ origin, headers: {
    apikey: c.serviceKey, authorization: "Bearer " + c.serviceKey, "content-type": "application/json",
  } });
}

/** One immutable claimed object. SQL owns eligibility, leases and bounded retries.
 * Explicit claim/record operations let a narrower contract reuse this transport
 * without rewriting HTTP URLs or duplicating Storage deletion behavior. */
export function createCleanupOne(config: WorkerConfig, fetcher: UploadFetch = fetch,
    operations?: CleanupOperations) {
  const { origin, headers } = serviceConfig(config);
  if (operations && (typeof operations.claim !== "function" || typeof operations.record !== "function"))
    return fail("configuration");

  return async function cleanupOne(signal?: AbortSignal): Promise<CleanupResult> {
    if (signal?.aborted) return Object.freeze({ kind: "reconcile" });
    const rpc = async (name: string, args: object) => {
      const r = await privateUploadHttp(fetcher, origin + "/rest/v1/rpc/" + name,
        { method: "POST", headers, body: JSON.stringify(args) }, { signal });
      if (r.status !== 200) return fail("outcome_unknown");
      return r.json;
    };
    let task: Record<string, unknown>;
    try {
      const claim = operations ? await operations.claim(signal) : await rpc("claim_listing_cleanup_v1", {});
      if (claim === null) return Object.freeze({ kind: "idle" });
      task = row(claim, ["schema_version", "object_id", "work_key", "bucket_id", "object_path", "try_count", "lease_until_epoch"]);
      const path = task.object_path, now = Math.floor(Date.now() / 1000);
      if (task.schema_version !== 1 || ![task.object_id, task.work_key].every(v => typeof v === "string" && v.length === 36 && isUploadUuid(v))
          || task.bucket_id !== "listing-publication-private" || typeof path !== "string"
          || path.match(/^v1\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/(?:source\.upload|web-v1\.webp)$/)?.[0] !== path
          || !path.split("/").slice(1, 3).every(isUploadUuid)
          || !Number.isSafeInteger(task.try_count) || Number(task.try_count) < 1 || Number(task.try_count) > 8
          || !Number.isSafeInteger(task.lease_until_epoch) || Number(task.lease_until_epoch) <= now + 55
          || Number(task.lease_until_epoch) > now + 65) return fail("response");
    } catch { return Object.freeze({ kind: "reconcile" }); }

    let outcome: CleanupOutcome = "storage";
    try {
      const r = await privateUploadHttp(fetcher, origin + "/storage/v1/object/" + task.bucket_id,
        { method: "DELETE", headers, body: JSON.stringify({ prefixes: [task.object_path] }) },
        { signal, timeoutMs: 10000 });
      if (r.status === 200 && Array.isArray(r.json) && r.json.length <= 1
          && r.json.every(value => row(value).name === task.object_path)) {
        // A fresh provider cacheNonce avoids reading a pre-delete cached body.
        // It is independent of the lease/work key and never changes the object path.
        // The scoped recorder still requires authoritative DB absence.
        const bytes = await readWebObjectBytes(fetcher,
          origin + "/storage/v1/object/authenticated/" + task.bucket_id + "/" + task.object_path
            + "?cacheNonce=" + randomUUID(),
          headers, 4 * 1024 * 1024, null, signal);
        outcome = bytes === null ? "deleted" : "response";
      }
    } catch { outcome = signal?.aborted ? "timeout" : "network"; }

    try {
      const saved = row(operations
        ? await operations.record(String(task.object_id), String(task.work_key), outcome, signal)
        : await rpc("record_listing_cleanup_v1", {
          p_object_id: task.object_id, p_work_key: task.work_key, p_result: outcome,
        }), ["object_id", "work_key", "state"]);
      if (saved.object_id !== task.object_id || saved.work_key !== task.work_key
          || !["deleted", "retry_wait", "needs_attention"].includes(String(saved.state))
          || (saved.state === "deleted") !== (outcome === "deleted")) return fail("response");
      return Object.freeze({ kind: saved.state as "deleted" | "retry_wait" | "needs_attention" });
    } catch { return Object.freeze({ kind: "reconcile" }); }
  };
}
