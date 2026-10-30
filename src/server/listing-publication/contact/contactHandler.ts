import { localIntegrationConfig } from "../journey/localIntegration";
import { assertPublicationActor, publicationRuntimeConfig, type PublicationRuntimeConfig } from "../journey/integrationRuntime";
import { createListingContactService } from "./contactListing";
import { ListingContactError } from "../../../entities/conversation/model/listingContact";
import { contactDiagnostic, type ListingContactDiagnosticCode, type ListingContactStage } from "../../../entities/conversation/model/contactDiagnostic";
import type { UploadFetch } from "../../../entities/listing/api/privateUploadHttp";

const actions = ["contact", "send", "get", "list", "getWithListings"] as const;
const reply = (body: unknown, status = 200) => Response.json(body, { status,
  headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
const rejected = (code: ListingContactDiagnosticCode, status: number) => reply({ error: code,
  diagnostic: contactDiagnostic("request", code, status) }, status);
async function readBody(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json" || !request.body) throw new ListingContactError("input");
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > 32768)) throw new ListingContactError("input");
  const reader = request.body.getReader(); let count = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) { const item = await reader.read(); if (item.done) break;
      count += item.value.byteLength; if (count > 32768) throw new ListingContactError("input"); chunks.push(item.value); }
    const bytes = new Uint8Array(count); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch { throw new ListingContactError("input"); }
  finally { void reader.cancel().catch(() => {}); }
}
export function createListingContactHandler(c: PublicationRuntimeConfig, fetcher: UploadFetch = fetch) {
  const service = createListingContactService(c, fetcher);
  return async (request: Request, action: string) => {
    if (!actions.includes(action as typeof actions[number])) return rejected("not_found", 404);
    if (request.method !== "POST") return rejected("method", 405);
    if (request.headers.get("host") !== new URL(c.appOrigin).host || request.headers.get("origin") !== c.appOrigin) return rejected("origin", 403);
    const authorization = request.headers.get("authorization") ?? "";
    if (!/^Bearer [A-Za-z0-9._-]{1,8192}$/.test(authorization)) return rejected("unauthorized", 401);
    let stage: ListingContactStage = "request";
    try {
      const input = await readBody(request);
      const expectedUserId = input && typeof input === "object" && !Array.isArray(input)
        ? (input as Record<string, unknown>).expectedUserId : undefined;
      stage = "actor_check";
      await assertPublicationActor(c, authorization.slice(7), expectedUserId, request.signal, fetcher);
      stage = "service_auth";
      return reply(await service[action as typeof actions[number]](authorization.slice(7), input, request.signal));
    } catch (error) {
      const code: ListingContactDiagnosticCode = error instanceof ListingContactError ? error.code
        : error instanceof Error && ["unauthorized", "context_changed", "integration_unverified"].includes(error.message)
          ? error.message as "unauthorized" | "context_changed" | "integration_unverified" : "outcome_unknown";
      const status = ["unauthorized", "context_changed"].includes(code) ? 403 : ["input", "refused"].includes(code) ? 409 : 503;
      const diagnostic = error instanceof ListingContactError && error.diagnostic ? error.diagnostic
        : contactDiagnostic(code === "integration_unverified" ? "readiness" : code === "input" ? "request" : stage, code, status);
      return reply({ error: code, diagnostic }, status);
    }
  };
}
export function localListingContactHandler() {
  const config = localIntegrationConfig();
  return config ? createListingContactHandler(config) : null;
}

export function publicationListingContactHandler() {
  const config = publicationRuntimeConfig();
  return config ? createListingContactHandler(config) : null;
}
