import type {PublicationActor} from "../../../entities/listing/model/publicationJourney";
import {readServiceActivity, renewServiceActivity} from "../../../entities/service/api/serviceActivityClient";
import {serviceActivityFailure, type ServiceActivitySnapshot} from "../../../entities/service/model/serviceActivity";

export type ServiceActivityNotice = "renewed" | "unchanged" | "checked" | "conflict" | "forbidden" | "invalid" | "uncertain" | "readError" | null;
export type ServiceActivityView = Readonly<{
  snapshot: ServiceActivitySnapshot | null;
  phase: "loading" | "ready" | "confirming" | "renewing" | "checking" | "blocked" | "retired";
  notice: ServiceActivityNotice;
}>;
type Options = {
  actor: PublicationActor; serviceId: string; initial?: ServiceActivitySnapshot;
  canAct: () => boolean; blocked: () => boolean;
  onVerified: (snapshot: ServiceActivitySnapshot) => void;
  read?: typeof readServiceActivity; renew?: typeof renewServiceActivity;
};

/** Activity has its own state. It never adopts a content/gallery snapshot or
 * alters an editor draft. A failed write remains blocked until an explicit read. */
export class ServiceActivitySession {
  private view: ServiceActivityView;
  private listeners = new Set<() => void>();
  private live = true;
  private version = 0;
  private abort: AbortController | null = null;
  constructor(private readonly options: Options) {
    this.view = {snapshot: options.initial ?? null, phase: options.initial ? "ready" : "loading", notice: null};
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {this.listeners.add(listener); return () => {this.listeners.delete(listener);};};
  private current(version: number) {return this.live && version === this.version && this.options.canAct();}
  private emit(view: ServiceActivityView) {if (!this.live) return; this.view = Object.freeze(view); for (const listener of this.listeners) listener();}
  private verified(snapshot: ServiceActivitySnapshot, notice: ServiceActivityNotice) {
    this.emit({snapshot, phase: "ready", notice}); this.options.onVerified(snapshot);
  }
  replace(initial: ServiceActivitySnapshot) {
    if (this.view.phase !== "ready" || this.view.snapshot === initial) return;
    if (this.view.snapshot?.activity === initial.activity && this.view.snapshot.status === initial.status) return;
    if (initial.serviceId !== this.options.serviceId || initial.identityId !== this.options.actor.identityId) return;
    this.emit({...this.view, snapshot: initial});
  }
  async read(explicit = false) {
    if (!this.live || !this.options.canAct() || ["renewing", "checking", "retired"].includes(this.view.phase)
      || !explicit && this.view.phase !== "loading") return;
    const version = ++this.version;
    this.abort?.abort(); this.abort = new AbortController();
    this.emit({...this.view, phase: explicit ? "checking" : "loading", notice: null});
    try {
      const snapshot = await (this.options.read ?? readServiceActivity)(this.options.actor, this.options.serviceId, this.abort.signal);
      if (this.current(version)) this.verified(snapshot, explicit ? "checked" : null);
    } catch {if (this.current(version)) this.emit({...this.view, phase: "blocked", notice: "readError"});}
  }
  open() {
    if (!this.live || !this.options.canAct() || this.options.blocked() || this.view.phase !== "ready"
      || !this.view.snapshot?.activity.canRenew || this.view.snapshot.status === "draft") return;
    this.emit({...this.view, phase: "confirming", notice: null});
  }
  cancel() {if (this.view.phase === "confirming") this.emit({...this.view, phase: "ready", notice: null});}
  /** A verified content revision may contain the first publication. Refresh
   * availability only; uncertain renewal still requires the owner's explicit read. */
  refresh() {
    if (!this.live || !this.options.canAct() || !["ready", "loading", "confirming"].includes(this.view.phase)) return;
    this.emit({...this.view, phase: "loading", notice: null}); void this.read();
  }
  async confirm() {
    const snapshot = this.view.snapshot;
    if (!this.live || !this.options.canAct() || this.options.blocked() || this.view.phase !== "confirming"
      || !snapshot?.activity.canRenew || !snapshot.activity.activeUntil || snapshot.status === "draft") return;
    const version = ++this.version;
    this.abort?.abort(); this.abort = new AbortController();
    // Synchronous transition prevents a second dispatch from double click or Enter.
    this.emit({...this.view, phase: "renewing", notice: null});
    try {
      const result = await (this.options.renew ?? renewServiceActivity)({actor: this.options.actor,
        serviceId: snapshot.serviceId, expectedActiveUntil: snapshot.activity.activeUntil}, this.abort.signal);
      if (this.current(version)) this.verified(result, result.changed ? "renewed" : "unchanged");
    } catch (error) {
      if (this.current(version)) this.emit({...this.view, phase: "blocked", notice: serviceActivityFailure(error)});
    }
  }
  retire() {
    if (!this.live) return;
    ++this.version; this.abort?.abort();
    this.emit({snapshot: null, phase: "retired", notice: "forbidden"}); this.live = false;
  }
}
