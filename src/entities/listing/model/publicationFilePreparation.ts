import {isUploadUuid, PRIVATE_UPLOAD, uploadRecord} from "./privatePublicationUpload";
import {measurePhotoTask} from "./photoPerformance";

export const LISTING_PHOTO_RECIPE = "webp-2048-q90-v1" as const;
export type PhotoPreparationRecipe = "original-v1" | typeof LISTING_PHOTO_RECIPE;
export type PreparedListingPhoto = Readonly<{bytes: Blob; recipe: PhotoPreparationRecipe}>;
export type PrepareListingPhoto = (file: Blob, signal?: AbortSignal) => Promise<PreparedListingPhoto>;
/** Metadata only. No image bytes, filenames, URLs or account details are stored. */
export type PublicationFilePreparation = Readonly<{
  version: 1; clientFileId: string; recipe: PhotoPreparationRecipe;
  originalBytes: number; originalSha256: string; uploadBytes: number; uploadSha256: string;
}>;
export type PhotoPreparationContext = Readonly<{signal: AbortSignal; checkContext: () => void}>;
export type PhotoPreparationDeps = Readonly<{
  digest: (bytes: Blob) => Promise<string>;
  /** Browser hooks always supply the real preparer; transport unit tests can inject one. */
  preparePhoto?: PrepareListingPhoto;
}>;
const fields = ["version", "clientFileId", "recipe", "originalBytes", "originalSha256", "uploadBytes", "uploadSha256"];
const sha = (value: unknown): value is string => typeof value === "string" && value.length === 64 && /^[0-9a-f]{64}$/.test(value);
const size = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0 && Number(value) <= PRIVATE_UPLOAD.maxSourceBytes;
function invalid(): never { throw new Error("photo_preparation_invalid"); }
export function bindFilePreparation(value: unknown): PublicationFilePreparation {
  const r = uploadRecord(value, fields);
  if (r.version !== 1 || !isUploadUuid(r.clientFileId) || !["original-v1", LISTING_PHOTO_RECIPE].includes(String(r.recipe))
    || !size(r.originalBytes) || !size(r.uploadBytes) || !sha(r.originalSha256) || !sha(r.uploadSha256)
    || (r.recipe === "original-v1" ? r.originalBytes !== r.uploadBytes || r.originalSha256 !== r.uploadSha256
      : r.uploadBytes >= r.originalBytes)) return invalid();
  return Object.freeze({...r}) as PublicationFilePreparation;
}
export function bindFilePreparations(value: unknown, maxFiles = 10): readonly PublicationFilePreparation[] {
  if (!Array.isArray(value) || value.length > maxFiles || Object.keys(value).length !== value.length) return invalid();
  if (Object.keys(value).some((key, index) => key !== String(index))) return invalid();
  const entries = Array.from(value, bindFilePreparation);
  if (new Set(entries.map(entry => entry.clientFileId)).size !== entries.length) return invalid();
  return Object.freeze(entries);
}
export function preparationMatchesUpload(preparation: PublicationFilePreparation, clientId: string, bytes: number, digest: string) {
  return preparation.clientFileId === clientId && preparation.uploadBytes === bytes && preparation.uploadSha256 === digest;
}
export function preparedImageDescriptor(preparation: PublicationFilePreparation) {
  return {client_file_id: preparation.clientFileId, byte_length: preparation.uploadBytes, sha256: preparation.uploadSha256};
}

/** The original was captured synchronously by the session before its first await.
 * Bind the actual transferred bytes before persisting an intent or requesting a slot. */
export async function preparePublicationFile(original: Blob, clientFileId: string, deps: PhotoPreparationDeps,
  context: PhotoPreparationContext) {
  const sizes: {inputBytes: number; outputBytes?: number} = {inputBytes: original.size};
  return measurePhotoTask("preparation", async () => {
    context.checkContext();
    const originalSha256 = await deps.digest(original); context.checkContext();
    const prepared = deps.preparePhoto ? await deps.preparePhoto(original, context.signal)
      : {bytes: original, recipe: "original-v1" as const};
    context.checkContext();
    if (!(prepared.bytes instanceof Blob) || !size(prepared.bytes.size)) return invalid();
    const bytes = prepared.bytes.slice(0, prepared.bytes.size, "application/octet-stream");
    const uploadSha256 = prepared.bytes === original ? originalSha256 : await deps.digest(bytes); context.checkContext();
    const preparation = bindFilePreparation({version: 1, clientFileId, recipe: prepared.recipe,
      originalBytes: original.size, originalSha256, uploadBytes: bytes.size, uploadSha256});
    sizes.outputBytes = bytes.size;
    return {bytes, preparation};
  }, sizes);
}

/** Old journals have no preparation field and continue with their raw bytes.
 * A new journal first proves the reselected original, then reproduces its exact
 * transfer bytes. A different browser codec cannot silently change an intent. */
export async function restorePublicationFile(original: Blob, preparation: PublicationFilePreparation,
  deps: PhotoPreparationDeps, context: PhotoPreparationContext, knownOriginalHash?: string): Promise<Blob> {
  const sizes: {inputBytes: number; outputBytes?: number} = {inputBytes: original.size};
  return measurePhotoTask("preparation", async () => {
    context.checkContext();
    if (original.size !== preparation.originalBytes) throw new Error("files_required");
    const originalHash = knownOriginalHash ?? await deps.digest(original); context.checkContext();
    if (originalHash !== preparation.originalSha256) throw new Error("files_required");
    if (preparation.recipe === "original-v1") { sizes.outputBytes = original.size; return original; }
    if (!deps.preparePhoto) throw new Error("photo_preparation_changed");
    const result = await deps.preparePhoto(original, context.signal); context.checkContext();
    if (!(result.bytes instanceof Blob) || result.recipe !== preparation.recipe || result.bytes.size !== preparation.uploadBytes)
      throw new Error("photo_preparation_changed");
    const bytes = result.bytes.slice(0, result.bytes.size, "application/octet-stream");
    const digest = await deps.digest(bytes); context.checkContext();
    if (digest !== preparation.uploadSha256) throw new Error("photo_preparation_changed");
    sizes.outputBytes = bytes.size;
    return bytes;
  }, sizes);
}
