import { EMPTY_JOB_SEARCH,JOB_CATEGORIES,JOB_EMPLOYMENT_TYPES,JOB_WORKING_TIMES,JOB_WORKPLACES,type JobSearch } from "../../../entities/job/model/types";
/** Only public filter values enter this URL; no identity, tokens, private drafts or raw return URL. */
export function readJobSearch(search: string): JobSearch {
  const params = new URLSearchParams(search);
  const text = (key: string,max: number) => {const value = (params.get(key) ?? "").trim(); return Array.from(value).length <= max && !/[\u0000-\u001f]/.test(value) ? value : "";};
  const choice = <T extends string>(key: string,values: readonly T[]): T | null => {const value = text(key,80); return values.includes(value as T) ? value as T : null;};
  const country = text("country",2).toUpperCase();
  const employmentType = choice("employment",JOB_EMPLOYMENT_TYPES);
  return {query: text("q",200),category: choice("category",JOB_CATEGORIES),countryCode: /^[A-Z]{2}$/.test(country) ? country : null,city: text("city",160) || null,
    workplaceType: choice("workplace",JOB_WORKPLACES),employmentType,workingTime: employmentType === "task" ? null : choice("hours",JOB_WORKING_TIMES)};
}
export function jobSearchUrl(input: JobSearch): string {
  const params = new URLSearchParams(), mapping = {query: "q",category: "category",countryCode: "country",city: "city",workplaceType: "workplace",employmentType: "employment",workingTime: "hours"};
  for (const key of Object.keys(EMPTY_JOB_SEARCH) as (keyof JobSearch)[]) if (input[key]) params.set(mapping[key],input[key]!);
  const canonical = readJobSearch(params.toString()), result = new URLSearchParams();
  for (const key of Object.keys(EMPTY_JOB_SEARCH) as (keyof JobSearch)[]) if (canonical[key]) result.set(mapping[key],canonical[key]!);
  return "/v2/jobs" + (result.size ? "?" + result.toString() : "");
}
