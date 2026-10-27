import { v2IntegrationEnabled } from "../../../shared/config/v2Integration";
import { contactHttp } from "./contactHttp";
import { contactFail, copyListingContactCommand, copyListingMessageCommand, copyConversationReadCommand,
  copyConversationListCommand, parseListingContactReceipt, parseListingMessageReceipt, parseConversationView,
  parseConversationList } from "../model/listingContact";

async function request(action: string, token: string, input: unknown, signal?: AbortSignal) {
  if (!v2IntegrationEnabled()) return contactFail("configuration");
  if (!token || /\s/.test(token) || token.length > 8192) return contactFail("unauthorized");
  const r = await contactHttp(fetch, "/api/v2/listing-contact/" + action, { method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify(input) }, signal);
  if (r.status === 401 || r.status === 403) return contactFail("context_changed");
  if ([400, 404, 409, 422].includes(r.status)) return contactFail("refused");
  if (r.status !== 200) return contactFail("outcome_unknown");
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
