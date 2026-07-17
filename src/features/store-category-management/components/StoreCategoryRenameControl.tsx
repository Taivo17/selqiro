"use client";

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
      setError("Sisesta rubriigi nimi.");
      return;
    }

    if (cleanName.length > STORE_CATEGORY_NAME_MAX_LENGTH) {
      setError(
        `Rubriigi nimi võib olla kuni ${STORE_CATEGORY_NAME_MAX_LENGTH} tähemärki.`
      );
      return;
    }

    if (unchanged) {
      setError("Rubriigi nimi ei ole muutunud.");
      return;
    }

    try {
      await onSave(cleanName);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Rubriigi nime ei saanud muuta."
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
            {level === "root"
              ? "Muuda ülemrubriigi nime"
              : "Muuda alamrubriigi nime"}
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
            Muutub ainult nimi. Rubriigi asukoht jääb samaks.
          </p>

          <span className="shrink-0 text-[11px] font-black text-neutral-400">
            {name.length}/{STORE_CATEGORY_NAME_MAX_LENGTH}
          </span>
        </div>

        {error ? (
          <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-xs font-semibold leading-5 text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving || !cleanName || unchanged}
            className="rounded-full bg-black px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Salvestan..." : "Salvesta"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-700 disabled:opacity-40"
          >
            Tühista
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className={
        level === "child"
          ? "rounded-xl border border-neutral-200 bg-white px-3 py-2"
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {level === "root" ? (
            <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-500">
              Ülemrubriik
            </span>
          ) : null}

          {level === "root" ? (
            <h3 className="mt-2 break-words text-base font-black leading-5">
              {category.name}
            </h3>
          ) : (
            <p className="break-words text-sm font-black">
              {category.name}
            </p>
          )}

          {level === "child" ? (
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              Alamrubriik
            </p>
          ) : null}

          <button
            type="button"
            onClick={onStartEdit}
            disabled={disabled}
            className="mt-2 text-[11px] font-black text-neutral-500 underline decoration-neutral-300 underline-offset-4 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            Muuda nime
          </button>
        </div>

        {trailing}
      </div>

      {successMessage ? (
        <p className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-2 text-xs font-semibold leading-5 text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {footer ? (
        <div className="mt-2">{footer}</div>
      ) : null}
    </div>
  );
}
