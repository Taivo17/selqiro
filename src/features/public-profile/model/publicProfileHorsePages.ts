import type { PublicSearchCard, PublicSearchPage } from "../../../entities/listing/model/publicSearchResponse";

export type PublicProfileHorsePages = Readonly<{
  identityId: string;
  page: PublicSearchPage;
  items: readonly PublicSearchCard[];
}>;

/** Keep earlier cards when Show more succeeds; never merge different profile scopes. */
export function appendPublicProfileHorsePage(previous: PublicProfileHorsePages | null,
  identityId: string, page: PublicSearchPage): PublicProfileHorsePages {
  if (page.items.some(item => item.contentType !== "horse_offer")) throw new Error("profile_horse_scope_mismatch");
  if (page.offset === 0) return { identityId, page, items: page.items };
  if (previous?.identityId === identityId && previous.page.offset === page.offset) return previous;
  if (!previous || previous.identityId !== identityId || previous.page.nextOffset !== page.offset)
    throw new Error("profile_horse_page_mismatch");
  const ids = new Set(previous.items.map(item => item.id));
  // A newly published record may move the offset between reads. Keep the first rendered card once.
  return { identityId, page, items: [...previous.items, ...page.items.filter(item => !ids.has(item.id))] };
}
