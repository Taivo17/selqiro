"use client";

import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  normalizeStoreCategoryName,
  STORE_CATEGORY_NAME_MAX_LENGTH,
  type StoreCategory,
} from "../../../entities/store-category/model/types";

type StoreCategoryRenameControlProps = {
  category: StoreCategory;
  level: "root" | "child";
  editing: boolean;
  saving: boolean;
  disabled: boolean;
  successMessage?: string | null;
  trailing?: ReactNode;
  footer?: ReactNode;
  onStartEdit: () => void;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
};

export default function StoreCategoryRenameControl({
  category,
  level,
  editing,
  saving,
  disabled,
  successMessage,
  trailing,
  footer,
  onStartEdit,
  onSave,
  onCancel,
}: StoreCategoryRenameControlProps) {
  const { language, r } = useMarketplaceTranslation();
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(category.name);

    if (editing) {
      setError(null);
    }
  }, [category.name, editing]);

  const cleanName = normalizeStoreCategoryName(name);
  const originalName = normalizeStoreCategoryName(category.name);
  const unchanged = cleanName === originalName;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!cleanName) {
      setError(marketplaceMessage("category.enter_a_category_name.730cbc"));
      return;
    }

    if (cleanName.length > STORE_CATEGORY_NAME_MAX_LENGTH) {
      setError(
        marketplaceMessage("category.the_category_name_can_contain_up_to_value.0188e5", { p0: String(STORE_CATEGORY_NAME_MAX_LENGTH) })
      );
      return;
    }

    if (unchanged) {
      setError(marketplaceMessage("category.the_category_name_has_not_changed.7f4e19"));
      return;
    }

    try {
      await onSave(cleanName);
    } catch (saveError) {
      setError(
        safeMarketplaceError(saveError, marketplaceMessage("category.the_category_could_not_be_renamed.c0c08e"))
      );
    }
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-neutral-200 bg-white p-3"
      >
        <label>
          <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-neutral-500">
            {r(level === "root"
              ? marketplaceMessage("category.rename_parent_category.ebf116")
              : marketplaceMessage("category.rename_subcategory.e5c33b"))}
          </span>

          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            maxLength={STORE_CATEGORY_NAME_MAX_LENGTH}
            autoFocus
            disabled={saving}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <div className="mt-1.5 flex items-start justify-between gap-3">
          <p className="text-[11px] leading-4 text-neutral-500">
            {r(marketplaceMessage("category.only_the_name_will_change_the_category_stays.8a5191"))}</p>

          <span className="shrink-0 text-[11px] font-black text-neutral-400">
            {r(name.length)}/{r(STORE_CATEGORY_NAME_MAX_LENGTH)}
          </span>
        </div>

        {r(error ? (
          <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-xs font-semibold leading-5 text-red-800">
            {r(error)}
          </p>
        ) : null)}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving || !cleanName || unchanged}
            className="rounded-full bg-black px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {r(saving ? marketplaceMessage("service.saving.cf92f2") : marketplaceMessage("category.save.7c457c"))}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-700 disabled:opacity-40"
          >
            {r(marketplaceMessage("service.cancel.a6b940"))}</button>
        </div>
      </form>
    );
  }

  return (
    <div
      className={level === "child"
          ? "rounded-xl border border-neutral-200 bg-white px-3 py-2"
          : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {r(level === "root" ? (
            <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-500">
              {r(marketplaceMessage("category.parent_category.f3ddd3"))}</span>
          ) : null)}

          {r(level === "root" ? (
            <h3 className="mt-2 break-words text-base font-black leading-5">
              {r(category.name)}
            </h3>
          ) : (
            <p className="break-words text-sm font-black">
              {r(category.name)}
            </p>
          ))}

          {r(level === "child" ? (
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              {r(marketplaceMessage("category.subcategory.ee4371"))}</p>
          ) : null)}

          <button
            type="button"
            onClick={onStartEdit}
            disabled={disabled}
            className="mt-2 text-[11px] font-black text-neutral-500 underline decoration-neutral-300 underline-offset-4 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {r(marketplaceMessage("category.rename.599819"))}</button>
        </div>

        {r(trailing)}
      </div>

      {r(successMessage ? (
        <p className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-2 text-xs font-semibold leading-5 text-emerald-800">
          {r(successMessage)}
        </p>
      ) : null)}

      {r(footer ? (
        <div className="mt-2">{r(footer)}</div>
      ) : null)}
    </div>
  );
}
