import { jobRecord, jobRevision, jobTimestamp, jobUuid, parseJobContent } from "./jobContent";
import { JOB_STATUSES, JobError, type JobActor, type JobIntent, type ShownJobPolicy } from "./types";
export function parseShownJobPolicies(value: unknown): readonly ShownJobPolicy[] {
  if (!Array.isArray(value) || value.length > 20) throw new JobError("invalid");
  const ids = new Set<string>();
  return Object.freeze(value.map(value => {const p = jobRecord(value, ["documentId", "version", "contentHash", "accepted"]);
    if (!jobUuid(p.documentId) || ids.has(p.documentId) || typeof p.version !== "string" || !p.version || p.version.length > 100
      || typeof p.contentHash !== "string" || !/^[0-9a-f]{64}$/.test(p.contentHash) || p.accepted !== true) throw new JobError("invalid");
    ids.add(p.documentId); return Object.freeze({...p}) as ShownJobPolicy;}));
}
/** Used before sending and when restoring a pending browser action. No tokens are persisted. */
export function parseJobIntent(value: unknown, expected: JobActor): JobIntent {
  const r = jobRecord(value, ["actor", "requestKey", "operation", "input"]), actor = jobRecord(r.actor, ["userId", "identityId"]);
  if (!jobUuid(expected.userId) || !jobUuid(expected.identityId) || actor.userId !== expected.userId || actor.identityId !== expected.identityId || !jobUuid(r.requestKey)) throw new JobError("forbidden");
  const fields = r.operation === "save" ? ["job_id", "expected_revision", "content", "policy_snapshot"]
    : r.operation === "publish" ? ["job_id", "expected_revision", "policy_snapshot"]
    : r.operation === "status" ? ["job_id", "expected_revision", "expected_status", "status"]
    : r.operation === "renew" ? ["job_id", "expected_revision", "expected_active_until"] : null;
  if (!fields) throw new JobError("invalid");
  const input = {...jobRecord(r.input, fields)};
  if (r.operation === "save" && input.job_id === null ? input.expected_revision !== null
    : !jobUuid(input.job_id) || !jobRevision(input.expected_revision)) throw new JobError("invalid");
  if (r.operation === "save") input.content = parseJobContent(input.content);
  if (r.operation === "save" || r.operation === "publish") input.policy_snapshot = parseShownJobPolicies(input.policy_snapshot);
  if (r.operation === "status" && (!JOB_STATUSES.includes(input.expected_status as never) || !JOB_STATUSES.includes(input.status as never)
    || input.expected_status === "draft" || input.status === "draft")) throw new JobError("invalid");
  if (r.operation === "renew" && !jobTimestamp(input.expected_active_until)) throw new JobError("invalid");
  return Object.freeze({...r, actor: Object.freeze({...expected}), input: Object.freeze({...input})}) as JobIntent;
}
