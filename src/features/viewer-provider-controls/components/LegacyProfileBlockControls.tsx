"use client";
import {getCatalogTranslation} from "../../../../lib/i18n/useTranslation";
import {providerControlMessages} from "../model/providerControlMessages";
import type {LegacyProfileBlocks} from "../model/useLegacyProfileBlocks";
import ProviderControlFeedback from "./ProviderControlFeedback";

type Props = {control: LegacyProfileBlocks; language: string; onChoose?: () => void};
export function LegacyProfileBlockButton({control, language, onChoose}: Props) {
  const t = (key: keyof typeof providerControlMessages.en) => getCatalogTranslation(language, providerControlMessages, key);
  const own = !!control.snapshot?.blockedByMe;
  const allowed = own || !!control.snapshot?.canBlock;
  return <button type="button" disabled={!allowed || control.loading || control.controls.view.phase === "writing"}
    onClick={() => {onChoose?.(); if (own) control.openUnblock(); else control.openBlock();}}
    className="min-h-11 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-black/70 hover:bg-black/[0.04] disabled:opacity-50">
    {t(own ? "unblock" : control.snapshot?.blockedByOther ? "blockedOther" : allowed ? "block" : "unavailable")}
  </button>;
}
export function LegacyProfileBlockNotice({control, language}: Props) {
  const t = (key: keyof typeof providerControlMessages.en) => getCatalogTranslation(language, providerControlMessages, key);
  return <section className="mx-auto max-w-xl space-y-4 rounded-3xl border border-neutral-200 bg-white p-6">
    <ProviderControlFeedback controls={control.controls} language={language} />
    <p role={control.error ? "alert" : "status"}>{t(control.loading ? "loading" : control.error ? "readError"
      : control.snapshot?.blockedByMe ? "ownBlock" : control.snapshot?.blockedByOther ? "blockedOtherHelp" : "unavailable")}</p>
    {control.snapshot?.blockedByMe ? <LegacyProfileBlockButton control={control} language={language} /> : null}
    {!control.loading ? <button type="button" className="min-h-11 font-semibold underline" onClick={control.refresh}>{t("checkSaved")}</button> : null}
  </section>;
}
