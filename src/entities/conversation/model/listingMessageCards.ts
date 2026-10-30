import {
  contactFail, copyConversationReadCommand, isConversationId, parseConversationView,
  type ConversationMessage, type ConversationReadCommand, type ConversationView,
} from "./listingContact";

/** A server-stored snapshot belonging to one message, never the current header. */
export type ListingMessageCard = Readonly<{
  id: string; title: string | null; image: string | null; price: string | null;
}>;
export type ConversationCardReadCommand = ConversationReadCommand & Readonly<{ attachmentListingId: string | null }>;
export type ConversationCardView = Omit<ConversationView, "schema_version" | "messages"> & Readonly<{
  schema_version: 2;
  messages: readonly (ConversationMessage & Readonly<{ listing: ListingMessageCard | null }>)[];
  attachment_listing_id: string | null;
  attachment_listing: ListingMessageCard | null;
}>;

function record(value: unknown, keys: readonly string[], code: "input" | "response"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype)
    return contactFail(code);
  if (Reflect.ownKeys(value).some(key => typeof key !== "string")
    || Object.values(Object.getOwnPropertyDescriptors(value)).some(d => !("value" in d) || !d.enumerable)
    || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) return contactFail(code);
  return value as Record<string, unknown>;
}
const nullableText = (value: unknown, maximum: number) => value === null
  || (typeof value === "string" && !value.includes("\0") && Array.from(value).length <= maximum);

export function copyConversationCardReadCommand(value: unknown): ConversationCardReadCommand {
  const r = record(value, ["expectedUserId", "expectedIdentityId", "conversationId", "beforeMessageId", "attachmentListingId"], "input");
  const { attachmentListingId, ...base } = r;
  if (attachmentListingId !== null && !isConversationId(attachmentListingId)) return contactFail("input");
  return Object.freeze({ ...copyConversationReadCommand(base), attachmentListingId });
}

function parseCard(value: unknown): ListingMessageCard | null {
  if (value === null) return null;
  const r = record(value, ["id", "title", "image", "price"], "response");
  if (!isConversationId(r.id) || !nullableText(r.title, 2000) || !nullableText(r.image, 4096)
    || !nullableText(r.price, 2000)) return contactFail("response");
  return Object.freeze({ ...r }) as ListingMessageCard;
}

/** The original v1 parser remains exact and unchanged for old deployments. */
export function parseConversationCardView(value: unknown, command: ConversationCardReadCommand): ConversationCardView {
  const r = record(value, ["schema_version", "actor_user_id", "identity_id", "conversation_id", "peer_name", "can_send",
    "listing", "messages", "next_before_message_id", "attachment_listing_id", "attachment_listing"], "response");
  if (r.schema_version !== 2 || r.attachment_listing_id !== command.attachmentListingId
    || !Array.isArray(r.messages) || r.messages.length > 50) return contactFail("response");
  const cards: (ListingMessageCard | null)[] = [];
  const messages = r.messages.map(value => {
    const message = record(value, ["id", "mine", "text", "created_at", "listing"], "response");
    const { listing, ...base } = message;
    cards.push(parseCard(listing));
    return base;
  });
  const { attachment_listing_id, attachment_listing, ...base } = r;
  const checked = parseConversationView({ ...base, schema_version: 1, messages }, command);
  const attachment = parseCard(attachment_listing);
  if (attachment && attachment.id !== attachment_listing_id) return contactFail("response");
  return Object.freeze({ ...checked, schema_version: 2,
    messages: Object.freeze(checked.messages.map((message, i) => Object.freeze({ ...message, listing: cards[i] }))),
    attachment_listing_id: command.attachmentListingId, attachment_listing: attachment });
}

/** Do not let a legacy snapshot load an arbitrary tracking URL in a private chat.
 * Managed public media keeps its normal publication/readiness checks. */
export function safeListingCardImage(value: string | null): string | null {
  if (!value || value.length > 4096) return null;
  if (/^\/api\/v2\/listing-media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9]{1,2}$/.test(value)) return value;
  try {
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    const url = new URL(value);
    if (project.protocol !== "https:" || url.protocol !== "https:" || url.origin !== project.origin
      || url.username || url.password || url.search || url.hash
      || !url.pathname.startsWith("/storage/v1/object/public/")
      || /[\u0000-\u0020\\]/.test(value)) return null;
    return url.href;
  } catch { return null; }
}
