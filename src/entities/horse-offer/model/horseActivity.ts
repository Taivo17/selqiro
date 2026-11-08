import type { ListingStatus } from "../../listing/api/updateListingStatus";
import { LISTING_ACTIVITY_DAY_MS, LISTING_ACTIVITY_DAYS, listingDeadlineMicros } from "../../listing/model/listingActivity";
import { ListingRenewalError, type ListingActivityActor } from "../../listing/model/listingRenewal";
import { isUploadUuid, uploadRecord } from "../../listing/model/privatePublicationUpload";
import { isHorseDraftRevision } from "./draftEdit";
import { OWNER_HORSE_OFFER_STATUSES, type OwnerHorseOfferStatus } from "./types";

/** The same three owner choices use the horse domain's existing source states. */
export function horseActivityStatus(sourceStatus: string): ListingStatus | null {
  return sourceStatus === "published" ? "active" : sourceStatus === "paused" ? "paused"
    : sourceStatus === "closed" ? "sold" : null;
}

/** Older published horses have no stored deadline. The server applies this same
 * 90-day period from their original publication time; keep microseconds for CAS. */
export function horseActivityDeadline(activeUntil: string | null, publishedAt: string | null): string | null {
  if (activeUntil !== null) return activeUntil;
  const published = listingDeadlineMicros(publishedAt);
  if (published === null) return null;
  const until = published + BigInt(LISTING_ACTIVITY_DAYS * LISTING_ACTIVITY_DAY_MS) * BigInt(1000);
  const million = BigInt(1_000_000);
  const fraction = ((until % million) + million) % million;
  const wholeSeconds = (until - fraction) / million;
  const date = new Date(Number(wholeSeconds * BigInt(1000)));
  if (!Number.isFinite(date.getTime())) return null;
  const value = date.toISOString().replace(/\.000Z$/, `.${String(fraction).padStart(6, "0")}Z`);
  return listingDeadlineMicros(value) === until ? value : null;
}

export type HorseActivityInput = {
  offerId: string;
  expectedStatus: string;
  expectedActiveUntil: string | null;
  expectedActor: ListingActivityActor;
};
export type HorseStatusInput = HorseActivityInput & { status: ListingStatus };
export type HorseActivitySnapshot = Readonly<{
  offerId: string;
  actor: ListingActivityActor;
  sourceStatus: OwnerHorseOfferStatus;
  status: ListingStatus | null;
  activeUntil: string | null;
  editRevision: string;
  changed: boolean;
}>;

const fields = ["schema_version", "content_type", "content_id", "actor_user_id", "identity_id",
  "source_status", "status", "active_until", "edit_revision", "changed"] as const;

export function validateHorseActivityInput(input: HorseActivityInput): void {
  if (!isUploadUuid(input.offerId) || !isUploadUuid(input.expectedActor?.userId)
    || !isUploadUuid(input.expectedActor?.identityId) || !horseActivityStatus(input.expectedStatus)
    || listingDeadlineMicros(input.expectedActiveUntil) === null) {
    throw new ListingRenewalError("invalid");
  }
}

/** Strict identity-bound acknowledgement, never an optimistic status/deadline. */
export function parseHorseActivitySnapshot(value: unknown, actor: ListingActivityActor, offerId: string): HorseActivitySnapshot {
  try {
    const r = uploadRecord(value, fields);
    if (!isUploadUuid(offerId) || !isUploadUuid(actor.userId) || !isUploadUuid(actor.identityId)
      || r.schema_version !== 1 || r.content_type !== "horse_offer" || r.content_id !== offerId
      || r.actor_user_id !== actor.userId || r.identity_id !== actor.identityId
      || !OWNER_HORSE_OFFER_STATUSES.includes(r.source_status as OwnerHorseOfferStatus)
      || r.status !== horseActivityStatus(String(r.source_status)) || !isHorseDraftRevision(r.edit_revision)
      || typeof r.changed !== "boolean"
      || (r.status !== null && r.active_until === null)
      || (r.active_until !== null && listingDeadlineMicros(r.active_until) === null)) throw new Error("response");
    return Object.freeze({ offerId, actor: { ...actor }, sourceStatus: r.source_status as OwnerHorseOfferStatus,
      status: r.status as ListingStatus | null, activeUntil: r.active_until as string | null,
      editRevision: r.edit_revision as string, changed: r.changed });
  } catch { throw new ListingRenewalError("uncertain"); }
}

export function horseActivityMatchesRow(snapshot: HorseActivitySnapshot, input: HorseActivityInput): boolean {
  return snapshot.sourceStatus === input.expectedStatus
    && listingDeadlineMicros(snapshot.activeUntil) === listingDeadlineMicros(input.expectedActiveUntil)
    && (snapshot.activeUntil === null) === (input.expectedActiveUntil === null);
}

export function horseActivityError(error: unknown): ListingRenewalError {
  if (error instanceof ListingRenewalError) return error;
  const failure = error && typeof error === "object" ? error as { code?: unknown; message?: unknown } : null;
  if (failure?.code === "42501" || failure?.message === "context_changed") return new ListingRenewalError("forbidden");
  if (failure?.code === "40001" || failure?.message === "revision_conflict") return new ListingRenewalError("conflict");
  if (failure?.code === "55000") return new ListingRenewalError("status");
  if (failure?.code === "22023") return new ListingRenewalError("invalid");
  return new ListingRenewalError("uncertain");
}
