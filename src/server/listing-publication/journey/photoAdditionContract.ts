import { isUploadUuid, uploadRecord } from "../../../entities/listing/model/privatePublicationUpload";

const common = ["p_expected_user_id", "p_expected_identity_id", "p_listing_id", "p_attempt_id", "p_request_key"] as const;
const uuid = (value: unknown): value is string => typeof value === "string" && value.length === 36 && isUploadUuid(value);
export const photoAdditionActions = {
  "owner-images-add-prepare": {name: "prepare_my_managed_listing_image_addition_v1", keys: [...common, "p_expected_revision", "p_image"]},
  "owner-images-add-status": {name: "get_my_managed_listing_image_addition_v1", keys: common},
  "owner-images-add-append": {name: "append_my_managed_listing_image_v1", keys: [...common, "p_addition_attempt_id", "p_ready_id", "p_expected_revision"]},
  "owner-images-add-cancel": {name: "cancel_my_managed_listing_image_addition_v1", keys: common},
} as const;

export function isGalleryRevision(value: unknown): value is string {
  return typeof value === "string" && value.length <= 19 && /^(0|[1-9][0-9]*)$/.exec(value)?.[0] === value
    && BigInt(value) <= BigInt("9223372036854775807");
}

/** The listing's durable gallery ordinal differs from an upload's slot ordinal.
 * Active membership is capped in SQL; retired ordinals are never reused. */
export function isGalleryOrdinal(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 2147483647;
}

export function validatePhotoAdditionInput(action: string, input: Record<string, unknown>): void {
  if (!Object.hasOwn(photoAdditionActions, action)) return;
  if (!uuid(input.p_request_key)) throw new Error("input");
  if (action === "owner-images-add-status" || action === "owner-images-add-cancel") return;
  if (!isGalleryRevision(input.p_expected_revision)) throw new Error("input");
  if (action === "owner-images-add-append") {
    if (!uuid(input.p_addition_attempt_id) || !uuid(input.p_ready_id)) throw new Error("input");
    return;
  }
  let image: Record<string, unknown>;
  try { image = uploadRecord(input.p_image, ["client_file_id", "byte_length", "sha256"]); }
  catch { throw new Error("input"); }
  if (!uuid(image.client_file_id) || !Number.isSafeInteger(image.byte_length)
    || Number(image.byte_length) < 1 || Number(image.byte_length) > 26214400
    || typeof image.sha256 !== "string" || image.sha256.length !== 64
    || !/^[0-9a-f]{64}$/.test(image.sha256)) throw new Error("input");
}
