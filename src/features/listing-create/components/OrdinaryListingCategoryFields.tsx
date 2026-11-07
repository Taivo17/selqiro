"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingCreateMessages, translateListingCreateMessage } from "../model/listingCreateMessages";
import { getCategoryLabel } from "../../../../lib/categories";
import { ORDINARY_CATEGORY_TREE, ordinaryCategoryNodes, selectOrdinaryCategory,
  type OrdinaryListingFieldState } from "../model/ordinaryListingFields";

type Props = { value: OrdinaryListingFieldState; onChange: (value: OrdinaryListingFieldState) => void };
const labels = ["generalCategory", "subcategory", "specificCategory"];
export default function OrdinaryListingCategoryFields({ value, onChange }: Props) {
  const { language, t } = useV2Translation(listingCreateMessages);

  const nodes = ordinaryCategoryNodes(value.categoryPath) ?? [];
  const groups = [ORDINARY_CATEGORY_TREE, nodes[0]?.children ?? [], nodes[1]?.children ?? []];
  function choose(level: number, next: string) {
    const changed = selectOrdinaryCategory(value, level, next);
    if (changed === value) return;
    if (Object.values(value.detailValues).some(text => text.length > 0)
      && !window.confirm(t("confirmCategoryChange"))) return;
    onChange(changed);
  }
  return (
    <section className="min-w-0 rounded-[30px] border border-black/5 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="ordinary-category-title">
      <h2 id="ordinary-category-title" className="text-2xl font-black tracking-tight">{t("category")}</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{t("categoryHelp")}</p>
      <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-3">
        {groups.map((options, level) => options.length ? (
          <label key={level} className="block min-w-0 rounded-[22px] border border-neutral-200 bg-neutral-50 p-4">
            <span className="text-sm font-bold">{translateListingCreateMessage(language, labels[level])}</span>
            <select id={`ordinary-category-${level}`} value={value.categoryPath[level] ?? ""}
              onChange={event => choose(level, event.target.value)}
              className="mt-2 block w-full min-w-0 rounded-xl border border-neutral-200 bg-white p-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2">
              <option value="">{t("chooseCategory")}</option>
              {options.map(node => <option key={node.value} value={node.value}>{getCategoryLabel(node.value, node.label, language)}</option>)}
            </select>
          </label>
        ) : null)}
      </div>
    </section>
  );
}
