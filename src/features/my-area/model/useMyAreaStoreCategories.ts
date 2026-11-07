"use client";
import { uiMessage, safeUiError } from "../../../../lib/i18n/interfaceMessage";


import { useEffect, useState } from "react";
import { createMyStoreChildCategory } from "../../../entities/store-category/api/createMyStoreChildCategory";
import {
  deleteMyStoreCategory,
  type DeletedStoreCategory,
} from "../../../entities/store-category/api/deleteMyStoreCategory";
import { renameMyStoreCategory } from "../../../entities/store-category/api/renameMyStoreCategory";
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
  creatingChildParentId: string | null;
  renamingCategoryId: string | null;
  deletingCategoryId: string | null;
  createRootCategory: (name: string) => Promise<MyAreaStoreCategory>;
  createChildCategory: (
    parentId: string,
    name: string
  ) => Promise<MyAreaStoreCategory>;
  renameCategory: (
    categoryId: string,
    name: string
  ) => Promise<MyAreaStoreCategory>;
  deleteCategory: (
    categoryId: string
  ) => Promise<DeletedStoreCategory>;
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
  const [creatingChildParentId, setCreatingChildParentId] =
    useState<string | null>(null);
  const [renamingCategoryId, setRenamingCategoryId] =
    useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] =
    useState<string | null>(null);

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
            profileError.message || uiMessage("could_not_load_the_active_identity")
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
          throw new Error(error.message || uiMessage("could_not_load_categories"));
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
            safeUiError(loadError, "could_not_load_categories"),
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
      throw new Error(uiMessage("a_parent_category_is_already_being_added"));
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

  async function createChildCategory(
    parentId: string,
    name: string
  ) {
    if (creatingChildParentId) {
      throw new Error(uiMessage("a_subcategory_is_already_being_added"));
    }

    setCreatingChildParentId(parentId);

    try {
      const createdCategory = await createMyStoreChildCategory({
        parentId,
        name,
      });

      notifyStoreCategoriesChanged();
      return createdCategory;
    } finally {
      setCreatingChildParentId(null);
    }
  }

  async function renameCategory(
    categoryId: string,
    name: string
  ) {
    if (renamingCategoryId) {
      throw new Error(uiMessage("this_category_is_already_being_renamed"));
    }

    setRenamingCategoryId(categoryId);

    try {
      const updatedCategory = await renameMyStoreCategory({
        categoryId,
        name,
      });

      notifyStoreCategoriesChanged();
      return updatedCategory;
    } finally {
      setRenamingCategoryId(null);
    }
  }

  async function deleteCategory(
    categoryId: string
  ) {
    if (deletingCategoryId) {
      throw new Error(uiMessage("this_category_is_already_being_deleted"));
    }

    setDeletingCategoryId(categoryId);

    try {
      const deletedCategory =
        await deleteMyStoreCategory(categoryId);

      notifyStoreCategoriesChanged();
      return deletedCategory;
    } finally {
      setDeletingCategoryId(null);
    }
  }

  return {
    ...state,
    creatingRootCategory,
    creatingChildParentId,
    renamingCategoryId,
    deletingCategoryId,
    createRootCategory,
    createChildCategory,
    renameCategory,
    deleteCategory,
  };
}
