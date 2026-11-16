import { HOSTED_PORTAL_ORIGIN } from "../config/hostedPreviewProtocol";
import type { OfferKind } from "../marketplace/offerTheme";
import { listingId } from "../../entities/listing/model/publicRead/priceRead";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Only a content kind and its identifier select a public route. No return URL,
 * current location, identity, session, search terms or fragment is copied. */
export function publicOfferPath(kind: OfferKind, id: string): string | null {
  if (typeof id !== "string") return null;
  if (kind === "listing") {
    try { return "/v2/listing/" + listingId(id); } catch { return null; }
  }
  if (!uuid.test(id) || id === "00000000-0000-0000-0000-000000000000") return null;
  if (kind === "horse") return "/v2/horse-offer/" + id;
  if (kind === "service") return "/v2/service/" + id;
  if (kind === "job") return "/v2/job/" + id;
  return null;
}

export function publicOfferUrl(kind: OfferKind, id: string): string | null {
  const path = publicOfferPath(kind, id);
  return path ? HOSTED_PORTAL_ORIGIN + path : null;
}
