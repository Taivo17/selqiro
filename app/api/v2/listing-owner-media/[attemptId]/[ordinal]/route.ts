import {publicationRuntimeConfig, assertPublicationActor} from "../../../../../../src/server/listing-publication/journey/integrationRuntime";
import {createListingMediaHandler} from "../../../../../../src/server/listing-publication/final/serveListingMedia";
import {isUploadUuid} from "../../../../../../src/entities/listing/model/privatePublicationUpload";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: {params: Promise<{attemptId: string; ordinal: string}>}) {
  const c = publicationRuntimeConfig();
  const error = (status: number) => new Response(null, {status, headers: {"Cache-Control": "no-store"}});
  if (!c) return error(404);
  const token = request.headers.get("authorization") ?? "", userId = request.headers.get("x-selqiro-user"), identityId = request.headers.get("x-selqiro-identity");
  if (!/^Bearer [A-Za-z0-9._-]{1,8192}$/.test(token) || !isUploadUuid(userId) || !isUploadUuid(identityId)) return error(403);
  if (request.headers.get("host") !== new URL(c.appOrigin).host || request.headers.has("origin") && request.headers.get("origin") !== c.appOrigin) return error(403);
  try {
    await assertPublicationActor(c, token.slice(7), userId, request.signal);
    const p = await context.params;
    return createListingMediaHandler(c, fetch, {userId, identityId, accessToken: token.slice(7), publicKey: c.publicKey},
      failure => console.warn("selqiro.owner_image", failure))(p.attemptId, p.ordinal, request.signal);
  } catch (failure) {
    if (failure instanceof Error && ["unauthorized", "context_changed"].includes(failure.message)) return error(403);
    console.warn("selqiro.owner_image", {stage: "environment", status: 503});
    return error(503);
  }
}
