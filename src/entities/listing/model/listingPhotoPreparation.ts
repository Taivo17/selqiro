import {readSelectedImageInfo} from "../../../shared/media/localImageHeader";
import {decodeLocalImage} from "../../../shared/media/localImageDecode";
import {PRIVATE_UPLOAD} from "./privatePublicationUpload";
import {LISTING_PHOTO_RECIPE, type PreparedListingPhoto} from "./publicationFilePreparation";

const LIMITS = Object.freeze({edge: 2048, sourceEdge: 16384, sourcePixels: 40000000, smallBytes: 512 * 1024, quality: 0.9});
function checkAbort(signal?: AbortSignal) { if (signal?.aborted) throw new Error("context_changed"); }
/** Pinned browser recipe shared by new listings and later photo additions.
 * The local original stays untouched. The server still validates every upload,
 * strips metadata and owns final WEB publication and authorization. */
export async function prepareListingPhoto(file: Blob, signal?: AbortSignal): Promise<PreparedListingPhoto> {
  checkAbort(signal);
  if (!(file instanceof Blob) || file.size < 1 || file.size > PRIVATE_UPLOAD.maxSourceBytes) throw new Error("image_rejected");
  const info = await readSelectedImageInfo(file, () => checkAbort(signal)); checkAbort(signal);
  if (info.animated || info.width < 1 || info.height < 1 || info.width > LIMITS.sourceEdge || info.height > LIMITS.sourceEdge
    || info.width * info.height > LIMITS.sourcePixels) throw new Error("image_rejected");
  const original = (): PreparedListingPhoto => ({bytes: file, recipe: "original-v1"});
  // Small already-sized files avoid a second lossy encode. Server validation and
  // orientation handling still apply to an unchanged original upload.
  if (Math.max(info.width, info.height) <= LIMITS.edge && file.size <= LIMITS.smallBytes) return original();
  const scale = Math.min(1, LIMITS.edge / Math.max(info.width, info.height));
  const targetWidth = Math.max(1, Math.round(info.width * scale)), targetHeight = Math.max(1, Math.round(info.height * scale));
  const decoded = await decodeLocalImage(info, targetWidth, targetHeight, signal);
  const canvas = document.createElement("canvas");
  try {
    checkAbort(signal);
    const outputScale = Math.min(1, targetWidth / decoded.width, targetHeight / decoded.height);
    const width = Math.max(1, Math.round(decoded.width * outputScale));
    const height = Math.max(1, Math.round(decoded.height * outputScale)), swapped = info.orientation >= 5;
    canvas.width = swapped ? height : width; canvas.height = swapped ? width : height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("image_preparation_failed");
    switch (info.orientation) {
      case 2: context.transform(-1, 0, 0, 1, canvas.width, 0); break;
      case 3: context.transform(-1, 0, 0, -1, canvas.width, canvas.height); break;
      case 4: context.transform(1, 0, 0, -1, 0, canvas.height); break;
      case 5: context.transform(0, 1, 1, 0, 0, 0); break;
      case 6: context.transform(0, 1, -1, 0, canvas.width, 0); break;
      case 7: context.transform(0, -1, -1, 0, canvas.width, canvas.height); break;
      case 8: context.transform(0, -1, 1, 0, 0, canvas.height); break;
    }
    context.drawImage(decoded.source, 0, 0, width, height);
    const bytes = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", LIMITS.quality));
    checkAbort(signal);
    // One encode only. Unsupported encoders or an unhelpful size increase keep
    // the original; transparent PNG/WebP is never flattened onto JPEG or white.
    if (!bytes || bytes.type !== "image/webp" || bytes.size < 1 || bytes.size >= file.size) return original();
    return {bytes, recipe: LISTING_PHOTO_RECIPE};
  } finally { decoded.dispose(); canvas.width = 0; canvas.height = 0; }
}
