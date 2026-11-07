import { interfaceFeedback } from "./catalogs/interfaceFeedback";
import { getCatalogTranslation, type TranslationParams } from "./useTranslation";

export type InterfaceMessageKey = keyof typeof interfaceFeedback.en;
const PREFIX = "selqiro-ui-message:v1:";

/** Store a language-neutral notice with an operation. Language is resolved only at render. */
export function uiMessage(key: InterfaceMessageKey, params?: TranslationParams): string {
  return PREFIX + JSON.stringify([key, params ?? null]);
}

function parse(value: unknown): { key: InterfaceMessageKey; params?: TranslationParams } | null {
  if (typeof value !== "string" || !value.startsWith(PREFIX)) return null;
  try {
    const row: unknown = JSON.parse(value.slice(PREFIX.length));
    if (!Array.isArray(row) || row.length !== 2 || typeof row[0] !== "string"
      || !Object.prototype.hasOwnProperty.call(interfaceFeedback.en, row[0])) return null;
    const params = row[1];
    if (params !== null && (typeof params !== "object" || Array.isArray(params)
      || Object.values(params).some(value => typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value))))) return null;
    return { key: row[0] as InterfaceMessageKey, params: params ?? undefined };
  } catch { return null; }
}

/** Call only for interface feedback, never on user-written titles, prices or messages. */
export function renderUiMessage(language: string | null | undefined, value: string | null | undefined): string {
  const message = parse(value);
  return message ? getCatalogTranslation(language, interfaceFeedback, message.key, message.params) : value ?? "";
}

export function safeUiError(error: unknown, fallback: InterfaceMessageKey = "operation_failed"): string {
  const value = error instanceof Error ? error.message : error;
  return parse(value) ? value as string : uiMessage(fallback);
}

const CATALOG_PREFIX = "selqiro-ui-catalog:v1:";
const CATALOG_END = ":end";

/** A stable catalog key and parameters, retained across interface language changes. */
export function catalogMessage(namespace: string, key: string, params?: TranslationParams): string {
  return CATALOG_PREFIX + encodeURIComponent(JSON.stringify([namespace, key, params ?? null])) + CATALOG_END;
}

/**
 * Resolves only explicitly tagged interface messages from the supplied catalog.
 * Embedded references support existing composed notices without treating ordinary text as a key.
 */
export function renderCatalogMessage<Key extends string>(
  language: string | null | undefined,
  namespace: string,
  catalog: import("./useTranslation").MessageCatalog<Key>,
  value: string,
): string {
  const resolve = (text: string, depth: number): string => {
    if (depth > 4 || !text.includes(CATALOG_PREFIX)) return text;
    return text.replace(/selqiro-ui-catalog:v1:([^\s]*?):end/g, (reference, encoded: string) => {
      try {
        const row: unknown = JSON.parse(decodeURIComponent(encoded));
        if (!Array.isArray(row) || row.length !== 3 || row[0] !== namespace || typeof row[1] !== "string"
          || !Object.prototype.hasOwnProperty.call(catalog.en, row[1])) return reference;
        const params = row[2];
        if (params !== null && (typeof params !== "object" || Array.isArray(params)
          || Object.values(params).some(item => typeof item !== "string" && (typeof item !== "number" || !Number.isFinite(item))))) return reference;
        const renderedParams = params === null ? undefined : Object.fromEntries(Object.entries(params).map(([name, item]) =>
          [name, typeof item === "string" ? resolve(item, depth + 1) : item])) as TranslationParams;
        return getCatalogTranslation(language, catalog, row[1] as Key, renderedParams);
      } catch { return reference; }
    });
  };
  return resolve(value, 0);
}
