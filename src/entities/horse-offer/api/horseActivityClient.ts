import { horsePublicationRequest } from "./horsePublicationClient";
import { listingDeadlineMicros } from "../../listing/model/listingActivity";
import { ListingRenewalError } from "../../listing/model/listingRenewal";
import { horseActivityError, horseActivityMatchesRow, parseHorseActivitySnapshot, validateHorseActivityInput,
  type HorseActivityInput, type HorseStatusInput } from "../model/horseActivity";

/** One fresh revision read only when the owner explicitly acts. The displayed
 * status/deadline must still match before a single mutation is dispatched. */
async function change(input: HorseActivityInput, status?: HorseStatusInput["status"]) {
  validateHorseActivityInput(input);
  if (status !== undefined && !["active", "paused", "sold"].includes(status)) throw new ListingRenewalError("invalid");
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20_000);
  const actor = input.expectedActor;
  const scope = { expectedUserId: actor.userId, expectedIdentityId: actor.identityId, offerId: input.offerId };
  try {
    const before = parseHorseActivitySnapshot(await horsePublicationRequest(actor, "owner-activity", scope, controller.signal), actor, input.offerId);
    if (before.changed || !horseActivityMatchesRow(before, input)) throw new ListingRenewalError("conflict");
    if (status === undefined && before.status !== "active") throw new ListingRenewalError("status");
    if (controller.signal.aborted) throw new ListingRenewalError("uncertain");
    const action = status === undefined ? "owner-renew" : "owner-set-status";
    const result = parseHorseActivitySnapshot(await horsePublicationRequest(actor, action, {
      ...scope, expectedRevision: before.editRevision, expectedStatus: before.sourceStatus,
      expectedActiveUntil: before.activeUntil, ...(status === undefined ? {} : { status }),
    }, controller.signal), actor, input.offerId);
    const previousDeadline = listingDeadlineMicros(before.activeUntil), nextDeadline = listingDeadlineMicros(result.activeUntil);
    const nextRevision = BigInt(result.editRevision), previousRevision = BigInt(before.editRevision);
    if (result.status !== (status ?? "active")
      || (result.changed ? nextRevision <= previousRevision : nextRevision !== previousRevision)
      || (status === undefined
        ? result.changed ? previousDeadline === null || nextDeadline === null || nextDeadline <= previousDeadline : nextDeadline !== previousDeadline
        : nextDeadline !== previousDeadline || result.changed !== (before.status !== status))) {
      throw new ListingRenewalError("uncertain");
    }
    return result;
  } catch (error) { throw horseActivityError(error); }
  finally { clearTimeout(timer); }
}

export const renewMyHorseActivity = (input: HorseActivityInput) => change(input);
export const updateMyHorseStatus = (input: HorseStatusInput) => change(input, input.status);
