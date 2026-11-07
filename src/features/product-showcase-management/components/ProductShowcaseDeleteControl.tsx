"use client";

import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import {
  useEffect,
  useState,
} from "react";
import type {
  ProductShowcase,
} from "../../../entities/product-showcase/model/types";

type ProductShowcaseDeleteControlProps = {
  showcase: ProductShowcase;
  confirming: boolean;
  deleting: boolean;
  disabled: boolean;
  onStart: () => void;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

export default function
ProductShowcaseDeleteControl({
  showcase,
  confirming,
  deleting,
  disabled,
  onStart,
  onCancel,
  onConfirm,
}: ProductShowcaseDeleteControlProps) {
  const { language, r } = useMarketplaceTranslation();
  const [
    confirmationTitle,
    setConfirmationTitle,
  ] = useState("");

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    setConfirmationTitle("");
    setError(null);
  }, [
    showcase.id,
    confirming,
  ]);

  const titleConfirmed =
    confirmationTitle.trim() ===
    showcase.title;

  async function handleConfirm() {
    setError(null);

    if (!titleConfirmed) {
      setError(
        marketplaceMessage("showcase.enter_the_product_showcase_name_exactly_as_shown.d694c4")
      );

      return;
    }

    try {
      await onConfirm();
    } catch (deleteError) {
      setError(
        safeMarketplaceError(deleteError, marketplaceMessage("showcase.the_product_showcase_could_not_be_permanently_deleted.6bd5cd"))
      );
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {r(marketplaceMessage("showcase.delete_permanently.c69790"))}</button>
    );
  }

  return (
    <div className="min-w-0 basis-full rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-black text-red-950">
        {r(marketplaceMessage("showcase.permanently_delete_this_product_showcase.fea764"))}</p>

      <p className="mt-2 text-xs leading-5 text-red-800">
        {r(marketplaceMessage("showcase.the_product_showcase_and_all_its_images_will.a6e11e"))}</p>

      <label className="mt-4 block">
        <span className="block text-xs font-black text-red-950">
          {r(marketplaceMessage("showcase.to_confirm_enter_exactly.24f9f9"))}</span>

        <span className="mt-1 block break-words rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-black text-red-950">
          {r(showcase.title)}
        </span>

        <input
          value={confirmationTitle}
          onChange={(event) => {
            setConfirmationTitle(
              event.target.value
            );

            setError(null);
          }}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          disabled={deleting}
          aria-label={r(marketplaceMessage("showcase.enter_the_product_showcase_name_to_confirm_deletion.b92333"))}
          className="mt-2 min-h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-neutral-950 outline-none transition focus:border-red-500 disabled:cursor-wait disabled:opacity-60"
        />
      </label>

      {r(error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold leading-5 text-red-900"
        >
          {r(error)}
        </p>
      ) : null)}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            void handleConfirm()}
          disabled={deleting ||
            !titleConfirmed}
          className="rounded-full bg-red-700 px-4 py-2 text-xs font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {r(deleting
            ? marketplaceMessage("service.deleting.b12b82")
            : marketplaceMessage("showcase.delete_permanently.c69790"))}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-800 disabled:cursor-wait disabled:opacity-50"
        >
          {r(marketplaceMessage("service.cancel.a6b940"))}</button>
      </div>
    </div>
  );
}
