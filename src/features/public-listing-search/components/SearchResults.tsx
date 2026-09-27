"use client";

import type { PublicSearchPage } from "../../../entities/listing/model/publicSearchResponse";
import { PUBLIC_SEARCH_PAGE_SIZE, formatSearchCount } from "../../../entities/listing/model/publicSearch";
import SearchResultCard from "./SearchResultCard";

export default function SearchResults({page, loading, error, offset, onPage, onRetry, onReset}: {
  page: PublicSearchPage | null; loading: boolean; error: string | null; offset: number;
  onPage: (offset: number) => void; onRetry: () => void; onReset: () => void;
}) {
  const button = "min-h-11 rounded-full border border-neutral-300 bg-white px-5 py-2 text-sm font-bold disabled:opacity-40";
  return <div aria-busy={loading}>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <h2 className="text-xl font-black">Otsingu tulemused</h2>
      <p role="status" className="text-sm text-neutral-600">{loading ? "Otsin…" : page
        ? formatSearchCount(page.totalCount) + (page.totalCount === "1" ? " kuulutus" : " kuulutust") : ""}</p>
    </div>
    {loading ? <div aria-hidden="true" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({length: 6}, (_, i) => <div key={i} className="rounded-[26px] border border-neutral-200 bg-white p-3">
        <div className="aspect-[4/3] rounded-[20px] bg-neutral-100 md:aspect-[16/10]" />
        <div className="my-4 h-6 w-3/4 rounded bg-neutral-100" /><div className="my-4 h-5 w-1/2 rounded bg-neutral-100" />
      </div>)}
    </div> : null}
    {!loading && error ? <div role="alert" className="space-y-4 rounded-2xl border border-red-200 bg-white p-5">
      <h3 className="font-bold">Kuulutusi ei saanud laadida</h3><p>{error}</p>
      <button type="button" className={button} onClick={onRetry}>Proovi uuesti</button>
      <button type="button" className={button + " ml-2"} onClick={onReset}>Alusta uuesti</button>
    </div> : null}
    {!loading && page && !page.items.length ? <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
      <h3 className="text-lg font-bold">Kuulutusi ei leitud</h3>
      <p className="text-sm text-neutral-600">Proovi vähem märksõnu või laiemat kategooriat ja asukohta.</p>
      {offset > 0 ? <button type="button" className={button} onClick={() => onPage(0)}>Esimesele lehele</button> : null}
      <button type="button" className={button} onClick={onReset}>Tühjenda otsing</button>
    </div> : null}
    {!loading && page && page.items.length > 0 ? <>
      <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
        {page.items.map(item => <SearchResultCard key={item.id} item={item} />)}
      </div>
      <nav aria-label="Otsingutulemuste leheküljed" className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={button} disabled={!offset} onClick={() => onPage(Math.max(0, offset - PUBLIC_SEARCH_PAGE_SIZE))}>Eelmised</button>
        <span className="text-sm text-neutral-600">{formatSearchCount(String(offset + 1))}–{formatSearchCount(String(offset + page.items.length))}</span>
        <button type="button" className={button} disabled={page.nextOffset === null}
          onClick={() => {if (page.nextOffset !== null) onPage(page.nextOffset);}}>Järgmised</button>
      </nav>
      {page.windowLimitReached ? <p role="status" className="mt-4 text-sm">Tulemusi on palju. Edasi vaatamiseks täpsusta otsingut.</p> : null}
    </> : null}
  </div>;
}
