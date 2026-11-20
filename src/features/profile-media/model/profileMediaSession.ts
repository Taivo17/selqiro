import type {ProfileMediaActor, ProfileMediaAsset, ProfileMediaSlot, ProfileMediaSnapshot, ProfileMediaUpdateCommand} from "../../../entities/profile/model/profileMedia";
import {DEFAULT_COVER_FIT, clampCoverFit, sameCoverFit, type CoverFit} from "../../../shared/profile-media/coverFit";
import type {ConversationActorContext} from "../../listing-conversation/model/useConversationActor";
import {ProfileMediaClientError, type ProfileMediaClient} from "../api/profileMediaClient";
import {prepareProfileImage, ProfileImagePreparationError, type PreparedProfileImage} from "./prepareProfileImage";
import type {ProfileMediaMessage} from "../i18n/messages";

export type ProfileMediaDraft = Readonly<{slot: ProfileMediaSlot; action: "set" | "remove" | "position";
  assetId: string | null; prepared: PreparedProfileImage | null; uploaded: ProfileMediaAsset | null; fit: CoverFit; baseRevision: string | null}>;
export type ProfileMediaView = Readonly<{saved: ProfileMediaSnapshot; draft: ProfileMediaDraft | null;
  phase: "ready" | "preparing" | "uploading" | "saving" | "checking" | "uncertain" | "conflict" | "retired";
  available: boolean; notice: ProfileMediaMessage | null}>;
type Options = {actor: ProfileMediaActor; initial: ProfileMediaSnapshot; client: ProfileMediaClient;
  context: () => ConversationActorContext | null; confirmed: () => void;
  prepare?: typeof prepareProfileImage; uuid?: () => string};

export function mediaUpdateMatches(snapshot: ProfileMediaSnapshot, command: ProfileMediaUpdateCommand): boolean {
  if (snapshot.user_id !== command.expectedUserId || snapshot.identity_id !== command.expectedIdentityId
    || snapshot.revision === null || snapshot.revision === command.expectedRevision) return false;
  const asset = snapshot[command.slot];
  if (command.action === "remove" ? asset !== null : asset?.asset_id !== command.assetId) return false;
  return command.slot !== "cover" || (snapshot.focus_x === command.focusX && snapshot.focus_y === command.focusY && snapshot.zoom === command.zoom);
}

