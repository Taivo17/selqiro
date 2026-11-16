"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { jobMessages } from "../model/jobMessages";
import type { JobSession, JobSessionView } from "../model/jobSession";
import { jobSecondary } from "./jobStyles";
export default function JobActionFeedback({session,view,enabled,onReload}: {session: JobSession;view: JobSessionView;enabled: boolean;onReload: () => void}) {
  const {t} = useV2Translation(jobMessages);
  return <div aria-live="polite" className="space-y-3">
    {view.message ? <p role="status" className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6">{t(view.message)}</p> : null}
    <div className="flex flex-wrap gap-3">
      {["uncertain","retryable"].includes(view.phase) ? <button type="button" disabled={!enabled} className={jobSecondary} onClick={() => void session.check()}>{t("checkResult")}</button> : null}
      {["retryable","continue"].includes(view.phase) ? <button type="button" disabled={!enabled} className={jobSecondary} onClick={() => void session.retrySame()}>{t(view.phase === "continue" ? "continuePublishing" : "retrySame")}</button> : null}
      {view.phase === "blocked" && view.message !== "storageError" ? <button type="button" disabled={!enabled} className={jobSecondary} onClick={onReload}>{t("reload")}</button> : null}
    </div>
  </div>;
}
