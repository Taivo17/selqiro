"use client";

import { useV2Translation } from "@/src/shared/i18n/V2LanguageProvider";


import { publicUiMessages } from "@/lib/i18n/catalogs/publicUi";


import { Suspense } from "react";
import ListingSearchPage from "../../../src/features/public-listing-search/components/ListingSearchPage";

export default function V2ProductDiscoveryPage() {
  const { t } = useV2Translation(publicUiMessages);

  return <Suspense fallback={<div role="status" className="py-8 text-neutral-600">{t("loading_search")}</div>}>
    <ListingSearchPage />
  </Suspense>;
}
