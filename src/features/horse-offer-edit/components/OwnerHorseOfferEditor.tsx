"use client";

import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import { useMarketplaceTranslation } from "../../../shared/i18n/useMarketplaceTranslation";
import Link from "next/link";
import type { MouseEvent } from "react";
import { useOwnerHorseOfferEditForm } from "../model/useOwnerHorseOfferEditForm";
import { hasPrivateHorseLocation } from "../model/ownerHorseDraftForm";
import OwnerHorseOfferEditFields from "./OwnerHorseOfferEditFields";
import OwnerHorseOfferEditImages from "./OwnerHorseOfferEditImages";

const KINDS: Record<string, string> = { sale: marketplaceMessage("horse.sale.2879b9"), free_transfer: marketplaceMessage("horse.free_transfer.ccb86a"), lease: marketplaceMessage("horse.lease.f0268c"), co_rider: marketplaceMessage("horse.co_rider_wanted.0ddb2c"), wanted: marketplaceMessage("horse.horse_wanted.5f511d") };
const STATUSES: Record<string, string> = { draft: marketplaceMessage("horse.draft.e9670d"), published: marketplaceMessage("horse.published.2de00c"), held_for_review: marketplaceMessage("horse.awaiting_review.62ad40"), paused: marketplaceMessage("horse.paused.18c3b2"), closed: marketplaceMessage("horse.closed.d6ea40"), rejected: marketplaceMessage("horse.rejected.7aae6f"), archived: marketplaceMessage("horse.archived.c37d62") };
const button = "rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-black text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400";

export default function OwnerHorseOfferEditor({ userId, offerId }: { userId: string; offerId: string }) {
  const { language, r } = useMarketplaceTranslation();
  const { state, session, reload, reset, confirmLeave } = useOwnerHorseOfferEditForm(userId, offerId);
  const detail = state.snapshot?.detail;
  const busy = state.work !== "idle";
  const detailHref = `/v2/my-area/horse-offers/${encodeURIComponent(offerId)}`;
  const blockedContext = state.context !== "ready";
  const title = detail?.title.trim() || detail?.horseName?.trim() || marketplaceMessage("horse.untitled_horse_listing.9905c6");
  const onLeave = (event: MouseEvent<HTMLAnchorElement>) => { if (!confirmLeave()) event.preventDefault(); };
  if (state.closed) return <div className="mx-auto max-w-3xl p-8"><p role="alert">{r(marketplaceMessage("horse.the_account_changed_reopen_the_form_with_the.cc45b5"))}</p><Link href="/auth" className="mt-5 inline-block underline">{r(marketplaceMessage("horse.sign_in.777709"))}</Link></div>;

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 pb-8"
      data-owner-horse-offer-edit-id={offerId}
      data-owner-horse-offer-edit-mode={session.canEdit() ? "draft-edit" : "read-only"}>
      <header>
        <Link href="/v2/my-area" onClick={onLeave} className="text-sm font-black text-zinc-600 hover:text-zinc-950">{r(marketplaceMessage("horse.back_to_my_area.2b7192"))}</Link>
        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">{r(marketplaceMessage("horse.edit_horse_listing.053f64"))}</p>
        <h1 className="mt-2 break-words text-3xl font-black tracking-tight sm:text-4xl">{r(blockedContext || !detail ? marketplaceMessage("horse.edit_horse_draft.f78c4c") : title)}</h1>
        {r(!blockedContext && detail ? <p className="mt-3 text-sm text-zinc-600">{r(KINDS[detail.offerType])} · {r(STATUSES[detail.status])}</p> : null)}
      </header>

      {r(blockedContext ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <p role={state.context === "checking" ? "status" : "alert"} className="text-sm leading-6">
            {r(state.context === "checking" ? marketplaceMessage("horse.checking_active_identity.d3f8cb") : session.contextMessage())}
          </p>
          {r(state.context === "blocked" ? <button type="button" className={`${button} mt-4`} onClick={() => { void session.refreshContext(); }}>{r(marketplaceMessage("horse.check_identity_again.4889e8"))}</button> : null)}
        </section>
      ) : !detail ? (
        <section className="rounded-[24px] border border-black/10 bg-white p-6">
          <p role="status">{r(state.work === "loading" ? marketplaceMessage("horse.loading_draft_and_revision.26f420") : safeMarketplaceError(state, marketplaceMessage("horse.listing_not_found.3aa43a")))}</p>
          {r(!busy ? <button type="button" className={`${button} mt-4`} onClick={reload}>{r(marketplaceMessage("horse.try_loading_again.eedc7d"))}</button> : null)}
        </section>
      ) : (
        <>
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6">
            {r(detail.status !== "draft" ? marketplaceMessage("horse.this_listing_is_not_a_draft_its_details.944246")
              : !state.form ? marketplaceMessage("horse.the_saved_data_format_is_not_supported_by.005fad")
              : marketplaceMessage("horse.you_are_editing_an_existing_private_draft_the.d8775b"))}
          </div>
          <OwnerHorseOfferEditImages images={detail.images} title={r(title)} />
          {r(state.form ? <OwnerHorseOfferEditFields form={state.form} disabled={!session.canEdit()}
            locationLocked={hasPrivateHorseLocation(detail)} onChange={edit => session.change(edit)} /> : null)}
          <section className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm" aria-busy={busy}>
            <div role="status" aria-live="polite" className="text-sm leading-6">
              {r(state.work === "saving" ? marketplaceMessage("horse.saving_changes.6e93f2") : state.work === "refreshing" ? marketplaceMessage("horse.loading_the_latest_saved_details.1b3853")
                : safeMarketplaceError(state, (session.isDirty() ? marketplaceMessage("horse.the_form_has_unsaved_changes.f383ee") : marketplaceMessage("horse.the_form_matches_the_loaded_server_data.20aad8"))))}
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {r(detail.status === "draft" && state.form && !state.problem && !state.acknowledgement ? <>
                <button type="button" className={button} disabled={!session.canSave()} onClick={() => { void session.save(); }}>{r(marketplaceMessage("horse.save_changes.10e8e6"))}</button>
                <button type="button" className={button} disabled={!session.canEdit() || !session.isDirty()} onClick={reset}>{r(marketplaceMessage("horse.discard_changes.6ed5b2"))}</button>
              </> : null)}
              {r(state.acknowledgement || state.problem ? (
                <button type="button" className={button} disabled={busy} onClick={reload}>
                  {r(state.acknowledgement ? marketplaceMessage("horse.reload_saved_details.256df7") : marketplaceMessage("horse.discard_local_input_and_reload.84f53f"))}
                </button>
              ) : null)}
              <a href={detailHref} target="_blank" rel="noreferrer" className={`${button} text-center`}>{r(marketplaceMessage("horse.check_listing_in_another_window.be7743"))}</a>
              <Link href={detailHref} onClick={onLeave} className={`${button} text-center`}>{r(marketplaceMessage("horse.back_to_listing.ff2537"))}</Link>
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-500">{r(marketplaceMessage("horse.your_input_is_kept_only_in_this_open.1b87ba"))}</p>
          </section>
        </>
      ))}
    </div>
  );
}
