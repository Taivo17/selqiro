import { uiMessage } from "../../../../lib/i18n/interfaceMessage";
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
  if (!file || !Number.isSafeInteger(file.size) || file.size < 1) return preparationFail(uiMessage("the_selected_image_file_is_empty_choose_another_photo"));
  if (file.size > MESSAGE_IMAGE_SELECTION_LIMITS.bytes)
    return preparationFail(uiMessage("the_selected_photo_is_larger_than_32_mb_choose_a_smaller_jpeg_png_or_webp_i"));
  let info;
  try { info = await readSelectedImageInfo(file, () => checkAbort(signal)); }
  catch (error) {
    checkAbort(signal);
    if (error instanceof SelectedImageHeaderError && error.reason === "unsupported")
      return preparationFail(uiMessage("this_image_format_is_unsupported_choose_a_jpeg_png_or_webp_image"));
    return preparationFail(error instanceof SelectedImageHeaderError
      ? uiMessage("could_not_read_this_photo_s_data_choose_another_jpeg_png_or_webp_image")
      : uiMessage("could_not_read_the_selected_photo_from_your_device_select_it_from_the_galle"));
  }
  if (info.width < 1 || info.height < 1 || info.width > MESSAGE_IMAGE_SELECTION_LIMITS.edge || info.height > MESSAGE_IMAGE_SELECTION_LIMITS.edge)
    return preparationFail(uiMessage("the_selected_photo_s_dimensions_are_too_large_choose_a_photo_with_a_longest"));
  if (info.width * info.height > MESSAGE_IMAGE_SELECTION_LIMITS.pixels)
    return preparationFail(uiMessage("the_selected_photo_s_resolution_is_too_high_choose_a_photo_of_up_to_64_mega"));
  const swapped = info.orientation >= 5;
  const scale = Math.min(1, MESSAGE_IMAGE_LIMITS.edge / Math.max(info.width, info.height));
  const targetWidth = Math.max(1, Math.round(info.width * scale)), targetHeight = Math.max(1, Math.round(info.height * scale));
  // Providers may omit/generalize MIME. Only local bytes and the decoder decide
  // the format. Ask for bounded output while decoding, not afterwards. Browsers
  // can still allocate internal source buffers, hence the separate source caps.
  let decoded;
  try { decoded = await decodeMessageImage(info, targetWidth, targetHeight, signal); }
  catch { checkAbort(signal); return preparationFail(uiMessage("the_browser_could_not_open_this_photo_select_it_again_or_try_another_jpeg_p")); }
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
      const context = canvas.getContext("2d"); if (!context) return preparationFail(uiMessage("the_browser_could_not_process_the_photo_try_refreshing_the_page_and_selecti"));
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
      return preparationFail(uiMessage("the_photo_could_not_be_resized_for_sending_choose_another_or_smaller_photo"));
    const bytes = new Uint8Array(await blob.arrayBuffer()); checkAbort(signal);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)); checkAbort(signal);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    return Object.freeze({ imageBase64: btoa(binary), sourceSha256: Array.from(digest, b => b.toString(16).padStart(2, "0")).join(""),
      sourceBytes: bytes.length, sourceMime: "image/webp", preview: blob, width: canvas.width, height: canvas.height });
  } finally { decoded.dispose(); canvas.width = 0; canvas.height = 0; }
}
