import {profileMediaRecord, profileMediaUuid, PROFILE_MEDIA_LIMITS} from "../model/profileMedia";
import {validCoverFit, type CoverFit} from "../../../shared/profile-media/coverFit";
import {profileImageUrl} from "../../../shared/profile-media/profileImageUrl";

export type PublicProfileMedia = CoverFit & Readonly<{identity_id: string; slug: string | null;
  avatar_url: string | null; banner_url: string | null; banner_width: number | null; banner_height: number | null}>;

export function publicProfileHref(slug: unknown): string | null {
  if (typeof slug !== "string" || slug.length < 1 || slug.length > 200 || !/^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(slug)) return null;
  return `/v2/profile/${encodeURIComponent(slug)}`;
}
export function parsePublicProfileMedia(value: unknown, expectedIdentityId: string): PublicProfileMedia | null {
  if (!profileMediaUuid(expectedIdentityId)) throw new Error("profile_media_identity_invalid");
  if (value === null) return null;
  const r = profileMediaRecord(value, ["identity_id", "slug", "avatar_url", "banner_url", "banner_width", "banner_height", "focus_x", "focus_y", "zoom"], "response");
  if (r.identity_id !== expectedIdentityId || (r.slug !== null && !publicProfileHref(r.slug))
    || !validCoverFit(r as unknown as CoverFit)
    || ![r.avatar_url, r.banner_url].every(url => url === null || (typeof url === "string" && url.length <= 4096))) throw new Error("profile_media_response_invalid");
  const dimensions = [r.banner_width, r.banner_height];
  if (!(dimensions.every(value => value === null) || dimensions.every(value => Number.isSafeInteger(value)
    && Number(value) >= 1 && Number(value) <= PROFILE_MEDIA_LIMITS.coverEdge))) throw new Error("profile_media_dimensions_invalid");
  return Object.freeze({...r, avatar_url: profileImageUrl(r.avatar_url as string | null),
    banner_url: profileImageUrl(r.banner_url as string | null)}) as PublicProfileMedia;
}
export async function getPublicProfileMedia(identityId: string, signal?: AbortSignal): Promise<PublicProfileMedia | null> {
  if (!profileMediaUuid(identityId)) throw new Error("profile_media_identity_invalid");
  const controller = new AbortController(), abort = () => controller.abort();
  signal?.addEventListener("abort", abort, {once: true});
  const timer = setTimeout(abort, 12000);
  try {
    const {supabaseBrowserClient} = await import("../../../shared/supabase/browserClient");
    if (signal?.aborted) controller.abort();
    const {data, error} = await supabaseBrowserClient.rpc("get_public_profile_media_v1", {p_identity_id: identityId}).abortSignal(controller.signal);
    if (error || controller.signal.aborted) throw new Error("profile_media_read_failed");
    return parsePublicProfileMedia(data, identityId);
  } finally {clearTimeout(timer); signal?.removeEventListener("abort", abort); controller.abort();}
}