/** Independent media revision keeps picture changes separate from unsaved text. */
export class ProfileMediaSession {
  private view: ProfileMediaView;
  private live = true;
  private ticket = 0;
  private selection = 0;
  private preparing: AbortController | null = null;
  private pending: ProfileMediaUpdateCommand | null = null;
  private listeners = new Set<() => void>();
  constructor(private readonly options: Options) {
    this.assertActor(options.initial);
    this.view = Object.freeze({saved: options.initial, draft: null, phase: "ready", available: true, notice: null});
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => {this.listeners.add(listener); return () => {this.listeners.delete(listener);};};
  private emit(patch: Partial<ProfileMediaView>) {if (!this.live) return; this.view = Object.freeze({...this.view, ...patch}); for (const listener of this.listeners) listener();}
  private assertActor(snapshot: ProfileMediaSnapshot) {
    if (snapshot.user_id !== this.options.actor.expectedUserId || snapshot.identity_id !== this.options.actor.expectedIdentityId) throw new Error("profile_media_actor_mismatch");
  }
  private context() {
    const context = this.options.context();
    return context && !context.signal.aborted && context.expectedUserId === this.options.actor.expectedUserId
      && context.expectedIdentityId === this.options.actor.expectedIdentityId ? context : null;
  }
  private current(ticket: number, context: ConversationActorContext) {return this.live && this.ticket === ticket && this.context() === context;}
  private adopt(saved: ProfileMediaSnapshot, notice: ProfileMediaMessage | null) {
    this.assertActor(saved); this.pending = null;
    this.emit({saved, draft: null, phase: "ready", available: true, notice});
  }
  suspend() {
    ++this.ticket;
    this.emit({available: false, ...(this.pending ? {phase: "uncertain" as const, notice: "uncertain" as const}
      : ["uploading", "checking"].includes(this.view.phase) ? {phase: "ready" as const, notice: "uploadError" as const} : {})});
  }
  revalidate(saved: ProfileMediaSnapshot) {
    if (!this.live) return; this.assertActor(saved); this.emit({available: true});
    if (this.pending) {this.reconcile(saved); return;}
    if (this.view.draft || this.view.phase === "preparing") {
      if (saved.revision !== this.view.saved.revision) this.emit({phase: "conflict", notice: "conflict"});
    } else this.adopt(saved, this.view.notice === "saved" || this.view.notice === "removed" ? this.view.notice : null);
  }
  async choose(file: File, slot: ProfileMediaSlot) {
    if (!this.live || !["ready", "preparing"].includes(this.view.phase) || this.pending
      || (this.view.draft && this.view.draft.slot !== slot)) return;
    // Selection is local. A file-picker focus refresh can temporarily suspend authorization;
    // the same session retains the selected file, and no upload occurs until revalidated.
    this.preparing?.abort(); const controller = new AbortController(); this.preparing = controller;
    const selection = ++this.selection, previous = this.view.draft;
    this.emit({phase: "preparing", notice: null});
    try {
      const prepared = await (this.options.prepare ?? prepareProfileImage)(file, slot, controller.signal);
      if (!this.live || selection !== this.selection || controller.signal.aborted) return;
      const draft: ProfileMediaDraft = Object.freeze({slot, action: "set", assetId: (this.options.uuid ?? (() => crypto.randomUUID()))(),
        prepared, uploaded: null, fit: DEFAULT_COVER_FIT, baseRevision: this.view.saved.revision});
      this.emit({draft, phase: this.view.phase === "conflict" ? "conflict" : "ready", notice: this.view.phase === "conflict" ? "conflict" : null});
    } catch (error) {
      if (!this.live || selection !== this.selection || controller.signal.aborted) return;
      this.emit({draft: previous, phase: this.view.phase === "conflict" ? "conflict" : "ready",
        notice: error instanceof ProfileImagePreparationError && error.code !== "aborted" ? error.code : "decodeError"});
    } finally {if (this.preparing === controller) this.preparing = null;}
  }
  remove(slot: ProfileMediaSlot) {
    if (!this.canEdit() || !this.view.saved[slot] || (this.view.draft && this.view.draft.slot !== slot)) return;
    this.emit({draft: Object.freeze({slot, action: "remove", assetId: null, prepared: null, uploaded: null,
      fit: DEFAULT_COVER_FIT, baseRevision: this.view.saved.revision}), notice: null});
  }
  position(value: CoverFit) {
    if (!this.canEdit() || (this.view.draft && (this.view.draft.slot !== "cover" || this.view.draft.action === "remove"))) return;
    const fit = clampCoverFit(value), draft = this.view.draft;
    if (draft) {this.emit({draft: Object.freeze({...draft, fit}), notice: null}); return;}
    const cover = this.view.saved.cover;
    if (!cover?.asset_id || sameCoverFit(fit, this.view.saved)) return;
    this.emit({draft: Object.freeze({slot: "cover", action: "position", assetId: cover.asset_id, prepared: null, uploaded: cover,
      fit, baseRevision: this.view.saved.revision}), notice: null});
  }
  private canEdit() {return this.live && this.view.available && this.view.phase === "ready" && !this.pending && !!this.context();}
  cancel() {
    if (!this.live || this.pending || ["saving", "uploading", "checking"].includes(this.view.phase)) return;
    ++this.selection; this.preparing?.abort(); this.preparing = null;
    this.emit({draft: null, phase: this.view.phase === "conflict" ? "conflict" : "ready", notice: this.view.phase === "conflict" ? "conflict" : null});
  }
  async save() {
    const context = this.context(), draft = this.view.draft;
    if (!this.canEdit() || !context || !draft) return;
    const ticket = ++this.ticket;
    let uploaded = draft.uploaded;
    if (draft.action === "set" && !uploaded) {
      if (!draft.prepared || !draft.assetId) return;
      this.emit({phase: "uploading", notice: null});
      try {
        const p = draft.prepared;
        const receipt = await this.options.client.upload(context, {...this.options.actor, expectedRevision: draft.baseRevision,
          assetId: draft.assetId, slot: draft.slot, imageBase64: p.imageBase64, sourceSha256: p.sourceSha256, sourceBytes: p.sourceBytes, sourceMime: p.sourceMime});
        if (!this.current(ticket, context)) return;
        uploaded = {asset_id: receipt.asset_id, url: receipt.url, width: receipt.width, height: receipt.height};
        this.emit({draft: Object.freeze({...draft, uploaded})});
      } catch (error) {
        if (!this.current(ticket, context)) return;
        this.failure(error, "uploadError"); return;
      }
    }
    const fit = draft.slot === "cover" && draft.action !== "remove" ? draft.fit : DEFAULT_COVER_FIT;
    const command: ProfileMediaUpdateCommand = Object.freeze({...this.options.actor, expectedRevision: draft.baseRevision,
      slot: draft.slot, action: draft.action, assetId: draft.assetId, focusX: fit.focus_x, focusY: fit.focus_y, zoom: fit.zoom});
    this.pending = command; this.emit({phase: "saving", notice: null});
    try {
      const result = await this.options.client.update(context, command);
      if (!this.current(ticket, context)) return;
      if (!mediaUpdateMatches(result, command)) {this.emit({phase: "uncertain", notice: "uncertain"}); return;}
      this.adopt(result, command.action === "remove" ? "removed" : "saved"); this.options.confirmed();
    } catch (error) {
      if (!this.current(ticket, context)) return;
      if (!(error instanceof ProfileMediaClientError) || error.kind === "unknown" || error.kind === "aborted") {
        this.emit({phase: "uncertain", notice: "uncertain"}); return;
      }
      this.pending = null; this.failure(error, "uncertain");
    }
  }
  private failure(error: unknown, fallback: ProfileMediaMessage) {
    const kind = error instanceof ProfileMediaClientError ? error.kind : "unknown";
    this.emit({phase: kind === "conflict" ? "conflict" : "ready", available: kind !== "forbidden",
      notice: kind === "conflict" ? "conflict" : kind === "forbidden" ? "forbidden" : kind === "invalid" ? "invalid"
        : kind === "rateLimited" ? "rateLimited" : fallback});
  }
  private reconcile(saved: ProfileMediaSnapshot) {
    const pending = this.pending; if (!pending) return;
    if (mediaUpdateMatches(saved, pending)) {
      this.adopt(saved, pending.action === "remove" ? "removed" : "saved"); this.options.confirmed(); return;
    }
    this.pending = null;
    if (saved.revision === pending.expectedRevision) this.emit({saved, phase: "ready", available: true, notice: "notConfirmed"});
    else this.emit({phase: "conflict", available: true, notice: "conflict"});
  }
  async check() {
    const context = this.context();
    if (!this.live || !context || !this.view.available || !this.pending || this.view.phase !== "uncertain") return;
    const ticket = ++this.ticket; this.emit({phase: "checking", notice: null});
    try {const saved = await this.options.client.snapshot(context); if (this.current(ticket, context)) this.reconcile(saved);}
    catch {if (this.current(ticket, context)) this.emit({phase: "uncertain", notice: "readError"});}
  }
  async reload() {
    const context = this.context();
    if (!this.live || !context || !this.view.available || this.pending || ["saving", "uploading", "checking", "preparing"].includes(this.view.phase)) return;
    const ticket = ++this.ticket; this.emit({phase: "checking", notice: null});
    try {const saved = await this.options.client.snapshot(context); if (this.current(ticket, context)) this.adopt(saved, null);}
    catch {if (this.current(ticket, context)) this.emit({phase: this.view.draft ? "conflict" : "ready", notice: "readError"});}
  }
  retire() {
    if (!this.live) return; ++this.ticket; ++this.selection; this.preparing?.abort(); this.pending = null;
    this.emit({phase: "retired", available: false, draft: null, notice: null}); this.live = false;
  }
}
