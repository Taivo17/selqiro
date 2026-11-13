export const PROVIDER_CONTROL_TARGET_TYPES = [
  "listing", "horse_offer", "service", "profile", "hidden_provider", "blocked_account", "conversation",
] as const;
export type ProviderControlTargetType = typeof PROVIDER_CONTROL_TARGET_TYPES[number];
export type ProviderControlTarget = Readonly<{ type: ProviderControlTargetType; id: string }>;
export type ProviderControlAction = "hide" | "unhide" | "block" | "unblock";
export type ProviderControlKind = "hidden" | "blocked";
export type ProviderControlActor = Readonly<{ userId: string; accessToken: string }>;
export const PROVIDER_CONTROLS_PAGE_SIZE = 25;

export type ProviderControlState = Readonly<{
  actorUserId: string;
  target: ProviderControlTarget;
  targetToken: string | null;
  targetAvailable: boolean;
  provider: Readonly<{ identityId: string | null; displayName: string; slug: string | null; avatarUrl: string | null }>;
  hiddenUntil: string | null;
  hidden: boolean;
  hideRevision: string | null;
  blockedByMe: boolean;
  blockedByOther: boolean;
  blockId: string | null;
  blockCreatedAt: string | null;
  canHide: boolean;
  canBlock: boolean;
  serverNow: string;
}>;
export type ProviderControlReceipt = ProviderControlState & Readonly<{ action: ProviderControlAction; changed: boolean }>;
export type ProviderControlPage = Readonly<{
  actorUserId: string; kind: ProviderControlKind; items: readonly ProviderControlState[];
  totalCount: string; limit: number; offset: number; hasMore: boolean; nextOffset: number | null;
}>;
export type ProviderControlsErrorCode = "input" | "configuration" | "unauthorized" | "context_changed"
  | "refused" | "stale" | "unavailable" | "outcome_unknown" | "aborted" | "invalid_response";
export class ProviderControlsError extends Error {
  readonly name = "ProviderControlsError";
  constructor(readonly code: ProviderControlsErrorCode, readonly attemptedRevision?: string) {
    super(code);
  }
}

export function isProviderControlUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
}
export function isProviderControlInteger(value: unknown, signed = false): value is string {
  if (typeof value !== "string" || !(signed ? /^(?:0|[1-9]\d{0,18}|-[1-9]\d{0,18})$/ : /^[1-9]\d{0,18}$/).test(value)) return false;
  return BigInt(value) <= BigInt("9223372036854775807") && BigInt(value) >= (signed ? BigInt("-9223372036854775808") : BigInt(1));
}
export function copyProviderControlTarget(value: ProviderControlTarget): ProviderControlTarget {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 2
      || !PROVIDER_CONTROL_TARGET_TYPES.includes(value.type)
      || !(value.type === "listing" ? isProviderControlInteger(value.id, true)
        : (value.type === "blocked_account" || value.type === "conversation") ? isProviderControlInteger(value.id) : isProviderControlUuid(value.id))) {
    throw new ProviderControlsError("input");
  }
  return Object.freeze({ type: value.type, id: value.id });
}
export function copyProviderControlActor(value: ProviderControlActor): ProviderControlActor {
  if (!value || !isProviderControlUuid(value.userId) || typeof value.accessToken !== "string"
      || !/^[A-Za-z0-9._-]{1,8192}$/.test(value.accessToken)) throw new ProviderControlsError("unauthorized");
  return Object.freeze({ userId: value.userId, accessToken: value.accessToken });
}
