export type ListingContactProblem = "input" | "configuration" | "unauthorized" | "context_changed" | "refused" | "outcome_unknown" | "response" | "aborted";
export class ListingContactError extends Error {
  constructor(readonly code: ListingContactProblem) { super("listing_contact_" + code); this.name = "ListingContactError"; }
}
export const contactFail = (code: ListingContactProblem): never => { throw new ListingContactError(code); };
type ActorCommand = Readonly<{ expectedUserId: string; expectedIdentityId: string; requestKey: string }>;
export type ListingContactCommand = ActorCommand & Readonly<{ listingId: string }>;
export type ListingMessageCommand = ActorCommand & Readonly<{ conversationId: string; message: string; listingId: string | null }>;
type ActorReceipt = Readonly<{ schema_version: 1; request_key: string; actor_user_id: string; identity_id: string; conversation_id: string; replayed: boolean }>;
export type ListingContactReceipt = ActorReceipt & Readonly<{ listing_id: string }>;
export type ListingMessageReceipt = ActorReceipt & Readonly<{ message_id: string }>;
export type ConversationActor = Readonly<{ expectedUserId: string; expectedIdentityId: string }>;
export type ConversationReadCommand = ConversationActor & Readonly<{ conversationId: string; beforeMessageId: string | null }>;
export type ConversationListCommand = ConversationActor & Readonly<{ beforeConversationId: string | null }>;
export type ConversationMessage = Readonly<{ id: string; mine: boolean; text: string; created_at: string }>;
export type ConversationView = Readonly<{ schema_version: 1; actor_user_id: string; identity_id: string; conversation_id: string;
  peer_name: string | null; can_send: boolean; listing: Readonly<{ id: string; title: string | null }> | null;
  messages: readonly ConversationMessage[]; next_before_message_id: string | null }>;
export type ConversationListItem = Readonly<{ conversation_id: string; peer_name: string | null; listing_title: string | null; updated_at: string }>;
export type ConversationList = Readonly<{ schema_version: 1; actor_user_id: string; identity_id: string;
  conversations: readonly ConversationListItem[]; next_before_conversation_id: string | null }>;

function uuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
    && v !== "00000000-0000-0000-0000-000000000000";
}
export function isConversationId(v: unknown): v is string {
  return typeof v === "string" && /^[1-9][0-9]{0,18}$/.test(v) && BigInt(v) <= BigInt("9223372036854775807");
}
const id = isConversationId;
function record(v: unknown, keys: readonly string[], code: "input" | "response"): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.getPrototypeOf(v) !== Object.prototype) return contactFail(code);
  const descriptors = Object.getOwnPropertyDescriptors(v);
  if (Reflect.ownKeys(v).some(k => typeof k !== "string") || Object.values(descriptors).some(d => !("value" in d) || !d.enumerable)
    || Object.keys(v).sort().join(",") !== [...keys].sort().join(",")) return contactFail(code);
  return v as Record<string, unknown>;
}
function actor(v: Record<string, unknown>): void {
  if (![v.expectedUserId, v.expectedIdentityId, v.requestKey].every(uuid)) contactFail("input");
}
export function copyListingContactCommand(value: unknown): ListingContactCommand {
  const r = record(value, ["expectedUserId", "expectedIdentityId", "requestKey", "listingId"], "input"); actor(r);
  if (!id(r.listingId)) return contactFail("input");
  return Object.freeze({ ...r }) as ListingContactCommand;
}
export function copyListingMessageCommand(value: unknown): ListingMessageCommand {
  const r = record(value, ["expectedUserId", "expectedIdentityId", "requestKey", "conversationId", "message", "listingId"], "input"); actor(r);
  if (!id(r.conversationId) || (r.listingId !== null && !id(r.listingId)) || typeof r.message !== "string"
    || !r.message.trim() || r.message.includes("\0") || Array.from(r.message).length > 5000
    || new TextEncoder().encode(r.message).byteLength > 20000
    || Array.from(r.message).some(ch => { const n = ch.codePointAt(0)!; return n >= 0xd800 && n <= 0xdfff; })) return contactFail("input");
  return Object.freeze({ ...r }) as ListingMessageCommand;
}
function actorReceipt(r: Record<string, unknown>, c: ActorCommand): void {
  if (r.schema_version !== 1 || r.request_key !== c.requestKey || r.actor_user_id !== c.expectedUserId
    || r.identity_id !== c.expectedIdentityId || !id(r.conversation_id) || typeof r.replayed !== "boolean") contactFail("response");
}
export function parseListingContactReceipt(value: unknown, c: ListingContactCommand): ListingContactReceipt {
  const r = record(value, ["schema_version", "request_key", "actor_user_id", "identity_id", "conversation_id", "listing_id", "replayed"], "response");
  actorReceipt(r, c); if (r.listing_id !== c.listingId) return contactFail("response");
  return Object.freeze({ ...r }) as ListingContactReceipt;
}
export function parseListingMessageReceipt(value: unknown, c: ListingMessageCommand): ListingMessageReceipt {
  const r = record(value, ["schema_version", "request_key", "actor_user_id", "identity_id", "conversation_id", "message_id", "replayed"], "response");
  actorReceipt(r, c); if (r.conversation_id !== c.conversationId || !id(r.message_id)) return contactFail("response");
  return Object.freeze({ ...r }) as ListingMessageReceipt;
}

