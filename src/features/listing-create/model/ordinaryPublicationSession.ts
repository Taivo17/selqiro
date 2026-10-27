import type { ListingCreationInput } from "../../../entities/listing/model/listingCreationInput";
import { PRIVATE_UPLOAD, isUploadUuid, uploadRecord } from "../../../entities/listing/model/privatePublicationUpload";
import { publicationJourney, publicationSnapshot, type PublicationActor, type PublicationSnapshot } from "../../../entities/listing/model/publicationJourney";
import { receipt, type FinalReceipt } from "../../../server/listing-publication/final/finalContract";
import { bindPrepareListingPublicationCommand } from "../../../server/listing-publication/attempts/prepareInput";

export type PublicationView = Readonly<{
  phase: "editing" | "busy" | "resume" | "needs_files" | "unknown" | "needs_attention" | "published" | "closed";
  message: string; snapshot: PublicationSnapshot | null; receipt: FinalReceipt | null;
}>;
export type JourneyJournal = {version: 1; requestKey: string; dispatched: string[]};
export type PublicationSessionDeps = {
  actor: PublicationActor; projectOrigin: string;
  /** Trusted application configuration, never an origin learned from an upload response. */
  storageOrigin?: string;
  readJournal: () => JourneyJournal | null; writeJournal: (journal: JourneyJournal) => void; clearJournal: () => void;
  withLock: <T>(work: () => Promise<T>) => Promise<T>;
  request: (action: string, body: object, signal: AbortSignal) => Promise<unknown>;
  putPart: (url: string, headers: Record<string, string>, bytes: Blob, signal: AbortSignal) => Promise<void>;
  uuid: () => string; digest: (bytes: Blob) => Promise<string>;
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
  private files = new Map<string, Blob>();
  private listener: (view: PublicationView) => void = () => {};
  private readonly deps: PublicationSessionDeps;
  private readonly uploadOrigin: string;
  view: PublicationView = initial();
  constructor(deps: PublicationSessionDeps) {
    const uploadOrigin = deps.storageOrigin === undefined ? deps.projectOrigin : deps.storageOrigin;
    const project = /^https:\/\/([a-z]{20})\.supabase\.co$/.exec(deps.projectOrigin);
    if (uploadOrigin !== deps.projectOrigin
        && (!project || uploadOrigin !== `https://${project[1]}.storage.supabase.co`)) throw new Error("configuration");
    this.uploadOrigin = uploadOrigin;
    this.deps = {...deps, actor: Object.freeze({...deps.actor})};
  }
  subscribe(fn: (view: PublicationView) => void) { this.listener = fn; fn(this.view); return () => { this.listener = () => {}; }; }
  invalidate() { this.generation++; this.abort.abort(); this.listener = () => {}; this.files.clear(); }
  private change(patch: Partial<PublicationView>) { this.view = Object.freeze({...this.view, ...patch}); this.listener(this.view); }
  private checkGeneration(g: number) { if (g !== this.generation || this.abort.signal.aborted) throw new Error("context_changed"); }
  private args(j: JourneyJournal) { return {expectedUserId: this.deps.actor.userId, expectedIdentityId: this.deps.actor.identityId, requestKey: j.requestKey}; }
  private journal(): JourneyJournal {
    const j = this.deps.readJournal(); if (!j || j.version !== 1 || !isUploadUuid(j.requestKey)
      || !Array.isArray(j.dispatched) || j.dispatched.length > 10 || !j.dispatched.every(isUploadUuid)
      || new Set(j.dispatched).size !== j.dispatched.length) throw new Error("journal_missing"); return j;
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
      ? {phase: "resume", message: "Ettevalmistus ei õnnestunud. Salvestatud katse on alles; kontrolli jätkamiseks valitud pilte."}
      : {phase: "editing", message: "Kontrolli kuulutuse andmeid ja piltide mahtu ning proovi uuesti."});
    return Promise.resolve();
  }
  private run(work: (g: number) => Promise<void>): Promise<void> {
    if (this.operation) return this.operation;
    const g = this.generation;
    const operation = this.deps.withLock(async () => {
      this.checkGeneration(g);
      this.change({phase: "busy", message: "Kontrollin avaldamise seisu…"});
      try { await work(g); }
      catch (error) {
        if (g !== this.generation || this.abort.signal.aborted) return;
        const code = error instanceof Error ? error.message : "outcome_unknown";
        if (!this.hasIntent()) {
          this.files.clear();
          this.change({phase: "editing", message: "Ettevalmistus ei õnnestunud. Kontrolli andmeid ja brauseri salvestusruumi ning proovi uuesti."});
          return;
        }
        this.change({phase: code === "files_required" ? "needs_files" : ["needs_attention", "image_rejected", "image_processor_unavailable"].includes(code) ? "needs_attention" : "unknown",
          message: code === "files_required" ? "Vali samad algsed pildid, et jätkata. Juba saadetud pilte uuesti ei saadeta."
            : code === "image_rejected" ? "Üks valitud piltidest ei sobi avaldamiseks. Katkesta see katse ja vali uueks avaldamiseks sobivad JPEG-, PNG- või WebP-pildid."
            : code === "image_processor_unavailable" ? "Pildi töötlemist ei saanud lõpetada. Katkesta see katse; seejärel saad alustada uut avaldamist."
            : code === "needs_attention" ? "Pildi lõpetamine vajab kontrolli. Avaldamine on ootel; saad katse katkestada."
            : "Tulemus pole veel kindel. Kontrolli ja jätka sama katsega või katkesta see."});
      }
    }).catch(() => { if (g === this.generation) this.change({phase: this.hasIntent() ? "unknown" : "editing", message: "Sama avaldamine on teises aknas töös või brauser ei saanud taastamise võtmeid lukustada."}); });
    this.operation = operation.finally(() => { this.operation = null; }); return this.operation;
  }
  private async status(g: number, j: JourneyJournal) {
    const value = await this.deps.request("status", this.args(j), this.abort.signal); this.checkGeneration(g);
    const result = publicationJourney(value, this.deps.actor, j.requestKey);
    this.change({snapshot: result.snapshot, receipt: result.receipt});
    if (result.receipt) { this.change({phase: result.receipt.state === "published" ? "published" : "closed",
      message: result.receipt.state === "published" ? "Kuulutus on avaldatud." : "Kuulutuse sisu on eemaldatud."}); return null; }
    if (result.intentClosed || result.snapshot && result.snapshot.state !== "open") {
      this.change({phase: "closed", message: "Avaldamiskatse on suletud. Piltide koristamise tulemus jääb serveris alles."}); return null;
    }
    if (!result.snapshot) throw new Error("outcome_unknown"); return result.snapshot;
  }
  inspect(): Promise<void> {
    if (!this.deps.readJournal()) { this.change(initial()); return Promise.resolve(); }
    return this.run(async g => { const snapshot = await this.status(g, this.journal());
      if (snapshot) this.change({phase: "resume", message: "Leidsin poolelioleva avaldamise. Jätkamisel kasutatakse all näidatud salvestatud andmeid."}); });
  }
  start(listing: ListingCreationInput, selected: readonly Blob[]): Promise<void> {
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
        if (s) this.change({phase: "resume", message: "Selle identiteedi avaldamine on juba pooleli."}); return; }
      const images = [];
      for (const bytes of captured) {
        this.change({message: "Valmistan pilte saatmiseks ette…"});
        const id = this.deps.uuid(), sha256 = await this.deps.digest(bytes); this.checkGeneration(g);
        this.files.set(id, bytes); images.push({client_file_id: id, byte_length: bytes.size, sha256});
      }
      const bound = bindPrepareListingPublicationCommand({...this.args(j), listing: capturedListing, images});
      this.deps.writeJournal(j); // Persist BEFORE first prepare; no content, filenames or capability URLs.
      this.remoteIntent = true;
      const value = await this.deps.request("prepare", {...this.args(j), listing: bound.p_input, images: bound.p_images}, this.abort.signal);
      this.checkGeneration(g);
      const s = publicationSnapshot(value, this.deps.actor, j.requestKey); this.change({snapshot: s});
      await this.complete(g, j, s);
    });
  }
  resume(selected: readonly Blob[]): Promise<void> {
    if (this.operation) return this.operation;
    let captured: Blob[];
    try { captured = this.captureFiles(selected); } catch { return this.captureFailed(); }
    return this.run(async g => {
      const j = this.journal(), s = await this.status(g, j); if (!s) return;
      for (const bytes of captured) {
        const hash = await this.deps.digest(bytes); this.checkGeneration(g);
        for (const slot of s.slots) if (slot.expected_bytes === bytes.size && slot.expected_sha256 === hash) this.files.set(slot.client_file_id, bytes);
      }
      await this.complete(g, j, s);
    });
  }
  private async complete(g: number, journal: JourneyJournal, s: PublicationSnapshot) {
    if (s.state !== "open" || !s.payload) { await this.status(g, journal); return; }
    for (const slot of s.slots) {
      const cmd = {...this.args(journal), attemptId: s.attempt_id, slotId: slot.slot_id, requestKey: slot.client_file_id};
      this.change({message: `Kontrollin pilti ${slot.ordinal + 1}/${s.slots.length}…`});
      const dispatched = this.journal().dispatched.includes(slot.slot_id);
      let result = uploadRecord(await this.deps.request(dispatched ? "image-verify" : "image-prepare", cmd, this.abort.signal));
      this.checkGeneration(g);
      if (result.kind === "part" && !dispatched) {
        const bytes = this.files.get(slot.client_file_id); if (!bytes) throw new Error("files_required");
        const u = uploadRecord(result.upload, ["url", "headers", "expiresAt", "expectedBytes", "sha256"]);
        const url = new URL(String(u.url));
        if (url.origin !== this.uploadOrigin || url.username || url.password || url.hash
            || !["/storage/v1/s3", "/s3"].some(prefix => url.pathname === `${prefix}/listing-publication-private/v1/${s.attempt_id}/${slot.slot_id}/source.upload`)
            || url.searchParams.get("partNumber") !== "1" || url.searchParams.getAll("partNumber").length !== 1
            || !url.searchParams.get("uploadId") || url.searchParams.getAll("uploadId").length !== 1
            || result.attemptId !== s.attempt_id || result.slotId !== slot.slot_id
            || u.expectedBytes !== slot.expected_bytes || u.sha256 !== slot.expected_sha256
            || !Number.isSafeInteger(u.expiresAt) || Number(u.expiresAt) <= Date.now()) throw new Error("response");
        const headers = uploadRecord(u.headers, ["content-type"]);
        if (headers["content-type"] !== "application/octet-stream") throw new Error("response");
        const latest = this.journal(); if (latest.requestKey !== journal.requestKey || latest.dispatched.includes(slot.slot_id)) throw new Error("context_changed");
        this.deps.writeJournal({...latest, dispatched: [...latest.dispatched, slot.slot_id]});
        this.checkGeneration(g);
        this.change({message: `Saadan pilti ${slot.ordinal + 1}/${s.slots.length}…`});
        await this.deps.putPart(url.href, {"content-type": "application/octet-stream"}, bytes, this.abort.signal);
        this.checkGeneration(g);
        result = uploadRecord(await this.deps.request("image-verify", cmd, this.abort.signal)); this.checkGeneration(g);
      }
      if (result.kind !== "ready") throw new Error(result.kind === "needs_attention"
        ? ["image_rejected", "image_processor_unavailable"].includes(String(result.reason)) ? String(result.reason) : "needs_attention"
        : "outcome_unknown");
      const r = uploadRecord(result.receipt);
      if (r.schema_version !== 1 || r.attempt_id !== s.attempt_id || r.slot_id !== slot.slot_id
        || !isUploadUuid(r.receipt_id) || !isUploadUuid(r.job_id) || r.pipeline_version !== "listing-web-v1") throw new Error("response");
    }
    this.change({message: "Kinnitan avaldamist…"});
    const result = await this.deps.request("publish", {...this.args(journal), attemptId: s.attempt_id, expectedPrice: s.payload.price}, this.abort.signal);
    this.checkGeneration(g);
    const r = receipt(result, {identityId: this.deps.actor.identityId, userId: this.deps.actor.userId, attemptId: s.attempt_id, requestKey: journal.requestKey}, Object.hasOwn(uploadRecord(result), "replayed"));
    this.change({receipt: r, phase: r.state === "published" ? "published" : "closed", message: r.state === "published" ? "Kuulutus on avaldatud." : "Kuulutuse sisu on eemaldatud."});
  }
  cancel(): Promise<void> {
    return this.run(async g => {
      const j = this.journal();
      const value = await this.deps.request("cancel", this.args(j), this.abort.signal); this.checkGeneration(g);
      const result = publicationJourney(value, this.deps.actor, j.requestKey);
      if (!result.intentClosed) throw new Error("outcome_unknown");
      this.change({phase: "closed", snapshot: result.snapshot, receipt: result.receipt,
        message: "Avaldamiskatse on suletud. Piltide lõppkoristus jätkub eraldi kontrolliga."});
    });
  }
  reset() {
    if (this.operation || !["published", "closed"].includes(this.view.phase)) return;
    this.deps.clearJournal(); this.files.clear(); this.remoteIntent = false; this.change(initial());
  }
}
