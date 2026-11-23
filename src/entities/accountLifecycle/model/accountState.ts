export type AccountState = Readonly<{
  schema_version: 1;
  actor_user_id: string;
  scope: "account";
  state: "active";
  revision: string;
  account_created_at: string | null;
  read_at: string;
}>;

export type AccountStateFailure = "authRequired" | "authChanged" | "unavailable" | "readError" | "cancelled";
export class AccountStateError extends Error {
  constructor(readonly kind: AccountStateFailure) {
    super(kind);
    this.name = "AccountStateError";
  }
}

export type AccountReadContext = Readonly<{
  userId: string;
  accessToken: string;
  signal: AbortSignal;
}>;

const keys = ["schema_version", "actor_user_id", "scope", "state", "revision", "account_created_at", "read_at"];
export function isAccountId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
    && value !== "00000000-0000-0000-0000-000000000000";
}
export function isAccountAccessToken(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 8192 && !/\s/.test(value);
}

function utcTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/.exec(value);
  if (!match) return false;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
    && hour <= 23 && minute <= 59 && second <= 59;
}

/** A strict account-only wire contract. Unknown state never falls back to active. */
export function parseAccountState(value: unknown, expectedUserId: string): AccountState {
  if (!isAccountId(expectedUserId) || !value || typeof value !== "object" || Array.isArray(value))
    throw new AccountStateError("readError");
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== keys.length || keys.some(key => !Object.prototype.hasOwnProperty.call(row, key))
    || row.schema_version !== 1 || row.scope !== "account" || row.state !== "active"
    || !isAccountId(row.actor_user_id) || typeof row.revision !== "string"
    || !/^[1-9][0-9]{0,18}$/.test(row.revision) || BigInt(row.revision) > BigInt("9223372036854775807")
    || (row.account_created_at !== null && !utcTimestamp(row.account_created_at)) || !utcTimestamp(row.read_at))
    throw new AccountStateError("readError");
  if (row.actor_user_id !== expectedUserId) throw new AccountStateError("authChanged");
  return Object.freeze({...row}) as AccountState;
}

/** Only fixed server tags influence the UI; provider details never become UI text. */
export function accountStateFailure(error: unknown): AccountStateError {
  if (error instanceof AccountStateError) return error;
  if (error && typeof error === "object") {
    const row = error as {code?: unknown; message?: unknown};
    if (row.code === "P0001") {
      if (row.message === "ACCOUNT_AUTH_REQUIRED") return new AccountStateError("authRequired");
      if (row.message === "ACCOUNT_ACTOR_MISMATCH") return new AccountStateError("authChanged");
      if (row.message === "ACCOUNT_UNAVAILABLE" || row.message === "ACCOUNT_STATE_UNAVAILABLE")
        return new AccountStateError("unavailable");
    }
    if (row.code === "42501" || row.code === "PGRST301" || row.code === "PGRST302")
      return new AccountStateError("authRequired");
  }
  return new AccountStateError("readError");
}
