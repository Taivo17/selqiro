"use client";

import {
  type HorseOfferDraftSavePhase,
} from "../model/useHorseOfferDraftSave";

type HorseOfferDraftSaveActionProps = {
  phase: HorseOfferDraftSavePhase;
  hasSavedDraft: boolean;
  hasUnsavedChanges: boolean;
  errorMessage: string | null;
  onSave: () => Promise<unknown>;
};

function getButtonLabel(
  phase: HorseOfferDraftSavePhase,
  hasSavedDraft: boolean
): string {
  if (phase === "saving") {
    return "Salvestan…";
  }

  if (phase === "saved") {
    return "Salvestatud";
  }

  return hasSavedDraft
    ? "Salvesta muudatused"
    : "Salvesta hilisemaks";
}

export default function
HorseOfferDraftSaveAction({
  phase,
  hasSavedDraft,
  hasUnsavedChanges,
  errorMessage,
  onSave,
}: HorseOfferDraftSaveActionProps) {
  const saveDisabled =
    phase === "saving"
    || phase === "saved";

  return (
    <div
      className="rounded-[24px] border border-neutral-200 bg-white px-4 py-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5 sm:px-5"
      data-horse-draft-save-action="explicit"
      data-horse-draft-save-priority="secondary"
      data-horse-draft-save-status={phase}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-neutral-950">
            Jätkad hiljem?
          </p>

          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500">
            Valikuline
          </span>
        </div>

        <p className="mt-1 max-w-3xl text-xs leading-5 text-neutral-500">
          Salvesta täidetud hobusevorm
          privaatselt. Kuulutuse avaldamiseks ei
          ole eraldi mustandietapp vajalik.
        </p>

        {phase === "saved" ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-2 text-xs font-semibold leading-5 text-emerald-700"
          >
            Mustand on salvestatud.
          </p>
        ) : null}

        {phase === "idle" && hasUnsavedChanges ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-2 text-xs font-semibold leading-5 text-amber-700"
          >
            Pärast viimast salvestust on vormis
            muudatusi.
          </p>
        ) : null}

        {phase === "error" && errorMessage ? (
          <p
            role="alert"
            className="mt-2 text-xs font-semibold leading-5 text-rose-700"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          void onSave();
        }}
        disabled={saveDisabled}
        data-horse-draft-save-button="explicit"
        className="mt-4 inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-black text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-500 sm:mt-0 sm:w-auto"
      >
        {getButtonLabel(
          phase,
          hasSavedDraft
        )}
      </button>
    </div>
  );
}
