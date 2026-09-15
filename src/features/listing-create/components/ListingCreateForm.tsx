"use client";

import Link from "next/link";
import { useState } from "react";
import ListingCreateContentTypeSelector from "./ListingCreateContentTypeSelector";
import HorseOfferTypeSelector from "./HorseOfferTypeSelector";
import HorseOfferBasicFields from "./HorseOfferBasicFields";
import HorseOfferUseFields from "./HorseOfferUseFields";
import HorseOfferDisclosureFields from "./HorseOfferDisclosureFields";
import HorseOfferPriceFields from "./HorseOfferPriceFields";
import HorseOfferLocationFields from "./HorseOfferLocationFields";
import HorseOfferDraftSaveAction from "./HorseOfferDraftSaveAction";
import HorseOfferPublicationGate from "./HorseOfferPublicationGate";
import ListingCreateAiAnalysisCard from "./ListingCreateAiAnalysisCard";
import {
  getListingCreateTextGuidance,
} from "../model/listingCreateTextGuidance";
import {
  createListingCreateTextField,
} from "../model/fieldProvenance";
import {
  DEFAULT_LISTING_CREATE_CONTENT_TYPE,
  type ListingCreateContentType,
} from "../model/contentType";
import {
  getLiveAnimalOfferCapability,
  LIVE_ANIMAL_SPECIES,
} from "../model/liveAnimalOfferCapabilities";
import {
  type HorseOfferType,
} from "../model/horseOfferType";
import {
  createHorseOfferBasicFieldState,
} from "../model/horseOfferFields";
import {
  createHorseOfferUseFieldState,
} from "../model/horseOfferUseFields";
import {
  createHorseOfferDisclosureFieldState,
} from "../model/horseOfferDisclosureFields";
import {
  applyHorseOfferPriceFieldChange,
  createHorseOfferPriceFieldState,
} from "../model/horseOfferPriceFields";
import {
  applyHorseOfferLocationFieldChange,
  createHorseOfferLocationFieldState,
} from "../model/horseOfferLocationFields";
import {
  applyHorseOfferPublicationConfirmationGroupChange,
  createHorseOfferPublicationConfirmationState,
} from "../model/horseOfferPublicationGate";
import {
  useHorseOfferDraftSave,
} from "../model/useHorseOfferDraftSave";
import ListingCreateTextFields from "./ListingCreateTextFields";
import ListingCreateImageFields from "./ListingCreateImageFields";

export default function ListingCreateForm({ userId }: { userId: string }) {
  const [
    contentType,
    setContentType,
  ] = useState<ListingCreateContentType>(
    DEFAULT_LISTING_CREATE_CONTENT_TYPE
  );

  const [
    horseOfferType,
    setHorseOfferType,
  ] = useState<HorseOfferType | null>(
    null
  );

  const [
    horseOfferFields,
    setHorseOfferFields,
  ] = useState(
    createHorseOfferBasicFieldState
  );

  const [
    horseOfferUseFields,
    setHorseOfferUseFields,
  ] = useState(
    createHorseOfferUseFieldState
  );

  const [
    horseOfferDisclosureFields,
    setHorseOfferDisclosureFields,
  ] = useState(
    createHorseOfferDisclosureFieldState
  );

  const [
    horseOfferPriceFields,
    setHorseOfferPriceFields,
  ] = useState(
    createHorseOfferPriceFieldState
  );

  const [
    horseOfferLocationFields,
    setHorseOfferLocationFields,
  ] = useState(
    createHorseOfferLocationFieldState
  );

  const [
    horseOfferPublicationConfirmations,
    setHorseOfferPublicationConfirmations,
  ] = useState(
    createHorseOfferPublicationConfirmationState
  );

  const [
    files,
    setFiles,
  ] = useState<File[]>([]);

  const [
    title,
    setTitle,
  ] = useState(
    createListingCreateTextField()
  );

  const [
    description,
    setDescription,
  ] = useState(
    createListingCreateTextField()
  );

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
      horseOfferType
    );

  const horseOfferDraftSave =
    useHorseOfferDraftSave(
      userId,
      horseMode && horseOfferType
        ? {
            offerType: horseOfferType,
            title: title.value,
            description:
              description.value,
            basicFields:
              horseOfferFields,
            useFields:
              horseOfferUseFields,
            disclosureFields:
              horseOfferDisclosureFields,
            priceFields:
              horseOfferPriceFields,
            locationFields:
              horseOfferLocationFields,
          }
        : null
    );

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
              <p className="text-xs font-black uppercase tracking-[0.26em] text-amber-700">
                Uus kuulutus
              </p>

              <h1 className="mt-3 break-words text-4xl font-black tracking-tight sm:text-5xl">
                Lisa uus kuulutus
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 sm:text-base">
                {textGuidance.heroDescription}
              </p>
            </div>

            <Link
              href="/sell"
              className="inline-flex w-full shrink-0 justify-center rounded-full border border-amber-300 bg-white px-5 py-3 text-sm font-black text-amber-950 shadow-sm transition hover:bg-amber-100 lg:w-auto"
            >
              Ava praegune töötav lisamine
            </Link>
          </div>

          <p className="mt-5 rounded-2xl border border-amber-200 bg-white/70 px-4 py-3 text-xs leading-5 text-amber-950/75">
            V2 hobusevormi teksti ja andmeid saab soovi korral salvestada
            privaatse mustandina. Pilte veel ei laadita üles ega salvestata
            ning kuulutust siin veel ei avaldata. Mobiili „Müü” nupp avab
            seni töötava /sell voo.
          </p>
        </div>
      </section>

      <ListingCreateContentTypeSelector
        value={contentType}
        onChange={setContentType}
      />

      {horseMode ? (
        <HorseOfferTypeSelector
          value={horseOfferType}
          disabled={horseOfferDraftSave.typeLocked}
          onChange={(nextOfferType) => {
            if (horseOfferDraftSave.typeLocked) return;
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

      <ListingCreateImageFields files={files} setFiles={setFiles} />

      <ListingCreateAiAnalysisCard
        contentType={contentType}
        hasImage={files.length > 0}
        hasTextContext={hasTextContext}
      />

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
        <HorseOfferDraftSaveAction controller={horseOfferDraftSave} />
      ) : null}

      {horseMode && horseOfferType ? (
        <HorseOfferPublicationGate
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
    </div>
  );
}
