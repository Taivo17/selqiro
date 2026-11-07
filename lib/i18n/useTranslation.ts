import { translations, type Language, type TranslationKey } from "./translations";

export type TranslationParams = Readonly<Record<string, string | number>>;
export type MessageCatalog<Key extends string = string> = {
  readonly en: Readonly<Record<Key, string>>;
  readonly et: Readonly<Partial<Record<Key, string>>>;
};

/** Interface language only. Content metadata and policy documents have their own language. */
export function normalizeLanguage(language: unknown): Language {
  return language === "et" ? "et" : "en";
}

export function localeForLanguage(language: unknown): "en-GB" | "et-EE" {
  return normalizeLanguage(language) === "et" ? "et-EE" : "en-GB";
}

function getNestedValue(value: unknown, path: string): string | undefined {
  let current = value;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, part)) return;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" && current.length ? current : undefined;
}

function interpolate(message: string, params?: TranslationParams): string {
  return message.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (placeholder, key: string) =>
    params && Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : placeholder
  );
}

/** Small feature catalogs use the same English-default lookup as the original V1 catalog. */
export function getCatalogTranslation<Key extends string>(
  language: string | null | undefined,
  catalog: MessageCatalog<Key>,
  key: Key,
  params?: TranslationParams
): string {
  const lang = normalizeLanguage(language);
  const own = (messages: Readonly<Partial<Record<Key, string>>>) =>
    Object.prototype.hasOwnProperty.call(messages, key) ? messages[key] : undefined;
  return interpolate(own(catalog[lang]) || own(catalog.en) || key, params);
}

export function getTranslation(
  language: string | null | undefined,
  key: TranslationKey
) {
  const lang = normalizeLanguage(language);

  return (
    getNestedValue(translations[lang], key) ||
    getNestedValue(translations.en, key) ||
    key
  );
}
