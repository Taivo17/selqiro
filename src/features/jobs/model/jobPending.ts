import { jobRecord, jobUuid } from "../../../entities/job/model/jobContent";
import { parseJobIntent, parseShownJobPolicies } from "../../../entities/job/model/jobIntent";
import type { JobActor, JobIntent, ShownJobPolicy } from "../../../entities/job/model/types";
export type JobPending = Readonly<{version: 1; actor: JobActor; scope: string; jobId: string | null; intent: JobIntent | null;
  publishNext: Readonly<{requestKey: string; policies: readonly ShownJobPolicy[]}> | null}>;
export type JobPendingStore = {read: () => unknown; write: (value: JobPending) => void; clear: () => void};
export function parseJobPending(value: unknown, actor: JobActor, scope: string): JobPending | null {
  if (value === null) return null;
  const r = jobRecord(value, ["version", "actor", "scope", "jobId", "intent", "publishNext"]), a = jobRecord(r.actor, ["userId", "identityId"]);
  if (r.version !== 1 || a.userId !== actor.userId || a.identityId !== actor.identityId || r.scope !== scope
    || !(r.jobId === null || jobUuid(r.jobId)) || scope !== "new" && r.jobId !== scope) throw new Error("job_storage_invalid");
  const intent = r.intent === null ? null : parseJobIntent(r.intent, actor);
  if (intent && intent.input.job_id !== null && intent.input.job_id !== r.jobId) throw new Error("job_storage_invalid");
  let publishNext: JobPending["publishNext"] = null;
  if (r.publishNext !== null) {
    const p = jobRecord(r.publishNext, ["requestKey", "policies"]);
    if (!jobUuid(p.requestKey) || intent?.operation !== "save") throw new Error("job_storage_invalid");
    publishNext = {requestKey: p.requestKey, policies: parseShownJobPolicies(p.policies)};
  }
  return Object.freeze({version: 1, actor, scope, jobId: r.jobId as string | null, intent, publishNext});
}
/** Per-tab recovery holds only this account/identity's job action. No access tokens or private chat data. */
export function browserJobPendingStore(actor: JobActor, scope: string): JobPendingStore {
  const key = `selqiro:job-action:v1:${actor.userId}:${actor.identityId}:${scope}`;
  return {read: () => {const text = sessionStorage.getItem(key); if (text === null) return null;
    if (text.length > 250000) throw new Error("job_storage_invalid"); return JSON.parse(text);},
    write: value => {const text = JSON.stringify(value); sessionStorage.setItem(key, text);
      if (sessionStorage.getItem(key) !== text) throw new Error("job_storage_unconfirmed");},
    clear: () => {sessionStorage.removeItem(key); if (sessionStorage.getItem(key) !== null) throw new Error("job_storage_unconfirmed");}};
}
