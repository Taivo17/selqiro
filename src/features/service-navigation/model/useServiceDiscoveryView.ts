"use client";
import { useEffect, useRef, useState } from "react";
import { usePublicServiceSearch } from "../../service-detail/model/usePublicServiceSearch";
import { currentServiceUrl, saveServiceReturnContext, type ServiceReturnContext } from "./serviceReturnContext";
import { useServiceReturnSnapshot } from "./useServiceReturnSnapshot";
import { useServiceReturnRestoration } from "./useServiceReturnRestoration";
import { emptyServiceFilters, readServiceFilters, serviceFiltersUrl, serviceSearchInput, type ServiceDiscoveryFilters } from "./serviceDiscoveryLocation";
import { useViewerReadScope } from "../../../shared/provider-controls/useViewerReadScope";

export function useServiceDiscoveryView() {
  const audience = useViewerReadScope("discovery");
  const snapshot = useServiceReturnSnapshot("services", "/v2/services");
  const [view, setView] = useState<{filters: ServiceDiscoveryFilters; visit: number; context: ServiceReturnContext | null}>(
    {filters: emptyServiceFilters(), visit: -1, context: null});
  const filtersRef = useRef(view.filters);
  useEffect(() => {
    if (!snapshot.ready) return;
    const filters = readServiceFilters(typeof window !== "undefined" ? window.location?.search ?? "" : "");
    filtersRef.current = filters;
    // Browser history is an external store and is only available after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView({filters, visit: snapshot.visit, context: snapshot.context});
  }, [snapshot.ready, snapshot.visit, snapshot.context]);
  const ready = snapshot.ready && view.visit === snapshot.visit && audience.ready;
  const results = usePublicServiceSearch(serviceSearchInput(view.filters), {
    enabled: ready, restoreOffset: view.context?.loadedOffset ?? 0, targetOffset: view.context?.targetOffset ?? 0,
    restorationKey: String(view.visit), audience: audience.key,
  });
  useServiceReturnRestoration({context: view.context, visit: view.visit,
    ready: ready && !results.loading && !results.error && results.page !== null,
    serviceIds: results.page?.items.map(item => item.id) ?? []});

  function change(fields: Partial<ServiceDiscoveryFilters>) {
    const filters = {...filtersRef.current, ...fields};
    filtersRef.current = filters;
    setView(previous => ({...previous, filters, context: null}));
    const url = serviceFiltersUrl(filters);
    if (typeof window !== "undefined" && window.location && url !== currentServiceUrl()) {
      try {
        // Next supplies its internal state. Do not forward the previous return
        // snapshot or internal markers into a different filter URL.
        window.history.replaceState(null, "", url);
      } catch { /* Controlled filters remain usable if history is unavailable. */ }
    }
  }
  function remember(serviceId: string, cardViewportTop: number) {
    if (!ready || !results.page) return;
    saveServiceReturnContext({source: "services", serviceId, cardViewportTop,
      loadedOffset: results.page.offset ?? 0, targetOffset: results.serviceOffset?.(serviceId) ?? 0});
  }
  return {filters: view.filters, results: {...results, error: audience.error || results.error,
    loading: audience.error ? false : results.loading, retry: audience.error ? audience.refresh : results.retry},
    change, remember, clear: () => change(emptyServiceFilters())};
}
