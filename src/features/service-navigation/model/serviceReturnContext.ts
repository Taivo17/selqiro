import { serviceUuid } from "../../../entities/service/model/publicService";
import { clearListingReturnContext } from "../../listing-navigation/model/listingReturnContext";

export type ServiceReturnSource = "public-profile" | "services";
export type ServiceReturnContext = Readonly<{
  version: 1; token: string; source: ServiceReturnSource; sourceUrl: string; serviceId: string;
  scrollY: number; cardViewportTop: number; createdAt: number; loadedOffset: number; targetOffset: number;
  profile: Readonly<{expanded: boolean; horizontalScrollLeft: number;
    selectedCategoryId?: string | null; expandedRootId?: string | null; resultOffset?: number}> | null;
}>;
type Entry = {role: "source" | "detail"; context: ServiceReturnContext};
type Pending = Entry & {targetUrl: string; sentAt: number};
const HISTORY_KEY = "__selqiroServiceReturnV1";
const PENDING_KEY = "selqiro:service-return-pending:v1";
const MAX_AGE = 2 * 60 * 60 * 1000;
let pendingMemory: Pending | null = null;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 10_000_000;
const browser = () => typeof window !== "undefined" && !!window.location && !!window.history;

export function currentServiceUrl(): string {
  return browser() ? window.location.pathname + window.location.search + window.location.hash : "";
}

function sourceUrl(value: unknown, source: ServiceReturnSource): string | null {
  if (!browser() || typeof value !== "string" || value.length > 8192 || /[\u0000-\u001f\u007f\\]/.test(value)) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.username || url.password) return null;
    if (source === "services" ? url.pathname !== "/v2/services" : !/^\/v2\/profile\/[^/]+$/.test(url.pathname)) return null;
    if (source === "public-profile" && /[/\\\u0000-\u001f]/.test(decodeURIComponent(url.pathname.slice("/v2/profile/".length)))) return null;
    return url.pathname + url.search + url.hash;
  } catch {return null;}
}

/** Whitelist UI metadata only. Public service records, descriptions and media never enter history. */
export function normalizeServiceReturnContext(value: unknown): ServiceReturnContext | null {
  if (!record(value) || value.version !== 1 || (value.source !== "public-profile" && value.source !== "services")
    || typeof value.token !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(value.token) || !serviceUuid(value.serviceId)
    || !finite(value.scrollY) || value.scrollY < 0 || !finite(value.cardViewportTop)
    || typeof value.createdAt !== "number" || !Number.isFinite(value.createdAt)
    || value.createdAt > Date.now() + 60_000 || Date.now() - value.createdAt > MAX_AGE
    || typeof value.loadedOffset !== "number" || !Number.isInteger(value.loadedOffset)
    || value.loadedOffset < 0 || value.loadedOffset > 1_000_000
    || typeof value.targetOffset !== "number" || !Number.isInteger(value.targetOffset)
    || value.targetOffset < 0 || value.targetOffset > value.loadedOffset) return null;
  const url = sourceUrl(value.sourceUrl, value.source);
  if (!url) return null;
  let profile: ServiceReturnContext["profile"] = null;
  if (value.source === "public-profile") {
    if (!record(value.profile) || typeof value.profile.expanded !== "boolean"
      || !finite(value.profile.horizontalScrollLeft) || value.profile.horizontalScrollLeft < 0 || value.loadedOffset !== 0) return null;
    const selectedCategoryId = value.profile.selectedCategoryId ?? null, expandedRootId = value.profile.expandedRootId ?? null;
    const resultOffset = value.profile.resultOffset ?? 0;
    if (selectedCategoryId !== null && !serviceUuid(selectedCategoryId) || expandedRootId !== null && !serviceUuid(expandedRootId)
      || typeof resultOffset !== "number" || !Number.isInteger(resultOffset) || resultOffset < 0 || resultOffset > 100000
      || !value.profile.expanded && (selectedCategoryId !== null || expandedRootId !== null || resultOffset !== 0)) return null;
    profile = {expanded: value.profile.expanded, horizontalScrollLeft: value.profile.horizontalScrollLeft,
      selectedCategoryId, expandedRootId, resultOffset};
  }
  return {version: 1, token: value.token, source: value.source, sourceUrl: url, serviceId: value.serviceId,
    scrollY: value.scrollY, cardViewportTop: value.cardViewportTop, createdAt: value.createdAt,
    loadedOffset: value.loadedOffset, targetOffset: value.targetOffset, profile};
}

