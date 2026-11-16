"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { JobPolicy } from "../../../entities/job/model/types";
import { sameJobValue } from "../../../entities/job/model/jobContent";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { jobMessages } from "../model/jobMessages";
import { EMPTY_JOB_FORM, jobFormContent, jobToForm, type JobForm } from "../model/jobForm";
import { useJobCategories } from "../model/useJobCategories";
import type { JobSession, JobSessionView } from "../model/jobSession";
import JobFields from "./JobFields";
import JobActionFeedback from "./JobActionFeedback";
import JobActivityActions from "./JobActivityActions";
import { jobButton,jobPanel,jobSecondary } from "./jobStyles";
type Props = {session: JobSession;view: JobSessionView;enabled: boolean;policies: readonly JobPolicy[];reloadPolicies: () => void};
export default function JobEditorForm({session,view,enabled,policies,reloadPolicies}: Props) {
  const {t} = useV2Translation(jobMessages), categories = useJobCategories();
  const [form,setForm] = useState<JobForm>({...EMPTY_JOB_FORM}), [accepted,setAccepted] = useState(false), [invalid,setInvalid] = useState(false);
  const initialized = useRef(false), completed = useRef(view.completion), signature = JSON.stringify(policies.map(({documentId,version,contentHash}) => ({documentId,version,contentHash})));
  useEffect(() => {setAccepted(false);},[signature]);
  useEffect(() => {
    if (!enabled || initialized.current && completed.current === view.completion) return;
    const content = !initialized.current && view.pending?.operation === "save" ? view.pending.input.content : view.job?.content;
    setForm(content ? jobToForm(content) : {...EMPTY_JOB_FORM}); initialized.current = true; completed.current = view.completion; setInvalid(false);
  },[enabled,view.completion,view.job,view.pending]);
  let dirty = form.title !== "" || form.description !== "";
  try {dirty = !view.job || !sameJobValue(jobFormContent(form),view.job.content);} catch {dirty = Object.keys(form).some(key => form[key as keyof JobForm] !== (view.job ? jobToForm(view.job.content) : EMPTY_JOB_FORM)[key as keyof JobForm]);}
  useEffect(() => {if (!dirty && !view.pending) return; const warn = (event: BeforeUnloadEvent) => {event.preventDefault(); event.returnValue = "";};
    window.addEventListener("beforeunload",warn); return () => window.removeEventListener("beforeunload",warn);
  },[dirty,view.pending]);
  const editable = enabled && view.phase === "editing", first = !view.job || view.job.status === "draft";
  const reload = () => {if (!dirty || window.confirm(t("reloadConfirm"))) void session.reload();};
  const leave = (event: React.MouseEvent<HTMLAnchorElement>) => {if ((dirty || view.pending) && !window.confirm(t("leaveConfirm"))) event.preventDefault();};
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!editable || !accepted || categories.loading || categories.error) return;
    try {const content = jobFormContent(form); setInvalid(false);
      await session.submit(content,policies.map(({documentId,version,contentHash}) => ({documentId,version,contentHash,accepted: true})));
    } catch {setInvalid(true);}
  }
  return <div className="min-w-0 space-y-6">
    <JobActionFeedback session={session} view={view} enabled={enabled} onReload={reload}/>
    <form onSubmit={event => void submit(event)} className="min-w-0 space-y-6">
      {categories.error ? <div role="alert" className={jobPanel}><p>{t("loadError")}</p><button type="button" className={`${jobSecondary} mt-4`} onClick={categories.reload}>{t("retry")}</button></div> : null}
      <JobFields form={form} change={(key,value) => {setForm(previous => ({...previous,[key]: value})); setInvalid(false);}} categories={categories.items} disabled={!editable || categories.loading || categories.error}/>
      <section className={jobPanel}>
        <h2 className="text-xl font-black">{t("policyHeading")}</h2>
        {policies.map(policy => <details key={`${policy.documentId}:${policy.contentHash}`} className="mt-4 rounded-2xl border border-neutral-200 p-4"><summary className="cursor-pointer font-bold">{policy.title}</summary><div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6">{policy.body}</div></details>)}
        <label className="mt-5 flex min-h-11 items-start gap-3 text-sm leading-6"><input type="checkbox" required checked={accepted} disabled={!editable || !policies.length} className="mt-1 h-5 w-5 shrink-0 accent-blue-700" onChange={event => setAccepted(event.target.checked)}/>{t("policyAccept")}</label>
        {view.message === "policyChanged" ? <button type="button" className={`${jobSecondary} mt-3`} onClick={reloadPolicies}>{t("reload")}</button> : null}
      </section>
      {invalid ? <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t("invalid")}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={jobButton} disabled={!editable || !accepted || !policies.length || categories.loading || categories.error || !first && !dirty}>{t(view.phase === "writing" ? "saving" : first ? "publish" : "save")}</button>
        <Link href="/v2/my-area/jobs" className={jobSecondary} onClick={leave}>{t("myJobs")}</Link>
        {view.job && view.job.status !== "draft" ? <Link className={jobSecondary} href={`/v2/job/${view.job.job_id}`} onClick={leave}>{t("viewPublic")}</Link> : null}
      </div>
    </form>
    <JobActivityActions session={session} view={view} enabled={enabled && !dirty}/>
  </div>;
}
