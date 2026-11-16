import { jobRecord, jobRevision, jobText, jobTimestamp, jobUuid, parseJobContent, sameJobValue } from "./jobContent";
import { JOB_CATEGORIES, JOB_STATUSES, JobError, type JobActor, type JobCategory, type JobIntent, type JobMutation, type JobPolicy, type JobReceipt,
  type OwnerJob, type OwnerJobCursor, type OwnerJobPage, type ProfileJobPage, type PublicJob, type PublicJobCursor, type PublicJobPage } from "./types";
const ensure: (value: unknown) => asserts value = value => {if (!value) throw new JobError("unknown");};
const optionalStamp = (value: unknown) => value === null || jobTimestamp(value);
function actor(row: Record<string, unknown>, expected: JobActor) {
  ensure(jobUuid(expected.userId) && jobUuid(expected.identityId) && row.actor_user_id === expected.userId && row.identity_id === expected.identityId);
}
const stampOrder = (value: string) => {const match = /^(.*T\d\d:\d\d:\d\d)(?:\.(\d{1,6}))?(?:Z|\+00:00)$/.exec(value)!; return match[1] + "." + (match[2] ?? "").padEnd(6, "0");};
export function parsePublicJob(value: unknown, expectedId?: string): PublicJob {
  const r = jobRecord(value, ["schema_version", "content_type", "content_id", "identity_id", "content", "status", "created_at", "updated_at", "published_at", "active_until", "employer"]);
  ensure(r.schema_version === 1 && r.content_type === "job" && r.status === "published" && jobUuid(r.content_id) && jobUuid(r.identity_id)
    && (expectedId === undefined || r.content_id === expectedId) && jobTimestamp(r.created_at) && jobTimestamp(r.updated_at)
    && jobTimestamp(r.published_at) && jobTimestamp(r.active_until) && stampOrder(r.active_until) > stampOrder(r.published_at));
  const employer = jobRecord(r.employer, ["name", "slug", "logo_url"]);
  ensure(jobText(employer.name, 500, true) && jobText(employer.slug, 160, true) && (employer.logo_url === null || jobText(employer.logo_url, 4096, true)));
  let content; try {content = parseJobContent(r.content);} catch {throw new JobError("unknown");}
  return Object.freeze({...r, content, employer: Object.freeze({...employer})}) as PublicJob;
}
export function parseOwnerJob(value: unknown, expected: JobActor, expectedId?: string): OwnerJob {
  const r = jobRecord(value, ["schema_version", "content_type", "actor_user_id", "identity_id", "job_id", "edit_revision", "status", "content", "created_at", "updated_at", "published_at", "active_until", "last_confirmed_at"]);
  actor(r, expected);
  ensure(r.schema_version === 1 && r.content_type === "job" && jobUuid(r.job_id) && (!expectedId || r.job_id === expectedId)
    && jobRevision(r.edit_revision) && JOB_STATUSES.includes(r.status as OwnerJob["status"])
    && jobTimestamp(r.created_at) && jobTimestamp(r.updated_at) && optionalStamp(r.published_at) && optionalStamp(r.active_until) && optionalStamp(r.last_confirmed_at));
  ensure(r.status === "draft" ? r.published_at === null && r.active_until === null && r.last_confirmed_at === null
    : jobTimestamp(r.published_at) && jobTimestamp(r.active_until));
  let content; try {content = parseJobContent(r.content);} catch {throw new JobError("unknown");}
  return Object.freeze({...r, content}) as OwnerJob;
}
export function parseJobCursor(value: unknown, owner = false): PublicJobCursor | OwnerJobCursor | null {
  if (value === null) return null;
  const time = owner ? "created_at" : "published_at", r = jobRecord(value, [time, "id"]);
  ensure(jobUuid(r.id) && jobTimestamp(r[time]));
  return Object.freeze({...r}) as PublicJobCursor | OwnerJobCursor;
}
type PageScope = {kind: "search"} | {kind: "profile"; slug: string; identityId: string} | {kind: "owner"; actor: JobActor};
export function parseJobPage(value: unknown, limit: number, scope: PageScope, before: PublicJobCursor | OwnerJobCursor | null = null): PublicJobPage | ProfileJobPage | OwnerJobPage {
  const extra = scope.kind === "profile" ? ["seller_slug", "identity_id"] : scope.kind === "owner" ? ["actor_user_id", "identity_id"] : [];
  const r = jobRecord(value, ["schema_version", "items", "result_limit", "has_more", "next_cursor", "read_at", ...extra]);
  ensure(Number.isInteger(limit) && limit > 0 && limit <= 50 && r.schema_version === 1 && r.result_limit === limit
    && typeof r.has_more === "boolean" && jobTimestamp(r.read_at) && Array.isArray(r.items) && r.items.length <= limit);
  if (scope.kind === "owner") actor(r, scope.actor);
  if (scope.kind === "profile") ensure(r.seller_slug === scope.slug && (r.identity_id === scope.identityId || r.identity_id === null && r.items.length === 0));
  const owner = scope.kind === "owner", time = owner ? "created_at" : "published_at";
  let previous = parseJobCursor(before, owner); const seen = new Set<string>();
  const items = r.items.map(value => {
    const item = scope.kind === "owner" ? parseOwnerJob(value, scope.actor) : parsePublicJob(value);
    const id = "job_id" in item ? item.job_id : item.content_id, date = item[time];
    ensure(jobTimestamp(date) && !seen.has(id)); seen.add(id);
    if (previous) {const prev = previous as unknown as Record<string, string>;
      ensure(stampOrder(date) < stampOrder(prev[time]) || stampOrder(date) === stampOrder(prev[time]) && id < prev.id);}
    previous = {[time]: date, id} as PublicJobCursor | OwnerJobCursor;
    if (scope.kind !== "owner") {
      ensure(jobTimestamp(item.active_until) && stampOrder(item.active_until) > stampOrder(r.read_at as string));
      if (scope.kind === "profile") ensure(item.identity_id === scope.identityId);
    }
    return item;
  });
  const next = parseJobCursor(r.next_cursor, owner);
  ensure(r.has_more ? items.length === limit && next !== null && sameJobValue(next, previous) : next === null);
  return Object.freeze({...r, items: Object.freeze(items), next_cursor: next}) as PublicJobPage | ProfileJobPage | OwnerJobPage;
}
export function parseJobCategories(value: unknown): readonly JobCategory[] {
  const r = jobRecord(value, ["schema_version", "items"]); ensure(r.schema_version === 1 && Array.isArray(r.items) && r.items.length === JOB_CATEGORIES.length);
  const seen = new Set<string>();
  return Object.freeze(r.items.map(value => {const c = jobRecord(value, ["code", "labels"]), labels = jobRecord(c.labels, ["en", "et"]);
    ensure(JOB_CATEGORIES.includes(c.code as JobCategory["code"]) && !seen.has(c.code as string) && jobText(labels.en, 160, true) && jobText(labels.et, 160, true));
    seen.add(c.code as string); return Object.freeze({...c, labels: Object.freeze({...labels})}) as JobCategory;}));
}
export function parseJobPolicies(value: unknown, expected: JobActor): readonly JobPolicy[] {
  const r = jobRecord(value, ["schema_version", "actor_user_id", "identity_id", "documents"]); actor(r, expected);
  ensure(r.schema_version === 1 && Array.isArray(r.documents) && r.documents.length > 0 && r.documents.length <= 20);
  const seen = new Set<string>();
  return Object.freeze(r.documents.map(value => {const p = jobRecord(value, ["documentId", "version", "contentHash", "title", "body", "locale"]);
    ensure(jobUuid(p.documentId) && !seen.has(p.documentId) && jobText(p.version, 100, true) && typeof p.contentHash === "string" && /^[0-9a-f]{64}$/.test(p.contentHash)
      && typeof p.title === "string" && p.title.trim().length > 0 && Array.from(p.title).length <= 1000 && !p.title.includes("\0")
      && typeof p.body === "string" && p.body.trim().length > 0 && Array.from(p.body).length <= 100000 && !p.body.includes("\0") && jobText(p.locale, 40, true));
    seen.add(p.documentId); return Object.freeze({...p}) as JobPolicy;}));
}
export function parseJobMutation(value: unknown, intent: JobIntent): JobMutation {
  const r = jobRecord(value, ["schema_version", "actor_user_id", "identity_id", "request_key", "operation", "job", "changed"]); actor(r, intent.actor);
  ensure(r.schema_version === 1 && r.request_key === intent.requestKey && r.operation === intent.operation && typeof r.changed === "boolean");
  const job = parseOwnerJob(r.job, intent.actor, intent.input.job_id ?? undefined);
  if (intent.operation === "save") ensure(sameJobValue(job.content, intent.input.content));
  if (intent.operation === "publish") ensure(job.status === "published" && job.published_at !== null && job.active_until !== null);
  if (intent.operation === "status") ensure(job.status === intent.input.status);
  if (intent.operation === "renew") ensure(job.active_until !== null && stampOrder(job.active_until) >= stampOrder(intent.input.expected_active_until));
  return Object.freeze({...r, job}) as JobMutation;
}
export function parseJobReceipt(value: unknown, intent: JobIntent): JobReceipt {
  const r = jobRecord(value, ["schema_version", "actor_user_id", "identity_id", "request_key", "found", "operation", "request", "result"]); actor(r, intent.actor);
  ensure(r.schema_version === 1 && r.request_key === intent.requestKey && typeof r.found === "boolean");
  if (!r.found) {ensure(r.operation === null && r.request === null && r.result === null); return Object.freeze({...r}) as JobReceipt;}
  ensure(r.operation === intent.operation && sameJobValue(r.request, intent.input));
  return Object.freeze({...r, result: parseJobMutation(r.result, intent)}) as JobReceipt;
}
