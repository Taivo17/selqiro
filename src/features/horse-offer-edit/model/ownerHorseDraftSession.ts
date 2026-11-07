import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import type { OwnerHorseOfferEditSnapshot } from "../../../entities/horse-offer/model/editSnapshot";
import { isHorseDraftUuid, isHorseDraftRevision, isExpectedHorseDraftRevision,
  type HorseDraftActor, type HorseDraftUpdateInput, type HorseDraftUpdateResult } from "../../../entities/horse-offer/model/draftEdit";
import { HorseDraftWriteError } from "../../../entities/horse-offer/model/draftWriteError";
import { buildOwnerHorseDraftChanges, ownerHorseDraftDirty, prepareOwnerHorseDraftForm,
  type OwnerHorseDraftForm } from "./ownerHorseDraftForm";

export type OwnerHorseDraftProblem = "load" | "not_found" | "conflict" | "unknown" | "not_editable" | null;
export type OwnerHorseDraftSessionState = Readonly<{
  snapshot: OwnerHorseOfferEditSnapshot | null;
  baseline: OwnerHorseDraftForm | null;
  form: OwnerHorseDraftForm | null;
  context: "checking" | "ready" | "blocked";
  work: "idle" | "loading" | "saving" | "refreshing";
  problem: OwnerHorseDraftProblem;
  acknowledgement: HorseDraftUpdateResult | null;
  message: string | null;
  closed: boolean;
}>;
export type OwnerHorseDraftApi = {
  actor: (userId: string) => Promise<HorseDraftActor>;
  read: (offerId: string) => Promise<OwnerHorseOfferEditSnapshot | null>;
  update: (input: HorseDraftUpdateInput) => Promise<HorseDraftUpdateResult>;
};
const COPY = {
  context: marketplaceMessage("horse.the_active_identity_changed_or_could_not_be.78dfbb"),
  read: marketplaceMessage("horse.the_draft_could_not_be_loaded_your_existing.50b8b7"),
  acknowledged: marketplaceMessage("horse.the_change_was_saved_but_the_latest_details.f0bf3f"),
  conflict: marketplaceMessage("horse.the_draft_was_changed_elsewhere_your_input_is.35d535"),
  unknown: marketplaceMessage("horse.the_save_result_could_not_be_confirmed_your.8b23ed"),
};
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
function freeze<T>(x: T): T {
  if (x && typeof x === "object" && !Object.isFrozen(x)) {
    Object.freeze(x);
    for (const v of Object.values(x)) freeze(v);
  }
  return x;
}

