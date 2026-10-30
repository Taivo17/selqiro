import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { publicationStorageOrigin } from "../../../entities/listing/model/privatePublicationUpload";
import { contactHttp } from "../../../entities/conversation/api/contactHttp";
import { contactDiagnostic, type ListingContactStage } from "../../../entities/conversation/model/contactDiagnostic";
import { copyConversationCardReadCommand, parseConversationCardView,
  type ConversationCardView } from "../../../entities/conversation/model/listingMessageCards";
import { contactFail, ListingContactError, copyListingContactCommand, copyListingMessageCommand,
  parseListingContactReceipt, parseListingMessageReceipt, type ListingContactReceipt, type ListingMessageReceipt,
  copyConversationReadCommand, copyConversationListCommand, parseConversationView, parseConversationList,
  type ConversationView, type ConversationList } from "../../../entities/conversation/model/listingContact";

async function atStage<T>(stage: ListingContactStage, signal: AbortSignal | undefined,
    operation: () => T | Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    const code = error instanceof ListingContactError ? error.code : signal?.aborted ? "aborted" : "outcome_unknown";
    throw new ListingContactError(code, error instanceof ListingContactError && error.diagnostic
      ? error.diagnostic : contactDiagnostic(stage, code));
  }
}

/** Same-V2 contact/send composition. No route, default I/O, service key, retry,
 * client-authored listing snapshot or legacy direct table write. The caller owns
 * auth/identity generations; SQL validates that context again under its actor lock. */
export function createListingContactService(config: Readonly<{ projectOrigin: string; publicKey: string }>, fetcher: UploadFetch = fetch) {
  if (typeof window !== "undefined" || typeof fetcher !== "function") return contactFail("configuration");
  let origin: string; try { origin = publicationStorageOrigin(config.projectOrigin); } catch { return contactFail("configuration"); }
  const publicKey = config.publicKey;
  if (typeof publicKey !== "string" || !publicKey || publicKey.length > 8192 || /\s/.test(publicKey)) return contactFail("configuration");
  async function connect(token: string, expectedUserId: string, signal?: AbortSignal) {
    return atStage("service_auth", signal, async () => {
      if (typeof token !== "string" || !token || token.length > 8192 || /\s/.test(token)) return contactFail("unauthorized");
      if (signal?.aborted) return contactFail("aborted");
      const headers = { apikey: publicKey, authorization: "Bearer " + token, "content-type": "application/json" };
      const auth = await privateUploadHttp(fetcher, origin + "/auth/v1/user", { method: "GET", headers }, { signal, responseBytes: 65536 });
      if (auth.status !== 200) return contactFail("unauthorized", contactDiagnostic("service_auth", "unauthorized", auth.status));
      if (!auth.json || typeof auth.json !== "object" || Array.isArray(auth.json)
        || (auth.json as Record<string, unknown>).id !== expectedUserId) return contactFail("context_changed");
      return async (name: string, args: object) => atStage("rpc", signal, async () => {
        const r = await contactHttp(fetcher, origin + "/rest/v1/rpc/" + name,
          { method: "POST", headers, body: JSON.stringify(args) }, signal);
        if (r.status === 401 || r.status === 403 || [400, 404, 409, 422].includes(r.status))
          return contactFail("refused", contactDiagnostic("rpc", "refused", r.status, r.json));
        if (r.status !== 200) return contactFail("outcome_unknown", contactDiagnostic("rpc", "outcome_unknown", r.status, r.json));
        return r.json;
      });
    });
  }
  return Object.freeze({
    async getWithListings(accessToken: string, input: unknown, signal?: AbortSignal): Promise<ConversationCardView> {
      const c = copyConversationCardReadCommand(input);
      try {
        const rpc = await connect(accessToken, c.expectedUserId, signal);
        const result = await rpc("get_my_listing_conversation_v2", {
          p_expected_user_id: c.expectedUserId, p_expected_identity_id: c.expectedIdentityId,
          p_conversation_id: c.conversationId, p_before_message_id: c.beforeMessageId,
          p_attachment_listing_id: c.attachmentListingId,
        });
        return await atStage("receipt", signal, () => parseConversationCardView(result, c));
      } catch (e) { if (e instanceof ListingContactError) throw e; return contactFail(signal?.aborted ? "aborted" : "outcome_unknown"); }
    },
    async get(accessToken: string, input: unknown, signal?: AbortSignal): Promise<ConversationView> {
      const c = copyConversationReadCommand(input);
      try {
        const rpc = await connect(accessToken, c.expectedUserId, signal);
        const result = await rpc("get_my_listing_conversation_v1", {
          p_expected_user_id: c.expectedUserId, p_expected_identity_id: c.expectedIdentityId,
          p_conversation_id: c.conversationId, p_before_message_id: c.beforeMessageId,
        });
        return await atStage("receipt", signal, () => parseConversationView(result, c));
      } catch (e) { if (e instanceof ListingContactError) throw e; return contactFail(signal?.aborted ? "aborted" : "outcome_unknown"); }
    },
    async list(accessToken: string, input: unknown, signal?: AbortSignal): Promise<ConversationList> {
      const c = copyConversationListCommand(input);
      try {
        const rpc = await connect(accessToken, c.expectedUserId, signal);
        const result = await rpc("list_my_listing_conversations_v1", {
          p_expected_user_id: c.expectedUserId, p_expected_identity_id: c.expectedIdentityId,
          p_before_conversation_id: c.beforeConversationId,
        });
        return await atStage("receipt", signal, () => parseConversationList(result, c));
      } catch (e) { if (e instanceof ListingContactError) throw e; return contactFail(signal?.aborted ? "aborted" : "outcome_unknown"); }
    },
    async contact(accessToken: string, input: unknown, signal?: AbortSignal): Promise<ListingContactReceipt> {
      const c = copyListingContactCommand(input);
      try {
        const rpc = await connect(accessToken, c.expectedUserId, signal);
        const result = await rpc("contact_my_listing_seller_v1", {
          p_expected_user_id: c.expectedUserId, p_expected_identity_id: c.expectedIdentityId,
          p_request_key: c.requestKey, p_listing_id: c.listingId,
        });
        return await atStage("receipt", signal, () => parseListingContactReceipt(result, c));
      } catch (e) { if (e instanceof ListingContactError) throw e; return contactFail(signal?.aborted ? "aborted" : "outcome_unknown"); }
    },
    async send(accessToken: string, input: unknown, signal?: AbortSignal): Promise<ListingMessageReceipt> {
      const c = copyListingMessageCommand(input);
      try {
        const rpc = await connect(accessToken, c.expectedUserId, signal);
        const result = await rpc("send_my_listing_message_v1", {
          p_expected_user_id: c.expectedUserId, p_expected_identity_id: c.expectedIdentityId, p_request_key: c.requestKey,
          p_conversation_id: c.conversationId, p_message: c.message, p_listing_id: c.listingId,
        });
        return await atStage("receipt", signal, () => parseListingMessageReceipt(result, c));
      } catch (e) { if (e instanceof ListingContactError) throw e; return contactFail(signal?.aborted ? "aborted" : "outcome_unknown"); }
    },
  });
}
