import { contactFail } from "./listingContact";
import { MESSAGE_IMAGE_LIMITS, type PreparedMessageImage } from "./messageImage";

export class MessageImagePreparationError extends Error {
  constructor(message: string) { super(message); this.name = "MessageImagePreparationError"; }
}
function preparationFail(message: string): never { throw new MessageImagePreparationError(message); }
function checkAbort(signal?: AbortSignal) { if (signal?.aborted) contactFail("aborted"); }
function originalFormat(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if ([137,80,78,71,13,10,26,10].every((b, i) => bytes[i] === b)) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}
/** Decode only the selected local file. Metadata never leaves the browser; the
 * server independently decodes and removes metadata from this prepared WebP. */
export async function prepareMessageImage(file: File, signal?: AbortSignal): Promise<PreparedMessageImage> {
  checkAbort(signal);
  if (!file || !Number.isSafeInteger(file.size) || file.size < 1) return preparationFail("Valitud pildifail on tühi. Vali teine foto.");
  if (file.size > MESSAGE_IMAGE_LIMITS.originalBytes) return preparationFail("Valitud foto on suurem kui 5 MB. Vali väiksem JPEG-, PNG- või WebP-pilt.");
  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer()); checkAbort(signal);
  const format = originalFormat(signature);
  if (!format) return preparationFail("Seda pildivormingut ei saa lisada. Vali JPEG-, PNG- või WebP-pilt.");
  // Native photo providers may omit or generalize File.type. The byte signature
  // and decoder decide the format; file names and MIME metadata grant no access.
  const source = file.type === format ? file : new Blob([file], { type: format });
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(source, { imageOrientation: "from-image" }); }
  catch { return preparationFail("Seda fotot ei saanud avada. Vali teine JPEG-, PNG- või WebP-pilt."); }
  try {
    checkAbort(signal);
    if (bitmap.width < 1 || bitmap.height < 1) return preparationFail("Seda fotot ei saanud avada. Vali teine pilt.");
    if (bitmap.width * bitmap.height > MESSAGE_IMAGE_LIMITS.pixels) return preparationFail("Valitud foto on üle 16 megapiksli. Vali väiksema eraldusvõimega foto.");
    let scale = Math.min(1, MESSAGE_IMAGE_LIMITS.edge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    let blob: Blob | null = null;
    for (let step = 0; step < 5 && (!blob || blob.size > MESSAGE_IMAGE_LIMITS.sourceBytes); step++) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d"); if (!context) return preparationFail("Brauser ei saanud fotot töödelda. Proovi lehte värskendada ja vali foto uuesti.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", step < 3 ? 0.82 - step * 0.15 : 0.5));
      checkAbort(signal);
      if (step >= 2) scale *= 0.8;
    }
    if (!blob || blob.type !== "image/webp" || blob.size < 1 || blob.size > MESSAGE_IMAGE_LIMITS.sourceBytes)
      return preparationFail("Fotot ei saanud saatmiseks vähendada. Vali teine või väiksem foto.");
    const bytes = new Uint8Array(await blob.arrayBuffer()); checkAbort(signal);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)); checkAbort(signal);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    return Object.freeze({ imageBase64: btoa(binary), sourceSha256: Array.from(digest, b => b.toString(16).padStart(2, "0")).join(""),
      sourceBytes: bytes.length, sourceMime: "image/webp", preview: blob, width: canvas.width, height: canvas.height });
  } finally { bitmap.close(); }
}
