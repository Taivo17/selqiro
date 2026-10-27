/** Stable public WEB route emitted by the existing publication writer. Never accept
 * an arbitrary relative path, protocol-relative URL, token query, or SOURCE path. */
export function managedListingMedia(value: unknown): {attemptId: string; ordinal: string} | null {
  if (typeof value !== "string") return null;
  const match = /^\/api\/v2\/listing-media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([0-9])$/.exec(value);
  return match && match[1] !== "00000000-0000-0000-0000-000000000000" ? {attemptId: match[1], ordinal: match[2]} : null;
}
export function listingImageUrl(value: string | null): string | null {
  if (!value) return null;
  if (managedListingMedia(value)) return value;
  try { const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password ? u.href : null;
  } catch { return null; }
}
