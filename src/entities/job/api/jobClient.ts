import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { jobRecord,jobRevision,jobUuid } from "../model/jobContent";
import { parseJobIntent } from "../model/jobIntent";
import { parseJobCategories, parseJobCursor, parseJobMutation, parseJobPage, parseJobPolicies, parseJobReceipt, parseOwnerJob, parsePublicJob } from "../model/jobParsers";
import { JobError, type JobActor, type JobIntent, type JobSearch, type OwnerJobCursor, type OwnerJobPage, type PublicJobCursor, type PublicJobPage, type ProfileJobPage } from "../model/types";

function failure(error: unknown): JobError {
  const detail = error as {code?: string;message?: string} | null, code = detail?.code;
  // Only these exact server tags change the guidance. Raw error/SQL text is never displayed.
  if (code === "22023" && detail?.message === "job_renewal_required") return new JobError("renewal");
  if (code === "55000" && detail?.message === "job_public_profile_required") return new JobError("profile");
  return new JobError(code === "42501" ? "forbidden" : code === "40001" ? "conflict" : code === "22023" || code === "23514" ? "invalid" : code === "55000" ? "policy" : "unknown");
}
async function rpc(name: string, args: object, signal: AbortSignal): Promise<unknown> {
  if (signal.aborted) throw new JobError("forbidden");
  const controller = new AbortController(), abort = () => controller.abort(), timer = setTimeout(abort, 20000);
  signal.addEventListener("abort", abort, {once: true});
  try {
    const {data, error} = await supabaseBrowserClient.rpc(name, args).abortSignal(controller.signal);
    if (error) throw failure(error);
    if (signal.aborted || controller.signal.aborted) throw new JobError("unknown");
    return data;
  } catch (error) {throw error instanceof JobError ? error : failure(error);}
  finally {clearTimeout(timer); signal.removeEventListener("abort", abort);}
}
const actorArgs = (actor: JobActor) => {
  if (!jobUuid(actor.userId) || !jobUuid(actor.identityId)) throw new JobError("forbidden");
  return {p_expected_user_id: actor.userId, p_expected_identity_id: actor.identityId};
};
export async function getJobCategories(signal: AbortSignal) {return parseJobCategories(await rpc("get_job_categories_v1", {}, signal));}
export async function getJobPolicies(actor: JobActor, signal: AbortSignal) {return parseJobPolicies(await rpc("get_my_job_policies_v1", actorArgs(actor), signal), actor);}
export async function getOwnerJob(actor: JobActor, jobId: string, signal: AbortSignal) {
  if (!jobUuid(jobId)) throw new JobError("invalid");
  return parseOwnerJob(await rpc("get_my_job_v1", {...actorArgs(actor), p_job_id: jobId}, signal), actor, jobId);
}
export async function getOwnerJobs(actor: JobActor, cursor: OwnerJobCursor | null, signal: AbortSignal, limit = 24): Promise<OwnerJobPage> {
  parseJobCursor(cursor, true);
  return parseJobPage(await rpc("get_my_jobs_v1", {...actorArgs(actor), p_result_limit: limit, p_cursor: cursor}, signal), limit, {kind: "owner", actor}, cursor) as OwnerJobPage;
}
export async function getPublicJob(jobId: string, signal: AbortSignal) {
  if (!jobUuid(jobId)) return null;
  const value = await rpc("get_public_job_v1", {p_job_id: jobId}, signal);
  return value === null ? null : parsePublicJob(value, jobId);
}
export async function searchPublicJobs(input: JobSearch, cursor: PublicJobCursor | null, signal: AbortSignal, limit = 24): Promise<PublicJobPage> {
  parseJobCursor(cursor);
  return parseJobPage(await rpc("search_public_jobs_v1", {p_query: input.query, p_category: input.category, p_country_code: input.countryCode,
    p_city: input.city, p_workplace_type: input.workplaceType, p_employment_type: input.employmentType, p_working_time: input.workingTime,
    p_result_limit: limit, p_cursor: cursor}, signal), limit, {kind: "search"}, cursor) as PublicJobPage;
}
export async function getProfileJobs(slug: string, identityId: string, cursor: PublicJobCursor | null, signal: AbortSignal, limit = 24): Promise<ProfileJobPage> {
  if (!slug || !jobUuid(identityId)) throw new JobError("invalid");
  parseJobCursor(cursor);
  return parseJobPage(await rpc("get_public_profile_jobs_v1", {p_seller_slug: slug, p_result_limit: limit, p_cursor: cursor}, signal), limit, {kind: "profile", slug, identityId}, cursor) as ProfileJobPage;
}
/** Each write is one dispatch. A lost response is resolved by the separate read-only receipt call. */
export async function writeJob(value: JobIntent, signal: AbortSignal) {
  const intent = parseJobIntent(value, value.actor), base = {...actorArgs(intent.actor), p_request_key: intent.requestKey};
  const names = {save: "save_my_job_v1", publish: "publish_my_job_v1", status: "set_my_job_status_v1", renew: "renew_my_job_activity_v1"};
  const args = Object.fromEntries(Object.entries(intent.input).map(([key, field]) => ["p_" + key, field]));
  return parseJobMutation(await rpc(names[intent.operation], {...base, ...args}, signal), intent);
}
export async function readJobReceipt(value: JobIntent, signal: AbortSignal) {
  const intent = parseJobIntent(value, value.actor);
  return parseJobReceipt(await rpc("get_my_job_request_v1", {...actorArgs(intent.actor), p_request_key: intent.requestKey}, signal), intent);
}
export const jobClient = {write: writeJob, receipt: readJobReceipt, owner: getOwnerJob};
export type JobContactCommand = Readonly<{actor: JobActor;requestKey: string;jobId: string}>;
export async function contactJob(command: JobContactCommand,signal: AbortSignal): Promise<string> {
  if (!jobUuid(command.requestKey) || !jobUuid(command.jobId)) throw new JobError("invalid");
  const result = jobRecord(await rpc("contact_my_job_provider_v1",{...actorArgs(command.actor),p_request_key: command.requestKey,p_job_id: command.jobId},signal),
    ["schema_version","actor_user_id","identity_id","request_key","job_id","conversation_id","replayed"]);
  if (result.schema_version !== 1 || result.actor_user_id !== command.actor.userId || result.identity_id !== command.actor.identityId
    || result.request_key !== command.requestKey || result.job_id !== command.jobId || !jobRevision(result.conversation_id) || typeof result.replayed !== "boolean") throw new JobError("unknown");
  return result.conversation_id;
}
