import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { contactHttp, type ContactFetch } from "./contactHttp";
import { contactFail, ListingContactError } from "../model/listingContact";
import { contactDiagnostic, readContactErrorDiagnostic } from "../model/contactDiagnostic";
import { copyGetMessageThread, copyListMessageThreads, copySendMessage, copyMarkThreadRead,
  copyHideThread, copySetThreadBlocked } from "../model/messagingCommands";
import { parseMessageThread, parseMessageThreadList, parseSendMessageReceipt, parseMarkThreadReadReceipt,
  parseHideThreadReceipt, parseSetThreadBlockedReceipt } from "../model/messagingParsers";

export function createMessagingClient(fetcher: ContactFetch = fetch) {
  async function request(action: string, token: string, command: object, signal?: AbortSignal) {
    if (!v2IntegrationEnabled()) return contactFail("configuration");
    if (!/^[A-Za-z0-9._-]{1,8192}$/.test(token)) return contactFail("unauthorized");
    let result: Awaited<ReturnType<typeof contactHttp>>;
    try {
      result = await contactHttp(fetcher, "/api/v2/messaging/" + action, { method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify(command) }, signal);
    } catch (error) {
      const code = error instanceof ListingContactError ? error.code : "outcome_unknown";
      return contactFail(code, contactDiagnostic("browser_request", code));
    }
    if (result.status !== 200) {
      const code = [401, 403].includes(result.status) ? "context_changed"
        : [400, 404, 409, 413, 422].includes(result.status) ? "refused" : "outcome_unknown";
      return contactFail(code, readContactErrorDiagnostic(result.json, result.status)
        ?? contactDiagnostic("browser_response", code, result.status));
    }
    return result.json;
  }
  return Object.freeze({
    async getMessageThread(token: string, input: unknown, signal?: AbortSignal) {
      const c = copyGetMessageThread(input); return parseMessageThread(await request("get", token, c, signal), c);
    },
    async listMessageThreads(token: string, input: unknown, signal?: AbortSignal) {
      const c = copyListMessageThreads(input); return parseMessageThreadList(await request("list", token, c, signal), c);
    },
    async sendMessage(token: string, input: unknown, signal?: AbortSignal) {
      const c = copySendMessage(input); return parseSendMessageReceipt(await request("send", token, c, signal), c);
    },
    async markThreadRead(token: string, input: unknown, signal?: AbortSignal) {
      const c = copyMarkThreadRead(input); return parseMarkThreadReadReceipt(await request("read", token, c, signal), c);
    },
    async hideThread(token: string, input: unknown, signal?: AbortSignal) {
      const c = copyHideThread(input); return parseHideThreadReceipt(await request("hide", token, c, signal), c);
    },
    async setThreadBlocked(token: string, input: unknown, signal?: AbortSignal) {
      const c = copySetThreadBlocked(input); return parseSetThreadBlockedReceipt(await request("block", token, c, signal), c);
    },
  });
}
export const { getMessageThread, listMessageThreads, sendMessage, markThreadRead, hideThread, setThreadBlocked } = createMessagingClient();
