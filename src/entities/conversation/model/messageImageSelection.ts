/** Browser-only source budgets. These are deliberately separate from the
 * smaller prepared-upload and legacy server-read limits in messageImage.ts. */
export const MESSAGE_IMAGE_SELECTION_LIMITS = Object.freeze({
  bytes: 32 * 1024 * 1024,
  pixels: 64000000,
  edge: 32768,
  headerBytes: 1024 * 1024,
  // libpng commonly emits 8 KiB IDAT chunks; a 32 MiB PNG needs over 4096.
  chunks: 8192,
});

export type SelectedImageInfo = Readonly<{
  mime: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  orientation: number;
  source: Blob;
}>;

export class SelectedImageHeaderError extends Error {
  constructor(readonly reason: "unsupported" | "invalid") {
    super(reason); this.name = "SelectedImageHeaderError";
  }
}
function invalid(): never { throw new SelectedImageHeaderError("invalid"); }
function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

/** Read only the first TIFF IFD, which contains orientation. No thumbnails,
 * linked IFDs, GPS, names, or other metadata are copied into the output. */
function exifOrientation(bytes: Uint8Array): number {
  const start = ascii(bytes, 0, 6) === "Exif\0\0" ? 6 : 0;
  if (bytes.length < start + 8) return invalid();
  const order = ascii(bytes, start, 2);
  if (order !== "II" && order !== "MM") return invalid();
  const little = order === "II";
  const view = new DataView(bytes.buffer, bytes.byteOffset + start, bytes.byteLength - start);
  if (view.getUint16(2, little) !== 42) return invalid();
  const offset = view.getUint32(4, little);
  if (offset < 8 || offset + 2 > view.byteLength) return invalid();
  const count = view.getUint16(offset, little);
  if (offset + 2 + count * 12 > view.byteLength) return invalid();
  for (let index = 0; index < count; index++) {
    const entry = offset + 2 + index * 12;
    if (view.getUint16(entry, little) !== 0x0112) continue;
    if (view.getUint16(entry + 2, little) !== 3 || view.getUint32(entry + 4, little) !== 1) return invalid();
    const orientation = view.getUint16(entry + 8, little);
    if (orientation < 1 || orientation > 8) return invalid();
    return orientation;
  }
  return 1;
}

/** Inspect bounded headers before asking a browser decoder to allocate pixels.
 * The decoder still validates compressed content; headers only cap local work. */
