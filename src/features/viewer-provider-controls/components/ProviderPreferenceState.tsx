"use client";
import type { ProviderControlState } from "../../../entities/viewer-provider-controls/model/types";
import {useProviderControlTranslation} from "../model/providerControlLanguage";
import { localeForLanguage } from "../../../../lib/i18n/useTranslation";

export default function ProviderPreferenceState({state}: {state: ProviderControlState}) {
  const {language, t} = useProviderControlTranslation();
  return <div className="space-y-2 rounded-2xl bg-neutral-50 p-4 text-sm leading-6" data-provider-saved-state>
    <h3 className="font-bold">{t("currentState")}</h3>
    <p>{state.hidden && state.hiddenUntil ? t("hiddenUntil", {date: new Date(state.hiddenUntil).toLocaleString(localeForLanguage(language))}) : t("noHide")}</p>
    <p>{t(state.blockedByMe ? "ownBlock" : "noOwnBlock")}</p>
    {state.blockedByOther ? <p>{t("blockedOtherHelp")}</p> : null}
  </div>;
}
