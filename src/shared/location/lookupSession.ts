import { parseSelectedLocation, type LocationSuggestion } from "../../entities/location/model/location";
export type { LocationSuggestion } from "../../entities/location/model/location";
export type LocationLookupError = "authChanged" | "actorChanged" | "forbidden" | "invalid" | "unavailable" | "rateLimited" | "unknown";
export class LocationLookupFailure extends Error {
  constructor(readonly kind: LocationLookupError) { super(kind); this.name = "LocationLookupFailure"; }
}
export type LocationLookupRequest = Readonly<{ countryCode: string; query: string; language: "en" | "et"; signal: AbortSignal }>;
export type LocationLookup = (request: LocationLookupRequest) => Promise<readonly LocationSuggestion[]>;
export type LocationLookupInput = Readonly<{ countryCode: string | null; query: string; language: "en" | "et";
  actorKey: string; enabled: boolean; composing: boolean }>;
export type LocationLookupView = Readonly<{ key: string; status: "idle" | "loading" | "ready" | "error";
  suggestions: readonly LocationSuggestion[]; error: LocationLookupError | null }>;
const empty: LocationLookupView = Object.freeze({ key: "", status: "idle", suggestions: Object.freeze([]), error: null });

/** Preserve non-Latin characters. Neither transliteration nor an ASCII-only rank is needed. */
export function locationQuery(value: string): string { return value.normalize("NFKC").replace(/\s+/gu, " ").trim(); }
export function locationLookupKey(input: LocationLookupInput): string {
  return JSON.stringify([input.actorKey, input.countryCode, locationQuery(input.query), input.language, input.enabled, input.composing]);
}
export function parseLocationSuggestions(value: unknown, countryCode: string): readonly LocationSuggestion[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new LocationLookupFailure("unknown");
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== 1 || !Array.isArray(row.suggestions) || row.suggestions.length > 12) throw new LocationLookupFailure("unknown");
  const seen = new Set<string>();
  return Object.freeze(row.suggestions.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new LocationLookupFailure("unknown");
    const suggestion = item as Record<string, unknown>, location = parseSelectedLocation(suggestion.location);
    if (Object.keys(suggestion).length !== 3 || !["location", "proof", "expires_at"].every(key => Object.hasOwn(suggestion, key))
      || !location || location.country_code !== countryCode || typeof suggestion.proof !== "string"
      || !/^[A-Za-z0-9._-]{1,16384}$/.test(suggestion.proof) || !Number.isSafeInteger(suggestion.expires_at)
      || (suggestion.expires_at as number) <= 0 || seen.has(suggestion.proof)) throw new LocationLookupFailure("unknown");
    seen.add(suggestion.proof);
    return Object.freeze({ location, proof: suggestion.proof, expires_at: suggestion.expires_at as number });
  }));
}

/** Only the latest country/query/language/actor may publish suggestions. No automatic retries. */
export class LocationLookupSession {
  private view = empty;
  private listeners = new Set<() => void>();
  private ticket = 0;
  private controller: AbortController | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private live = true;
  constructor(private readonly lookup: LocationLookup, private readonly debounceMs = 400) {}
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(view: LocationLookupView) { this.view = Object.freeze(view); for (const listener of this.listeners) listener(); }
  private cancel() { ++this.ticket; if (this.timer !== null) clearTimeout(this.timer); this.timer = null; this.controller?.abort(); this.controller = null; }
  update(input: LocationLookupInput) {
    if (!this.live) return;
    const key = locationLookupKey(input);
    if (key === this.view.key) return;
    this.cancel();
    const query = locationQuery(input.query), countryCode = input.countryCode;
    if (!input.enabled || input.composing || !input.actorKey || !countryCode || !/^[A-Z]{2}$/.test(countryCode)
      || Array.from(query).length < 2 || Array.from(query).length > 120 || /[\u0000-\u001f\u007f]/.test(query)) {
      this.emit({ ...empty, key }); return;
    }
    const ticket = this.ticket, controller = new AbortController(); this.controller = controller;
    this.emit({ key, status: "loading", suggestions: Object.freeze([]), error: null });
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.lookup({ countryCode, query, language: input.language, signal: controller.signal }).then(suggestions => {
        if (!this.live || ticket !== this.ticket || controller.signal.aborted) return;
        if (suggestions.some(value => value.location.country_code !== countryCode)) throw new LocationLookupFailure("unknown");
        this.emit({ key, status: "ready", suggestions: Object.freeze([...suggestions]), error: null });
      }).catch(error => {
        if (!this.live || ticket !== this.ticket || controller.signal.aborted) return;
        this.emit({ key, status: "error", suggestions: Object.freeze([]), error: error instanceof LocationLookupFailure ? error.kind : "unknown" });
      });
    }, this.debounceMs);
  }
  /** Same input may be retried only following a deliberate user action. */
  retry(input: LocationLookupInput) { if (!this.live) return; this.cancel(); this.view = empty; this.update(input); }
  suspend() { this.cancel(); this.view = empty; }
  retire() { this.live = false; this.cancel(); this.listeners.clear(); }
}
