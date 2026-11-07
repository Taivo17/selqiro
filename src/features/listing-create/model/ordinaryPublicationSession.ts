import { completePublicationImage, publicationImageUploadOrigin, type PublicationImageJournal } from "../../../entities/listing/api/completePublicationImage";
import type { ListingCreationInput } from "../../../entities/listing/model/listingCreationInput";
import { PRIVATE_UPLOAD, isUploadUuid, uploadRecord } from "../../../entities/listing/model/privatePublicationUpload";
import { publicationJourney, publicationSnapshot, type PublicationActor, type PublicationSnapshot } from "../../../entities/listing/model/publicationJourney";
import { receipt, type FinalReceipt } from "../../../server/listing-publication/final/finalContract";
import { bindPrepareListingPublicationCommand } from "../../../server/listing-publication/attempts/prepareInput";
import {bindFilePreparations, preparePublicationFile, preparedImageDescriptor, preparationMatchesUpload,
  restorePublicationFile, type PrepareListingPhoto, type PublicationFilePreparation} from "../../../entities/listing/model/publicationFilePreparation";
import {measurePhotoTask} from "../../../entities/listing/model/photoPerformance";

export type PublicationView = Readonly<{
  phase: "editing" | "busy" | "resume" | "needs_files" | "unknown" | "needs_attention" | "published" | "closed";
  message: string; messageParams?: Readonly<Record<string, string | number>>; snapshot: PublicationSnapshot | null; receipt: FinalReceipt | null;
}>;
export type JourneyJournal = PublicationImageJournal & {preparation?: readonly PublicationFilePreparation[]};
export type PublicationSessionDeps = {
  actor: PublicationActor; projectOrigin: string;
  /** Trusted application configuration, never an origin learned from an upload response. */
  storageOrigin?: string;
  readJournal: () => JourneyJournal | null; writeJournal: (journal: JourneyJournal) => void; clearJournal: () => void;
  withLock: <T>(work: () => Promise<T>) => Promise<T>;
  request: (action: string, body: object, signal: AbortSignal) => Promise<unknown>;
  putPart: (url: string, headers: Record<string, string>, bytes: Blob, signal: AbortSignal) => Promise<void>;
  uuid: () => string; digest: (bytes: Blob) => Promise<string>; preparePhoto?: PrepareListingPhoto;
};
const initial = (): PublicationView => ({phase: "editing", message: "", snapshot: null, receipt: null});
/** A single ordinary-publication controller. It retains an immutable input/Blob set,
 * survives reload by an actor-scoped key, and never turns an unknown PUT into a retry.
 * The cross-tab lock protects the journal before dispatch, not server authorization. */
