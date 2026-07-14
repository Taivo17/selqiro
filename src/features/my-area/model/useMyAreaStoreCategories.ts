"use client";

import { useEffect, useState } from "react";
import { createMyStoreRootCategory } from "../../../entities/store-category/api/createMyStoreRootCategory";
import type { StoreCategory } from "../../../entities/store-category/model/types";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";

export const STORE_CATEGORIES_CHANGED_EVENT =
  "selqiro:store-categories-changed";

export type MyAreaStoreCategory = StoreCategory;

export type MyAreaStoreCategoriesState = {
  categories: MyAreaStoreCategory[];
  loading: boolean;
  error: string | null;
  creatingRootCategory: boolean;
  createRootCategory: (name: string) => Promise<MyAreaStoreCategory>;
};

function notifyStoreCategoriesChanged() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(STORE_CATEGORIES_CHANGED_EVENT));
}

export function useMyAreaStoreCategories(): MyAreaStoreCategoriesState {
  const [state, setState] = useState<{
    categories: MyAreaStoreCategory[];
    loading: boolean;
    error: string | null;
  }>({
    categories: [],
    loading: true,
    error: null,
  });

  const [creatingRootCategory, setCreatingRootCategory] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const {
          data: { user },
        } = await supabaseBrowserClient.auth.getUser();

        if (!user?.id) {
          if (!mounted) return;

          setState({
            categories: [],
            loading: false,
            error: null,
          });

          return;
        }

        const { data: profileData, error: profileError } =
          await supabaseBrowserClient
            .from("profiles")
            .select("active_identity_id")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
          throw new Error(
            profileError.message || "Aktiivset identiteeti ei saanud laadida."
          );
        }

        const activeIdentityId =
          (
            profileData as {
              active_identity_id?: string | null;
            } | null
          )?.active_identity_id || null;

        if (!activeIdentityId) {
          if (!mounted) return;

          setState({
            categories: [],
            loading: false,
            error: null,
          });

          return;
        }

        const { data, error } = await supabaseBrowserClient
          .from("store_categories")
          .select("id, name, sort_order, parent_id")
          .eq("identity_id", activeIdentityId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (error) {
          throw new Error(error.message || "Rubriike ei saanud laadida.");
        }

        if (!mounted) return;

        setState({
          categories: (data || []) as MyAreaStoreCategory[],
          loading: false,
          error: null,
        });
      } catch (loadError) {
        if (!mounted) return;

        setState({
          categories: [],
          loading: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "Rubriike ei saanud laadida.",
        });
      }
    }

    function handleCategoriesChanged() {
      void loadCategories();
    }

    void loadCategories();

    window.addEventListener(
      STORE_CATEGORIES_CHANGED_EVENT,
      handleCategoriesChanged
    );

    return () => {
      mounted = false;

      window.removeEventListener(
        STORE_CATEGORIES_CHANGED_EVENT,
        handleCategoriesChanged
      );
    };
  }, []);

  async function createRootCategory(name: string) {
    if (creatingRootCategory) {
      throw new Error("Ülemrubriigi lisamine juba käib.");
    }

    setCreatingRootCategory(true);

    try {
      const createdCategory = await createMyStoreRootCategory(name);
      notifyStoreCategoriesChanged();
      return createdCategory;
    } finally {
      setCreatingRootCategory(false);
    }
  }

  return {
    ...state,
    creatingRootCategory,
    createRootCategory,
  };
}
