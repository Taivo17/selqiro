import "server-only";
import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { isUploadUuid, uploadRecord } from "../../../entities/listing/model/privatePublicationUpload";
import { isId, receipt } from "../final/finalContract";
import { createSettleHostedSourceOne } from "../final/settleHostedSourceOne";
import { isGalleryOrdinal, isGalleryRevision } from "./photoAdditionContract";

type SourceConfig = Readonly<{projectOrigin: string; publicKey: string; serviceKey: string}>;
type Scope = Readonly<{userId: string; identityId: string; listingId: string; attemptId: string}>;
export type AfterPublicationResponse = (work: () => Promise<void>) => void;
const uuid = (value: unknown): value is string => typeof value === "string" && value.length === 36 && isUploadUuid(value);

export function photoAdditionSourceScope(input: Record<string, unknown>): Scope {
  const scope = {userId: input.p_expected_user_id, identityId: input.p_expected_identity_id,
    listingId: input.p_listing_id, attemptId: input.p_attempt_id};
  if (![scope.userId, scope.identityId, scope.attemptId].every(uuid) || !isId(scope.listingId)) throw new Error("input");
  return Object.freeze(scope) as Scope;
}

/** An optional completion pass needs a bound permanent append receipt. The
 * client's full gallery validation still decides what it may display. */
export function hasCommittedPhotoAppend(value: unknown, input: Record<string, unknown>): boolean {
  try {
    const result = uploadRecord(value), saved = uploadRecord(result.receipt), snapshot = uploadRecord(result.snapshot);
    return result.schema_version === 1 && result.listing_id === input.p_listing_id
      && result.attempt_id === input.p_attempt_id && result.request_key === input.p_request_key
      && saved.schema_version === 1 && saved.listing_id === input.p_listing_id
      && saved.attempt_id === input.p_attempt_id && saved.request_key === input.p_request_key
      && saved.actor_user_id === input.p_expected_user_id && saved.identity_id === input.p_expected_identity_id
      && saved.addition_attempt_id === input.p_addition_attempt_id && saved.ready_id === input.p_ready_id
      && uuid(saved.slot_id) && isGalleryOrdinal(saved.ordinal) && isGalleryRevision(saved.attached_revision)
      && saved.attached_revision !== "0" && typeof saved.was_primary === "boolean"
      && saved.media_attempt_id === input.p_addition_attempt_id && saved.media_ordinal === 0
      && saved.url === `/api/v2/listing-media/${input.p_addition_attempt_id}/0`
      && typeof saved.attached_at === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(saved.attached_at)
      && Number.isFinite(Date.parse(saved.attached_at))
      && new Date(saved.attached_at).toISOString() === saved.attached_at.slice(0, 23) + "Z"
      && snapshot.attempt_id === input.p_addition_attempt_id && snapshot.request_key === input.p_request_key
      && snapshot.actor_user_id === input.p_expected_user_id && snapshot.identity_id === input.p_expected_identity_id
      && ["published", "deleted"].includes(String(snapshot.state));
  } catch { return false; }
}

/** Reuse one existing SOURCE claim/delete/record. A fresh owner receipt, rather
 * than a Storage ACK, must show completion before prepare may be tried again. */
export function createPublishedSourceCompletion(config: SourceConfig, fetcher: UploadFetch = fetch) {
  const settleSource = createSettleHostedSourceOne(config, fetcher);
  return async function completeOne(accessToken: string, scope: Scope, signal?: AbortSignal): Promise<boolean> {
    const controller = new AbortController(), abort = () => controller.abort();
    signal?.addEventListener("abort", abort, {once: true});
    if (signal?.aborted) abort();
    const timer = setTimeout(abort, 20_000);
    try {
      if (![scope.userId, scope.identityId, scope.attemptId].every(uuid) || !isId(scope.listingId)
        || accessToken.match(/^[A-Za-z0-9._-]{1,8192}$/)?.[0] !== accessToken) return false;
      const read = async () => {
        const result = await privateUploadHttp(fetcher, config.projectOrigin + "/rest/v1/rpc/get_my_managed_listing_v2", {
          method: "POST", headers: {apikey: config.publicKey, authorization: "Bearer " + accessToken,
            "content-type": "application/json"},
          body: JSON.stringify({p_expected_user_id: scope.userId, p_expected_identity_id: scope.identityId,
            p_listing_id: scope.listingId}),
        }, {signal: controller.signal, responseBytes: 65536, timeoutMs: 5000});
        if (result.status !== 200) throw new Error("outcome_unknown");
        const owner = uploadRecord(result.json, ["receipt", "activity", "images"]);
        // An authorized business member may differ from the original publisher.
        return receipt(owner.receipt, {identityId: scope.identityId, attemptId: scope.attemptId, listingId: scope.listingId});
      };
      const before = await read();
      if (before.state !== "published" || before.files_remaining === 0) return false;
      await settleSource(accessToken, {expectedUserId: scope.userId, expectedIdentityId: scope.identityId,
        attemptId: scope.attemptId, requestKey: before.request_key}, controller.signal);
      const after = await read();
      return after.state === "published" && after.request_key === before.request_key
        && after.actor_user_id === before.actor_user_id && after.published_at === before.published_at
        && after.files_remaining < before.files_remaining;
    } catch { return false; }
    finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); controller.abort(); }
  };
}
