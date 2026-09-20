export function shouldReloadIdentityScopedRoute(
  pathname: string | null
): boolean {
  if (!pathname) return false;
  // Only the revision-checked owner editor owns its unsaved identity context.
  if (/^\/v2\/my-area\/horse-offers\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/edit\/?$/i.test(pathname)) return false;

  if (
    pathname === "/v2/my-area" ||
    pathname.startsWith(
      "/v2/my-area/"
    )
  ) {
    return true;
  }

  if (
    pathname === "/v2/energy" ||
    pathname.startsWith(
      "/v2/energy/"
    )
  ) {
    return true;
  }

  /*
   * Listing ownership and owner-only content previews
   * depend on the active identity. Switching identity
   * must reload these detail routes.
   */
  if (
    pathname.startsWith(
      "/v2/listing/"
    ) ||
    pathname.startsWith(
      "/v2/showcase/"
    ) ||
    pathname.startsWith(
      "/v2/service/"
    )
  ) {
    return true;
  }

  /*
   * Public profile content remains keyed by its URL
   * slug. Switching the viewer identity must not
   * replace or navigate away from that public profile.
   */
  return false;
}
