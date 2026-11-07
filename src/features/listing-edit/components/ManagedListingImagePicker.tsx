"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingEditMessages, translateListingEditMessage } from "../model/listingEditMessages";

import {useState, type ReactNode} from "react";
import type {PublicationActor} from "../../../entities/listing/model/publicationJourney";
import {bindManagedListingRemoveCommand, type ManagedListingImagesSnapshot,
  type ManagedListingRemoveCommand} from "../../../entities/listing/model/managedListingImages";
import {orderManagedListingImagesForDisplay} from "../model/managedListingImageOrder";
import ManagedOwnerImage from "./ManagedOwnerImage";

type Props = {
  actor: PublicationActor;
  gallery: ManagedListingImagesSnapshot | null;
  fallbackImages: readonly string[];
  preloadingImage?: string | null;
  blocked: boolean;
  error: string | null;
  message: string | null;
  busyOrdinal: number | null;
  removalBusyOrdinal: number | null;
  canRemove: boolean;
  onSelect: (ordinal: number) => void;
  onRemove: (command: ManagedListingRemoveCommand) => void;
  onRefresh: () => void;
  children?: ReactNode;
};

function RemovePhoto({gallery, ordinal, blocked, busy, onRemove}: {
  gallery: ManagedListingImagesSnapshot; ordinal: number; blocked: boolean; busy: boolean;
  onRemove: (command: ManagedListingRemoveCommand) => void;
}) {
  const { language, t } = useV2Translation(listingEditMessages);

  const [confirmation, setConfirmation] = useState<ManagedListingRemoveCommand | null>(null);
  return <div className="mt-2">
    <button type="button" disabled={blocked} aria-label={t("removePhotoNumber", { number: ordinal + 1 })}
      onClick={() => { if (!blocked) setConfirmation(bindManagedListingRemoveCommand({key: gallery.key, baseline: gallery, ordinal})); }}
      className="min-h-11 w-full rounded-xl border border-red-200 px-2 py-2 text-sm font-bold text-red-800 disabled:opacity-50">
      {busy ? t("removing") : t("removePhoto")}
    </button>
    {confirmation ? <div role="alertdialog" aria-label={t("confirmRemovePhotoNumber", { number: ordinal + 1 })}
      className="mt-2 space-y-2 rounded-xl border border-red-200 bg-white p-3 text-sm">
      <p>{t("removePhotoQuestion")}</p>
      <button type="button" disabled={blocked} className="min-h-11 font-bold text-red-800 underline disabled:opacity-50"
        onClick={() => { if (!blocked) { setConfirmation(null); onRemove(confirmation); } }}>{t("yesRemovePhoto")}</button>
      <button type="button" className="block min-h-11 font-bold underline" onClick={() => setConfirmation(null)}>{t("keep")}</button>
    </div> : null}
  </div>;
}

export default function ManagedListingImagePicker(props: Props) {
  const { language, t } = useV2Translation(listingEditMessages);

  const images = orderManagedListingImagesForDisplay<{ordinal: number; url: string; isPrimary: boolean}>(props.gallery?.images
    ?? props.fallbackImages.map((url, ordinal) => ({url, ordinal, isPrimary: false})));
  const items: {ordinal: number | null; url: string; isPrimary: boolean; hidden: boolean}[] = images.map(image => ({...image, hidden: false}));
  if (props.preloadingImage && !images.some(image => image.url === props.preloadingImage))
    items.push({ordinal: null, url: props.preloadingImage, isPrimary: false, hidden: true});
  return <section className="space-y-4 rounded-[30px] border border-amber-200 bg-white p-4 sm:p-6" aria-label={t("listingPrimaryPhoto")}>
    <div>
      <h2 className="text-2xl font-black">{t("listingPhotos")}</h2>
      <p className="mt-2 text-sm text-neutral-600">{t("choosePrimaryHelp")}</p>
    </div>
    {items.length > 0 ? <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {/* The same URL key and child position keep the protected fetch/object URL
          when fresh gallery readback promotes the hidden image. */}
      {items.map(image => <li key={image.url} hidden={image.hidden} className={`min-w-0 overflow-hidden rounded-2xl border p-2 ${
        props.gallery && image.isPrimary ? "border-amber-500 bg-amber-50" : "border-neutral-200 bg-white"}`}>
        <ManagedOwnerImage source={image.url} actor={props.actor} className="aspect-[4/3] w-full rounded-xl object-contain" />
        {!image.hidden && image.ordinal !== null && props.gallery ? image.isPrimary ? <p className="mt-2 flex min-h-11 items-center justify-center text-sm font-bold text-amber-900">{t("primaryPhoto")}</p>
          : <button type="button" disabled={props.blocked || props.error !== null}
            onClick={() => { if (image.ordinal !== null) props.onSelect(image.ordinal); }}
            aria-label={t("setPrimaryNumber", { number: image.ordinal + 1 })}
            className="mt-2 min-h-11 w-full rounded-xl border border-amber-300 bg-white px-2 py-2 text-sm font-bold text-amber-900 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:opacity-50">
            {props.busyOrdinal === image.ordinal ? t("saving") : t("setPrimary")}
          </button> : null}
        {!image.hidden && image.ordinal !== null && props.gallery && props.canRemove && props.gallery.images.length >= 2 && !image.isPrimary ? <RemovePhoto
          key={[props.actor.userId, props.actor.identityId, props.gallery.key.listingId, props.gallery.key.attemptId,
            props.gallery.revision, image.ordinal].join(":")}
          gallery={props.gallery} ordinal={image.ordinal} blocked={props.blocked || props.error !== null}
          busy={props.removalBusyOrdinal === image.ordinal} onRemove={props.onRemove} /> : null}
      </li>)}
    </ul> : null}
    {images.length === 0 ? <p className="text-neutral-600">{t("noPhotos")}</p> : null}
    {props.children}
    {props.error ? <div className="space-y-2 rounded-xl bg-amber-50 p-3">
      <p role="alert">{translateListingEditMessage(language, props.error)}</p>
      <button type="button" disabled={props.blocked} onClick={props.onRefresh}
        className="min-h-11 font-bold underline disabled:opacity-50">{t("checkPhotoStatus")}</button>
    </div> : null}
    {props.message ? <p role="status" aria-live="polite">{translateListingEditMessage(language, props.message)}</p> : null}
  </section>;
}
