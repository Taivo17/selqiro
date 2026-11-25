import { isConversationId } from "../../../entities/conversation/model/listingContact";
import { isMessageOffer, sameOfferOrigin, type MessageOfferIntent } from "../../../entities/conversation/model/offerMessaging";
import { messageUuid } from "../../../entities/conversation/model/messagingValidation";

type SearchQuery = Readonly<{ getAll(name: string): string[] }> | Readonly<Record<string, string | string[] | undefined>>;
function values(query: SearchQuery, name: string): readonly string[] {
  if (typeof query.getAll === "function") return query.getAll(name);
  const value = (query as Readonly<Record<string, string | string[] | undefined>>)[name];
  return typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
}
/** No ambiguous query is allowed to choose a message attachment. A legacy
 * numeric listing deep link is accepted only without either typed parameter. */
export function messageOfferOrigin(query: SearchQuery): MessageOfferIntent | null {
  const types = values(query, "offer_type"), ids = values(query, "offer_id"), listings = values(query, "listing"), entries = values(query, "offer_intent");
  if (entries.length > 1 || entries.length === 1 && !messageUuid(entries[0])) return null;
  if (types.length || ids.length) {
    return types.length === 1 && ids.length === 1 && listings.length === 0 && isMessageOffer(types[0], ids[0])
      ? Object.freeze({ type: types[0], id: ids[0], ...(entries.length ? { entryKey: entries[0] } : {}) }) : null;
  }
  return entries.length === 0 && listings.length === 1 && isConversationId(listings[0]) ? Object.freeze({ type: "listing", id: listings[0] }) : null;
}

export function offerConversationHref(conversationId: string, offer: MessageOfferIntent | null = null): string {
  const path = listingConversationHref(conversationId);
  if (offer === null) return path;
  if (!isMessageOffer(offer.type, offer.id) || offer.entryKey !== undefined && !messageUuid(offer.entryKey)) throw new Error("invalid_conversation_location");
  return path + "?offer_type=" + offer.type + "&offer_id=" + offer.id + (offer.entryKey ? "&offer_intent=" + offer.entryKey : "");
}

/** Consuming an intent changes only the exact current origin, leaving a new
 * contact target and unrelated query/hash values intact. Native history keeps
 * the mounted text/photo draft and synchronizes Next's search parameters. */
export function consumeOfferOrigin(conversationId: string, offer: MessageOfferIntent | null): void {
  if (!offer || typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.pathname !== listingConversationHref(conversationId) || !sameOfferOrigin(messageOfferOrigin(url.searchParams), offer)) return;
  url.searchParams.delete("offer_type"); url.searchParams.delete("offer_id"); url.searchParams.delete("offer_intent"); url.searchParams.delete("listing");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

export function listingConversationHref(conversationId: string, listingId: string | null = null): string {
  if (!isConversationId(conversationId) || (listingId !== null && !isConversationId(listingId)))
    throw new Error("invalid_conversation_location");
  return "/v2/messages/" + conversationId + (listingId === null ? "" : "?listing=" + listingId);
}

/** Consume only this composer origin. Native history preserves the mounted
 * draft and Next's router state; an incoming different listing is left alone. */
export function consumeListingOrigin(conversationId: string, listingId: string | null): void {
  if (listingId === null || typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (url.pathname !== listingConversationHref(conversationId) || url.searchParams.getAll("listing").length !== 1
    || url.searchParams.get("listing") !== listingId) return;
  url.searchParams.delete("listing");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}
