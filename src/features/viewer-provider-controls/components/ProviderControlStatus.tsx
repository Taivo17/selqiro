"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import {useProviderControlTranslation} from "../model/providerControlLanguage";
import { localeForLanguage } from "../../../../lib/i18n/useTranslation";
import type { ProviderControls } from "../model/useProviderControls";

export default function ProviderControlStatus({controls}: {controls: ProviderControls}) {
  const {view, session} = controls, {language, t} = useProviderControlTranslation(), box = useRef<HTMLDivElement>(null);
  const unresolved = !view.open && ["uncertain", "error"].includes(view.phase) && !!view.selection;
  useEffect(() => {if (view.notice && !view.open) box.current?.focus({preventScroll: true});}, [view.notice, view.open]);
  if (!view.notice && !unresolved && !(view.phase === "writing" && !view.open)) return null;
  return <div ref={box} role="status" tabIndex={-1} className="mb-5 space-y-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-teal-700" data-provider-notice>
    {unresolved ? <><p>{t(view.message ?? "unknown")}</p><button type="button" className="min-h-11 font-bold underline" onClick={() => {session.reopen(); void session.check();}}>{t("checkSaved")}</button></>
      : view.phase === "writing" ? <p>{t("saving")}</p>
      : view.notice ? <>
        <p className="font-semibold">{t(view.notice.message)}</p>
        {view.notice.action === "hide" && view.notice.state.hiddenUntil ? <p>{t("hiddenUntil", {date: new Date(view.notice.state.hiddenUntil).toLocaleString(localeForLanguage(language))})}</p> : null}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {view.notice.action === "hide" && view.notice.state.hidden ? <button type="button" className="min-h-11 font-bold underline" onClick={() => void session.undo()}>{t("undo")}</button> : null}
          <Link href="/v2/my-area#my-area-provider-controls" className="inline-flex min-h-11 items-center font-semibold underline">{t("manageLink")}</Link>
          <button type="button" className="ml-auto min-h-11 px-3 font-semibold" aria-label={t("dismissNotice")} onClick={session.dismissNotice}>×</button>
        </div>
      </> : null}
  </div>;
}
