import { contactFail, type ConversationActor } from "./listingContact";
import type { ListingMessageCard } from "./listingMessageCards";
import { messageRecord as record, messageUuid as uuid, messageId as id, messageText, messageLabel as label,
  messageInstant as instant, messageCursor } from "./messagingValidation";
import type { GetMessageThreadCommand, ListMessageThreadsCommand, SendMessageCommand, ThreadCommand,
  MarkThreadReadCommand, SetThreadBlockedCommand, MessageIdentity, MessageThread, MessageThreadMessage,
  MessageThreadImage, MessageThreadList, MessageThreadListItem, SendMessageReceipt,
  MarkThreadReadReceipt, HideThreadReceipt, SetThreadBlockedReceipt } from "./messaging";

const actorKeys = ["schema_version", "actor_user_id", "identity_id"] as const;
function actor(r: Record<string, unknown>, c: ConversationActor) {
  if (r.schema_version !== 2 || r.actor_user_id !== c.expectedUserId || r.identity_id !== c.expectedIdentityId) contactFail("response");
}
function identity(value: unknown): MessageIdentity {
  const r = record(value, ["identity_id", "name", "avatar_url"], "response");
  if (!uuid(r.identity_id) || !label(r.name, 200) || !label(r.avatar_url, 4096)) return contactFail("response");
  return Object.freeze({ ...r }) as MessageIdentity;
}
function card(value: unknown): ListingMessageCard | null {
  if (value === null) return null;
  const r = record(value, ["id", "title", "image", "price"], "response");
  if (!id(r.id) || !label(r.title, 2000) || !label(r.image, 4096) || !label(r.price, 2000)) return contactFail("response");
  return Object.freeze({ ...r }) as ListingMessageCard;
}
function photo(value: unknown): MessageThreadImage | null {
  if (value === null) return null;
  const r = record(value, ["kind", "attachment_id", "width", "height"], "response");
  if (r.kind === "v2") {
    if (!uuid(r.attachment_id) || !Number.isInteger(r.width) || !Number.isInteger(r.height)
      || (r.width as number) < 1 || (r.width as number) > 1600 || (r.height as number) < 1 || (r.height as number) > 1600)
      return contactFail("response");
  } else if (r.kind !== "legacy" || r.attachment_id !== null || r.width !== null || r.height !== null) return contactFail("response");
  return Object.freeze({ ...r }) as MessageThreadImage;
}
export function parseMessageThread(value: unknown, c: GetMessageThreadCommand): MessageThread {
  const r = record(value, [...actorKeys, "actor", "conversation_id", "peer", "can_send", "blocked_by_me", "listing", "messages",
    "next_before_message_id", "attachment_listing_id", "attachment_listing"], "response"); actor(r, c);
  const own = identity(r.actor), peer = identity(r.peer);
  if (own.identity_id !== c.expectedIdentityId || peer.identity_id === own.identity_id || r.conversation_id !== c.conversationId
    || typeof r.can_send !== "boolean" || typeof r.blocked_by_me !== "boolean" || (r.blocked_by_me && r.can_send)
    || r.attachment_listing_id !== c.attachmentListingId || !Array.isArray(r.messages) || r.messages.length > 50)
    return contactFail("response");
  let listing: MessageThread["listing"] = null;
  if (r.listing !== null) {
    const s = record(r.listing, ["id", "title"], "response");
    if (!id(s.id) || !label(s.title, 2000)) return contactFail("response");
    listing = Object.freeze({ ...s }) as NonNullable<MessageThread["listing"]>;
  }
  let last = BigInt(0);
  const messages = r.messages.map(value => {
    const m = record(value, ["id", "mine", "text", "text_truncated", "created_at", "listing", "image"], "response");
    if (!id(m.id) || BigInt(m.id) <= last || (c.beforeMessageId !== null && BigInt(m.id) >= BigInt(c.beforeMessageId))
      || typeof m.mine !== "boolean" || !messageText(m.text, 20000) || typeof m.text_truncated !== "boolean"
      || instant(m.created_at) === null) return contactFail("response");
    last = BigInt(m.id);
    return Object.freeze({ ...m, listing: card(m.listing), image: photo(m.image) }) as MessageThreadMessage;
  });
  if (r.next_before_message_id !== null && (!id(r.next_before_message_id) || !messages.length
    || r.next_before_message_id !== messages[0].id)) return contactFail("response");
  const attachment = card(r.attachment_listing);
  if (attachment && attachment.id !== c.attachmentListingId) return contactFail("response");
  return Object.freeze({ ...r, actor: own, peer, listing, messages: Object.freeze(messages), attachment_listing: attachment }) as MessageThread;
}
export function parseMessageThreadList(value: unknown, c: ListMessageThreadsCommand): MessageThreadList {
  const r = record(value, [...actorKeys, "actor", "conversations", "next_cursor"], "response"); actor(r, c);
  const own = identity(r.actor);
  if (own.identity_id !== c.expectedIdentityId || !Array.isArray(r.conversations) || r.conversations.length > 50) return contactFail("response");
  let previous = c.cursor;
  const seen = new Set<string>();
  const conversations = r.conversations.map(value => {
    const item = record(value, ["conversation_id", "peer", "listing_title", "updated_at", "preview", "unread", "can_send"], "response");
    const timestamp = instant(item.updated_at), preview = record(item.preview, ["text", "has_image"], "response"), peer = identity(item.peer);
    if (!id(item.conversation_id) || seen.has(item.conversation_id) || peer.identity_id === own.identity_id
      || !label(item.listing_title, 2000) || timestamp === null || !messageText(preview.text, 180)
      || typeof preview.has_image !== "boolean" || typeof item.unread !== "boolean" || typeof item.can_send !== "boolean")
      return contactFail("response");
    if (previous) {
      const previousTime = instant(previous.updated_at)!;
      if (timestamp > previousTime || (timestamp === previousTime && BigInt(item.conversation_id) >= BigInt(previous.conversation_id)))
        return contactFail("response");
    }
    previous = { updated_at: item.updated_at as string, conversation_id: item.conversation_id };
    seen.add(item.conversation_id);
    return Object.freeze({ ...item, peer, preview: Object.freeze({ ...preview }) }) as MessageThreadListItem;
  });
  const cursor = r.next_cursor === null ? null : messageCursor(r.next_cursor, "response");
  const last = conversations[conversations.length - 1];
  if (cursor && (!last || cursor.updated_at !== last.updated_at || cursor.conversation_id !== last.conversation_id)) return contactFail("response");
  return Object.freeze({ ...r, actor: own, conversations: Object.freeze(conversations), next_cursor: cursor }) as MessageThreadList;
}
function mutation(value: unknown, c: ThreadCommand, action: string, extra: readonly string[]) {
  const r = record(value, [...actorKeys, "conversation_id", "action", ...extra], "response"); actor(r, c);
  if (r.conversation_id !== c.conversationId || r.action !== action) return contactFail("response");
  return r;
}
export function parseSendMessageReceipt(value: unknown, c: SendMessageCommand): SendMessageReceipt {
  const r = mutation(value, c, "send", ["request_key", "message_id", "replayed"]);
  if (r.request_key !== c.requestKey || !id(r.message_id) || typeof r.replayed !== "boolean") return contactFail("response");
  return Object.freeze({ ...r }) as SendMessageReceipt;
}
export function parseMarkThreadReadReceipt(value: unknown, c: MarkThreadReadCommand): MarkThreadReadReceipt {
  const r = mutation(value, c, "mark_read", ["through_message_id"]);
  if (!id(r.through_message_id) || BigInt(r.through_message_id) < BigInt(c.throughMessageId)) return contactFail("response");
  return Object.freeze({ ...r }) as MarkThreadReadReceipt;
}
export function parseHideThreadReceipt(value: unknown, c: ThreadCommand): HideThreadReceipt {
  return Object.freeze({ ...mutation(value, c, "hide", []) }) as HideThreadReceipt;
}
export function parseSetThreadBlockedReceipt(value: unknown, c: SetThreadBlockedCommand): SetThreadBlockedReceipt {
  const r = mutation(value, c, c.blocked ? "block" : "unblock", ["blocked_by_me", "can_send"]);
  if (r.blocked_by_me !== c.blocked || typeof r.can_send !== "boolean" || (r.blocked_by_me && r.can_send)) return contactFail("response");
  return Object.freeze({ ...r }) as SetThreadBlockedReceipt;
}
