import { HorseDraftWriteError } from "../../../entities/horse-offer/model/draftWriteError";
import type { HorseDraftActor, HorseDraftAcknowledgement, HorseDraftUpdateInput, HorseDraftUpdateResult } from "../../../entities/horse-offer/model/draftEdit";
import type { SavedHorseOfferDraft, SaveMyHorseOfferDraftInput, HorseOfferDraftOfferType } from "../../../entities/horse-offer/model/types";
import { buildHorseDraftChanges } from "./horseDraftChanges";

export type HorseDraftSessionState = Readonly<{
  busy: boolean; context: "checking" | "ready" | "blocked";
  message: string | null; stop: "unknown" | "conflict" | "not_editable" | null;
  draft: HorseDraftAcknowledgement | null; recoveryId: string | null;
  lockedType: HorseOfferDraftOfferType | null;
  baseline: SaveMyHorseOfferDraftInput | null;
}>;
export type HorseDraftSessionApi = {
  actor: (userId: string) => Promise<HorseDraftActor>;
  create: (input: SaveMyHorseOfferDraftInput) => Promise<SavedHorseOfferDraft>;
  update: (input: HorseDraftUpdateInput) => Promise<HorseDraftUpdateResult>;
};
const CONTEXT_MESSAGE = "Aktiivne identiteet muutus või selle kontroll ei õnnestunud. Sisestus on alles. Vali vormi algne identiteet ja kontrolli uuesti.";
const UNKNOWN_MESSAGE = "Salvestuse tulemust ei saanud kinnitada. Sisestus on alles. Kontrolli mustandit Minu alas; ära loo pimesi uut ega värskenda seda vormi enne kontrollimist.";

/** One mounted user's draft session, never a global store or durable idempotency layer. */
export class HorseDraftSession {
  private state: HorseDraftSessionState = {
    busy: false, context: "checking", message: null, stop: null,
    draft: null, recoveryId: null, lockedType: null, baseline: null,
  };
  private readonly listeners = new Set<() => void>();
  private active = false;
  private closed = false;
  private epoch = 0;
  private boundIdentityId: string | null = null;
  constructor(readonly userId: string, private readonly api: HorseDraftSessionApi) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private set(patch: Partial<HorseDraftSessionState>) {
    this.state = { ...this.state, ...patch };
    if (this.active) for (const listener of this.listeners) listener();
  }
  activate() { this.active = true; }
  deactivate() { this.active = false; this.epoch += 1; }
  authChanged(userId: string | null) {
    if (userId === this.userId) return; // Token refresh is not a new form.
    this.closed = true;
    this.epoch += 1;
    this.set({ context: "blocked", message: "Konto muutus. Selle konto vormi enam ei salvestata." });
  }
  async refreshContext() {
    if (!this.active || this.closed) return;
    const epoch = ++this.epoch;
    this.set({ context: "checking" });
    try {
      const actor = await this.api.actor(this.userId);
      if (!this.active || this.closed || this.epoch !== epoch) return;
      if (actor.userId !== this.userId) throw new Error("Wrong account");
      if (this.boundIdentityId === null) this.boundIdentityId = actor.identityId;
      const ready = actor.identityId === this.boundIdentityId;
      this.set({ context: ready ? "ready" : "blocked",
        message: this.state.stop ? this.state.message : ready ? null : CONTEXT_MESSAGE });
    } catch {
      if (this.active && !this.closed && this.epoch === epoch) {
        this.set({ context: "blocked", message: this.state.stop ? this.state.message : CONTEXT_MESSAGE });
      }
    }
  }
  // Synchronous check for event handlers; UI disabling alone is not enough.
  canSave() { return this.active && !this.closed && !this.state.busy && !this.state.stop && this.state.context === "ready"; }
  async save(input: SaveMyHorseOfferDraftInput) {
    if (!this.canSave()) return;
    if (input.offerId !== null || (this.state.lockedType && input.offerType !== this.state.lockedType)) {
      this.set({ message: "Salvestatud pakkumise liiki ei saa selles vormis muuta." }); return;
    }
    // All values in the validated mapper output are scalars. Snapshot before any await.
    const sent = { ...input };
    const baseline = this.state.baseline;
    const draft = this.state.draft;
    const epoch = this.epoch;
    let dispatched = false;
    this.set({ busy: true, message: null });
    try {
      const actor = await this.api.actor(this.userId);
      if (!this.active || this.closed || this.epoch !== epoch) return;
      if (actor.userId !== this.userId || actor.identityId !== this.boundIdentityId) {
        this.set({ context: "blocked", message: CONTEXT_MESSAGE }); return;
      }
      if (draft && baseline) {
        const changes = buildHorseDraftChanges(baseline, sent);
        if (Object.keys(changes).length === 0) return;
        dispatched = true;
        const saved = await this.api.update({ offerId: draft.offerId, editRevision: draft.editRevision, changes });
        this.set({ draft: { ...draft, ...saved }, baseline: sent });
      } else {
        dispatched = true;
        const saved = await this.api.create(sent);
        this.set({ recoveryId: saved.offerId, lockedType: sent.offerType });
        if (saved.identityId !== actor.identityId || saved.createdByUserId !== this.userId
          || saved.offerType !== sent.offerType || saved.editRevision !== "1") {
          throw new HorseDraftWriteError("Loomise kontekst erineb.", "unknown", null, saved.offerId);
        }
        this.set({ draft: { offerId: saved.offerId, identityId: saved.identityId, userId: this.userId,
          offerType: saved.offerType, editRevision: saved.editRevision, updatedAt: saved.updatedAt }, baseline: sent });
      }
      // No identity/token refresh here. An identity event controls context independently.
    } catch (error) {
      if (!dispatched) {
        this.set({ context: "blocked", message: CONTEXT_MESSAGE });
      } else if (!(error instanceof HorseDraftWriteError) || error.outcome === "unknown") {
        this.set({ stop: "unknown", message: UNKNOWN_MESSAGE, lockedType: sent.offerType,
          recoveryId: error instanceof HorseDraftWriteError ? error.knownOfferId || this.state.recoveryId : this.state.recoveryId });
      } else if (error.outcome === "not_sent") {
        this.set({ message: "Salvestust ei saadetud. Kontrolli vormi välju." });
      } else if (error.code === "40001") {
        this.set({ stop: "conflict", message: "Mustandit on vahepeal muudetud. Sinu sisestus on alles. Ava salvestatud mustand eraldi aknas; seda vana vormi uuesti ei saadeta." });
      } else if (error.code === "55000") {
        this.set({ stop: "not_editable", message: "See pakkumine ei ole enam muudetav mustand. Sisestus on alles; kontrolli salvestatud pakkumist." });
      } else {
        this.set({ message: "Server lükkas salvestuse tagasi. Kontrolli välju ja aktiivset identiteeti. Sisestus on alles; uuesti salvestades kasutatakse sama andmeversiooni." });
      }
    } finally {
      this.set({ busy: false });
    }
  }
}
