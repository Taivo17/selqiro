"use client";
import Link from "next/link";
import type { PublicJob } from "../../../entities/job/model/types";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { getOfferTheme } from "../../../shared/marketplace/offerTheme";
import { jobMessages } from "../model/jobMessages";
import { jobDate,jobLocation,jobSalary } from "../model/jobForm";
export default function JobCard({job}: {job: PublicJob}) {
  const {language,t} = useV2Translation(jobMessages), theme = getOfferTheme("job"), location = jobLocation(job.content,language), salary = jobSalary(job.content,t);
  return <Link href={`/v2/job/${job.content_id}`} aria-label={job.content.title}
    className={`group block h-full min-w-0 cursor-pointer rounded-[26px] border bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 motion-reduce:transition-none ${theme.border}`}>
    <article>
    <div className="flex min-w-0 flex-wrap items-center gap-2"><p className="min-w-0 truncate text-sm font-medium text-neutral-600">{job.employer.name}</p>
      {job.employer.identity_type ? <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">{t(job.employer.identity_type === "private" ? "privatePublisher" : "businessPublisher")}</span> : null}</div>
    <h3 className="mt-2 break-words text-xl font-black leading-7 text-neutral-950 group-hover:text-blue-800 group-focus-visible:text-blue-800">{job.content.title}</h3>
    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold"><span className={`rounded-full px-3 py-1 ${theme.badge}`}>{t(job.content.employmentType === "task" ? "task" : "employmentOffer")}</span>
      {job.content.employmentType && job.content.employmentType !== "task" ? <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">{t(job.content.employmentType)}</span> : null}
      <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">{t(job.content.workplaceType)}</span>
      {job.content.workingTime ? <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">{t(job.content.workingTime)}</span> : null}</div>
    {location ? <p className="mt-3 break-words text-sm text-neutral-600">{location}</p> : null}
    {salary ? <p className="mt-3 break-words font-bold text-neutral-950">{salary}</p> : null}
    <p className="mt-4 text-xs text-neutral-500">{t("validUntil",{date: jobDate(job.active_until,language)})}</p>
    </article>
  </Link>;
}
