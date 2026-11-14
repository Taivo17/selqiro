"use client";
import {createContext, useContext, type ReactNode} from "react";
import {getCatalogTranslation, normalizeLanguage, type TranslationParams} from "../../../../lib/i18n/useTranslation";
import {useV2Language} from "../../../shared/i18n/V2LanguageProvider";
import {providerControlMessages, type ProviderControlMessage} from "./providerControlMessages";

const Language = createContext<string | null>(null);
/** Legacy surfaces supply their already loaded language; no extra preference or auth request. */
export function ProviderControlLanguage({language, children}: {language?: string | null; children: ReactNode}) {
  return <Language.Provider value={language === undefined ? null : normalizeLanguage(language)}>{children}</Language.Provider>;
}
export function useProviderControlTranslation() {
  const override = useContext(Language), current = useV2Language();
  const language = normalizeLanguage(override ?? current.language);
  return {language, t: (key: ProviderControlMessage, params?: TranslationParams) =>
    getCatalogTranslation(language, providerControlMessages, key, params)};
}
