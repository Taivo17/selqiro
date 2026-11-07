import { marketplaceUi } from "../../../lib/i18n/catalogs/marketplaceUi";
import { catalogMessage, renderCatalogMessage, renderUiMessage } from "../../../lib/i18n/interfaceMessage";
import type { TranslationParams } from "../../../lib/i18n/useTranslation";

export type MarketplaceMessageKey = keyof typeof marketplaceUi.en;
/** Store semantic feedback with the operation; translate only when presenting it. */
export function marketplaceMessage(key: MarketplaceMessageKey, params?: TranslationParams): string {
  return catalogMessage("marketplace", key, params);
}

/** Tagged interface copy is resolved; ordinary text and non-string values pass through unchanged. */
export function renderMarketplaceMessage<T>(language: string | null | undefined, value: T): T {
  if (typeof value !== "string") return value;
  return renderUiMessage(language, renderCatalogMessage(language, "marketplace", marketplaceUi, value)) as T;
}

/** Raw server or browser error text is not an interface translation contract. */
export function safeMarketplaceError(error: unknown, fallback: string): string {
  const value = typeof error === "string" ? error
    : error && typeof error === "object" && "message" in error ? error.message : null;
  return typeof value === "string" && renderMarketplaceMessage("en", value) !== value ? value : fallback;
}
