import { contactFail, type ConversationActor } from "./listingContact";
import { copyGetMessageThread, copySendMessage } from "./messagingCommands";
import { parseMessageCard, parseMessageThread, parseSendMessageReceipt } from "./messagingParsers";
import { messageId, messageRecord, messageUuid } from "./messagingValidation";
import type { ListingMessageCard } from "./listingMessageCards";
import type { MessageThread, SendMessageReceipt } from "./messaging";

export type MessageOfferType = "listing" | "horse_offer" | "service" | "job";
/** entryKey distinguishes deliberate contact clicks; it never enters an RPC. */
export type MessageOfferIntent = Readonly<{ type: MessageOfferType; id: string; entryKey?: string }>;
export type GetOfferMessageThreadCommand = ConversationActor & Readonly<{
  conversationId: string; beforeMessageId: string | null;
  attachmentOfferType: MessageOfferType | null; attachmentOfferId: string | null;
}>;
export type SendOfferMessageCommand = ConversationActor & Readonly<{
  requestKey: string; conversationId: string; message: string;
  offerType: MessageOfferType | null; offerId: string | null; attachmentId: string | null;
}>;
export type OfferMessageThread = Omit<MessageThread, "schema_version" | "attachment_listing_id" | "attachment_listing"> & Readonly<{
  schema_version: 3; attachment_offer_type: MessageOfferType | null;
  attachment_offer_id: string | null; attachment_offer: ListingMessageCard | null;
}>;

export function isMessageOffer(type: unknown, id: unknown): type is MessageOfferType {
  return type === "listing" ? messageId(id)
    : (type === "horse_offer" || type === "service" || type === "job") && messageUuid(id);
}
export function sameMessageOffer(a: MessageOfferIntent | null, b: MessageOfferIntent | null): boolean {
  return a === b || (!!a && !!b && a.type === b.type && a.id === b.id);
}
export function sameOfferOrigin(a: MessageOfferIntent | null, b: MessageOfferIntent | null): boolean {
  return sameMessageOffer(a, b) && a?.entryKey === b?.entryKey;
}
export function messageOfferMatchesCard(offer: MessageOfferIntent | null, card: ListingMessageCard | null): boolean {
  return !!offer && !!card && offer.id === card.id && offer.type === (card.content_type ?? "listing");
}
function validPair(type: unknown, id: unknown) { return type === null && id === null || isMessageOffer(type, id); }

/** Additive typed contract: legacy numeric-only commands remain strict. */
export function copyGetOfferMessageThread(value: unknown): GetOfferMessageThreadCommand {
  const r = messageRecord(value, ["expectedUserId", "expectedIdentityId", "conversationId", "beforeMessageId", "attachmentOfferType", "attachmentOfferId"], "input");
  if (!validPair(r.attachmentOfferType, r.attachmentOfferId)) return contactFail("input");
  copyGetMessageThread({ expectedUserId: r.expectedUserId, expectedIdentityId: r.expectedIdentityId,
    conversationId: r.conversationId, beforeMessageId: r.beforeMessageId, attachmentListingId: null });
  return Object.freeze({ ...r }) as GetOfferMessageThreadCommand;
}
export function copySendOfferMessage(value: unknown): SendOfferMessageCommand {
  const r = messageRecord(value, ["expectedUserId", "expectedIdentityId", "conversationId", "requestKey", "message", "offerType", "offerId", "attachmentId"], "input");
  if (!validPair(r.offerType, r.offerId)) return contactFail("input");
  copySendMessage({ expectedUserId: r.expectedUserId, expectedIdentityId: r.expectedIdentityId,
    conversationId: r.conversationId, requestKey: r.requestKey, message: r.message, listingId: null, attachmentId: r.attachmentId });
  return Object.freeze({ ...r }) as SendOfferMessageCommand;
}
export function parseOfferMessageThread(value: unknown, c: GetOfferMessageThreadCommand): OfferMessageThread {
  const r = messageRecord(value, ["schema_version", "actor_user_id", "identity_id", "actor", "conversation_id", "peer", "can_send", "blocked_by_me",
    "listing", "messages", "next_before_message_id", "attachment_offer_type", "attachment_offer_id", "attachment_offer"], "response");
  if (r.schema_version !== 3 || r.attachment_offer_type !== c.attachmentOfferType || r.attachment_offer_id !== c.attachmentOfferId)
    return contactFail("response");
  const { attachment_offer_type, attachment_offer_id, attachment_offer, ...base } = r;
  const parsed = parseMessageThread({ ...base, schema_version: 2, attachment_listing_id: null, attachment_listing: null },
    { expectedUserId: c.expectedUserId, expectedIdentityId: c.expectedIdentityId, conversationId: c.conversationId,
      beforeMessageId: c.beforeMessageId, attachmentListingId: null });
  const attachment = parseMessageCard(attachment_offer);
  if (attachment && !messageOfferMatchesCard(c.attachmentOfferType && c.attachmentOfferId
    ? { type: c.attachmentOfferType, id: c.attachmentOfferId } : null, attachment)) return contactFail("response");
  const { attachment_listing_id: _id, attachment_listing: _card, ...thread } = parsed;
  return Object.freeze({ ...thread, schema_version: 3, attachment_offer_type, attachment_offer_id,
    attachment_offer: attachment }) as OfferMessageThread;
}
export function parseSendOfferMessageReceipt(value: unknown, c: SendOfferMessageCommand): SendMessageReceipt {
  return parseSendMessageReceipt(value, { expectedUserId: c.expectedUserId, expectedIdentityId: c.expectedIdentityId,
    requestKey: c.requestKey, conversationId: c.conversationId, message: c.message, listingId: null, attachmentId: c.attachmentId });
}
