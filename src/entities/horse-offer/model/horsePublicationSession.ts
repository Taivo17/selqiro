import { completePublicationImage, publicationImageUploadOrigin, type PublicationImageJournal } from "../../listing/api/completePublicationImage";
import { bindFilePreparations, preparePublicationFile, preparationMatchesUpload, restorePublicationFile,
  type PublicationFilePreparation, type PrepareListingPhoto } from "../../listing/model/publicationFilePreparation";
import type { PublicationActor } from "../../listing/model/publicationJourney";
import { isUploadUuid } from "../../listing/model/privatePublicationUpload";
import { measurePhotoTask } from "../../listing/model/photoPerformance";
import type { SaveMyHorseOfferDraftInput } from "./types";
import type { OwnerHorseOfferEditSnapshot } from "./editSnapshot";
import { bindHorseOwnerSnapshot, bindHorsePrepare, bindHorsePublicationResult, type HorsePolicySnapshot,
  type HorsePrepareCommand, type HorsePublicationResult, type HorseGalleryIntent, type HorseConfirmationSelection } from "./publication";
import { buildHorseOfferDraftSaveInput } from "../../../features/listing-create/model/horseOfferDraftSave";
import { prepareOwnerHorseDraftForm } from "../../../features/horse-offer-edit/model/ownerHorseDraftForm";

export type HorseSelectedImage = Readonly<{imageId: string; isPrimary: boolean} | {file: Blob; isPrimary: boolean}>;
export type HorsePublicationStart = Readonly<{
  content: SaveMyHorseOfferDraftInput; expectedRevision: string | null;
  gallery: readonly HorseSelectedImage[]; confirmations: HorseConfirmationSelection;
  policySnapshot: readonly HorsePolicySnapshot[];
}>;
export type HorsePublicationJournal = PublicationImageJournal & {
  command: HorsePrepareCommand; attemptId: string | null; preparation: readonly PublicationFilePreparation[];
};
export type HorsePublicationPhase = "editing" | "busy" | "resume" | "needs_files" | "unknown" | "needs_attention" | "published" | "closed";
export type HorsePublicationView = Readonly<{
  phase: HorsePublicationPhase; message: string; result: HorsePublicationResult | null;
  confirmed: OwnerHorseOfferEditSnapshot | null; currentImage: number | null; intent: HorsePrepareCommand | null;
}>;
export type HorsePublicationDeps = {
  actor: PublicationActor; offerId: string | null; projectOrigin: string; storageOrigin?: string;
  readJournal: () => HorsePublicationJournal | null; writeJournal: (journal: HorsePublicationJournal) => void;
  clearJournal: () => void; withLock: <T>(work: () => Promise<T>) => Promise<T>;
  request: (action: string, body: object, signal: AbortSignal) => Promise<unknown>;
  putPart: (url: string, headers: Record<string, string>, bytes: Blob, signal: AbortSignal) => Promise<void>;
  uuid: () => string; digest: (bytes: Blob) => Promise<string>; preparePhoto?: PrepareListingPhoto;
  canAct: () => boolean;
};
const initial = (): HorsePublicationView => ({phase: "editing", message: "", result: null, confirmed: null, currentImage: null, intent: null});
const normalized = (value: unknown) => typeof value === "string" ? value.trim() || null : value;

/** A success message requires the committed horse and its ordered gallery, not
 * merely a successful HTTP request or an uploaded private object. */
export function horsePublicationReadbackMatches(command: HorsePrepareCommand, result: HorsePublicationResult,
  snapshot: OwnerHorseOfferEditSnapshot): boolean {
  const statusMatches = command.offerId === null ? snapshot.detail.status === "published"
    : ["published", "paused", "closed"].includes(snapshot.detail.status);
  if (!statusMatches || snapshot.detail.offerId !== result.horse_offer_id
    || snapshot.editRevision !== result.edit_revision || snapshot.detail.offerType !== command.content.offerType) return false;
  const form = prepareOwnerHorseDraftForm(snapshot.detail);
  if (!form) return false;
  const actual = {...buildHorseOfferDraftSaveInput(form), locationText: snapshot.detail.locationText,
    horseLat: snapshot.detail.horseLat, horseLng: snapshot.detail.horseLng};
  for (const key of Object.keys(command.content) as (keyof SaveMyHorseOfferDraftInput)[]) {
    if (key !== "offerId" && normalized(actual[key]) !== normalized(command.content[key])) return false;
  }
  const images = snapshot.detail.images;
  if (images.length !== command.gallery.length) return false;
  return command.gallery.every((expected, ordinal) => {
    const image = images[ordinal];
    if (!image || image.sortOrder !== ordinal || image.isPrimary !== expected.isPrimary) return false;
    if ("imageId" in expected) return image.id === expected.imageId;
    try {
      const path = new URL(image.originalUrl, "https://selqiro.invalid").pathname;
      return path === `/api/v2/horse-owner-media/${result.attempt_id}/${ordinal}`
        || path === `/api/v2/horse-media/${result.attempt_id}/${ordinal}`;
    } catch { return false; }
  });
}

