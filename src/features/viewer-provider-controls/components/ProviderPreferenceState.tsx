"use client";
import type { ProviderStatePresentation } from "../model/providerStatePresentation";
import {useProviderControlTranslation} from "../model/providerControlLanguage";
import { localeForLanguage } from "../../../../lib/i18n/useTranslation";

export default function ProviderPreferenceState({presentation}: {presentation: ProviderStatePresentation}) {
  const {language, t} = useProviderControlTranslation();
  const {state, heading, description} = presentation;
  return <div className="space-y-2 rounded-2xl bg-neutral-50 p-4 text-sm leading-6" data-provider-saved-state>
    <h3 className="font-bold">{t(heading)}</h3>
    {description ? <p className="text-neutral-600">{t(description)}</p> : null}
    <p>{state.hidden && state.hiddenUntil ? t("hiddenUntil", {date: new Date(state.hiddenUntil).toLocaleString(localeForLanguage(language))}) : t("noHide")}</p>
    <p>{t(state.blockedByMe ? "ownBlock" : "noOwnBlock")}</p>
    {state.blockedByOther ? <p>{t("blockedOtherHelp")}</p> : null}
  </div>;
}
