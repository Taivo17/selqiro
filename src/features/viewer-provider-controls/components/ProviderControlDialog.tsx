"use client";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import type { ProviderControls } from "../model/useProviderControls";
import { providerControlMessages } from "../model/providerControlMessages";
import { providerActionAllowed } from "../model/providerControlSession";
import ProviderPreferenceState from "./ProviderPreferenceState";

const control = "min-h-11 rounded-full border px-5 py-3 text-sm font-bold disabled:opacity-50";
const button = control + " border-neutral-300 bg-white";
const primary = control + " border-teal-800 bg-teal-800 text-white";
const titles = {hide: "hideTitle", unhide: "unhideTitle", block: "blockTitle", unblock: "unblockTitle"} as const;
const help = {hide: "hideHelp", unhide: "unhideHelp", block: "blockHelp", unblock: "unblockHelp"} as const;
export default function ProviderControlDialog({controls}: {controls: ProviderControls}) {
  const {view, account, session} = controls, {t} = useV2Translation(providerControlMessages);
  const dialog = useRef<HTMLDialogElement>(null), cancel = useRef<HTMLButtonElement>(null), restore = useRef<HTMLElement | null>(null);
  const titleId = useId(), action = view.selection?.action ?? "hide", writing = view.phase === "writing";
  useEffect(() => {
    const element = dialog.current;
    if (view.open && element && !element.open) {
      restore.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      element.showModal(); cancel.current?.focus();
    } else if (!view.open && element?.open) {
      element.close(); if (restore.current?.isConnected) restore.current.focus({preventScroll: true});
      else {
        const surface = element.closest<HTMLElement>("[data-provider-controls-surface]");
        (surface?.querySelector<HTMLElement>("[data-provider-notice]") ?? surface)?.focus({preventScroll: true});
      }
    }
  }, [view.open]);
  const signIn = typeof window === "undefined" ? "/auth" : "/auth?next=" + encodeURIComponent(window.location.pathname + window.location.search);
  const allowed = view.phase === "ready" && !!view.state && providerActionAllowed(view.state, action);
  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => {if (writing) event.preventDefault(); else session.close();}}
    onClose={() => {if (view.open && !writing) session.close();}}
    className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-auto rounded-[26px] border border-neutral-200 bg-white p-5 text-neutral-950 shadow-2xl backdrop:bg-black/40 sm:p-7" data-provider-dialog>
    <div className="space-y-4">
      <h2 id={titleId} className="text-2xl font-black">{t(account.anonymous ? "signInTitle" : titles[action])}</h2>
      {view.selection?.name && !account.anonymous ? <p className="break-words font-semibold">{view.state?.provider.displayName || view.selection.name}</p> : null}
      {account.anonymous ? <><p className="leading-7 text-neutral-600">{t("signInHelp")}</p><Link href={signIn} className={button + " inline-flex"}>{t("signIn")}</Link></>
        : account.error ? <div role="alert"><p>{t("accountError")}</p><button type="button" onClick={account.refresh} className={button + " mt-3"}>{t("retry")}</button></div>
        : <>
          <p className="leading-7 text-neutral-600">{t(help[action])}</p>
          {!account.ready || view.phase === "loading" ? <p role="status">{t("loading")}</p> : null}
          {view.message ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6">{t(view.message)}</p> : null}
          {view.state ? <ProviderPreferenceState state={view.state} /> : null}
          {view.phase === "ready" && !allowed ? <p role="status">{view.state?.blockedByOther && action === "block" ? t("blockedOther") : t("unavailable")}</p> : null}
        </>}
      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <button ref={cancel} type="button" disabled={writing} onClick={session.close} className={button}>{t(view.phase === "uncertain" ? "close" : "cancel")}</button>
        {account.actor && ["uncertain", "error"].includes(view.phase) ? <button type="button" onClick={() => void session.check()} className={button}>{t("checkSaved")}</button> : null}
        {account.actor && (allowed || writing) ? <button type="button" disabled={!allowed || writing} onClick={() => void session.confirm()}
          className={primary}>{t(writing ? "saving" : action)}</button> : null}
      </div>
    </div>
  </dialog>;
}
