"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { getServiceCategories } from "../../../entities/service-category/api/getServiceCategories";
import type { ServiceCategory } from "../../../entities/service-category/model/types";

export type ServiceCategoriesState = {
  categories: ServiceCategory[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

function resolveError(
  error: unknown
): string {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Teenuste rubriike ei saanud laadida.";
}

export function useServiceCategories():
  ServiceCategoriesState {
  const [
    state,
    setState,
  ] = useState<{
    categories: ServiceCategory[];
    loading: boolean;
    error: string | null;
  }>({
    categories: [],
    loading: true,
    error: null,
  });

  const loadRequestRef =
    useRef(0);

  const loadCategories =
    useCallback(async () => {
      const requestId =
        ++loadRequestRef.current;

      setState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const categories =
          await getServiceCategories();

        if (
          requestId !==
          loadRequestRef.current
        ) {
          return;
        }

        setState({
          categories,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (
          requestId !==
          loadRequestRef.current
        ) {
          return;
        }

        setState({
          categories: [],
          loading: false,
          error:
            resolveError(error),
        });
      }
    }, []);

  useEffect(() => {
    void loadCategories();

    return () => {
      loadRequestRef.current += 1;
    };
  }, [loadCategories]);

  return {
    ...state,
    refresh: loadCategories,
  };
}
