import "server-only";
import { randomUUID } from "node:crypto";
import { imageRecord, imageUuid } from "../../entities/conversation/model/messageImage";
import { createMediaTransport, type MessageMediaConfig, type MessageMediaFetch, type MessageMediaTransport } from "./transport";

/** Internal, authenticated-operation follow-up only. SQL atomically tombstones
 * expired unattached reservations and excludes attached/V1 images. A successful
 * removal is an observation, never proof that a delayed provider write cannot
 * arrive: SQL keeps every tombstone and schedules another check. */
export async function runMessageImageMaintenance(config: MessageMediaConfig, fetcher: MessageMediaFetch = fetch,
  signal?: AbortSignal, injectedTransport?: MessageMediaTransport): Promise<void> {
  const controller = new AbortController(); const abort = () => controller.abort();
  if (signal?.aborted) return;
  signal?.addEventListener("abort", abort, { once: true }); const timer = setTimeout(abort, 3000);
  try {
    const transport = injectedTransport ?? createMediaTransport(config, fetcher);
    const claimKey = randomUUID();
    const result = imageRecord(await transport.rpc("claim_message_photo_cleanup_v2", { p_claim_key: claimKey, p_limit: 3 }, null, controller.signal), "response");
    if (result.schema_version !== 2 || !Array.isArray(result.claims) || result.claims.length > 3) return;
    for (const item of result.claims) {
      if (controller.signal.aborted) return;
      const claim = imageRecord(item, "response");
      if (!imageUuid(claim.attachment_id) || claim.bucket !== "message-attachments-v2" || claim.cleanup_key !== claimKey
        || typeof claim.path !== "string" || !new RegExp("^[1-9][0-9]{0,18}/" + claim.attachment_id + "\\.webp$").test(claim.path)) continue;
      let removed = false;
      try { const response = await transport.deleteObject(claim.bucket, claim.path, controller.signal);
        removed = response.status === 200 || response.status === 204 || response.status === 404; }
      catch { /* Retain the leased tombstone; a later authenticated operation rechecks it. */ }
      if (controller.signal.aborted) return;
      try { await transport.rpc("finish_message_photo_cleanup_v2", { p_attachment_id: claim.attachment_id,
        p_claim_key: claimKey, p_removed: removed, p_failure_code: removed ? null : "STORAGE_OUTCOME_UNKNOWN" }, null, controller.signal); }
      catch { /* Unknown SQL acknowledgement also retains the durable claim. */ }
    }
  } catch { /* Maintenance never turns a successfully sent/read message into failure. */ }
  finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); controller.abort(); }
}
