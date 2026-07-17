"use client";

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
        deleteError instanceof Error
          ? deleteError.message
          : "Rubriiki ei saanud kustutada."
      );
    }
  }

  if (confirming) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3">
        <p className="text-sm font-black text-red-950">
          Kustuta rubriik „{category.name}”?
        </p>

        <p className="mt-2 text-xs leading-5 text-red-800">
          Kuulutused jäävad alles. Eemaldatakse ainult
          selle rubriigi seosed kuulutustega.
        </p>

        {level === "root" ? (
          <p className="mt-1 text-xs leading-5 text-red-800">
            Ülemrubriiki saab kustutada ainult siis, kui
            selle all pole alamrubriike.
          </p>
        ) : null}

        {error ? (
          <p className="mt-2 rounded-lg border border-red-200 bg-white px-2.5 py-2 text-xs font-semibold leading-5 text-red-900">
            {error}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={deleting}
            className="rounded-full bg-red-700 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Kustutan..." : "Jah, kustuta"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-800 disabled:opacity-50"
          >
            Tühista
          </button>
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
        Kustuta
      </button>

      {blockedByChildren ? (
        <p className="mt-1 text-[11px] leading-4 text-neutral-500">
          Eemalda esmalt {childCount}{" "}
          {childCount === 1
            ? "alamrubriik"
            : "alamrubriiki"}.
        </p>
      ) : null}
    </div>
  );
}
