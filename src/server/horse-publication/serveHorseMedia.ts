import { createManagedMediaHandler, type ManagedMediaOwner, type ListingMediaFailure } from "../listing-publication/final/serveListingMedia";
import type { WorkerConfig } from "../listing-publication/final/cleanupOne";
import type { UploadFetch } from "../../entities/listing/api/privateUploadHttp";

/** Same immutable WEB bytes and post-read membership check as ordinary listings,
 * backed exclusively by the canonical horse gallery and its publication event. */
export function createHorseMediaHandler(config: WorkerConfig, fetcher: UploadFetch = fetch,
    owner?: ManagedMediaOwner, onFailure?: (failure: ListingMediaFailure) => void) {
  return createManagedMediaHandler("horse_offer", config, fetcher, owner, onFailure);
}
