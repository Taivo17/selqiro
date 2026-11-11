"use client";
import {useEffect, useId, useRef} from "react";
import {useV2Translation} from "../../../shared/i18n/V2LanguageProvider";
import {serviceActivityMessages} from "../model/serviceActivityMessages";

export default function ServiceRenewalConfirmation({title, paused, busy, blocked, onCancel, onConfirm}: {
  title: string; paused: boolean; busy: boolean; blocked: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const {t} = useV2Translation(serviceActivityMessages), id = useId();
  const ref = useRef<HTMLDialogElement>(null), cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dialog = ref.current; if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.documentElement.style.overflow;
    dialog.showModal(); document.documentElement.style.overflow = "hidden"; cancel.current?.focus({preventScroll: true});
    return () => {dialog.close(); document.documentElement.style.overflow = overflow; if (previous?.isConnected) previous.focus({preventScroll: true});};
  }, []);
  return <dialog ref={ref} aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`}
    className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-6 text-neutral-950 shadow-xl backdrop:bg-black/35"
    onCancel={event => {event.preventDefault(); if (!busy) onCancel();}}>
    <h3 id={`${id}-title`} className="text-xl font-black">{t("confirmation")}</h3>
    <p className="mt-3 break-words font-bold">{title}</p>
    <p id={`${id}-help`} className="mt-3 text-sm leading-6 text-neutral-700">{t("confirmationHelp")}</p>
    {paused ? <p className="mt-3 text-sm leading-6 text-neutral-700">{t("pausedHelp")}</p> : null}
    <div className="mt-5 flex flex-col gap-3">
      <button type="button" onClick={onConfirm} disabled={busy || blocked} className="min-h-12 rounded-full bg-neutral-950 px-4 py-3 font-bold text-white disabled:opacity-50">{t(busy ? "renewing" : "confirm")}</button>
      <button ref={cancel} type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-full border border-neutral-300 px-4 py-2 font-bold disabled:opacity-50">{t("cancel")}</button>
    </div>
    {busy ? <p role="status" className="mt-3 text-sm text-neutral-600">{t("waiting")}</p> : null}
  </dialog>;
}
