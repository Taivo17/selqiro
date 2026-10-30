import "server-only";
import { privateUploadHttp, type UploadFetch } from "../../entities/listing/api/privateUploadHttp";
import { publicationStorageOrigin } from "../../entities/listing/model/privatePublicationUpload";
import { contactHttp } from "../../entities/conversation/api/contactHttp";
import { contactFail, ListingContactError } from "../../entities/conversation/model/listingContact";
import { contactDiagnostic, type ListingContactStage } from "../../entities/conversation/model/contactDiagnostic";
import { copyGetMessageThread, copyListMessageThreads, copySendMessage, copyMarkThreadRead,
  copyHideThread, copySetThreadBlocked } from "../../entities/conversation/model/messagingCommands";
import { parseMessageThread, parseMessageThreadList, parseSendMessageReceipt, parseMarkThreadReadReceipt,
  parseHideThreadReceipt, parseSetThreadBlockedReceipt } from "../../entities/conversation/model/messagingParsers";

async function atStage<T>(stage: ListingContactStage, signal: AbortSignal | undefined, operation: () => T | Promise<T>) {
  try { return await operation(); }
  catch (error) {
    const code = error instanceof ListingContactError ? error.code : signal?.aborted ? "aborted" : "outcome_unknown";
    throw new ListingContactError(code, error instanceof ListingContactError && error.diagnostic
      ? error.diagnostic : contactDiagnostic(stage, code));
  }
}

/** Keeps established contact/v1 RPCs unchanged. Every v2 action uses the caller's
 * verified JWT; the SQL RPC checks exact active identity and thread membership. */
export function createMessagingService(config: Readonly<{ projectOrigin: string; publicKey: string }>, fetcher: UploadFetch = fetch) {
  if (typeof window !== "undefined" || typeof fetcher !== "function") return contactFail("configuration");
  let origin: string;
  try { origin = publicationStorageOrigin(config.projectOrigin); } catch { return contactFail("configuration"); }
  const key = config.publicKey;
  if (!key || key.length > 8192 || /\s/.test(key)) return contactFail("configuration");
  async function connect(token: string, expectedUserId: string, signal?: AbortSignal) {
    return atStage("service_auth", signal, async () => {
      if (!/^[A-Za-z0-9._-]{1,8192}$/.test(token)) return contactFail("unauthorized");
      if (signal?.aborted) return contactFail("aborted");
      const headers = { apikey: key, authorization: "Bearer " + token, "content-type": "application/json" };
      const auth = await privateUploadHttp(fetcher, origin + "/auth/v1/user", { method: "GET", headers }, { signal, responseBytes: 65536 });
      if (auth.status !== 200) return contactFail("unauthorized", contactDiagnostic("service_auth", "unauthorized", auth.status));
      if (!auth.json || typeof auth.json !== "object" || Array.isArray(auth.json)
        || (auth.json as Record<string, unknown>).id !== expectedUserId) return contactFail("context_changed");
      return (name: string, args: object) => atStage("rpc", signal, async () => {
        const result = await contactHttp(fetcher, origin + "/rest/v1/rpc/" + name,
          { method: "POST", headers, body: JSON.stringify(args) }, signal);
        if ([400, 401, 403, 404, 409, 422].includes(result.status))
          return contactFail("refused", contactDiagnostic("rpc", "refused", result.status, result.json));
        if (result.status !== 200) return contactFail("outcome_unknown", contactDiagnostic("rpc", "outcome_unknown", result.status, result.json));
        return result.json;
      });
    });
  }
  return Object.freeze({
    async get(token: string, input: unknown, signal?: AbortSignal) {
      const c = copyGetMessageThread(input), rpc = await connect(token, c.expectedUserId, signal);
      const result = await rpc("get_my_message_thread_v2", { p_expected_user_id: c.expectedUserId,
        p_expected_identity_id: c.expectedIdentityId, p_conversation_id: c.conversationId,
        p_before_message_id: c.beforeMessageId, p_attachment_listing_id: c.attachmentListingId });
      return atStage("receipt", signal, () => parseMessageThread(result, c));
    },
    async list(token: string, input: unknown, signal?: AbortSignal) {
      const c = copyListMessageThreads(input), rpc = await connect(token, c.expectedUserId, signal);
      const result = await rpc("list_my_message_threads_v2", { p_expected_user_id: c.expectedUserId,
        p_expected_identity_id: c.expectedIdentityId, p_before_updated_at: c.cursor?.updated_at ?? null,
        p_before_conversation_id: c.cursor?.conversation_id ?? null });
      return atStage("receipt", signal, () => parseMessageThreadList(result, c));
    },
    async send(token: string, input: unknown, signal?: AbortSignal) {
      const c = copySendMessage(input), rpc = await connect(token, c.expectedUserId, signal);
      const result = await rpc("send_my_message_v2", { p_expected_user_id: c.expectedUserId,
        p_expected_identity_id: c.expectedIdentityId, p_request_key: c.requestKey, p_conversation_id: c.conversationId,
        p_message: c.message, p_listing_id: c.listingId, p_attachment_id: c.attachmentId });
      return atStage("receipt", signal, () => parseSendMessageReceipt(result, c));
    },
    async read(token: string, input: unknown, signal?: AbortSignal) {
      const c = copyMarkThreadRead(input), rpc = await connect(token, c.expectedUserId, signal);
      const result = await rpc("mark_my_thread_read_v2", { p_expected_user_id: c.expectedUserId,
        p_expected_identity_id: c.expectedIdentityId, p_conversation_id: c.conversationId, p_through_message_id: c.throughMessageId });
      return atStage("receipt", signal, () => parseMarkThreadReadReceipt(result, c));
    },
    async hide(token: string, input: unknown, signal?: AbortSignal) {
      const c = copyHideThread(input), rpc = await connect(token, c.expectedUserId, signal);
      const result = await rpc("hide_my_thread_v2", { p_expected_user_id: c.expectedUserId,
        p_expected_identity_id: c.expectedIdentityId, p_conversation_id: c.conversationId });
      return atStage("receipt", signal, () => parseHideThreadReceipt(result, c));
    },
    async block(token: string, input: unknown, signal?: AbortSignal) {
      const c = copySetThreadBlocked(input), rpc = await connect(token, c.expectedUserId, signal);
      const result = await rpc("set_my_thread_block_v2", { p_expected_user_id: c.expectedUserId,
        p_expected_identity_id: c.expectedIdentityId, p_conversation_id: c.conversationId, p_blocked: c.blocked });
      return atStage("receipt", signal, () => parseSetThreadBlockedReceipt(result, c));
    },
  });
}
