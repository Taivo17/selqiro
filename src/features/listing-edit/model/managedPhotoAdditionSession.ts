import {completePublicationImage, publicationImageUploadOrigin} from "../../../entities/listing/api/completePublicationImage";
import {bindManagedListingImagesKey, bindManagedListingImagesSnapshot, confirmManagedListingImagesReadback,
  MANAGED_LISTING_IMAGE_LIMIT, type ManagedListingImagesKey, type ManagedListingImagesSnapshot} from "../../../entities/listing/model/managedListingImages";
import {appendPhotoAdditionArguments, bindPhotoAdditionJournal, parsePhotoAdditionResult, photoAdditionArguments,
  preparePhotoAdditionArguments, type PhotoAdditionJournal, type PhotoAdditionResult} from "../../../entities/listing/model/managedListingPhotoAddition";
import {PRIVATE_UPLOAD} from "../../../entities/listing/model/privatePublicationUpload";
import {publicationCapacityReason, type PublicationCapacityReason} from "../../../entities/listing/model/publicationCapacity";
import {measurePhotoTask} from "../../../entities/listing/model/photoPerformance";
import {preparePublicationFile, preparedImageDescriptor, restorePublicationFile,
  type PrepareListingPhoto} from "../../../entities/listing/model/publicationFilePreparation";

export type PhotoAdditionView = Readonly<{
  phase: "idle" | "busy" | "resume" | "needs_file" | "unknown" | "needs_attention" | "added" | "closed";
  message: string;
}>;
export type PhotoAdditionOperation = Readonly<{
  signal: AbortSignal; checkContext: () => void; showGallery: (gallery: ManagedListingImagesSnapshot) => void;
  preloadImage?: (source: string) => void;
}>;
export type RunPhotoAddition = <T>(key: ManagedListingImagesKey,
  work: (operation: PhotoAdditionOperation) => Promise<T>) => Promise<T>;
export type PhotoAdditionSessionDeps = {
  key: ManagedListingImagesKey; projectOrigin: string; storageOrigin?: string;
  readJournal: () => unknown; writeJournal: (journal: PhotoAdditionJournal) => void; clearJournal: () => void;
  runOwnerOperation: RunPhotoAddition; withLock: <T>(work: () => Promise<T>) => Promise<T>;
  request: (action: string, args: object, signal: AbortSignal) => Promise<unknown>;
  readGallery: (key: ManagedListingImagesKey, signal: AbortSignal) => Promise<ManagedListingImagesSnapshot>;
  putPart: (url: string, headers: Record<string, string>, bytes: Blob, signal: AbortSignal) => Promise<void>;
  uuid: () => string; digest: (bytes: Blob) => Promise<string>; preparePhoto?: PrepareListingPhoto;
};
const capacityMessages: Readonly<Record<PublicationCapacityReason, string>> = {
  open_attempts: "additionCapacityActive",
  daily_attempts: "additionCapacityDaily",
  retained_capacity: "additionCapacityStorage",
};
const initial = (): PhotoAdditionView => ({phase: "idle", message: ""});
/** One addition, using the same image transfer as new listings. The journal and
 * exact request survive uncertain responses; no automatic second PUT or append. */
