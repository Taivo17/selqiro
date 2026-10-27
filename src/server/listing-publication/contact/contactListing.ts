import { privateUploadHttp, type UploadFetch } from "../../../entities/listing/api/privateUploadHttp";
import { publicationStorageOrigin } from "../../../entities/listing/model/privatePublicationUpload";
import { contactHttp } from "../../../entities/conversation/api/contactHttp";
import { contactFail, ListingContactError, copyListingContactCommand, copyListingMessageCommand,
  parseListingContactReceipt, parseListingMessageReceipt, type ListingContactReceipt, type ListingMessageReceipt,
  copyConversationReadCommand, copyConversationListCommand, parseConversationView, parseConversationList,
  type ConversationView, type ConversationList } from "../../../entities/conversation/model/listingContact";

/** Same-V2 contact/send composition. No route, default I/O, service key, retry,
 * client-authored listing snapshot or legacy direct table write. The caller owns
 * auth/identity generations; SQL validates that context again under its actor lock. */
export function createListingContactService(config: Readonly<{ projectOrigin: string; publicKey: string }>, fetcher: UploadFetch = fetch) {
  if (typeof window !== "undefined" || typeof fetcher !== "function") return contactFail("configuration");
  let origin: string; try { origin = publicationStorageOrigin(config.projectOrigin); } catch { return contactFail("configuration"); }
  const publicKey = config.publicKey;
  if (typeof publicKey !== "string" || !publicKey || publicKey.length > 8192 || /\s/.test(publicKey)) return contactFail("configuration");
  async function connect(token: string, expectedUserId: string, signal?: AbortSignal) {
    if (typeof token !== "string" || !token || token.length > 8192 || /\s/.test(token)) return contactFail("unauthorized");
    if (signal?.aborted) return contactFail("aborted");
    const headers = { apikey: publicKey, authorization: "Bearer " + token, "content-type": "application/json" };
    const auth = await privateUploadHttp(fetcher, origin + "/auth/v1/user", { method: "GET", headers }, { signal, responseBytes: 65536 });
    if (auth.status !== 200) return contactFail("unauthorized");
    if (!auth.json || typeof auth.json !== "object" || Array.isArray(auth.json)
      || (auth.json as Record<string, unknown>).id !== expectedUserId) return contactFail("context_changed");
    return async (name: string, args: object) => {
      const r = await contactHttp(fetcher, origin + "/rest/v1/rpc/" + name,
        { method: "POST", headers, body: JSON.stringify(args) }, signal);
      if (r.status === 401 || r.status === 403) return contactFail("refused");
      if ([400, 404, 409, 422].includes(r.status)) return contactFail("refused");
      if (r.status !== 200) return contactFail("outcome_unknown");
      return r.json;
    };
  }
  return Object.freeze({
    async get(accessToken: string, input: unknown, signal?: AbortSignal): Promise<ConversationView> {
      const c = copyConversationReadCommand(input);
      try {
        const rpc = await connect(accessToken, c.expectedUserId, signal);
        return parseConversationView(await rpc("get_my_listing_conversation_v1", {
          p_expected_user_id: c.expectedUserId, p_expected_identity_id: c.expectedIdentityId,
          p_conversation_id: c.conversationId, p_before_message_id: c.beforeMessageId,
        }), c);
      } catch (e) { if (e instanceof ListingContactError) throw e; return contactFail(signal?.aborted ? "aborted" : "outcome_unknown"); }
    },
    async list(accessToken: string, input: unknown, signal?: AbortSignal): Promise<ConversationList> {
      const c = copyConversationListCommand(input);
      try {
        const rpc = await connect(accessToken, c.expectedUserId, signal);
        return parseConversationList(await rpc("list_my_listing_conversations_v1", {
          p_expected_user_id: c.expectedUserId, p_expected_identity_id: c.expectedIdentityId,
          p_before_conversation_id: c.beforeConversationId,
        }), c);
      } catch (e) { if (e instanceof ListingContactError) throw e; return contactFail(signal?.aborted ? "aborted" : "outcome_unknown"); }
    },
    async contact(accessToken: string, input: unknown, signal?: AbortSignal): Promise<ListingContactReceipt> {
      const c = copyListingContactCommand(input);
      try {
        const rpc = await connect(accessToken, c.expectedUserId, signal);
        return parseListingContactReceipt(await rpc("contact_my_listing_seller_v1", {
          p_expected_user_id: c.expectedUserId, p_expected_identity_id: c.expectedIdentityId,
          p_request_key: c.requestKey, p_listing_id: c.listingId,
        }), c);
      } catch (e) { if (e instanceof ListingContactError) throw e; return contactFail(signal?.aborted ? "aborted" : "outcome_unknown"); }
    },
    async send(accessToken: string, input: unknown, signal?: AbortSignal): Promise<ListingMessageReceipt> {
      const c = copyListingMessageCommand(input);
      try {
        const rpc = await connect(accessToken, c.expectedUserId, signal);
        return parseListingMessageReceipt(await rpc("send_my_listing_message_v1", {
          p_expected_user_id: c.expectedUserId, p_expected_identity_id: c.expectedIdentityId, p_request_key: c.requestKey,
          p_conversation_id: c.conversationId, p_message: c.message, p_listing_id: c.listingId,
        }), c);
      } catch (e) { if (e instanceof ListingContactError) throw e; return contactFail(signal?.aborted ? "aborted" : "outcome_unknown"); }
    },
  });
}
