import { isUploadUuid } from "../../../entities/listing/model/privatePublicationUpload";
import { webFail, webRecord, type WebBinding, type WebIntent } from "./webImageContract";

/** Internal server-only call site: invoked ONLY after the complete successful
 * response of the one DB-authorized WEB POST. Not a browser completion API.
 * This is a transport completion receipt, NOT image readiness and NOT proof that
 * arbitrary service-key holders cannot write. Exclusive writer rollout remains a gate.
 */
export async function recordWebWriteCompletion(
  rpc: (name: string, args: object) => Promise<unknown>,
  acknowledgement: unknown,
  binding: WebBinding,
  intent: WebIntent,
  claimId: unknown,
): Promise<void> {
  if (typeof window !== "undefined") return webFail("configuration");
  const ack = webRecord(acknowledgement, ["Id", "Key"]);
  if (!isUploadUuid(claimId) || !isUploadUuid(ack.Id) ||
      ack.Key !== binding.bucket_id + "/" + binding.web_path) return webFail("invalid_response");
  const storageObjectId = ack.Id, storageKey = ack.Key; // detach validated primitives before await
  const receipt = webRecord(await rpc("record_listing_web_write_completed_v1", {
    p_expected_user_id: binding.actor_user_id,
    p_expected_identity_id: binding.identity_id,
    p_attempt_id: binding.attempt_id,
    p_slot_id: binding.slot_id,
    p_job_id: binding.job_id,
    p_claim_id: claimId,
    p_web_object_id: binding.web_object_id,
    p_storage_object_id: storageObjectId,
    p_storage_key: storageKey,
    p_sent_sha256: intent.web_sha256,
    p_sent_bytes: intent.web_bytes,
  }), ["schema_version", "job_id", "web_object_id", "storage_object_id", "completed"]);
  if (receipt.schema_version !== 1 || receipt.job_id !== binding.job_id ||
      receipt.web_object_id !== binding.web_object_id || receipt.storage_object_id !== storageObjectId ||
      receipt.completed !== true) return webFail("invalid_response");
}
