"use client";
import { useRef, useState } from "react";
import type { ServicePublicationSession, ServicePublicationView } from "../../../entities/service/model/servicePublicationSession";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { serviceEditorMessages, type ServiceMessageKey } from "../model/serviceEditorMessages";

const button = "min-h-12 rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-bold disabled:opacity-40";
const messages: Record<string, ServiceMessageKey> = {
  checking: "recovering", preparingPhotos: "saving", uploading: "saving", verifying: "saving", publishing: "publicationPending",
  checkingPhoto: "recovering", uploadingPhoto: "saving", confirming: "publicationPending",
  changesSaved: "saved", changedAfterSave: "savedElsewhere", published: "published", savedElsewhere: "savedElsewhere",
  checkDetails: "invalidFields", checkImages: "photoError", samePhotos: "samePhotos", imageRejected: "photoError", imageUnavailable: "photoError",
  conflict: "conflict", contextChanged: "contextChanged", policiesChanged: "policyChanged", policiesRequired: "policyNeeded", rejected: "saveError",
  limited: "limited", storageLimited: "limited", busyElsewhere: "busyElsewhere", unknown: "unknown", cancelled: "cancelled", resume: "resume",
};
export default function ServicePublicationActions({session, view, ready, canSubmit, publish, error, onSubmit}: {
  session: ServicePublicationSession | null; view: ServicePublicationView; ready: boolean; canSubmit: boolean; publish: boolean;
  error: ServiceMessageKey | null; onSubmit: () => void;
}) {
  const {t} = useV2Translation(serviceEditorMessages), picker = useRef<HTMLInputElement>(null), [files, setFiles] = useState<File[]>([]);
  const recovery = ["resume", "needs_files", "unknown", "needs_attention"].includes(view.phase);
  const resumable = ["resume", "needs_files", "unknown"].includes(view.phase);
  const feedback = error || messages[view.message] || (view.phase === "busy" ? "saving" : null);
  return <section aria-busy={view.phase === "busy"} data-service-publication-phase={view.phase} className="rounded-[28px] border border-teal-200 bg-white p-5 sm:p-6">
    {feedback ? <p role={error || recovery ? "alert" : "status"} className="mb-4 text-sm leading-6">{t(feedback)}{view.currentImage != null ? ` (${view.currentImage})` : ""}</p> : null}
    {recovery && view.intent ? <details className="mb-4 rounded-2xl border border-neutral-200 p-4">
      <summary className="cursor-pointer font-bold">{t("pendingDetails")}</summary>
      <p className="mt-3 break-words font-bold">{view.intent.content.title}</p>
      {view.intent.content.description ? <p className="mt-2 whitespace-pre-wrap break-words text-sm">{view.intent.content.description}</p> : null}
      <p className="mt-2 text-sm">{t("photoCount", {count: view.intent.gallery.length})}</p>
      <p className="mt-3 text-sm text-neutral-600">{t("revisePending")}</p>
    </details> : null}
    {resumable ? <div className="mb-4"><input ref={picker} type="file" hidden multiple accept="image/jpeg,image/png,image/webp" onChange={event => {setFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = "";}} />
      <button type="button" disabled={!ready} className={button} onClick={() => picker.current?.click()}>{t("selectOriginals")}</button>{files.length ? <span className="ml-3 text-sm">{files.length}</span> : null}</div> : null}
    <div className="flex flex-wrap gap-3">
      {view.phase === "editing" ? <button type="button" disabled={!ready || !session || !canSubmit} className={`${button} !bg-black !text-white`} onClick={onSubmit}>{t(publish ? "publish" : "save")}</button> : null}
      {recovery ? <><button type="button" disabled={!ready || !session} className={button} onClick={() => void session?.inspect()}>{t("checkResult")}</button>
        {resumable ? <button type="button" disabled={!ready || !session} className={button} onClick={() => void session?.resume(files)}>{t("continue")}</button> : null}
        <button type="button" disabled={!ready || !session} className={button} onClick={() => void session?.cancel()}>{t("cancel")}</button></> : null}
      {view.phase === "closed" ? <button type="button" disabled={!ready || !session} className={button} onClick={() => void session?.reset(() => setFiles([]))}>{t("returnForm")}</button> : null}
    </div>
  </section>;
}
