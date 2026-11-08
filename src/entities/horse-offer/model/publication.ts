import type { PublicationActor, PublicationSlot } from "../../listing/model/publicationJourney";
import { isUploadUuid, uploadRecord } from "../../listing/model/privatePublicationUpload";
import { isHorseDraftRevision } from "./draftEdit";
import type { SaveMyHorseOfferDraftInput } from "./types";
import type { OwnerHorseOfferEditSnapshot } from "./editSnapshot";
import { mapOwnerHorseOfferDetail } from "../api/mappers";
import type { HorseOfferPublicationConfirmationState } from "../../../features/listing-create/model/horseOfferPublicationGate";
import { getHorseOfferRequiredPublicationConfirmationKeys } from "../../../features/listing-create/model/horseOfferPublicationGate";

export type HorsePolicySnapshot = Readonly<{documentId: string; version: string; contentHash: string; accepted: true}>;
export type HorseGalleryIntent = Readonly<{imageId: string; isPrimary: boolean} | {
  clientFileId: string; byteLength: number; sha256: string; isPrimary: boolean;
}>;
export type HorsePrepareCommand = Readonly<{
  expectedUserId: string; expectedIdentityId: string; requestKey: string;
  offerId: string | null; expectedRevision: string | null;
  content: SaveMyHorseOfferDraftInput; gallery: readonly HorseGalleryIntent[];
  confirmations: HorseOfferPublicationConfirmationState; policySnapshot: readonly HorsePolicySnapshot[];
}>;
export type HorsePublicationResult = Readonly<{
  schema_version: 1; content_type: "horse_offer"; actor_user_id: string; identity_id: string; request_key: string;
  state: "prepared" | "published" | "cancelled" | "not_found";
  attempt_id: string | null; horse_offer_id: string | null; edit_revision: string | null;
  slots: readonly PublicationSlot[]; publication_event_id: string | null;
}>;
const sha = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{64}$/.test(v);
function invalid(): never { throw new Error("response"); }

/** The browser retains only the exact operation intent and byte proofs. A reload
 * cannot silently switch its actor, horse, policy version, or photo order. */
export function bindHorsePrepare(value: unknown, actor: PublicationActor, scope: string | null): HorsePrepareCommand {
  const r = uploadRecord(value);
  if (r.expectedUserId !== actor.userId || r.expectedIdentityId !== actor.identityId || !isUploadUuid(r.requestKey)
    || r.offerId !== scope || (scope === null ? r.expectedRevision !== null : !isHorseDraftRevision(r.expectedRevision))) return invalid();
  const c = uploadRecord(r.content) as unknown as SaveMyHorseOfferDraftInput;
  if (c.offerId !== scope || !["sale", "free_transfer", "lease", "co_rider", "wanted"].includes(c.offerType)
    || c.marketCountryCode !== "EE" || c.horseLocationCountryCode !== "EE" || c.currency !== "EUR"
    || typeof c.title !== "string" || !c.title.trim() || c.title.length > 140
    || typeof c.description !== "string" || !c.description.trim() || c.description.length > 5000) throw new Error("details_invalid");
  if (!Array.isArray(r.gallery) || r.gallery.length > 10) throw new Error("images_invalid");
  const ids = new Set<string>();
  for (const item of r.gallery) {
    const image = uploadRecord(item);
    if (typeof image.isPrimary !== "boolean") return invalid();
    const id = "imageId" in image ? image.imageId : image.clientFileId;
    if (!isUploadUuid(id) || ids.has(id)) return invalid();
    ids.add(id);
    if ("imageId" in image) {
      if (scope === null || Object.keys(image).some(k => !["imageId", "isPrimary"].includes(k))) return invalid();
    } else if (!Number.isSafeInteger(image.byteLength) || Number(image.byteLength) < 1 || Number(image.byteLength) > 25 * 1024 * 1024
      || !sha(image.sha256) || Object.keys(image).some(k => !["clientFileId", "byteLength", "sha256", "isPrimary"].includes(k))) return invalid();
  }
  if (r.gallery.length && r.gallery.filter(item => item.isPrimary).length !== 1) throw new Error("images_invalid");
  const confirmations = uploadRecord(r.confirmations);
  if (getHorseOfferRequiredPublicationConfirmationKeys(c.offerType).some(key => confirmations[key] !== true)) throw new Error("confirmations_required");
  if (!Array.isArray(r.policySnapshot) || r.policySnapshot.length !== 2) throw new Error("policies_required");
  const policies = r.policySnapshot.map(item => {
    const p = uploadRecord(item, ["documentId", "version", "contentHash", "accepted"]);
    if (!isUploadUuid(p.documentId) || typeof p.version !== "string" || !p.version || p.version.length > 100
      || !sha(p.contentHash) || p.accepted !== true) throw new Error("policies_required");
    return p;
  });
  if (new Set(policies.map(p => p.documentId)).size !== policies.length) throw new Error("policies_required");
  return JSON.parse(JSON.stringify(r)) as HorsePrepareCommand;
}

