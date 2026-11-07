import { getCatalogTranslation } from "../../../../lib/i18n/useTranslation";
import { LISTING_CREATE_CONTENT_TYPES, type ListingCreateContentType } from "./contentType";
import { HORSE_OFFER_TYPES, type HorseOfferType } from "./horseOfferType";

export type ListingCreateTextGuidance = {
  heroDescription: string; sectionDescription: string; titlePlaceholder: string; descriptionPlaceholder: string;
};
const guidance = {
  en: {
    listingHero: "Add a title, description and photos, then choose the category, condition and price.",
    listingSection: "Write a short, clear title and describe your offer in your own words. Include its condition, features and other useful information.",
    listingTitle: "For example, a short and clear title",
    listingDescription: "Describe the condition, features and other useful information…",
    horseHero: "Start with a title and description if you know what horse you are offering or seeking. AI uses your text and cover photo to suggest missing information and does not silently overwrite your text.",
    horseSection: "Describe the horse offer in your own words. If you leave fields empty, AI may later suggest a short title and description from the cover photo.",
    horseTitle: "For example, a horse for sale, lease or wanted",
    horseDescription: "Describe the horse or the horse you would like to find…",
    saleSection: "Describe the horse for sale in your own words. You may leave the title and description empty if you want a later AI suggestion from the cover photo.",
    saleTitle: "For example, a 2017 Estonian sport horse for sale",
    saleDescription: "Describe the horse’s temperament, training, uses and other information for a buyer…",
    freeSection: "Describe the horse being offered free and the new home or keeper you are looking for. AI may later suggest text only for empty fields.",
    freeTitle: "For example, a calm mare free to a responsible home",
    freeDescription: "Describe the horse, reason for transfer, suitable new home and other important information…",
    leaseSection: "Describe the horse offered for lease or agreed use. AI may later suggest text only for empty fields.",
    leaseTitle: "For example, a dressage horse for lease",
    leaseDescription: "Describe the horse, lease or use terms, suitable rider and other important information…",
    riderSection: "Describe the horse and the co-rider you are looking for. AI may later suggest text only for empty fields.",
    riderTitle: "For example, seeking a co-rider for a calm gelding",
    riderDescription: "Describe the horse, riding arrangements, expected experience and other conditions…",
    wantedSection: "Describe the horse you would like to find. You do not need a photo of a specific horse yet, and AI does not replace your preferences.",
    wantedTitle: "For example, looking for a calm leisure horse",
    wantedDescription: "Describe the intended use, level, age, temperament and other preferences…",
  },
  et: {
    listingHero: "Lisa pakkumise pealkiri, kirjeldus ja pildid ning vali kategooria, seisukord ja hind.",
    listingSection: "Kirjuta lühike ja selge pealkiri ning kirjelda pakkumist oma sõnadega. Lisa seisukord, omadused ja muu huvilisele oluline info.",
    listingTitle: "Näiteks lühike ja selge pealkiri",
    listingDescription: "Kirjelda seisukorda, omadusi ja muud huvilisele olulist infot…",
    horseHero: "Kirjuta esmalt pealkiri ja kirjeldus, kui tead, millist hobust pakud või otsid. AI kasutab sinu teksti ja põhipilti puuduva info soovitamiseks ega kirjuta sinu teksti vaikides üle.",
    horseSection: "Kirjelda hobusepakkumist oma sõnadega. Kui jätad väljad tühjaks, võib AI pärast põhipildi lisamist pakkuda lühikese pealkirja ja kirjelduse.",
    horseTitle: "Näiteks hobuse müük, rent või otsing",
    horseDescription: "Kirjelda hobust või seda, millist hobust soovid leida…",
    saleSection: "Kirjelda müüdavat hobust oma sõnadega. Pealkirja ja kirjelduse võib jätta tühjaks, kui soovid hiljem AI soovitust põhipildi põhjal.",
    saleTitle: "Näiteks 2017. aasta Eesti sporthobune müügiks",
    saleDescription: "Kirjelda hobuse iseloomu, väljaõpet, kasutusala ja muud ostjale olulist infot…",
    freeSection: "Kirjelda tasuta üleantavat hobust ja millist uut kodu või pidajat otsid. AI võib hiljem soovitada ainult tühje välju.",
    freeTitle: "Näiteks rahulik mära tasuta vastutavasse koju",
    freeDescription: "Kirjelda hobust, üleandmise põhjust, sobivat uut kodu ja muud olulist infot…",
    leaseSection: "Kirjelda rendile või kokkulepitud kasutusse pakutavat hobust. AI võib hiljem soovitada ainult tühje välju.",
    leaseTitle: "Näiteks koolisõidu hobune rendile",
    leaseDescription: "Kirjelda hobust, rendi või kasutuse tingimusi, sobivat ratsanikku ja muud olulist infot…",
    riderSection: "Kirjelda hobust ja millist kaasratsanikku otsid. AI võib hiljem soovitada ainult tühje välju.",
    riderTitle: "Näiteks otsime rahulikule ruunale kaasratsanikku",
    riderDescription: "Kirjelda hobust, ratsutamise korraldust, oodatavat kogemust ja muid tingimusi…",
    wantedSection: "Kirjelda, millist hobust soovid leida. Konkreetse hobuse pilti ei pea veel olemas olema ning AI ei asenda sinu eelistusi.",
    wantedTitle: "Näiteks otsin rahulikku harrastushobust",
    wantedDescription: "Kirjelda soovitud hobuse kasutusala, taset, vanust, iseloomu ja muid eelistusi…",
  },
} as const;
/** Render-time guidance. The UI language never modifies the saved draft or publication payload. */
export function getListingCreateTextGuidance(contentType: ListingCreateContentType,
  horseOfferType: HorseOfferType | null, language: string = "en"): ListingCreateTextGuidance {
  const t = (key: keyof typeof guidance.en) => getCatalogTranslation(language, guidance, key);
  if (contentType !== LISTING_CREATE_CONTENT_TYPES.horseOffer) return {
    heroDescription: t("listingHero"), sectionDescription: t("listingSection"),
    titlePlaceholder: t("listingTitle"), descriptionPlaceholder: t("listingDescription"),
  };
  const prefix = horseOfferType === HORSE_OFFER_TYPES.sale ? "sale"
    : horseOfferType === HORSE_OFFER_TYPES.freeTransfer ? "free"
    : horseOfferType === HORSE_OFFER_TYPES.lease ? "lease"
    : horseOfferType === HORSE_OFFER_TYPES.coRider ? "rider"
    : horseOfferType === HORSE_OFFER_TYPES.wanted ? "wanted" : "horse";
  return { heroDescription: t("horseHero"), sectionDescription: t(`${prefix}Section`),
    titlePlaceholder: t(`${prefix}Title`), descriptionPlaceholder: t(`${prefix}Description`) };
}
