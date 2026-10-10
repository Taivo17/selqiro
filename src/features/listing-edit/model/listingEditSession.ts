import type { ListingEditApi } from "../../../entities/listing/api/listingEditClient";
import { classifyListingEditError, validateListingEditKey, type ListingEditActor,
  type ListingEditKey, type ListingEditProblem, type ListingEditSnapshot } from "../../../entities/listing/model/listingEditSnapshot";
import { buildListingEditCommand, buildListingEditDraft, listingEditDraftDirty, type ListingEditDraft } from "./listingEditDraft";

export type ListingEditSessionState = Readonly<{
  snapshot: ListingEditSnapshot | null; draft: ListingEditDraft | null; reviewed: ListingEditSnapshot | null;
  work: "idle" | "loading" | "saving" | "reviewing"; context: "blocked" | "ready";
  problem: ListingEditProblem | null; message: string | null; saved: boolean; closed: boolean;
}>;
const freezeDraft = (draft: ListingEditDraft): ListingEditDraft => Object.freeze({ ...draft, price: Object.freeze({ ...draft.price }) });

/** One mounted account + identity + listing. No storage, global cache, automatic write or general form framework.
 * Route integration must deliver every auth/identity transition synchronously before allowing actions. */
export class ListingEditSession {
  readonly key: ListingEditKey;
  private state: ListingEditSessionState = Object.freeze({ snapshot: null, draft: null, reviewed: null,
    work: "idle", context: "blocked", problem: null, message: null, saved: false, closed: false });
  private epoch = 0;
  private pending: "read" | "write" | null = null;
  private disposed = false;
  private controller: AbortController | null = null;
  private readonly listeners = new Set<() => void>();
  constructor(key: ListingEditKey, private readonly api: ListingEditApi) { validateListingEditKey(key); this.key = Object.freeze({ ...key }); }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(patch: Partial<ListingEditSessionState>) {
    this.state = Object.freeze({ ...this.state, ...patch });
    if (!this.disposed) for (const listener of this.listeners) listener();
  }
  private current(epoch: number) { return !this.disposed && !this.state.closed && epoch === this.epoch && this.state.context === "ready"; }
  setContext(actor: ListingEditActor | null) {
    if (this.disposed || this.state.closed) return;
    // Authentication loss/account change drops account-bound plaintext, not just the save button.
    if (!actor || actor.userId !== this.key.userId) {
      this.epoch++; this.controller?.abort(); this.set({ closed: true, context: "blocked", snapshot: null, draft: null, reviewed: null,
        work: "idle", problem: "context", message: "Konto muutus. Ava vorm õige kontoga uuesti.", saved: false }); return;
    }
    const context = actor.identityId === this.key.identityId ? "ready" : "blocked";
    if (context !== this.state.context) {
      this.epoch++; this.controller?.abort();
      this.set({ context, saved: false, reviewed: null,
        ...(this.pending === "write" ? { problem: "unknown" as const, message: "Salvestuse ajal muutus kontekst. Kontrolli salvestatud versiooni; kirjutust ei korrata." } : {}) });
    }
  }
  dispose() { this.disposed = true; this.epoch++; this.controller?.abort(); this.listeners.clear(); this.set({ closed: true,
    context: "blocked", snapshot: null, draft: null, reviewed: null, work: "idle" }); }
  isDirty() { return !!this.state.draft && !!this.state.snapshot && listingEditDraftDirty(this.state.draft, buildListingEditDraft(this.state.snapshot)); }
  hasUnsettledWork() { return this.isDirty() || this.pending === "write" || this.state.problem === "unknown" || this.state.problem === "conflict"; }
  canEdit() { return !this.disposed && !this.state.closed && this.state.context === "ready" && !this.pending && !!this.state.draft; }
  canSave() { return this.canEdit() && this.isDirty() && this.state.problem !== "unknown" && this.state.problem !== "conflict"
    && this.state.problem !== "forbidden" && this.state.problem !== "unavailable"; }
  change(next: ListingEditDraft) {
    if (!this.canEdit()) return;
    this.set({ draft: freezeDraft(next), reviewed: null, saved: false,
      ...(this.state.problem === "invalid" ? { problem: null, message: null } : {}) });
  }
  resetToLoaded() {
    if (!this.canEdit() || !this.state.snapshot || (this.state.problem !== null && this.state.problem !== "invalid")) return;
    this.set({ draft: buildListingEditDraft(this.state.snapshot), reviewed: null, saved: false, problem: null, message: null });
  }
  /** Initial read only. Existing drafts are never overwritten by a routine refresh. */
  async load() { if (this.state.snapshot) return; await this.read(false); }
  /** Explicit read-only reconciliation; does not attach a fresh revision to an old draft. */
  async reviewSaved() { if (!this.state.snapshot) return; await this.read(true); }
  private async read(review: boolean) {
    if (this.disposed || this.state.closed || this.pending || this.state.context !== "ready") return;
    const epoch = this.epoch; this.pending = "read"; this.controller = new AbortController();
    this.set({ work: review ? "reviewing" : "loading", ...(review ? {} : { message: null, problem: null }) });
    try {
      const loaded = await this.api.read(this.key, this.controller.signal);
      if (!this.current(epoch)) return;
      if (this.state.snapshot && BigInt(loaded.price.revision) < BigInt(this.state.snapshot.price.revision)) throw new Error("Older snapshot");
      if (review) this.set({ reviewed: loaded, message: "Salvestatud versioon on kontrollitud. Kohalik sisestus on endiselt alles." });
      else this.set({ snapshot: loaded, draft: buildListingEditDraft(loaded), problem: null, saved: false });
    } catch (error) {
      if (this.current(epoch)) {
        const e = classifyListingEditError(error);
        // Preserve a previous unknown/conflict gate if the reconciliation read fails.
        this.set({ ...(review ? {} : { problem: e.code }), message: "Salvestatud kuulutust ei saanud lugeda. Olemasolev sisestus on alles." });
      }
    } finally { this.pending = null; this.controller = null; if (!this.disposed && !this.state.closed) this.set({ work: "idle" }); }
  }
  /** User explicitly discards local edits after seeing the reviewed server version. No automatic rebase/merge. */
  useReviewed(discardConfirmed: boolean) {
    if (!discardConfirmed || !this.canEdit() || !this.state.reviewed) return;
    const loaded = this.state.reviewed;
    this.set({ snapshot: loaded, draft: buildListingEditDraft(loaded), reviewed: null, problem: null,
      message: "Vorm kasutab kontrollitud salvestatud versiooni.", saved: false });
  }
  async save() {
    if (!this.canSave() || !this.state.snapshot || !this.state.draft) return;
    let command;
    try { command = buildListingEditCommand(this.key, this.state.snapshot, this.state.draft); }
    catch (error) { this.set({ problem: "invalid", message: error instanceof Error ? error.message : "Kontrolli sisestust." }); return; }
    const epoch = this.epoch; this.pending = "write"; this.controller = new AbortController(); // synchronous: a second click cannot dispatch another write
    this.set({ work: "saving", saved: false, reviewed: null, problem: null, message: null });
    try {
      const result = await this.api.save(command, this.controller.signal);
      if (!this.current(epoch)) return;
      this.set({ snapshot: result.snapshot, draft: buildListingEditDraft(result.snapshot), problem: null,
        message: "Salvestatud.", saved: true });
    } catch (error) {
      if (this.current(epoch)) { const e = classifyListingEditError(error); this.set({ problem: e.code, message: e.message }); }
    } finally { this.pending = null; this.controller = null; if (!this.disposed && !this.state.closed) this.set({ work: "idle" }); }
  }
}
