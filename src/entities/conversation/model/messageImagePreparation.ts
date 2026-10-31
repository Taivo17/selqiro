import { contactFail } from "./listingContact";
import { MESSAGE_IMAGE_LIMITS, type PreparedMessageImage } from "./messageImage";
import { MESSAGE_IMAGE_SELECTION_LIMITS, SelectedImageHeaderError, readSelectedImageInfo } from "./messageImageSelection";
import { decodeMessageImage } from "./messageImageDecode";

export class MessageImagePreparationError extends Error {
  constructor(message: string) { super(message); this.name = "MessageImagePreparationError"; }
}
function preparationFail(message: string): never { throw new MessageImagePreparationError(message); }
function checkAbort(signal?: AbortSignal) { if (signal?.aborted) contactFail("aborted"); }
/** Decode only the selected local file. Metadata never leaves the browser; the
 * server independently decodes and removes metadata from this prepared WebP. */
export async function prepareMessageImage(file: File, signal?: AbortSignal): Promise<PreparedMessageImage> {
  checkAbort(signal);
  if (!file || !Number.isSafeInteger(file.size) || file.size < 1) return preparationFail("Valitud pildifail on tühi. Vali teine foto.");
  if (file.size > MESSAGE_IMAGE_SELECTION_LIMITS.bytes)
    return preparationFail("Valitud foto on suurem kui 32 MB. Vali väiksem JPEG-, PNG- või WebP-pilt.");
  let info;
  try { info = await readSelectedImageInfo(file, () => checkAbort(signal)); }
  catch (error) {
    checkAbort(signal);
    if (error instanceof SelectedImageHeaderError && error.reason === "unsupported")
      return preparationFail("Seda pildivormingut ei saa lisada. Vali JPEG-, PNG- või WebP-pilt.");
    return preparationFail(error instanceof SelectedImageHeaderError
      ? "Selle foto andmeid ei saanud lugeda. Vali teine JPEG-, PNG- või WebP-pilt."
      : "Valitud fotot ei saanud seadmest lugeda. Vali foto galeriist uuesti.");
  }
  if (info.width < 1 || info.height < 1 || info.width > MESSAGE_IMAGE_SELECTION_LIMITS.edge || info.height > MESSAGE_IMAGE_SELECTION_LIMITS.edge)
    return preparationFail("Valitud foto mõõtmed on liiga suured. Vali foto, mille pikem külg on kuni 32 768 pikslit.");
  if (info.width * info.height > MESSAGE_IMAGE_SELECTION_LIMITS.pixels)
    return preparationFail("Valitud foto eraldusvõime on liiga suur. Vali kuni 64-megapiksline foto.");
  const swapped = info.orientation >= 5;
  const scale = Math.min(1, MESSAGE_IMAGE_LIMITS.edge / Math.max(info.width, info.height));
  const targetWidth = Math.max(1, Math.round(info.width * scale)), targetHeight = Math.max(1, Math.round(info.height * scale));
  // Providers may omit/generalize MIME. Only local bytes and the decoder decide
  // the format. Ask for bounded output while decoding, not afterwards. Browsers
  // can still allocate internal source buffers, hence the separate source caps.
  let decoded;
  try { decoded = await decodeMessageImage(info, targetWidth, targetHeight, signal); }
  catch { checkAbort(signal); return preparationFail("Brauser ei saanud seda fotot avada. Vali foto uuesti või proovi teist JPEG-, PNG- või WebP-pilti."); }
  const canvas = document.createElement("canvas");
  try {
    checkAbort(signal);
    // The image-element fallback can return source-size pixels, or a smaller
    // browser rendition on low-memory phones. Never enlarge that rendition.
    const outputScale = Math.min(1, targetWidth / decoded.width, targetHeight / decoded.height);
    const outputWidth = Math.max(1, Math.round(decoded.width * outputScale));
    const outputHeight = Math.max(1, Math.round(decoded.height * outputScale));
    let blob: Blob | null = null;
    // Bound CPU work: quality first, then two progressively smaller encodings.
    const attempts = [{ scale: 1, quality: 0.82 }, { scale: 1, quality: 0.67 },
      { scale: 1, quality: 0.52 }, { scale: 0.8, quality: 0.5 }, { scale: 0.64, quality: 0.5 }];
    for (const attempt of attempts) {
      checkAbort(signal);
      canvas.width = Math.max(1, Math.round((swapped ? outputHeight : outputWidth) * attempt.scale));
      canvas.height = Math.max(1, Math.round((swapped ? outputWidth : outputHeight) * attempt.scale));
      const context = canvas.getContext("2d"); if (!context) return preparationFail("Brauser ei saanud fotot töödelda. Proovi lehte värskendada ja vali foto uuesti.");
      switch (info.orientation) {
        case 2: context.transform(-1, 0, 0, 1, canvas.width, 0); break;
        case 3: context.transform(-1, 0, 0, -1, canvas.width, canvas.height); break;
        case 4: context.transform(1, 0, 0, -1, 0, canvas.height); break;
        case 5: context.transform(0, 1, 1, 0, 0, 0); break;
        case 6: context.transform(0, 1, -1, 0, canvas.width, 0); break;
        case 7: context.transform(0, -1, -1, 0, canvas.width, canvas.height); break;
        case 8: context.transform(0, -1, 1, 0, 0, canvas.height); break;
      }
      context.drawImage(decoded.source, 0, 0, swapped ? canvas.height : canvas.width, swapped ? canvas.width : canvas.height);
      blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", attempt.quality));
      checkAbort(signal);
      if (!blob || blob.type !== "image/webp" || blob.size < 1) break;
      if (blob.size <= MESSAGE_IMAGE_LIMITS.sourceBytes) break;
    }
    if (!blob || blob.type !== "image/webp" || blob.size < 1 || blob.size > MESSAGE_IMAGE_LIMITS.sourceBytes)
      return preparationFail("Fotot ei saanud saatmiseks vähendada. Vali teine või väiksem foto.");
    const bytes = new Uint8Array(await blob.arrayBuffer()); checkAbort(signal);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)); checkAbort(signal);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    return Object.freeze({ imageBase64: btoa(binary), sourceSha256: Array.from(digest, b => b.toString(16).padStart(2, "0")).join(""),
      sourceBytes: bytes.length, sourceMime: "image/webp", preview: blob, width: canvas.width, height: canvas.height });
  } finally { decoded.dispose(); canvas.width = 0; canvas.height = 0; }
}
