import "server-only";
import { randomUUID } from "node:crypto";
import { contactFail } from "../../entities/conversation/model/listingContact";
import { MESSAGE_IMAGE_LIMITS, copyMessageImageUploadBody, copyMessageImageReadCommand, copyMessageImageCancelCommand,
  imageRecord, imageUuid, parseMessageImageReceipt, type MessageImageUploadBody, type MessageImageReceipt } from "../../entities/conversation/model/messageImage";
import { canonicalMessageImage, messageImageHash } from "./imageCodec";
import { createMediaTransport, type MessageMediaConfig, type MessageMediaFetch, type MessageMediaTransport } from "./transport";
import { runMessageImageMaintenance } from "./maintenance";

type Dependencies = Readonly<{ fetcher?: MessageMediaFetch; transport?: MessageMediaTransport;
  canonicalize?: typeof canonicalMessageImage; uuid?: () => string; maintenance?: () => Promise<void> }>;
const contextArgs = (c: { expectedUserId: string; expectedIdentityId: string; conversationId: string }) => ({
  p_expected_user_id: c.expectedUserId, p_expected_identity_id: c.expectedIdentityId, p_conversation_id: c.conversationId,
});
function lease(value: unknown, c: MessageImageUploadBody) {
  const r = imageRecord(value, "response");
  if (r.schema_version !== 2 || r.actor_user_id !== c.expectedUserId || r.identity_id !== c.expectedIdentityId
    || r.conversation_id !== c.conversationId || r.request_key !== c.requestKey || !imageUuid(r.attachment_id)
    || !["reserved", "uploading", "ready", "attached", "tombstoned"].includes(String(r.state))
    || r.source_sha256 !== c.sourceSha256 || r.source_bytes !== c.sourceBytes || r.source_mime !== c.sourceMime) return contactFail("response");
  return r;
}
export function createMessageImageService(config: MessageMediaConfig, dependencies: Dependencies = {}) {
  const transport = dependencies.transport ?? createMediaTransport(config, dependencies.fetcher);
  const canonicalize = dependencies.canonicalize ?? canonicalMessageImage;
  const uuid = dependencies.uuid ?? randomUUID;
  const maintenance = dependencies.maintenance ?? (() => runMessageImageMaintenance(config, dependencies.fetcher, undefined, transport));
  async function maintain() { try { await maintenance(); } catch { /* Successful results remain successful. */ } }
  function receipt(r: Record<string, unknown>, c: MessageImageUploadBody): MessageImageReceipt {
    return parseMessageImageReceipt({ schema_version: 2, actor_user_id: r.actor_user_id, identity_id: r.identity_id,
      conversation_id: r.conversation_id, request_key: r.request_key, attachment_id: r.attachment_id, state: r.state,
      width: r.width, height: r.height, bytes: r.web_bytes, mime: "image/webp" }, c);
  }
  return Object.freeze({
    async upload(token: string, input: unknown, signal?: AbortSignal) {
      const c = copyMessageImageUploadBody(input);
      const source = new Uint8Array(Buffer.from(c.imageBase64, "base64"));
      if (source.length !== c.sourceBytes || Buffer.from(source).toString("base64") !== c.imageBase64
        || messageImageHash(source) !== c.sourceSha256) return contactFail("input");
      await transport.authenticate(token, c.expectedUserId, signal);
      const reservation = lease(await transport.rpc("reserve_my_message_photo_v2", { ...contextArgs(c), p_request_key: c.requestKey,
        p_source_sha256: c.sourceSha256, p_source_bytes: c.sourceBytes, p_source_mime: c.sourceMime }, token, signal), c);
      if (reservation.state === "tombstoned") return contactFail("refused");
      const canonical = await canonicalize(source);
      if (signal?.aborted) return contactFail("aborted");
      const claim = lease(await transport.rpc("claim_message_photo_upload_v2", { p_attachment_id: reservation.attachment_id,
        p_expected_user_id: c.expectedUserId, p_expected_identity_id: c.expectedIdentityId, p_source_sha256: c.sourceSha256,
        p_claim_key: uuid(), p_web_sha256: canonical.sha256, p_web_bytes: canonical.bytes.length,
        p_width: canonical.width, p_height: canonical.height }, null, signal), c);
      const path = c.conversationId + "/" + claim.attachment_id + ".webp";
      if (claim.attachment_id !== reservation.attachment_id || claim.bucket !== "message-attachments-v2" || claim.path !== path
        || !imageUuid(claim.upload_key) || claim.web_sha256 !== canonical.sha256 || claim.web_bytes !== canonical.bytes.length
        || claim.width !== canonical.width || claim.height !== canonical.height) return contactFail("response");
      if (claim.state === "ready" || claim.state === "attached") { await maintain(); return receipt(claim, c); }
      if (claim.state !== "uploading") return contactFail("refused");
      // Immutable deterministic destination plus upsert=false. Even a timed-out
      // first write can only place these same bytes at this reservation's path.
      try { await transport.writeObject(claim.bucket, path, canonical.bytes, signal); }
      catch { if (signal?.aborted) return contactFail("aborted"); }
      const stored = await transport.readObject(claim.bucket, path, MESSAGE_IMAGE_LIMITS.webBytes, signal);
      if (stored.status !== 200 || stored.bytes.length !== canonical.bytes.length || messageImageHash(stored.bytes) !== canonical.sha256)
        return contactFail("outcome_unknown");
      const result = lease(await transport.rpc("finish_message_photo_upload_v2", { p_attachment_id: claim.attachment_id,
        p_claim_key: claim.upload_key, p_outcome: "ready", p_web_sha256: canonical.sha256, p_web_bytes: canonical.bytes.length,
        p_width: canonical.width, p_height: canonical.height, p_failure_code: null }, null, signal), c);
      if (result.attachment_id !== claim.attachment_id || result.web_sha256 !== canonical.sha256 || result.web_bytes !== canonical.bytes.length
        || result.width !== canonical.width || result.height !== canonical.height) return contactFail("response");
      const value = receipt(result, c); await maintain(); return value;
    },
    async read(token: string, input: unknown, signal?: AbortSignal): Promise<Uint8Array> {
      const c = copyMessageImageReadCommand(input);
      await transport.authenticate(token, c.expectedUserId, signal);
      const binding = imageRecord(await transport.rpc("get_my_message_photo_binding_v2", { ...contextArgs(c), p_message_id: c.messageId }, token, signal), "response");
      if (binding.schema_version !== 2 || binding.actor_user_id !== c.expectedUserId || binding.identity_id !== c.expectedIdentityId
        || binding.conversation_id !== c.conversationId || binding.message_id !== c.messageId || typeof binding.path !== "string") return contactFail("response");
      let bytes: Uint8Array;
      if (binding.kind === "v2") {
        if (!imageUuid(binding.attachment_id) || binding.bucket !== "message-attachments-v2"
          || binding.path !== c.conversationId + "/" + binding.attachment_id + ".webp"
          || typeof binding.web_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(binding.web_sha256)
          || !Number.isSafeInteger(binding.web_bytes) || Number(binding.web_bytes) < 1 || Number(binding.web_bytes) > MESSAGE_IMAGE_LIMITS.webBytes
          || ![binding.width, binding.height].every(n => Number.isSafeInteger(n) && Number(n) > 0 && Number(n) <= MESSAGE_IMAGE_LIMITS.edge)) return contactFail("response");
        const stored = await transport.readObject(binding.bucket, binding.path, MESSAGE_IMAGE_LIMITS.webBytes, signal);
        if (stored.status !== 200 || stored.bytes.length !== binding.web_bytes || messageImageHash(stored.bytes) !== binding.web_sha256) return contactFail("response");
        bytes = stored.bytes;
      } else if (binding.kind === "legacy") {
        if (binding.bucket !== "messages" || binding.attachment_id !== null || binding.path.length > 230 || binding.path.includes("..")
          || !new RegExp("^" + c.conversationId + "/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$").test(binding.path)) return contactFail("response");
        const stored = await transport.readObject(binding.bucket, binding.path, MESSAGE_IMAGE_LIMITS.originalBytes, signal);
        if (stored.status !== 200) return contactFail("response");
        bytes = (await canonicalize(stored.bytes, true)).bytes;
      } else return contactFail("response");
      await maintain(); return bytes;
    },
    async cancel(token: string, input: unknown, signal?: AbortSignal) {
      const c = copyMessageImageCancelCommand(input);
      await transport.authenticate(token, c.expectedUserId, signal);
      const result = imageRecord(await transport.rpc("cancel_my_message_photo_v2", { ...contextArgs(c), p_attachment_id: c.attachmentId }, token, signal), "response");
      if (result.schema_version !== 2 || result.actor_user_id !== c.expectedUserId || result.identity_id !== c.expectedIdentityId
        || result.conversation_id !== c.conversationId || result.attachment_id !== c.attachmentId || result.state !== "tombstoned") return contactFail("response");
      await maintain();
      return { schema_version: 2, actor_user_id: c.expectedUserId, identity_id: c.expectedIdentityId,
        conversation_id: c.conversationId, attachment_id: c.attachmentId, state: "tombstoned" };
    },
  });
}
