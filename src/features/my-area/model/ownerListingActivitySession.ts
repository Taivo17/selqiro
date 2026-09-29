import { getListingActivity, isRenewableListingId } from "../../../entities/listing/model/listingActivity";
import { ListingRenewalError, listingRenewalError, sameListingActor,
  type ListingActivityActor, type RenewListingActivityInput, type RenewListingActivityResult } from "../../../entities/listing/model/listingRenewal";
import type { ListingStatus } from "../../../entities/listing/api/updateListingStatus";
import type { MyAreaMarketplaceItemRow, MyAreaListingMarketplaceItemRow } from "./myAreaMarketplaceItemRow";
import { ownerListingsFilterKey, type MyAreaListingsFilters } from "./myAreaListingsFilters";

export type ListingRenewalConfirmation = { key: string; title: string; input: RenewListingActivityInput };
export type OwnerListingActivityState = {
  listings: MyAreaMarketplaceItemRow[]; loading: boolean; error: string | null;
  actor: ListingActivityActor | null; filterKey: string; confirmation: ListingRenewalConfirmation | null;
  busyKey: string | null; problem: string | null; notice: string | null; needsReload: boolean;
};
export type OwnerListingActivityDependencies = {
  actor: () => Promise<ListingActivityActor>;
  read: (filters: MyAreaListingsFilters) => Promise<MyAreaMarketplaceItemRow[]>;
  renew: (input: RenewListingActivityInput) => Promise<RenewListingActivityResult>;
  status: (input: { listingId: string; status: ListingStatus }) => Promise<void>;
  now?: () => number;
};
const initial = (): OwnerListingActivityState => ({ listings: [], loading: true, error: null,
  actor: null, filterKey: "", confirmation: null, busyKey: null, problem: null, notice: null, needsReload: false });

/** One mounted owner-list controller. No transport/UI code or automatic mutation retries. */
export class OwnerListingActivitySession {
  private state = initial();
  private listeners = new Set<() => void>();
  private alive = false;
  private epoch = 0;
  private filters: MyAreaListingsFilters = {};
  private locked = false;
  private pendingRead = false;
  constructor(private readonly deps: OwnerListingActivityDependencies) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(next: Partial<OwnerListingActivityState>) {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }
  activate() { this.alive = true; }
  deactivate() { this.alive = false; this.epoch++; }
  private current(epoch: number) { return this.alive && epoch === this.epoch; }

