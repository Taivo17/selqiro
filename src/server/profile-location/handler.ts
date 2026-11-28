import "server-only";
import { publicationRuntimeConfig, isHostedPublicationRuntime, type PublicationRuntimeConfig } from "../listing-publication/journey/integrationRuntime";
import { assertDisposableDatabase } from "../listing-publication/journey/localIntegration";
import type { MessageMediaFetch } from "../messaging-media/transport";
import { LocationError, locationFail } from "./errors";
import { createLocationService } from "./service";

const headers = {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cross-Origin-Resource-Policy": "same-origin"};
const reply = (body: unknown, status = 200) => Response.json(body, {status, headers});
async function body(request: Request, signal: AbortSignal): Promise<unknown> {
  if (!request.body || request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return locationFail("invalid");
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > 32768)) return locationFail("invalid");
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, {once: true});
  let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (signal.aborted) return locationFail("unknown"); if (part.done) break;
      size += part.value.byteLength; if (size > 32768) return locationFail("invalid"); chunks.push(part.value.slice());
    }
    if (declared !== null && Number(declared) !== size) return locationFail("invalid");
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.length;}
    return JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes));
  } catch (error) {if (error instanceof LocationError) throw error; return locationFail("invalid");}
  finally {signal.removeEventListener("abort", abort); void reader.cancel().catch(() => {});}
}
async function assertEnvironment(config: PublicationRuntimeConfig, signal: AbortSignal, fetcher: MessageMediaFetch) {
  if (!isHostedPublicationRuntime(config)) await assertDisposableDatabase(config, signal, fetcher);
}
type Options = {fetcher?: MessageMediaFetch; service?: ReturnType<typeof createLocationService>;
  environmentGuard?: typeof assertEnvironment; deadlineMs?: number};
export function createProfileLocationHandler(config: PublicationRuntimeConfig, apiKey: string | null, options: Options = {}) {
  const fetcher = options.fetcher ?? fetch, service = options.service ?? createLocationService(config, apiKey, {fetcher});
  const guard = options.environmentGuard ?? assertEnvironment, deadlineMs = options.deadlineMs ?? 25000;
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 25000) return locationFail("unknown");
  return async (request: Request, action: string): Promise<Response> => {
    if (action !== "suggest" && action !== "save") return reply({error: "unavailable"}, 404);
    if (request.method !== "POST") return reply({error: "invalid"}, 405);
    if (request.headers.get("origin") !== config.appOrigin || request.headers.get("host") !== new URL(config.appOrigin).host) return reply({error: "forbidden"}, 403);
    const authorization = request.headers.get("authorization") ?? "";
    if (!/^Bearer [A-Za-z0-9._-]{1,8192}$/.test(authorization)) return reply({error: "authChanged"}, 401);
    const controller = new AbortController();
    let rejectDeadline: (error: LocationError) => void = () => {};
    const deadline = new Promise<never>((_, reject) => {rejectDeadline = reject;});
    const abort = () => {controller.abort(); rejectDeadline(new LocationError("unknown"));};
    request.signal.addEventListener("abort", abort, {once: true}); if (request.signal.aborted) abort();
    const timer = setTimeout(abort, deadlineMs);
    try {
      const operation = async () => {
        const value = await body(request, controller.signal);
        await guard(config, controller.signal, fetcher);
        if (controller.signal.aborted) return locationFail("unknown");
        return service[action](authorization.slice(7), value, controller.signal);
      };
      const result = await Promise.race([operation(), deadline]);
      if (controller.signal.aborted) return locationFail("unknown");
      return reply(result);
    } catch (error) {
      const code = error instanceof LocationError ? error.code : "unknown";
      return reply({error: code}, code === "invalid" || code === "selectionExpired" ? 400 : code === "conflict" ? 409
        : ["authChanged", "actorChanged", "forbidden"].includes(code) ? 403 : code === "rateLimited" ? 429 : 503);
    } finally {clearTimeout(timer); request.signal.removeEventListener("abort", abort); controller.abort();}
  };
}
export function profileLocationHandler() {
  const config = publicationRuntimeConfig();
  return config ? createProfileLocationHandler(config, process.env.GEOAPIFY_API_KEY ?? null) : null;
}
