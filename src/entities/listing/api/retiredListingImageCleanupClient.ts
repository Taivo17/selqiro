import {publicationJourneyRequest} from "./publicationJourneyClient";
import {bindRetiredImageCleanupKey, retiredImageCleanupStatus, type RetiredImageCleanupKey} from "../model/retiredListingImageCleanup";

/** Reading a diagnostic never claims a lease or starts Storage cleanup. */
export async function readRetiredListingImageCleanup(input: RetiredImageCleanupKey, signal: AbortSignal) {
  const key = bindRetiredImageCleanupKey(input);
  const value = await publicationJourneyRequest({userId: key.userId, identityId: key.identityId},
    "owner-retired-images-status", {p_expected_user_id: key.userId, p_expected_identity_id: key.identityId,
      p_attempt_id: key.attemptId, p_request_key: key.requestKey}, signal);
  return retiredImageCleanupStatus(value, key);
}
