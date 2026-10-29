import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { contactHttp } from "./contactHttp";
import { contactDiagnostic, readContactErrorDiagnostic } from "../model/contactDiagnostic";
import { contactFail, ListingContactError, copyListingContactCommand, copyListingMessageCommand, copyConversationReadCommand,
  copyConversationListCommand, parseListingContactReceipt, parseListingMessageReceipt, parseConversationView,
  parseConversationList } from "../model/listingContact";

async function request(action: string, token: string, input: unknown, signal?: AbortSignal) {
  if (!v2IntegrationEnabled()) return contactFail("configuration");
  if (!token || /\s/.test(token) || token.length > 8192) return contactFail("unauthorized");
  let r: Awaited<ReturnType<typeof contactHttp>>;
  try {
    r = await contactHttp(fetch, "/api/v2/listing-contact/" + action, { method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify(input) }, signal);
  } catch (error) {
    const code = error instanceof ListingContactError ? error.code : "outcome_unknown";
    return contactFail(code, contactDiagnostic("browser_request", code));
  }
  if (r.status !== 200) {
    const code = r.status === 401 || r.status === 403 ? "context_changed"
      : [400, 404, 409, 422].includes(r.status) ? "refused" : "outcome_unknown";
    return contactFail(code, readContactErrorDiagnostic(r.json, r.status) ?? contactDiagnostic("browser_response", code, r.status));
  }
  return r.json;
}
export async function contactListingSeller(token: string, input: unknown, signal?: AbortSignal) {
  const c = copyListingContactCommand(input);
  return parseListingContactReceipt(await request("contact", token, c, signal), c);
}
export async function sendListingMessage(token: string, input: unknown, signal?: AbortSignal) {
  const c = copyListingMessageCommand(input);
  return parseListingMessageReceipt(await request("send", token, c, signal), c);
}
export async function getListingConversation(token: string, input: unknown, signal?: AbortSignal) {
  const c = copyConversationReadCommand(input);
  return parseConversationView(await request("get", token, c, signal), c);
}
export async function listListingConversations(token: string, input: unknown, signal?: AbortSignal) {
  const c = copyConversationListCommand(input);
  return parseConversationList(await request("list", token, c, signal), c);
}
