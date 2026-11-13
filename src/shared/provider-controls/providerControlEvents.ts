export type ProviderControlChange = "hidden" | "blocked";
export type ProviderReadScope = "discovery" | "visibility" | "all";
const storageKeys = {hidden: "selqiro:provider-hidden-version", blocked: "selqiro:provider-blocked-version"};
const revisions = {discovery: 0, visibility: 0, all: 0};
const listeners = new Set<{scope: ProviderReadScope; callback: () => void}>();
let attached = false, lastFocus = 0;
function emit(kind: ProviderControlChange) {
  revisions.all += 1; revisions.discovery += 1;
  if (kind === "blocked") revisions.visibility += 1;
  for (const listener of listeners) if (kind === "blocked" || listener.scope !== "visibility") listener.callback();
}
function storage(event: StorageEvent) {
  if (event.key === storageKeys.hidden) emit("hidden");
  else if (event.key === storageKeys.blocked || event.key === null) emit("blocked");
}
function focus() {
  if (document.visibilityState !== "visible" || Date.now() - lastFocus < 30000) return;
  lastFocus = Date.now(); emit("blocked");
}
/** Signals contain no account, target, name or private content. Other tabs reread
 * their own authorised state; no local preference is treated as server truth. */
export function notifyProviderControlsChanged(kind: ProviderControlChange) {
  emit(kind);
  if (typeof window !== "undefined") {
    try {window.localStorage.setItem(storageKeys[kind], crypto.randomUUID());} catch { /* Focus rechecks remain available. */ }
  }
}
export const providerControlRevision = (scope: ProviderReadScope) => revisions[scope];
export function subscribeProviderControlChanges(callback: () => void, scope: ProviderReadScope = "all") {
  const item = {scope, callback}; listeners.add(item);
  if (!attached && typeof window !== "undefined") {
    attached = true; lastFocus = Date.now();
    window.addEventListener("storage", storage); window.addEventListener("focus", focus); window.addEventListener("pageshow", focus);
  }
  return () => {listeners.delete(item); if (!listeners.size && attached) {
    attached = false; window.removeEventListener("storage", storage); window.removeEventListener("focus", focus); window.removeEventListener("pageshow", focus);
  }};
}
