import type { PublicationActor } from "../../listing/model/publicationJourney";
export type JobActor = PublicationActor;
export const JOB_CATEGORIES = ["administration", "agriculture", "construction", "customer_service", "education", "engineering", "finance", "healthcare", "hospitality", "information_technology", "logistics", "manufacturing", "sales_marketing", "other"] as const;
export const JOB_WORKPLACES = ["on_site", "remote", "hybrid"] as const;
export const JOB_EMPLOYMENT_TYPES = ["permanent", "fixed_term", "contract", "internship", "other"] as const;
export const JOB_WORKING_TIMES = ["full_time", "part_time", "flexible", "other"] as const;
export const JOB_SALARY_PERIODS = ["hour", "day", "week", "month", "year"] as const;
export const JOB_STATUSES = ["draft", "published", "paused", "closed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export type JobContent = Readonly<{
  title: string; description: string; category: (typeof JOB_CATEGORIES)[number]; countryCode: string | null;
  city: string | null; locationLabel: string | null; workplaceType: (typeof JOB_WORKPLACES)[number];
  employmentType: (typeof JOB_EMPLOYMENT_TYPES)[number] | null; workingTime: (typeof JOB_WORKING_TIMES)[number] | null;
  salaryMin: string | null; salaryMax: string | null; salaryCurrency: string | null; salaryPeriod: (typeof JOB_SALARY_PERIODS)[number] | null;
}>;
export type JobCategory = Readonly<{code: JobContent["category"]; labels: Readonly<{en: string; et: string}>}>;
export type PublicJob = Readonly<{
  schema_version: 1; content_type: "job"; content_id: string; identity_id: string; content: JobContent; status: "published";
  created_at: string; updated_at: string; published_at: string; active_until: string;
  employer: Readonly<{name: string; slug: string; logo_url: string | null}>;
}>;
export type OwnerJob = Readonly<{
  schema_version: 1; content_type: "job"; actor_user_id: string; identity_id: string; job_id: string;
  edit_revision: string; status: JobStatus; content: JobContent; created_at: string; updated_at: string;
  published_at: string | null; active_until: string | null; last_confirmed_at: string | null;
}>;
export type PublicJobCursor = Readonly<{published_at: string; id: string}>;
export type OwnerJobCursor = Readonly<{created_at: string; id: string}>;
export type JobPage<Item, Cursor> = Readonly<{schema_version: 1; items: readonly Item[]; result_limit: number;
  has_more: boolean; next_cursor: Cursor | null; read_at: string}>;
export type PublicJobPage = JobPage<PublicJob, PublicJobCursor>;
export type ProfileJobPage = PublicJobPage & Readonly<{seller_slug: string; identity_id: string | null}>;
export type OwnerJobPage = JobPage<OwnerJob, OwnerJobCursor> & Readonly<{actor_user_id: string; identity_id: string}>;
export type JobSearch = Readonly<{query: string; category: JobContent["category"] | null; countryCode: string | null;
  city: string | null; workplaceType: JobContent["workplaceType"] | null;
  employmentType: JobContent["employmentType"]; workingTime: JobContent["workingTime"]}>;
export const EMPTY_JOB_SEARCH: JobSearch = Object.freeze({query: "", category: null, countryCode: null, city: null,
  workplaceType: null, employmentType: null, workingTime: null});
export type JobPolicy = Readonly<{documentId: string; version: string; contentHash: string; title: string; body: string; locale: string}>;
export type ShownJobPolicy = Readonly<Pick<JobPolicy, "documentId" | "version" | "contentHash"> & {accepted: true}>;
export type JobOperation = "save" | "publish" | "status" | "renew";
export type JobRequest =
  | Readonly<{operation: "save"; input: Readonly<{job_id: string | null; expected_revision: string | null; content: JobContent; policy_snapshot: readonly ShownJobPolicy[]}>}>
  | Readonly<{operation: "publish"; input: Readonly<{job_id: string; expected_revision: string; policy_snapshot: readonly ShownJobPolicy[]}>}>
  | Readonly<{operation: "status"; input: Readonly<{job_id: string; expected_revision: string; expected_status: JobStatus; status: JobStatus}>}>
  | Readonly<{operation: "renew"; input: Readonly<{job_id: string; expected_revision: string; expected_active_until: string}>}>;
export type JobIntent = JobRequest & Readonly<{actor: JobActor; requestKey: string}>;
export type JobMutation = Readonly<{schema_version: 1; actor_user_id: string; identity_id: string; request_key: string;
  operation: JobOperation; job: OwnerJob; changed: boolean}>;
export type JobReceipt = Readonly<{schema_version: 1; actor_user_id: string; identity_id: string; request_key: string;
  found: boolean; operation: JobOperation | null; request: JobRequest["input"] | null; result: JobMutation | null}>;
export type JobFailure = "invalid" | "forbidden" | "conflict" | "policy" | "renewal" | "profile" | "unknown";
export class JobError extends Error { constructor(readonly kind: JobFailure) {super("job_" + kind); this.name = "JobError";} }
