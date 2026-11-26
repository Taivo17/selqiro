import type { JobSearch } from "../../../entities/job/model/types";

export type JobSearchPurpose = "all" | "employment" | "task";

export function jobSearchPurpose(search: JobSearch): JobSearchPurpose {
  if (search.employmentType === "task") return "task";
  // Older links may constrain workload without a subtype. Task content requires
  // null workload, so those unchanged links already select positions only.
  return search.employmentType !== null || search.workingTime !== null ? "employment" : "all";
}

/** A deliberate direction change retains common filters, not the previous position subtype/workload. */
export function changeJobSearchPurpose(search: JobSearch, purpose: JobSearchPurpose): JobSearch {
  return {...search, employmentType: purpose === "all" ? null : purpose, workingTime: null};
}

export function changeJobSearchWorkingTime(search: JobSearch, workingTime: JobSearch["workingTime"]): JobSearch {
  return {...search, employmentType: search.employmentType === "task" ? "task" : search.employmentType ?? "employment",
    workingTime: search.employmentType === "task" ? null : workingTime};
}
