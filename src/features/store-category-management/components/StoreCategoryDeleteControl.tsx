"use client";

import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import { useEffect, useState } from "react";
import type { StoreCategory } from "../../../entities/store-category/model/types";

type StoreCategoryDeleteControlProps = {
  category: StoreCategory;
  level: "root" | "child";
  childCount: number;
  confirming: boolean;
  deleting: boolean;
  disabled: boolean;
  onStart: () => void;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

export default function StoreCategoryDeleteControl({
  category,
  level,
  childCount,
  confirming,
  deleting,
  disabled,
  onStart,
  onCancel,
  onConfirm,
}: StoreCategoryDeleteControlProps) {
  const { language, r } = useMarketplaceTranslation();
  const [error, setError] = useState<string | null>(null);

  const blockedByChildren =
    level === "root" && childCount > 0;

  useEffect(() => {
    setError(null);
  }, [category.id, confirming]);

  async function handleConfirm() {
    setError(null);

    try {
      await onConfirm();
    } catch (deleteError) {
      setError(
        safeMarketplaceError(deleteError, marketplaceMessage("category.the_category_could_not_be_deleted.67c79b"))
      );
    }
  }

  if (confirming) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3">
        <p className="text-sm font-black text-red-950">
          {r(marketplaceMessage("category.delete_category.ef8b6b"))}{r(category.name)}{r(marketplaceMessage("category..bae808"))}</p>

        <p className="mt-2 text-xs leading-5 text-red-800">
          {r(marketplaceMessage("category.listings_will_remain_only_their_links_to_this.8220ab"))}</p>

        {r(level === "root" ? (
          <p className="mt-1 text-xs leading-5 text-red-800">
            {r(marketplaceMessage("category.a_parent_category_can_only_be_deleted_when.6a051a"))}</p>
        ) : null)}

        {r(error ? (
          <p className="mt-2 rounded-lg border border-red-200 bg-white px-2.5 py-2 text-xs font-semibold leading-5 text-red-900">
            {r(error)}
          </p>
        ) : null)}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={deleting}
            className="rounded-full bg-red-700 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {r(deleting ? marketplaceMessage("service.deleting.b12b82") : marketplaceMessage("category.yes_delete.8f2335"))}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-800 disabled:opacity-50"
          >
            {r(marketplaceMessage("service.cancel.a6b940"))}</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onStart}
        disabled={disabled || blockedByChildren}
        className="text-[11px] font-black text-red-700 underline decoration-red-200 underline-offset-4 transition hover:text-red-900 disabled:cursor-not-allowed disabled:text-neutral-400 disabled:no-underline"
      >
        {r(marketplaceMessage("service.delete.b50cda"))}</button>

      {r(blockedByChildren ? (
        <p className="mt-1 text-[11px] leading-4 text-neutral-500">
          {r(marketplaceMessage("category.remove_first.7526d0"))} {r(childCount)}{r(" ")}
          {r(childCount === 1
            ? "alamrubriik"
            : marketplaceMessage("category.subcategories.1bf744"))}.
        </p>
      ) : null)}
    </div>
  );
}
