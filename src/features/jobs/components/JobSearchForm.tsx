"use client";
import { useEffect,useState } from "react";
import { EMPTY_JOB_SEARCH,JOB_EMPLOYMENT_TYPES,JOB_WORKING_TIMES,JOB_WORKPLACES,type JobSearch } from "../../../entities/job/model/types";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { jobMessages } from "../model/jobMessages";
import { useJobCategories } from "../model/useJobCategories";
import { changeJobSearchPurpose,changeJobSearchWorkingTime,jobSearchPurpose,type JobSearchPurpose } from "../model/jobSearchPurpose";
import JobCountryField from "./JobCountryField";
import { jobButton,jobField,jobSecondary } from "./jobStyles";
export default function JobSearchForm({value,onSearch}: {value: JobSearch;onSearch: (value: JobSearch) => void}) {
  const {language,t} = useV2Translation(jobMessages), categories = useJobCategories(), [form,setForm] = useState<JobSearch>(value);
  const [countryReset,setCountryReset] = useState(0);
  const serialized = JSON.stringify(value);
  useEffect(() => {setForm(JSON.parse(serialized) as JobSearch);},[serialized]);
  const purpose = jobSearchPurpose(form);
  const set = (key: keyof JobSearch,value: string) => setForm(previous => ({...previous,[key]: value || (key === "query" ? "" : null)}));
  const submit = (search: JobSearch) => onSearch({...search,query: search.query.trim(),city: search.city?.trim() || null,countryCode: search.countryCode?.toUpperCase() || null});
  const choosePurpose = (next: JobSearchPurpose) => {const search=changeJobSearchPurpose(form,next);setForm(search);submit(search);};
  return <form onSubmit={event => {event.preventDefault();submit(form);}} className="mt-5 space-y-5">
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm font-bold">{t("searchPurpose")}</legend>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {(["employment","task"] as const).map(item => <label key={item} className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border p-4 ${purpose === item ? "border-blue-600 bg-blue-50" : "border-neutral-200 bg-white"}`}>
          <input type="radio" name="job-search-purpose" value={item} checked={purpose === item} onChange={() => choosePurpose(item)} className="mt-1 size-4 shrink-0 accent-blue-700"/>
          <span className="min-w-0"><span className="block font-bold">{t(item === "employment" ? "lookForEmployment" : "lookForTasks")}</span>
          <span className="mt-1 block text-sm leading-6 text-neutral-600">{t(item === "employment" ? "lookForEmploymentHelp" : "lookForTasksHelp")}</span></span>
        </label>)}
      </div>
      <button type="button" aria-pressed={purpose === "all"} onClick={() => choosePurpose("all")} className="mt-2 min-h-11 cursor-pointer text-sm font-bold text-blue-800 underline underline-offset-2">{t("allOffers")}</button>
    </fieldset>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_auto]">
      <label className="block text-sm font-bold">{t("query")}<input className={jobField} maxLength={200} value={form.query} placeholder={t(purpose === "employment" ? "employmentSearchPlaceholder" : purpose === "task" ? "taskSearchPlaceholder" : "anySearchPlaceholder")} onChange={event => set("query",event.target.value)}/></label>
      <label className="block text-sm font-bold">{t("category")}<select className={jobField} disabled={categories.loading} value={form.category ?? ""} onChange={event => set("category",event.target.value)}><option value="">{t("allCategories")}</option>{categories.items.map(category => <option key={category.code} value={category.code}>{language === "et" ? category.labels.et : category.labels.en}</option>)}</select></label>
      <button type="submit" className={`${jobButton} self-end`}>{t("search")}</button>
    </div>
    {categories.error ? <div role="status" className="text-sm"><p>{t("loadError")}</p><button type="button" className="mt-2 font-bold underline" onClick={categories.reload}>{t("retry")}</button></div> : null}
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <JobCountryField key={`${serialized}:${countryReset}`} filter value={form.countryCode ?? ""} onChange={value => set("countryCode",value)}/>
      <label className="block text-sm font-bold">{t("city")}<input className={jobField} value={form.city ?? ""} maxLength={160} aria-describedby="job-search-city-help" onChange={event => set("city",event.target.value)}/>
        <span id="job-search-city-help" className="mt-2 block text-xs font-normal leading-5 text-neutral-600">{t("exactCityFilterHelp")}</span></label>
    </div>
    <details className="rounded-2xl border border-neutral-200 p-4"><summary className="cursor-pointer text-sm font-bold">{t("filters")}</summary>
      <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-bold">{t("workplace")}<select className={jobField} value={form.workplaceType ?? ""} onChange={event => set("workplaceType",event.target.value)}><option value="">{t("allWorkplaces")}</option>{JOB_WORKPLACES.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label>
        {purpose === "employment" ? <>
          <label className="block text-sm font-bold">{t("employment")}<select className={jobField} value={form.employmentType ?? "employment"} onChange={event => set("employmentType",event.target.value)}><option value="employment">{t("allPositions")}</option>{JOB_EMPLOYMENT_TYPES.filter(item => item !== "task").map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label>
          <label className="block text-sm font-bold">{t("workingTime")}<select className={jobField} value={form.workingTime ?? ""} onChange={event => {const next=(event.target.value || null) as JobSearch["workingTime"];setForm(previous => changeJobSearchWorkingTime(previous,next));}}><option value="">{t("anyWorkingTime")}</option>{JOB_WORKING_TIMES.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label>
        </> : null}
      </div>
    </details>
    <button type="button" className={jobSecondary} onClick={() => {setForm(EMPTY_JOB_SEARCH); setCountryReset(previous => previous + 1); onSearch(EMPTY_JOB_SEARCH);}}>{t("clearFilters")}</button>
  </form>;
}
