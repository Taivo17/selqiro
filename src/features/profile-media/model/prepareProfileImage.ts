import {readSelectedImageInfo, SelectedImageHeaderError} from "../../../shared/media/localImageHeader";
import {decodeLocalImage} from "../../../shared/media/localImageDecode";
import type {ProfileMediaSlot} from "../../../entities/profile/model/profileMedia";

export type PreparedProfileImage = Readonly<{imageBase64: string; sourceSha256: string; sourceBytes: number;
  sourceMime: "image/webp"; preview: Blob; width: number; height: number}>;
export class ProfileImagePreparationError extends Error {
  constructor(readonly code: "unsupported" | "tooLarge" | "decodeError" | "reduceError" | "aborted") {super(code);}
}
const budgets = Object.freeze({bytes: 32 * 1024 * 1024, pixels: 64000000, sourceEdge: 32768,
  outputBytes: 2 * 1024 * 1024, avatarEdge: 1024, coverEdge: 2560});
function check(signal?: AbortSignal) {if (signal?.aborted) throw new ProfileImagePreparationError("aborted");}
function webp(canvas: HTMLCanvasElement, quality: number, signal?: AbortSignal): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    let finished = false;
    const end = (value: Blob | null, error?: Error) => {
      if (finished) return; finished = true;
      clearTimeout(timer); signal?.removeEventListener("abort", abort);
      if (error) reject(error); else resolve(value);
    };
    const abort = () => end(null, new ProfileImagePreparationError("aborted"));
    const timer = setTimeout(() => end(null, new ProfileImagePreparationError("reduceError")), 20000);
    signal?.addEventListener("abort", abort, {once: true});
    if (signal?.aborted) {abort(); return;}
    try {canvas.toBlob(blob => end(blob), "image/webp", quality);} catch {end(null, new ProfileImagePreparationError("reduceError"));}
  });
}

/** Only a local decoded, oriented and bounded WebP is uploaded. Server processing is independent. */
export async function prepareProfileImage(file: File, slot: ProfileMediaSlot, signal?: AbortSignal): Promise<PreparedProfileImage> {
  check(signal);
  if (!file || !Number.isSafeInteger(file.size) || file.size < 1) throw new ProfileImagePreparationError("decodeError");
  if (file.size > budgets.bytes) throw new ProfileImagePreparationError("tooLarge");
  let info;
  try {info = await readSelectedImageInfo(file, () => check(signal));}
  catch (error) {
    check(signal);
    throw new ProfileImagePreparationError(error instanceof SelectedImageHeaderError && error.reason === "unsupported" ? "unsupported" : "decodeError");
  }
  if (info.animated) throw new ProfileImagePreparationError("unsupported");
  if (info.width < 1 || info.height < 1 || info.width > budgets.sourceEdge || info.height > budgets.sourceEdge
    || info.width * info.height > budgets.pixels) throw new ProfileImagePreparationError("tooLarge");
  const edge = slot === "avatar" ? budgets.avatarEdge : budgets.coverEdge;
  const scale = Math.min(1, edge / Math.max(info.width, info.height));
  const targetWidth = Math.max(1, Math.round(info.width * scale)), targetHeight = Math.max(1, Math.round(info.height * scale));
  let decoded;
  try {decoded = await decodeLocalImage(info, targetWidth, targetHeight, signal);}
  catch {check(signal); throw new ProfileImagePreparationError("decodeError");}
  const canvas = document.createElement("canvas");
  try {
    check(signal);
    const outputScale = Math.min(1, targetWidth / decoded.width, targetHeight / decoded.height);
    const outputWidth = Math.max(1, Math.round(decoded.width * outputScale));
    const outputHeight = Math.max(1, Math.round(decoded.height * outputScale));
    const swapped = info.orientation >= 5;
    let blob: Blob | null = null;
    const attempts = [{scale: 1, quality: 0.86}, {scale: 1, quality: 0.72}, {scale: 1, quality: 0.58},
      {scale: 0.8, quality: 0.58}, {scale: 0.64, quality: 0.58}];
    for (const attempt of attempts) {
      check(signal);
      canvas.width = Math.max(1, Math.round((swapped ? outputHeight : outputWidth) * attempt.scale));
      canvas.height = Math.max(1, Math.round((swapped ? outputWidth : outputHeight) * attempt.scale));
      const context = canvas.getContext("2d"); if (!context) throw new ProfileImagePreparationError("reduceError");
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
      blob = await webp(canvas, attempt.quality, signal); check(signal);
      if (!blob || blob.type !== "image/webp" || blob.size < 1 || blob.size <= budgets.outputBytes) break;
    }
    if (!blob || blob.type !== "image/webp" || blob.size < 1 || blob.size > budgets.outputBytes) throw new ProfileImagePreparationError("reduceError");
    const bytes = new Uint8Array(await blob.arrayBuffer()); check(signal);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)); check(signal);
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    return Object.freeze({imageBase64: btoa(binary), sourceSha256: Array.from(digest, b => b.toString(16).padStart(2, "0")).join(""),
      sourceBytes: bytes.length, sourceMime: "image/webp", preview: blob, width: canvas.width, height: canvas.height});
  } finally {decoded.dispose(); canvas.width = 0; canvas.height = 0;}
}
