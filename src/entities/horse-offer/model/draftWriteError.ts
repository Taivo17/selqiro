/** Only an explicit PostgreSQL rejection proves that the RPC did not commit. */
export class HorseDraftWriteError extends Error {
  constructor(
    message: string,
    readonly outcome: "not_sent" | "rejected" | "unknown",
    readonly code: string | null = null,
    readonly knownOfferId: string | null = null,
  ) {
    super(message);
    this.name = "HorseDraftWriteError";
  }
}
export function horseDraftRpcError(error: { code?: string | null; message?: string | null }) {
  // Connection/PostgREST/transport errors are intentionally NOT in this list.
  const rejected = ["22023", "23514", "23503", "23502", "23505", "42501", "P0001", "55000", "40001", "54000"];
  const code = error.code || null;
  return new HorseDraftWriteError("Mustandi salvestus ei õnnestunud.",
    code && rejected.includes(code) ? "rejected" : "unknown", code);
}

export type HorseDraftRpcResult = {
  data: unknown;
  error: { code?: string | null; message?: string | null } | null;
};
export function singleHorseDraftRow(data: unknown): Record<string, unknown> | null {
  if (!Array.isArray(data) || data.length !== 1) return null;
  const row: unknown = data[0];
  return row !== null && typeof row === "object" && !Array.isArray(row)
    ? row as Record<string, unknown> : null;
}
