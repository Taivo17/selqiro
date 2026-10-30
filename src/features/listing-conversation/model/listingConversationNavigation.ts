import { isConversationId } from "../../../entities/conversation/model/listingContact";

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
