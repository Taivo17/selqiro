import "server-only";
import { after } from "next/server";
import { ListingContactError } from "../../entities/conversation/model/listingContact";
import { MESSAGE_IMAGE_LIMITS, imageRecord } from "../../entities/conversation/model/messageImage";
import { publicationRuntimeConfig, assertPublicationActor, type PublicationRuntimeConfig } from "../listing-publication/journey/integrationRuntime";
import { createMessageImageService } from "./service";
import { runMessageImageMaintenance } from "./maintenance";
import type { MessageMediaFetch } from "./transport";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin" };
const reply = (body: object, status = 200) => Response.json(body, { status, headers });
async function readBody(request: Request, maximum: number) {
  if (!request.body || request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new ListingContactError("input");
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maximum)) throw new ListingContactError("input");
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) { const item = await reader.read(); if (item.done) break;
      length += item.value.byteLength; if (length > maximum) throw new ListingContactError("input"); chunks.push(item.value.slice()); }
    if (declared !== null && length !== Number(declared)) throw new ListingContactError("input");
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return imageRecord(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
  } catch { throw new ListingContactError("input"); }
  finally { void reader.cancel().catch(() => {}); }
}
type Options = Readonly<{ fetcher?: MessageMediaFetch; service?: ReturnType<typeof createMessageImageService>;
  actorGuard?: typeof assertPublicationActor }>;
export function createMessageImageHandler(config: PublicationRuntimeConfig, options: Options = {}) {
  const fetcher = options.fetcher ?? fetch, service = options.service ?? createMessageImageService(config, { fetcher });
  const guard = options.actorGuard ?? assertPublicationActor;
  return async (request: Request, action: string): Promise<Response> => {
    if (!["upload", "read", "cancel"].includes(action)) return reply({ error: "not_found" }, 404);
    if (request.method !== "POST") return reply({ error: "method" }, 405);
    if (request.headers.get("origin") !== config.appOrigin || request.headers.get("host") !== new URL(config.appOrigin).host)
      return reply({ error: "origin" }, 403);
    const authorization = request.headers.get("authorization") ?? "";
    if (!/^Bearer [A-Za-z0-9._-]{1,8192}$/.test(authorization)) return reply({ error: "unauthorized" }, 401);
    try {
      const input = await readBody(request, action === "upload" ? MESSAGE_IMAGE_LIMITS.requestBytes : 4096);
      const token = authorization.slice(7);
      await guard(config, token, input.expectedUserId, request.signal, fetcher);
      if (action === "read") {
        const bytes = await service.read(token, input, request.signal);
        return new Response(bytes as BodyInit, { status: 200, headers: { ...headers, "Content-Type": "image/webp",
          "Content-Length": String(bytes.length), "Content-Disposition": "inline; filename=message.webp" } });
      }
      return reply(await service[action as "upload" | "cancel"](token, input, request.signal));
    } catch (error) {
      const code = error instanceof ListingContactError ? error.code : error instanceof Error
        && ["unauthorized", "context_changed", "integration_unverified"].includes(error.message) ? error.message : "outcome_unknown";
      return reply({ error: code }, ["unauthorized", "context_changed"].includes(code) ? 403
        : code === "input" ? 400 : code === "refused" ? 409 : 503);
    }
  };
}
export function publicationMessageImageHandler() {
  const config = publicationRuntimeConfig();
  if (!config) return null;
  const service = createMessageImageService(config, { maintenance: async () => {
    // Called only after this operation's actor-bound RPC/receipt succeeded.
    // Keep image delivery independent of browser cancellation and cleanup I/O.
    after(() => runMessageImageMaintenance(config));
  } });
  return createMessageImageHandler(config, { service });
}