function readEntry(): Entry | null {
  if (!browser()) return null;
  const state: unknown = window.history.state;
  const value = record(state) ? state[HISTORY_KEY] : null;
  if (!record(value) || (value.role !== "source" && value.role !== "detail")) return null;
  const context = normalizeServiceReturnContext(value.context);
  return context ? {role: value.role, context} : null;
}

function writeEntry(entry: Entry): void {
  if (!browser()) return;
  try {
    const previous: unknown = window.history.state;
    // Metadata-only replacement preserves Next's state and does not change the URL.
    window.history.replaceState({...(record(previous) ? previous : {}), [HISTORY_KEY]: entry}, "", window.location.href);
  } catch { /* Navigation remains available if browser history storage is unavailable. */ }
}

function writePending(value: Pending | null): void {
  pendingMemory = value;
  if (!browser()) return;
  try {
    if (value) window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(PENDING_KEY);
  } catch { /* The same-tab in-memory handoff also works with blocked storage. */ }
}

function takePending(role: Entry["role"], target: string): ServiceReturnContext | null {
  if (!browser()) return null;
  let value: unknown = pendingMemory;
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (raw && raw.length <= 12_000) value = JSON.parse(raw);
  } catch { /* Retain the in-memory handoff. */ }
  if (!record(value) || typeof value.sentAt !== "number" || Date.now() - value.sentAt > 30_000 || value.sentAt > Date.now() + 1000) {
    writePending(null); return null;
  }
  if (value.role !== role || value.targetUrl !== target) return null;
  const context = normalizeServiceReturnContext(value.context);
  writePending(null);
  return context;
}

export function saveServiceReturnContext(input: {
  source: ServiceReturnSource; serviceId: string; cardViewportTop: number;
  profile?: ServiceReturnContext["profile"]; loadedOffset?: number; targetOffset?: number;
}): ServiceReturnContext | null {
  if (!browser()) return null;
  const token = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const context = normalizeServiceReturnContext({version: 1, token, source: input.source,
    sourceUrl: currentServiceUrl(), serviceId: input.serviceId, scrollY: Math.max(0, window.scrollY),
    cardViewportTop: input.cardViewportTop, createdAt: Date.now(), loadedOffset: input.loadedOffset ?? 0,
    profile: input.profile ?? null, targetOffset: input.targetOffset ?? 0});
  if (!context) return null;
  if (context.source === "public-profile") clearListingReturnContext();
  writeEntry({role: "source", context});
  writePending({role: "detail", context, targetUrl: `/v2/service/${context.serviceId}`, sentAt: Date.now()});
  return context;
}

/** A snapshot belongs to this exact history entry and URL, not the last service visited. */
export function readServiceSourceReturn(source: ServiceReturnSource): ServiceReturnContext | null {
  const url = currentServiceUrl();
  const pending = takePending("source", url);
  if (pending && pending.source === source && pending.sourceUrl === url) writeEntry({role: "source", context: pending});
  const entry = readEntry();
  return entry?.role === "source" && entry.context.source === source && entry.context.sourceUrl === url ? entry.context : null;
}

export function readServiceDetailReturn(serviceId: string): ServiceReturnContext | null {
  if (currentServiceUrl() !== `/v2/service/${serviceId}`) return null;
  const pending = takePending("detail", currentServiceUrl());
  if (pending?.serviceId === serviceId) writeEntry({role: "detail", context: pending});
  const entry = readEntry();
  return entry?.role === "detail" && entry.context.serviceId === serviceId ? entry.context : null;
}

/** Explicit return uses a safe source Link; it never guesses the previous history URL. */
export function prepareServiceSourceReturn(context: ServiceReturnContext): void {
  const current = normalizeServiceReturnContext(context);
  if (current) writePending({role: "source", context: current, targetUrl: current.sourceUrl, sentAt: Date.now()});
}

/** Another profile content type now owns the source entry's return position. */
export function clearServiceReturnSource(): void {
  const entry = readEntry();
  if (!entry || entry.role !== "source" || entry.context.sourceUrl !== currentServiceUrl()) return;
  try {
    const previous: unknown = window.history.state;
    const next = {...(record(previous) ? previous : {})};
    delete next[HISTORY_KEY];
    window.history.replaceState(next, "", window.location.href);
  } catch { /* The other link must still navigate if history storage is blocked. */ }
  writePending(null);
}

export function isPlainServiceClick(event: {button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean}): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.defaultPrevented;
}
