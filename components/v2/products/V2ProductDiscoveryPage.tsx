"use client";

import { Suspense } from "react";
import ListingSearchPage from "../../../src/features/public-listing-search/components/ListingSearchPage";

export default function V2ProductDiscoveryPage() {
  return <Suspense fallback={<div role="status" className="py-8 text-neutral-600">Laen otsingut…</div>}>
    <ListingSearchPage />
  </Suspense>;
}
