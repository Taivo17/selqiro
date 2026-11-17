"use client";
import Link from "next/link";
import V2DiscoveryTypeSwitcher from "../../v2-shell/components/V2DiscoveryTypeSwitcher";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { getOfferSectionClass } from "../../../shared/marketplace/offerTheme";
import { EMPTY_JOB_SEARCH } from "../../../entities/job/model/types";
import { jobMessages } from "../model/jobMessages";
import { usePublicJobs } from "../model/usePublicJobs";
import { useJobSearchUrl } from "../model/useJobSearchUrl";
import JobSearchForm from "./JobSearchForm";
import JobCard from "./JobCard";
import JobPagination from "./JobPagination";
import { jobButton,jobPanel,jobSecondary } from "./jobStyles";
export default function JobDiscoveryPage() {
  const {t} = useV2Translation(jobMessages), {search,change} = useJobSearchUrl();
  const result = usePublicJobs({kind: "search",search}), filtered = Object.values(search).some(Boolean);
  return <div className="min-w-0 space-y-6">
    <V2DiscoveryTypeSwitcher active="jobs"/>
    <section className={jobPanel}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-black">{t("jobs")}</h1><p className="mt-2 text-sm text-neutral-600">{t("intro")}</p></div><Link href="/v2/my-area/jobs/new" className={jobButton}>{t("addJob")}</Link></div>
      <JobSearchForm key={JSON.stringify(search)} value={search} onSearch={value => {change(value); result.reset();}}/>
    </section>
    <section aria-busy={result.loading} aria-label={t("jobs")} className={`${getOfferSectionClass("job")} p-4 sm:p-6`}>
      {result.error ? <div role="alert" className={jobPanel}><p>{t("loadError")}</p><button type="button" className={`${jobSecondary} mt-4`} onClick={result.reload}>{t("retry")}</button></div>
        : result.loading ? <p role="status" className={jobPanel}>{t("loading")}</p>
        : !result.page?.items.length ? <div className={`${jobPanel} text-center`}><h2 className="text-xl font-bold">{t(filtered ? "noResults" : "noJobs")}</h2><p className="mt-3 text-sm leading-6 text-neutral-600">{t(filtered ? "noResultsHelp" : "noJobsHelp")}</p>{filtered ? <button type="button" className={`${jobSecondary} mt-5`} onClick={() => {change(EMPTY_JOB_SEARCH); result.reset();}}>{t("clearFilters")}</button> : <Link className={`${jobButton} mt-5`} href="/v2/my-area/jobs/new">{t("addJob")}</Link>}</div>
        : <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">{result.page.items.map(job => <JobCard key={job.content_id} job={job}/>)}</div>}
      <JobPagination previous={result.previous} next={result.next} canPrevious={result.canPrevious} canNext={!!result.page?.has_more} loading={result.loading}/>
    </section>
  </div>;
}
