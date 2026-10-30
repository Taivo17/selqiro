import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { MESSAGE_IMAGE_LIMITS } from "../../entities/conversation/model/messageImage";
import { contactFail } from "../../entities/conversation/model/listingContact";

export type CanonicalMessageImage = Readonly<{ bytes: Uint8Array; sha256: string; width: number; height: number }>;
export const messageImageHash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
/** Both newly prepared WebP and existing V1 photos pass a native decoder before
 * private proxy delivery. No input metadata, animation or format is forwarded. */
export async function canonicalMessageImage(bytes: Uint8Array, legacy = false): Promise<CanonicalMessageImage> {
  if (!bytes.length || bytes.length > (legacy ? MESSAGE_IMAGE_LIMITS.originalBytes : MESSAGE_IMAGE_LIMITS.sourceBytes)) return contactFail("input");
  const options: sharp.SharpOptions = { failOn: "warning", limitInputPixels: MESSAGE_IMAGE_LIMITS.pixels,
    sequentialRead: true, pages: 1 };
  try {
    const metadata = await sharp(bytes, options).metadata();
    if (!(legacy ? ["jpeg", "png", "webp"] : ["webp"]).includes(metadata.format ?? "")
      || !metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1
      || (!legacy && (metadata.width > MESSAGE_IMAGE_LIMITS.edge || metadata.height > MESSAGE_IMAGE_LIMITS.edge))) return contactFail("input");
    const output = await sharp(bytes, options).rotate().resize({ width: MESSAGE_IMAGE_LIMITS.edge, height: MESSAGE_IMAGE_LIMITS.edge,
      fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).timeout({ seconds: 8 }).toBuffer({ resolveWithObject: true });
    if (!output.data.length || output.data.length > MESSAGE_IMAGE_LIMITS.webBytes || output.info.format !== "webp"
      || output.info.width < 1 || output.info.height < 1 || output.info.width > MESSAGE_IMAGE_LIMITS.edge
      || output.info.height > MESSAGE_IMAGE_LIMITS.edge) return contactFail("input");
    const verified = await sharp(output.data, options).metadata();
    if (verified.format !== "webp" || verified.exif || verified.icc || verified.xmp || verified.iptc || (verified.pages ?? 1) !== 1
      || verified.width !== output.info.width || verified.height !== output.info.height) return contactFail("input");
    return Object.freeze({ bytes: new Uint8Array(output.data), sha256: messageImageHash(output.data),
      width: output.info.width, height: output.info.height });
  } catch { return contactFail("input"); }
}
