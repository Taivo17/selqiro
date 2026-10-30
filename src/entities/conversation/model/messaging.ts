import type { ConversationActor } from "./listingContact";
import type { ListingMessageCard } from "./listingMessageCards";

/** Public, identity-bound contracts. Message images never carry storage URLs. */
export type MessageIdentity = Readonly<{ identity_id: string; name: string | null; avatar_url: string | null }>;
export type MessageThreadCursor = Readonly<{ updated_at: string; conversation_id: string }>;
export type MessageThreadImage = Readonly<{
  kind: "v2" | "legacy"; attachment_id: string | null; width: number | null; height: number | null;
}>;
export type MessageThreadMessage = Readonly<{
  id: string; mine: boolean; text: string; text_truncated: boolean; created_at: string;
  listing: ListingMessageCard | null; image: MessageThreadImage | null;
}>;
type ReadReceipt = Readonly<{ schema_version: 2; actor_user_id: string; identity_id: string }>;
export type MessageThread = ReadReceipt & Readonly<{
  actor: MessageIdentity; conversation_id: string; peer: MessageIdentity;
  can_send: boolean; blocked_by_me: boolean;
  listing: Readonly<{ id: string; title: string | null }> | null;
  messages: readonly MessageThreadMessage[]; next_before_message_id: string | null;
  attachment_listing_id: string | null; attachment_listing: ListingMessageCard | null;
}>;
export type MessageThreadListItem = Readonly<{
  conversation_id: string; peer: MessageIdentity; listing_title: string | null; updated_at: string;
  preview: Readonly<{ text: string; has_image: boolean }>; unread: boolean; can_send: boolean;
}>;
export type MessageThreadList = ReadReceipt & Readonly<{
  actor: MessageIdentity; conversations: readonly MessageThreadListItem[]; next_cursor: MessageThreadCursor | null;
}>;
export type GetMessageThreadCommand = ConversationActor & Readonly<{
  conversationId: string; beforeMessageId: string | null; attachmentListingId: string | null;
}>;
export type ListMessageThreadsCommand = ConversationActor & Readonly<{ cursor: MessageThreadCursor | null }>;
export type SendMessageCommand = ConversationActor & Readonly<{
  requestKey: string; conversationId: string; message: string; listingId: string | null; attachmentId: string | null;
}>;
export type ThreadCommand = ConversationActor & Readonly<{ conversationId: string }>;
export type MarkThreadReadCommand = ThreadCommand & Readonly<{ throughMessageId: string }>;
export type SetThreadBlockedCommand = ThreadCommand & Readonly<{ blocked: boolean }>;
export type SendMessageReceipt = ReadReceipt & Readonly<{
  action: "send"; conversation_id: string; request_key: string; message_id: string; replayed: boolean;
}>;
export type MarkThreadReadReceipt = ReadReceipt & Readonly<{
  action: "mark_read"; conversation_id: string; through_message_id: string;
}>;
export type HideThreadReceipt = ReadReceipt & Readonly<{ action: "hide"; conversation_id: string }>;
export type SetThreadBlockedReceipt = ReadReceipt & Readonly<{
  action: "block" | "unblock"; conversation_id: string; blocked_by_me: boolean; can_send: boolean;
}>;
