import { parseSelectedLocation, sameSelectedLocation, type LocationSuggestion, type SelectedLocation, type LocationCommand } from "../../../entities/location/model/location";
import { parseProfileSnapshot, profilePatch, sameProfilePatch, ProfileEditorError, type ProfileEditorActor,
  type ProfileEditorPatch, type ProfileEditorSnapshot } from "../../profile-editor/model/profileEditor";

export type ProfileLocationSnapshot = Readonly<{profile: ProfileEditorSnapshot; location: SelectedLocation | null}>;
export type ProfileLocationFailureKind = "authChanged" | "actorChanged" | "forbidden" | "conflict" | "invalid" | "unknown"
  | "selectionExpired" | "unavailable" | "rateLimited";
export class ProfileLocationError extends Error {
  constructor(readonly kind: ProfileLocationFailureKind) { super(kind); this.name = "ProfileLocationError"; }
}
export type ProfileLocationDraft = Readonly<{mode: "keep" | "editing" | "select" | "clear";
  countryCode: string | null; countryQuery: string; placeQuery: string; selection: LocationSuggestion | null}>;
export type ProfileLocationSave = Readonly<{profile: ProfileEditorPatch; command: LocationCommand; expectedLocation: SelectedLocation | null}>;

export function parseProfileLocationSnapshot(value: unknown, actor: ProfileEditorActor): ProfileLocationSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProfileLocationError("unknown");
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== 2 || !Object.hasOwn(row, "profile") || !Object.hasOwn(row, "location")) throw new ProfileLocationError("unknown");
  let profile: ProfileEditorSnapshot;
  try { profile = parseProfileSnapshot(row.profile, actor); } catch { throw new ProfileLocationError("unknown"); }
  const location = row.location === null ? null : parseSelectedLocation(row.location);
  if ((row.location !== null && !location) || (location && (profile.country !== location.country_name || profile.city !== location.place_name)))
    throw new ProfileLocationError("unknown");
  return Object.freeze({profile, location});
}
export function savedProfileLocationDraft(saved: ProfileLocationSnapshot): ProfileLocationDraft {
  return Object.freeze({mode: "keep", countryCode: saved.location?.country_code ?? null,
    countryQuery: saved.profile.country, placeQuery: saved.profile.city, selection: null});
}
export function expectedProfileLocation(saved: SelectedLocation | null, draft: ProfileLocationDraft): SelectedLocation | null {
  return draft.mode === "keep" ? saved : draft.mode === "select" ? draft.selection?.location ?? null : null;
}
export function profileLocationMatches(snapshot: ProfileLocationSnapshot, pending: ProfileLocationSave): boolean {
  return sameProfilePatch(snapshot.profile, pending.profile) && sameSelectedLocation(snapshot.location, pending.expectedLocation);
}
export function copyProfileLocationSave(profile: ProfileEditorPatch, draft: ProfileLocationDraft, saved: SelectedLocation | null): ProfileLocationSave {
  if (draft.mode === "editing" || (draft.mode === "select" && !draft.selection)) throw new ProfileLocationError("invalid");
  const command: LocationCommand = draft.mode === "select" ? Object.freeze({action: "select", proof: draft.selection!.proof})
    : Object.freeze({action: draft.mode === "clear" ? "clear" : "keep"});
  return Object.freeze({profile: profilePatch(profile), command, expectedLocation: expectedProfileLocation(saved, draft)});
}
export function profileLocationFailure(error: unknown): ProfileLocationError {
  if (error instanceof ProfileLocationError) return error;
  if (error instanceof ProfileEditorError) return new ProfileLocationError(error.kind);
  const row = error as {code?: unknown; message?: unknown} | null;
  const known = [
    ["42501", "PROFILE_EDITOR_AUTH_CHANGED", "authChanged"], ["42501", "PROFILE_EDITOR_ACTOR_CHANGED", "actorChanged"],
    ["42501", "PROFILE_EDITOR_FORBIDDEN", "forbidden"], ["40001", "PROFILE_EDITOR_CONFLICT", "conflict"],
    ["22023", "PROFILE_EDITOR_INVALID_INPUT", "invalid"],
  ] as const;
  return new ProfileLocationError(known.find(([code, message]) => row?.code === code && row?.message === message)?.[2] ?? "unknown");
}
