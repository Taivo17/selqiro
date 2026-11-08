"use client";
import { useEffect, useRef, useState } from "react";
import type { OwnerHorseOfferImage } from "../../../entities/horse-offer/model/types";
import { validateListingCreateImage } from "../../listing-create/model/imageSelection";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { horsePublicationMessages } from "../../horse-publication/model/horsePublicationMessages";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { managedHorseMedia } from "../../../entities/marketplace-item/model/ownerMediaUrl";
import ManagedOwnerImage from "../../listing-edit/components/ManagedOwnerImage";

export type HorseEditorPhoto = Readonly<{key: string; image: OwnerHorseOfferImage; file?: never; isPrimary: boolean}
  | {key: string; file: File; image?: never; isPrimary: boolean}>;
export const horseEditorPhotos = (images: readonly OwnerHorseOfferImage[]): HorseEditorPhoto[] => images.map(image => ({key: image.id, image, isPrimary: image.isPrimary}));
export const horseEditorGalleryDirty = (images: readonly OwnerHorseOfferImage[], photos: readonly HorseEditorPhoto[]) =>
  images.length !== photos.length || photos.some((photo, index) => photo.file || photo.image?.id !== images[index]?.id || photo.isPrimary !== images[index]?.isPrimary);

const button = "rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40";
export default function OwnerHorseGalleryEditor({photos, disabled, onChange, title, actor}: {
  photos: readonly HorseEditorPhoto[]; disabled: boolean; onChange: (photos: HorseEditorPhoto[]) => void; title: string;
  actor?: PublicationActor | null;
}) {
  const {t} = useV2Translation(horsePublicationMessages), picker = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({}), [error, setError] = useState(false);
  useEffect(() => {
    const urls: Record<string, string> = {};
    for (const photo of photos) if (photo.file) urls[photo.key] = URL.createObjectURL(photo.file);
    setPreviews(urls); return () => { Object.values(urls).forEach(url => URL.revokeObjectURL(url)); };
  }, [photos]);
  const move = (index: number, delta: number) => {
    if (disabled || index + delta < 0 || index + delta >= photos.length) return;
    const next = [...photos]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; onChange(next);
  };
  const remove = (key: string) => {
    if (disabled) return;
    let next = photos.filter(photo => photo.key !== key);
    if (next.length && !next.some(photo => photo.isPrimary)) next = next.map((photo, index) => ({...photo, isPrimary: index === 0}));
    onChange(next);
  };
  return <fieldset disabled={disabled} className="rounded-[28px] border border-amber-200 bg-white p-6">
    <legend className="sr-only">{t("photos")}</legend>
    <h2 className="text-2xl font-black">{t("photos")}</h2><p className="mt-2 text-sm text-zinc-600">{t("photoHelp")}</p>
    <p className="mt-2 text-sm font-bold">{t("count", {count: photos.length})}</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo, index) => <article key={photo.key} className={`rounded-2xl border p-3 ${photo.isPrimary ? "border-amber-400 bg-amber-50" : "border-zinc-200"}`}>
        {/* Uploaded photos use the owner-authorized route; new previews stay local. */}
        {photo.image && managedHorseMedia(photo.image.url) ? actor ? <ManagedOwnerImage source={photo.image.url}
          actor={actor} contentType="horse_offer" className="aspect-[4/3] w-full rounded-xl" />
          : <div className="aspect-[4/3] w-full rounded-xl bg-neutral-100" />
          : <img alt={`${title} ${index + 1}`} src={photo.image?.url || previews[photo.key] || undefined} className="aspect-[4/3] w-full rounded-xl object-cover" />}
        {photo.file ? <p className="mt-2 text-xs font-bold">{t("newPhoto")}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={button} disabled={disabled || photo.isPrimary} onClick={() => onChange(photos.map(item => ({...item, isPrimary: item.key === photo.key})))}>{t(photo.isPrimary ? "primary" : "makePrimary")}</button>
          <button type="button" className={button} disabled={disabled} onClick={() => remove(photo.key)}>{t("remove")}</button>
          <button type="button" className={button} disabled={disabled || index === 0} onClick={() => move(index, -1)}>{t("earlier")}</button>
          <button type="button" className={button} disabled={disabled || index === photos.length - 1} onClick={() => move(index, 1)}>{t("later")}</button>
        </div>
      </article>)}
    </div>
    <input ref={picker} type="file" hidden accept="image/jpeg,image/png,image/webp" multiple onChange={event => {
      if (disabled) return;
      const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = "";
      const valid = files.filter(file => !validateListingCreateImage(file) && file.size > 0);
      setError(valid.length !== files.length || valid.length > 10 - photos.length);
      const additions = valid.slice(0, Math.max(0, 10 - photos.length)).map((file, index) => ({key: crypto.randomUUID(), file, isPrimary: !photos.length && index === 0}));
      if (additions.length) onChange([...photos, ...additions]);
    }} />
    <button type="button" disabled={disabled || photos.length >= 10} className={`${button} mt-5`} onClick={() => picker.current?.click()}>{t("addPhotos")}</button>
    {error ? <p role="alert" className="mt-3 text-sm text-red-800">{t("checkImages")}</p> : null}
  </fieldset>;
}
