"use client";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { ListingCreateDraft } from "./listingCreateDraft";
import type { ListingCreateDraftEntry } from "./listingCreateDrafts";

export function useListingCreateDraft(entry: ListingCreateDraftEntry, canEdit: () => boolean) {
  const snapshot = useSyncExternalStore(entry.subscribe, entry.getSnapshot, entry.getSnapshot);
  const live = useRef(true), allowed = useRef(canEdit);
  allowed.current = canEdit;
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, [entry]);
  const setters = useMemo(() => {
    function setter<K extends keyof ListingCreateDraft>(key: K) {
      return (value: ListingCreateDraft[K] | ((current: ListingCreateDraft[K]) => ListingCreateDraft[K])) => {
        if (live.current && allowed.current()) entry.change(snapshot.generation, key, value);
      };
    }
    return {
      setContentType: setter("contentType"), setTitle: setter("title"), setDescription: setter("description"),
      setFiles: setter("files"), setOrdinaryFields: setter("ordinaryFields"), setHorseOfferType: setter("horseOfferType"),
      setHorseOfferFields: setter("horseOfferFields"), setHorseOfferUseFields: setter("horseOfferUseFields"),
      setHorseOfferDisclosureFields: setter("horseOfferDisclosureFields"), setHorseOfferPriceFields: setter("horseOfferPriceFields"),
      setHorseOfferLocationFields: setter("horseOfferLocationFields"),
      setHorseOfferPublicationConfirmations: setter("horseOfferPublicationConfirmations"),
    };
  }, [entry, snapshot.generation]);
  return { ...snapshot.value, ...setters };
}
