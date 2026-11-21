"use client";
import { LISTING_CURRENCIES } from "../../../shared/currency/listingCurrencies.generated";
import { JOB_EMPLOYMENT_TYPES,JOB_WORKING_TIMES,JOB_WORKPLACES,JOB_SALARY_PERIODS,type JobCategory } from "../../../entities/job/model/types";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { jobMessages } from "../model/jobMessages";
import { jobFormContent,jobSalary,type JobForm } from "../model/jobForm";
import JobCountryField from "./JobCountryField";
import { jobField,jobPanel } from "./jobStyles";
type Props = {form: JobForm;change: (key: keyof JobForm,value: string) => void;categories: readonly JobCategory[];disabled: boolean};
export default function JobFields({form,change,categories,disabled}: Props) {
  const {language,t} = useV2Translation(jobMessages), task = form.employmentType === "task";
  let preview: string | null = null;
  try {preview = jobSalary(jobFormContent({...form,title: "Preview",description: "Preview",category: categories[0]?.code ?? "other"}),t);} catch { /* A malformed partial amount stays editable. */ }
  return <fieldset disabled={disabled} className="min-w-0 space-y-6">
    <section className={jobPanel}>
      <fieldset className="mb-6 min-w-0"><legend className="text-lg font-black">{t("workPurpose")}</legend>
        <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
          {(["task","employment"] as const).map(kind => <label key={kind} className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border p-4 ${task === (kind === "task") ? "border-blue-600 bg-blue-50" : "border-neutral-200 bg-white"}`}>
            <input type="radio" name="job-purpose" value={kind} checked={task === (kind === "task")} className="mt-1 h-4 w-4 shrink-0 accent-blue-700" onChange={() => change("employmentType",kind === "task" ? "task" : "")}/>
            <span className="min-w-0"><span className="block font-bold">{t(kind === "task" ? "findTaskWorker" : "findEmployee")}</span><span className="mt-1 block text-sm leading-6 text-neutral-600">{t(kind === "task" ? "taskHelp" : "employmentHelp")}</span></span>
          </label>)}
        </div>
      </fieldset>
      <label className="block text-sm font-bold">{t("title")}<input required minLength={2} maxLength={140} className={jobField} value={form.title} placeholder={t(task ? "taskTitlePlaceholder" : "titlePlaceholder")} onChange={event => change("title",event.target.value)}/></label>
      <label className="mt-5 block text-sm font-bold">{t("category")}<select required className={jobField} value={form.category} onChange={event => change("category",event.target.value)}>
        <option value="">{t("chooseCategory")}</option>{categories.map(category => <option key={category.code} value={category.code}>{language === "et" ? category.labels.et : category.labels.en}</option>)}
      </select></label>
      <label className="mt-5 block text-sm font-bold">{t("description")}<textarea required rows={9} maxLength={10000} className={jobField} value={form.description} placeholder={t(task ? "taskDescriptionPlaceholder" : "descriptionPlaceholder")} onChange={event => change("description",event.target.value)}/></label>
    </section>
    <section className={jobPanel}>
      <h2 className="text-xl font-black">{t("location")}</h2><p className="mt-2 text-sm leading-6 text-neutral-600">{t("countryHelp")}</p>
      <div className="mt-4 grid min-w-0 gap-5 sm:grid-cols-2"><JobCountryField value={form.countryCode} onChange={value => change("countryCode",value)} disabled={disabled}/>
        <label className="block text-sm font-bold">{t("city")}<input className={jobField} value={form.city} maxLength={160} onChange={event => change("city",event.target.value)}/></label>
        <label className="block text-sm font-bold sm:col-span-2">{t("locationLabel")}<input className={jobField} value={form.locationLabel} maxLength={300} onChange={event => change("locationLabel",event.target.value)}/></label>
        <label className="block text-sm font-bold">{t("workplace")}<select className={jobField} value={form.workplaceType} onChange={event => change("workplaceType",event.target.value)}>{JOB_WORKPLACES.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label>
        {!task ? <><label className="block text-sm font-bold">{t("employment")}<select className={jobField} value={form.employmentType} onChange={event => change("employmentType",event.target.value)}><option value="">{t("unspecified")}</option>{JOB_EMPLOYMENT_TYPES.filter(item => item !== "task").map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label>
          <label className="block text-sm font-bold">{t("workingTime")}<select className={jobField} value={form.workingTime} onChange={event => change("workingTime",event.target.value)}><option value="">{t("unspecified")}</option>{JOB_WORKING_TIMES.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label></> : null}
      </div>
    </section>
    <section className={jobPanel}>
      <h2 className="text-xl font-black">{t("pay")}</h2><p className="mt-2 text-sm leading-6 text-neutral-600">{t("payHelp")}</p>
      <div className="mt-4 grid min-w-0 gap-5 sm:grid-cols-2">
        {(["salaryMin","salaryMax"] as const).map(key => <label key={key} className="block text-sm font-bold">{t(key === "salaryMin" ? "minimum" : "maximum")}<input inputMode="decimal" maxLength={64} className={jobField} value={form[key]} onChange={event => change(key,event.target.value)}/></label>)}
        <label className="block text-sm font-bold">{t("currency")}<select required={!!(form.salaryMin.trim() || form.salaryMax.trim())} className={jobField} value={form.salaryCurrency} onChange={event => change("salaryCurrency",event.target.value)}><option value="">{t("unspecified")}</option>{LISTING_CURRENCIES.map(currency => <option key={currency.code} value={currency.code}>{currency.code} — {currency.name}</option>)}</select></label>
        <label className="block text-sm font-bold">{t("period")}<select required={!!(form.salaryMin.trim() || form.salaryMax.trim())} className={jobField} value={form.salaryPeriod} onChange={event => change("salaryPeriod",event.target.value)}><option value="">{t("unspecified")}</option>{JOB_SALARY_PERIODS.filter(period => period !== "task" || task).map(period => <option key={period} value={period}>{t(period === "task" ? "wholeTask" : period)}</option>)}</select></label>
      </div>{preview ? <p className="mt-4 break-words text-lg font-bold">{preview}</p> : null}
    </section>
  </fieldset>;
}