export class ManagedPhotoAdditionSession {
  private readonly key: ManagedListingImagesKey;
  private readonly uploadOrigin: string;
  private generation = 0;
  private abort = new AbortController();
  private operation: Promise<void> | null = null;
  private file: {clientId: string; bytes: Blob} | undefined;
  private remoteIntent = false;
  private terminalRequest: string | null = null;
  private listener: (view: PhotoAdditionView) => void = () => {};
  view: PhotoAdditionView = initial();
  constructor(private readonly deps: PhotoAdditionSessionDeps) {
    this.key = bindManagedListingImagesKey(deps.key);
    this.uploadOrigin = publicationImageUploadOrigin(deps.projectOrigin, deps.storageOrigin);
  }
  subscribe(listener: (view: PhotoAdditionView) => void) {
    this.listener = listener; listener(this.view); return () => { this.listener = () => {}; };
  }
  invalidate() { ++this.generation; this.abort.abort(); this.file = undefined; this.listener = () => {}; }
  private change(view: PhotoAdditionView) { this.view = Object.freeze(view); this.listener(this.view); }
  private journal(): PhotoAdditionJournal { return bindPhotoAdditionJournal(this.deps.readJournal(), this.key); }
  private hasIntent() { try { return this.remoteIntent || this.deps.readJournal() !== null; } catch { return true; } }
  private capture(file: Blob): Blob {
    if (!(file instanceof Blob) || file.size < 1 || file.size > PRIVATE_UPLOAD.maxSourceBytes) throw new Error("invalid_file");
    return file.slice(0, file.size, "application/octet-stream");
  }
  private run(work: (context: PhotoAdditionOperation) => Promise<void>, measureTotal = false): Promise<void> {
    if (this.operation) return this.operation;
    const generation = this.generation;
    const operation = this.deps.runOwnerOperation(this.key, owner => this.deps.withLock(async () => {
      const abort = () => this.abort.abort();
      owner.signal.addEventListener("abort", abort, {once: true});
      if (owner.signal.aborted) abort();
      const context: PhotoAdditionOperation = {...owner, signal: this.abort.signal, checkContext: () => {
        owner.checkContext(); if (this.generation !== generation || this.abort.signal.aborted) throw new Error("context_changed");
      }};
      try {
        context.checkContext(); this.change({phase: "busy", message: "checkingAddition"});
        await (measureTotal ? measurePhotoTask("total", () => work(context)) : work(context));
      }
      catch (error) {
        if (this.generation !== generation || owner.signal.aborted) return;
        const reason = error instanceof Error ? error.message : (error as {code?: string})?.code;
        const capacityReason = publicationCapacityReason(error);
        const phase = !this.hasIntent() ? "idle" : capacityReason ? "needs_attention" : reason === "files_required" ? "needs_file" : reason === "40001" ? "resume"
          : ["image_rejected", "image_processor_unavailable", "needs_attention", "image_limit", "photo_preparation_changed"].includes(reason ?? "") ? "needs_attention" : "unknown";
        const message = capacityReason ? capacityMessages[capacityReason]
          : reason === "files_required" ? "resumeSamePhoto"
          : reason === "photo_preparation_changed" ? "photoPreparationChanged"
          : reason === "image_rejected" ? "photoNotSuitable"
          : reason === "image_limit" ? "photoAdditionFull"
          : reason === "40001" ? "photoAdditionConflict"
          : phase === "idle" ? "photoPrepareFailed"
          : phase === "needs_attention" ? "photoProcessingFailed"
          : "photoAdditionUnconfirmed";
        this.change({phase, message});
      } finally { owner.signal.removeEventListener("abort", abort); }
    })).catch(() => {
      if (this.generation === generation) this.change({phase: this.hasIntent() ? "unknown" : "idle",
        message: "photoAdditionContextChanged"});
    });
    this.operation = operation.finally(() => { this.operation = null; }); return this.operation;
  }
  private async request(action: string, args: object, context: PhotoAdditionOperation) {
    context.checkContext();
    const value = await this.deps.request(action, args, context.signal); context.checkContext(); return value;
  }
  private async status(context: PhotoAdditionOperation, journal: PhotoAdditionJournal) {
    return parsePhotoAdditionResult(await this.request("owner-images-add-status",
      photoAdditionArguments(this.key, journal.requestKey), context), journal);
  }
  private async accept(result: PhotoAdditionResult, journal: PhotoAdditionJournal, context: PhotoAdditionOperation): Promise<boolean> {
    if (result.receipt && result.acknowledged) {
      let displayed = result.gallery;
      if (result.gallery) {
        // The parsed receipt names one committed WEB image. Its protected read
        // may overlap gallery readback, but cannot make the image a visible
        // gallery member or establish success before that readback completes.
        if (result.gallery.images.some(image => image.url === result.receipt!.url)) {
          context.checkContext(); context.preloadImage?.(result.receipt.url);
        }
        const fresh = confirmManagedListingImagesReadback(result.acknowledged,
          await this.deps.readGallery(this.key, context.signal));
        context.checkContext(); context.showGallery(fresh); displayed = fresh;
      }
      context.checkContext(); this.file = undefined; this.terminalRequest = journal.requestKey;
      this.change({phase: "added", message: displayed
        ? displayed.images.some(image => image.url === result.receipt!.url) ? "photoAdded"
          : "photoAddedGalleryChanged"
        : "photoAddedListingRemoved"});
      return true;
    }
    if (result.intentClosed || result.snapshot && result.snapshot.state !== "open") {
      this.file = undefined; this.terminalRequest = journal.requestKey;
      this.change({phase: "closed", message: "photoAdditionCancelled"}); return true;
    }
    if (result.gallery) { context.checkContext(); context.showGallery(result.gallery); }
    return false;
  }
  inspect(): Promise<void> {
    try { if (this.deps.readJournal() === null) { this.change(initial()); return Promise.resolve(); } }
    catch { this.change({phase: "unknown", message: "pendingAdditionReadFailed"}); return Promise.resolve(); }
    return this.run(async context => {
      const journal = this.journal(), result = await this.status(context, journal);
      if (await this.accept(result, journal, context)) return;
      if (!result.snapshot) throw new Error("outcome_unknown");
      this.change({phase: "resume", message: "photoAdditionPending"});
    });
  }
  start(baseline: ManagedListingImagesSnapshot, selected: Blob): Promise<void> {
    if (this.operation) return this.operation;
    let captured: Blob, bound: ManagedListingImagesSnapshot;
    let requestKey: string, clientId: string;
    try {
      requestKey = this.deps.uuid(); clientId = this.deps.uuid();
      captured = this.capture(selected); bound = bindManagedListingImagesSnapshot(baseline);
      if (bound.images.length >= MANAGED_LISTING_IMAGE_LIMIT) throw new Error("image_limit");
    } catch { this.change({phase: this.hasIntent() ? "unknown" : "idle", message: "photoAdditionInputInvalid"}); return Promise.resolve(); }
    return this.run(async context => {
      if (this.deps.readJournal() !== null) {
        const existing = this.journal(), result = await this.status(context, existing);
        if (!await this.accept(result, existing, context)) this.change({phase: "resume", message: "photoAdditionAlreadyPending"});
        return;
      }
      this.change({phase: "busy", message: "preparingPhoto"});
      const prepared = await preparePublicationFile(captured, clientId, this.deps, context); context.checkContext();
      const journal = bindPhotoAdditionJournal({version: 1, requestKey, dispatched: [], baseline: bound,
        image: preparedImageDescriptor(prepared.preparation), preparation: [prepared.preparation], readyId: null}, this.key);
      this.deps.writeJournal(journal); this.remoteIntent = true; this.file = {clientId: journal.image.client_file_id, bytes: prepared.bytes};
      const result = parsePhotoAdditionResult(await this.request("owner-images-add-prepare", preparePhotoAdditionArguments(journal), context), journal);
      await this.complete(result, journal, context);
    }, true);
  }
  resume(selected?: Blob): Promise<void> {
    if (this.operation) return this.operation;
    let captured: Blob | undefined;
    try { if (selected) captured = this.capture(selected); }
    catch { this.change({phase: "needs_file", message: "chooseSameOriginalLimit"}); return Promise.resolve(); }
    return this.run(async context => {
      let journal = this.journal(), result = await this.status(context, journal);
      if (await this.accept(result, journal, context)) return;
      if (!result.snapshot) {
        // An explicit resume may recover a prepare whose response or dispatch
        // was lost. Reuse the exact request and image, never invent a new intent.
        if (journal.dispatched.length || journal.readyId || !result.gallery) throw new Error("outcome_unknown");
        if (result.gallery.images.length >= MANAGED_LISTING_IMAGE_LIMIT) throw new Error("image_limit");
        journal = bindPhotoAdditionJournal({...journal, baseline: result.gallery}, this.key);
        this.deps.writeJournal(journal);
        result = parsePhotoAdditionResult(await this.request("owner-images-add-prepare", preparePhotoAdditionArguments(journal), context), journal);
        if (await this.accept(result, journal, context)) return;
      }
      if (captured && !journal.dispatched.length) {
        let bytes = captured;
        if (journal.preparation) bytes = await restorePublicationFile(captured, journal.preparation[0], this.deps, context);
        else {
          const hash = await this.deps.digest(captured); context.checkContext();
          if (captured.size !== journal.image.byte_length || hash !== journal.image.sha256) throw new Error("files_required");
        }
        context.checkContext(); this.file = {clientId: journal.image.client_file_id, bytes};
      }
      await this.complete(result, journal, context);
    }, true);
  }
  private async complete(result: PhotoAdditionResult, journal: PhotoAdditionJournal, context: PhotoAdditionOperation) {
    if (await this.accept(result, journal, context)) return;
    if (!result.snapshot || result.snapshot.state !== "open") throw new Error("outcome_unknown");
    const snapshot = result.snapshot;
    const ready = await completePublicationImage({actor: this.key, attemptId: snapshot.attemptId, requestKey: journal.requestKey,
      slot: snapshot.slot, uploadOrigin: this.uploadOrigin, signal: context.signal}, {
      readJournal: () => this.journal(), writeJournal: value => {
        const latest = this.journal(); if (latest.requestKey !== value.requestKey) throw new Error("context_changed");
        this.deps.writeJournal({...latest, dispatched: value.dispatched});
      }, readBytes: () => this.file?.clientId === snapshot.slot.client_file_id ? this.file.bytes : undefined, request: (action, args) => this.request(action, args, context),
      putPart: (url, headers, bytes, signal) => this.deps.putPart(url, headers, bytes, signal),
      checkContext: context.checkContext,
      onUpload: () => this.change({phase: "busy", message: "uploadingVerifyingPhoto"}),
    });
    context.checkContext();
    let latest = this.journal();
    if (latest.requestKey !== journal.requestKey) throw new Error("context_changed");
    this.deps.writeJournal({...latest, readyId: ready.receiptId}); latest = this.journal();
    // Add against the latest authorized membership; concurrent changes between
    // this read and append get a conflict instead of overwriting another photo.
    const checked = await this.status(context, latest);
    if (await this.accept(checked, latest, context)) return;
    if (!checked.snapshot || !checked.gallery) throw new Error("outcome_unknown");
    if (checked.gallery.images.length >= MANAGED_LISTING_IMAGE_LIMIT) throw new Error("image_limit");
    latest = bindPhotoAdditionJournal({...latest, baseline: checked.gallery}, this.key);
    this.deps.writeJournal(latest); context.checkContext();
    this.change({phase: "busy", message: "appendingPhoto"});
    const attached = parsePhotoAdditionResult(await this.request("owner-images-add-append",
      appendPhotoAdditionArguments(latest, checked.snapshot), context), latest);
    if (!await this.accept(attached, latest, context)) throw new Error("outcome_unknown");
  }
  cancel(): Promise<void> {
    return this.run(async context => {
      const journal = this.journal();
      const result = parsePhotoAdditionResult(await this.request("owner-images-add-cancel",
        photoAdditionArguments(this.key, journal.requestKey), context), journal);
      if (!await this.accept(result, journal, context)) throw new Error("outcome_unknown");
    });
  }
  reset(): Promise<void> {
    if (this.operation || !this.terminalRequest || !["added", "closed"].includes(this.view.phase)) return Promise.resolve();
    return this.run(async context => {
      const current = this.deps.readJournal();
      if (current !== null && this.journal().requestKey !== this.terminalRequest) {
        const newer = this.journal(), result = await this.status(context, newer);
        if (!await this.accept(result, newer, context)) this.change({phase: "resume", message: "nextAdditionPending"});
        return;
      }
      context.checkContext(); this.deps.clearJournal(); this.file = undefined; this.remoteIntent = false; this.terminalRequest = null;
      this.change(initial());
    });
  }
}
