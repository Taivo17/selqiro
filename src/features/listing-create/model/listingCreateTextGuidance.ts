import {
  LISTING_CREATE_CONTENT_TYPES,
  type ListingCreateContentType,
} from "./contentType";
import {
  HORSE_OFFER_TYPES,
  type HorseOfferType,
} from "./horseOfferType";

export type ListingCreateTextGuidance = {
  heroDescription: string;
  sectionDescription: string;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
};

const STANDARD_LISTING_GUIDANCE:
  ListingCreateTextGuidance = {
    heroDescription:
      "Kirjuta esmalt pealkiri ja kirjeldus, kui tead, mida pakud. AI kasutab sinu teksti sobiva Selqiro kategooria leidmiseks ega kirjuta seda vaikides üle. Kui sa ei ole kindel, võid väljad tühjaks jätta.",
    sectionDescription:
      "Kirjelda pakkumist oma sõnadega. Sinu tekst aitab AI-l leida sobiva kategooria. Kui jätad väljad tühjaks, võib AI põhipildi põhjal pakkuda lühikese pealkirja ja kirjelduse.",
    titlePlaceholder:
      "Näiteks lühike ja selge pealkiri",
    descriptionPlaceholder:
      "Kirjelda seisukorda, omadusi ja muud huvilisele olulist infot...",
  };

const HORSE_GUIDANCE_BY_OFFER_TYPE:
  Partial<
    Record<
      HorseOfferType,
      Omit<
        ListingCreateTextGuidance,
        "heroDescription"
      >
    >
  > = {
    [HORSE_OFFER_TYPES.sale]: {
      sectionDescription:
        "Kirjelda müüdavat hobust oma sõnadega. Pealkirja ja kirjelduse võib jätta tühjaks, kui soovid hiljem AI soovitust põhipildi põhjal.",
      titlePlaceholder:
        "Näiteks 2017. aasta Eesti sporthobune müügiks",
      descriptionPlaceholder:
        "Kirjelda hobuse iseloomu, väljaõpet, kasutusala ja muud ostjale olulist infot...",
    },
    [HORSE_OFFER_TYPES.freeTransfer]: {
      sectionDescription:
        "Kirjelda tasuta üleantavat hobust ja millist uut kodu või pidajat otsid. AI võib hiljem soovitada ainult tühje välju.",
      titlePlaceholder:
        "Näiteks rahulik mära tasuta vastutavasse koju",
      descriptionPlaceholder:
        "Kirjelda hobust, üleandmise põhjust, sobivat uut kodu ja muud olulist infot...",
    },
    [HORSE_OFFER_TYPES.lease]: {
      sectionDescription:
        "Kirjelda rendile või kokkulepitud kasutusse pakutavat hobust. AI võib hiljem soovitada ainult tühje välju.",
      titlePlaceholder:
        "Näiteks koolisõidu hobune rendile",
      descriptionPlaceholder:
        "Kirjelda hobust, rendi või kasutuse tingimusi, sobivat ratsanikku ja muud olulist infot...",
    },
    [HORSE_OFFER_TYPES.coRider]: {
      sectionDescription:
        "Kirjelda hobust ja millist kaasratsanikku otsid. AI võib hiljem soovitada ainult tühje välju.",
      titlePlaceholder:
        "Näiteks otsime rahulikule ruunale kaasratsanikku",
      descriptionPlaceholder:
        "Kirjelda hobust, ratsutamise korraldust, oodatavat kogemust ja muid tingimusi...",
    },
    [HORSE_OFFER_TYPES.wanted]: {
      sectionDescription:
        "Kirjelda, millist hobust soovid leida. Konkreetse hobuse pilti ei pea veel olemas olema ning AI ei asenda sinu eelistusi.",
      titlePlaceholder:
        "Näiteks otsin rahulikku harrastushobust",
      descriptionPlaceholder:
        "Kirjelda soovitud hobuse kasutusala, taset, vanust, iseloomu ja muid eelistusi...",
    },
  };

const HORSE_DEFAULT_GUIDANCE = {
  sectionDescription:
    "Kirjelda hobusepakkumist oma sõnadega. Kui jätad väljad tühjaks, võib AI pärast põhipildi lisamist pakkuda lühikese pealkirja ja kirjelduse.",
  titlePlaceholder:
    "Näiteks hobuse müük, rent või otsing",
  descriptionPlaceholder:
    "Kirjelda hobust või seda, millist hobust soovid leida...",
} as const;

export function getListingCreateTextGuidance(
  contentType: ListingCreateContentType,
  horseOfferType: HorseOfferType | null
): ListingCreateTextGuidance {
  if (
    contentType !==
    LISTING_CREATE_CONTENT_TYPES.horseOffer
  ) {
    return STANDARD_LISTING_GUIDANCE;
  }

  const offerTypeGuidance =
    horseOfferType
      ? HORSE_GUIDANCE_BY_OFFER_TYPE[
          horseOfferType
        ]
      : null;

  return {
    heroDescription:
      "Kirjuta esmalt pealkiri ja kirjeldus, kui tead, millist hobust pakud või otsid. AI kasutab sinu teksti ja põhipilti puuduva info soovitamiseks ega kirjuta sinu teksti vaikides üle.",
    sectionDescription:
      offerTypeGuidance
        ?.sectionDescription ||
      HORSE_DEFAULT_GUIDANCE
        .sectionDescription,
    titlePlaceholder:
      offerTypeGuidance
        ?.titlePlaceholder ||
      HORSE_DEFAULT_GUIDANCE
        .titlePlaceholder,
    descriptionPlaceholder:
      offerTypeGuidance
        ?.descriptionPlaceholder ||
      HORSE_DEFAULT_GUIDANCE
        .descriptionPlaceholder,
  };
}
