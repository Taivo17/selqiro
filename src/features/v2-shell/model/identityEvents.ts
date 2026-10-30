export const ACTIVE_IDENTITY_CHANGED_EVENT = "selqiro:active-identity-changed";
export const ACTIVE_IDENTITY_CHANGING_EVENT = "selqiro:active-identity-changing";
export const ACTIVE_IDENTITY_STORAGE_KEY = "selqiro:active-identity-version";

export type IdentityChange = Readonly<{ userId: string; operationId: string }>;
let pendingChange: IdentityChange | null = null;

/** Keep an in-flight change suspended across hook remounts and focus/token
 * refreshes. This local lease belongs to one account and one operation. */
export function identityChangePending(userId: string | null) {
  return pendingChange !== null && (userId === null || pendingChange.userId === userId);
}

export function beginIdentityChange(userId: string): IdentityChange {
  if (pendingChange) throw new Error("Identiteedi vahetamine juba käib.");
  const change = Object.freeze({ userId, operationId: crypto.randomUUID() });
  pendingChange = change;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ACTIVE_IDENTITY_CHANGING_EVENT));
  return change;
}

/** Auth callbacks may call this synchronously: it deliberately emits no event
 * and performs no auth/network work while Supabase holds its callback lock. */
export function retireIdentityChangeForAccount(userId: string | null) {
  if (pendingChange && pendingChange.userId !== userId) pendingChange = null;
}

export function finishIdentityChange(change: IdentityChange) {
  if (pendingChange !== change) return false;
  pendingChange = null;
  notifyIdentityResolutionNeeded();
  return true;
}

/** A cross-tab signal carries no account, identity or private content. */
export function notifyIdentityResolutionNeeded() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ACTIVE_IDENTITY_CHANGED_EVENT));
  try { window.localStorage.setItem(ACTIVE_IDENTITY_STORAGE_KEY, crypto.randomUUID()); }
  catch { /* Same-tab invalidation and next-focus verification still apply. */ }
}
