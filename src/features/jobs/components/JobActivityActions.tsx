"use client";
import { useState } from "react";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { jobMessages } from "../model/jobMessages";
import type { JobSession, JobSessionView } from "../model/jobSession";
import { jobDate } from "../model/jobForm";
import { jobButton,jobPanel,jobSecondary } from "./jobStyles";
export default function JobActivityActions({session,view,enabled}: {session: JobSession;view: JobSessionView;enabled: boolean}) {
  const {language,t} = useV2Translation(jobMessages), [confirm,setConfirm] = useState<{kind: "renew"|"close";revision: string;deadline: string|null}|null>(null);
  const job = view.job; if (!job || job.status === "draft") return null;
  const canAct = enabled && view.phase === "editing", confirmation = confirm;
  const canConfirm = canAct && !!confirmation && confirmation.revision === job.edit_revision && confirmation.deadline === job.active_until;
  return <section className={jobPanel}>
    <h2 className="text-xl font-black">{t("status")}: {t(job.status === "published" ? "publishedStatus" : job.status)}</h2>
    {job.active_until ? <p className="mt-2 text-sm text-neutral-600">{t("validUntil",{date: jobDate(job.active_until,language)})}</p> : null}
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" disabled={!canAct} className={jobSecondary} onClick={() => void session.status(job.status === "published" ? "paused" : "published")}>{t(job.status === "published" ? "pause" : "resume")}</button>
      {job.status !== "closed" ? <button type="button" disabled={!canAct} className={jobSecondary} onClick={() => setConfirm({kind: "close",revision: job.edit_revision,deadline: job.active_until})}>{t("close")}</button> : null}
      <button type="button" disabled={!canAct} className={jobButton} onClick={() => setConfirm({kind: "renew",revision: job.edit_revision,deadline: job.active_until})}>{t("renew")}</button>
    </div>
    {confirmation ? <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <h3 className="font-bold">{t(confirmation.kind === "renew" ? "renewHeading" : "closeConfirm")}</h3>
      {confirmation.kind === "renew" ? <p className="mt-2 text-sm leading-6">{t("renewHelp")}</p> : null}
      {!canConfirm ? <p role="status" className="mt-3 text-sm">{t("conflict")}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3"><button type="button" className={jobButton} disabled={!canConfirm} onClick={() => {if (!canConfirm) return; setConfirm(null); void (confirmation.kind === "renew" ? session.renew() : session.status("closed"));}}>{t(confirmation.kind === "renew" ? "renewConfirm" : "close")}</button>
        <button type="button" className={jobSecondary} onClick={() => setConfirm(null)}>{t("cancel")}</button></div>
    </div> : null}
  </section>;
}
