"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient } from "../../../shared/supabase/browserClient";

export type MyAreaStoreCategory = {
  id: string;
  name: string;
  sort_order?: number | null;
};

export type MyAreaStoreCategoriesState = {
  categories: MyAreaStoreCategory[];
  loading: boolean;
  error: string | null;
};

export function useMyAreaStoreCategories(): MyAreaStoreCategoriesState {
  const [state, setState] = useState<MyAreaStoreCategoriesState>({
    categories: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      setState({
        categories: [],
        loading: true,
        error: null,
      });

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
          throw new Error(profileError.message || "Failed to load profile");
        }

        const activeIdentityId =
          (profileData as { active_identity_id?: string | null } | null)
            ?.active_identity_id || null;

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
          .select("id, name, sort_order")
          .eq("identity_id", activeIdentityId)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });

        if (error) {
          throw new Error(error.message || "Failed to load store categories");
        }

        if (!mounted) return;

        setState({
          categories: (data || []) as MyAreaStoreCategory[],
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!mounted) return;

        setState({
          categories: [],
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load store categories",
        });
      }
    }

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
