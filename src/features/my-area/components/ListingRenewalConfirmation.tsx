"use client";
import { useEffect, useRef } from "react";
import type { ListingRenewalConfirmation as Confirmation } from "../model/ownerListingActivitySession";

type Props = { confirmation: Confirmation; busy: boolean; onCancel: () => void; onConfirm: () => void };
export default function ListingRenewalConfirmation({ confirmation, busy, onCancel, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.documentElement.style.overflow;
    dialog.showModal(); document.documentElement.style.overflow = "hidden";
    cancel.current?.focus({ preventScroll: true });
    return () => {
      dialog.close(); document.documentElement.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} aria-labelledby="listing-renewal-title" aria-describedby="listing-renewal-help"
    className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-6 text-neutral-950 shadow-xl backdrop:bg-black/35"
    onCancel={e => { e.preventDefault(); if (!busy) onCancel(); }}>
    <h3 id="listing-renewal-title" className="text-xl font-black">Kas pakkumine on endiselt alles?</h3>
    <p className="mt-3 break-words font-bold">{confirmation.title}</p>
    <p id="listing-renewal-help" className="mt-3 text-sm leading-6 text-neutral-700">
      Kinnitad selle ühe kuulutuse kehtivust. Uus tähtaeg on kinnitamisest 90 päeva.
      See on tasuta ega kasuta Energy’t. Sisu, pildid ja kuulutuse koht järjestuses ei muutu.
      Pikemat olemasolevat tähtaega ei lühendata.
    </p>
    <div className="mt-5 flex flex-col gap-3">
      <button type="button" onClick={onConfirm} disabled={busy}
        className="min-h-12 rounded-full bg-neutral-950 px-4 py-3 font-bold text-white disabled:opacity-50">
        {busy ? "Uuendan…" : "Kinnita ja uuenda tasuta"}
      </button>
      <button ref={cancel} type="button" onClick={onCancel} disabled={busy}
        className="min-h-11 rounded-full border border-neutral-300 px-4 py-2 font-bold disabled:opacity-50">Tühista</button>
    </div>
    {busy ? <p role="status" className="mt-3 text-sm text-neutral-600">Ootan serveri kinnitust. Ära korda toimingut.</p> : null}
  </dialog>;
}