function readActor(r: Record<string, unknown>): void {
  if (!uuid(r.expectedUserId) || !uuid(r.expectedIdentityId)) contactFail("input");
}
export function copyConversationReadCommand(value: unknown): ConversationReadCommand {
  const r = record(value, ["expectedUserId", "expectedIdentityId", "conversationId", "beforeMessageId"], "input"); readActor(r);
  if (!id(r.conversationId) || (r.beforeMessageId !== null && !id(r.beforeMessageId))) return contactFail("input");
  return Object.freeze({ ...r }) as ConversationReadCommand;
}
export function copyConversationListCommand(value: unknown): ConversationListCommand {
  const r = record(value, ["expectedUserId", "expectedIdentityId", "beforeConversationId"], "input"); readActor(r);
  if (r.beforeConversationId !== null && !id(r.beforeConversationId)) return contactFail("input");
  return Object.freeze({ ...r }) as ConversationListCommand;
}
function readReceipt(r: Record<string, unknown>, c: ConversationActor): void {
  if (r.schema_version !== 1 || r.actor_user_id !== c.expectedUserId || r.identity_id !== c.expectedIdentityId) contactFail("response");
}
function label(v: unknown, max: number): boolean { return v === null || (typeof v === "string" && Array.from(v).length <= max); }
function instant(v: unknown): boolean { return typeof v === "string" && v.length <= 64 && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v)); }
export function parseConversationView(value: unknown, c: ConversationReadCommand): ConversationView {
  const r = record(value, ["schema_version", "actor_user_id", "identity_id", "conversation_id", "peer_name", "can_send", "listing", "messages", "next_before_message_id"], "response");
  readReceipt(r, c);
  if (r.conversation_id !== c.conversationId || !label(r.peer_name, 200) || typeof r.can_send !== "boolean"
    || (r.next_before_message_id !== null && !id(r.next_before_message_id)) || !Array.isArray(r.messages) || r.messages.length > 50) return contactFail("response");
  let listing: ConversationView["listing"] = null;
  if (r.listing !== null) {
    const s = record(r.listing, ["id", "title"], "response");
    if (!id(s.id) || !label(s.title, 2000)) return contactFail("response");
    listing = Object.freeze({ ...s }) as NonNullable<ConversationView["listing"]>;
  }
  let lastId = BigInt(0);
  const messages = r.messages.map(value => {
    const m = record(value, ["id", "mine", "text", "created_at"], "response");
    if (!id(m.id) || BigInt(m.id) <= lastId || (c.beforeMessageId !== null && BigInt(m.id) >= BigInt(c.beforeMessageId))
      || typeof m.mine !== "boolean" || typeof m.text !== "string" || Array.from(m.text).length > 5000 || !instant(m.created_at)) return contactFail("response");
    lastId = BigInt(m.id); return Object.freeze({ ...m }) as ConversationMessage;
  });
  if (r.next_before_message_id !== null && (messages.length !== 50 || r.next_before_message_id !== messages[0]?.id)) return contactFail("response");
  return Object.freeze({ ...r, listing, messages: Object.freeze(messages) }) as ConversationView;
}
export function parseConversationList(value: unknown, c: ConversationListCommand): ConversationList {
  const r = record(value, ["schema_version", "actor_user_id", "identity_id", "conversations", "next_before_conversation_id"], "response");
  readReceipt(r, c);
  if (!Array.isArray(r.conversations) || r.conversations.length > 50
    || (r.next_before_conversation_id !== null && !id(r.next_before_conversation_id))) return contactFail("response");
  let lastId = c.beforeConversationId === null ? BigInt("9223372036854775808") : BigInt(c.beforeConversationId);
  const conversations = r.conversations.map(value => {
    const item = record(value, ["conversation_id", "peer_name", "listing_title", "updated_at"], "response");
    if (!id(item.conversation_id) || BigInt(item.conversation_id) >= lastId || !label(item.peer_name, 200)
      || !label(item.listing_title, 2000) || !instant(item.updated_at)) return contactFail("response");
    lastId = BigInt(item.conversation_id); return Object.freeze({ ...item }) as ConversationListItem;
  });
  if (r.next_before_conversation_id !== null && (conversations.length !== 50 || r.next_before_conversation_id !== conversations[49]?.conversation_id)) return contactFail("response");
  return Object.freeze({ ...r, conversations: Object.freeze(conversations) }) as ConversationList;
}
