import { contactFail } from "./listingContact";
import { messageRecord as record, messageUuid as uuid, messageId as id, messageText, messageCursor } from "./messagingValidation";
import type { GetMessageThreadCommand, ListMessageThreadsCommand, SendMessageCommand,
  ThreadCommand, MarkThreadReadCommand, SetThreadBlockedCommand } from "./messaging";

const actorKeys = ["expectedUserId", "expectedIdentityId"] as const;
function actor(r: Record<string, unknown>) {
  if (!uuid(r.expectedUserId) || !uuid(r.expectedIdentityId)) contactFail("input");
}
function thread(r: Record<string, unknown>) { actor(r); if (!id(r.conversationId)) contactFail("input"); }
export function copyGetMessageThread(value: unknown): GetMessageThreadCommand {
  const r = record(value, [...actorKeys, "conversationId", "beforeMessageId", "attachmentListingId"], "input"); thread(r);
  if ((r.beforeMessageId !== null && !id(r.beforeMessageId)) || (r.attachmentListingId !== null && !id(r.attachmentListingId)))
    return contactFail("input");
  return Object.freeze({ ...r }) as GetMessageThreadCommand;
}
export function copyListMessageThreads(value: unknown): ListMessageThreadsCommand {
  const r = record(value, [...actorKeys, "cursor"], "input"); actor(r);
  return Object.freeze({ ...r, cursor: r.cursor === null ? null : messageCursor(r.cursor, "input") }) as ListMessageThreadsCommand;
}
export function copySendMessage(value: unknown): SendMessageCommand {
  const r = record(value, [...actorKeys, "conversationId", "requestKey", "message", "listingId", "attachmentId"], "input"); thread(r);
  if (!uuid(r.requestKey) || (r.listingId !== null && !id(r.listingId)) || (r.attachmentId !== null && !uuid(r.attachmentId))
    || !messageText(r.message, 5000) || new TextEncoder().encode(r.message).byteLength > 20000
    || (!r.message.trim() && r.attachmentId === null)) return contactFail("input");
  return Object.freeze({ ...r }) as SendMessageCommand;
}
export function copyMarkThreadRead(value: unknown): MarkThreadReadCommand {
  const r = record(value, [...actorKeys, "conversationId", "throughMessageId"], "input"); thread(r);
  if (!id(r.throughMessageId)) return contactFail("input");
  return Object.freeze({ ...r }) as MarkThreadReadCommand;
}
export function copyHideThread(value: unknown): ThreadCommand {
  const r = record(value, [...actorKeys, "conversationId"], "input"); thread(r);
  return Object.freeze({ ...r }) as ThreadCommand;
}
export function copySetThreadBlocked(value: unknown): SetThreadBlockedCommand {
  const r = record(value, [...actorKeys, "conversationId", "blocked"], "input"); thread(r);
  if (typeof r.blocked !== "boolean") return contactFail("input");
  return Object.freeze({ ...r }) as SetThreadBlockedCommand;
}
