// Listing AI is unavailable for the initial public launch. Re-enabling it requires
// a reviewed server implementation; request headers and environment flags cannot
// reopen the former provider, privileged-write or Energy mutation branches.
export const runtime = "nodejs";

export async function POST(_request: Request): Promise<Response> {
  return Response.json(
    {
      success: false,
      error: "AI assistance is currently unavailable. Please complete the listing manually.",
      code: "listing_ai_disabled",
      retryable: false,
    },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}
