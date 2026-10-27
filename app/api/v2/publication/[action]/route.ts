import { publicationJourneyHandler } from "../../../../../src/server/listing-publication/journey/components";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export async function POST(request: Request, context: {params: Promise<{action: string}>}) {
  const handler = publicationJourneyHandler();
  if (!handler) return new Response(null, {status: 404, headers: {"Cache-Control": "no-store"}});
  return handler(request, (await context.params).action);
}
