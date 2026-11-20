import {PROFILE_MEDIA_LIMITS, copyProfileMediaActor, copyProfileMediaUploadBody, copyProfileMediaUpdateCommand,
  parseProfileMediaSnapshot, parseProfileMediaUploadReceipt, type ProfileMediaSnapshot,
  type ProfileMediaUploadBody, type ProfileMediaUpdateCommand, type ProfileMediaUploadReceipt} from "../../../entities/profile/model/profileMedia";
import type {ConversationActorContext} from "../../listing-conversation/model/useConversationActor";

export class ProfileMediaClientError extends Error {
  constructor(readonly kind: "conflict" | "forbidden" | "invalid" | "rateLimited" | "unknown" | "aborted") {super(kind);}
}
export type ProfileMediaClient = Readonly<{
  snapshot: (context: ConversationActorContext) => Promise<ProfileMediaSnapshot>;
  upload: (context: ConversationActorContext, body: ProfileMediaUploadBody) => Promise<ProfileMediaUploadReceipt>;
  update: (context: ConversationActorContext, command: ProfileMediaUpdateCommand) => Promise<ProfileMediaSnapshot>;
}>;
const projectOrigin = () => {
  try {const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || ""); if (url.protocol === "https:") return url.origin;}
  catch { /* Missing configuration cannot authorize an arbitrary media origin. */ }
  throw new ProfileMediaClientError("unknown");
};
export function createProfileMediaClient(fetcher: typeof fetch = fetch): ProfileMediaClient {
  async function request(action: "snapshot" | "upload" | "update", context: ConversationActorContext, body: object): Promise<unknown> {
    if (context.signal.aborted) throw new ProfileMediaClientError("aborted");
    if (!/^[A-Za-z0-9._-]{1,8192}$/.test(context.accessToken)) throw new ProfileMediaClientError("forbidden");
    const serialized = JSON.stringify(body);
    if (new TextEncoder().encode(serialized).length > PROFILE_MEDIA_LIMITS.requestBytes) throw new ProfileMediaClientError("invalid");
    const controller = new AbortController(), abort = () => controller.abort();
    context.signal.addEventListener("abort", abort, {once: true});
    const timeout = setTimeout(abort, action === "upload" ? 60000 : 20000);
    try {
      const response = await fetcher(`/api/v2/profile-media/${action}`, {method: "POST", body: serialized,
        headers: {authorization: `Bearer ${context.accessToken}`, "content-type": "application/json"},
        credentials: "omit", redirect: "error", cache: "no-store", referrerPolicy: "no-referrer", signal: controller.signal});
      if (response.redirected) throw new ProfileMediaClientError("unknown");
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new ProfileMediaClientError([401, 403].includes(response.status) ? "forbidden" : response.status === 409 ? "conflict"
          : action === "upload" && response.status === 429 ? "rateLimited"
          : [400, 413, 422].includes(response.status) ? "invalid" : "unknown");
      }
      const declared = response.headers.get("content-length");
      if (!response.body || (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > 16384))) throw new ProfileMediaClientError("unknown");
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
      try {
        while (true) {const item = await reader.read(); if (item.done) break;
          length += item.value.length; if (length > 16384) throw new ProfileMediaClientError("unknown"); chunks.push(item.value);}
      } finally {void reader.cancel().catch(() => {});}
      if (context.signal.aborted) throw new ProfileMediaClientError("aborted");
      if (controller.signal.aborted || (declared !== null && !response.headers.has("content-encoding") && length !== Number(declared))) throw new ProfileMediaClientError("unknown");
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.length;}
      return JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes)) as unknown;
    } catch (error) {
      if (error instanceof ProfileMediaClientError) throw error;
      throw new ProfileMediaClientError(context.signal.aborted ? "aborted" : "unknown");
    } finally {clearTimeout(timeout); context.signal.removeEventListener("abort", abort); controller.abort();}
  }
  const actor = (context: ConversationActorContext) => copyProfileMediaActor({expectedUserId: context.expectedUserId, expectedIdentityId: context.expectedIdentityId});
  const assertOwner = (context: ConversationActorContext, body: {expectedUserId: string; expectedIdentityId: string}) => {
    if (body.expectedUserId !== context.expectedUserId || body.expectedIdentityId !== context.expectedIdentityId) throw new ProfileMediaClientError("forbidden");
  };
  return Object.freeze({
    async snapshot(context) {
      const command = actor(context);
      return parseProfileMediaSnapshot(await request("snapshot", context, command), command, projectOrigin());
    },
    async upload(context, body) {
      assertOwner(context, body); const command = copyProfileMediaUploadBody(body);
      return parseProfileMediaUploadReceipt(await request("upload", context, command), command, projectOrigin());
    },
    async update(context, body) {
      assertOwner(context, body); const command = copyProfileMediaUpdateCommand(body);
      return parseProfileMediaSnapshot(await request("update", context, command), command, projectOrigin());
    },
  });
}
export const profileMediaClient = createProfileMediaClient();
