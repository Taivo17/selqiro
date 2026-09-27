"use client";

import { useEffect, useRef } from "react";
import { SEARCH_CATEGORIES, SEARCH_CONDITIONS, searchCategoryChildren, searchCategoryLabel,
  type PublicSearchInput, type PublicSearchFields, type SearchCondition, type SearchCategory }
  from "../../../entities/listing/model/publicSearch";

type Props = {input: PublicSearchInput; onChange: (fields: Partial<PublicSearchFields>) => void;
  onClose: () => void; onClear: () => void};
const control = "mt-2 min-h-12 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-950 focus:outline-none focus:ring-2 focus:ring-amber-500";
function CategorySelect({label, value, nodes, all, onChange}: {
  label: string; value: string; nodes: readonly SearchCategory[]; all: string; onChange: (value: string) => void;
}) {
  return <label className="block text-sm font-bold">{label}
    <select className={control} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{all}</option>
      {nodes.map(node => <option key={node.value} value={node.value}>{searchCategoryLabel(node)}</option>)}
    </select>
  </label>;
}
export default function SearchFilters({input, onChange, onClose, onClear}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.documentElement.style.overflow;
    dialog.showModal();
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus({preventScroll: true});
    return () => {
      dialog.close(); document.documentElement.style.overflow = overflow;
      if (previousFocus?.isConnected) previousFocus.focus({preventScroll: true});
    };
  }, []);
  const children = searchCategoryChildren(input.category);
  const details = searchCategoryChildren(input.category, input.subcategory);
  return (
    <dialog ref={ref} aria-labelledby="listing-filter-title" aria-describedby="listing-filter-help"
      className="fixed inset-y-0 left-auto right-0 m-0 h-[100dvh] max-h-none w-full max-w-lg border-0 bg-white p-0 text-neutral-950 shadow-2xl backdrop:bg-black/35"
      onCancel={e => {e.preventDefault(); onClose();}} onClick={e => {if (e.target === e.currentTarget) onClose();}}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <h2 id="listing-filter-title" className="text-2xl font-black">Täpsusta otsingut</h2>
          <button ref={closeRef} type="button" aria-label="Sulge filtrid" onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 text-2xl">×</button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
          <p id="listing-filter-help" className="text-sm leading-6 text-neutral-600">Valikud rakenduvad automaatselt. Sulgemisel jäävad need alles.</p>
          <CategorySelect label="Kategooria" all="Kõik kategooriad" value={input.category} nodes={SEARCH_CATEGORIES}
            onChange={category => onChange({category, subcategory: "", detailCategory: ""})} />
          {input.category && children.length ? <CategorySelect label="Alamkategooria" all="Kõik selles kategoorias"
            value={input.subcategory} nodes={children} onChange={subcategory => onChange({subcategory, detailCategory: ""})} /> : null}
          {input.subcategory && details.length ? <CategorySelect label="Täpsem kategooria" all="Kõik selles alamkategoorias"
            value={input.detailCategory} nodes={details} onChange={detailCategory => onChange({detailCategory})} /> : null}
          <label className="block text-sm font-bold">Seisukord
            <select className={control} value={input.condition} onChange={e => onChange({condition: e.target.value as SearchCondition})}>
              <option value="">Kõik seisukorrad</option>
              {SEARCH_CONDITIONS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">Asukoht
            <input className={control} value={input.location} maxLength={160} placeholder="Näiteks Paide või Eesti"
              onChange={e => onChange({location: e.target.value})} autoComplete="off" />
          </label>
          <p className="text-sm leading-6 text-neutral-600">Otsime kuulutusse märgitud linna või riigi teksti järgi, mitte kilomeetrite raadiuses.</p>
          <p className="text-sm text-neutral-600">Järjestus: uuemad ees.</p>
        </div>
        <footer className="shrink-0 space-y-3 border-t border-neutral-200 bg-white p-5" style={{paddingBottom: "max(env(safe-area-inset-bottom), 20px)"}}>
          <button type="button" onClick={onClose} className="min-h-12 w-full rounded-full bg-neutral-950 px-5 py-3 font-bold text-white">Näita tulemusi</button>
          <button type="button" onClick={onClear} className="min-h-11 w-full rounded-full border border-neutral-300 px-5 py-2 font-bold">Tühjenda filtrid</button>
        </footer>
      </div>
    </dialog>
  );
}
