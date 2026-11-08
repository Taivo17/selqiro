"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { OwnerHorseDraftForm } from "../model/ownerHorseDraftForm";
import { hasPrivateHorseLocation, ownerHorseDraftDirty, prepareOwnerHorseDraftForm } from "../model/ownerHorseDraftForm";
import { useHorseOwnerContext } from "../model/useHorseOwnerContext";
import { useHorsePublication } from "../../horse-publication/model/useHorsePublication";
import { horsePublicationMessages } from "../../horse-publication/model/horsePublicationMessages";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import type { HorsePolicySnapshot } from "../../../entities/horse-offer/model/publication";
import { buildHorseOfferDraftSaveInput } from "../../listing-create/model/horseOfferDraftSave";
import { applyHorseOfferPublicationConfirmationGroupChange, createHorseOfferPublicationConfirmationState,
  getHorseOfferPublicationConfirmationProgress } from "../../listing-create/model/horseOfferPublicationGate";
import HorseOfferPublicationGate from "../../listing-create/components/HorseOfferPublicationGate";
import HorsePublicationAction from "../../horse-publication/components/HorsePublicationAction";
import OwnerHorseOfferEditFields from "./OwnerHorseOfferEditFields";
import OwnerHorseGalleryEditor, {horseEditorGalleryDirty, horseEditorPhotos, type HorseEditorPhoto} from "./OwnerHorseGalleryEditor";
import { horseActivityDeadline } from "../../../entities/horse-offer/model/horseActivity";
import { getListingActivity } from "../../../entities/listing/model/listingActivity";
import { applicableHorseSavedConfirmation } from "../../../entities/horse-offer/model/savedConfirmation";
import type { OwnerHorseOfferEditSnapshot } from "../../../entities/horse-offer/model/editSnapshot";

const button = "rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-black disabled:opacity-40";

