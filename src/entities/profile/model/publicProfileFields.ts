/** Only ordinary external web links are shown. This does not certify a site's safety. */
export function publicProfileWebsite(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  if (!clean || clean.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(clean)
    || !/^https?:\/\//i.test(clean)) return null;
  try {
    const url = new URL(clean);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function publicBusinessAddress(row: {
  identity_type?: unknown; location_visibility?: unknown; address_text?: unknown;
}): string | null {
  return row.identity_type === "business" && row.location_visibility === "exact"
    && typeof row.address_text === "string" && row.address_text.trim()
    ? row.address_text.trim() : null;
}
