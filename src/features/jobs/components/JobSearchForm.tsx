"use client";
import { useEffect,useState } from "react";
import { EMPTY_JOB_SEARCH,JOB_EMPLOYMENT_TYPES,JOB_WORKING_TIMES,JOB_WORKPLACES,type JobSearch } from "../../../entities/job/model/types";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { jobMessages } from "../model/jobMessages";
import { useJobCategories } from "../model/useJobCategories";
import JobCountryField from "./JobCountryField";
import { jobButton,jobField,jobSecondary } from "./jobStyles";
export default function JobSearchForm({value,onSearch}: {value: JobSearch;onSearch: (value: JobSearch) => void}) {
  const {language,t} = useV2Translation(jobMessages), categories = useJobCategories(), [form,setForm] = useState<JobSearch>(value);
  const [countryReset,setCountryReset] = useState(0);
  const serialized = JSON.stringify(value);
  useEffect(() => {setForm(JSON.parse(serialized) as JobSearch);},[serialized]);
  const set = (key: keyof JobSearch,value: string) => setForm(previous => ({...previous,[key]: value || (key === "query" ? "" : null)}));
  return <form onSubmit={event => {event.preventDefault(); onSearch({...form,query: form.query.trim(),city: form.city?.trim() || null,countryCode: form.countryCode?.toUpperCase() || null});}} className="mt-5 space-y-4">
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_auto]">
      <label className="block text-sm font-bold">{t("query")}<input className={jobField} maxLength={200} value={form.query} onChange={event => set("query",event.target.value)}/></label>
      <label className="block text-sm font-bold">{t("category")}<select className={jobField} disabled={categories.loading} value={form.category ?? ""} onChange={event => set("category",event.target.value)}><option value="">{t("allCategories")}</option>{categories.items.map(category => <option key={category.code} value={category.code}>{language === "et" ? category.labels.et : category.labels.en}</option>)}</select></label>
      <button type="submit" className={`${jobButton} self-end`}>{t("search")}</button>
    </div>
    {categories.error ? <div role="status" className="text-sm"><p>{t("loadError")}</p><button type="button" className="mt-2 font-bold underline" onClick={categories.reload}>{t("retry")}</button></div> : null}
    <details className="rounded-2xl border border-neutral-200 p-4"><summary className="cursor-pointer text-sm font-bold">{t("filters")}</summary>
      <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <JobCountryField key={`${serialized}:${countryReset}`} filter value={form.countryCode ?? ""} onChange={value => set("countryCode",value)}/>
        <label className="block text-sm font-bold">{t("city")}<input className={jobField} value={form.city ?? ""} maxLength={160} onChange={event => set("city",event.target.value)}/></label>
        <label className="block text-sm font-bold">{t("workplace")}<select className={jobField} value={form.workplaceType ?? ""} onChange={event => set("workplaceType",event.target.value)}><option value="">{t("allWorkplaces")}</option>{JOB_WORKPLACES.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label>
        <label className="block text-sm font-bold">{t("employment")}<select className={jobField} value={form.employmentType ?? ""} onChange={event => set("employmentType",event.target.value)}><option value="">{t("anyEmployment")}</option>{JOB_EMPLOYMENT_TYPES.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label>
        <label className="block text-sm font-bold">{t("workingTime")}<select className={jobField} value={form.workingTime ?? ""} onChange={event => set("workingTime",event.target.value)}><option value="">{t("anyWorkingTime")}</option>{JOB_WORKING_TIMES.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label>
      </div>
      <button type="button" className={`${jobSecondary} mt-4`} onClick={() => {setForm(EMPTY_JOB_SEARCH); setCountryReset(previous => previous + 1); onSearch(EMPTY_JOB_SEARCH);}}>{t("clearFilters")}</button>
    </details>
  </form>;
}
