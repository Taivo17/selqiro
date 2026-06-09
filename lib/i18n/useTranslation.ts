import { translations, Language, TranslationKey } from "./translations";

function getNestedValue(obj: any, path: string) {
  return path.split(".").reduce((current, part) => {
    return current?.[part];
  }, obj);
}

export function getTranslation(
  language: string | null | undefined,
  key: TranslationKey
) {
  const lang =
    language && language in translations
      ? (language as Language)
      : "en";

  return (
    getNestedValue(translations[lang], key) ||
    getNestedValue(translations.en, key) ||
    key
  );
}
