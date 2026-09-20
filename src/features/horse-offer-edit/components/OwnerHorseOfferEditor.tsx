"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useOwnerHorseOfferEditForm } from "../model/useOwnerHorseOfferEditForm";
import { hasPrivateHorseLocation } from "../model/ownerHorseDraftForm";
import OwnerHorseOfferEditFields from "./OwnerHorseOfferEditFields";
import OwnerHorseOfferEditImages from "./OwnerHorseOfferEditImages";

const KINDS: Record<string, string> = { sale: "Müük", free_transfer: "Tasuta üleandmine", lease: "Rent", co_rider: "Kaasratsaniku otsing", wanted: "Otsin hobust" };
const STATUSES: Record<string, string> = { draft: "Mustand", published: "Avaldatud", held_for_review: "Kontrolliootel", paused: "Peatatud", closed: "Lõpetatud", rejected: "Tagasi lükatud", archived: "Arhiveeritud" };
const button = "rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-black text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400";

export default function OwnerHorseOfferEditor({ userId, offerId }: { userId: string; offerId: string }) {
  const { state, session, reload, reset, confirmLeave } = useOwnerHorseOfferEditForm(userId, offerId);
  const detail = state.snapshot?.detail;
  const busy = state.work !== "idle";
  const detailHref = `/v2/my-area/horse-offers/${encodeURIComponent(offerId)}`;
  const blockedContext = state.context !== "ready";
  const title = detail?.title.trim() || detail?.horseName?.trim() || "Pealkirjata hobusepakkumine";
  const onLeave = (event: MouseEvent<HTMLAnchorElement>) => { if (!confirmLeave()) event.preventDefault(); };
  if (state.closed) return <div className="mx-auto max-w-3xl p-8"><p role="alert">Konto muutus. Ava vorm õige kontoga uuesti.</p><Link href="/auth" className="mt-5 inline-block underline">Logi sisse</Link></div>;

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 pb-8"
      data-owner-horse-offer-edit-id={offerId}
      data-owner-horse-offer-edit-mode={session.canEdit() ? "draft-edit" : "read-only"}>
      <header>
        <Link href="/v2/my-area" onClick={onLeave} className="text-sm font-black text-zinc-600 hover:text-zinc-950">← Tagasi Minu alasse</Link>
        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">Hobusepakkumise muutmisvaade</p>
        <h1 className="mt-2 break-words text-3xl font-black tracking-tight sm:text-4xl">{blockedContext || !detail ? "Hobusemustandi muutmine" : title}</h1>
        {!blockedContext && detail ? <p className="mt-3 text-sm text-zinc-600">{KINDS[detail.offerType]} · {STATUSES[detail.status]}</p> : null}
      </header>

      {blockedContext ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <p role={state.context === "checking" ? "status" : "alert"} className="text-sm leading-6">
            {state.context === "checking" ? "Kontrollin aktiivset identiteeti…" : session.contextMessage()}
          </p>
          {state.context === "blocked" ? <button type="button" className={`${button} mt-4`} onClick={() => { void session.refreshContext(); }}>Kontrolli identiteeti uuesti</button> : null}
        </section>
      ) : !detail ? (
        <section className="rounded-[24px] border border-black/10 bg-white p-6">
          <p role="status">{state.work === "loading" ? "Laen mustandit ja selle andmeversiooni…" : state.message || "Pakkumist ei leitud."}</p>
          {!busy ? <button type="button" className={`${button} mt-4`} onClick={reload}>Proovi lugemist uuesti</button> : null}
        </section>
      ) : (
        <>
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6">
            {detail.status !== "draft" ? "See pakkumine ei ole mustand. Andmed on ainult vaatamiseks; staatust selles vormis ei muudeta."
              : !state.form ? "Salvestatud andmete kuju ei ole selles editoris toetatud. Välju ei tõlgendata ümber ega salvestata. Kontrolli andmeid pakkumise vaates."
              : "Muudad olemasolevat privaatset mustandit. Pakkumise liik on lukus. Salvestamine ei avalda kuulutust ega muuda pilte, staatust või reeglinõustumisi."}
          </div>
          <OwnerHorseOfferEditImages images={detail.images} title={title} />
          {state.form ? <OwnerHorseOfferEditFields form={state.form} disabled={!session.canEdit()}
            locationLocked={hasPrivateHorseLocation(detail)} onChange={edit => session.change(edit)} /> : null}
          <section className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm" aria-busy={busy}>
            <div role="status" aria-live="polite" className="text-sm leading-6">
              {state.work === "saving" ? "Salvestan muudatusi…" : state.work === "refreshing" ? "Laen värskeid salvestatud andmeid…"
                : state.message || (session.isDirty() ? "Vormis on salvestamata muudatusi." : "Vorm vastab loetud serveriandmetele.")}
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {detail.status === "draft" && state.form && !state.problem && !state.acknowledgement ? <>
                <button type="button" className={button} disabled={!session.canSave()} onClick={() => { void session.save(); }}>Salvesta muudatused</button>
                <button type="button" className={button} disabled={!session.canEdit() || !session.isDirty()} onClick={reset}>Tühista muudatused</button>
              </> : null}
              {state.acknowledgement || state.problem ? (
                <button type="button" className={button} disabled={busy} onClick={reload}>
                  {state.acknowledgement ? "Laadi salvestatud andmed uuesti" : "Loobu kohalikust sisestusest ja laadi uuesti"}
                </button>
              ) : null}
              <a href={detailHref} target="_blank" rel="noreferrer" className={`${button} text-center`}>Kontrolli pakkumist eraldi aknas</a>
              <Link href={detailHref} onClick={onLeave} className={`${button} text-center`}>Tagasi pakkumise vaatesse</Link>
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-500">Sisestus püsib ainult selles avatud vormis. Salvestamata muudatuste asendamine vajab sinu kinnitust.</p>
          </section>
        </>
      )}
    </div>
  );
}
