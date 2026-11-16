"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { getPublicJob } from "../../../entities/job/api/jobClient";
import type { PublicJob } from "../../../entities/job/model/types";
import { useViewerReadScope } from "../../../shared/provider-controls/useViewerReadScope";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import ShareOfferButton from "../../../shared/sharing/ShareOfferButton";
import { getOfferTheme } from "../../../shared/marketplace/offerTheme";
import { jobMessages } from "../model/jobMessages";
import { jobDate,jobLocation,jobSalary } from "../model/jobForm";
import { useJobCategories } from "../model/useJobCategories";
import JobContactButton from "./JobContactButton";
import { jobPanel,jobSecondary } from "./jobStyles";
export default function JobDetailPage({jobId}: {jobId: string}) {
  const {language,t} = useV2Translation(jobMessages), viewer = useViewerReadScope("visibility"), categories = useJobCategories();
  const [revision,setRevision] = useState(0), key = `${viewer.key}:${jobId}:${revision}`;
  const [state,setState] = useState<{key: string;job: PublicJob | null;loading: boolean;error: boolean}>({key: "",job: null,loading: true,error: false});
  useEffect(() => {
    if (!viewer.ready) return; const abort = new AbortController(); setState({key,job: null,loading: true,error: false});
    void getPublicJob(jobId,abort.signal).then(job => {if (!abort.signal.aborted) setState({key,job,loading: false,error: false});},
      () => {if (!abort.signal.aborted) setState({key,job: null,loading: false,error: true});});
    return () => abort.abort();
  },[key,jobId,viewer.ready]);
  const loading = !viewer.ready || state.key !== key || state.loading, error = !!viewer.error || state.key === key && state.error;
  const job = !loading && !error ? state.job : null;
  if (error) return <section role="alert" className={jobPanel}><p>{t("loadError")}</p><button type="button" className={`${jobSecondary} mt-4`} onClick={() => {if (viewer.error) viewer.refresh(); else setRevision(value => value + 1);}}>{t("retry")}</button></section>;
  if (loading) return <p role="status" className={jobPanel}>{t("loading")}</p>;
  if (!job) return <section className={jobPanel}><h1 className="text-2xl font-black">{t("unavailable")}</h1><Link href="/v2/jobs" className={`${jobSecondary} mt-5`}>{t("viewAll")}</Link></section>;
  const content = job.content, theme = getOfferTheme("job"), location = jobLocation(content,language), salary = jobSalary(content,t);
  const category = categories.items.find(item => item.code === content.category), categoryName = category ? language === "et" ? category.labels.et : category.labels.en : null;
  return <div className="mx-auto min-w-0 max-w-5xl space-y-6">
    <Link href="/v2/jobs" className="inline-flex min-h-11 items-center text-sm font-bold text-blue-800 underline">{t("viewAll")}</Link>
    <header className={`${jobPanel} ${theme.border}`}>
      <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${theme.badge}`}>{t("jobs")}</span>
      <h1 className="mt-4 break-words text-3xl font-black leading-tight sm:text-4xl">{content.title}</h1>
      <Link href={`/v2/profile/${encodeURIComponent(job.employer.slug)}`} className="mt-3 inline-block break-words text-lg font-bold text-blue-800 hover:underline">{job.employer.name}</Link>
      {location ? <p className="mt-3 break-words text-neutral-600">{location}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2 text-sm font-medium"><span className="rounded-full bg-blue-50 px-3 py-1 text-blue-900">{t(content.workplaceType)}</span>
        {content.employmentType ? <span className="rounded-full bg-neutral-100 px-3 py-1">{t(content.employmentType)}</span> : null}
        {content.workingTime ? <span className="rounded-full bg-neutral-100 px-3 py-1">{t(content.workingTime)}</span> : null}</div>
      {salary ? <p className="mt-5 break-words text-xl font-bold">{salary}</p> : null}
    </header>
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className={jobPanel}><h2 className="text-xl font-black">{t("description")}</h2><div className="mt-4 whitespace-pre-wrap break-words text-base leading-8 text-neutral-700">{content.description}</div>
        {categoryName ? <p className="mt-6 text-sm text-neutral-600">{t("category")}: {categoryName}</p> : null}</section>
      <aside className={`${jobPanel} self-start`}><h2 className="text-xl font-black">{t("employer")}</h2><p className="mt-3 break-words font-bold">{job.employer.name}</p>
        <div className="mt-5"><JobContactButton key={job.content_id} jobId={job.content_id} identityId={job.identity_id}/></div>
        <Link className={`${jobSecondary} mt-3 w-full`} href={`/v2/profile/${encodeURIComponent(job.employer.slug)}`}>{t("viewProfile")}</Link>
        <div className="mt-3"><ShareOfferButton kind="job" id={job.content_id} title={content.title}/></div>
        <p className="mt-6 text-sm text-neutral-600">{t("validUntil",{date: jobDate(job.active_until,language)})}</p>
        <p className="mt-2 text-xs text-neutral-500">{t("publishedAt",{date: jobDate(job.published_at,language)})}</p>
      </aside>
    </div>
  </div>;
}
