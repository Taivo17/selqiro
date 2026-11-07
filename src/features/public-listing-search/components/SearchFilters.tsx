"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { publicUiMessages } from "@/lib/i18n/catalogs/publicUi";


import { useEffect, useRef } from "react";
import { SEARCH_CATEGORIES, SEARCH_CONDITIONS, searchCategoryChildren, searchCategoryLabel, searchConditionLabel,
  type PublicSearchInput, type PublicSearchFields, type SearchCondition, type SearchCategory }
  from "../../../entities/listing/model/publicSearch";

type Props = {input: PublicSearchInput; onChange: (fields: Partial<PublicSearchFields>) => void;
  onClose: () => void; onClear: () => void};
const control = "mt-2 min-h-12 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-950 focus:outline-none focus:ring-2 focus:ring-amber-500";
function CategorySelect({label, value, nodes, all, onChange}: {
  label: string; value: string; nodes: readonly SearchCategory[]; all: string; onChange: (value: string) => void;
}) {
  const { language: uiLanguage } = useV2Translation(publicUiMessages);
  return <label className="block text-sm font-bold">{label}
    <select className={control} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{all}</option>
      {nodes.map(node => <option key={node.value} value={node.value}>{searchCategoryLabel(node, uiLanguage)}</option>)}
    </select>
  </label>;
}
export default function SearchFilters({input, onChange, onClose, onClear}: Props) {
  const { language: uiLanguage, t } = useV2Translation(publicUiMessages);

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
          <h2 id="listing-filter-title" className="text-2xl font-black">{t("refine_your_search")}</h2>
          <button ref={closeRef} type="button" aria-label={t("close_filters")} onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 text-2xl">×</button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
          <p id="listing-filter-help" className="text-sm leading-6 text-neutral-600">{t("filters_apply_automatically_and_remain_selected_when_you_close_this_panel")}</p>
          <CategorySelect label={t("category")} all={t("all_categories")} value={input.category} nodes={SEARCH_CATEGORIES}
            onChange={category => onChange({category, subcategory: "", detailCategory: ""})} />
          {input.category && children.length ? <CategorySelect label={t("subcategory")} all={t("all_in_this_category")}
            value={input.subcategory} nodes={children} onChange={subcategory => onChange({subcategory, detailCategory: ""})} /> : null}
          {input.subcategory && details.length ? <CategorySelect label={t("detailed_category")} all={t("all_in_this_subcategory")}
            value={input.detailCategory} nodes={details} onChange={detailCategory => onChange({detailCategory})} /> : null}
          <label className="block text-sm font-bold">{t("condition")} <select className={control} value={input.condition} onChange={e => onChange({condition: e.target.value as SearchCondition})}>
              <option value="">{t("all_conditions")}</option>
              {SEARCH_CONDITIONS.map(n => <option key={n.value} value={n.value}>{searchConditionLabel(n.value, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">{t("location")} <input className={control} value={input.location} maxLength={160} placeholder={t("for_example_paide_or_estonia")}
              onChange={e => onChange({location: e.target.value})} autoComplete="off" />
          </label>
          <p className="text-sm leading-6 text-neutral-600">{t("this_searches_the_city_or_country_entered_in_a_listing_it_does_not_use_a_di")}</p>
          <p className="text-sm text-neutral-600">{t("order_newest_first")}</p>
        </div>
        <footer className="shrink-0 space-y-3 border-t border-neutral-200 bg-white p-5" style={{paddingBottom: "max(env(safe-area-inset-bottom), 20px)"}}>
          <button type="button" onClick={onClose} className="min-h-12 w-full rounded-full bg-neutral-950 px-5 py-3 font-bold text-white">{t("show_results")}</button>
          <button type="button" onClick={onClear} className="min-h-11 w-full rounded-full border border-neutral-300 px-5 py-2 font-bold">{t("clear_filters")}</button>
        </footer>
      </div>
    </dialog>
  );
}
