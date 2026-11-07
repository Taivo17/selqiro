"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingCreateMessages, translateListingCreateMessage } from "../model/listingCreateMessages";
import { useState } from "react";
import { getHorseDraftActor } from "../../../entities/horse-offer/api/getHorseDraftActor";
import { saveMyHorseOfferDraft } from "../../../entities/horse-offer/api/saveMyHorseOfferDraft";
import { updateMyHorseOfferDraft } from "../../../entities/horse-offer/api/updateMyHorseOfferDraft";
import { ListingCreateDrafts } from "../model/listingCreateDrafts";
import { useOrdinaryPublication } from "../model/useOrdinaryPublication";
import ListingCreateIdentityForm from "./ListingCreateIdentityForm";

function ContextState({ publication }: { publication: ReturnType<typeof useOrdinaryPublication> }) {
  const { language, t } = useV2Translation(listingCreateMessages);

  return <section className="rounded-[34px] border border-amber-200 bg-amber-50 p-7 sm:p-10">
    <h1 className="text-3xl font-black tracking-tight">{t("addListing")}</h1>
    <p role="status" className="mt-3 text-sm">{publication.contextError ? translateListingCreateMessage(language, publication.contextError) : t("checkingIdentity")}</p>
    {publication.contextError ? <button type="button" className="mt-5 rounded-full bg-black px-5 py-3 font-bold text-white"
      onClick={publication.retryContext}>{t("checkIdentity")}</button> : null}
  </section>;
}

export default function ListingCreateForm({ userId }: { userId: string }) {
  const { language, t } = useV2Translation(listingCreateMessages);

  const [drafts] = useState(() => new ListingCreateDrafts(userId, {
    actor: getHorseDraftActor, create: saveMyHorseOfferDraft, update: updateMyHorseOfferDraft,
  }));
  const publication = useOrdinaryPublication(userId, { suspend: drafts.suspend, accountChanged: drafts.close });
  if (!publication.actor) return <ContextState publication={publication} />;
  const actor = publication.actor, visible = publication.ownsForm(actor);
  // Keep same-actor photo inputs mounted during focus checks. On a hard context
  // change, hide the previous identity's values until the actor is verified.
  return <>
    {!visible ? <ContextState publication={publication} /> : null}
    <div hidden={!visible}>
      <ListingCreateIdentityForm key={`${actor.userId}:${actor.identityId}`} userId={userId}
        entry={drafts.forActor(actor)} publication={publication} />
    </div>
  </>;
}
