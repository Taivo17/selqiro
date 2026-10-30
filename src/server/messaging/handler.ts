import "server-only";
import { after } from "next/server";
import { assertPublicationActor, publicationRuntimeConfig, type PublicationRuntimeConfig } from "../listing-publication/journey/integrationRuntime";
import { runMessageImageMaintenance } from "../messaging-media/maintenance";
import { createMessagingService } from "./service";
import { ListingContactError } from "../../entities/conversation/model/listingContact";
import { contactDiagnostic, type ListingContactDiagnosticCode, type ListingContactStage } from "../../entities/conversation/model/contactDiagnostic";
import { copyGetMessageThread, copyListMessageThreads, copySendMessage, copyMarkThreadRead,
  copyHideThread, copySetThreadBlocked } from "../../entities/conversation/model/messagingCommands";
import type { UploadFetch } from "../../entities/listing/api/privateUploadHttp";

const commands = { get: copyGetMessageThread, list: copyListMessageThreads, send: copySendMessage,
  read: copyMarkThreadRead, hide: copyHideThread, block: copySetThreadBlocked };
type Action = keyof typeof commands;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
async function readBody(request: Request): Promise<unknown> {
  if (!request.body || request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new ListingContactError("input");
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > 32768)) throw new ListingContactError("input");
  const reader = request.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) { const item = await reader.read(); if (item.done) break;
      length += item.value.byteLength; if (length > 32768) throw new ListingContactError("input"); chunks.push(item.value.slice()); }
    if (declared !== null && length !== Number(declared)) throw new ListingContactError("input");
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch { throw new ListingContactError("input"); }
  finally { void reader.cancel().catch(() => {}); }
}
type Options = Readonly<{ fetcher?: UploadFetch; service?: ReturnType<typeof createMessagingService>;
  actorGuard?: typeof assertPublicationActor; maintenance?: () => void }>;
export function createMessagingHandler(config: PublicationRuntimeConfig, options: Options = {}) {
  const fetcher = options.fetcher ?? fetch, service = options.service ?? createMessagingService(config, fetcher);
  const guard = options.actorGuard ?? assertPublicationActor;
  return async (request: Request, action: string) => {
    if (!Object.prototype.hasOwnProperty.call(commands, action)) return reply({ error: "not_found" }, 404);
    if (request.method !== "POST") return reply({ error: "method" }, 405);
    if (request.headers.get("host") !== new URL(config.appOrigin).host || request.headers.get("origin") !== config.appOrigin)
      return reply({ error: "origin" }, 403);
    const authorization = request.headers.get("authorization") ?? "";
    if (!/^Bearer [A-Za-z0-9._-]{1,8192}$/.test(authorization)) return reply({ error: "unauthorized" }, 401);
    let stage: ListingContactStage = "request";
    try {
      const command = commands[action as Action](await readBody(request));
      stage = "actor_check";
      await guard(config, authorization.slice(7), command.expectedUserId, request.signal, fetcher);
      stage = "service_auth";
      const result = await service[action as Action](authorization.slice(7), command, request.signal);
      // Only after successful authenticated authority and a validated receipt.
      // The production scheduler retains invocation lifetime beyond the response.
      try { options.maintenance?.(); } catch { /* A later authenticated request reconciles retained cleanup records. */ }
      return reply(result);
    } catch (error) {
      const code: ListingContactDiagnosticCode = error instanceof ListingContactError ? error.code
        : error instanceof Error && ["unauthorized", "context_changed", "integration_unverified"].includes(error.message)
          ? error.message as "unauthorized" | "context_changed" | "integration_unverified" : "outcome_unknown";
      const status = ["unauthorized", "context_changed"].includes(code) ? 403 : ["input", "refused"].includes(code) ? 409 : 503;
      return reply({ error: code, diagnostic: error instanceof ListingContactError && error.diagnostic ? error.diagnostic
        : contactDiagnostic(code === "integration_unverified" ? "readiness" : stage, code, status) }, status);
    }
  };
}
export function publicationMessagingHandler() {
  const config = publicationRuntimeConfig();
  return config ? createMessagingHandler(config, { maintenance: () => {
    after(() => runMessageImageMaintenance(config));
  } }) : null;
}
