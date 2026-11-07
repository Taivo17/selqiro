"use client";
import { marketplaceMessage } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import type { HorseOfferDraftSaveController } from "../model/useHorseOfferDraftSave";

export default function HorseOfferDraftSaveAction({ controller: c }: { controller: HorseOfferDraftSaveController }) {
  const { language, r } = useMarketplaceTranslation();
  const label = c.phase === "saving" ? marketplaceMessage("horse.saving.5bb681") : c.phase === "saved" ? marketplaceMessage("horse.saved.aa67c7")
    : c.hasSavedDraft ? marketplaceMessage("horse.save_changes.10e8e6") : marketplaceMessage("horse.save_for_later.b41aee");
  const href = c.offerId ? `/v2/my-area/horse-offers/${encodeURIComponent(c.offerId)}` : "/v2/my-area";
  return (
    <div className="rounded-[24px] border border-neutral-200 bg-white px-4 py-4 shadow-sm sm:px-5"
      data-horse-draft-save-action="explicit" data-horse-draft-save-priority="secondary"
      data-horse-draft-save-status={c.phase} data-horse-draft-id={c.offerId ?? undefined}
      data-horse-draft-revision={c.editRevision ?? undefined}>
      <div className="sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-neutral-950">{r(marketplaceMessage("horse.continue_later.4117df"))}</p>
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500">{r(marketplaceMessage("horse.optional.a2b24f"))}</span>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-neutral-500">
            {r(marketplaceMessage("horse.save_the_horse_form_s_text_and_details.bd8f16"))}</p>
          {r(c.contextChecking && <p role="status" className="mt-2 text-xs text-neutral-500">{r(marketplaceMessage("horse.checking_active_identity.d3f8cb"))}</p>)}
          {r(c.phase === "saved" && <p role="status" className="mt-2 text-xs font-semibold text-emerald-700">{r(marketplaceMessage("horse.form_details_saved_images_have_not_been_saved.4a3790"))}</p>)}
          {r(c.phase === "idle" && c.hasUnsavedChanges && <p role="status" className="mt-2 text-xs font-semibold text-amber-700">{r(marketplaceMessage("horse.the_form_has_unsaved_changes.f383ee"))}</p>)}
          {r(c.errorMessage && <p role="alert" className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-rose-700">{r(c.errorMessage)}</p>)}
        </div>
        <button type="button" onClick={() => { void c.save(); }}
          disabled={c.phase === "saving" || c.phase === "saved" || c.phase === "blocked"}
          data-horse-draft-save-button="explicit"
          className="mt-4 inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-black text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 sm:mt-0 sm:w-auto">{r(label)}</button>
      </div>
      {r((c.offerId || c.phase === "blocked") && <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold">
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          {r(c.offerId ? marketplaceMessage("horse.check_draft_in_another_window.d53495") : marketplaceMessage("horse.open_my_area_in_another_window.6627ed"))}
        </a>
        {r(c.canRecheck && <button type="button" className="min-h-10 underline underline-offset-4" onClick={c.recheck}>{r(marketplaceMessage("horse.check_identity_again.4889e8"))}</button>)}
      </div>)}
    </div>
  );
}