  /** Synchronous invalidation is safe inside auth callbacks; caller schedules the read later. */
  invalidate() {
    this.epoch++;
    this.set({ listings: [], actor: null, confirmation: null, loading: true, error: null,
      problem: null, notice: null, needsReload: true });
  }
  authChanged(userId: string | null): boolean {
    if (this.state.actor?.userId === userId) return false;
    this.invalidate();
    return true;
  }
  async load(filters: MyAreaListingsFilters): Promise<void> {
    this.filters = { ...filters };
    await this.reload();
  }
  async reload(): Promise<void> {
    if (!this.alive) return;
    this.invalidate();
    this.set({ filterKey: ownerListingsFilterKey(this.filters) });
    if (this.locked) { this.pendingRead = true; return; }
    const epoch = this.epoch;
    try {
      const actor = await this.deps.actor();
      if (!this.current(epoch)) return;
      await this.readSnapshot(epoch, actor, null);
    } catch {
      if (this.current(epoch)) this.set({ loading: false, error: "Kuulutusi ei saanud laadida. Kontrolli sisselogimist ja aktiivset identiteeti ning proovi uuesti.", needsReload: true });
    }
  }
  private async readSnapshot(epoch: number, actor: ListingActivityActor, notice: string | null) {
    const listings = await this.deps.read({ ...this.filters });
    if (!this.current(epoch)) return;
    const confirmed = await this.deps.actor();
    if (!this.current(epoch)) return;
    if (!sameListingActor(actor, confirmed) || listings.some(row => row.identityId
      ? row.identityId !== actor.identityId : row.ownerUserId !== actor.userId)) {
      throw new ListingRenewalError("forbidden");
    }
    this.set({ listings, actor, loading: false, error: null, confirmation: null,
      problem: null, notice, needsReload: false, filterKey: ownerListingsFilterKey(this.filters) });
  }
  private ordinary(key: string): MyAreaListingMarketplaceItemRow | null {
    const row = this.state.listings.find(item => item.key === key);
    return row?.contentType === "listing" ? row : null;
  }
  private canAct() {
    return this.alive && !this.locked && !this.state.loading && !this.state.needsReload && !!this.state.actor;
  }
  requestRenewal(key: string) {
    if (!this.canAct()) return;
    const row = this.ordinary(key);
    if (!row || row.identityId !== this.state.actor?.identityId || !isRenewableListingId(row.id)
      || !getListingActivity(row.status, row.activeUntil, this.deps.now?.()).canRenew) return;
    this.set({ confirmation: { key, title: row.title, input: { listingId: row.id, expectedActiveUntil: row.activeUntil } },
      notice: null, problem: null });
  }
  cancelRenewal() { if (!this.locked) this.set({ confirmation: null }); }
  async confirmRenewal(expected = this.state.confirmation): Promise<void> {
    const confirmation = this.state.confirmation;
    if (!confirmation || confirmation !== expected || !this.canAct()) return;
    const row = this.ordinary(confirmation.key);
    if (!row || row.status !== "active" || row.activeUntil !== confirmation.input.expectedActiveUntil) return;
    await this.mutate(confirmation.key, async () => {
      const result = await this.deps.renew({ ...confirmation.input });
      return result.changed ? "Kuulutuse tähtaeg on uuendatud. Sisu ja järjestus ei muutunud."
        : "Olemasolev kehtivusaeg säilis; uut pikendamist polnud vaja.";
    });
  }
  async changeStatus(key: string, status: ListingStatus): Promise<void> {
    if (!this.canAct() || this.state.confirmation || !["active", "paused", "sold"].includes(status)) return;
    const row = this.ordinary(key);
    if (!row || !["active", "paused", "sold"].includes(row.status) || row.status === status) return;
    await this.mutate(key, async () => {
      await this.deps.status({ listingId: row.id, status });
      return "Staatus muudetud. Kuulutuse tähtaega ei pikendatud.";
    });
  }
  private async mutate(key: string, action: () => Promise<string>) {
    const actor = this.state.actor;
    if (!actor) return;
    const epoch = this.epoch;
    // Ref-like synchronous lock survives renders, invalidations and pending promises.
    this.locked = true;
    this.set({ busyKey: key, problem: null, notice: null });
    let acknowledged = false;
    try {
      const before = await this.deps.actor();
      if (!this.current(epoch)) return;
      if (!sameListingActor(actor, before)) throw new ListingRenewalError("forbidden");
      const notice = await action();
      acknowledged = true;
      if (!this.current(epoch)) return;
      const after = await this.deps.actor();
      if (!this.current(epoch)) return;
      if (!sameListingActor(actor, after)) throw new ListingRenewalError("forbidden");
      this.set({ confirmation: null, loading: true, notice });
      await this.readSnapshot(epoch, actor, notice);
    } catch (error) {
      if (!this.current(epoch)) return;
      const failure = listingRenewalError(error);
      const contextChanged = failure.kind === "forbidden";
      this.set({ confirmation: null, loading: false, needsReload: true,
        ...(contextChanged ? { listings: [], actor: null } : {}),
        problem: acknowledged && !contextChanged
          ? "Server kinnitas toimingu, kuid nimekirja värskendamine ebaõnnestus. Laadi nimekiri uuesti; ära korda toimingut."
          : failure.message });
    } finally {
      this.locked = false;
      // An obsolete completion never restores an old actor, row, dialog or success message.
      if (this.alive) this.set({ busyKey: null });
      if (this.pendingRead && this.alive) { this.pendingRead = false; await this.reload(); }
    }
  }
}
