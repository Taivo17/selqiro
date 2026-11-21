import {clampCoverFit, coverGeometry, sameCoverFit, type CoverFit} from "./coverFit";

export type AvatarFit = CoverFit & Readonly<{mode: "cover" | "contain"}>;

export function clampAvatarFit(value: AvatarFit): AvatarFit {
  return Object.freeze({...clampCoverFit(value), mode: value.mode === "contain" ? "contain" : "cover"});
}

export function sameAvatarFit(a: AvatarFit, b: AvatarFit): boolean {
  return a.mode === b.mode && sameCoverFit(a, b);
}

/** Inverse of the square preview's coverGeometry, in decoded source pixels.
 * Contain keeps the complete original image and therefore has no crop. */
export function avatarCropRect(width: number, height: number, value: AvatarFit) {
  if (value.mode === "contain") return null;
  const geometry = coverGeometry(width, height, 1, 1, value);
  if (!geometry) return null;
  const scale = geometry.width / width;
  const size = Math.min(width, height, 1 / scale);
  return Object.freeze({sx: Math.min(width - size, Math.max(0, -geometry.left / scale)),
    sy: Math.min(height - size, Math.max(0, -geometry.top / scale)), size});
}
