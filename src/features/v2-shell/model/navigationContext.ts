const INTERNAL_ORIGIN = "https://selqiro.invalid";

/** A root-relative return target, normalized before route classification. */
export function safeInternalHref(value: string | null | undefined): string | null {
  if (
    !value || !value.startsWith("/") || value.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  ) return null;

  try {
    const destination = new URL(value, INTERNAL_ORIGIN);
    // Encoded separators must not acquire a different route after decoding.
    if (
      destination.origin !== INTERNAL_ORIGIN ||
      destination.pathname.startsWith("//") ||
      /%(?:2f|5c)/i.test(destination.pathname) ||
      /[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(destination.pathname))
    ) return null;

    return destination.pathname + destination.search + destination.hash;
  } catch {
    return null;
  }
}

export function isV2Pathname(pathname: string | null): boolean {
  return pathname === "/v2" || !!pathname?.startsWith("/v2/");
}

/** Private V2 destinations are valid after login, but never public fallbacks. */
export function v2ReturnHref(value: string | null | undefined): string | null {
  const href = safeInternalHref(value);
  return href && isV2Pathname(new URL(href, INTERNAL_ORIGIN).pathname) ? href : null;
}

export function publicV2Href(value: string | null | undefined): string | null {
  const href = v2ReturnHref(value);
  if (!href) return null;

  const pathname = new URL(href, INTERNAL_ORIGIN).pathname;
  return /^\/v2(?:\/(?:products|services))?\/?$/.test(pathname) ||
    /^\/v2\/(?:profile|listing|service|showcase)\/[^/]+\/?$/.test(pathname)
    ? href
    : null;
}
