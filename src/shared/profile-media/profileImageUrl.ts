import { safeMessageAvatar } from "../../entities/conversation/model/messagingValidation";

/** Existing public storage is allowed only on this application's project origin. */
export function profileImageUrl(value: string | null | undefined): string | null {
  return safeMessageAvatar(value ?? null);
}
export function profileImageSource(url: string | null | undefined, localPreview?: string | null): string | null {
  // The preview is a separately typed prop supplied only by the local Blob hook.
  if (localPreview?.startsWith("blob:") && !/[\u0000-\u0020]/.test(localPreview)) return localPreview;
  return profileImageUrl(url);
}
export function profileInitial(name: string | null | undefined): string {
  return Array.from(name?.trim() || "?")[0].toLocaleUpperCase();
}
