import {publicationRuntimeConfig, assertPublicationReadEnvironment, isHostedPublicationRuntime} from "../../../../../../src/server/listing-publication/journey/integrationRuntime";
import {createListingMediaHandler} from "../../../../../../src/server/listing-publication/final/serveListingMedia";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: {params: Promise<{attemptId: string; ordinal: string}>}) {
  const c = publicationRuntimeConfig();
  if (!c) return new Response(null, {status: 404, headers: {"Cache-Control": "no-store"}});
  if (isHostedPublicationRuntime(c) && request.headers.get("host") !== new URL(c.appOrigin).host)
    return new Response(null, {status: 403, headers: {"Cache-Control": "no-store"}});
  try {
    await assertPublicationReadEnvironment(c, request.signal);
    const p = await context.params;
    return createListingMediaHandler(c)(p.attemptId, p.ordinal, request.signal);
  } catch { return new Response(null, {status: 503, headers: {"Cache-Control": "no-store"}}); }
}
