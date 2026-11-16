"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { getOfferTheme } from "../../../shared/marketplace/offerTheme";
import { jobMessages } from "../model/jobMessages";
import { usePublicJobs } from "../model/usePublicJobs";
import JobCard from "./JobCard";
import JobPagination from "./JobPagination";
import { jobPanel,jobSecondary } from "./jobStyles";
export default function PublicProfileJobsSection({slug,identityId,expanded,onExpandedChange}: {slug: string;identityId: string;expanded: boolean;onExpandedChange: (value: boolean) => void}) {
  const {t} = useV2Translation(jobMessages), result = usePublicJobs({kind: "profile",slug,identityId},expanded ? 12 : 3);
  if (!result.loading && !result.error && !result.page?.items.length) return null;
  return <section className={`${jobPanel} ${getOfferTheme("job").border}`}>
    <div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-black">{t("jobs")}</h2>
      {expanded || result.page?.has_more ? <button type="button" className={jobSecondary} onClick={() => onExpandedChange(!expanded)}>{t(expanded ? "showLess" : "viewAll")}</button> : null}</div>
    {result.error ? <div role="status" className="mt-4"><p>{t("loadError")}</p><button type="button" className={`${jobSecondary} mt-3`} onClick={result.reload}>{t("retry")}</button></div>
      : result.loading ? <p role="status" className="mt-4 text-sm">{t("loading")}</p>
      : <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-2">{result.page?.items.map(job => <JobCard key={job.content_id} job={job}/>)}</div>}
    {expanded ? <JobPagination previous={result.previous} next={result.next} canPrevious={result.canPrevious} canNext={!!result.page?.has_more} loading={result.loading}/> : null}
  </section>;
}
