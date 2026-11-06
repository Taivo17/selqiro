import { isUploadUuid, uploadRecord } from "../model/privatePublicationUpload";
import type { PublicationActor, PublicationSlot } from "../model/publicationJourney";

export type PublicationImageReady = Readonly<{
  attemptId: string; slotId: string; receiptId: string; jobId: string;
}>;
export type PublicationImageJournal = {version: 1; requestKey: string; dispatched: string[]};
export type PublicationImageTransfer = Readonly<{
  actor: PublicationActor; attemptId: string; requestKey: string; slot: PublicationSlot;
  uploadOrigin: string; signal: AbortSignal;
}>;
export type PublicationImageTransferDeps = {
  readJournal: () => PublicationImageJournal;
  writeJournal: (journal: PublicationImageJournal) => void;
  readBytes: () => Blob | undefined;
  request: (action: string, body: object, signal: AbortSignal) => Promise<unknown>;
  putPart: (url: string, headers: Record<string, string>, bytes: Blob, signal: AbortSignal) => Promise<void>;
  checkContext: () => void;
  onUpload: () => void;
};

/** Configuration is trusted by the application, never learned from a grant. */
export function publicationImageUploadOrigin(projectOrigin: string, storageOrigin?: string): string {
  const uploadOrigin = storageOrigin === undefined ? projectOrigin : storageOrigin;
  const project = /^https:\/\/([a-z]{20})\.supabase\.co$/.exec(projectOrigin);
  if (uploadOrigin !== projectOrigin
      && (!project || uploadOrigin !== `https://${project[1]}.storage.supabase.co`)) throw new Error("configuration");
  return uploadOrigin;
}

/** Complete one captured image through the existing private multipart pipeline.
 * A dispatch is persisted before its PUT. An uncertain PUT can only be verified;
 * callers own the actor lock, request journal and lifetime of captured bytes. */
export async function completePublicationImage(input: PublicationImageTransfer, deps: PublicationImageTransferDeps): Promise<PublicationImageReady> {
  const {actor, attemptId, requestKey, slot, uploadOrigin, signal} = input;
  const cmd = {expectedUserId: actor.userId, expectedIdentityId: actor.identityId,
    attemptId, slotId: slot.slot_id, requestKey: slot.client_file_id};
  const dispatched = deps.readJournal().dispatched.includes(slot.slot_id);
  let result = uploadRecord(await deps.request(dispatched ? "image-verify" : "image-prepare", cmd, signal));
  deps.checkContext();
  if (result.kind === "part" && !dispatched) {
    const bytes = deps.readBytes(); if (!bytes) throw new Error("files_required");
    const u = uploadRecord(result.upload, ["url", "headers", "expiresAt", "expectedBytes", "sha256"]);
    const url = new URL(String(u.url));
    if (url.origin !== uploadOrigin || url.username || url.password || url.hash
        || !["/storage/v1/s3", "/s3"].some(prefix => url.pathname === `${prefix}/listing-publication-private/v1/${attemptId}/${slot.slot_id}/source.upload`)
        || url.searchParams.get("partNumber") !== "1" || url.searchParams.getAll("partNumber").length !== 1
        || !url.searchParams.get("uploadId") || url.searchParams.getAll("uploadId").length !== 1
        || result.attemptId !== attemptId || result.slotId !== slot.slot_id
        || u.expectedBytes !== slot.expected_bytes || u.sha256 !== slot.expected_sha256
        || !Number.isSafeInteger(u.expiresAt) || Number(u.expiresAt) <= Date.now()) throw new Error("response");
    const headers = uploadRecord(u.headers, ["content-type"]);
    if (headers["content-type"] !== "application/octet-stream") throw new Error("response");
    const latest = deps.readJournal(); if (latest.requestKey !== requestKey || latest.dispatched.includes(slot.slot_id)) throw new Error("context_changed");
    deps.writeJournal({...latest, dispatched: [...latest.dispatched, slot.slot_id]});
    deps.checkContext();
    deps.onUpload();
    await deps.putPart(url.href, {"content-type": "application/octet-stream"}, bytes, signal);
    deps.checkContext();
    result = uploadRecord(await deps.request("image-verify", cmd, signal)); deps.checkContext();
  }
  if (result.kind !== "ready") throw new Error(result.kind === "needs_attention"
    ? ["image_rejected", "image_processor_unavailable"].includes(String(result.reason)) ? String(result.reason) : "needs_attention"
    : "outcome_unknown");
  const r = uploadRecord(result.receipt);
  if (r.schema_version !== 1 || r.attempt_id !== attemptId || r.slot_id !== slot.slot_id
    || !isUploadUuid(r.receipt_id) || !isUploadUuid(r.job_id) || r.pipeline_version !== "listing-web-v1") throw new Error("response");
  return Object.freeze({attemptId, slotId: slot.slot_id, receiptId: r.receipt_id as string, jobId: r.job_id as string});
}
