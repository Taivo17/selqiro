"use client";
import Link from "next/link";
import { useMyAreaIdentity } from "../../my-area/model/useMyAreaIdentity";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { jobMessages } from "../model/jobMessages";
import MyJobsSection from "./MyJobsSection";
import { jobButton,jobPanel,jobSecondary } from "./jobStyles";
export default function JobOwnerPage() {
  const identity = useMyAreaIdentity(), {t} = useV2Translation(jobMessages);
  if (identity.anonymous) return <section className={jobPanel}><h1 className="text-2xl font-black">{t("signIn")}</h1><Link href="/auth?next=%2Fv2%2Fmy-area%2Fjobs" className={`${jobButton} mt-4`}>{t("signInButton")}</Link></section>;
  return <div className="min-w-0 space-y-6"><header className={jobPanel}>
    <Link href="/v2/my-area" className="text-sm font-bold text-blue-800 underline">{t("myArea")}</Link><h1 className="mt-3 text-3xl font-black">{t("myJobs")}</h1>
    {identity.identity ? <p className="mt-3 break-words text-neutral-600">{t("employer")}: {identity.identity.displayName}</p> : null}
    {identity.error ? <button type="button" onClick={identity.refresh} className={`${jobSecondary} mt-4`}>{t("retry")}</button> : null}
  </header><MyJobsSection identity={identity.identity} actor={identity.actor} loading={identity.loading} error={identity.error}/></div>;
}
