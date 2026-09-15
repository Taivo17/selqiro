"use client";
import type { HorseOfferDraftSaveController } from "../model/useHorseOfferDraftSave";

export default function HorseOfferDraftSaveAction({ controller: c }: { controller: HorseOfferDraftSaveController }) {
  const label = c.phase === "saving" ? "Salvestan…" : c.phase === "saved" ? "Salvestatud"
    : c.hasSavedDraft ? "Salvesta muudatused" : "Salvesta hilisemaks";
  const href = c.offerId ? `/v2/my-area/horse-offers/${encodeURIComponent(c.offerId)}` : "/v2/my-area";
  return (
    <div className="rounded-[24px] border border-neutral-200 bg-white px-4 py-4 shadow-sm sm:px-5"
      data-horse-draft-save-action="explicit" data-horse-draft-save-priority="secondary"
      data-horse-draft-save-status={c.phase} data-horse-draft-id={c.offerId ?? undefined}
      data-horse-draft-revision={c.editRevision ?? undefined}>
      <div className="sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-neutral-950">Jätkad hiljem?</p>
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500">Valikuline</span>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-neutral-500">
            Salvesta hobusevormi tekst ja andmed privaatselt. Pilte see tegevus veel ei salvesta.
            Kuulutuse avaldamiseks ei ole eraldi mustandietapp vajalik.
          </p>
          {c.contextChecking && <p role="status" className="mt-2 text-xs text-neutral-500">Kontrollin aktiivset identiteeti…</p>}
          {c.phase === "saved" && <p role="status" className="mt-2 text-xs font-semibold text-emerald-700">Vormi andmed on salvestatud. Pildid ei ole salvestatud.</p>}
          {c.phase === "idle" && c.hasUnsavedChanges && <p role="status" className="mt-2 text-xs font-semibold text-amber-700">Vormis on salvestamata muudatusi.</p>}
          {c.errorMessage && <p role="alert" className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-rose-700">{c.errorMessage}</p>}
        </div>
        <button type="button" onClick={() => { void c.save(); }}
          disabled={c.phase === "saving" || c.phase === "saved" || c.phase === "blocked"}
          data-horse-draft-save-button="explicit"
          className="mt-4 inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-black text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 sm:mt-0 sm:w-auto">{label}</button>
      </div>
      {(c.offerId || c.phase === "blocked") && <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold">
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          {c.offerId ? "Kontrolli mustandit eraldi aknas" : "Ava Minu ala eraldi aknas"}
        </a>
        {c.canRecheck && <button type="button" className="min-h-10 underline underline-offset-4" onClick={c.recheck}>Kontrolli identiteeti uuesti</button>}
      </div>}
    </div>
  );
}