export function bindHorsePublicationResult(value: unknown, command: HorsePrepareCommand,
  knownAttempt: string | null = null): HorsePublicationResult {
  const r = uploadRecord(value);
  if (r.schema_version !== 1 || r.content_type !== "horse_offer" || r.actor_user_id !== command.expectedUserId
    || r.identity_id !== command.expectedIdentityId || r.request_key !== command.requestKey
    || !["prepared", "published", "cancelled", "not_found"].includes(String(r.state)) || !Array.isArray(r.slots)) return invalid();
  const empty = r.attempt_id === null;
  if (empty) {
    if (!["cancelled", "not_found"].includes(String(r.state)) || r.horse_offer_id !== null || r.edit_revision !== null
      || r.publication_event_id !== null || r.slots.length || knownAttempt) return invalid();
  } else {
    if (!isUploadUuid(r.attempt_id) || (knownAttempt !== null && r.attempt_id !== knownAttempt)
      || !isUploadUuid(r.horse_offer_id) || (command.offerId !== null && r.horse_offer_id !== command.offerId)
      || !isHorseDraftRevision(r.edit_revision)) return invalid();
    if (r.state === "published" ? !isUploadUuid(r.publication_event_id) : r.publication_event_id !== null) return invalid();
    const expected = command.gallery.map((image, ordinal) => ({image, ordinal})).filter(item => "clientFileId" in item.image);
    if (r.slots.length !== expected.length) return invalid();
    const slotIds = new Set<string>();
    r.slots.forEach((value: unknown, index: number) => {
      const slot = uploadRecord(value);
      const {image, ordinal} = expected[index];
      if (!("clientFileId" in image) || !isUploadUuid(slot.slot_id) || slotIds.has(slot.slot_id)
        || slot.ordinal !== ordinal || slot.client_file_id !== image.clientFileId
        || slot.expected_bytes !== image.byteLength || slot.expected_sha256 !== image.sha256) return invalid();
      slotIds.add(slot.slot_id as string);
    });
  }
  return Object.freeze({...r, slots: Object.freeze(r.slots.map((s: PublicationSlot) => Object.freeze({...s})))}) as HorsePublicationResult;
}

export function bindHorseOwnerSnapshot(value: unknown, actor: PublicationActor, offerId: string): OwnerHorseOfferEditSnapshot | null {
  // The RPC returns one atomic content/revision row. A missing row is not an editable fallback.
  if (value === null) return null;
  const row = uploadRecord(value);
  if (!isHorseDraftRevision(row.edit_revision)) return invalid();
  const detail = mapOwnerHorseOfferDetail(row);
  if (detail.offerId !== offerId || detail.contentId !== offerId || detail.identityId !== actor.identityId) return invalid();
  return {detail, editRevision: row.edit_revision as string};
}
