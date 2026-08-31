import {
  getLiveAnimalOfferCapability,
} from "../model/liveAnimalOfferCapabilities";
import {
  type ListingCreateContentType,
} from "../model/contentType";

type ListingCreateAiAnalysisCardProps = {
  contentType: ListingCreateContentType;
  hasImage: boolean;
  hasTextContext: boolean;
};

function getAiGuidance({
  contentType,
  hasImage,
  hasTextContext,
}: ListingCreateAiAnalysisCardProps): string {
  const liveAnimalCapability =
    getLiveAnimalOfferCapability(
      contentType
    );

  if (liveAnimalCapability) {
    if (!hasImage) {
      return "AI analüüsi käivitamiseks lisa vähemalt üks pilt. Loomaliik ja pakkumise liik valitakse selles kontrollitud voos kasutaja poolt; AI ei paiguta pakkumist tavalisse kaubarubriiki.";
    }

    if (hasTextContext) {
      return `Pealkiri, kirjeldus ja põhipilt on AI-le kontekstina valmis. AI saab kontrollida, kas sisu sobib valitud ${liveAnimalCapability.label.toLowerCase()} režiimiga, ning soovitada ainult puuduvaid nähtavaid loomaandmeid.`;
    }

    return "Põhipilt on AI analüüsiks valmis. AI võib soovitada tühja pealkirja, kirjeldust ja puuduvaid nähtavaid loomaandmeid, kuid ei märgi kasutaja eest reeglite nõustumisi ega faktilisi kinnitusi.";
  }

  if (!hasImage) {
    return "AI analüüsi käivitamiseks lisa vähemalt üks pilt. AI kasutab ainult esimest pilti.";
  }

  if (hasTextContext) {
    return "Pealkiri, kirjeldus ja esimene pilt on AI-le kontekstina valmis. Põhiülesanne on leida õige Selqiro kategooriatee.";
  }

  return "Esimene pilt on AI analüüsiks valmis. Kui pealkiri ja kirjeldus on tühjad, võib AI pakkuda nende jaoks lühikese teksti.";
}

export default function
ListingCreateAiAnalysisCard(
  props: ListingCreateAiAnalysisCardProps
) {
  const liveAnimalCapability =
    getLiveAnimalOfferCapability(
      props.contentType
    );

  return (
    <section
      className="rounded-[30px] border border-violet-200 bg-violet-50 p-5 shadow-sm sm:p-6"
      data-listing-create-ai-mode={
        liveAnimalCapability
          ? "controlled_live_animal"
          : "marketplace_category"
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
            Samm 3 · valikuline
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-violet-950">
            AI analüüs · 25 Energy
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-violet-950/75">
            {getAiGuidance(props)}
          </p>
        </div>

        <span className="w-fit shrink-0 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-black text-violet-800">
          25 Energy · veel ei saada AI-le
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-violet-100 bg-white/80 p-4">
          <p className="text-sm font-black text-violet-950">
            Tühi väli
          </p>

          <p className="mt-1 text-xs leading-5 text-violet-950/65">
            AI võib selle täita.
          </p>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-white/80 p-4">
          <p className="text-sm font-black text-violet-950">
            AI soovitus
          </p>

          <p className="mt-1 text-xs leading-5 text-violet-950/65">
            Uus analüüs võib seda
            värskendada.
          </p>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-white/80 p-4">
          <p className="text-sm font-black text-violet-950">
            Sinu tekst ja kinnitused
          </p>

          <p className="mt-1 text-xs leading-5 text-violet-950/65">
            AI ei kirjuta ega märgi neid
            vaikides üle.
          </p>
        </div>
      </div>
    </section>
  );
}
