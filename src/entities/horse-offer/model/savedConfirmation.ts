import type { PublicationActor } from "../../listing/model/publicationJourney";
import { isUploadUuid, uploadRecord } from "../../listing/model/privatePublicationUpload";
import type { HorseOfferType } from "../../../features/listing-create/model/horseOfferType";
import type { OwnerHorseOfferEditSnapshot } from "./editSnapshot";

/** Evidence returned with one authorized content/revision snapshot. It is not
 * a fresh statement by the editor and must never be converted into checked boxes. */
export type HorseSavedConfirmation = Readonly<{
  schemaVersion: 1;
  offerId: string;
  identityId: string;
  actorUserId: string;
  offerType: HorseOfferType;
  publicationEventId: string;
  confirmedAt: string;
}>;

export type HorseConfirmationReuse = Readonly<{ reusePublicationEventId: string }>;

const fields = ["schema_version", "offer_id", "identity_id", "actor_user_id", "offer_type",
  "publication_event_id", "confirmed_at"];
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

export function bindHorseSavedConfirmation(value: unknown, actor: PublicationActor,
  offerId: string, offerType: HorseOfferType, status: string): HorseSavedConfirmation | null {
  // Old snapshots and listings without durable evidence need an explicit confirmation.
  if (value === null || value === undefined) return null;
  const row = uploadRecord(value, fields);
  if (Object.keys(row).length !== fields.length || row.schema_version !== 1
    || row.offer_id !== offerId || row.identity_id !== actor.identityId || row.actor_user_id !== actor.userId
    || row.offer_type !== offerType || !["published", "paused", "closed"].includes(status)
    || !isUploadUuid(row.publication_event_id) || typeof row.confirmed_at !== "string"
    || !timestamp.test(row.confirmed_at) || !Number.isFinite(Date.parse(row.confirmed_at))) {
    throw new Error("response");
  }
  return Object.freeze({schemaVersion: 1, offerId, identityId: actor.identityId, actorUserId: actor.userId,
    offerType, publicationEventId: row.publication_event_id, confirmedAt: row.confirmed_at});
}

/** Recheck the UI boundary when a loaded form or active identity changes. The
 * server independently verifies this reference against the immutable event. */
export function applicableHorseSavedConfirmation(snapshot: OwnerHorseOfferEditSnapshot | null,
  actor: PublicationActor | null, offerType: HorseOfferType): HorseSavedConfirmation | null {
  const saved = snapshot?.savedConfirmation;
  if (!saved || !actor || !snapshot || saved.schemaVersion !== 1
    || saved.offerId !== snapshot.detail.offerId || saved.identityId !== snapshot.detail.identityId
    || saved.identityId !== actor.identityId || saved.actorUserId !== actor.userId
    || saved.offerType !== snapshot.detail.offerType || saved.offerType !== offerType
    || !["published", "paused", "closed"].includes(snapshot.detail.status)) return null;
  return saved;
}
