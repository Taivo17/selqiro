import { jobClient } from "../../../entities/job/api/jobClient";
import { parseJobIntent } from "../../../entities/job/model/jobIntent";
import { sameJobValue } from "../../../entities/job/model/jobContent";
import { JobError, type JobActor, type JobContent, type JobIntent, type JobMutation, type OwnerJob, type ShownJobPolicy } from "../../../entities/job/model/types";
import { parseJobPending, type JobPending, type JobPendingStore } from "./jobPending";
import type { JobMessageKey } from "./jobMessages";

export type JobSessionView = Readonly<{phase: "editing" | "writing" | "checking" | "uncertain" | "retryable" | "continue" | "blocked" | "retired";
  job: OwnerJob | null; pending: JobIntent | null; message: JobMessageKey | null; completion: number}>;
type Options = {actor: JobActor; scope: string; initial?: OwnerJob | null; store: JobPendingStore;
  canAct: () => boolean; signal: () => AbortSignal | null; client?: typeof jobClient; uuid?: () => string};

/** One immutable intent at a time. Receipt reads never dispatch a write. */
export class JobSession {
  private view: JobSessionView;
  private work: JobPending | null = null;
  private listeners = new Set<() => void>();
  private live = true;
  private ticket = 0;
  private client: typeof jobClient;
  constructor(private readonly options: Options) {
    this.client = options.client ?? jobClient;
    this.view = {phase: "editing", job: options.initial ?? null, pending: null, message: null, completion: 0};
    try {this.work = parseJobPending(options.store.read(), options.actor, options.scope);
      if (this.work?.intent) this.view = {...this.view, phase: "uncertain", pending: this.work.intent, message: "pendingAction"};
    } catch {this.view = {...this.view, phase: "blocked", message: "storageError"};}
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {this.listeners.add(listener); return () => {this.listeners.delete(listener);};};
  getJobId = () => this.work?.jobId ?? this.view.job?.job_id ?? (this.options.scope === "new" ? null : this.options.scope);
  private emit(patch: Partial<JobSessionView>) {if (!this.live) return; this.view = Object.freeze({...this.view, ...patch}); for (const fn of this.listeners) fn();}
  private current(ticket: number) {return this.live && ticket === this.ticket && this.options.canAct();}
  private persist(work: JobPending | null) {
    try {if (work) this.options.store.write(work); else this.options.store.clear(); this.work = work; return true;}
    catch {this.emit({phase: "blocked", message: "storageError"}); return false;}
  }
  private intent(request: Omit<JobIntent, "actor" | "requestKey">, key?: string): JobIntent {
    return parseJobIntent({...request, actor: this.options.actor, requestKey: key ?? (this.options.uuid ?? (() => crypto.randomUUID()))()}, this.options.actor);
  }
  /** A same-identity focus check retains the draft and pending action, and hides late completions. */
  suspend() {++this.ticket; if (["writing", "checking"].includes(this.view.phase)) this.emit({phase: this.work?.intent ? "uncertain" : "blocked", message: "unknown"});}
  adopt(job: OwnerJob) {
    if (!this.live || job.actor_user_id !== this.options.actor.userId || job.identity_id !== this.options.actor.identityId) return;
    this.emit({job});
  }
  async reload() {
    if (!this.live || !this.options.canAct() || ["writing", "checking"].includes(this.view.phase)) return;
    if (this.work?.intent) {await this.check(); return;}
    const id = this.getJobId(), signal = this.options.signal(); if (!signal) return;
    if (!id) {this.emit({phase: "editing", message: null}); return;}
    const ticket = ++this.ticket; this.emit({phase: "checking", message: "checking"});
    try {const job = await this.client.owner(this.options.actor, id, signal);
      if (this.current(ticket)) this.emit({job, phase: "editing", message: null, completion: this.view.completion + 1});
    } catch (error) {if (this.current(ticket)) this.emit({phase: "blocked", message: error instanceof JobError && error.kind === "forbidden" ? "forbidden" : "loadError"});}
  }
  async submit(content: JobContent, policies: readonly ShownJobPolicy[]) {
    if (!this.live || !this.options.canAct() || this.view.phase !== "editing" || this.work?.intent) return;
    const job = this.view.job, firstPublication = !job || job.status === "draft";
    if (!policies.length) {this.emit({message: "policyChanged"}); return;}
    const intent = this.intent({operation: "save", input: {job_id: job?.job_id ?? this.getJobId(), expected_revision: job?.edit_revision ?? null,
      content, policy_snapshot: firstPublication ? [] : policies}});
    const next = firstPublication ? {requestKey: (this.options.uuid ?? (() => crypto.randomUUID()))(), policies} : null;
    await this.start(intent, next);
  }
  async status(status: "published" | "paused" | "closed") {
    const job = this.view.job;
    if (!job || job.status === "draft" || job.status === status || this.view.phase !== "editing" || this.work?.intent) return;
    await this.start(this.intent({operation: "status", input: {job_id: job.job_id, expected_revision: job.edit_revision, expected_status: job.status, status}}), null);
  }
  async renew() {
    const job = this.view.job;
    if (!job || !job.active_until || job.status === "draft" || this.view.phase !== "editing" || this.work?.intent) return;
    await this.start(this.intent({operation: "renew", input: {job_id: job.job_id, expected_revision: job.edit_revision, expected_active_until: job.active_until}}), null);
  }
  private async start(intent: JobIntent, publishNext: JobPending["publishNext"]) {
    if (!this.live || !this.options.canAct() || this.view.phase !== "editing") return;
    const work: JobPending = {version: 1, actor: this.options.actor, scope: this.options.scope,
      jobId: this.getJobId(), intent, publishNext};
    if (!this.persist(work)) return;
    this.emit({pending: intent}); await this.dispatch(true);
  }
  private async dispatch(continueImmediately: boolean) {
    const intent = this.work?.intent, signal = this.options.signal();
    if (!this.live || !this.options.canAct() || !intent || !signal) return;
    const ticket = ++this.ticket; let acknowledged = false; this.emit({phase: "writing", message: "saving"});
    try {const result = await this.client.write(intent, signal); acknowledged = true;
      if (this.current(ticket)) await this.accept(result, continueImmediately, ticket, signal);
    } catch (error) {
      if (!this.current(ticket)) return;
      const known = !acknowledged && error instanceof JobError && error.kind !== "unknown";
      if (known) {
        const retained = this.getJobId();
        if (!this.persist(retained && this.options.scope === "new" ? {version: 1, actor: this.options.actor, scope: "new", jobId: retained, intent: null, publishNext: null} : null)) return;
        this.emit({pending: null, phase: error.kind === "conflict" || error.kind === "forbidden" ? "blocked" : "editing", message: error.kind === "policy" ? "policyChanged" : error.kind});
      } else this.emit({phase: "uncertain", message: "unknown"});
    }
  }
  private async accept(result: JobMutation, continueImmediately: boolean, ticket: number, signal: AbortSignal) {
    const saved = this.work; if (!saved?.intent) return;
    if (saved.publishNext) {
      const next = this.intent({operation: "publish", input: {job_id: result.job.job_id, expected_revision: result.job.edit_revision,
        policy_snapshot: saved.publishNext.policies}}, saved.publishNext.requestKey);
      if (!this.persist({...saved, jobId: result.job.job_id, intent: next, publishNext: null})) return;
      this.emit({job: result.job, pending: next, phase: "continue", message: "continuePublish"});
      if (continueImmediately) await this.dispatch(true);
      return;
    }
    // The receipt is historical. Only a separate owner read supplies current details.
    const current = await this.client.owner(this.options.actor, result.job.job_id, signal);
    if (!this.current(ticket)) return;
    if (!this.persist(null)) return;
    const exact = current.edit_revision === result.job.edit_revision && sameJobValue(current.content, result.job.content) && current.status === result.job.status;
    this.emit({job: current, pending: null, phase: "editing", completion: this.view.completion + 1,
      message: !exact ? "changedElsewhere" : !result.changed ? "nothingChanged" : result.operation === "publish" ? "published" : result.operation === "renew" ? "renewed" : result.operation === "status" ? "stateChanged" : "saved"});
  }
  async check() {
    const intent = this.work?.intent, signal = this.options.signal();
    if (!this.live || !this.options.canAct() || !intent || !signal || ["writing", "checking"].includes(this.view.phase)) return;
    const ticket = ++this.ticket; this.emit({phase: "checking", message: "checking"});
    try {const receipt = await this.client.receipt(intent, signal);
      if (!this.current(ticket)) return;
      if (receipt.found && receipt.result) await this.accept(receipt.result, false, ticket, signal);
      else this.emit({phase: "retryable", message: "notFoundRequest"});
    } catch {if (this.current(ticket)) this.emit({phase: "uncertain", message: "unknownRead"});}
  }
  async retrySame() {if (["retryable", "continue"].includes(this.view.phase)) await this.dispatch(false);}
  retire() {if (!this.live) return; ++this.ticket; this.emit({phase: "retired", job: null, pending: null, message: "forbidden"}); this.live = false;}
}
