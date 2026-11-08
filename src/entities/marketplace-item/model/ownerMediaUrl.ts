import { listingImageUrl, managedListingMedia } from "../../listing/model/listingMediaUrl";
import { isUploadUuid } from "../../listing/model/privatePublicationUpload";

/** Browser-visible references are immutable WEB routes, never storage paths or
 * credentials. A horse reference cannot accidentally use a listing's authority. */
export function managedHorseMedia(value: unknown): { attemptId: string; ordinal: string } | null {
  if (typeof value !== "string") return null;
  const match = /^\/api\/v2\/horse-(?:owner-)?media\/([0-9a-f-]{36})\/([0-9])$/.exec(value);
  return match && isUploadUuid(match[1]) ? { attemptId: match[1], ordinal: match[2] } : null;
}

export function ownerImageUrl(value: string | null, contentType: "listing" | "horse_offer"): string | null {
  if (contentType === "listing") return listingImageUrl(value);
  if (managedHorseMedia(value)) return value;
  // Existing legacy HTTP(S) photos remain displayable; another content type's
  // relative media route is not a horse image reference.
  return managedListingMedia(value) ? null : listingImageUrl(value);
}

export function ownerMediaRequestPath(value: string, contentType: "listing" | "horse_offer"): string | null {
  const target = contentType === "horse_offer" ? managedHorseMedia(value) : managedListingMedia(value);
  if (!target) return null;
  const route = contentType === "horse_offer" ? "horse-owner-media" : "listing-owner-media";
  return `/api/v2/${route}/${target.attemptId}/${target.ordinal}`;
}
