import "server-only";

export type LocationFailure = "authChanged" | "actorChanged" | "forbidden" | "conflict" | "invalid" | "unknown"
  | "selectionExpired" | "unavailable" | "rateLimited";
export class LocationError extends Error {
  constructor(readonly code: LocationFailure) { super(code); this.name = "LocationError"; }
}
export function locationFail(code: LocationFailure): never { throw new LocationError(code); }
export function databaseLocationError(value: unknown): LocationError {
  const row = value as {code?: unknown; message?: unknown} | null;
  const known = [
    ["42501", "PROFILE_EDITOR_AUTH_CHANGED", "authChanged"],
    ["42501", "PROFILE_EDITOR_ACTOR_CHANGED", "actorChanged"],
    ["42501", "PROFILE_EDITOR_FORBIDDEN", "forbidden"],
    ["40001", "PROFILE_EDITOR_CONFLICT", "conflict"],
    ["22023", "PROFILE_EDITOR_INVALID_INPUT", "invalid"],
    ["22023", "LOCATION_SELECTION_EXPIRED", "selectionExpired"],
    ["54000", "LOCATION_RATE_LIMITED", "rateLimited"],
  ] as const;
  return new LocationError(known.find(([code, message]) => row?.code === code && row?.message === message)?.[2] ?? "unknown");
}
