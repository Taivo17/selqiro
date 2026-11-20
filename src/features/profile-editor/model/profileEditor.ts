import { publicProfileWebsite } from "../../../entities/profile/model/publicProfileFields";

export type ProfileIdentityType = "private" | "business";
export type ProfileVisibility = "hidden" | "city" | "exact";
export type ProfileEditorPatch = Readonly<{
  display_name: string; bio: string; website_url: string; country: string; city: string;
  address_text: string; location_visibility: ProfileVisibility;
}>;
export type ProfileEditorSnapshot = ProfileEditorPatch & Readonly<{
  user_id: string; identity_id: string; identity_type: ProfileIdentityType;
  revision: string | null; slug: string | null;
}>;
export type ProfileEditorActor = Readonly<{userId: string; identityId: string}>;
export type ProfileEditorContext = ProfileEditorActor & Readonly<{accessToken: string; signal: AbortSignal}>;
export type ProfileEditorFailureKind = "authChanged" | "actorChanged" | "forbidden" | "conflict" | "invalid" | "unknown";
export class ProfileEditorError extends Error {
  constructor(readonly kind: ProfileEditorFailureKind) { super(kind); this.name = "ProfileEditorError"; }
}
export const PROFILE_FIELDS = ["display_name", "bio", "website_url", "country", "city", "address_text", "location_visibility"] as const;
export const PROFILE_LIMITS = {display_name: 100, bio: 2000, website_url: 2048, country: 100, city: 120, address_text: 240} as const;
export type ProfileEditorField = keyof ProfileEditorPatch;
export type ProfileEditorFieldError = "required" | "tooLong" | "invalidWebsite" | "invalidLocation" | "privateAddress";
export type ProfileEditorErrors = Partial<Record<ProfileEditorField, ProfileEditorFieldError>>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const profileUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value)
  && value !== "00000000-0000-0000-0000-000000000000";
const SNAPSHOT_KEYS = [...PROFILE_FIELDS, "user_id", "identity_id", "identity_type", "revision", "slug"];

export function profileActorArgs(actor: ProfileEditorActor) {
  if (!profileUuid(actor.userId) || !profileUuid(actor.identityId)) throw new ProfileEditorError("authChanged");
  return {p_expected_user_id: actor.userId, p_expected_identity_id: actor.identityId};
}

export function profilePatch(snapshot: ProfileEditorPatch): ProfileEditorPatch {
  return Object.freeze({display_name: snapshot.display_name, bio: snapshot.bio, website_url: snapshot.website_url,
    country: snapshot.country, city: snapshot.city, address_text: snapshot.address_text,
    location_visibility: snapshot.location_visibility});
}
export function sameProfilePatch(a: ProfileEditorPatch, b: ProfileEditorPatch): boolean {
  return PROFILE_FIELDS.every(field => a[field] === b[field]);
}
export function parseProfileSnapshot(value: unknown, actor: ProfileEditorActor): ProfileEditorSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProfileEditorError("unknown");
  const row = value as Record<string, unknown>, keys = Object.keys(row);
  if (keys.length !== SNAPSHOT_KEYS.length || keys.some(key => !SNAPSHOT_KEYS.includes(key as typeof SNAPSHOT_KEYS[number]))
    || row.user_id !== actor.userId || row.identity_id !== actor.identityId
    || !profileUuid(row.user_id) || !profileUuid(row.identity_id)
    || (row.identity_type !== "private" && row.identity_type !== "business")
    || (row.revision !== null && !profileUuid(row.revision))
    || (row.slug !== null && (typeof row.slug !== "string" || !row.slug.trim()))
    || !PROFILE_FIELDS.every(field => typeof row[field] === "string")
    || !["hidden", "city", "exact"].includes(row.location_visibility as string)
    || (row.identity_type === "private" && (row.address_text !== "" || row.location_visibility === "exact"))) {
    throw new ProfileEditorError("unknown");
  }
  return Object.freeze({...row}) as ProfileEditorSnapshot;
}

/** A closed, text-only payload. Identity, slug, plan, media and contact fields cannot be written here. */
export function validateProfilePatch(value: unknown, identityType: ProfileIdentityType): {
  patch: ProfileEditorPatch | null; errors: ProfileEditorErrors;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {patch: null, errors: {display_name: "required"}};
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== PROFILE_FIELDS.length || Object.keys(row).some(key => !PROFILE_FIELDS.includes(key as ProfileEditorField))
    || !PROFILE_FIELDS.every(key => typeof row[key] === "string")) return {patch: null, errors: {display_name: "required"}};
  // Match the server's line-ending normalization before binding the acknowledgement.
  const patch = Object.fromEntries(PROFILE_FIELDS.map(key => [key, (key === "bio"
    ? (row[key] as string).replace(/\r\n?/g, "\n") : row[key] as string).trim()])) as unknown as ProfileEditorPatch;
  const errors: ProfileEditorErrors = {};
  for (const key of Object.keys(PROFILE_LIMITS) as (keyof typeof PROFILE_LIMITS)[]) {
    if (Array.from(patch[key]).length > PROFILE_LIMITS[key]) errors[key] = "tooLong";
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(patch[key])
      || (key !== "bio" && /[\r\n\t]/.test(patch[key]))) errors[key] = key === "website_url" ? "invalidWebsite" : "invalidLocation";
  }
  if (!patch.display_name) errors.display_name = "required";
  if (patch.website_url && !publicProfileWebsite(patch.website_url)) errors.website_url = "invalidWebsite";
  if (!["hidden", "city", "exact"].includes(patch.location_visibility)) errors.location_visibility = "invalidLocation";
  if (identityType === "private" && (patch.address_text || patch.location_visibility === "exact")) errors.address_text = "privateAddress";
  if (patch.location_visibility === "exact") {
    for (const field of ["country", "city", "address_text"] as const) if (!patch[field]) errors[field] = "required";
  }
  return {patch: Object.keys(errors).length ? null : Object.freeze(patch), errors};
}

export function profileSaveArgs(actor: ProfileEditorActor, revision: string | null, patch: ProfileEditorPatch, identityType: ProfileIdentityType) {
  const args = profileActorArgs(actor), checked = validateProfilePatch(patch, identityType);
  if ((revision !== null && !profileUuid(revision)) || !checked.patch) throw new ProfileEditorError("invalid");
  return {...args, p_expected_revision: revision, p_patch: checked.patch};
}

export function profileEditorFailure(error: unknown): ProfileEditorError {
  if (error instanceof ProfileEditorError) return error;
  const detail = error as {code?: unknown; message?: unknown} | null;
  const known = [
    ["42501", "PROFILE_EDITOR_AUTH_CHANGED", "authChanged"],
    ["42501", "PROFILE_EDITOR_ACTOR_CHANGED", "actorChanged"],
    ["42501", "PROFILE_EDITOR_FORBIDDEN", "forbidden"],
    ["40001", "PROFILE_EDITOR_CONFLICT", "conflict"],
    ["22023", "PROFILE_EDITOR_INVALID_INPUT", "invalid"],
  ] as const;
  const match = known.find(([code, message]) => detail?.code === code && detail?.message === message);
  return new ProfileEditorError(match?.[2] ?? "unknown");
}
