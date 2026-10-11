import { buildOrdinaryListingInput } from "../model/ordinaryListingInput";
import type { OrdinaryListingFieldState } from "../model/ordinaryListingFields";

type Props = { value: OrdinaryListingFieldState; title: string; description: string };
export default function OrdinaryListingPreview({ value, title, description }: Props) {
  let message = "Sisestuse vorming on korras. See ei ole veel serveri avaldamiskontroll.";
  let valid = true;
  try { buildOrdinaryListingInput(value, title, description); }
  catch (error) { valid = false; message = error instanceof Error ? error.message : "Täida kuulutuse andmed."; }
  return (
    <section className="rounded-[30px] border border-neutral-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="ordinary-publication-title">
      <h2 id="ordinary-publication-title" className="text-2xl font-black tracking-tight">Avaldamine</h2>
      <p className="mt-3 text-sm leading-6 text-neutral-600" data-ordinary-input-valid={valid ? "true" : "false"} role="status">{message}</p>
      <p id="ordinary-publication-boundary" className="mt-3 text-sm leading-6 text-neutral-600">
        Avaldamine pole selles arendusetapis veel ühendatud. Andmeid ja pilte ei saadeta serverisse.
        Vorm on ainult selles avatud lehes; lehe värskendamisel sisestus kaob.
      </p>
      <button type="button" disabled aria-describedby="ordinary-publication-boundary"
        className="mt-5 w-full rounded-full bg-neutral-200 px-6 py-3 text-base font-black text-neutral-600 disabled:cursor-not-allowed sm:w-auto">
        Avalda kuulutus
      </button>
    </section>
  );
}
