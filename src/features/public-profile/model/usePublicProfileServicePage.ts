"use client";
import { useCallback, useEffect, useState } from "react";
import { getPublicProfileServices } from "../../../entities/service/api/getPublicProfileServices";
import type { PublicProfileServicesRequest, PublicProfileServicesPage } from "../../../entities/service/model/publicProfileServicesV2";

type State = {key: string; page: PublicProfileServicesPage | null; error: boolean};
export function usePublicProfileServicePage(request: PublicProfileServicesRequest | null) {
  const identityId = request?.identityId ?? null, sellerSlug = request?.sellerSlug ?? null;
  const storeCategoryId = request?.storeCategoryId ?? null, limit = request?.limit ?? 24, offset = request?.offset ?? 0;
  const [state, setState] = useState<State>({key: "", page: null, error: false});
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([identityId, sellerSlug, storeCategoryId, limit, offset, revision]);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    if (identityId === null || sellerSlug === null) return () => controller.abort();
    void getPublicProfileServices({identityId, sellerSlug, storeCategoryId, limit, offset}, controller.signal)
      .then(page => {if (!controller.signal.aborted) setState({key, page, error: false});})
      .catch(() => {if (!controller.signal.aborted) setState({key, page: null, error: true});});
    return () => controller.abort();
  }, [key, identityId, sellerSlug, storeCategoryId, limit, offset, revision]);
  const visible = state.key === key ? {...state, loading: false}
    : {key, page: null, loading: identityId !== null && sellerSlug !== null, error: false};
  return {...visible, retry};
}
