import { publicationMessageImageHandler } from "../../../../../src/server/messaging-media/handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const handler = publicationMessageImageHandler();
  if (!handler) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  return handler(request, (await context.params).action);
}
