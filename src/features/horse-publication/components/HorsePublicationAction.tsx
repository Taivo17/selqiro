"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import type { HorsePublicationSession, HorsePublicationView } from "../../../entities/horse-offer/model/horsePublicationSession";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { horsePublicationMessages, type HorsePublicationMessageKey } from "../model/horsePublicationMessages";
import { horsePublicationReviewForm } from "../model/horsePublicationReviewForm";
import OwnerHorseOfferEditFields from "../../horse-offer-edit/components/OwnerHorseOfferEditFields";

const button = "rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40";
export default function HorsePublicationAction({session, view, editing = false, canSubmit, onSubmit, onReset, ready = true, localError = ""}: {
  session: HorsePublicationSession | null; view: HorsePublicationView; editing?: boolean; canSubmit: boolean;
  onSubmit: () => void; onReset?: (key: string) => void; ready?: boolean; localError?: string;
}) {
  const { t } = useV2Translation(horsePublicationMessages);
  const [files, setFiles] = useState<File[]>([]);
  const picker = useRef<HTMLInputElement>(null);
  const working = view.phase === "busy";
  const resumable = ["resume", "needs_files", "unknown"].includes(view.phase);
  const recoverable = resumable || view.phase === "needs_attention";
  const feedback = localError || view.message;
  const translated = feedback in horsePublicationMessages.en ? t(feedback as HorsePublicationMessageKey) : "";
  return <section className="rounded-[28px] border border-amber-200 bg-white p-6" aria-busy={working} data-horse-publication-phase={view.phase}>
    {translated ? <p role={view.phase === "unknown" || view.phase === "needs_attention" ? "alert" : "status"} aria-live="polite" className="text-sm leading-6">
      {translated}{view.currentImage ? ` (${view.currentImage})` : ""}</p> : null}
    {recoverable && view.intent ? <details className="mt-4 rounded-2xl border border-zinc-200 p-4">
      <summary className="cursor-pointer font-bold">{t("operationDetails")}</summary>
      <p className="my-3 text-sm">{t("count", {count: view.intent.gallery.length})}</p>
      <OwnerHorseOfferEditFields form={horsePublicationReviewForm(view.intent.content)} disabled locationLocked={false} onChange={() => {}} />
    </details> : null}
    {resumable ? <div className="mt-4">
      <input ref={picker} type="file" hidden accept="image/jpeg,image/png,image/webp" multiple onChange={event => setFiles(Array.from(event.currentTarget.files ?? []))} />
      <button type="button" className={button} disabled={!ready} onClick={() => picker.current?.click()}>{t("selectOriginals")}</button>
      {files.length ? <span className="ml-3 text-sm">{files.length}</span> : null}
    </div> : null}
    <div className="mt-4 flex flex-wrap gap-3">
      {view.phase === "editing" ? <button type="button" className={`${button} !bg-black !text-white`}
        disabled={!session || !ready || !canSubmit} onClick={onSubmit}>{t(editing ? "save" : "publish")}</button> : null}
      {recoverable ? <>
        <button type="button" className={button} disabled={!session || !ready} onClick={() => { void session?.inspect(); }}>{t("checkResult")}</button>
        {resumable ? <button type="button" className={button} disabled={!session || !ready}
          onClick={() => { void session?.resume(files); }}>{t("continue")}</button> : null}
        <button type="button" className={button} disabled={!session || !ready} onClick={() => { void session?.cancel(); }}>{t("cancel")}</button>
      </> : null}
      {view.phase === "published" && view.result?.horse_offer_id ? <>
        {view.confirmed?.detail.status === "published" ? <Link className={button} href={`/v2/horse-offer/${view.result.horse_offer_id}`}>{t("publicView")}</Link> : null}
        <Link className={button} href={`/v2/my-area/horse-offers/${view.result.horse_offer_id}`}>{t("ownerView")}</Link>
      </> : null}
      {["published", "closed"].includes(view.phase) ? <button type="button" className={button} disabled={!session || !ready}
        onClick={() => { void session?.reset(key => { setFiles([]); onReset?.(key); }); }}>
        {t(view.phase === "closed" ? "returnForm" : editing ? "editAgain" : "newListing")}</button> : null}
    </div>
  </section>;
}