export async function readSelectedImageInfo(file: Blob, checkAbort: () => void): Promise<SelectedImageInfo> {
  let readBytes = 0;
  const read = async (offset: number, length: number) => {
    checkAbort();
    if (offset < 0 || length < 0 || offset + length > file.size ||
        readBytes + length > MESSAGE_IMAGE_SELECTION_LIMITS.headerBytes) return invalid();
    readBytes += length;
    const bytes = new Uint8Array(await file.slice(offset, offset + length).arrayBuffer());
    checkAbort();
    if (bytes.length !== length) return invalid();
    return bytes;
  };
  const signature = await read(0, Math.min(file.size, 16));
  let orientation = 1;
  let seenExif = false;
  let exifRange: readonly [number, number] | null = null;
  let webpFlags = -1;
  const exif = (bytes: Uint8Array, start: number, end: number) => {
    if (seenExif) return invalid();
    seenExif = true;
    orientation = exifOrientation(bytes);
    exifRange = [start, end];
  };
  const result = (mime: SelectedImageInfo["mime"], width: number, height: number): SelectedImageInfo => {
    let parts: BlobPart[] = [file];
    if (exifRange) {
      const [start, end] = exifRange;
      if (mime === "image/webp") {
        if (webpFlags < 0 || start < 30) return invalid();
        const riff = signature.slice(0, 12);
        new DataView(riff.buffer).setUint32(4, file.size - (end - start) - 8, true);
        parts = [riff, file.slice(12, 20), new Uint8Array([webpFlags & ~0x08]),
          file.slice(21, start), file.slice(end)];
      } else parts = [file.slice(0, start), file.slice(end)];
    }
    // Browser EXIF support differs for WebP. Strip the local EXIF block before
    // decoding and let the caller apply the parsed orientation exactly once.
    return { mime, width, height, orientation, source: new Blob(parts, { type: mime }) };
  };
  if (signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff) {
    let offset = 2;
    let width = 0, height = 0;
    for (let segment = 0; segment < MESSAGE_IMAGE_SELECTION_LIMITS.chunks; segment++) {
      const marker = await read(offset, 2);
      if (marker[0] !== 0xff) return invalid();
      if (marker[1] === 0xff) { offset++; continue; }
      if (marker[1] === 0xda) {
        if (!width || !height) return invalid();
        return result("image/jpeg", width, height);
      }
      if (marker[1] === 0xd9 || marker[1] === 0x00) return invalid();
      if (marker[1] === 0x01 || (marker[1] >= 0xd0 && marker[1] <= 0xd7)) { offset += 2; continue; }
      const sizeBytes = await read(offset + 2, 2);
      const size = (sizeBytes[0] << 8) | sizeBytes[1];
      if (size < 2 || offset + 2 + size > file.size) return invalid();
      if (marker[1] === 0xe1 && size >= 8) {
        const prefix = await read(offset + 4, 6);
        if (ascii(prefix, 0, 6) === "Exif\0\0") exif(await read(offset + 4, size - 2), offset, offset + 2 + size);
      }
      const isFrame = marker[1] >= 0xc0 && marker[1] <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker[1]);
      if (isFrame) {
        if (width || size < 8) return invalid();
        const dimensions = await read(offset + 4, 5);
        height = (dimensions[1] << 8) | dimensions[2];
        width = (dimensions[3] << 8) | dimensions[4];
      }
      offset += 2 + size;
    }
    return invalid();
  }
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => signature[index] === value)) {
    let offset = 8, width = 0, height = 0;
    for (let chunk = 0; chunk < MESSAGE_IMAGE_SELECTION_LIMITS.chunks; chunk++) {
      const header = await read(offset, 8);
      const size = new DataView(header.buffer).getUint32(0);
      const kind = ascii(header, 4, 4);
      if (offset + 12 + size > file.size) return invalid();
      if (chunk === 0) {
        if (kind !== "IHDR" || size !== 13) return invalid();
        const data = await read(offset + 8, 8), view = new DataView(data.buffer);
        width = view.getUint32(0); height = view.getUint32(4);
      } else if (kind === "IHDR") return invalid();
      if (kind === "eXIf") exif(await read(offset + 8, size), offset, offset + 12 + size);
      if (kind === "IEND") {
        if (!width || !height || size !== 0) return invalid();
        return result("image/png", width, height);
      }
      offset += 12 + size;
    }
    return invalid();
  }
  if (ascii(signature, 0, 4) === "RIFF" && ascii(signature, 8, 4) === "WEBP") {
    const end = new DataView(signature.buffer).getUint32(4, true) + 8;
    if (end !== file.size) return invalid();
    let offset = 12, width = 0, height = 0;
    for (let chunk = 0; chunk < MESSAGE_IMAGE_SELECTION_LIMITS.chunks && offset < end; chunk++) {
      const header = await read(offset, 8), kind = ascii(header, 0, 4);
      const size = new DataView(header.buffer).getUint32(4, true);
      const next = offset + 8 + size + (size % 2);
      if (next > end) return invalid();
      if (kind === "EXIF") exif(await read(offset + 8, size), offset, next);
      if (!width && ["VP8X", "VP8 ", "VP8L"].includes(kind)) {
        const required = kind === "VP8L" ? 5 : 10;
        if (size < required) return invalid();
        const data = await read(offset + 8, required);
        if (kind === "VP8X") {
          if (chunk !== 0 || size !== 10) return invalid();
          webpFlags = data[0];
          width = 1 + data[4] + (data[5] << 8) + (data[6] << 16);
          height = 1 + data[7] + (data[8] << 8) + (data[9] << 16);
        } else if (kind === "VP8 ") {
          if (data[3] !== 0x9d || data[4] !== 0x01 || data[5] !== 0x2a) return invalid();
          width = (data[6] | (data[7] << 8)) & 0x3fff;
          height = (data[8] | (data[9] << 8)) & 0x3fff;
        } else {
          if (data[0] !== 0x2f) return invalid();
          width = 1 + data[1] + ((data[2] & 0x3f) << 8);
          height = 1 + (data[2] >> 6) + (data[3] << 2) + ((data[4] & 0x0f) << 10);
        }
      }
      offset = next;
    }
    if (offset !== end || !width || !height) return invalid();
    return result("image/webp", width, height);
  }
  throw new SelectedImageHeaderError("unsupported");
}
