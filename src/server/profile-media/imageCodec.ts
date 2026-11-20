import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { PROFILE_MEDIA_LIMITS, profileMediaFail, type ProfileMediaSlot, type ProfileMediaUploadBody } from "../../entities/profile/model/profileMedia";

export type CanonicalProfileImage = Readonly<{ bytes: Uint8Array; sha256: string; width: number; height: number }>;
export const profileImageHash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** Browser preparation is a convenience, never proof of a safe image. Only a
 * native-decoded, oriented, single-frame WebP without input metadata is stored. */
export async function canonicalProfileImage(bytes: Uint8Array, slot: ProfileMediaSlot,
  sourceMime: ProfileMediaUploadBody["sourceMime"]): Promise<CanonicalProfileImage> {
  if (!bytes.length || bytes.length > PROFILE_MEDIA_LIMITS.sourceBytes || !["avatar", "cover"].includes(slot)) return profileMediaFail("input");
  const edge = slot === "avatar" ? PROFILE_MEDIA_LIMITS.avatarEdge : PROFILE_MEDIA_LIMITS.coverEdge;
  const maximum = slot === "avatar" ? PROFILE_MEDIA_LIMITS.avatarBytes : PROFILE_MEDIA_LIMITS.coverBytes;
  const options: sharp.SharpOptions = { failOn: "warning", limitInputPixels: PROFILE_MEDIA_LIMITS.inputPixels,
    sequentialRead: true, pages: 1 };
  let active: sharp.Sharp | undefined, timer: ReturnType<typeof setTimeout> | undefined;
  const operation = async () => {
    active = sharp(bytes, options).timeout({ seconds: 8 });
    const metadata = await active.metadata();
    if (!(metadata.format && ({ jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as Record<string, string>)[metadata.format] === sourceMime)
      || !metadata.width || !metadata.height || metadata.width > PROFILE_MEDIA_LIMITS.inputEdge || metadata.height > PROFILE_MEDIA_LIMITS.inputEdge
      || metadata.width * metadata.height > PROFILE_MEDIA_LIMITS.inputPixels || (metadata.pages ?? 1) !== 1) return profileMediaFail("input");
    active = sharp(bytes, options).rotate().resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 }).timeout({ seconds: 8 });
    const output = await active.toBuffer({ resolveWithObject: true });
    if (!output.data.length || output.data.length > maximum || output.info.format !== "webp" || output.info.width < 1 || output.info.height < 1
      || output.info.width > edge || output.info.height > edge) return profileMediaFail("input");
    active = sharp(output.data, options).timeout({ seconds: 8 });
    const checked = await active.metadata();
    if (checked.format !== "webp" || checked.width !== output.info.width || checked.height !== output.info.height
      || (checked.pages ?? 1) !== 1 || checked.exif || checked.icc || checked.xmp || checked.iptc || checked.orientation !== undefined)
      return profileMediaFail("input");
    return Object.freeze({ bytes: new Uint8Array(output.data), sha256: profileImageHash(output.data), width: output.info.width, height: output.info.height });
  };
  try {
    return await Promise.race([operation(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => { active?.destroy(); reject(new Error("image_deadline")); }, 8000);
    })]);
  } catch { return profileMediaFail("input"); }
  finally { clearTimeout(timer); active?.destroy(); }
}
