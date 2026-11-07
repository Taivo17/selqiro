import { getCatalogTranslation, type TranslationParams } from "../../../../lib/i18n/useTranslation";

export const listingInputMessages = {
  "en": {
    "input.format": "The listing details have an invalid format.",
    "input.categoryRequired": "Choose a category through its final available level.",
    "input.conditionRequired": "Choose the item’s condition.",
    "input.basics": "Add a title of 2–140 characters and a description of up to 5000 characters.",
    "input.descriptionRequired": "Describe your offer in your own words.",
    "input.basicsTooLarge": "The combined title and description are too large.",
    "input.country": "Add a country, up to 120 characters.",
    "input.city": "Add a city or area, up to 160 characters.",
    "input.detailsFormat": "The detail fields have an invalid format.",
    "input.unexpectedDetail": "A detail field does not belong to the selected category. Select the category again.",
    "input.detailTooLong": "A detail is too long or contains invalid characters.",
    "input.detailsTooLarge": "The combined listing details are too large.",
    "input.categoryLevel": "The category selection level is invalid.",
    "input.categoryPath": "The category path is invalid.",
    "input.detailCategory": "The detail does not belong to the selected category.",
    "price.shape": "The price details have an invalid format.",
    "price.kind": "Choose a price type.",
    "price.currency": "Choose a supported currency. Currency is not inferred from location.",
    "price.amount": "Enter the amount using digits. Do not use thousands separators, a currency symbol or an exponent.",
    "price.precision": "The amount has too many decimal places for this currency. Correct the amount or currency; the price is not rounded.",
    "price.nonfixed": "Leave the amount and currency empty for free, negotiable or unspecified prices.",
    "price.inputHelp": "A comma or point is the decimal separator. Do not use thousands separators. Changing currency does not convert the amount.",
    "edit.invalid": "Check the listing title, description, condition and price.",
    "edit.context": "The account or active identity changed. Your input was not saved through this check.",
    "edit.conflict": "The listing has changed. Your input is preserved; check the saved version.",
    "edit.forbidden": "You do not currently have permission to edit this listing.",
    "edit.unavailable": "Price saving is currently unavailable. Please try again later.",
    "edit.unknown": "Could not confirm the save result. Your input is preserved. Check the saved version before saving again.",
    "edit.responseInvalid": "The listing edit response has an invalid format."
  },
  "et": {
    "input.format": "Kuulutuse andmete vorming ei sobi.",
    "input.categoryRequired": "Vali kategooria kuni viimase pakutava astmeni.",
    "input.conditionRequired": "Vali eseme seisukord.",
    "input.basics": "Lisa 2–140 märgiga pealkiri ja kuni 5000 märgiga kirjeldus.",
    "input.descriptionRequired": "Kirjelda pakkumist oma sõnadega.",
    "input.basicsTooLarge": "Pealkirja ja kirjelduse kogumaht on liiga suur.",
    "input.country": "Lisa riik (kuni 120 märki).",
    "input.city": "Lisa linn või piirkond (kuni 160 märki).",
    "input.detailsFormat": "Detailide vorming ei sobi.",
    "input.unexpectedDetail": "Väljade hulgas on valitud kategooriale võõras detail. Vali kategooria uuesti.",
    "input.detailTooLong": "Üks detail on liiga pikk või sisaldab sobimatuid märke.",
    "input.detailsTooLarge": "Kuulutuse detailide kogumaht on liiga suur.",
    "input.categoryLevel": "Kategooria valiku aste ei sobi.",
    "input.categoryPath": "Kategooriatee ei sobi.",
    "input.detailCategory": "Detail ei kuulu valitud kategooriasse.",
    "price.shape": "Hinna andmed ei ole õiges vormingus.",
    "price.kind": "Vali hinna liik.",
    "price.currency": "Vali toetatud valuuta. Valuutat ei tuletata asukohast.",
    "price.amount": "Sisesta summa numbritena. Ära kasuta tuhandete eraldajaid, valuutamärki ega eksponenti.",
    "price.precision": "Summal on selle valuuta jaoks liiga palju komakohti. Paranda summat või valuutat; hinda ei ümardata.",
    "price.nonfixed": "Tasuta, kokkuleppehinna ja lisamata hinna puhul jäta summa ning valuuta tühjaks.",
    "price.inputHelp": "Koma või punkt tähistab kümnendkohta. Ära kasuta tuhandete eraldajaid. Valuuta vahetamine summat ei teisenda.",
    "edit.invalid": "Kontrolli kuulutuse pealkirja, kirjeldust, seisukorda ja hinda.",
    "edit.context": "Konto või aktiivne identiteet muutus. Sisestust ei salvestatud selle kontrolli kaudu.",
    "edit.conflict": "Kuulutust on vahepeal muudetud. Sinu sisestus on alles; kontrolli salvestatud versiooni.",
    "edit.forbidden": "Selle kuulutuse muutmiseks puudub praegu õigus.",
    "edit.unavailable": "Hinna salvestamine pole praegu saadaval. Proovi hiljem uuesti.",
    "edit.unknown": "Salvestuse tulemust ei saanud kinnitada. Sisestus on alles. Ära korda salvestamist; kontrolli salvestatud versiooni.",
    "edit.responseInvalid": "Kuulutuse muutmise vastuse vorming ei sobi."
  }
} as const;

export type ListingInputMessageKey = keyof typeof listingInputMessages.en;
export function isListingInputMessage(key: unknown): key is ListingInputMessageKey {
  return typeof key === "string" && Object.hasOwn(listingInputMessages.en, key);
}
/** Errors remain language-neutral; only known application messages reach the UI. */
export function listingInputMessageKey(error: unknown): ListingInputMessageKey {
  return error instanceof Error && isListingInputMessage(error.message) ? error.message : "edit.invalid";
}
export function translateListingInputMessage(language: string | null | undefined, key: string, params?: TranslationParams): string {
  return getCatalogTranslation(language, listingInputMessages, isListingInputMessage(key) ? key : "edit.invalid", params);
}
