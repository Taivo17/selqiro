import { normalizeListingPriceForm } from "../../../entities/listing/model/listingPriceInput";
import { parseJobContent } from "../../../entities/job/model/jobContent";
import { JobError, type JobContent } from "../../../entities/job/model/types";
import type { JobMessageKey } from "./jobMessages";
export type JobForm = {[K in keyof JobContent]: string};
export const EMPTY_JOB_FORM: JobForm = Object.freeze({title: "", description: "", category: "", countryCode: "", city: "", locationLabel: "",
  workplaceType: "on_site", employmentType: "", workingTime: "", salaryMin: "", salaryMax: "", salaryCurrency: "", salaryPeriod: ""});
export function jobToForm(content: JobContent): JobForm {return Object.fromEntries(Object.entries(content).map(([key,value]) => [key,value ?? ""])) as JobForm;}
export function jobFormContent(form: JobForm): JobContent {
  try {
    const min = form.salaryMin.trim(), max = form.salaryMax.trim(), salary = !!(min || max);
    const amount = (value: string) => {if (!value) return null; const price = normalizeListingPriceForm("fixed", value, form.salaryCurrency); if (price.kind !== "fixed") throw new JobError("invalid"); return price.amount;};
    return parseJobContent({...form, title: form.title.trim(), description: form.description.trim(), countryCode: form.countryCode.trim().toUpperCase() || null,
      city: form.city.trim() || null, locationLabel: form.locationLabel.trim() || null,
      employmentType: form.employmentType || null, workingTime: form.workingTime || null,
      salaryMin: salary ? amount(min) : null, salaryMax: salary ? amount(max) : null,
      salaryCurrency: salary ? form.salaryCurrency : null, salaryPeriod: salary ? form.salaryPeriod : null});
  } catch {throw new JobError("invalid");}
}
type Text = (key: JobMessageKey, params?: Record<string,string | number>) => string;
export function jobSalary(content: JobContent, t: Text): string | null {
  const {salaryMin: min,salaryMax: max,salaryCurrency: currency,salaryPeriod: period} = content;
  if ((!min && !max) || !currency || !period) return null;
  const amount = min && max ? min === max ? `${min} ${currency}` : `${min}–${max} ${currency}`
    : min ? t("payFromLabel", {amount: `${min} ${currency}`}) : t("salaryUpTo", {amount: `${max} ${currency}`});
  return `${amount} / ${t(period)}`;
}
export function jobCountryName(code: string, language: string): string {
  try {return new Intl.DisplayNames([language === "et" ? "et" : "en"], {type: "region"}).of(code) ?? code;} catch {return code;}
}
export function jobLocation(content: JobContent, language: string): string {
  return [content.locationLabel ?? content.city, content.countryCode ? jobCountryName(content.countryCode, language) : null].filter(Boolean).join(", ");
}
export function jobDate(value: string, language: string) {return new Intl.DateTimeFormat(language === "et" ? "et-EE" : "en-GB", {dateStyle: "medium"}).format(new Date(value));}
