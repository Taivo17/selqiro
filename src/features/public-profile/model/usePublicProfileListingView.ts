"use client";
import { useEffect, useRef, useState } from "react";
import type { PublicProfile } from "../../../entities/profile/model/types";
import { usePublicProfileStoreCategories } from "./usePublicProfileStoreCategories";
import { usePublicProfileMarketplace } from "./usePublicProfileMarketplace";
import { getCurrentRelativeUrl, isListingReturnNavigation, readListingReturnContext,
  saveListingReturnContext } from "../../listing-navigation/model/listingReturnContext";
import { useListingReturnRestoration } from "../../listing-navigation/model/useListingReturnRestoration";

export const PROFILE_LISTING_PAGE_SIZE = 24;
export const PROFILE_LISTING_PREVIEW_SIZE = 4;

/** Existing profile filters and navigation state, now applied to one typed server page. */
export function usePublicProfileListingView(profile: PublicProfile, showAll: boolean,
  onShowAllChange: (value: boolean) => void) {
  const profileKey = `${profile.identityId ?? ""}\u001f${profile.slug}`;
  const [preparedKey, setPreparedKey] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedRootId, setExpandedRootId] = useState<string | null>(null);
  const [resultOffset, setResultOffset] = useState(0);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const categories = usePublicProfileStoreCategories(profile);

  useEffect(() => {
    const saved = readListingReturnContext();
    const returning = saved?.source === "public-profile" && saved.sourceUrl === getCurrentRelativeUrl()
      && isListingReturnNavigation(saved);
    const view = returning ? saved.publicProfileState : null;
    // Restore the existing browser-history snapshot only after hydration, before any profile read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCategoryId(view?.selectedCategoryId ?? null);
    setExpandedRootId(view?.expandedRootId ?? null);
    setResultOffset(view?.showAll ? view.resultOffset ?? 0 : 0);
    onShowAllChange(view?.showAll === true);
    setPreparedKey(profileKey);
  }, [profileKey, onShowAllChange]);

  useEffect(() => {
    if (categories.loading || categories.error || !selectedCategoryId) return;
    const selected = categories.categories.find(item => item.id === selectedCategoryId);
    if (!selected) {
      // A removed category invalidates its saved filter and page together.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCategoryId(null); setExpandedRootId(null); setResultOffset(0);
    } else if (selected.parent_id) setExpandedRootId(selected.parent_id);
  }, [categories.categories, categories.loading, categories.error, selectedCategoryId]);

  useEffect(() => {
    if (showAll || preparedKey !== profileKey) return;
    // Another profile section can collapse this one; a hidden filter must not survive that change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCategoryId(null); setExpandedRootId(null); setResultOffset(0);
  }, [showAll, preparedKey, profileKey]);

  const ready = preparedKey === profileKey;
  const offset = showAll ? resultOffset : 0;
  const request = ready ? {sellerSlug: profile.slug, storeCategoryId: showAll ? selectedCategoryId : null,
    offset, limit: PROFILE_LISTING_PAGE_SIZE} : null;
  const results = usePublicProfileMarketplace(request, profileKey);
  const items = results.page?.items ?? [];
  const selectedCategoryReady = !selectedCategoryId || categories.categories.some(item => item.id === selectedCategoryId);
  useListingReturnRestoration({source: "public-profile", ready: ready && !categories.loading
    && selectedCategoryReady && !results.loading && !results.error && results.page !== null,
  listingIds: items.map(item => item.id), horizontalScrollRef});

  function selectAll() {setSelectedCategoryId(null); setExpandedRootId(null); setResultOffset(0);}
  function selectRoot(id: string, hasChildren: boolean) {
    setExpandedRootId(hasChildren && !(selectedCategoryId === id && expandedRootId === id) ? id : null);
    setSelectedCategoryId(id); setResultOffset(0);
  }
  function selectChild(id: string, parentId: string) {
    setSelectedCategoryId(id); setExpandedRootId(parentId); setResultOffset(0);
  }
  function openListing(input: {listingId: string; cardViewportTop: number}) {
    saveListingReturnContext({source: "public-profile", ...input, publicProfileState: {
      showAll, selectedCategoryId, expandedRootId, resultOffset: offset,
      horizontalScrollLeft: horizontalScrollRef.current?.scrollLeft ?? 0,
    }});
  }
  function previousPage() {if (!results.loading) setResultOffset(Math.max(0, offset - PROFILE_LISTING_PAGE_SIZE));}
  function nextPage() {
    if (!results.loading && results.page?.nextOffset != null) setResultOffset(results.page.nextOffset);
  }
  return {categories, selectedCategoryId, expandedRootId, selectAll, selectRoot, selectChild,
    horizontalScrollRef, openListing, previousPage, nextPage, resultOffset: offset,
    results, loading: !ready || results.loading, items,
    visibleItems: showAll ? items : items.slice(0, PROFILE_LISTING_PREVIEW_SIZE)};
}
