"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useV2Language } from "../../../shared/i18n/V2LanguageProvider";
import { getListingReturnBackLabel, markListingReturnFallbackNavigation,
  readListingReturnContext, type ListingReturnContext } from "../model/listingReturnContext";

/** Shared by numeric listings and canonical horse UUIDs; the saved ID must match the viewed detail. */
export default function ListingReturnBackButton({listingId, className, fallbackHref = "/v2/products"}: {
  listingId: string; className: string; fallbackHref?: string;
}) {
  const {language} = useV2Language(), router = useRouter();
  const [saved, setSaved] = useState<{id: string; context: ListingReturnContext | null} | null>(null);
  useEffect(() => {
    // Browser session history is unavailable during server rendering; adopt it after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved({id: listingId, context: readListingReturnContext(listingId)});
  }, [listingId]);
  const context = saved?.id === listingId ? saved.context : null;
  function back() {
    const current = readListingReturnContext(listingId);
    if (!current) {router.push(fallbackHref); return;}
    if (window.history.length > 1) {router.back(); return;}
    markListingReturnFallbackNavigation(current);
    router.push(current.sourceUrl);
  }
  return <button type="button" onClick={back} className={className}>
    {getListingReturnBackLabel(context, language)}
  </button>;
}
