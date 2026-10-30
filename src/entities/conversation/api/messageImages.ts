import { contactFail, ListingContactError } from "../model/listingContact";
import { MESSAGE_IMAGE_LIMITS, copyMessageImageUploadCommand, copyMessageImageUploadBody, copyMessageImageReadCommand,
  copyMessageImageCancelCommand, imageRecord, parseMessageImageReceipt, type PreparedMessageImage,
  type MessageImageUploadCommand, type MessageImageReadCommand, type MessageImageCancelCommand } from "../model/messageImage";

export function createMessageImageClient(fetcher: typeof fetch = fetch) {
  async function request(action: string, token: string, body: object, image: boolean, signal?: AbortSignal) {
    if (!/^[A-Za-z0-9._-]{1,8192}$/.test(token)) return contactFail("unauthorized");
    if (signal?.aborted) return contactFail("aborted");
    const serialized = JSON.stringify(body);
    if (new TextEncoder().encode(serialized).length > MESSAGE_IMAGE_LIMITS.requestBytes) return contactFail("input");
    const controller = new AbortController();
    const abort = () => controller.abort(); signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, 30000);
    try {
      const response = await fetcher("/api/v2/message-images/" + action, { method: "POST", body: serialized,
        headers: { authorization: "Bearer " + token, "content-type": "application/json" },
        credentials: "omit", redirect: "error", cache: "no-store", referrerPolicy: "no-referrer", signal: controller.signal });
      if (response.redirected) return contactFail("response");
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        return contactFail([401, 403].includes(response.status) ? "context_changed"
          : [400, 404, 409, 413, 422].includes(response.status) ? "refused" : "outcome_unknown");
      }
      const maximum = image ? MESSAGE_IMAGE_LIMITS.webBytes : 4096;
      const declared = response.headers.get("content-length");
      if ((declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maximum)) || !response.body
        || (image && response.headers.get("content-type")?.split(";")[0] !== "image/webp")) return contactFail("response");
      const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
      try {
        while (true) { const item = await reader.read(); if (item.done) break;
          length += item.value.byteLength; if (length > maximum) return contactFail("response"); chunks.push(item.value.slice()); }
      } finally { void reader.cancel().catch(() => {}); }
      if (signal?.aborted) return contactFail("aborted");
      if (controller.signal.aborted) return contactFail("outcome_unknown");
      if (declared !== null && !response.headers.has("content-encoding") && length !== Number(declared)) return contactFail("response");
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      if (image) return new Blob([bytes], { type: "image/webp" });
      try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown; }
      catch { return contactFail("response"); }
    } catch (error) {
      if (error instanceof ListingContactError) throw error;
      return contactFail(signal?.aborted ? "aborted" : "outcome_unknown");
    } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); controller.abort(); }
  }
  return Object.freeze({
    async upload(token: string, command: MessageImageUploadCommand, prepared: PreparedMessageImage, signal?: AbortSignal) {
      const c = copyMessageImageUploadCommand(command);
      const body = copyMessageImageUploadBody({ ...c, imageBase64: prepared.imageBase64, sourceSha256: prepared.sourceSha256,
        sourceBytes: prepared.sourceBytes, sourceMime: prepared.sourceMime });
      return parseMessageImageReceipt(await request("upload", token, body, false, signal), c);
    },
    async read(token: string, command: MessageImageReadCommand, signal?: AbortSignal): Promise<Blob> {
      return await request("read", token, copyMessageImageReadCommand(command), true, signal) as Blob;
    },
    async cancel(token: string, command: MessageImageCancelCommand, signal?: AbortSignal): Promise<void> {
      const c = copyMessageImageCancelCommand(command), result = imageRecord(await request("cancel", token, c, false, signal), "response");
      if (result.schema_version !== 2 || result.actor_user_id !== c.expectedUserId || result.identity_id !== c.expectedIdentityId
        || result.conversation_id !== c.conversationId || result.attachment_id !== c.attachmentId || result.state !== "tombstoned") return contactFail("response");
    },
  });
}
