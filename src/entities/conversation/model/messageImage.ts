import { contactFail, isConversationId, type ConversationActor } from "./listingContact";

export const MESSAGE_IMAGE_LIMITS = Object.freeze({ originalBytes: 5 * 1024 * 1024,
  sourceBytes: 1400000, requestBytes: 2000000, webBytes: 2000000, edge: 1600, pixels: 16000000 });
export type MessageImageActor = ConversationActor & Readonly<{ conversationId: string }>;
export type MessageImageUploadCommand = MessageImageActor & Readonly<{ requestKey: string }>;
export type MessageImageReadCommand = MessageImageActor & Readonly<{ messageId: string }>;
export type MessageImageCancelCommand = MessageImageActor & Readonly<{ attachmentId: string }>;
export type PreparedMessageImage = Readonly<{ imageBase64: string; sourceSha256: string; sourceBytes: number;
  sourceMime: "image/webp"; preview: Blob; width: number; height: number }>;
export type MessageImageUploadBody = MessageImageUploadCommand & Readonly<{ imageBase64: string; sourceSha256: string;
  sourceBytes: number; sourceMime: "image/webp" }>;
export type MessageImageReceipt = Readonly<{ schema_version: 2; actor_user_id: string; identity_id: string;
  conversation_id: string; request_key: string; attachment_id: string; state: "ready" | "attached";
  width: number; height: number; bytes: number; mime: "image/webp" }>;
export function imageUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
    && value !== "00000000-0000-0000-0000-000000000000";
}
export function imageRecord(value: unknown, code: "input" | "response" = "input"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype)
    return contactFail(code);
  if (Reflect.ownKeys(value).some(key => typeof key !== "string")
    || Object.values(Object.getOwnPropertyDescriptors(value)).some(d => !("value" in d) || !d.enumerable)) return contactFail(code);
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, expected: string[], code: "input" | "response" = "input") {
  if (Object.keys(value).sort().join() !== expected.sort().join()) contactFail(code);
}
const ACTOR_KEYS = ["expectedUserId", "expectedIdentityId", "conversationId"];
function actor(value: Record<string, unknown>) {
  if (!imageUuid(value.expectedUserId) || !imageUuid(value.expectedIdentityId) || !isConversationId(value.conversationId))
    contactFail("input");
}
export function copyMessageImageUploadCommand(value: unknown): MessageImageUploadCommand {
  const r = imageRecord(value); keys(r, [...ACTOR_KEYS, "requestKey"]); actor(r);
  if (!imageUuid(r.requestKey)) return contactFail("input");
  return Object.freeze({ ...r }) as MessageImageUploadCommand;
}
export function copyMessageImageUploadBody(value: unknown): MessageImageUploadBody {
  const r = imageRecord(value); keys(r, [...ACTOR_KEYS, "requestKey", "imageBase64", "sourceSha256", "sourceBytes", "sourceMime"]); actor(r);
  if (!imageUuid(r.requestKey) || typeof r.sourceSha256 !== "string" || !/^[0-9a-f]{64}$/.test(r.sourceSha256)
    || !Number.isSafeInteger(r.sourceBytes) || Number(r.sourceBytes) < 1 || Number(r.sourceBytes) > MESSAGE_IMAGE_LIMITS.sourceBytes
    || r.sourceMime !== "image/webp" || typeof r.imageBase64 !== "string"
    || r.imageBase64.length !== 4 * Math.ceil(Number(r.sourceBytes) / 3)
    || !/^[A-Za-z0-9+/]*={0,2}$/.test(r.imageBase64)) return contactFail("input");
  return Object.freeze({ ...r }) as MessageImageUploadBody;
}
export function copyMessageImageReadCommand(value: unknown): MessageImageReadCommand {
  const r = imageRecord(value); keys(r, [...ACTOR_KEYS, "messageId"]); actor(r);
  if (!isConversationId(r.messageId)) return contactFail("input");
  return Object.freeze({ ...r }) as MessageImageReadCommand;
}
export function copyMessageImageCancelCommand(value: unknown): MessageImageCancelCommand {
  const r = imageRecord(value); keys(r, [...ACTOR_KEYS, "attachmentId"]); actor(r);
  if (!imageUuid(r.attachmentId)) return contactFail("input");
  return Object.freeze({ ...r }) as MessageImageCancelCommand;
}
export function parseMessageImageReceipt(value: unknown, command: MessageImageUploadCommand): MessageImageReceipt {
  const r = imageRecord(value, "response");
  keys(r, ["schema_version", "actor_user_id", "identity_id", "conversation_id", "request_key", "attachment_id",
    "state", "width", "height", "bytes", "mime"], "response");
  if (r.schema_version !== 2 || r.actor_user_id !== command.expectedUserId || r.identity_id !== command.expectedIdentityId
    || r.conversation_id !== command.conversationId || r.request_key !== command.requestKey || !imageUuid(r.attachment_id)
    || !["ready", "attached"].includes(String(r.state)) || r.mime !== "image/webp"
    || ![r.width, r.height].every(n => Number.isSafeInteger(n) && Number(n) > 0 && Number(n) <= MESSAGE_IMAGE_LIMITS.edge)
    || !Number.isSafeInteger(r.bytes) || Number(r.bytes) < 1 || Number(r.bytes) > MESSAGE_IMAGE_LIMITS.webBytes) return contactFail("response");
  return Object.freeze({ ...r }) as MessageImageReceipt;
}
