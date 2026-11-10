import { getCatalogTranslation } from "../../../../lib/i18n/useTranslation";
import type { LegacyStoreCategorySaveResult } from "../../../entities/listing/api/saveLegacyStoreCategorySelection";

const messages = {
  en: {
    notSaved: "The listing has been saved, but its shop category was not saved. The existing listing will open so you can check its categories. Do not publish the listing again.",
    identity: "The listing has been saved, but its shop categories could not be saved under the selected identity. Check the existing listing and your active identity. A listing without an identity cannot be assigned a shop category; its identity is not changed automatically.",
    unconfirmed: "The listing has been saved. The shop-category save could not be confirmed. The existing listing will open so you can check which categories were saved before trying again. Do not publish the listing again.",
  },
  et: {
    notSaved: "Kuulutus on salvestatud, kuid poe rubriik jäi salvestamata. Avan olemasoleva kuulutuse, et saaksid selle rubriigid üle vaadata. Ära avalda sama kuulutust uuesti.",
    identity: "Kuulutus on salvestatud, kuid poe rubriike ei saanud valitud identiteedi all salvestada. Kontrolli olemasolevat kuulutust ja aktiivset identiteeti. Identiteedita kuulutusele ei saa poe rubriiki määrata; identiteeti ei muudeta automaatselt.",
    unconfirmed: "Kuulutus on salvestatud. Poe rubriigi salvestuse tulemust ei saanud kinnitada. Avan olemasoleva kuulutuse, et saaksid enne uut katset kontrollida, millised rubriigid salvestusid. Ära avalda sama kuulutust uuesti.",
  },
} as const;

export function legacyStoreCategoryRecovery(
  result: LegacyStoreCategorySaveResult,
  language: string | null | undefined,
  listingId: string | number,
): Readonly<{ message: string; href: string }> | null {
  if (result.status === "saved" || result.status === "not_requested") return null;
  const key = result.status === "unconfirmed" ? "unconfirmed"
    : result.reason === "identity" ? "identity" : "notSaved";
  return {
    message: getCatalogTranslation(language, messages, key),
    href: `/v2/my-area/listings/${encodeURIComponent(String(listingId))}/store-categories`,
  };
}
