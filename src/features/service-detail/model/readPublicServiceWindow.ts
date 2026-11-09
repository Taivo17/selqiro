import { searchPublicServices, SERVICE_SEARCH_PAGE_SIZE } from "../../../entities/service/api/getPublicService";
import type { ServiceSearchInput } from "../../../entities/service/model/publicService";

export const MAX_SERVICE_RESTORE_REQUESTS = 8;

/** Bounded re-read of public data; large histories resume at the clicked page. */
export async function readPublicServiceWindow(input: ServiceSearchInput, loadedOffset: number,
  targetOffset: number, signal: AbortSignal, isCurrent: () => boolean) {
  const firstOffset = loadedOffset < MAX_SERVICE_RESTORE_REQUESTS * SERVICE_SEARCH_PAGE_SIZE ? 0 : targetOffset;
  let offset = firstOffset, requests = 0;
  let page = await searchPublicServices(input, offset, signal);
  requests += 1;
  const items = [...page.items], origins = new Map(items.map(item => [item.id, offset]));
  while (page.hasMore && page.nextOffset !== null && page.nextOffset <= loadedOffset && requests < MAX_SERVICE_RESTORE_REQUESTS) {
    if (signal.aborted || !isCurrent()) throw new Error("service_search_cancelled");
    if (page.nextOffset <= offset) throw new Error("service_page_did_not_advance");
    offset = page.nextOffset;
    page = await searchPublicServices(input, offset, signal);
    requests += 1;
    for (const item of page.items) if (!origins.has(item.id)) {origins.set(item.id, offset); items.push(item);}
  }
  return {page: {...page, items}, firstOffset, origins};
}
