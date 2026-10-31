import { contactFail } from "./listingContact";
import type { SelectedImageInfo } from "./messageImageSelection";

export type DecodedMessageImage = Readonly<{
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
}>;

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) contactFail("aborted");
}

/** The caller has checked byte, dimension, and pixel budgets and removed EXIF.
 * A local <img> is a compatibility fallback, not an unbounded second upload.
 * Either browser decoder may allocate source buffers internally. The caller
 * must draw into its bounded canvas and dispose this resource in a finally. */
export async function decodeMessageImage(info: SelectedImageInfo, targetWidth: number,
  targetHeight: number, signal?: AbortSignal): Promise<DecodedMessageImage> {
  checkAbort(signal);
  if (typeof createImageBitmap === "function") {
    let bitmap: ImageBitmap | null = null;
    try {
      // EXIF has already been removed. Default orientation is portable; the
      // obsolete "none" option can itself reject a perfectly readable photo.
      bitmap = await createImageBitmap(info.source, {
        resizeWidth: targetWidth, resizeHeight: targetHeight, resizeQuality: "high",
      });
      checkAbort(signal);
      if (bitmap.width === targetWidth && bitmap.height === targetHeight) {
        const decoded = bitmap;
        bitmap = null; // Ownership passes to the caller until dispose().
        let disposed = false;
        return { source: decoded, width: decoded.width, height: decoded.height,
          dispose: () => { if (!disposed) { disposed = true; decoded.close(); } } };
      }
    } catch {
      checkAbort(signal);
      // A rejected option/decoder, or an implementation that ignores resize,
      // gets one independent browser image-element decode of the local Blob.
    } finally { bitmap?.close(); }
  }
  checkAbort(signal);
  return decodeWithImageElement(info, signal);
}

function decodeWithImageElement(info: SelectedImageInfo, signal?: AbortSignal): Promise<DecodedMessageImage> {
  checkAbort(signal);
  const image = new Image();
  const objectUrl = URL.createObjectURL(info.source);
  image.decoding = "async";
  return new Promise((resolve, reject) => {
    let settled = false, disposed = false;
    const detach = () => {
      clearTimeout(timer);
      image.onload = null; image.onerror = null;
      signal?.removeEventListener("abort", abort);
    };
    const dispose = () => {
      if (disposed) return;
      disposed = true; detach();
      image.removeAttribute("src");
      URL.revokeObjectURL(objectUrl);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true; dispose(); reject(error);
    };
    const abort = () => {
      try { contactFail("aborted"); } catch (error) { fail(error); }
    };
    const timer = setTimeout(() => fail(new Error("message_image_decode_timeout")), 20000);
    image.onload = () => {
      if (signal?.aborted) { abort(); return; }
      const width = image.naturalWidth, height = image.naturalHeight;
      // Some mobile browsers reduce decoded images on constrained devices.
      // Permit only a smaller rendition with the same aspect ratio (one
      // decoded-pixel rounding tolerance), never a larger or distorted image.
      if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1
        || width > info.width || height > info.height
        || Math.abs(width * info.height - height * info.width) > Math.max(info.width, info.height)) {
        fail(new Error("message_image_dimensions_changed")); return;
      }
      if (settled) return;
      settled = true; detach();
      resolve({ source: image, width, height, dispose });
    };
    image.onerror = () => fail(new Error("message_image_decode_failed"));
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    try { image.src = objectUrl; } catch (error) { fail(error); }
  });
}
