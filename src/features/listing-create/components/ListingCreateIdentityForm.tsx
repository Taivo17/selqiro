"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingCreateMessages, translateListingCreateMessage } from "../model/listingCreateMessages";
import { useState } from "react";
import type { useOrdinaryPublication } from "../model/useOrdinaryPublication";
import { useListingCreateDraft } from "../model/useListingCreateDraft";
import type { ListingCreateDraftEntry } from "../model/listingCreateDrafts";
import { buildHorseOfferDraftSaveInput } from "../model/horseOfferDraftSave";
import { useHorsePublication } from "../../horse-publication/model/useHorsePublication";
import { horsePublicationMessages } from "../../horse-publication/model/horsePublicationMessages";
import HorsePublicationAction from "../../horse-publication/components/HorsePublicationAction";
import type { HorsePolicySnapshot } from "../../../entities/horse-offer/model/publication";
import { getListingCreateTextGuidance } from "../model/listingCreateTextGuidance";
import { getLiveAnimalOfferCapability, LIVE_ANIMAL_SPECIES } from "../model/liveAnimalOfferCapabilities";
import { applyHorseOfferPriceFieldChange } from "../model/horseOfferPriceFields";
import { applyHorseOfferLocationFieldChange } from "../model/horseOfferLocationFields";
import { applyHorseOfferPublicationConfirmationGroupChange, createHorseOfferPublicationConfirmationState, getHorseOfferPublicationConfirmationProgress } from "../model/horseOfferPublicationGate";
import OrdinaryPublicationAction from "./OrdinaryPublicationAction";
import OrdinaryListingFields from "./OrdinaryListingFields";
import ListingCreateContentTypeSelector from "./ListingCreateContentTypeSelector";
import HorseOfferTypeSelector from "./HorseOfferTypeSelector";
import HorseOfferBasicFields from "./HorseOfferBasicFields";
import HorseOfferUseFields from "./HorseOfferUseFields";
import HorseOfferDisclosureFields from "./HorseOfferDisclosureFields";
import HorseOfferPriceFields from "./HorseOfferPriceFields";
import HorseOfferLocationFields from "./HorseOfferLocationFields";
import HorseOfferPublicationGate from "./HorseOfferPublicationGate";
import ListingCreateTextFields from "./ListingCreateTextFields";
import ListingCreateImageFields from "./ListingCreateImageFields";