export class OrdinaryPublicationSession {
  private generation = 0;
  private abort = new AbortController();
  private operation: Promise<void> | null = null;
  private remoteIntent = false;
  private terminalRequestKey: string | null = null;
  private files = new Map<string, Blob>();
  private listener: (view: PublicationView) => void = () => {};
  private readonly deps: PublicationSessionDeps;
  private readonly uploadOrigin: string;
  view: PublicationView = initial();
  constructor(deps: PublicationSessionDeps) {
    this.uploadOrigin = publicationImageUploadOrigin(deps.projectOrigin, deps.storageOrigin);
    this.deps = {...deps, actor: Object.freeze({...deps.actor})};
  }
  subscribe(fn: (view: PublicationView) => void) { this.listener = fn; fn(this.view); return () => { this.listener = () => {}; }; }
  invalidate() { this.generation++; this.abort.abort(); this.listener = () => {}; this.files.clear(); }
  private change(patch: Partial<PublicationView>) { this.view = Object.freeze({...this.view, ...patch, ...(Object.hasOwn(patch, "message") ? {messageParams: patch.messageParams} : {})}); this.listener(this.view); }
  private checkGeneration(g: number) { if (g !== this.generation || this.abort.signal.aborted) throw new Error("context_changed"); }
  private args(j: JourneyJournal) { return {expectedUserId: this.deps.actor.userId, expectedIdentityId: this.deps.actor.identityId, requestKey: j.requestKey}; }
  private journal(): JourneyJournal {
    const j = this.deps.readJournal(); if (!j || j.version !== 1 || !isUploadUuid(j.requestKey)
      || !Array.isArray(j.dispatched) || j.dispatched.length > 10 || !j.dispatched.every(isUploadUuid)
      || new Set(j.dispatched).size !== j.dispatched.length) throw new Error("journal_missing");
    return Object.hasOwn(j, "preparation") ? {...j, preparation: bindFilePreparations(j.preparation)} : j;
  }
  private hasIntent(): boolean {
    if (this.remoteIntent) return true;
    try { return this.deps.readJournal() !== null; } catch { return true; }
  }
  private captureFiles(selected: readonly Blob[]): Blob[] {
    if (selected.length > 10) throw new Error("images_invalid");
    const captured = Array.from(selected, file => {
      if (!(file instanceof Blob) || file.size < 1 || file.size > PRIVATE_UPLOAD.maxSourceBytes) throw new Error("images_invalid");
      return file.slice(0, file.size, "application/octet-stream");
    });
    if (captured.reduce((n, file) => n + file.size, 0) > 100 * 1024 * 1024) throw new Error("images_invalid");
    return captured;
  }
  private captureFailed(): Promise<void> {
    if (!this.abort.signal.aborted) this.change(this.hasIntent()
      ? {phase: "resume", message: "captureFailedExisting"}
      : {phase: "editing", message: "checkDetailsImages"});
    return Promise.resolve();
  }
  private run(work: (g: number) => Promise<void>, measureTotal = false): Promise<void> {
    if (this.operation) return this.operation;
    const g = this.generation;
    const operation = this.deps.withLock(async () => {
      this.checkGeneration(g);
      this.change({phase: "busy", message: "checkingPublication"});
      try { await (measureTotal ? measurePhotoTask("total", () => work(g)) : work(g)); }
      catch (error) {
        if (g !== this.generation || this.abort.signal.aborted) return;
        const code = error instanceof Error ? error.message : "outcome_unknown";
        if (!this.hasIntent()) {
          this.files.clear();
          this.change({phase: "editing", message: "prepareFailed"});
          return;
        }
        this.change({phase: code === "files_required" ? "needs_files" : ["needs_attention", "image_rejected", "image_processor_unavailable", "photo_preparation_changed"].includes(code) ? "needs_attention" : "unknown",
          message: code === "files_required" ? "sameImagesRequired"
            : code === "photo_preparation_changed" ? "imagePreparationChanged"
            : code === "image_rejected" ? "imageRejected"
            : code === "image_processor_unavailable" ? "imageProcessorUnavailable"
            : code === "needs_attention" ? "imageNeedsAttention"
            : "outcomeUnknown"});
      }
    }).catch(() => { if (g === this.generation) this.change({phase: this.hasIntent() ? "unknown" : "editing", message: "busyElsewhere"}); });
    this.operation = operation.finally(() => { this.operation = null; }); return this.operation;
  }
  private async status(g: number, j: JourneyJournal) {
    const value = await this.deps.request("status", this.args(j), this.abort.signal); this.checkGeneration(g);
    const result = publicationJourney(value, this.deps.actor, j.requestKey);
    this.change({snapshot: result.snapshot, receipt: result.receipt});
    if (result.receipt) { this.terminalRequestKey = j.requestKey; this.change({phase: result.receipt.state === "published" ? "published" : "closed",
      message: result.receipt.state === "published" ? "published" : "listingRemoved"}); return null; }
    if (result.intentClosed || result.snapshot && result.snapshot.state !== "open") {
      this.terminalRequestKey = j.requestKey;
      this.change({phase: "closed", message: "attemptClosed"}); return null;
    }
    if (!result.snapshot) throw new Error("outcome_unknown"); return result.snapshot;
  }
  inspect(): Promise<void> {
    if (!this.deps.readJournal()) { this.change(initial()); return Promise.resolve(); }
    return this.run(async g => { const snapshot = await this.status(g, this.journal());
      if (snapshot) this.change({phase: "resume", message: "attemptFound"}); });
  }
  start(listing: ListingCreationInput, selected: readonly Blob[], onIntentCreated?: (requestKey: string) => void): Promise<void> {
    if (this.operation) return this.operation;
    // Capture at the user action boundary, before even the cross-tab lock awaits.
    // A caller may replace or mutate its form state while another tab holds it.
    let j: JourneyJournal, capturedListing: ListingCreationInput, captured: Blob[];
    try {
      j = {version: 1, requestKey: this.deps.uuid(), dispatched: []};
      capturedListing = bindPrepareListingPublicationCommand({...this.args(j), listing, images: []}).p_input;
      captured = this.captureFiles(selected);
    } catch { return this.captureFailed(); }
    return this.run(async g => {
      if (this.deps.readJournal()) { const s = await this.status(g, this.journal());
        if (s) this.change({phase: "resume", message: "identityAttemptOpen"}); return; }
      const images = [], preparation: PublicationFilePreparation[] = [];
      for (const bytes of captured) {
        this.change({message: "preparingPhotos"});
        const prepared = await preparePublicationFile(bytes, this.deps.uuid(), this.deps,
          {signal: this.abort.signal, checkContext: () => this.checkGeneration(g)}); this.checkGeneration(g);
        preparation.push(prepared.preparation);
        this.files.set(prepared.preparation.clientFileId, prepared.bytes); images.push(preparedImageDescriptor(prepared.preparation));
      }
      j = {...j, preparation};
      const bound = bindPrepareListingPublicationCommand({...this.args(j), listing: capturedListing, images});
      this.deps.writeJournal(j); // Persist BEFORE first prepare; no content, filenames or capability URLs.
      this.remoteIntent = true;
      onIntentCreated?.(j.requestKey);
      const value = await this.deps.request("prepare", {...this.args(j), listing: bound.p_input, images: bound.p_images}, this.abort.signal);
      this.checkGeneration(g);
      const s = publicationSnapshot(value, this.deps.actor, j.requestKey); this.change({snapshot: s});
      await this.complete(g, j, s);
    }, true);
  }
  resume(selected: readonly Blob[]): Promise<void> {
    if (this.operation) return this.operation;
    let captured: Blob[];
    try { captured = this.captureFiles(selected); } catch { return this.captureFailed(); }
    return this.run(async g => {
      const j = this.journal(), s = await this.status(g, j); if (!s) return;
      const waiting = s.slots.filter(slot => !j.dispatched.includes(slot.slot_id));
      for (const bytes of waiting.length ? captured : []) {
        const hash = await this.deps.digest(bytes); this.checkGeneration(g);
        for (const slot of waiting) {
          if (j.preparation) {
            const proof = j.preparation.find(item => item.clientFileId === slot.client_file_id);
            if (!proof || !preparationMatchesUpload(proof, slot.client_file_id, slot.expected_bytes, slot.expected_sha256))
              throw new Error("photo_preparation_invalid");
            if (proof.originalBytes !== bytes.size || proof.originalSha256 !== hash) continue;
            const prepared = await restorePublicationFile(bytes, proof, this.deps,
              {signal: this.abort.signal, checkContext: () => this.checkGeneration(g)}, hash);
            this.files.set(slot.client_file_id, prepared);
          } else if (slot.expected_bytes === bytes.size && slot.expected_sha256 === hash) this.files.set(slot.client_file_id, bytes);
        }
      }
      await this.complete(g, j, s);
    }, true);
  }
  private async complete(g: number, journal: JourneyJournal, s: PublicationSnapshot) {
    if (s.state !== "open" || !s.payload) { await this.status(g, journal); return; }
    if (journal.preparation && (journal.preparation.length !== s.slots.length || s.slots.some(slot =>
      !journal.preparation!.some(proof => preparationMatchesUpload(proof, slot.client_file_id, slot.expected_bytes, slot.expected_sha256)))))
      throw new Error("photo_preparation_invalid");
    for (const slot of s.slots) {
      this.change({message: "checkingImage", messageParams: {number: slot.ordinal + 1, count: s.slots.length}});
      await completePublicationImage({actor: this.deps.actor, attemptId: s.attempt_id,
        requestKey: journal.requestKey, slot, uploadOrigin: this.uploadOrigin, signal: this.abort.signal}, {
        readJournal: () => this.journal(), writeJournal: value => {
          const latest = this.journal(); if (latest.requestKey !== value.requestKey) throw new Error("context_changed");
          this.deps.writeJournal({...latest, dispatched: value.dispatched});
        },
        readBytes: () => this.files.get(slot.client_file_id),
        request: (action, body, signal) => this.deps.request(action, body, signal),
        putPart: (url, headers, bytes, signal) => this.deps.putPart(url, headers, bytes, signal),
        checkContext: () => this.checkGeneration(g),
        onUpload: () => this.change({message: "uploadingImage", messageParams: {number: slot.ordinal + 1, count: s.slots.length}}),
      });
      this.checkGeneration(g);
    }
    this.change({message: "confirmingPublication"});
    const result = await this.deps.request("publish", {...this.args(journal), attemptId: s.attempt_id, expectedPrice: s.payload.price}, this.abort.signal);
    this.checkGeneration(g);
    const r = receipt(result, {identityId: this.deps.actor.identityId, userId: this.deps.actor.userId, attemptId: s.attempt_id, requestKey: journal.requestKey}, Object.hasOwn(uploadRecord(result), "replayed"));
    this.terminalRequestKey = journal.requestKey;
    this.change({receipt: r, phase: r.state === "published" ? "published" : "closed", message: r.state === "published" ? "published" : "listingRemoved"});
  }
  cancel(): Promise<void> {
    return this.run(async g => {
      const j = this.journal();
      const value = await this.deps.request("cancel", this.args(j), this.abort.signal); this.checkGeneration(g);
      const result = publicationJourney(value, this.deps.actor, j.requestKey);
      if (!result.intentClosed) throw new Error("outcome_unknown");
      this.terminalRequestKey = j.requestKey;
      this.change({phase: "closed", snapshot: result.snapshot, receipt: result.receipt,
        message: "attemptClosedCleanup"});
    });
  }
  async reset(onReset?: (requestKey: string) => void): Promise<string | null> {
    if (this.operation || this.abort.signal.aborted || !this.terminalRequestKey
      || !["published", "closed"].includes(this.view.phase)) return null;
    const expected = this.terminalRequestKey, generation = this.generation;
    let cleared: string | null = null;
    // The same actor lock used by start/resume makes compare-and-clear atomic
    // across tabs. A newer journal belongs to a different attempt and is retained.
    const work = this.deps.withLock(async () => {
      this.checkGeneration(generation);
      const latest = this.deps.readJournal();
      if (latest) {
        const journal = this.journal();
        if (journal.requestKey !== expected) {
          const snapshot = await this.status(generation, journal);
          if (snapshot) this.change({phase: "resume", message: "anotherAttemptOpen"});
          return;
        }
        this.deps.clearJournal();
      }
      this.checkGeneration(generation);
      this.files.clear(); this.remoteIntent = false; this.terminalRequestKey = null;
      // Settle the exact cached draft in the same synchronous step as journal
      // removal, before editing reopens. A focus recheck cannot drop this notice.
      cleared = expected; onReset?.(expected); this.change(initial());
    }).catch(() => {
      if (generation === this.generation && !this.abort.signal.aborted)
        this.change({message: "nextListingFailed"});
    });
    this.operation = work.finally(() => { this.operation = null; });
    await this.operation;
    return generation === this.generation && !this.abort.signal.aborted ? cleared : null;
  }
}
