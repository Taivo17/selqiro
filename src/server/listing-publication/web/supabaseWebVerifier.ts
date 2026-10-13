import "server-only";
import { sanitizeListingImage } from "../images/sanitize.cjs";
import { createPrivateWebVerifier } from "./verifyPrivateWebImage";
import type { WebCommand } from "./webImageContract";
/** Dormant composition. No module-initialization I/O, no browser import and no live route.
 * Activation requires reviewed DB/Storage grants, exclusive write-once WEB paths,
 * native packaging, cleanup/terminal deletion and final publication integration. */
export function verifySupabasePrivateListingWebImage(accessToken:string,command:WebCommand,signal?:AbortSignal) {
  return createPrivateWebVerifier({projectOrigin:process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    publicKey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",serviceKey:process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""},
    sanitizeListingImage)(accessToken,command,signal);
}
