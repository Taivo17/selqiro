"use client";
import type { ProviderControlKind } from "../../../entities/viewer-provider-controls/model/types";
import {useProviderControlTranslation} from "../model/providerControlLanguage";
import { localeForLanguage } from "../../../../lib/i18n/useTranslation";
import { useProviderControlList } from "../model/useProviderControlList";
import { useProviderControlsContext } from "./ProviderControlsBoundary";

const button = "min-h-11 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-bold disabled:opacity-50";
export default function ProviderControlList({kind}: {kind: ProviderControlKind}) {
  const state = useProviderControlList(kind), controls = useProviderControlsContext(), {language, t} = useProviderControlTranslation();
  const hidden = kind === "hidden", action = hidden ? "unhide" : "unblock";
  return <section className="min-w-0 space-y-4" aria-busy={state.loading} data-provider-control-list={kind}>
    <div><h3 className="text-xl font-black">{t(hidden ? "hiddenProviders" : "blockedUsers")}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{t(hidden ? "hiddenListHelp" : "blockedListHelp")}</p></div>
    {state.loading ? <p role="status">{t("listLoading")}</p> : null}
    {state.error ? <div role="alert"><p>{t("listError")}</p><button type="button" onClick={state.account.error ? state.account.refresh : state.refresh} className={button + " mt-3"}>{t("retry")}</button></div> : null}
    {state.page && !state.page.items.length ? <p className="text-sm text-neutral-600">{t(hidden ? "emptyHidden" : "emptyBlocked")}</p> : null}
    <div className="space-y-3">
      {state.page?.items.map(item => {
        const name = item.provider.displayName || t(hidden ? "provider" : "user");
        return <div key={item.target.type + ":" + item.target.id} className="flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3" data-provider-control-row={item.target.id}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-100 text-lg font-bold text-teal-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {item.provider.avatarUrl ? <img src={item.provider.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 basis-36"><p className="break-words font-bold">{name}</p>
            <p className="mt-1 text-xs leading-5 text-neutral-600">{hidden && item.hiddenUntil
              ? t("hiddenUntil", {date: new Date(item.hiddenUntil).toLocaleString(localeForLanguage(language))}) : t("noExpiry")}</p></div>
          <button type="button" disabled={!controls || controls.view.phase === "writing"}
            onClick={() => hidden ? controls?.session.open(item.target, "unhide", name) : controls?.session.openBlockRemoval(item, name)} className={button}>{t(action)}</button>
        </div>;
      })}
    </div>
    {state.page && (state.offset > 0 || state.page.hasMore) ? <nav className="flex justify-between gap-3" aria-label={t(hidden ? "hiddenProviders" : "blockedUsers")}>
      <button type="button" disabled={state.loading || state.offset === 0} onClick={state.previous} className={button}>{t("previous")}</button>
      <button type="button" disabled={state.loading || !state.page.hasMore} onClick={state.next} className={button}>{t("next")}</button>
    </nav> : null}
  </section>;
}