type Props = { userId: string; entry: ListingCreateDraftEntry; publication: ReturnType<typeof useOrdinaryPublication> };
export default function ListingCreateIdentityForm({ userId, entry, publication }: Props) {
  const { language, t } = useV2Translation(listingCreateMessages);

  const [publicationSubmitting, setPublicationSubmitting] = useState(false);
  const { ordinaryFields, setOrdinaryFields, contentType, setContentType, horseOfferType, setHorseOfferType,
    horseOfferFields, setHorseOfferFields, horseOfferUseFields, setHorseOfferUseFields,
    horseOfferDisclosureFields, setHorseOfferDisclosureFields, horseOfferPriceFields, setHorseOfferPriceFields,
    horseOfferLocationFields, setHorseOfferLocationFields, horseOfferPublicationConfirmations, setHorseOfferPublicationConfirmations,
    files, setFiles, title, setTitle, description, setDescription } = useListingCreateDraft(entry, () => publication.ownsForm(entry.actor));
  const hasTextContext =
    Boolean(title.value.trim()) ||
    Boolean(
      description.value.trim()
    );

  const liveAnimalCapability =
    getLiveAnimalOfferCapability(
      contentType
    );

  const horseMode =
    liveAnimalCapability?.species ===
    LIVE_ANIMAL_SPECIES.horse;

  const textGuidance =
    getListingCreateTextGuidance(
      contentType,
      horseOfferType,
      language
    );

  const { t: horseText } = useV2Translation(horsePublicationMessages);
  const [policies, setPolicies] = useState<readonly HorsePolicySnapshot[] | null>(null);
  const [horseError, setHorseError] = useState("");
  const horsePublication = useHorsePublication(entry.actor, null, publication.ownsForm(entry.actor),
    () => publication.ownsForm(entry.actor));
  const horseLocked = horsePublication.view.phase !== "editing";
  const submitHorse = () => {
    if (!horseOfferType || !policies || !horsePublication.session || !publication.canAct(entry.actor)) return;
    setHorseError("");
    try {
      const content = buildHorseOfferDraftSaveInput({offerType: horseOfferType, title: title.value, description: description.value,
        basicFields: horseOfferFields, useFields: horseOfferUseFields, disclosureFields: horseOfferDisclosureFields,
        priceFields: horseOfferPriceFields, locationFields: horseOfferLocationFields});
      void horsePublication.session.start({content, expectedRevision: null,
        gallery: files.map((file, index) => ({file, isPrimary: index === 0})),
        confirmations: horseOfferPublicationConfirmations, policySnapshot: policies}, entry.captureSubmission());
    } catch { setHorseError("checkDetails"); }
  };

  return (
    <div
      className="min-w-0 space-y-6"
      data-listing-create-content-type={
        contentType
      }
      data-horse-offer-type={
        horseMode
          ? horseOfferType ||
            "unselected"
          : undefined
      }
    >
      <section className="overflow-hidden rounded-[34px] border border-amber-200 bg-amber-50 shadow-sm">
        <div className="border-t-4 border-amber-400 p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.26em] text-amber-700">{t("newListing")}</p>

              <h1 className="mt-3 break-words text-4xl font-black tracking-tight sm:text-5xl">{t("addListing")}</h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 sm:text-base">
                {textGuidance.heroDescription}
              </p>
            </div>


          </div>

          <p className="mt-5 rounded-2xl border border-amber-200 bg-white/70 px-4 py-3 text-xs leading-5 text-amber-950/75">
            {horseMode
              ? horseText("explanation")
              : publication.enabled
                ? t("publicationExplanation")
                : t("previewOnlyExplanation")}
          </p>
        </div>
      </section>

      {!publication.contextReady ? <section role="status" className="rounded-2xl border border-amber-200 bg-white p-5">
        <p>{publication.contextError ? translateListingCreateMessage(language, publication.contextError) : t("checkingIdentity")}</p>
        {publication.contextError ? <button type="button" className="mt-3 font-bold underline" onClick={publication.retryContext}>{t("checkIdentity")}</button> : null}
      </section> : null}

      <fieldset className="min-w-0 space-y-6"
        hidden={!horseMode && publication.enabled && publication.view.phase !== "editing"}
        disabled={!publication.contextReady || (horseMode && horseLocked) || (!horseMode && publication.enabled && (publicationSubmitting || publication.view.phase !== "editing"))}>
      <ListingCreateContentTypeSelector
        value={contentType}
        onChange={setContentType}
      />

      {horseMode ? (
        <HorseOfferTypeSelector
          value={horseOfferType}
          disabled={horseLocked}
          onChange={(nextOfferType) => {
            if (horseLocked) return;
            setHorseOfferType(
              nextOfferType
            );
            setHorseOfferPublicationConfirmations(
              createHorseOfferPublicationConfirmationState()
            );
          }}
        />
      ) : null}

      <ListingCreateTextFields title={title} description={description}
        setTitle={setTitle} setDescription={setDescription} textGuidance={textGuidance} />

      {(!publication.enabled || horseMode || publication.view.phase === "editing") ? <ListingCreateImageFields files={files} setFiles={setFiles} /> : null}

      {!horseMode ? <OrdinaryListingFields value={ordinaryFields} onChange={setOrdinaryFields}
        title={title.value} description={description.value} /> : null}

      {horseMode && horseOfferType ? (
        <HorseOfferBasicFields
          offerType={horseOfferType}
          value={horseOfferFields}
          onChange={(
            field,
            nextValue
          ) =>
            setHorseOfferFields(
              (current) => ({
                ...current,
                [field]: nextValue,
              })
            )
          }
        />
      ) : null}

      {horseMode && horseOfferType ? (
        <HorseOfferUseFields
          offerType={horseOfferType}
          value={horseOfferUseFields}
          onSpecificChange={(
            field,
            nextValue
          ) =>
            setHorseOfferUseFields(
              (current) => ({
                ...current,
                specific: {
                  ...current.specific,
                  [field]: nextValue,
                },
              })
            )
          }
          onWantedChange={(
            field,
            nextValue
          ) =>
            setHorseOfferUseFields(
              (current) => ({
                ...current,
                wanted: {
                  ...current.wanted,
                  [field]: nextValue,
                },
              })
            )
          }
        />
      ) : null}

      {horseMode && horseOfferType ? (
        <HorseOfferDisclosureFields
          offerType={horseOfferType}
          value={
            horseOfferDisclosureFields
          }
          onSpecificChange={(
            field,
            nextValue
          ) =>
            setHorseOfferDisclosureFields(
              (current) => ({
                ...current,
                specific: {
                  ...current.specific,
                  [field]: nextValue,
                },
              })
            )
          }
          onWantedChange={(
            field,
            nextValue
          ) =>
            setHorseOfferDisclosureFields(
              (current) => ({
                ...current,
                wanted: {
                  ...current.wanted,
                  [field]: nextValue,
                },
              })
            )
          }
        />
      ) : null}

      {horseMode && horseOfferType ? (
        <HorseOfferPriceFields
          offerType={horseOfferType}
          value={horseOfferPriceFields}
          onChange={(change) =>
            setHorseOfferPriceFields(
              (current) =>
                applyHorseOfferPriceFieldChange(
                  current,
                  change
                )
            )
          }
        />
      ) : null}

      {horseMode && horseOfferType ? (
        <HorseOfferLocationFields
          offerType={horseOfferType}
          value={horseOfferLocationFields}
          onChange={(change) =>
            setHorseOfferLocationFields(
              (current) =>
                applyHorseOfferLocationFieldChange(
                  current,
                  change
                )
            )
          }
        />
      ) : null}

      {horseMode && horseOfferType ? (
        <HorseOfferPublicationGate
          onPoliciesChange={setPolicies}
          offerType={horseOfferType}
          value={
            horseOfferPublicationConfirmations
          }
          onConfirmAllChange={(checked) =>
            setHorseOfferPublicationConfirmations(
              applyHorseOfferPublicationConfirmationGroupChange(
                horseOfferType,
                checked
              )
            )
          }
        />
      ) : null}
      </fieldset>
      {(horseMode && horseOfferType) || horseLocked ? <HorsePublicationAction
        session={horsePublication.session} view={horsePublication.view} ready={publication.contextReady}
        canSubmit={horseMode && !!horseOfferType && !!policies && getHorseOfferPublicationConfirmationProgress(horseOfferType!, horseOfferPublicationConfirmations).complete}
        onSubmit={submitHorse} localError={horseError}
        onReset={requestKey => { entry.finishHorse(requestKey, horsePublication.view.phase === "published"); setHorseError(""); }} /> : null}
      {!horseMode && publication.enabled && ["needs_files", "resume"].includes(publication.view.phase)
        ? <fieldset disabled={publicationSubmitting || !publication.contextReady}><ListingCreateImageFields files={files} setFiles={setFiles} /></fieldset> : null}
      {!horseMode ? <OrdinaryPublicationAction controller={publication} fields={ordinaryFields} title={title.value}
        description={description.value} files={files} onSubmittingChange={setPublicationSubmitting}
        onCaptureSubmission={() => entry.captureSubmission()} onNew={requestKey => { entry.finishOrdinary(requestKey); }} /> : null}
    </div>
  );
}
