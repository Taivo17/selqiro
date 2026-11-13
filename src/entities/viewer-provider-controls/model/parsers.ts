import { listingDeadlineMicros } from "../../listing/model/listingActivity";
import { PROVIDER_CONTROLS_PAGE_SIZE, ProviderControlsError, copyProviderControlTarget,
  isProviderControlInteger, isProviderControlUuid, type ProviderControlTarget, type ProviderControlState,
  type ProviderControlReceipt, type ProviderControlPage, type ProviderControlKind, type ProviderControlAction } from "./types";

function ensure(value: unknown): asserts value { if (!value) throw new ProviderControlsError("invalid_response"); }
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  ensure(value && typeof value === "object" && !Array.isArray(value));
  const row = value as Record<string, unknown>;
  ensure(Object.keys(row).length === keys.length && keys.every(key => Object.hasOwn(row, key)));
  return row;
}
function text(value: unknown, maximum = 4096): string { ensure(typeof value === "string" && value.length <= maximum); return value; }
function optionalText(value: unknown, maximum = 4096): string | null { return value === null ? null : text(value, maximum); }
function uuid(value: unknown): string | null { ensure(value === null || isProviderControlUuid(value)); return value; }
function bool(value: unknown): boolean { ensure(typeof value === "boolean"); return value; }
function timestamp(value: unknown): string {
  const result = text(value, 40);
  ensure(listingDeadlineMicros(result) !== null);
  return result;
}
/** Preserve the exact server string for CAS; JS millisecond rounding is never sent back. */
function micros(value: string): bigint {
  const result = listingDeadlineMicros(value); ensure(result !== null); return result;
}
function avatar(value: unknown): string | null {
  const url = optionalText(value, 4096);
  if (url === null) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? url : null;
  } catch { return null; }
}
const stateKeys = ["schema_version", "actor_user_id", "target_type", "target_id", "target_token", "target_available",
  "provider", "hidden_until", "hidden", "hide_revision", "blocked_by_me", "blocked_by_other", "block_id",
  "block_created_at", "can_hide", "can_block", "server_now"] as const;

export function parseProviderControlState(value: unknown, userId: string, target: ProviderControlTarget): ProviderControlState {
  const row = record(value, stateKeys);
  ensure(row.schema_version === 1 && isProviderControlUuid(userId) && row.actor_user_id === userId);
  ensure(row.target_type === target.type && row.target_id === target.id);
  const checkedTarget = copyProviderControlTarget(target);
  const token = optionalText(row.target_token, 64), available = bool(row.target_available);
  ensure(token === null || /^[0-9a-f]{64}$/.test(token));
  ensure(available === (token !== null));
  const provider = record(row.provider, ["identity_id", "display_name", "slug", "avatar_url"]);
  const providerIdentityId = uuid(provider.identity_id), hiddenUntil = row.hidden_until === null ? null : timestamp(row.hidden_until);
  const hidden = bool(row.hidden), hideRevision = uuid(row.hide_revision), serverNow = timestamp(row.server_now);
  ensure(hidden === (hiddenUntil !== null && micros(hiddenUntil) > micros(serverNow)));
  ensure(hiddenUntil === null || hideRevision !== null);
  const blockedByMe = bool(row.blocked_by_me), blockedByOther = bool(row.blocked_by_other);
  const blockId = optionalText(row.block_id, 19), blockCreatedAt = row.block_created_at === null ? null : timestamp(row.block_created_at);
  ensure(blockId === null || isProviderControlInteger(blockId));
  ensure(blockedByMe === (blockId !== null) && blockedByMe === (blockCreatedAt !== null));
  const canHide = bool(row.can_hide), canBlock = bool(row.can_block);
  ensure(!canHide || (available && providerIdentityId !== null));
  ensure(available || (!canHide && !canBlock && !hidden && !blockedByMe));
  return Object.freeze({ actorUserId: userId, target: checkedTarget, targetToken: token, targetAvailable: available,
    provider: Object.freeze({ identityId: providerIdentityId, displayName: text(provider.display_name),
      slug: optionalText(provider.slug, 512), avatarUrl: avatar(provider.avatar_url) }),
    hiddenUntil, hidden, hideRevision, blockedByMe, blockedByOther, blockId, blockCreatedAt, canHide, canBlock, serverNow });
}

export function parseProviderControlReceipt(value: unknown, userId: string, target: ProviderControlTarget,
  action: ProviderControlAction): ProviderControlReceipt {
  const row = record(value, [...stateKeys, "action", "changed"]);
  ensure(row.action === action);
  const { action: ignoredAction, changed, ...state } = row; void ignoredAction;
  return Object.freeze({ ...parseProviderControlState(state, userId, target), action, changed: bool(changed) });
}

export function parseProviderControlPage(value: unknown, userId: string, kind: ProviderControlKind, offset: number): ProviderControlPage {
  const row = record(value, ["schema_version", "actor_user_id", "kind", "items", "total_count", "result_limit",
    "result_offset", "has_more", "next_offset"]);
  ensure(row.schema_version === 1 && row.actor_user_id === userId && row.kind === kind);
  ensure(row.result_limit === PROVIDER_CONTROLS_PAGE_SIZE && row.result_offset === offset && Array.isArray(row.items));
  const totalCount = text(row.total_count, 19);
  ensure(/^(?:0|[1-9]\d{0,18})$/.test(totalCount) && BigInt(totalCount) <= BigInt("9223372036854775807"));
  const total = BigInt(totalCount), remaining = total > BigInt(offset) ? total - BigInt(offset) : BigInt(0);
  ensure(row.items.length === (remaining > BigInt(PROVIDER_CONTROLS_PAGE_SIZE) ? PROVIDER_CONTROLS_PAGE_SIZE : Number(remaining)));
  const hasMore = total > BigInt(offset + PROVIDER_CONTROLS_PAGE_SIZE);
  const nextOffset = hasMore ? offset + PROVIDER_CONTROLS_PAGE_SIZE : null;
  ensure(row.has_more === hasMore && row.next_offset === nextOffset);
  const type = kind === "hidden" ? "hidden_provider" : "blocked_account";
  const items = row.items.map(item => {
    ensure(item && typeof item === "object" && !Array.isArray(item));
    const entry = item as Record<string, unknown>;
    ensure(entry.target_type === type && typeof entry.target_id === "string");
    const state = parseProviderControlState(item, userId, { type, id: entry.target_id });
    ensure(state.targetAvailable && (kind === "hidden" ? state.hidden : state.blockedByMe));
    return state;
  });
  ensure(new Set(items.map(item => item.target.id)).size === items.length);
  return Object.freeze({ actorUserId: userId, kind, items: Object.freeze(items), totalCount,
    limit: PROVIDER_CONTROLS_PAGE_SIZE, offset, hasMore, nextOffset });
}
