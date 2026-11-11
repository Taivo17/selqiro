"use client";
import { useMemo } from "react";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { renderMarketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { publicUiMessages } from "../../../../lib/i18n/catalogs/publicUi";
import { publicProfileCategoryMessages } from "../model/publicProfileCategoryMessages";
import { buildPublicStoreCategoryView } from "../model/publicStoreCategoryView";
import type { StoreCategory } from "../../../entities/store-category/model/types";

type Props = {
  categories: StoreCategory[]; loading: boolean; error: string | null;
  selectedCategoryId: string | null; expandedRootId: string | null;
  contentKind?: "listings" | "services";
  onSelectAll: () => void; onSelectRoot: (id: string, hasChildren: boolean) => void;
  onSelectChild: (id: string, parentId: string) => void; onRetry?: () => void;
};
const base = "rounded-full border px-4 py-2.5 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2";
const idle = "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300";
const selected = "border-black bg-black text-white shadow-sm";

/** One controlled two-level filter for each public section's server-projected tree. */
export default function PublicProfileStoreCategoryFilter({categories, loading, error, selectedCategoryId, expandedRootId,
  contentKind = "listings", onSelectAll, onSelectRoot, onSelectChild, onRetry}: Props) {
  const {language, t} = useV2Translation(publicUiMessages), {t: contextText} = useV2Translation(publicProfileCategoryMessages);
  const {roots, childrenByParent, directChildCount, deeperCategoryCount} = useMemo(
    () => buildPublicStoreCategoryView(categories, language), [categories, language]);
  const selectedCategory = categories.find(category => category.id === selectedCategoryId);
  const expandedRoot = roots.find(category => category.id === expandedRootId);
  const expandedChildren = expandedRoot ? childrenByParent.get(expandedRoot.id) ?? [] : [];
  const regionId = (id: string) => `public-${contentKind}-store-category-${id}`;
  if (loading) return <div aria-busy="true" className="mb-5 rounded-[22px] border border-neutral-100 bg-[#fbfbfa] p-4">
    <div className="h-4 w-32 animate-pulse rounded-full bg-neutral-200" />
    <div className="mt-3 flex flex-wrap gap-2">{[0, 1, 2].map(item => <div key={item} className="h-10 w-32 animate-pulse rounded-full bg-neutral-100" />)}</div>
  </div>;
  if (error) return <div role="alert" className="mb-5 rounded-[22px] border border-amber-100 bg-amber-50 p-4">
    <p className="text-sm font-black text-amber-950">{t("could_not_load_store_categories")}</p>
    <p className="mt-1 text-xs leading-5 text-amber-900">{renderMarketplaceMessage(language, error)}</p>
    {onRetry ? <button type="button" className={`${base} ${idle} mt-3`} onClick={onRetry}>{t("try_again")}</button> : null}
  </div>;
  if (roots.length === 0) return null;
  return <div data-profile-category-filter={contentKind} className="mb-5 rounded-[22px] border border-neutral-100 bg-[#fbfbfa] p-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">{t("store_categories")}</p>
        <p className="mt-1 text-sm font-black">{contentKind === "services" ? contextText("filterServices") : t("filter_this_profile_s_listings")}</p>
      </div>
      <span className="w-fit rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-neutral-500 shadow-sm">
        {roots.length} {t("parent_categories")} {directChildCount} {t("subcategories")}</span>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={onSelectAll} aria-pressed={selectedCategoryId === null}
        className={`${base} ${selectedCategoryId === null ? selected : idle}`}>
        {contentKind === "services" ? contextText("allServices") : t("all_listings")}</button>
      {roots.map(root => {
        const children = childrenByParent.get(root.id) ?? [], hasChildren = children.length > 0;
        const expanded = hasChildren && expandedRootId === root.id, rootSelected = selectedCategoryId === root.id;
        const branchSelected = rootSelected || selectedCategory?.parent_id === root.id;
        return <button key={root.id} type="button" onClick={() => onSelectRoot(root.id, hasChildren)}
          aria-pressed={rootSelected} aria-expanded={hasChildren ? expanded : undefined}
          aria-controls={expanded ? regionId(root.id) : undefined}
          className={`${base} inline-flex items-center gap-2 ${rootSelected ? selected : branchSelected ? "border-black bg-neutral-100 text-black" : idle}`}>
          <span>{root.name}</span>
          {hasChildren ? <><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${rootSelected ? "bg-white/15 text-white" : "bg-neutral-100 text-neutral-500"}`}>{children.length}</span>
            <span aria-hidden="true" className="text-xs">{expanded ? "⌃" : "⌄"}</span></> : null}
        </button>;
      })}
    </div>
    {expandedRoot && expandedChildren.length > 0 ? <div id={regionId(expandedRoot.id)} className="mt-3 rounded-2xl border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">{expandedRoot.name} {t("subcategories_2")}</p>
        <span className="text-[11px] font-bold text-neutral-400">{t("choose_a_more_specific_category")}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">{expandedChildren.map(child => <button type="button" key={child.id}
        aria-pressed={selectedCategoryId === child.id} onClick={() => onSelectChild(child.id, expandedRoot.id)}
        className={`${base} ${selectedCategoryId === child.id ? selected : idle}`}>{child.name}</button>)}</div>
    </div> : null}
    <p className="mt-3 text-xs leading-5 text-neutral-500">{contentKind === "services"
      ? contextText("serviceHierarchyHelp") : t("a_parent_category_shows_all_listings_in_that_branch_a_subcategory_narrows_t")}</p>
    {deeperCategoryCount > 0 ? <p className="mt-1 text-xs leading-5 text-neutral-500">
      {t("deeper_categories_are_included_in_the_filter_but_are_not_yet_shown_in_the_t")}</p> : null}
  </div>;
}
