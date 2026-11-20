/** Separate from text-profile revisions: a staged image is not a saved profile. */
export const PROFILE_MEDIA_LIMITS = Object.freeze({ originalBytes: 32 * 1024 * 1024, originalPixels: 64000000,
  sourceBytes: 2 * 1024 * 1024, requestBytes: 3 * 1024 * 1024, inputEdge: 4096, inputPixels: 8000000,
  avatarEdge: 512, avatarBytes: 512 * 1024, coverEdge: 2560, coverBytes: 2 * 1024 * 1024 });
export type ProfileMediaProblem = "input" | "configuration" | "unauthorized" | "context_changed" | "refused" | "rate_limited"
  | "outcome_unknown" | "response" | "aborted";
export class ProfileMediaError extends Error {
  constructor(readonly code: ProfileMediaProblem) { super("profile_media_" + code); this.name = "ProfileMediaError"; }
}
export const profileMediaFail = (code: ProfileMediaProblem): never => { throw new ProfileMediaError(code); };
export type ProfileMediaSlot = "avatar" | "cover";
export type ProfileMediaActor = Readonly<{ expectedUserId: string; expectedIdentityId: string }>;
export type ProfileMediaAsset = Readonly<{ asset_id: string | null; url: string; width: number | null; height: number | null }>;
export type ProfileMediaSnapshot = Readonly<{ user_id: string; identity_id: string; revision: string | null;
  avatar: ProfileMediaAsset | null; cover: ProfileMediaAsset | null; focus_x: number; focus_y: number; zoom: number }>;
export type ProfileMediaUploadCommand = ProfileMediaActor & Readonly<{ expectedRevision: string | null; assetId: string; slot: ProfileMediaSlot }>;
export type ProfileMediaUploadBody = ProfileMediaUploadCommand & Readonly<{ imageBase64: string; sourceSha256: string;
  sourceBytes: number; sourceMime: "image/jpeg" | "image/png" | "image/webp" }>;
export type ProfileMediaUpdateCommand = ProfileMediaActor & Readonly<{ expectedRevision: string | null; slot: ProfileMediaSlot;
  action: "set" | "remove" | "position"; assetId: string | null; focusX: number; focusY: number; zoom: number }>;
export type ProfileMediaUploadReceipt = Readonly<{ user_id: string; identity_id: string; asset_id: string; slot: ProfileMediaSlot;
  status: "ready"; url: string; width: number; height: number }>;

