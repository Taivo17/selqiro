"use client";
import Link from "next/link";
import type { IdentitySummary } from "../../../entities/identity/model/types";
import type { JobActor } from "../../../entities/job/model/types";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { getOfferSectionClass } from "../../../shared/marketplace/offerTheme";
import { jobMessages } from "../model/jobMessages";
import { jobDate } from "../model/jobForm";
import { useOwnerJobs } from "../model/useOwnerJobs";
import JobPagination from "./JobPagination";
import { jobButton,jobSecondary } from "./jobStyles";
type Props = {identity: IdentitySummary | null;actor: JobActor | null;loading: boolean;error: string | null};
export default function MyJobsSection({identity,actor,loading,error}: Props) {
  const {language,t} = useV2Translation(jobMessages), business = identity?.type === "business", result = useOwnerJobs(actor,business && !loading && !error);
  return <section id="my-area-jobs" className={`${getOfferSectionClass("job")} scroll-mt-28 p-5 sm:p-7`}>
    <div className="flex flex-wrap items-start justify-between gap-4"><h2 className="text-2xl font-black">{t("myJobs")}</h2><Link href="/v2/my-area/jobs/new" className={jobButton}>{t("addJob")}</Link></div>
    {loading ? <p role="status" className="mt-5">{t("loading")}</p>
      : error ? <p role="status" className="mt-5">{t("forbidden")}</p>
      : !business ? <p className="mt-5 rounded-2xl bg-white p-5 text-sm leading-6 text-neutral-600">{t("chooseBusiness")} {t("chooseBusinessHelp")}</p>
      : result.error ? <div role="alert" className="mt-5 rounded-2xl bg-white p-5"><p>{t("loadError")}</p><button type="button" className={`${jobSecondary} mt-3`} onClick={result.reload}>{t("retry")}</button></div>
      : result.loading ? <p role="status" className="mt-5">{t("loading")}</p>
      : !result.page?.items.length ? <p className="mt-5 rounded-2xl bg-white p-5 text-sm leading-6 text-neutral-600">{t("noOwnerJobs")}</p>
      : <div className="mt-5 divide-y divide-neutral-200 rounded-2xl bg-white px-5 pt-5">{result.page.items.map(job => {
        const expired = job.active_until && Date.parse(job.active_until) <= Date.parse(result.page!.read_at);
        const status = job.status === "published" ? expired ? "expired" : "active" : job.status;
        return <article key={job.job_id} className="flex min-w-0 flex-wrap items-start justify-between gap-4 py-5 first:pt-0">
          <div className="min-w-0 flex-1"><h3 className="break-words text-lg font-bold"><Link href={`/v2/my-area/jobs/${job.job_id}/edit`} className="hover:text-blue-800 hover:underline">{job.content.title}</Link></h3>
            <p className="mt-2 text-sm font-medium text-neutral-600">{t(status)}</p>
            {job.active_until ? <p className="mt-1 text-xs text-neutral-500">{t("validUntil",{date: jobDate(job.active_until,language)})}</p> : null}
          </div>
          <Link href={`/v2/my-area/jobs/${job.job_id}/edit`} className={jobSecondary}>{t("manage")}</Link>
        </article>;
      })}</div>}
    {business ? <JobPagination previous={result.previous} next={result.next} canPrevious={result.canPrevious} canNext={!!result.page?.has_more} loading={result.loading}/> : null}
  </section>;
}
