import "server-only";
import {createFinalListingService} from "./finalizeListing";
import {createCleanupOne} from "./cleanupOne";
import {createListingMediaHandler} from "./serveListingMedia";
/** No live routes, schedules, startup I/O or default background workers. Explicit
 * composition is kept closed until SQL/media/Storage/late-write/full-journey acceptance. */
export function createSupabaseFinalListingComponents() {
 const projectOrigin=process.env.NEXT_PUBLIC_SUPABASE_URL??"";
 const service={projectOrigin,serviceKey:process.env.SUPABASE_SERVICE_ROLE_KEY??""};
 return Object.freeze({owner:createFinalListingService({projectOrigin,publicKey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??""}),
  cleanupOne:createCleanupOne(service),serveMedia:createListingMediaHandler(service)});
}