export default function OwnerHorseOfferEditor({userId, offerId}: {userId: string; offerId: string}) {
  const {t} = useV2Translation(horsePublicationMessages);
  const context = useHorseOwnerContext(userId, offerId);
  const publication = useHorsePublication(context.actor, offerId, context.active, context.canAct);
  const [baseline, setBaseline] = useState<OwnerHorseDraftForm | null>(null);
  const [form, setForm] = useState<OwnerHorseDraftForm | null>(null);
  const [photos, setPhotos] = useState<HorseEditorPhoto[]>([]);
  const [confirmations, setConfirmations] = useState(createHorseOfferPublicationConfirmationState);
  const [policies, setPolicies] = useState<readonly HorsePolicySnapshot[] | null>(null);
  const [localError, setLocalError] = useState("");
  const [formSnapshot, setFormSnapshot] = useState<OwnerHorseOfferEditSnapshot | null>(null);
  const submittedRequest = useRef<string | null>(null);
  const completion = useRef<{snapshot: OwnerHorseOfferEditSnapshot; preserveDraft: boolean} | null>(null);
  const detail = context.snapshot?.detail;
  useEffect(() => {
    if (!context.snapshot) return;
    const next = prepareOwnerHorseDraftForm(context.snapshot.detail);
    setBaseline(next); setForm(next); setPhotos(horseEditorPhotos(context.snapshot.detail.images));
    setConfirmations(createHorseOfferPublicationConfirmationState()); setLocalError("");
    setFormSnapshot(context.snapshot);
  }, [context.snapshot]);
  const dirty = !!(baseline && form && detail && (ownerHorseDraftDirty(baseline, form) || horseEditorGalleryDirty(detail.images, photos)));
  const working = publication.view.phase === "busy";
  const locked = publication.view.phase !== "editing";
  const supportedStatus = !!detail && ["draft", "published", "paused", "closed"].includes(detail.status);
  const editable = !!(supportedStatus && form && context.active && context.ready && publication.session
    && formSnapshot === context.snapshot && !locked);
  const confirmed = publication.view.confirmed, requestKey = publication.view.result?.request_key;
  const {active, canAct, snapshot, adopt} = context;
  const {session} = publication;
  const phase = publication.view.phase;
  useEffect(() => {
    if (phase !== "published" || !confirmed || !session || !active || !canAct()) return;
    if (completion.current?.snapshot !== confirmed) {
      // A different tab's completed intent must never replace this tab's
      // unsaved values or silently attach its newer revision to those values.
      const preserveDraft = dirty && requestKey !== submittedRequest.current;
      completion.current = {snapshot: confirmed, preserveDraft};
      if (!preserveDraft) adopt(confirmed);
    }
    if (!completion.current.preserveDraft && (snapshot !== confirmed || formSnapshot !== confirmed)) return;
    void session.finishEdit(confirmed, completion.current.preserveDraft);
  }, [phase, confirmed, requestKey, session, active, canAct, adopt, snapshot, formSnapshot, dirty]);
  const savedConfirmation = context.active && form
    ? applicableHorseSavedConfirmation(context.snapshot, context.actor, form.offerType) : null;
  const publiclyActive = detail?.status === "published" && getListingActivity("active",
    horseActivityDeadline(detail.activeUntil, detail.publishedAt)).state === "active"
    && horseActivityDeadline(detail.activeUntil, detail.publishedAt) !== null;
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", unload); return () => window.removeEventListener("beforeunload", unload);
  }, [dirty]);
  const leave = (event: MouseEvent<HTMLAnchorElement>) => {
    if ((dirty || !["editing", "published", "closed"].includes(publication.view.phase)) && !window.confirm(t("leaveConfirm"))) event.preventDefault();
  };
  const reload = () => {
    if (dirty && !window.confirm(t("reloadConfirm"))) return;
    context.reload();
  };
  const submit = () => {
    if (!editable || !form || !detail || !context.snapshot || !policies || !publication.session) return;
    setLocalError("");
    try {
      const content = {...buildHorseOfferDraftSaveInput(form), locationText: detail.locationText, horseLat: detail.horseLat, horseLng: detail.horseLng};
      void publication.session.start({content, expectedRevision: context.snapshot.editRevision,
        gallery: photos.map(photo => photo.image ? {imageId: photo.image.id, isPrimary: photo.isPrimary}
          : {file: photo.file, isPrimary: photo.isPrimary}),
        confirmations: savedConfirmation ? {reusePublicationEventId: savedConfirmation.publicationEventId} : confirmations,
        policySnapshot: policies}, key => { submittedRequest.current = key; });
    } catch { setLocalError("checkDetails"); }
  };
  return <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 pb-8" data-owner-horse-offer-edit-id={offerId}
    data-owner-horse-offer-edit-mode={editable ? "publication-edit" : "read-only"}>
    <header><Link href="/v2/my-area" onClick={leave} className="text-sm font-bold underline">{t("myArea")}</Link>
      <h1 className="mt-5 break-words text-3xl font-black">{t("editHeading")}</h1>
      {context.active && detail ? <p className="mt-3 break-words text-lg font-bold">{detail.title}</p> : null}
    </header>
    {!context.active || !detail ? <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
      <p role={context.error ? "alert" : "status"}>{context.error === "identityBlocked" ? t("identityBlocked")
        : context.error === "contextChanged" ? t("contextChanged") : context.error ? t("loadError") : t("loading")}</p>
      {context.error ? <button type="button" className={`${button} mt-4`} onClick={context.retry}>{t("checkIdentity")}</button> : null}
    </section> : <>
      <p className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6">
        {!form ? t("unsupported") : !supportedStatus ? t("readOnly") : t("editExplanation")}
      </p>
      <div hidden={!context.active} className="space-y-6">
        {form ? <OwnerHorseOfferEditFields form={form} disabled={!editable} locationLocked={hasPrivateHorseLocation(detail)}
          onChange={edit => { if (editable) setForm(current => current ? edit(current) : current); }} /> : null}
        <OwnerHorseGalleryEditor title={detail.title} photos={photos} actor={context.active ? context.actor : null}
          disabled={!editable} onChange={next => { if (editable) setPhotos(next); }} />
        {form && supportedStatus ? <fieldset disabled={!editable}>
          <HorseOfferPublicationGate offerType={form.offerType} value={confirmations} onPoliciesChange={setPolicies}
            savedConfirmation={savedConfirmation}
            onConfirmAllChange={checked => { if (editable) setConfirmations(applyHorseOfferPublicationConfirmationGroupChange(form.offerType, checked)); }} />
        </fieldset> : null}
      </div>
      {form && supportedStatus ? <HorsePublicationAction
        key={publication.view.intent?.requestKey ?? "form"}
        session={publication.session} view={phase === "editing"
          && (dirty && ["changesSaved", "changedAfterSave", "published"].includes(publication.view.message)
            || !dirty && publication.view.message === "savedElsewhere")
          ? {...publication.view, message: ""} : publication.view}
        editing={detail.status !== "draft"} ownerEdit ready={context.ready}
        canSubmit={editable && !!policies && (detail.status === "draft" || dirty)
          && (!!savedConfirmation || getHorseOfferPublicationConfirmationProgress(form.offerType, confirmations).complete)}
        onSubmit={submit} localError={localError} onReset={() => setLocalError("")} /> : null}
      <section className="rounded-3xl border border-zinc-200 bg-white p-5">
        {publication.view.phase === "editing" ? <p className="text-sm">{t(dirty ? "unsaved" : "noChanges")}</p> : null}
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" className={button} disabled={working || locked || !context.ready} onClick={reload}>{t("reload")}</button>
          <Link href={`/v2/my-area/horse-offers/${offerId}`} onClick={leave} className={button}>{t("ownerView")}</Link>
          {publiclyActive ? <Link href={`/v2/horse-offer/${offerId}`} target="_blank" rel="noreferrer" className={button}>{t("publicView")}</Link> : null}
        </div>
      </section>
    </>}
  </div>;
}