export function profileMediaUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
    && value !== "00000000-0000-0000-0000-000000000000";
}
export function profileMediaRecord(value: unknown, keys: readonly string[], code: "input" | "response" = "input"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype
    || Reflect.ownKeys(value).some(k => typeof k !== "string")
    || Object.values(Object.getOwnPropertyDescriptors(value)).some(d => !("value" in d) || !d.enumerable)
    || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) return profileMediaFail(code);
  return value as Record<string, unknown>;
}
const ACTOR_KEYS = ["expectedUserId", "expectedIdentityId"];
function actor(r: Record<string, unknown>) {
  if (!profileMediaUuid(r.expectedUserId) || !profileMediaUuid(r.expectedIdentityId)) profileMediaFail("input");
}
function revision(value: unknown): boolean { return value === null || profileMediaUuid(value); }
function slot(value: unknown): value is ProfileMediaSlot { return value === "avatar" || value === "cover"; }
function integer(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}
export function profileMediaFit(x: unknown, y: unknown, zoom: unknown): boolean {
  return integer(x, 0, 1000) && integer(y, 0, 1000) && integer(zoom, 1000, 2000);
}
export function copyProfileMediaActor(value: unknown): ProfileMediaActor {
  const r = profileMediaRecord(value, ACTOR_KEYS); actor(r);
  return Object.freeze({ ...r }) as ProfileMediaActor;
}
export function copyProfileMediaUploadCommand(value: unknown): ProfileMediaUploadCommand {
  const r = profileMediaRecord(value, [...ACTOR_KEYS, "expectedRevision", "assetId", "slot"]); actor(r);
  if (!revision(r.expectedRevision) || !profileMediaUuid(r.assetId) || !slot(r.slot)) return profileMediaFail("input");
  return Object.freeze({ ...r }) as ProfileMediaUploadCommand;
}
export function copyProfileMediaUploadBody(value: unknown): ProfileMediaUploadBody {
  const r = profileMediaRecord(value, [...ACTOR_KEYS, "expectedRevision", "assetId", "slot", "imageBase64", "sourceSha256", "sourceBytes", "sourceMime"]);
  actor(r);
  if (!revision(r.expectedRevision) || !profileMediaUuid(r.assetId) || !slot(r.slot)
    || !integer(r.sourceBytes, 1, PROFILE_MEDIA_LIMITS.sourceBytes) || !["image/jpeg", "image/png", "image/webp"].includes(String(r.sourceMime))
    || typeof r.sourceSha256 !== "string" || !/^[0-9a-f]{64}$/.test(r.sourceSha256)
    || typeof r.imageBase64 !== "string" || r.imageBase64.length !== 4 * Math.ceil(Number(r.sourceBytes) / 3)
    || !/^[A-Za-z0-9+/]*={0,2}$/.test(r.imageBase64)) return profileMediaFail("input");
  return Object.freeze({ ...r }) as ProfileMediaUploadBody;
}
export function copyProfileMediaUpdateCommand(value: unknown): ProfileMediaUpdateCommand {
  const r = profileMediaRecord(value, [...ACTOR_KEYS, "expectedRevision", "slot", "action", "assetId", "focusX", "focusY", "zoom"]);
  actor(r);
  if (!revision(r.expectedRevision) || !slot(r.slot) || !["set", "remove", "position"].includes(String(r.action))
    || !profileMediaFit(r.focusX, r.focusY, r.zoom)
    || (r.action === "remove" ? r.assetId !== null : !profileMediaUuid(r.assetId))
    || (r.action === "position" && r.slot !== "cover")
    || ((r.slot === "avatar" || r.action === "remove") && (r.focusX !== 500 || r.focusY !== 500 || r.zoom !== 1000))) return profileMediaFail("input");
  return Object.freeze({ ...r }) as ProfileMediaUpdateCommand;
}
export function profileMediaObjectName(identityId: string, assetId: string): string {
  if (!profileMediaUuid(identityId) || !profileMediaUuid(assetId)) return profileMediaFail("input");
  return "managed-profile-v1/" + identityId + "/" + assetId + ".webp";
}
function safeUrl(value: unknown): URL | null {
  if (typeof value !== "string" || !value || value.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  try { const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !!url.hostname && !url.username && !url.password ? url : null;
  } catch { return null; }
}
function asset(value: unknown, c: ProfileMediaActor, kind: ProfileMediaSlot, projectOrigin?: string): ProfileMediaAsset | null {
  if (value === null) return null;
  const r = profileMediaRecord(value, ["asset_id", "url", "width", "height"], "response");
  if (r.asset_id === null) {
    if (r.width !== null || r.height !== null || typeof r.url !== "string") return profileMediaFail("response");
    // A broken legacy reference must not prevent its owner from choosing a new
    // image. Only this presentation value is hidden; no old row/file is changed.
    if (!safeUrl(r.url)) return null;
  } else {
    const url = safeUrl(r.url);
    if (!url) return profileMediaFail("response");
    const edge = kind === "avatar" ? PROFILE_MEDIA_LIMITS.avatarEdge : PROFILE_MEDIA_LIMITS.coverEdge;
    if (!profileMediaUuid(r.asset_id) || !integer(r.width, 1, edge) || !integer(r.height, 1, edge)
      || url.pathname !== "/storage/v1/object/public/identity-media/" + profileMediaObjectName(c.expectedIdentityId, r.asset_id)
      || url.search || url.hash || (projectOrigin !== undefined && url.origin !== projectOrigin)) return profileMediaFail("response");
  }
  return Object.freeze({ ...r }) as ProfileMediaAsset;
}
export function parseProfileMediaSnapshot(value: unknown, c: ProfileMediaActor, projectOrigin?: string): ProfileMediaSnapshot {
  const r = profileMediaRecord(value, ["user_id", "identity_id", "revision", "avatar", "cover", "focus_x", "focus_y", "zoom"], "response");
  if (r.user_id !== c.expectedUserId || r.identity_id !== c.expectedIdentityId || !revision(r.revision)
    || !profileMediaFit(r.focus_x, r.focus_y, r.zoom)) return profileMediaFail("response");
  return Object.freeze({ ...r, avatar: asset(r.avatar, c, "avatar", projectOrigin), cover: asset(r.cover, c, "cover", projectOrigin) }) as ProfileMediaSnapshot;
}
export function parseProfileMediaUploadReceipt(value: unknown, c: ProfileMediaUploadCommand, projectOrigin?: string): ProfileMediaUploadReceipt {
  const r = profileMediaRecord(value, ["user_id", "identity_id", "asset_id", "slot", "status", "url", "width", "height"], "response");
  if (r.user_id !== c.expectedUserId || r.identity_id !== c.expectedIdentityId || r.asset_id !== c.assetId || r.slot !== c.slot || r.status !== "ready")
    return profileMediaFail("response");
  asset({ asset_id: r.asset_id, url: r.url, width: r.width, height: r.height }, c, c.slot, projectOrigin);
  return Object.freeze({ ...r }) as ProfileMediaUploadReceipt;
}
