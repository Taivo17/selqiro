import "server-only";
import { createPrivateUploadIssuer } from "./issuePrivateUpload";
import { uploadFail, type UploadCommand } from "../../../entities/listing/model/privatePublicationUpload";
/** Dormant server composition; no route imports it yet. No module-initialization I/O.
 * NEVER import this factory from browser code or expose the service key in props/logs. */
export async function issueSupabasePrivateListingUpload(accessToken: string, command: UploadCommand, signal?: AbortSignal) {
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  // No new feature flag that can bypass the release gates. Wiring into a live route
  // requires reviewed SQL/grants, private bucket, cleanup and final-publication integration.
  if (typeof window !== "undefined") return uploadFail("configuration");
  return createPrivateUploadIssuer({ projectOrigin: origin, publicKey, serviceKey })(accessToken, command, signal);
}
