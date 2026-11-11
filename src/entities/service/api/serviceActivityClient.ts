import type {PublicationActor} from "../../listing/model/publicationJourney";
import {isUploadUuid} from "../../listing/model/privatePublicationUpload";
import {servicePublicationRequest} from "./servicePublicationClient";
import {bindServiceActivitySnapshot, bindServiceOwnerActivityPage, bindServiceOwnerActivitySnapshot,
  bindServiceRenewalResult, validateServiceRenewalInput, type ServiceRenewalInput} from "../model/serviceActivity";

const scope = (actor: PublicationActor, serviceId: string) => {
  if (!isUploadUuid(actor.userId) || !isUploadUuid(actor.identityId) || !isUploadUuid(serviceId)) throw new Error("details_invalid");
  return {expectedUserId: actor.userId, expectedIdentityId: actor.identityId, serviceId};
};

export async function readServiceOwnerActivity(actor: PublicationActor, serviceId: string, signal: AbortSignal) {
  const body = scope(actor, serviceId);
  return bindServiceOwnerActivitySnapshot(await servicePublicationRequest(actor, "owner-activity-read", body, signal), actor, serviceId);
}

export async function listServiceOwnerActivities(actor: PublicationActor, signal: AbortSignal, offset = 0, limit = 50) {
  if (!isUploadUuid(actor.userId) || !isUploadUuid(actor.identityId) || !Number.isSafeInteger(offset) || offset < 0 || offset > 1000000
    || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw new Error("details_invalid");
  return bindServiceOwnerActivityPage(await servicePublicationRequest(actor, "owner-activity-list", {
    expectedUserId: actor.userId, expectedIdentityId: actor.identityId, resultOffset: offset, resultLimit: limit,
  }, signal), actor, offset, limit);
}

export async function readServiceActivity(actor: PublicationActor, serviceId: string, signal: AbortSignal) {
  const body = scope(actor, serviceId);
  return bindServiceActivitySnapshot(await servicePublicationRequest(actor, "activity-read", body, signal), actor, serviceId);
}

/** Exactly one dispatch. A timeout, malformed reply or conflict needs an explicit owner read. */
export async function renewServiceActivity(input: ServiceRenewalInput, signal: AbortSignal) {
  validateServiceRenewalInput(input);
  const abort = new AbortController(), invalidated = () => abort.abort();
  signal.addEventListener("abort", invalidated, {once: true});
  const timeout = setTimeout(() => abort.abort(), 25_000);
  try {
    if (signal.aborted) throw new Error("context_changed");
    const result = await servicePublicationRequest(input.actor, "activity-renew", {
      ...scope(input.actor, input.serviceId), expectedActiveUntil: input.expectedActiveUntil,
    }, abort.signal);
    if (signal.aborted) throw new Error("context_changed");
    return bindServiceRenewalResult(result, input);
  } finally {clearTimeout(timeout); signal.removeEventListener("abort", invalidated);}
}
