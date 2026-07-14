"use client";

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
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = normalizeStoreCategoryName(name);

    setError(null);

    if (!cleanName) {
      setError("Sisesta alamrubriigi nimi.");
      return;
    }

    if (cleanName.length > STORE_CATEGORY_NAME_MAX_LENGTH) {
      setError(
        `Alamrubriigi nimi võib olla kuni ${STORE_CATEGORY_NAME_MAX_LENGTH} tähemärki.`
      );
      return;
    }

    try {
      await onCreate(cleanName);
      setName("");
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : "Alamrubriiki ei saanud lisada."
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
          Uus alamrubriik
        </span>

        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          maxLength={STORE_CATEGORY_NAME_MAX_LENGTH}
          placeholder="Näiteks Murutraktorid"
          autoFocus
          disabled={creating}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      <div className="mt-1.5 flex items-start justify-between gap-3">
        <p className="text-[11px] leading-4 text-neutral-500">
          Lisatakse rubriigi „{parentName}” alla.
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
          disabled={creating || !name.trim()}
          className="rounded-full bg-black px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creating ? "Lisan..." : "Lisa alamrubriik"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={creating}
          className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-black text-neutral-700 disabled:opacity-40"
        >
          Tühista
        </button>
      </div>
    </form>
  );
}
