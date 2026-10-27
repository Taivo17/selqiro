import { publicationListingContactHandler } from "../../../../../src/server/listing-publication/contact/contactHandler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const handler = publicationListingContactHandler();
  if (!handler) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return handler(request, (await context.params).action);
}
