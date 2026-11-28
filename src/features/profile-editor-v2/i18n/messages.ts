import { profileEditorMessages } from "../../profile-editor/i18n/messages";
export const profileEditorV2Messages = {
  en: { ...profileEditorMessages.en,
    locationIncomplete: "Choose a country and a city or area from the suggestions, or restore your saved location.",
    selectionExpired: "This place selection has expired. Choose the place again before saving. Your other entered details are kept.",
    unavailable: "The location service is temporarily unavailable. Your entered details are kept.",
    rateLimited: "Location requests are busy. Wait a moment before trying again. Your entered details are kept.",
  },
  et: { ...profileEditorMessages.et,
    locationIncomplete: "Vali pakutud loetelust riik ja linn või piirkond või taasta salvestatud asukoht.",
    selectionExpired: "Selle asukoha valik on aegunud. Enne salvestamist vali asukoht uuesti. Sinu muud sisestatud andmed jäävad alles.",
    unavailable: "Asukohateenus pole praegu saadaval. Sinu sisestatud andmed jäävad alles.",
    rateLimited: "Asukohapäringud on hetkel hõivatud. Oota veidi ja proovi uuesti. Sinu sisestatud andmed jäävad alles.",
  },
} as const;
