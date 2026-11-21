import { normalizeListingPriceWire } from "../../listing/model/listingPriceInput";
import { JOB_CATEGORIES, JOB_EMPLOYMENT_TYPES, JOB_SALARY_PERIODS, JOB_WORKING_TIMES, JOB_WORKPLACES, JobError, type JobContent } from "./types";
export const JOB_CONTENT_KEYS = ["title", "description", "category", "countryCode", "city", "locationLabel", "workplaceType", "employmentType", "workingTime", "salaryMin", "salaryMax", "salaryCurrency", "salaryPeriod"] as const;
export const jobUuid = (value: unknown): value is string => typeof value === "string"
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value) && value !== "00000000-0000-0000-0000-000000000000";
export const jobRevision = (value: unknown): value is string => typeof value === "string" && /^[1-9][0-9]{0,18}$/.test(value)
  && BigInt(value) <= BigInt("9223372036854775807");
export function jobRecord(value: unknown, keys?: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new JobError("unknown");
  const row = value as Record<string, unknown>;
  if (keys && Object.keys(row).sort().join(",") !== [...keys].sort().join(",")) throw new JobError("unknown");
  return row;
}
export function jobTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(value) && Number.isFinite(Date.parse(value));
}
export function jobText(value: unknown, maximum: number, required = false): value is string {
  return typeof value === "string" && value === value.trim() && !value.includes("\0") && Array.from(value).length <= maximum && (!required || value.length > 0);
}
const optionalText = (value: unknown, max: number) => value === null || jobText(value, max, true);
/** Network values use the same exact money grammar as ordinary listings; no floating-point conversion. */
export function parseJobContent(value: unknown): JobContent {
  try {
    const r = jobRecord(value, JOB_CONTENT_KEYS);
    if (!jobText(r.title, 140, true) || Array.from(r.title).length < 2 || !jobText(r.description, 10000, true)
      || !JOB_CATEGORIES.includes(r.category as JobContent["category"]) || !JOB_WORKPLACES.includes(r.workplaceType as JobContent["workplaceType"])
      || !(r.countryCode === null || typeof r.countryCode === "string" && /^[A-Z]{2}$/.test(r.countryCode))
      || !optionalText(r.city, 160) || !optionalText(r.locationLabel, 300)
      || !(r.employmentType === null || JOB_EMPLOYMENT_TYPES.includes(r.employmentType as NonNullable<JobContent["employmentType"]>))
      || !(r.workingTime === null || JOB_WORKING_TIMES.includes(r.workingTime as NonNullable<JobContent["workingTime"]>))) throw new JobError("invalid");
    if (r.employmentType === "task" && r.workingTime !== null || r.salaryPeriod === "task" && r.employmentType !== "task") throw new JobError("invalid");
    const salary = r.salaryMin !== null || r.salaryMax !== null;
    if (!salary) {if (r.salaryCurrency !== null || r.salaryPeriod !== null) throw new JobError("invalid");}
    else {
      if (!JOB_SALARY_PERIODS.includes(r.salaryPeriod as NonNullable<JobContent["salaryPeriod"]>)) throw new JobError("invalid");
      for (const key of ["salaryMin", "salaryMax"] as const) if (r[key] !== null) {
        const money = normalizeListingPriceWire({kind: "fixed", amount: r[key], currency: r.salaryCurrency});
        if (money.kind !== "fixed" || money.amount !== r[key]) throw new JobError("invalid");
      }
      if (typeof r.salaryMin === "string" && typeof r.salaryMax === "string" && salaryUnits(r.salaryMin) > salaryUnits(r.salaryMax)) throw new JobError("invalid");
    }
    return Object.freeze({...r}) as JobContent;
  } catch {throw new JobError("invalid");}
}
export function salaryUnits(value: string): bigint {const [whole, fraction = ""] = value.split("."); return BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));}
/** Stable comparison ignores JSON property order, not a request's actual values. */
export function sameJobValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => sameJobValue(v, b[i]));
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>, keys = Object.keys(x);
  return keys.length === Object.keys(y).length && keys.every(k => Object.hasOwn(y, k) && sameJobValue(x[k], y[k]));
}
