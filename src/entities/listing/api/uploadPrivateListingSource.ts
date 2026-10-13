import { PRIVATE_UPLOAD, copyUploadCommand, copyPrivateUploadGrant, privateUploadUrl, publicationStorageOrigin,
  uploadRecord, uploadFail, uploadSha256, type UploadCommand } from "../model/privatePublicationUpload";
import { privateUploadHttp, type UploadFetch } from "./privateUploadHttp";
export type SourceUploadResult = Readonly<{
  kind: "upload_acknowledged_needs_verification"; attemptId: string; slotId: string; objectId: string;
}>;
/** Exactly one direct private Storage PUT. No API upload proxy, image-row creation,
 * automatic retry, deletion, ready state or publication. Caller guards auth generations. */
export async function uploadPrivateListingSource(args: {
  command: UploadCommand; grant: unknown; file: Blob; projectOrigin: string;
  isCurrentContext: () => boolean; signal?: AbortSignal;
}, fetcher: UploadFetch = fetch): Promise<SourceUploadResult> {
  const command = copyUploadCommand(args.command);
  const origin = publicationStorageOrigin(args.projectOrigin);
  const current = args.isCurrentContext, signal = args.signal;
  function guard(): void {
    if (signal?.aborted) uploadFail("aborted");
    if (current() !== true) uploadFail("context_changed");
  }
  guard();
  const grant = copyPrivateUploadGrant(args.grant, command, Date.now());
  if (!(args.file instanceof Blob) || args.file.size !== grant.expected_bytes ||
      args.file.size > PRIVATE_UPLOAD.maxSourceBytes) return uploadFail("file_mismatch");
  // A Blob is immutable; take an owned byte copy and compare the declared digest.
  const body = new Uint8Array(new Uint8Array(await args.file.arrayBuffer())); guard();
  if (body.byteLength !== grant.expected_bytes) return uploadFail("file_mismatch");
  if (await uploadSha256(body) !== grant.expected_sha256) return uploadFail("file_mismatch");
  guard(); copyPrivateUploadGrant(grant, command, Date.now());
  const result = await privateUploadHttp(fetcher, privateUploadUrl(origin, grant), {
    method: "PUT", headers: { "content-type": "application/octet-stream", "cache-control": "no-store", "x-upsert": "false" },
    body,
  }, { signal, timeoutMs: PRIVATE_UPLOAD.uploadTimeoutMs });
  guard();
  // Even AssetAlreadyExists can be a lost previous acknowledgement. Reconcile SAME
  // slot; do not delete the object, create another attempt, or replace its bytes.
  if (result.status !== 200 && result.status !== 201) return uploadFail("outcome_unknown");
  const response = uploadRecord(result.json);
  if (response.Key !== grant.bucket_id + "/" + grant.object_path) return uploadFail("outcome_unknown");
  return Object.freeze({ kind: "upload_acknowledged_needs_verification", attemptId: command.attemptId,
    slotId: command.slotId, objectId: grant.object_id });
}
