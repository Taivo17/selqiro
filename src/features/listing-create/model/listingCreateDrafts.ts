import type { PublicationActor } from "../../../entities/listing/model/publicationJourney";
import { HorseDraftSession, type HorseDraftSessionApi } from "./horseDraftSession";
import { createListingCreateDraft, type ListingCreateDraft } from "./listingCreateDraft";

type Snapshot = Readonly<{ value: ListingCreateDraft; generation: number; submittedRequestKey: string | null }>;

export class ListingCreateDraftEntry {
  private snapshot: Snapshot = { value: createListingCreateDraft(), generation: 0, submittedRequestKey: null };
  private listeners = new Set<() => void>();
  private closed = false;
  private submittedValue: ListingCreateDraft | null = null;
  readonly horseSession: HorseDraftSession;
  constructor(readonly actor: PublicationActor, api: HorseDraftSessionApi) {
    this.horseSession = new HorseDraftSession(actor.userId, api, actor.identityId);
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(snapshot: Snapshot) {
    if (this.closed) return;
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }
  change<K extends keyof ListingCreateDraft>(generation: number, key: K,
    value: ListingCreateDraft[K] | ((current: ListingCreateDraft[K]) => ListingCreateDraft[K])) {
    if (this.closed || generation !== this.snapshot.generation) return;
    const current = this.snapshot.value;
    const next = typeof value === "function" ? value(current[key]) : value;
    this.set({ ...this.snapshot, value: { ...current, [key]: next } });
  }
  markSubmitted(requestKey: string, value = this.snapshot.value) {
    if (this.closed) return;
    this.submittedValue = value;
    this.set({ ...this.snapshot, submittedRequestKey: requestKey });
  }
  captureSubmission() {
    const value = this.snapshot.value;
    return (requestKey: string) => this.markSubmitted(requestKey, value);
  }
  finishOrdinary(requestKey: string) {
    // A restored older journal (or another tab's attempt) does not own this draft.
    if (this.snapshot.submittedRequestKey !== requestKey) return false;
    const ordinary = this.snapshot.value.contentType === "listing" && this.snapshot.value === this.submittedValue;
    this.submittedValue = null;
    const fresh = createListingCreateDraft();
    this.set({ ...this.snapshot, submittedRequestKey: null, generation: this.snapshot.generation + 1,
      value: ordinary ? { ...this.snapshot.value, title: fresh.title, description: fresh.description,
        files: fresh.files, ordinaryFields: fresh.ordinaryFields } : this.snapshot.value });
    return true;
  }
  finishHorse(requestKey: string, published: boolean) {
    if (this.snapshot.submittedRequestKey !== requestKey) return false;
    const owned = this.snapshot.value.contentType === "horse_offer" && this.snapshot.value === this.submittedValue;
    this.submittedValue = null;
    const fresh = createListingCreateDraft();
    this.set({...this.snapshot, submittedRequestKey: null, generation: this.snapshot.generation + 1,
      value: published && owned ? {...fresh, contentType: "horse_offer", horseOfferType: this.snapshot.value.horseOfferType} : this.snapshot.value});
    return true;
  }
  close() { this.closed = true; this.horseSession.authChanged(null); this.horseSession.deactivate(); this.listeners.clear(); }
}

/** Lives only as long as the account's open create page. A saved horse session
 * remains the same object so a late create acknowledgement retains its ID. */
export class ListingCreateDrafts {
  private entries = new Map<string, ListingCreateDraftEntry>();
  private closed = false;
  constructor(readonly userId: string, private readonly horseApi: HorseDraftSessionApi) {}
  forActor(actor: PublicationActor) {
    if (this.closed || actor.userId !== this.userId) throw new Error("context_changed");
    let entry = this.entries.get(actor.identityId);
    if (!entry) { entry = new ListingCreateDraftEntry(Object.freeze({ ...actor }), this.horseApi); this.entries.set(actor.identityId, entry); }
    return entry;
  }
  suspend = () => { for (const entry of this.entries.values()) entry.horseSession.suspend(); };
  close = () => { this.closed = true; for (const entry of this.entries.values()) entry.close(); this.entries.clear(); };
}
