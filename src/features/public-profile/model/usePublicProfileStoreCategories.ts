"use client";
import { useCallback, useEffect, useState } from "react";
import { uiMessage } from "../../../../lib/i18n/interfaceMessage";
import { getPublicProfileStoreCategories } from "../../../entities/store-category/api/getPublicProfileStoreCategories";
import type { PublicCategoryScope } from "../../../entities/store-category/model/publicProfileCategoriesV2";
import type { StoreCategory } from "../../../entities/store-category/model/types";
import type { PublicProfile } from "../../../entities/profile/model/types";

type State = {key: string; categories: StoreCategory[]; error: string | null};
export function usePublicProfileStoreCategories(profile: PublicProfile | null, scope: PublicCategoryScope = "marketplace") {
  const identityId = profile?.identityId ?? null, sellerSlug = profile?.slug ?? null;
  const [state, setState] = useState<State>({key: "", categories: [], error: null});
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([identityId, sellerSlug, scope, revision]);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    if (identityId === null || sellerSlug === null) return () => controller.abort();
    void getPublicProfileStoreCategories({identityId, sellerSlug, scope}, controller.signal)
      .then(categories => {if (!controller.signal.aborted) setState({key, categories, error: null});})
      .catch(() => {if (!controller.signal.aborted) setState({key, categories: [], error: uiMessage("could_not_load_this_profile_s_store_categories")});});
    return () => controller.abort();
  }, [key, identityId, sellerSlug, scope, revision]);
  return state.key === key ? {...state, loading: false, retry}
    : {categories: [], error: null, loading: identityId !== null && sellerSlug !== null, retry};
}
export type PublicProfileStoreCategoriesState = ReturnType<typeof usePublicProfileStoreCategories>;
