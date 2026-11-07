"use client";

import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  normalizeStoreCategoryName,
  STORE_CATEGORY_NAME_MAX_LENGTH,
} from "../../../entities/store-category/model/types";

type StoreCategoryChildCreateFormProps = {
  parentName: string;
  creating: boolean;
  onCreate: (name: string) => Promise<void>;
  onCancel: () => void;
};

export default function StoreCategoryChildCreateForm({
  parentName,
  creating,
  onCreate,
  onCancel,
}: StoreCategoryChildCreateFormProps) {
  const { language, r } = useMarketplaceTranslation();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = normalizeStoreCategoryName(name);

    setError(null);

    if (!cleanName) {
      setError(marketplaceMessage("category.enter_a_subcategory_name.dfbd9a"));
      return;
    }

    if (cleanName.length > STORE_CATEGORY_NAME_MAX_LENGTH) {
      setError(
        marketplaceMessage("category.the_subcategory_name_can_contain_up_to_value.6921e5", { p0: String(STORE_CATEGORY_NAME_MAX_LENGTH) })
      );
      return;
    }

    try {
      await onCreate(cleanName);
      setName("");
    } catch (creationError) {
      setError(
        safeMarketplaceError(creationError, marketplaceMessage("category.the_subcategory_could_not_be_added.33d624"))
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-neutral-200 bg-white p-3"
    >
      <label>
        <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.14em] text-neutral-500">
          {r(marketplaceMessage("category.new_subcategory.a9900a"))}</span>

        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          maxLength={STORE_CATEGORY_NAME_MAX_LENGTH}
          placeholder={r(marketplaceMessage("category.for_example_ride_on_mowers.453710"))}
          autoFocus
          disabled={creating}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      <div className="mt-1.5 flex items-start justify-between gap-3">
        <p className="text-[11px] leading-4 text-neutral-500">
          {r(marketplaceMessage("category.added_under.abe1b1"))}{r(parentName)}{r(marketplaceMessage("category..a7629c"))}</p>

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
          disabled={creating || !name.trim()}
          className="rounded-full bg-black px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {r(creating ? marketplaceMessage("category.adding.57ede3") : marketplaceMessage("category.add_subcategory.6d7727"))}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={creating}
          className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-700 disabled:opacity-40"
        >
          {r(marketplaceMessage("service.cancel.a6b940"))}</button>
      </div>
    </form>
  );
}
