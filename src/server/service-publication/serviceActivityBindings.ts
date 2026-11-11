import { isUploadUuid, uploadRecord } from "../../entities/listing/model/privatePublicationUpload";
import { listingDeadlineMicros } from "../../entities/listing/model/listingActivity";
import {
  bindServiceActivitySnapshot, bindServiceOwnerActivityPage,
  bindServiceOwnerActivitySnapshot, bindServiceRenewalResult,
} from "../../entities/service/model/serviceActivity";

export const serviceValidityActions = new Set([
  "owner-activity-read", "owner-activity-list", "activity-read", "activity-renew",
]);

const uuid = (value: unknown): value is string => typeof value === "string"
  && value.length === 36 && isUploadUuid(value);
const exactInput = (value: Record<string, unknown>, keys: readonly string[]) => {
  try { uploadRecord(value, keys); } catch { throw new Error("input"); }
};

/** The deadline is an opaque compare-and-swap value. Keep every microsecond
 * from the owner read; never accept a caller-supplied new deadline or clock. */
export function bindServiceValidityCommand(action: string, input: Record<string, unknown>) {
  if (!serviceValidityActions.has(action)) return null;
  if (!uuid(input.expectedUserId) || !uuid(input.expectedIdentityId)) throw new Error("input");
  const actor = { p_expected_user_id: input.expectedUserId, p_expected_identity_id: input.expectedIdentityId };
  if (action === "owner-activity-list") {
    exactInput(input, ["expectedUserId", "expectedIdentityId", "resultLimit", "resultOffset"]);
    if (!Number.isSafeInteger(input.resultLimit) || Number(input.resultLimit) < 1 || Number(input.resultLimit) > 50
      || !Number.isSafeInteger(input.resultOffset) || Number(input.resultOffset) < 0
      || Number(input.resultOffset) > 1000000) throw new Error("input");
    return { name: "get_my_service_publications_v2", args: { ...actor,
      p_result_limit: input.resultLimit, p_result_offset: input.resultOffset } };
  }
  exactInput(input, ["expectedUserId", "expectedIdentityId", "serviceId",
    ...(action === "activity-renew" ? ["expectedActiveUntil"] : [])]);
  if (!uuid(input.serviceId)) throw new Error("input");
  if (action === "activity-renew") {
    if (listingDeadlineMicros(input.expectedActiveUntil) === null) throw new Error("input");
    return { name: "renew_my_service_activity_v1", args: { ...actor,
      p_service_id: input.serviceId, p_expected_active_until: input.expectedActiveUntil } };
  }
  return { name: action === "activity-read" ? "get_my_service_activity_v1" : "get_my_service_publication_snapshot_v2",
    args: { ...actor, p_service_id: input.serviceId } };
}

/** Every ACK is actor-, identity- and service-bound before the HTTP layer may
 * return it. This does not adopt a new editor draft or change publication state. */
export function bindServiceValidityResponse(action: string, value: unknown, input: Record<string, unknown>): boolean {
  if (!serviceValidityActions.has(action)) return false;
  const actor = { userId: String(input.expectedUserId), identityId: String(input.expectedIdentityId) };
  const serviceId = String(input.serviceId);
  if (action === "owner-activity-list") {
    bindServiceOwnerActivityPage(value, actor, Number(input.resultOffset), Number(input.resultLimit));
  } else if (action === "owner-activity-read") {
    bindServiceOwnerActivitySnapshot(value, actor, serviceId);
  } else if (action === "activity-read") {
    bindServiceActivitySnapshot(value, actor, serviceId);
  } else {
    bindServiceRenewalResult(value, { actor, serviceId, expectedActiveUntil: String(input.expectedActiveUntil) });
  }
  return true;
}