/** One immutable create/update intent. An uncertain PUT is verified, never sent
 * again. A lost prepare is reconciled by request key before any retry. */
export class HorsePublicationSession {
  private abort = new AbortController();
  private operation: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  private files = new Map<string, Blob>();
  private terminal: string | null = null;
  private readonly uploadOrigin: string;
  private view: HorsePublicationView = initial();
  constructor(private readonly deps: HorsePublicationDeps) {
    this.uploadOrigin = publicationImageUploadOrigin(deps.projectOrigin, deps.storageOrigin);
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  invalidate() { this.abort.abort(); this.files.clear(); this.listeners.clear(); }
  private change(patch: Partial<HorsePublicationView>) {
    this.view = Object.freeze({...this.view, ...patch}); for (const fn of this.listeners) fn();
  }
  private check = () => { if (this.abort.signal.aborted || !this.deps.canAct()) throw new Error("context_changed"); };
  private journal(): HorsePublicationJournal {
    const j = this.deps.readJournal();
    if (!j || j.version !== 1 || !isUploadUuid(j.requestKey) || (j.attemptId !== null && !isUploadUuid(j.attemptId))
      || !Array.isArray(j.dispatched) || j.dispatched.length > 10 || !j.dispatched.every(isUploadUuid)
      || new Set(j.dispatched).size !== j.dispatched.length) throw new Error("journal_missing");
    const command = bindHorsePrepare(j.command, this.deps.actor, this.deps.offerId);
    if (command.requestKey !== j.requestKey) throw new Error("journal_missing");
    const preparation = bindFilePreparations(j.preparation);
    const images = command.gallery.filter(image => "clientFileId" in image);
    if (preparation.length !== images.length || images.some(image => !("clientFileId" in image)
      || !preparation.some(p => preparationMatchesUpload(p, image.clientFileId, image.byteLength, image.sha256)))) throw new Error("journal_missing");
    return {...j, command, preparation};
  }
  private hasJournal() { try { return this.deps.readJournal() !== null; } catch { return true; } }
  private scope(j: HorsePublicationJournal) { return {expectedUserId: this.deps.actor.userId,
    expectedIdentityId: this.deps.actor.identityId, requestKey: j.requestKey, attemptId: j.attemptId}; }
  private async readResult(value: unknown, j: HorsePublicationJournal) {
    this.check();
    const result = bindHorsePublicationResult(value, j.command, j.attemptId);
    if (result.attempt_id && !j.attemptId) {
      const latest = this.journal(); if (latest.requestKey !== j.requestKey) throw new Error("context_changed");
      this.deps.writeJournal({...latest, attemptId: result.attempt_id});
    }
    this.change({result, intent: j.command});
    if (result.state === "published") {
      const data = await this.deps.request("owner-read", {expectedUserId: this.deps.actor.userId,
        expectedIdentityId: this.deps.actor.identityId, offerId: result.horse_offer_id}, this.abort.signal);
      this.check();
      const confirmed = bindHorseOwnerSnapshot(data, this.deps.actor, result.horse_offer_id!);
      if (!confirmed || BigInt(confirmed.editRevision) < BigInt(result.edit_revision!)) throw new Error("outcome_unknown");
      const later = BigInt(confirmed.editRevision) > BigInt(result.edit_revision!);
      if (!later && !horsePublicationReadbackMatches(j.command, result, confirmed)) throw new Error("outcome_unknown");
      this.terminal = j.requestKey;
      this.change({phase: "published", message: later ? "changedAfterSave" : j.command.offerId ? "changesSaved" : "published",
        confirmed, currentImage: null});
    } else if (result.state === "cancelled") {
      this.terminal = j.requestKey; this.change({phase: "closed", message: "cancelled", currentImage: null});
    }
    return result;
  }
  private run(work: () => Promise<void>, total = false): Promise<void> {
    if (this.operation) return this.operation;
    if (this.abort.signal.aborted) return Promise.resolve();
    this.change({phase: "busy", message: "checking", currentImage: null});
    const operation = Promise.resolve().then(() => this.deps.withLock(async () => {
      this.check(); await (total ? measurePhotoTask("total", work) : work());
    })).catch(error => {
      if (this.abort.signal.aborted) return;
      const code = error instanceof Error ? error.message : "outcome_unknown";
      const messages: Record<string, string> = {files_required: "samePhotos", image_rejected: "imageRejected",
        image_processor_unavailable: "imageUnavailable", photo_preparation_changed: "samePhotos",
        revision_conflict: "conflict", details_rejected: "rejected", context_changed: "contextChanged",
        temporarily_limited: "limited", storage_limited: "storageLimited", policies_changed: "policiesChanged", busy_elsewhere: "busyElsewhere", confirmations_required: "confirmationsRequired",
        policies_required: "policiesRequired", details_invalid: "checkDetails", images_invalid: "checkImages"};
      const phase = !this.hasJournal() ? "editing" : code === "files_required" ? "needs_files"
        : ["image_rejected", "image_processor_unavailable", "photo_preparation_changed", "revision_conflict", "details_rejected", "policies_changed"].includes(code)
          ? "needs_attention" : "unknown";
      this.change({phase, message: messages[code] || (this.hasJournal() ? "unknown" : "checkDetails"), currentImage: null});
    });
    this.operation = operation.finally(() => { this.operation = null; }); return this.operation;
  }
  inspect = (): Promise<void> => {
    if (this.operation) return this.operation;
    if (!this.hasJournal()) {
      // Another tab may retire the same completed edit while its verified
      // snapshot is still being adopted here. Keep the handoff observable.
      if (this.deps.offerId && this.view.phase === "published" && this.view.confirmed) return Promise.resolve();
      this.change(initial()); return Promise.resolve();
    }
    return this.run(async () => {
      const j = this.journal();
      const result = await this.readResult(await this.deps.request("status", this.scope(j), this.abort.signal), j);
      if (["prepared", "not_found"].includes(result.state)) this.change({phase: "resume", message: "resume"});
    });
  };
  start(input: HorsePublicationStart, onIntentCreated?: (key: string) => void): Promise<void> {
    if (this.operation) return this.operation;
    // Capture every scalar and Blob synchronously, before the cross-tab lock.
    let captured: HorsePublicationStart;
    try {
      captured = {...JSON.parse(JSON.stringify({...input, gallery: []})), gallery: input.gallery.map(image => {
        if ("imageId" in image) return {...image};
        if (!(image.file instanceof Blob) || image.file.size < 1 || image.file.size > 25 * 1024 * 1024) throw new Error("images_invalid");
        return {file: image.file.slice(0, image.file.size, image.file.type), isPrimary: image.isPrimary};
      })};
      if (captured.gallery.length > 10 || captured.gallery.reduce((n, image) => n + ("file" in image ? image.file.size : 0), 0) > 100 * 1024 * 1024)
        throw new Error("images_invalid");
    } catch { this.change({message: "checkImages"}); return Promise.resolve(); }
    return this.run(async () => {
      if (this.hasJournal()) {
        const j = this.journal(), result = await this.readResult(await this.deps.request("status", this.scope(j), this.abort.signal), j);
        if (["prepared", "not_found"].includes(result.state)) this.change({phase: "resume", message: "resume"}); return;
      }
      const requestKey = this.deps.uuid(), preparation: PublicationFilePreparation[] = [], gallery: HorseGalleryIntent[] = [];
      for (const image of captured.gallery) {
        if ("imageId" in image) { gallery.push(image); continue; }
        this.change({message: "preparingPhotos"});
        const prepared = await preparePublicationFile(image.file, this.deps.uuid(), this.deps, {signal: this.abort.signal, checkContext: this.check});
        this.check(); preparation.push(prepared.preparation); this.files.set(prepared.preparation.clientFileId, prepared.bytes);
        gallery.push({clientFileId: prepared.preparation.clientFileId, byteLength: prepared.preparation.uploadBytes,
          sha256: prepared.preparation.uploadSha256, isPrimary: image.isPrimary});
      }
      const command = bindHorsePrepare({expectedUserId: this.deps.actor.userId, expectedIdentityId: this.deps.actor.identityId,
        requestKey, offerId: this.deps.offerId, expectedRevision: captured.expectedRevision,
        content: captured.content, gallery, confirmations: captured.confirmations, policySnapshot: captured.policySnapshot}, this.deps.actor, this.deps.offerId);
      const j: HorsePublicationJournal = {version: 1, requestKey, dispatched: [], command, attemptId: null, preparation};
      this.deps.writeJournal(j); // Exact content/policies and byte proofs BEFORE any server mutation.
      this.change({intent: j.command});
      onIntentCreated?.(requestKey); this.check();
      const result = await this.readResult(await this.deps.request("prepare", command, this.abort.signal), j);
      if (result.state === "prepared") await this.complete(this.journal(), result);
    }, true);
  }
  resume = (selected: readonly Blob[] = []): Promise<void> => {
    let captured: Blob[];
    try {
      captured = Array.from(selected, file => {
        if (!(file instanceof Blob) || !file.size || file.size > 25 * 1024 * 1024) throw new Error("images_invalid");
        return file.slice(0, file.size, file.type);
      });
      if (captured.length > 10) throw new Error("images_invalid");
    } catch { this.change({message: "checkImages"}); return Promise.resolve(); }
    return this.run(async () => {
      let j = this.journal();
      let result = await this.readResult(await this.deps.request("status", this.scope(j), this.abort.signal), j);
      if (result.state === "not_found") {
        // Same immutable request; cancelled intents have durable tombstones and
        // cannot be resurrected by this explicit reconciliation path.
        result = await this.readResult(await this.deps.request("prepare", j.command, this.abort.signal), j);
      }
      if (result.state !== "prepared") return;
      j = this.journal();
      const waiting = result.slots.filter(slot => !j.dispatched.includes(slot.slot_id));
      for (const bytes of waiting.length ? captured : []) {
        const hash = await this.deps.digest(bytes); this.check();
        for (const slot of waiting) {
          const proof = j.preparation.find(p => p.clientFileId === slot.client_file_id)!;
          if (proof.originalBytes !== bytes.size || proof.originalSha256 !== hash) continue;
          this.files.set(slot.client_file_id, await restorePublicationFile(bytes, proof, this.deps,
            {signal: this.abort.signal, checkContext: this.check}, hash)); this.check();
        }
      }
      await this.complete(j, result);
    }, true);
  };
  private async complete(j: HorsePublicationJournal, result: HorsePublicationResult) {
    for (const slot of result.slots) {
      this.change({message: "checkingPhoto", currentImage: slot.ordinal + 1});
      await completePublicationImage({actor: this.deps.actor, attemptId: result.attempt_id!, requestKey: j.requestKey,
        slot, uploadOrigin: this.uploadOrigin, signal: this.abort.signal}, {
        readJournal: () => this.journal(), writeJournal: value => {
          const latest = this.journal(); if (latest.requestKey !== value.requestKey) throw new Error("context_changed");
          this.deps.writeJournal({...latest, dispatched: value.dispatched});
        }, readBytes: () => this.files.get(slot.client_file_id), request: this.deps.request, putPart: this.deps.putPart,
        checkContext: this.check, onUpload: () => this.change({message: "uploadingPhoto"}),
      }); this.check();
    }
    this.change({message: "confirming", currentImage: null});
    await this.readResult(await this.deps.request("publish", this.scope(this.journal()), this.abort.signal), this.journal());
  }
  cancel = (): Promise<void> => this.run(async () => {
    const j = this.journal();
    const result = await this.readResult(await this.deps.request("cancel", this.scope(j), this.abort.signal), j);
    if (!["cancelled", "published"].includes(result.state)) throw new Error("outcome_unknown");
  });
  /** The owner editor acknowledges the verified snapshot only after its form
   * and revision are ready together (or it has preserved an unrelated draft).
   * Published is emitted before run() releases its lock, so await that operation
   * instead of dropping this handoff like a manual reset during busy work. */
  finishEdit = async (confirmed: OwnerHorseOfferEditSnapshot, preserveDraft = false): Promise<void> => {
    const expected = this.terminal, intent = this.view.intent, result = this.view.result;
    if (!this.deps.offerId || !expected || !intent || !result || this.view.phase !== "published"
      || this.view.confirmed !== confirmed || result.state !== "published") return;
    if (this.operation) await this.operation;
    if (this.abort.signal.aborted || this.terminal !== expected || this.view.phase !== "published"
      || this.view.confirmed !== confirmed || this.view.intent !== intent || this.view.result !== result) return;
    const message = preserveDraft ? "savedElsewhere" : this.view.message;
    return this.run(async () => {
      // Only this exact terminal intent can be retired. A later tab's request
      // must remain available for reconciliation, even if it targets this horse.
      if (this.terminal !== expected || this.view.confirmed !== confirmed
        || this.view.intent !== intent || this.view.result !== result) throw new Error("context_changed");
      if (this.deps.readJournal() !== null) {
        const journal = this.journal();
        if (journal.requestKey !== expected || journal.attemptId !== result.attempt_id
          || JSON.stringify(journal.command) !== JSON.stringify(intent)) throw new Error("context_changed");
        this.deps.clearJournal();
      }
      this.files.clear(); this.terminal = null;
      this.change({...initial(), message});
    });
  };
  reset = (onReset?: (key: string) => void): Promise<void> => {
    if (this.operation || !this.terminal || !["published", "closed"].includes(this.view.phase)) return Promise.resolve();
    const expected = this.terminal;
    return this.run(async () => {
      const j = this.journal(); if (j.requestKey !== expected) throw new Error("context_changed");
      this.deps.clearJournal(); this.files.clear(); this.terminal = null; onReset?.(expected); this.change(initial());
    });
  };
}
