"use client";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingCreateMessages, translateListingCreateMessage } from "../model/listingCreateMessages";
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
      return "aiAnimalPhotoRequired";
    }

    if (hasTextContext) {
      return "aiAnimalContext";
    }

    return "aiAnimalReady";
  }

  if (!hasImage) {
    return "aiPhotoRequired";
  }

  if (hasTextContext) {
    return "aiListingContext";
  }

  return "aiListingReady";
}

export default function
ListingCreateAiAnalysisCard(
  props: ListingCreateAiAnalysisCardProps
) {
  const { language, t } = useV2Translation(listingCreateMessages);

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
          <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">{t("stepThreeOptional")}</p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-violet-950">{t("aiHeading")}</h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-violet-950/75">
            {translateListingCreateMessage(language, getAiGuidance(props))}
          </p>
        </div>

        <span className="w-fit shrink-0 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-black text-violet-800">{t("aiNotConnected")}</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-violet-100 bg-white/80 p-4">
          <p className="text-sm font-black text-violet-950">{t("emptyField")}</p>

          <p className="mt-1 text-xs leading-5 text-violet-950/65">{t("aiMayFill")}</p>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-white/80 p-4">
          <p className="text-sm font-black text-violet-950">{t("aiSuggestion")}</p>

          <p className="mt-1 text-xs leading-5 text-violet-950/65">{t("aiMayUpdate")}</p>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-white/80 p-4">
          <p className="text-sm font-black text-violet-950">{t("yourTextConfirmations")}</p>

          <p className="mt-1 text-xs leading-5 text-violet-950/65">{t("aiPreservesInput")}</p>
        </div>
      </div>
    </section>
  );
}
