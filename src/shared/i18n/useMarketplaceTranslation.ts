"use client";

import { useV2Language } from "./V2LanguageProvider";
import { renderMarketplaceMessage } from "./marketplaceMessages";

/** This renderer is deliberately not an operation/effect dependency. */
export function useMarketplaceTranslation() {
  const { language } = useV2Language();
  const r = <T,>(value: T): T => renderMarketplaceMessage(language, value);
  return { language, r };
}
