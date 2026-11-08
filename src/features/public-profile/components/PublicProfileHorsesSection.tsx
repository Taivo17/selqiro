"use client";
import { useEffect, useState } from "react";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";
import { parsePublicMarketplace } from "../../../entities/listing/model/publicRead/publicMarketplace";
import SearchResultCard from "../../public-listing-search/components/SearchResultCard";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { horsePublicMessages } from "../../../../lib/i18n/catalogs/horsePublic";
import { appendPublicProfileHorsePage, type PublicProfileHorsePages } from "../model/publicProfileHorsePages";

export default function PublicProfileHorsesSection({ identityId }: { identityId: string }) {
 const { t } = useV2Translation(horsePublicMessages);
 const [request, setRequest] = useState({ identityId, offset: 0, version: 0 });
 const [state, setState] = useState<PublicProfileHorsePages | null>(null);
 const [failure, setFailure] = useState<typeof request | null>(null);
 const offset = request.identityId === identityId ? request.offset : 0;
 useEffect(() => { const c = new AbortController();
  void (async () => { try {
   const { data, error } = await supabaseBrowserClient.rpc("search_public_marketplace_v1", {
    p_category: "horses", p_identity_id: identityId, p_result_limit: 24, p_result_offset: offset,
   }).abortSignal(c.signal);
   if (error) throw error;
   const page = parsePublicMarketplace(data, offset);
   if (page.items.some(item => item.contentType !== "horse_offer")) throw new Error("profile_horse_scope_mismatch");
   if (!c.signal.aborted) {
    setState(previous => appendPublicProfileHorsePage(previous, identityId, page));
    setFailure(null);
   }
  } catch { if (!c.signal.aborted) setFailure({ identityId, offset, version: request.version }); } })();
  return () => c.abort();
 }, [identityId, offset, request.version]);
 const visible = state?.identityId === identityId ? state : null;
 const failed = failure?.identityId === identityId && failure.offset === offset && failure.version === request.version;
 const loading = !failed && visible?.page.offset !== offset;
 if (visible?.page.totalCount === "0") return null;
 return <section className="space-y-5 rounded-[30px] border border-amber-200 bg-[#fffbeb] p-6" aria-busy={loading}>
  <h2 className="text-2xl font-black">{t("profile_horses")}</h2>
  {visible && <div className="grid gap-4 sm:grid-cols-2">{visible.items.map(item => <SearchResultCard key={item.id} item={item} />)}</div>}
  {failed ? <div role="status"><p>{t("error")}</p><button type="button" className="mt-3 underline"
   onClick={() => setRequest(previous => ({ identityId, offset, version: previous.version + 1 }))}>{t("retry")}</button></div>
   : loading ? <p role="status">{t("loading")}</p> : null}
  {!failed && !loading && visible?.page.nextOffset !== null && visible?.page.nextOffset !== undefined
   && <button type="button" className="rounded-full border border-amber-400 bg-white px-5 py-3 font-bold"
    onClick={() => setRequest(previous => ({ identityId, offset: visible.page.nextOffset!, version: previous.version }))}>{t("more")}</button>}
 </section>;
}
