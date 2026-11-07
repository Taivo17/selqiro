"use client";

import { useId } from "react";
import { useV2Language, useV2Translation } from "./V2LanguageProvider";

const messages = {
  en: {
    language: "Language", saving: "Saving language…", loadError: "Could not load your language.",
    saveError: "Could not confirm your language change.", retry: "Try again",
  },
  et: {
    language: "Keel", saving: "Salvestan keelevalikut…", loadError: "Keelevalikut ei õnnestunud laadida.",
    saveError: "Keelevaliku salvestamist ei õnnestunud kinnitada.", retry: "Proovi uuesti",
  },
} as const;

export default function V2LanguageSelect() {
  const id = useId();
  const preference = useV2Language();
  const { t } = useV2Translation(messages);
  return (
    <div className="relative shrink-0" aria-busy={preference.status === "saving"}>
      <label htmlFor={id} className="sr-only">{t("language")}</label>
      <select id={id} value={preference.language} disabled={!preference.canChange}
        title={t("language")} aria-describedby={preference.error ? `${id}-status` : undefined}
        onChange={event => { void preference.setLanguage(event.target.value === "et" ? "et" : "en"); }}
        className="max-w-[7rem] rounded-full border border-neutral-200 bg-white py-2 pl-3 pr-6 text-sm font-medium text-neutral-800 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-60">
        <option value="en" lang="en">English</option>
        <option value="et" lang="et">Eesti</option>
      </select>
      {preference.status === "saving" && <span role="status" className="sr-only">{t("saving")}</span>}
      {preference.error && (
        <div id={`${id}-status`} role="status" className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-neutral-200 bg-white p-3 text-sm shadow-lg">
          <p>{t(preference.error === "load" ? "loadError" : "saveError")}</p>
          <button type="button" onClick={preference.refresh} className="mt-2 underline underline-offset-2">{t("retry")}</button>
        </div>
      )}
    </div>
  );
}
