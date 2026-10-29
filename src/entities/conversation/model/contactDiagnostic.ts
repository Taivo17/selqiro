/** Public diagnostics contain only these fixed labels and numeric HTTP status.
 * Never copy an upstream message, hint, detail, identifier or request body. */
const stages = ["request", "actor_check", "readiness", "service_auth", "rpc", "receipt",
  "browser_request", "browser_response"] as const;
const codes = ["input", "configuration", "unauthorized", "context_changed", "refused", "outcome_unknown",
  "response", "aborted", "integration_unverified", "origin", "not_found", "method"] as const;
const upstreamCodes = ["22023", "22P02", "23502", "23503", "23505", "23514", "25001", "25006",
  "40001", "40P01", "42501", "42702", "42703", "42704", "42883", "42P01", "53300", "53400",
  "54000", "55000", "55P03", "57014", "P0001", "PGRST000", "PGRST001", "PGRST002", "PGRST003",
  "PGRST100", "PGRST116", "PGRST202", "PGRST203", "PGRST204", "PGRST205", "PGRST301", "PGRST302", "PGRST303"] as const;

export type ListingContactStage = typeof stages[number];
export type ListingContactDiagnosticCode = typeof codes[number];
export type ListingContactUpstreamCode = typeof upstreamCodes[number];
export type ListingContactDiagnostic = Readonly<{ stage: ListingContactStage; code: ListingContactDiagnosticCode;
  status?: number; upstreamCode?: ListingContactUpstreamCode }>;

function member<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}
function dataRecord(value: unknown): Record<string, unknown> | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(value).some(key => typeof key !== "string")
      || Object.values(descriptors).some(d => !("value" in d) || !d.enumerable)) return null;
    return value as Record<string, unknown>;
  } catch { return null; }
}
export function parseContactDiagnostic(value: unknown): ListingContactDiagnostic | null {
  const r = dataRecord(value);
  if (!r || Object.keys(r).some(key => !["stage", "code", "status", "upstreamCode"].includes(key))
    || !member(stages, r.stage) || !member(codes, r.code)
    || ("status" in r && (!Number.isInteger(r.status) || Number(r.status) < 100 || Number(r.status) > 599))
    || ("upstreamCode" in r && (r.stage !== "rpc" || !member(upstreamCodes, r.upstreamCode)))) return null;
  return Object.freeze({ stage: r.stage, code: r.code,
    ...("status" in r ? { status: r.status as number } : {}),
    ...("upstreamCode" in r ? { upstreamCode: r.upstreamCode as ListingContactUpstreamCode } : {}) });
}
export function contactDiagnostic(stage: ListingContactStage, code: ListingContactDiagnosticCode,
    status?: number, upstreamBody?: unknown): ListingContactDiagnostic {
  const upstream = dataRecord(upstreamBody);
  return Object.freeze({ stage, code,
    ...(Number.isInteger(status) && Number(status) >= 100 && Number(status) <= 599 ? { status } : {}),
    ...(stage === "rpc" && upstream && member(upstreamCodes, upstream.code) ? { upstreamCode: upstream.code } : {}) });
}
/** Accept both the previous {error} envelope and the diagnostic envelope. */
export function readContactErrorDiagnostic(value: unknown, status: number): ListingContactDiagnostic | null {
  const r = dataRecord(value);
  if (!r || !member(codes, r.error) || Object.keys(r).some(key => !["error", "diagnostic"].includes(key))) return null;
  if (!("diagnostic" in r)) return contactDiagnostic("browser_response", r.error, status);
  const diagnostic = parseContactDiagnostic(r.diagnostic);
  return diagnostic && diagnostic.code === r.error ? diagnostic : null;
}
export function formatContactDiagnostic(value: unknown): string {
  const d = parseContactDiagnostic(value) ?? contactDiagnostic("browser_request", "outcome_unknown");
  const stage: Record<ListingContactStage, string> = { request: "REQUEST", actor_check: "ACTOR", readiness: "READY",
    service_auth: "AUTH", rpc: "RPC", receipt: "RECEIPT", browser_request: "CLIENT", browser_response: "REPLY" };
  const code: Record<ListingContactDiagnosticCode, string> = { input: "INPUT", configuration: "CONFIG",
    unauthorized: "AUTH", context_changed: "CONTEXT", refused: "REFUSED", outcome_unknown: "UNKNOWN",
    response: "RESPONSE", aborted: "ABORTED", integration_unverified: "UNVERIFIED", origin: "ORIGIN",
    not_found: "NOTFOUND", method: "METHOD" };
  return ["LC", stage[d.stage], code[d.code], ...(d.status === undefined ? [] : ["HTTP" + d.status]),
    ...(d.upstreamCode === undefined ? [] : [d.upstreamCode])].join("-");
}