/** Per mounted user + existing UUID. No create API, global cache or browser persistence. */
export class OwnerHorseDraftSession {
  private state: OwnerHorseDraftSessionState = freeze({ snapshot: null, baseline: null, form: null,
    context: "checking", work: "idle", problem: null, acknowledgement: null, message: null, closed: false });
  private readonly listeners = new Set<() => void>();
  private active = false;
  private epoch = 0;
  private readTicket = 0;
  private writing = false;
  constructor(readonly userId: string, readonly offerId: string, private readonly api: OwnerHorseDraftApi) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private set(patch: Partial<OwnerHorseDraftSessionState>) {
    this.state = freeze({ ...this.state, ...patch });
    if (this.active) for (const listener of this.listeners) listener();
  }
  activate() { this.active = true; }
  deactivate() { this.active = false; this.epoch++; this.readTicket++; this.set({ work: this.writing ? "saving" : "idle" }); }
  authChanged(userId: string | null) {
    if (userId === this.userId || this.state.closed) return;
    this.epoch++; this.readTicket++;
    this.set({ closed: true, snapshot: null, form: null, baseline: null, acknowledgement: null,
      context: "blocked", work: "idle", problem: null, message: marketplaceMessage("horse.the_account_changed_reopen_the_form_with_the.cc45b5") });
  }
  private valid(epoch: number) { return this.active && !this.state.closed && this.epoch === epoch; }
  private matches(actor: HorseDraftActor) {
    return actor.userId === this.userId && isHorseDraftUuid(actor.identityId)
      && (!this.state.snapshot || actor.identityId === this.state.snapshot.detail.identityId);
  }
  async refreshContext() {
    if (!this.active || this.state.closed) return;
    const epoch = ++this.epoch;
    this.set({ context: "checking" });
    try {
      const actor = await this.api.actor(this.userId);
      if (!this.valid(epoch)) return;
      if (!this.matches(actor)) { this.set({ context: "blocked" }); return; }
      this.set({ context: "ready" });
      // A context check never attaches a newly fetched revision to an existing form.
      if (!this.state.snapshot && !this.writing) await this.readCurrent("initial");
    } catch {
      if (this.valid(epoch)) this.set({ context: "blocked" });
    }
  }
  isDirty() { return !!this.state.baseline && !!this.state.form && ownerHorseDraftDirty(this.state.baseline, this.state.form); }
  hasUnsettledWork() { return this.isDirty() || this.state.work === "saving" || !!this.state.acknowledgement || this.state.problem === "unknown"; }
  canEdit() {
    return this.active && !this.state.closed && !this.writing && this.state.work === "idle"
      && this.state.context === "ready" && !this.state.acknowledgement && !this.state.problem
      && this.state.snapshot?.detail.status === "draft" && this.state.form !== null;
  }
  canSave() { return this.canEdit() && this.isDirty(); }
  change(edit: (form: OwnerHorseDraftForm) => OwnerHorseDraftForm) {
    if (!this.canEdit() || !this.state.form) return;
    const next = edit(clone(this.state.form));
    if (next.offerId !== this.offerId || next.offerType !== this.state.form.offerType) return;
    this.set({ form: clone(next), message: null });
  }
  resetToLoaded() {
    if (this.canEdit() && this.state.baseline) this.set({ form: clone(this.state.baseline), message: null });
  }
  /** UI must explicitly confirm replacing local input. Unknown/conflict NEVER calls this automatically. */
  async reload(discardConfirmed = false) {
    if (!this.active || this.state.closed || this.writing || this.state.work !== "idle"
      || this.state.context !== "ready") return;
    if (this.state.acknowledgement) { await this.readCurrent("acknowledged"); return; }
    if (this.state.snapshot && (this.hasUnsettledWork() || this.state.problem) && !discardConfirmed) return;
    await this.readCurrent(this.state.snapshot ? "replace" : "initial");
  }
  private async readCurrent(reason: "initial" | "replace" | "acknowledged") {
    if (!this.active || this.state.closed || this.writing || this.state.context !== "ready") return;
    const epoch = this.epoch, ticket = ++this.readTicket;
    const current = () => this.valid(epoch) && ticket === this.readTicket;
    this.set({ work: reason === "initial" ? "loading" : "refreshing" });
    try {
      const actor = await this.api.actor(this.userId);
      if (!current()) return;
      if (!this.matches(actor)) { this.set({ context: "blocked" }); return; }
      const loaded = await this.api.read(this.offerId);
      if (!current()) return;
      const afterActor = await this.api.actor(this.userId);
      if (!current()) return;
      if (!this.matches(afterActor) || afterActor.identityId !== actor.identityId) {
        this.set({ context: "blocked" }); return;
      }
      if (!loaded) { this.set({ problem: "not_found", message: marketplaceMessage("horse.the_listing_was_not_found_or_is_not.5836b9") }); return; }
      if (loaded.detail.offerId !== this.offerId || loaded.detail.contentId !== this.offerId
        || loaded.detail.identityId !== actor.identityId || !isHorseDraftRevision(loaded.editRevision)) {
        throw new Error("Invalid atomic snapshot");
      }
      const ack = this.state.acknowledgement;
      if (ack && BigInt(loaded.editRevision) < BigInt(ack.editRevision)) throw new Error("Read predates confirmed update");
      const previous = this.state.snapshot;
      if (previous && (loaded.detail.offerType !== previous.detail.offerType
        || BigInt(loaded.editRevision) < BigInt(previous.editRevision))) throw new Error("Snapshot moved backwards");
      const snapshot = clone(loaded), form = prepareOwnerHorseDraftForm(snapshot.detail);
      const newer = ack && BigInt(snapshot.editRevision) > BigInt(ack.editRevision);
      this.set({ snapshot, form, baseline: form ? clone(form) : null, problem: null, acknowledgement: null,
        message: reason === "acknowledged" ? newer
          ? marketplaceMessage("horse.the_save_was_confirmed_the_draft_has_since.716b24")
          : marketplaceMessage("horse.changes_saved.8cbfff")
          : reason === "replace" ? marketplaceMessage("horse.saved_details_reloaded.27c564") : null });
    } catch {
      if (current()) this.set({ problem: "load", message: this.state.acknowledgement ? COPY.acknowledged : COPY.read });
    } finally {
      if (ticket === this.readTicket && !this.state.closed) this.set({ work: "idle" });
    }
  }
  async save() {
    if (!this.canSave() || !this.state.snapshot || !this.state.form || !this.state.baseline) return;
    let input: HorseDraftUpdateInput;
    try {
      const changes = buildOwnerHorseDraftChanges(this.state.snapshot.detail, this.state.baseline, this.state.form);
      if (!Object.keys(changes).length) return;
      input = { offerId: this.offerId, editRevision: this.state.snapshot.editRevision, changes: { ...changes } };
    } catch (error) {
      this.set({ message: safeMarketplaceError(error, marketplaceMessage("horse.check_the_changed_fields.743c12")) }); return;
    }
    const epoch = this.epoch;
    this.writing = true; // Before the first await; UI state alone is not a mutex.
    let dispatched = false, acknowledged = false;
    this.set({ work: "saving", message: null });
    try {
      const actor = await this.api.actor(this.userId);
      if (!this.valid(epoch)) return;
      if (!this.matches(actor)) { this.set({ context: "blocked" }); return; }
      dispatched = true;
      const result = await this.api.update(input);
      if (this.state.closed) return;
      if (result.offerId !== this.offerId || !isExpectedHorseDraftRevision(input.editRevision, result.editRevision)
        || !Number.isFinite(Date.parse(result.updatedAt))) throw new Error("Invalid acknowledgement");
      // A write sent before an identity event may still commit. Retain ACK, not a false rollback.
      this.set({ acknowledgement: clone(result), message: COPY.acknowledged });
      acknowledged = true;
    } catch (error) {
      if (this.state.closed) return;
      if (!dispatched) this.set({ context: "blocked" });
      else if (!(error instanceof HorseDraftWriteError) || error.outcome === "unknown") {
        this.set({ problem: "unknown", message: COPY.unknown });
      } else if (error.code === "40001") this.set({ problem: "conflict", message: COPY.conflict });
      else if (error.code === "55000") this.set({ problem: "not_editable", message: marketplaceMessage("horse.this_listing_is_no_longer_an_editable_draft.25f431") });
      else if (error.code === "42501") this.set({ context: "blocked", message: marketplaceMessage("horse.check_your_active_identity_and_access_your_input.3fffa2") });
      else this.set({ message: marketplaceMessage("horse.nothing_was_saved_check_the_changed_fields_retrying.8e40c0") });
    } finally {
      this.writing = false;
      if (!this.state.closed) this.set({ work: "idle" });
    }
    if (acknowledged && this.valid(epoch) && this.state.context === "ready") await this.readCurrent("acknowledged");
  }
  contextMessage() { return COPY.context; }
}
