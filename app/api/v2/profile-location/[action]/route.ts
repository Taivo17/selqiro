import { profileLocationHandler } from "../../../../../src/server/profile-location/handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(request: Request, context: {params: Promise<{action: string}>}) {
  const handler = profileLocationHandler();
  if (!handler) return Response.json({error: "unavailable"}, {status: 503, headers: {"Cache-Control": "private, no-store"}});
  return handler(request, (await context.params).action);
}
