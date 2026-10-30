import "server-only";
import { contactFail, ListingContactError } from "../../entities/conversation/model/listingContact";

export type MessageMediaConfig = Readonly<{ projectOrigin: string; publicKey: string; serviceKey: string }>;
export type MessageMediaFetch = (url: string, init: RequestInit) => Promise<Response>;
export function checkedMediaOrigin(value: string) {
  let u: URL; try { u = new URL(value); } catch { return contactFail("configuration"); }
  if (u.origin !== value || u.username || u.password || u.pathname !== "/" || u.search || u.hash
    || !(u.protocol === "https:" || (u.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname)))) return contactFail("configuration");
  return u.origin;
}
export async function boundedMediaFetch(fetcher: MessageMediaFetch, url: string, init: RequestInit,
  maximum: number, signal?: AbortSignal, timeout = 10000): Promise<{ status: number; bytes: Uint8Array }> {
  if (signal?.aborted) return contactFail("aborted");
  const controller = new AbortController(); const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true }); const timer = setTimeout(abort, timeout);
  try {
    const response = await fetcher(url, { ...init, signal: controller.signal, redirect: "error", cache: "no-store",
      credentials: "omit", referrerPolicy: "no-referrer" });
    if (response.redirected) return contactFail("response");
    const declared = response.headers.get("content-length");
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maximum)) return contactFail("response");
    const chunks: Uint8Array[] = []; let count = 0;
    if (response.body) {
      const reader = response.body.getReader();
      try { while (true) { const result = await reader.read(); if (result.done) break;
        count += result.value.byteLength; if (count > maximum) return contactFail("response"); chunks.push(result.value.slice()); } }
      finally { void reader.cancel().catch(() => {}); }
    }
    if (controller.signal.aborted) return contactFail(signal?.aborted ? "aborted" : "outcome_unknown");
    if (declared !== null && !response.headers.has("content-encoding") && count !== Number(declared)) return contactFail("response");
    const bytes = new Uint8Array(count); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return { status: response.status, bytes };
  } catch (error) {
    if (error instanceof ListingContactError) throw error;
    return contactFail(signal?.aborted ? "aborted" : "outcome_unknown");
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); controller.abort(); }
}
export function createMediaTransport(config: MessageMediaConfig, fetcher: MessageMediaFetch = fetch) {
  const origin = checkedMediaOrigin(config.projectOrigin);
  if ([config.publicKey, config.serviceKey].some(value => !value || value.length > 8192 || /\s/.test(value))) return contactFail("configuration");
  const serviceHeaders = { apikey: config.serviceKey, authorization: "Bearer " + config.serviceKey };
  function parse(bytes: Uint8Array): unknown {
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { return contactFail("response"); }
  }
  return {
    async authenticate(token: string, expectedUserId: string, signal?: AbortSignal) {
      if (!/^[A-Za-z0-9._-]{1,8192}$/.test(token)) return contactFail("unauthorized");
      const response = await boundedMediaFetch(fetcher, origin + "/auth/v1/user", { method: "GET",
        headers: { apikey: config.publicKey, authorization: "Bearer " + token } }, 65536, signal);
      if (response.status !== 200) return contactFail("unauthorized");
      const body = parse(response.bytes);
      if (!body || typeof body !== "object" || Array.isArray(body) || (body as { id?: unknown }).id !== expectedUserId) return contactFail("context_changed");
    },
    async rpc(name: string, args: object, token: string | null, signal?: AbortSignal) {
      if (!/^[a-z][a-z0-9_]*$/.test(name)) return contactFail("configuration");
      const headers = token === null ? serviceHeaders : { apikey: config.publicKey, authorization: "Bearer " + token };
      const response = await boundedMediaFetch(fetcher, origin + "/rest/v1/rpc/" + name,
        { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(args) }, 65536, signal);
      if (response.status !== 200) return contactFail([400, 401, 403, 404, 409, 422].includes(response.status) ? "refused" : "outcome_unknown");
      return parse(response.bytes);
    },
    async readObject(bucket: string, path: string, maximum: number, signal?: AbortSignal) {
      return boundedMediaFetch(fetcher, origin + "/storage/v1/object/" + bucket + "/" + path,
        { method: "GET", headers: serviceHeaders }, maximum, signal);
    },
    async writeObject(bucket: string, path: string, bytes: Uint8Array, signal?: AbortSignal) {
      return boundedMediaFetch(fetcher, origin + "/storage/v1/object/" + bucket + "/" + path,
        { method: "POST", headers: { ...serviceHeaders, "content-type": "image/webp", "x-upsert": "false" },
          body: bytes as BodyInit }, 4096, signal);
    },
    async deleteObject(bucket: string, path: string, signal?: AbortSignal) {
      return boundedMediaFetch(fetcher, origin + "/storage/v1/object/" + bucket,
        { method: "DELETE", headers: { ...serviceHeaders, "content-type": "application/json" }, body: JSON.stringify({ prefixes: [path] }) }, 16384, signal);
    },
  };
}
export type MessageMediaTransport = ReturnType<typeof createMediaTransport>;
