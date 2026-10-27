import "server-only";
import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { isUploadUuid } from "../../../entities/listing/model/privatePublicationUpload";
import { HOSTED_PREVIEW_RELEASE_ID, HOSTED_PREVIEW_STORAGE_CONTRACT,
  type HostedPreviewCapability } from "../../../shared/config/hostedPreviewProtocol";
import { isHostedPreviewConfig, type HostedPreviewConfig } from "./hostedPreviewConfig";

const readinessKeys = ["schema_version", "scope", "storage_contract", "cleanup_mode", "project_ref",
  "release_id", "instance_id", "enabled", "actor_user_id", "actor_allowed"].sort().join(",");

/** Decode the exact installed contract without treating a disabled write gate as
 * missing media authority. The returned flags still control every write path. */
async function readHostedPreviewContract(c: HostedPreviewConfig, expectedUserId: string | null,
    signal: AbortSignal | undefined, fetcher: UploadFetch): Promise<Readonly<{enabled: boolean; actorAllowed: boolean}>> {
  if (!isHostedPreviewConfig(c) || (expectedUserId !== null && !isUploadUuid(expectedUserId)))
    throw new Error("integration_unverified");
  const r = await privateUploadHttp(fetcher, c.projectOrigin + "/rest/v1/rpc/get_selqiro_hosted_preview_readiness_v1", {
    method: "POST", headers: {apikey: c.serviceKey, authorization: "Bearer " + c.serviceKey, "content-type": "application/json"},
    body: JSON.stringify({p_expected_project_ref: c.projectRef, p_expected_release_id: HOSTED_PREVIEW_RELEASE_ID,
      p_expected_instance_id: c.instanceId, p_expected_user_id: expectedUserId}),
  }, {signal, responseBytes: 4096, timeoutMs: 10000});
  if (r.status !== 200 || !r.json || typeof r.json !== "object" || Array.isArray(r.json))
    throw new Error("integration_unverified");
  const value = r.json as Record<string, unknown>;
  if (Object.keys(value).sort().join(",") !== readinessKeys || value.schema_version !== 1
      || value.scope !== "hosted-preview-v1" || value.storage_contract !== HOSTED_PREVIEW_STORAGE_CONTRACT
      || value.cleanup_mode !== "held" || value.project_ref !== c.projectRef
      || value.release_id !== HOSTED_PREVIEW_RELEASE_ID || value.instance_id !== c.instanceId
      || typeof value.enabled !== "boolean" || value.actor_user_id !== expectedUserId || typeof value.actor_allowed !== "boolean"
      || (expectedUserId === null && value.actor_allowed !== false)) throw new Error("integration_unverified");
  return {enabled: value.enabled, actorAllowed: value.actor_allowed};
}

/** Identify the installed release for an existing public image. This does not
 * assert bucket/write readiness or grant image access. The media handler must
 * still obtain a current public binding, verify its bytes/hash and recheck it. */
export async function assertHostedPreviewReadContract(c: HostedPreviewConfig,
    signal?: AbortSignal, fetcher: UploadFetch = fetch): Promise<void> {
  await readHostedPreviewContract(c, null, signal, fetcher);
}

/** Read the current release/instance marker on every application action. A valid
 * environment or a browser capability never substitutes for this database gate. */
export async function assertHostedPreviewReady(c: HostedPreviewConfig, expectedUserId: string | null = null,
    signal?: AbortSignal, fetcher: UploadFetch = fetch): Promise<void> {
  const value = await readHostedPreviewContract(c, expectedUserId, signal, fetcher);
  if (!value.enabled) throw new Error("integration_unverified");
  if (expectedUserId !== null && !value.actorAllowed) throw new Error("unauthorized");
}

/** The caller's expected ID is only a comparison target. Auth resolves the real
 * user first; the DB then checks that same user against its preview allowlist. */
export async function assertHostedPreviewActor(c: HostedPreviewConfig, token: string, expectedUserId: unknown,
    signal?: AbortSignal, fetcher: UploadFetch = fetch): Promise<void> {
  if (!isHostedPreviewConfig(c) || !isUploadUuid(expectedUserId)
      || typeof token !== "string" || !/^[A-Za-z0-9._-]{1,8192}$/.test(token)) throw new Error("unauthorized");
  const auth = await privateUploadHttp(fetcher, c.projectOrigin + "/auth/v1/user", {
    method: "GET", headers: {apikey: c.publicKey, authorization: "Bearer " + token},
  }, {signal, responseBytes: 65536, timeoutMs: 10000});
  if (auth.status !== 200 || !auth.json || typeof auth.json !== "object" || Array.isArray(auth.json))
    throw new Error("unauthorized");
  if ((auth.json as Record<string, unknown>).id !== expectedUserId) throw new Error("context_changed");
  await assertHostedPreviewReady(c, expectedUserId, signal, fetcher);
}

/** Only public target information crosses the RSC boundary after a current DB
 * check. This controls UI selection, never authorization of a later request. */
export async function hostedPreviewCapability(c: HostedPreviewConfig, signal?: AbortSignal,
    fetcher: UploadFetch = fetch): Promise<HostedPreviewCapability> {
  await assertHostedPreviewReady(c, null, signal, fetcher);
  return Object.freeze({schemaVersion: 1, mode: "hosted-preview-v1", releaseId: HOSTED_PREVIEW_RELEASE_ID,
    instanceId: c.instanceId, appOrigin: c.appOrigin, projectOrigin: c.projectOrigin, storageOrigin: c.storageOrigin});
}
