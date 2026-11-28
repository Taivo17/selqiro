import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { profileActorArgs, validateProfilePatch, type ProfileEditorContext, type ProfileIdentityType } from "../../profile-editor/model/profileEditor";
import { parseLocationSuggestions, LocationLookupFailure, type LocationLookupRequest, type LocationLookupError } from "../../../shared/location/lookupSession";
import { parseProfileLocationSnapshot, profileLocationFailure, profileLocationMatches, ProfileLocationError,
  type ProfileLocationSave, type ProfileLocationFailureKind } from "../model/profileLocation";

const knownErrors: readonly ProfileLocationFailureKind[] = ["authChanged", "actorChanged", "forbidden", "conflict", "invalid", "unknown", "selectionExpired", "unavailable", "rateLimited"];
const safeHeaders = { "Content-Type": "application/json", Accept: "application/json" };
function contextReady(context: ProfileEditorContext) {
  profileActorArgs(context);
  if (!context.accessToken || context.signal.aborted) throw new ProfileLocationError("authChanged");
}
async function withinRequest<T>(context: ProfileEditorContext, work: (signal: AbortSignal) => Promise<T>, extraSignal?: AbortSignal): Promise<T> {
  contextReady(context);
  if (extraSignal?.aborted) throw new ProfileLocationError("unknown");
  const controller = new AbortController(), abort = () => controller.abort(), timer = setTimeout(abort, 30000);
  context.signal.addEventListener("abort", abort, { once: true }); extraSignal?.addEventListener("abort", abort, { once: true });
  try {
    const result = await work(controller.signal);
    if (context.signal.aborted || controller.signal.aborted || extraSignal?.aborted) throw new ProfileLocationError("unknown");
    return result;
  } catch (error) { throw profileLocationFailure(error); }
  finally { clearTimeout(timer); context.signal.removeEventListener("abort", abort); extraSignal?.removeEventListener("abort", abort); controller.abort(); }
}
async function responseJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new ProfileLocationError("unknown");
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) { const value = await reader.read(); if (value.done) break;
      total += value.value.byteLength; if (total > 262144) throw new ProfileLocationError("unknown"); chunks.push(value.value); }
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch { throw new ProfileLocationError("unknown"); }
  finally { void reader.cancel().catch(() => {}); }
}
async function post(action: "suggest" | "save", body: object, context: ProfileEditorContext, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`/api/v2/profile-location/${action}`, { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
    headers: { ...safeHeaders, Authorization: `Bearer ${context.accessToken}` }, body: JSON.stringify(body), signal });
  const value = await responseJson(response);
  if (!response.ok) {
    const row = value as Record<string, unknown> | null;
    const kind = row && typeof row === "object" && !Array.isArray(row) && Object.keys(row).length === 1
      && typeof row.error === "string" && knownErrors.includes(row.error as ProfileLocationFailureKind) ? row.error as ProfileLocationFailureKind : "unknown";
    throw new ProfileLocationError(kind);
  }
  return value;
}
export async function readProfileLocation(context: ProfileEditorContext) {
  return withinRequest(context, async signal => {
    const { data, error } = await supabaseBrowserClient.rpc("get_my_profile_editor_v2", profileActorArgs(context))
      .setHeader("Authorization", `Bearer ${context.accessToken}`).abortSignal(signal);
    if (error) throw profileLocationFailure(error);
    return parseProfileLocationSnapshot(data, context);
  });
}
export async function saveProfileLocation(context: ProfileEditorContext, revision: string | null, save: ProfileLocationSave, identityType: ProfileIdentityType) {
  return withinRequest(context, async signal => {
    const checked = validateProfilePatch(save.profile, identityType);
    if (!checked.patch) throw new ProfileLocationError("invalid");
    const normalized = { ...save, profile: checked.patch };
    const value = await post("save", { user_id: context.userId, identity_id: context.identityId,
      expected_revision: revision, patch: checked.patch, location: save.command }, context, signal);
    const saved = parseProfileLocationSnapshot(value, context);
    if (saved.profile.identity_type !== identityType || saved.profile.revision === null || saved.profile.revision === revision
      || !profileLocationMatches(saved, normalized)) throw new ProfileLocationError("unknown");
    return saved;
  });
}
export async function suggestProfileLocation(context: ProfileEditorContext, request: LocationLookupRequest) {
  try {
    return await withinRequest(context, async signal => parseLocationSuggestions(await post("suggest", {
      user_id: context.userId, identity_id: context.identityId, country_code: request.countryCode,
      query: request.query, language: request.language,
    }, context, signal), request.countryCode), request.signal);
  } catch (error) {
    const kind = profileLocationFailure(error).kind;
    throw new LocationLookupFailure(["authChanged", "actorChanged", "forbidden", "invalid", "unavailable", "rateLimited"].includes(kind)
      ? kind as LocationLookupError : "unknown");
  }
}
export const profileLocationClient = { read: readProfileLocation, save: saveProfileLocation };
export type ProfileLocationClient = typeof profileLocationClient;
