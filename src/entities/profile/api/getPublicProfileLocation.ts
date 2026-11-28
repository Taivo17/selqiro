import { profileMediaUuid } from "../model/profileMedia";
import { parsePublicProfileLocation, type PublicProfileLocation } from "../model/publicProfileLocation";

/** One guarded, bounded read; no geocoding or raw profile-table fallback. */
export async function getPublicProfileLocation(identityId: string, signal?: AbortSignal): Promise<PublicProfileLocation | null> {
  if (!profileMediaUuid(identityId)) throw new Error("profile_location_identity_invalid");
  if (signal?.aborted) throw new Error("public_profile_location_read_failed");
  const controller = new AbortController(), abort = () => controller.abort();
  signal?.addEventListener("abort", abort, {once: true});
  let rejectAborted = () => {};
  const interrupted = new Promise<never>((_resolve, reject) => {
    rejectAborted = () => reject(new Error("public_profile_location_read_failed"));
    controller.signal.addEventListener("abort", rejectAborted, {once: true});
  });
  const deadline = setTimeout(abort, 12_000);
  try {
    const {data, error} = await Promise.race([
      (async () => {
        const {supabaseBrowserClient} = await import("../../../shared/supabase/browserClient");
        if (signal?.aborted || controller.signal.aborted) throw new Error("public_profile_location_read_failed");
        return supabaseBrowserClient.rpc("get_public_profile_location_v1", {p_identity_id: identityId}).abortSignal(controller.signal);
      })(),
      interrupted,
    ]);
    if (error || controller.signal.aborted) throw new Error("public_profile_location_read_failed");
    return parsePublicProfileLocation(data, identityId);
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener("abort", abort);
    controller.signal.removeEventListener("abort", rejectAborted);
    controller.abort();
  }
}
