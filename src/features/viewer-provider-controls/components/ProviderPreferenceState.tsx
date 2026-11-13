"use client";
import type { ProviderControlState } from "../../../entities/viewer-provider-controls/model/types";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { localeForLanguage } from "../../../../lib/i18n/useTranslation";
import { providerControlMessages } from "../model/providerControlMessages";

export default function ProviderPreferenceState({state}: {state: ProviderControlState}) {
  const {language, t} = useV2Translation(providerControlMessages);
  return <div className="space-y-2 rounded-2xl bg-neutral-50 p-4 text-sm leading-6" data-provider-saved-state>
    <h3 className="font-bold">{t("currentState")}</h3>
    <p>{state.hidden && state.hiddenUntil ? t("hiddenUntil", {date: new Date(state.hiddenUntil).toLocaleString(localeForLanguage(language))}) : t("noHide")}</p>
    <p>{t(state.blockedByMe ? "ownBlock" : "noOwnBlock")}</p>
    {state.blockedByOther ? <p>{t("blockedOtherHelp")}</p> : null}
  </div>;
}
