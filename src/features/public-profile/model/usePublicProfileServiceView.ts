"use client";
import { useEffect, useRef, useState } from "react";
import type { PublicProfile } from "../../../entities/profile/model/types";
import { usePublicProfileServicePage } from "./usePublicProfileServicePage";
import { usePublicProfileStoreCategories } from "./usePublicProfileStoreCategories";
import { useServiceReturnSnapshot } from "../../service-navigation/model/useServiceReturnSnapshot";
import { useServiceReturnRestoration } from "../../service-navigation/model/useServiceReturnRestoration";
import { saveServiceReturnContext } from "../../service-navigation/model/serviceReturnContext";

export const PROFILE_SERVICE_PAGE_SIZE = 24;
export const PROFILE_SERVICE_PREVIEW_SIZE = 5;
type Selection = {visit: string; selectedCategoryId: string | null; expandedRootId: string | null; resultOffset: number; categoryRemoved: boolean; pageChanged: boolean};
const empty = (visit: string): Selection => ({visit, selectedCategoryId: null, expandedRootId: null, resultOffset: 0, categoryRemoved: false, pageChanged: false});

export function usePublicProfileServiceView(profile: PublicProfile, expanded: boolean,
  onExpandedChange: (expanded: boolean) => void) {
  const scope = `${profile.identityId ?? ""}:${profile.slug}`;
  const snapshot = useServiceReturnSnapshot("public-profile", scope), categories = usePublicProfileStoreCategories(profile, "services");
  const visit = `${scope}:${snapshot.visit}`, horizontalScrollRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection>(() => empty(""));
  useEffect(() => {
    if (!snapshot.ready) return;
    const saved = snapshot.context?.profile;
    // Restore filters and page before dispatching a service page request.
    setSelection({...empty(visit), selectedCategoryId: saved?.selectedCategoryId ?? null,
      expandedRootId: saved?.expandedRootId ?? null, resultOffset: saved?.resultOffset ?? 0});
    onExpandedChange(saved?.expanded === true);
  }, [snapshot.ready, snapshot.context, visit, onExpandedChange]);
  const ready = snapshot.ready && selection.visit === visit;
  const current = ready ? selection : empty(visit);
  const selected = categories.categories.find(category => category.id === current.selectedCategoryId);
  const removed = !!current.selectedCategoryId && !categories.loading && !categories.error && !selected;
  const selectedCategoryId = expanded && !removed ? current.selectedCategoryId : null;
  const expandedRootId = expanded && !removed ? current.expandedRootId : null;
  const resultOffset = expanded && !removed ? current.resultOffset : 0;
  useEffect(() => {
    if (!ready) return;
    // Reconcile a hidden or externally removed server filter; never move the viewport.
    if (!expanded && (selection.selectedCategoryId || selection.expandedRootId || selection.resultOffset)) setSelection(empty(visit));
    else if (removed) setSelection({...empty(visit), categoryRemoved: true});
    else if (selected?.parent_id && selected.parent_id !== current.expandedRootId)
      setSelection(previous => ({...previous, expandedRootId: selected.parent_id}));
  }, [ready, expanded, removed, selected?.parent_id, current.expandedRootId, selection.selectedCategoryId, selection.expandedRootId, selection.resultOffset, visit]);
  const results = usePublicProfileServicePage(ready && profile.identityId && (!selectedCategoryId || !categories.loading) ? {
    identityId: profile.identityId, sellerSlug: profile.slug, storeCategoryId: selectedCategoryId,
    offset: resultOffset, limit: expanded ? PROFILE_SERVICE_PAGE_SIZE : PROFILE_SERVICE_PREVIEW_SIZE,
  } : null);
  const pageOutOfRange = !!results.page && resultOffset > 0 && BigInt(resultOffset) >= BigInt(results.page.totalCount);
  useEffect(() => {
    if (!pageOutOfRange || !results.page) return;
    // A saved history offset can outlive removed services. Reconcile once to a real page.
    const count = Number(results.page.totalCount), lastOffset = count > 0 ? Math.floor((count - 1) / PROFILE_SERVICE_PAGE_SIZE) * PROFILE_SERVICE_PAGE_SIZE : 0;
    setSelection(previous => ({...previous, resultOffset: lastOffset, pageChanged: true}));
  }, [pageOutOfRange, results.page]);
  const services = results.page?.items ?? [], loading = !ready || !!selectedCategoryId && categories.loading || results.loading || pageOutOfRange;
  useServiceReturnRestoration({context: snapshot.context, visit: snapshot.visit,
    ready: ready && !loading && !results.error && results.page !== null && !removed && !selection.categoryRemoved && !selection.pageChanged,
    serviceIds: services.map(service => service.id), horizontalScrollRef});
  function selectAll() {setSelection(empty(visit));}
  function selectRoot(id: string, hasChildren: boolean) {
    setSelection({...empty(visit), selectedCategoryId: id,
      expandedRootId: hasChildren && !(current.selectedCategoryId === id && current.expandedRootId === id) ? id : null});
  }
  function selectChild(id: string, parentId: string) {setSelection({...empty(visit), selectedCategoryId: id, expandedRootId: parentId});}
  function previousPage() {if (!loading) setSelection(previous => ({...previous, resultOffset: Math.max(0, resultOffset - PROFILE_SERVICE_PAGE_SIZE), pageChanged: false}));}
  function nextPage() {if (!loading && results.page?.nextOffset != null)
    setSelection(previous => ({...previous, resultOffset: results.page!.nextOffset!, pageChanged: false}));}
  function remember(input: {serviceId: string; cardViewportTop: number}) {
    saveServiceReturnContext({source: "public-profile", ...input, profile: {expanded, selectedCategoryId, expandedRootId, resultOffset,
      horizontalScrollLeft: horizontalScrollRef.current?.scrollLeft ?? 0}});
  }
  return {results, services, loading, error: results.error, categories, selectedCategoryId, expandedRootId, resultOffset,
    categoryRemoved: selection.categoryRemoved, pageChanged: selection.pageChanged, horizontalScrollRef, remember, selectAll, selectRoot, selectChild, previousPage, nextPage};
}
