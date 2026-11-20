import "server-only";
import { randomUUID } from "node:crypto";
import { PROFILE_MEDIA_LIMITS, profileMediaRecord, profileMediaUuid } from "../../entities/profile/model/profileMedia";
import { createMediaTransport, type MessageMediaConfig, type MessageMediaFetch, type MessageMediaTransport } from "../messaging-media/transport";

function absent(result: { status: number; bytes: Uint8Array }): boolean {
  if (result.status === 404) return true;
  if (result.status !== 400 || result.bytes.length > 1024) return false;
  try {
    // Existing Storage's native REST response is HTTP 400 with NoSuchKey/404.
    // No generic 400, delete acknowledgement or SQL row disappearance proves absence.
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(result.bytes));
    const withCode = value !== null && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "code");
    const r = profileMediaRecord(value, withCode ? ["statusCode", "code", "error", "message"] : ["statusCode", "error", "message"], "response");
    return r.statusCode === "404" && (!withCode || r.code === "NoSuchKey") && r.error === "not_found" && r.message === "Object not found";
  } catch { return false; }
}

/** Only the private registry can claim new managed keys. Public-reference removal
 * is already committed before this best-effort follow-up; an uncertain delete
 * retains its durable claim. This observes current-key absence, not historical
 * storage versions or copies outside Selqiro. Legacy files are never candidates. */
export async function runProfileMediaMaintenance(config: MessageMediaConfig, fetcher: MessageMediaFetch = fetch,
  signal?: AbortSignal, injectedTransport?: MessageMediaTransport): Promise<void> {
  const controller = new AbortController(), abort = () => controller.abort();
  if (signal?.aborted) return;
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 15000);
  try {
    const transport = injectedTransport ?? createMediaTransport(config, fetcher), claimId = randomUUID();
    const result = await transport.rpc("claim_profile_media_cleanup_v1", { p_claim_id: claimId }, null, controller.signal);
    if (!Array.isArray(result) || result.length > 4) return;
    const seen = new Set<string>();
    const claims = result.map(value => {
      const r = profileMediaRecord(value, ["asset_id", "object_name", "claim_id"], "response");
      if (!profileMediaUuid(r.asset_id) || r.claim_id !== claimId || typeof r.object_name !== "string" || seen.has(r.asset_id)) throw new Error("claim");
      const parts = r.object_name.split("/");
      if (parts.length !== 3 || parts[0] !== "managed-profile-v1" || !profileMediaUuid(parts[1]) || parts[2] !== r.asset_id + ".webp") throw new Error("claim");
      seen.add(r.asset_id);
      return { assetId: r.asset_id, path: r.object_name };
    });
    for (const claim of claims) {
      if (controller.signal.aborted) return;
      try {
        try { await transport.deleteObject("identity-media", claim.path, controller.signal); }
        catch { if (controller.signal.aborted) return; }
        if (!absent(await transport.readObject("identity-media", claim.path, PROFILE_MEDIA_LIMITS.coverBytes, controller.signal))) continue;
        const completed = profileMediaRecord(await transport.rpc("finish_profile_media_cleanup_v1", { p_asset_id: claim.assetId,
          p_claim_id: claimId }, null, controller.signal), ["asset_id", "claim_id", "status"], "response");
        if (completed.asset_id !== claim.assetId || completed.claim_id !== claimId || completed.status !== "deleted") return;
      } catch { /* Keep the claimed record for a later authenticated follow-up. */ }
    }
  } catch { /* Maintenance cannot invalidate a successful profile operation. */ }
  finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); controller.abort(); }
}
