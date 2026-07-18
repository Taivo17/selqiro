"use client";

import { useEffect, useMemo, useState } from "react";
import { getListingStoreCategoryIds } from "../../../entities/listing/api/getListingStoreCategoryIds";
import {
  setListingStoreCategories,
  type SetListingStoreCategoriesResult,
} from "../../../entities/listing/api/setListingStoreCategories";

export type UseListingStoreCategoryAssignmentInput = {
  listingId: string | null | undefined;
  enabled?: boolean;
};

export type ListingStoreCategoryAssignmentState = {
  savedCategoryIds: string[];
  selectedCategoryIds: string[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  dirty: boolean;
  toggleCategory: (categoryId: string) => void;
  clearSelection: () => void;
  resetSelection: () => void;
  saveSelection: () => Promise<SetListingStoreCategoriesResult>;
};

function normalizeCategoryIds(
  categoryIds: string[]
): string[] {
  return Array.from(
    new Set(
      categoryIds
        .map((categoryId) => categoryId.trim())
        .filter(Boolean)
    )
  ).sort((first, second) => first.localeCompare(second));
}

function categorySetsAreEqual(
  first: string[],
  second: string[]
): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every(
    (categoryId, index) =>
      categoryId === second[index]
  );
}

function getSuccessMessage(assignedCount: number): string {
  if (assignedCount === 0) {
    return "Kuulutuse poe-rubriigid eemaldatud.";
  }

  if (assignedCount === 1) {
    return "Kuulutusele salvestati 1 poe-rubriik.";
  }

  return `Kuulutusele salvestati ${assignedCount} poe-rubriiki.`;
}

export function useListingStoreCategoryAssignment({
  listingId,
  enabled = true,
}: UseListingStoreCategoryAssignmentInput): ListingStoreCategoryAssignmentState {
  const [savedCategoryIds, setSavedCategoryIds] =
    useState<string[]>([]);

  const [selectedCategoryIds, setSelectedCategoryIds] =
    useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const cleanListingId = listingId?.trim() || "";

    if (!enabled || !cleanListingId) {
      setSavedCategoryIds([]);
      setSelectedCategoryIds([]);
      setLoading(false);
      setSaving(false);
      setError(null);
      setSuccess(null);

      return () => {
        mounted = false;
      };
    }

    async function loadAssignment() {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const categoryIds =
          await getListingStoreCategoryIds(
            cleanListingId
          );

        if (!mounted) return;

        const normalizedCategoryIds =
          normalizeCategoryIds(categoryIds);

        setSavedCategoryIds(normalizedCategoryIds);
        setSelectedCategoryIds(normalizedCategoryIds);
        setLoading(false);
      } catch (loadError) {
        if (!mounted) return;

        setSavedCategoryIds([]);
        setSelectedCategoryIds([]);
        setLoading(false);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Kuulutuse poe-rubriike ei saanud laadida."
        );
      }
    }

    void loadAssignment();

    return () => {
      mounted = false;
    };
  }, [enabled, listingId]);

  const dirty = useMemo(
    () =>
      !categorySetsAreEqual(
        savedCategoryIds,
        selectedCategoryIds
      ),
    [savedCategoryIds, selectedCategoryIds]
  );

  function toggleCategory(categoryId: string) {
    const cleanCategoryId = categoryId.trim();

    if (!cleanCategoryId || loading || saving) {
      return;
    }

    setError(null);
    setSuccess(null);

    setSelectedCategoryIds((current) => {
      const categoryIsSelected =
        current.includes(cleanCategoryId);

      return normalizeCategoryIds(
        categoryIsSelected
          ? current.filter(
              (item) => item !== cleanCategoryId
            )
          : [...current, cleanCategoryId]
      );
    });
  }

  function clearSelection() {
    if (loading || saving) return;

    setError(null);
    setSuccess(null);
    setSelectedCategoryIds([]);
  }

  function resetSelection() {
    if (loading || saving) return;

    setError(null);
    setSuccess(null);
    setSelectedCategoryIds(savedCategoryIds);
  }

  async function saveSelection() {
    const cleanListingId = listingId?.trim() || "";

    if (!enabled || !cleanListingId) {
      const validationError =
        new Error("Kuulutuse ID puudub.");

      setError(validationError.message);
      throw validationError;
    }

    if (loading) {
      const loadingError =
        new Error("Rubriikide seoseid alles laetakse.");

      setError(loadingError.message);
      throw loadingError;
    }

    if (saving) {
      const savingError =
        new Error("Rubriikide salvestamine juba käib.");

      setError(savingError.message);
      throw savingError;
    }

    if (!dirty) {
      const unchangedError =
        new Error("Rubriikide valik ei ole muutunud.");

      setError(unchangedError.message);
      throw unchangedError;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await setListingStoreCategories({
        listingId: cleanListingId,
        categoryIds: selectedCategoryIds,
      });

      const normalizedCategoryIds =
        normalizeCategoryIds(result.categoryIds);

      setSavedCategoryIds(normalizedCategoryIds);
      setSelectedCategoryIds(normalizedCategoryIds);
      setSuccess(getSuccessMessage(result.assignedCount));

      return {
        ...result,
        categoryIds: normalizedCategoryIds,
      };
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Kuulutuse poe-rubriike ei saanud salvestada.";

      setError(message);
      throw saveError;
    } finally {
      setSaving(false);
    }
  }

  return {
    savedCategoryIds,
    selectedCategoryIds,
    loading,
    saving,
    error,
    success,
    dirty,
    toggleCategory,
    clearSelection,
    resetSelection,
    saveSelection,
  };
}
