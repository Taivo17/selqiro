import type { ProfileEditorClient } from "../api/profileEditorClient";
import { profileEditorFailure, profilePatch, sameProfilePatch, validateProfilePatch,
  type ProfileEditorActor, type ProfileEditorContext, type ProfileEditorErrors, type ProfileEditorField,
  type ProfileEditorPatch, type ProfileEditorSnapshot } from "./profileEditor";

export type ProfileEditorNotice = "saved" | "invalid" | "conflict" | "uncertain" | "checked"
  | "notConfirmed" | "readError" | "forbidden" | "actorChanged" | "authChanged" | null;
export type ProfileEditorView = Readonly<{
  phase: "ready" | "saving" | "checking" | "uncertain" | "conflict" | "retired";
  available: boolean; saved: ProfileEditorSnapshot; draft: ProfileEditorPatch;
  errors: ProfileEditorErrors; dirty: boolean; notice: ProfileEditorNotice;
}>;
type Pending = Readonly<{revision: string | null; patch: ProfileEditorPatch}>;
type Options = {actor: ProfileEditorActor; initial: ProfileEditorSnapshot; client: ProfileEditorClient;
  context: () => ProfileEditorContext | null; confirmed: () => void};

/** Drafts stay local. Same-identity checks preserve them; a different actor gets a new session. */
export class ProfileEditorSession {
  private view: ProfileEditorView;
  private pending: Pending | null = null;
  private listeners = new Set<() => void>();
  private live = true;
  private ticket = 0;
  constructor(private readonly options: Options) {
    this.assertActor(options.initial);
    this.view = Object.freeze({phase: "ready", available: true, saved: options.initial,
      draft: profilePatch(options.initial), errors: {}, dirty: false, notice: null});
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {this.listeners.add(listener); return () => {this.listeners.delete(listener);};};
  private assertActor(snapshot: ProfileEditorSnapshot) {
    if (snapshot.user_id !== this.options.actor.userId || snapshot.identity_id !== this.options.actor.identityId) throw new Error("profile_actor_mismatch");
  }
  private emit(patch: Partial<ProfileEditorView>) {
    if (!this.live) return;
    const next = {...this.view, ...patch};
    this.view = Object.freeze({...next, dirty: !sameProfilePatch(next.saved, next.draft)});
    for (const listener of this.listeners) listener();
  }
  private current(ticket: number, context: ProfileEditorContext) {
    const now = this.context();
    return this.live && ticket === this.ticket && !context.signal.aborted && !!now
      && now.signal === context.signal && now.userId === context.userId && now.identityId === context.identityId;
  }
  private context() {
    const context = this.options.context();
    return context && !context.signal.aborted && context.userId === this.options.actor.userId
      && context.identityId === this.options.actor.identityId ? context : null;
  }
  private adopt(snapshot: ProfileEditorSnapshot, notice: ProfileEditorNotice) {
    this.assertActor(snapshot); this.pending = null;
    this.emit({saved: snapshot, draft: profilePatch(snapshot), available: true, phase: "ready", errors: {}, notice});
  }
  /** Invalidation happens synchronously, before the identity switch/auth request completes. */
  suspend() {
    ++this.ticket;
    this.emit({available: false, ...(this.pending ? {phase: "uncertain" as const, notice: "uncertain" as const}
      : this.view.phase === "checking" ? {phase: "ready" as const} : {})});
  }
  revalidate(snapshot: ProfileEditorSnapshot) {
    if (!this.live) return;
    this.assertActor(snapshot);
    if (snapshot.identity_type !== this.view.saved.identity_type) {this.retire(); return;}
    this.emit({available: true});
    if (this.view.phase === "saving" || this.view.phase === "checking") return;
    if (this.pending) {this.reconcile(snapshot); return;}
    if (this.view.dirty && snapshot.revision !== this.view.saved.revision) {
      this.emit({phase: "conflict", notice: "conflict"});
    } else if (!this.view.dirty) {
      this.adopt(snapshot, this.view.notice === "saved" || this.view.notice === "checked" ? this.view.notice : null);
    }
  }
  edit(field: ProfileEditorField, value: string) {
    if (!this.live || !this.view.available || this.view.phase !== "ready" || !this.context()) return;
    const errors = {...this.view.errors}; delete errors[field];
    this.emit({draft: Object.freeze({...this.view.draft, [field]: value}), errors, notice: null});
  }
  async save() {
    const context = this.context();
    if (!this.live || !context || !this.view.available || this.view.phase !== "ready" || this.pending
      || (!this.view.dirty && this.view.saved.revision !== null)) return;
    const validated = validateProfilePatch(this.view.draft, this.view.saved.identity_type);
    if (!validated.patch) {this.emit({errors: validated.errors, notice: "invalid"}); return;}
    const pending = Object.freeze({revision: this.view.saved.revision, patch: validated.patch});
    this.pending = pending;
    const ticket = ++this.ticket;
    this.emit({phase: "saving", notice: null, errors: {}});
    try {
      const result = await this.options.client.save(context, pending.revision, pending.patch, this.view.saved.identity_type);
      if (!this.current(ticket, context)) return;
      this.adopt(result, "saved");
      this.options.confirmed();
    } catch (error) {
      if (!this.current(ticket, context)) return;
      const failure = profileEditorFailure(error);
      if (failure.kind === "unknown") {this.emit({phase: "uncertain", notice: "uncertain"}); return;}
      this.pending = null;
      const denied = ["authChanged", "actorChanged", "forbidden"].includes(failure.kind);
      this.emit({phase: failure.kind === "conflict" ? "conflict" : "ready", available: !denied,
        notice: failure.kind});
    }
  }
  private reconcile(snapshot: ProfileEditorSnapshot) {
    const pending = this.pending;
    if (!pending) return;
    this.assertActor(snapshot);
    if (snapshot.revision !== pending.revision && sameProfilePatch(snapshot, pending.patch)) {
      this.adopt(snapshot, "checked"); this.options.confirmed(); return;
    }
    // A read cannot prove that a timed-out transaction will not complete later.
    // Keep the entered values, and require a deliberate Save using the read revision.
    if (snapshot.revision === pending.revision) {
      this.pending = null;
      this.emit({saved: snapshot, phase: "ready", available: true, notice: "notConfirmed"}); return;
    }
    this.pending = null;
    this.emit({phase: "conflict", available: true, notice: "conflict"});
  }
  async check() {
    const context = this.context();
    if (!this.live || !context || !this.view.available || !this.pending || this.view.phase !== "uncertain") return;
    const ticket = ++this.ticket;
    this.emit({phase: "checking", notice: null});
    try {
      const snapshot = await this.options.client.read(context);
      if (this.current(ticket, context)) this.reconcile(snapshot);
    } catch {if (this.current(ticket, context)) this.emit({phase: "uncertain", notice: "readError"});}
  }
  /** Called only after the person explicitly chooses to replace their draft. */
  async reload() {
    const context = this.context();
    if (!this.live || !context || !this.view.available || this.pending || ["saving", "checking"].includes(this.view.phase)) return;
    const ticket = ++this.ticket, previousPhase = this.view.phase;
    this.emit({phase: "checking", notice: null});
    try {
      const snapshot = await this.options.client.read(context);
      if (this.current(ticket, context)) this.adopt(snapshot, null);
    } catch {if (this.current(ticket, context)) this.emit({phase: previousPhase, notice: "readError"});}
  }
  retire() {
    if (!this.live) return;
    ++this.ticket; this.pending = null;
    this.emit({phase: "retired", available: false, notice: "actorChanged"});
    this.live = false;
  }
}
