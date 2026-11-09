"use client";
import { useCallback, useEffect, useState } from "react";
import { getPublicProfileMarketplace } from "../../../entities/listing/api/getPublicProfileMarketplace";
import type { ProfileListingRequest } from "../../../entities/listing/model/publicRead/publicProfileListingsV1";
import type { PublicProfileMarketplacePage } from "../../../entities/listing/model/publicRead/publicProfileMarketplaceV1";

type State = {key: string; page: PublicProfileMarketplacePage | null; loading: boolean; error: boolean};

/** Scope changes hide the old page during render, before the replacement effect runs. */
export function usePublicProfileMarketplace(request: ProfileListingRequest | null, profileKey: string) {
  const sellerSlug = request?.sellerSlug ?? null, storeCategoryId = request?.storeCategoryId ?? null;
  const offset = request?.offset ?? 0, limit = request?.limit ?? 24;
  const [state, setState] = useState<State>({key: "", page: null, loading: false, error: false});
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([profileKey, sellerSlug, storeCategoryId, offset, limit, revision]);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    if (sellerSlug === null) return () => controller.abort();
    void getPublicProfileMarketplace({sellerSlug, storeCategoryId, offset, limit}, controller.signal)
      .then(page => {
        if (!controller.signal.aborted) setState({key, page, loading: false, error: false});
      }).catch(() => {
        if (!controller.signal.aborted) setState({key, page: null, loading: false, error: true});
      });
    return () => controller.abort();
  }, [key, sellerSlug, storeCategoryId, offset, limit, revision]);
  const visible = state.key === key ? state : {key, page: null, loading: sellerSlug !== null, error: false};
  return {...visible, retry};
}
