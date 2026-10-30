import { contactFail, isConversationId } from "./listingContact";
export { isConversationId as messageId } from "./listingContact";

export function messageUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
    && value !== "00000000-0000-0000-0000-000000000000";
}
export function messageRecord(value: unknown, keys: readonly string[], code: "input" | "response"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype
    || Reflect.ownKeys(value).some(key => typeof key !== "string")
    || Object.values(Object.getOwnPropertyDescriptors(value)).some(d => !("value" in d) || !d.enumerable)
    || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) return contactFail(code);
  return value as Record<string, unknown>;
}
export function messageText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && !value.includes("\0") && Array.from(value).length <= maximum
    && !Array.from(value).some(ch => { const n = ch.codePointAt(0)!; return n >= 0xd800 && n <= 0xdfff; });
}
export const messageLabel = (value: unknown, maximum: number) => value === null || messageText(value, maximum);

/** Preserve PostgreSQL's microseconds: Date.parse alone merges distinct activity cursors. */
export function messageInstant(value: unknown): bigint | null {
  if (typeof value !== "string" || value.length > 64) return null;
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!m) return null;
  const whole = Date.parse(m[1] + m[3]);
  return Number.isFinite(whole) ? BigInt(whole) * BigInt(1000) + BigInt((m[2] || "").padEnd(6, "0")) : null;
}
export function messageCursor(value: unknown, code: "input" | "response") {
  const r = messageRecord(value, ["updated_at", "conversation_id"], code);
  if (messageInstant(r.updated_at) === null || !isConversationId(r.conversation_id)) return contactFail(code);
  return Object.freeze({ updated_at: r.updated_at as string, conversation_id: r.conversation_id });
}

/** Restrict private-chat avatar requests to this application's known public storage. */
export function safeMessageAvatar(value: string | null): string | null {
  if (!value || value.length > 4096 || /[\u0000-\u0020\\]/.test(value)) return null;
  try {
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    const url = new URL(value);
    return project.protocol === "https:" && url.protocol === "https:" && url.origin === project.origin
      && !url.username && !url.password && !url.search && !url.hash
      && url.pathname.startsWith("/storage/v1/object/public/") ? url.href : null;
  } catch { return null; }
}
