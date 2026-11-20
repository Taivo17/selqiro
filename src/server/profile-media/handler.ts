import "server-only";
import { after } from "next/server";
import { PROFILE_MEDIA_LIMITS, ProfileMediaError, profileMediaFail, copyProfileMediaActor, copyProfileMediaUploadBody,
  copyProfileMediaUpdateCommand } from "../../entities/profile/model/profileMedia";
import { publicationRuntimeConfig, isHostedPublicationRuntime, type PublicationRuntimeConfig } from "../listing-publication/journey/integrationRuntime";
import { assertDisposableDatabase } from "../listing-publication/journey/localIntegration";
import type { MessageMediaFetch } from "../messaging-media/transport";
import { createProfileMediaService } from "./service";
import { runProfileMediaMaintenance } from "./maintenance";

const commands = { snapshot: copyProfileMediaActor, upload: copyProfileMediaUploadBody, update: copyProfileMediaUpdateCommand };
type Action = keyof typeof commands;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
async function readBody(request: Request, maximum: number, signal: AbortSignal): Promise<unknown> {
  if (signal.aborted) return profileMediaFail("aborted");
  if (!request.body || request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return profileMediaFail("input");
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maximum)) return profileMediaFail("input");
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  let count = 0;
  try {
    while (true) { const part = await reader.read(); if (signal.aborted) return profileMediaFail("aborted"); if (part.done) break;
      count += part.value.byteLength; if (count > maximum) return profileMediaFail("input"); chunks.push(part.value.slice()); }
    if (declared !== null && count !== Number(declared)) return profileMediaFail("input");
    const bytes = new Uint8Array(count); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch { return profileMediaFail(signal.aborted ? "aborted" : "input"); }
  finally { signal.removeEventListener("abort", abort); void reader.cancel().catch(() => {}); }
}
async function assertEnvironment(config: PublicationRuntimeConfig, signal: AbortSignal, fetcher: MessageMediaFetch) {
  // Config already carries the validated deployment/project binding. Profile
  // ownership is authenticated by its own RPC, independent of publication
  // readiness, the listing pause switch or the historical pilot allowlist.
  if (!isHostedPublicationRuntime(config)) await assertDisposableDatabase(config, signal, fetcher);
}
type Options = Readonly<{ fetcher?: MessageMediaFetch; service?: ReturnType<typeof createProfileMediaService>;
  environmentGuard?: typeof assertEnvironment; maintenance?: () => void; deadlineMs?: number }>;
export function createProfileMediaHandler(config: PublicationRuntimeConfig, options: Options = {}) {
  const fetcher = options.fetcher ?? fetch, service = options.service ?? createProfileMediaService(config, { fetcher });
  const guard = options.environmentGuard ?? assertEnvironment;
  const deadlineMs = options.deadlineMs ?? 55000;
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 55000) return profileMediaFail("configuration");
  return async (request: Request, action: string): Promise<Response> => {
    if (!Object.prototype.hasOwnProperty.call(commands, action)) return reply({ error: "not_found" }, 404);
    if (request.method !== "POST") return reply({ error: "method" }, 405);
    if (request.headers.get("origin") !== config.appOrigin || request.headers.get("host") !== new URL(config.appOrigin).host)
      return reply({ error: "origin" }, 403);
    const authorization = request.headers.get("authorization") ?? "";
    if (!/^Bearer [A-Za-z0-9._-]{1,8192}$/.test(authorization)) return reply({ error: "unauthorized" }, 401);
    const controller = new AbortController();
    let rejectDeadline: (error: ProfileMediaError) => void = () => {};
    const deadline = new Promise<never>((_, reject) => { rejectDeadline = reject; });
    const abort = () => { controller.abort(); rejectDeadline(new ProfileMediaError("aborted")); };
    request.signal.addEventListener("abort", abort, { once: true });
    if (request.signal.aborted) abort();
    // A wall-clock bound covers body streaming as well as every subsequent
    // authority/image/storage step; maxDuration alone is not an operation fence.
    const timer = setTimeout(() => { controller.abort(); rejectDeadline(new ProfileMediaError("outcome_unknown")); }, deadlineMs);
    try {
      const operation = async () => {
        const command = commands[action as Action](await readBody(request, action === "upload" ? PROFILE_MEDIA_LIMITS.requestBytes : 4096, controller.signal));
        await guard(config, controller.signal, fetcher);
        if (controller.signal.aborted) return profileMediaFail("aborted");
        return service[action as Action](authorization.slice(7), command, controller.signal);
      };
      const result = await Promise.race([operation(), deadline]);
      if (controller.signal.aborted) return profileMediaFail("aborted");
      try { options.maintenance?.(); } catch { /* Durable cleanup is retried by a later successful request. */ }
      return reply(result);
    } catch (error) {
      const code = error instanceof ProfileMediaError ? error.code : error instanceof Error && error.message === "integration_unverified"
        ? "integration_unverified" : "outcome_unknown";
      return reply({ error: code }, code === "input" ? 400 : ["unauthorized", "context_changed"].includes(code) ? 403
        : code === "refused" ? 409 : code === "rate_limited" ? 429 : 503);
    } finally { clearTimeout(timer); request.signal.removeEventListener("abort", abort); controller.abort(); }
  };
}
export function publicationProfileMediaHandler() {
  const config = publicationRuntimeConfig();
  return config ? createProfileMediaHandler(config, { maintenance: () => { after(() => runProfileMediaMaintenance(config)); } }) : null;
}
