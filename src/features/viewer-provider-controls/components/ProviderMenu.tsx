"use client";
import { useRef } from "react";
import type { ProviderControlTarget } from "../../../entities/viewer-provider-controls/model/types";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { providerControlMessages } from "../model/providerControlMessages";
import { useProviderControlsContext } from "./ProviderControlsBoundary";

export default function ProviderMenu({target, name, allowHide = true}: {target: ProviderControlTarget; name: string; allowHide?: boolean}) {
  const controls = useProviderControlsContext(), {t} = useV2Translation(providerControlMessages), menu = useRef<HTMLDetailsElement>(null);
  if (!controls) return null;
  const busy = controls.view.phase === "writing" || (!controls.account.ready && !controls.account.error);
  const choose = (action: "hide" | "block") => {
    if (menu.current) {menu.current.open = false; menu.current.querySelector("summary")?.focus();}
    controls.session.open(target, action, name);
  };
  return <details ref={menu} className="relative shrink-0" data-provider-menu>
    <summary aria-label={t("options") + (name ? `: ${name}` : "")} className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-full border border-neutral-200 bg-white px-3 font-bold text-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">•••</summary>
    <div className="absolute right-0 z-40 mt-2 w-64 max-w-[calc(100vw-3rem)] rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg">
      {allowHide ? <button type="button" disabled={busy} onClick={() => choose("hide")} className="min-h-11 w-full rounded-xl px-3 py-3 text-left text-sm font-semibold hover:bg-neutral-100 disabled:opacity-50">{t("hide")}</button> : null}
      <button type="button" disabled={busy} onClick={() => choose("block")} className="min-h-11 w-full rounded-xl px-3 py-3 text-left text-sm font-semibold hover:bg-neutral-100 disabled:opacity-50">{t("block")}</button>
    </div>
  </details>;
}
