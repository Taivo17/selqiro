"use client";

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
        "Sisesta tootenäidise nimi täpselt samal kujul."
      );

      return;
    }

    try {
      await onConfirm();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Tootenäidist ei saanud jäädavalt kustutada."
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
        Kustuta jäädavalt
      </button>
    );
  }

  return (
    <div className="min-w-0 basis-full rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-black text-red-950">
        Kustuta tootenäidis jäädavalt?
      </p>

      <p className="mt-2 text-xs leading-5 text-red-800">
        Tootenäidis ja kõik selle pildid
        eemaldatakse jäädavalt. Seda toimingut
        ei saa tagasi võtta.
      </p>

      <label className="mt-4 block">
        <span className="block text-xs font-black text-red-950">
          Sisesta kinnitamiseks täpselt:
        </span>

        <span className="mt-1 block break-words rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-black text-red-950">
          {showcase.title}
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
          aria-label="Sisesta kustutamise kinnitamiseks tootenäidise nimi"
          className="mt-2 min-h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-neutral-950 outline-none transition focus:border-red-500 disabled:cursor-wait disabled:opacity-60"
        />
      </label>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold leading-5 text-red-900"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            void handleConfirm()
          }
          disabled={
            deleting ||
            !titleConfirmed
          }
          className="rounded-full bg-red-700 px-4 py-2 text-xs font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleting
            ? "Kustutan..."
            : "Kustuta jäädavalt"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-black text-red-800 disabled:cursor-wait disabled:opacity-50"
        >
          Tühista
        </button>
      </div>
    </div>
  );
}
