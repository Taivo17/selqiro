"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingCreateMessages, translateListingCreateMessage } from "../model/listingCreateMessages";
import { buildOrdinaryListingInput } from "../model/ordinaryListingInput";
import type { OrdinaryListingFieldState } from "../model/ordinaryListingFields";

type Props = { value: OrdinaryListingFieldState; title: string; description: string };
export default function OrdinaryListingPreview({ value, title, description }: Props) {
  const { language, t } = useV2Translation(listingCreateMessages);

  let message = "inputValid";
  let valid = true;
  try { buildOrdinaryListingInput(value, title, description); }
  catch (error) { valid = false; message = error instanceof Error ? error.message : "completeDetails"; }
  return (
    <section className="rounded-[30px] border border-neutral-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="ordinary-publication-title">
      <h2 id="ordinary-publication-title" className="text-2xl font-black tracking-tight">{t("publication")}</h2>
      <p className="mt-3 text-sm leading-6 text-neutral-600" data-ordinary-input-valid={valid ? "true" : "false"} role="status">{translateListingCreateMessage(language, message)}</p>
      <p id="ordinary-publication-boundary" className="mt-3 text-sm leading-6 text-neutral-600">{t("publicationNotConnected")}</p>
      <button type="button" disabled aria-describedby="ordinary-publication-boundary"
        className="mt-5 w-full rounded-full bg-neutral-200 px-6 py-3 text-base font-black text-neutral-600 disabled:cursor-not-allowed sm:w-auto">{t("publishListing")}</button>
    </section>
  );
}
