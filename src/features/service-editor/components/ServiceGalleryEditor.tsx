"use client";
import { useEffect, useRef, useState } from "react";
import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import type { ServicePublicationImage } from "../../../entities/service/model/servicePublication";
import { validateListingCreateImage } from "../../listing-create/model/imageSelection";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { serviceEditorMessages } from "../model/serviceEditorMessages";
import ServiceOwnerImage from "./ServiceOwnerImage";

export type ServiceEditorPhoto = Readonly<{key: string; image: ServicePublicationImage; file?: never; isPrimary: boolean}
  | {key: string; file: File; image?: never; isPrimary: boolean}>;
export const serviceEditorPhotos = (images: readonly ServicePublicationImage[]): ServiceEditorPhoto[] => images.map(image => ({key: image.id, image, isPrimary: image.isPrimary}));
export const serviceGalleryDirty = (images: readonly ServicePublicationImage[], photos: readonly ServiceEditorPhoto[]) =>
  images.length !== photos.length || photos.some((photo, index) => photo.file || photo.image?.id !== images[index]?.id || photo.isPrimary !== images[index]?.isPrimary);

const button = "min-h-10 rounded-full border border-neutral-300 bg-white px-3 py-2 text-sm font-bold disabled:opacity-40";
function LocalServicePhoto({file, alt}: {file: File; alt: string}) {
  const [preview, setPreview] = useState<{file: File; url: string} | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    // A Blob URL is an external browser resource. Create it after commit, show
    // that committed URL, and revoke it when this file preview unmounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview({file, url});
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!preview || preview.file !== file) return <span className="block aspect-[4/3] rounded-xl bg-neutral-100" />;
  // Browser-local original files cannot be sent to Next's image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={preview.url} alt={alt} className="aspect-[4/3] w-full rounded-xl object-cover" />;
}
export default function ServiceGalleryEditor({photos, disabled, onChange, title, actor}: {
  photos: readonly ServiceEditorPhoto[]; disabled: boolean; onChange: (next: ServiceEditorPhoto[]) => void; title: string; actor: PublicationActor | null;
}) {
  const {t} = useV2Translation(serviceEditorMessages), picker = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(false);
  const move = (index: number, delta: number) => {if (disabled || index + delta < 0 || index + delta >= photos.length) return;
    const next = [...photos]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; onChange(next);};
  const remove = (key: string) => {if (disabled) return; let next = photos.filter(photo => photo.key !== key);
    if (next.length && !next.some(photo => photo.isPrimary)) next = next.map((photo, index) => ({...photo, isPrimary: index === 0})); onChange(next);};
  return <fieldset disabled={disabled} className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">
    <legend className="sr-only">{t("photos")}</legend><h2 className="text-2xl font-black">{t("photos")}</h2><p className="mt-2 text-sm leading-6 text-neutral-600">{t("photoHelp")}</p>
    <p className="mt-2 text-sm font-bold">{t("photoCount", {count: photos.length})}</p>
    <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo, index) => <article key={photo.key} className={`min-w-0 rounded-2xl border p-3 ${photo.isPrimary ? "border-teal-400 bg-teal-50" : "border-neutral-200"}`}>
        {photo.image && actor ? <ServiceOwnerImage actor={actor} source={photo.image.url} alt={t("serviceImage", {title, index: index + 1})} className="aspect-[4/3] w-full rounded-xl" />
          : photo.file ? <LocalServicePhoto file={photo.file} alt={t("serviceImage", {title, index: index + 1})} /> : null}
        {photo.file ? <p className="mt-2 text-xs font-bold">{t("newPhoto")}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={button} disabled={disabled || photo.isPrimary}
          onClick={() => onChange(photos.map(item => ({...item, isPrimary: item.key === photo.key})))}>{t(photo.isPrimary ? "primary" : "makePrimary")}</button>
          <button type="button" className={button} onClick={() => remove(photo.key)}>{t("remove")}</button>
          <button type="button" className={button} disabled={disabled || index === 0} onClick={() => move(index, -1)}>{t("earlier")}</button>
          <button type="button" className={button} disabled={disabled || index === photos.length - 1} onClick={() => move(index, 1)}>{t("later")}</button></div>
      </article>)}
    </div>
    <input ref={picker} type="file" hidden accept="image/jpeg,image/png,image/webp" multiple onChange={event => {
      const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = "";
      if (disabled) return;
      const valid = files.filter(file => file.size > 0 && !validateListingCreateImage(file));
      setError(valid.length !== files.length || valid.length > 10 - photos.length);
      const additions = valid.slice(0, Math.max(0, 10 - photos.length)).map((file, index) => ({key: crypto.randomUUID(), file, isPrimary: photos.length === 0 && index === 0}));
      if (additions.length) onChange([...photos, ...additions]);
    }} />
    <button type="button" disabled={disabled || photos.length >= 10} className={`${button} mt-5`} onClick={() => picker.current?.click()}>{t("addPhotos")}</button>
    <p className="mt-3 text-xs text-neutral-600">{t("photoFormats")}</p>{error ? <p role="alert" className="mt-3 text-sm text-red-800">{t("photoError")}</p> : null}
  </fieldset>;
}
