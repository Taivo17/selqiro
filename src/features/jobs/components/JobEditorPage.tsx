"use client";
import Link from "next/link";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { getOfferTheme } from "../../../shared/marketplace/offerTheme";
import { jobMessages } from "../model/jobMessages";
import { useJobEditor } from "../model/useJobEditor";
import JobEditorForm from "./JobEditorForm";
import { jobButton,jobPanel,jobSecondary } from "./jobStyles";
export default function JobEditorPage({jobId = null}: {jobId?: string | null}) {
  const {t} = useV2Translation(jobMessages), editor = useJobEditor(jobId ?? "new");
  const route = jobId ? `/v2/my-area/jobs/${encodeURIComponent(jobId)}/edit` : "/v2/my-area/jobs/new";
  const {context,identity,bound,view,ready} = editor;
  return <div className="mx-auto min-w-0 max-w-4xl space-y-6">
    <header className={`${jobPanel} ${getOfferTheme("job").border}`}>
      <Link className="text-sm font-bold text-blue-800 underline" href="/v2/my-area/jobs">{t("myJobs")}</Link>
      <h1 className="mt-3 text-3xl font-black">{t(jobId || view.job ? "editJob" : "addJob")}</h1>
      <p className="mt-3 text-sm leading-6 text-neutral-600">{t(jobId || view.job?.status !== undefined && view.job.status !== "draft" ? "ownerNotice" : "publishNotice")}</p>
      {ready && identity ? <div className="mt-5 rounded-2xl bg-blue-50 p-4"><p className="text-sm font-medium text-blue-800">{t("employer")}</p><p className="mt-1 break-words font-bold">{identity.displayName}</p></div> : null}
    </header>
    {context.anonymous ? <section className={jobPanel}><p>{t("signIn")}</p><Link href={`/auth?next=${encodeURIComponent(route)}`} className={`${jobButton} mt-4`}>{t("signInButton")}</Link></section>
      : editor.error ? <section role="alert" className={jobPanel}><p>{t("loadError")}</p><button type="button" className={`${jobSecondary} mt-4`} onClick={editor.reload}>{t("retry")}</button></section>
      : !ready ? <p role="status" className={jobPanel}>{t("loading")}</p>
      : identity?.type !== "business" ? <section className={jobPanel}><h2 className="text-xl font-bold">{t("chooseBusiness")}</h2><p className="mt-2 text-sm leading-6">{t("chooseBusinessHelp")}</p></section> : null}
    {bound ? <div hidden={!ready || identity?.type !== "business"}>
      <JobEditorForm key={bound.key} session={bound.session} view={view} enabled={ready && identity?.type === "business"} policies={editor.policies} reloadPolicies={editor.reload}/>
    </div> : null}
  </div>;
}
