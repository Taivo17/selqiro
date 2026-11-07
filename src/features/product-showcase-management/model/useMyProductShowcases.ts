"use client";

import { marketplaceMessage, safeMarketplaceError } from "../../../shared/i18n/marketplaceMessages";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "../../../../lib/useAuth";
import { getActiveIdentity } from "../../../entities/identity/api/getActiveIdentity";
import {
  getMyProductShowcases,
  saveMyProductShowcase,
  setMyProductShowcaseStatus,
} from "../../../entities/product-showcase/api/productShowcases";
import {
  deleteMyArchivedProductShowcase,
  type DeleteMyArchivedProductShowcaseResult,
} from "../../../entities/product-showcase/api/deleteMyArchivedProductShowcase";
import type {
  ProductShowcase,
  ProductShowcaseStatus,
  SaveProductShowcaseInput,
} from "../../../entities/product-showcase/model/types";

const ACTIVE_IDENTITY_CHANGED_EVENT =
  "selqiro:active-identity-changed";

export type MyProductShowcasesState = {
  activeIdentityId: string | null;
  showcases: ProductShowcase[];
  loading: boolean;
  error: string | null;
  savingShowcaseId: string | "new" | null;
  changingStatusShowcaseId: string | null;
  deletingShowcaseId: string | null;
  refresh: () => Promise<void>;
  saveShowcase: (
    input: SaveProductShowcaseInput
  ) => Promise<ProductShowcase>;
  changeStatus: (
    showcaseId: string,
    status: ProductShowcaseStatus
  ) => Promise<ProductShowcase>;
  deleteShowcase: (
    showcaseId: string
  ) => Promise<DeleteMyArchivedProductShowcaseResult>;
  clearError: () => void;
};

function normalizeActiveIdentityId(
  value: string | null | undefined
): string | null {
  const cleanValue = value?.trim() || "";

  if (
    !cleanValue ||
    cleanValue === "fallback-private"
  ) {
    return null;
  }

  return cleanValue;
}

function sortShowcases(
  showcases: ProductShowcase[]
): ProductShowcase[] {
  return [...showcases].sort(
    (first, second) => {
      if (
        first.sortOrder !==
        second.sortOrder
      ) {
        return (
          first.sortOrder -
          second.sortOrder
        );
      }

      return first.createdAt.localeCompare(
        second.createdAt
      );
    }
  );
}

function upsertShowcase(
  showcases: ProductShowcase[],
  nextShowcase: ProductShowcase
): ProductShowcase[] {
  return sortShowcases([
    ...showcases.filter(
      (showcase) =>
        showcase.id !== nextShowcase.id
    ),
    nextShowcase,
  ]);
}

function resolveError(
  error: unknown,
  fallback: string
): Error {
  const message = safeMarketplaceError(error, fallback);
  return error instanceof Error && error.message === message ? error : new Error(message);
}

export function useMyProductShowcases(): MyProductShowcasesState {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [state, setState] = useState<{
    activeIdentityId: string | null;
    showcases: ProductShowcase[];
    loading: boolean;
    error: string | null;
  }>({
    activeIdentityId: null,
    showcases: [],
    loading: true,
    error: null,
  });

  const [
    savingShowcaseId,
    setSavingShowcaseId,
  ] = useState<string | "new" | null>(
    null
  );

  const [
    changingStatusShowcaseId,
    setChangingStatusShowcaseId,
  ] = useState<string | null>(null);

  const [
    deletingShowcaseId,
    setDeletingShowcaseId,
  ] = useState<string | null>(null);

  const loadRequestRef = useRef(0);
  const savingRef = useRef(false);
  const statusChangingRef =
    useRef(false);
  const deletingRef =
    useRef(false);

  const loadShowcases =
    useCallback(async () => {
      if (authLoading) {
        return;
      }

      const requestId =
        ++loadRequestRef.current;

      setState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      if (!user?.id) {
        if (
          requestId !==
          loadRequestRef.current
        ) {
          return;
        }

        setState({
          activeIdentityId: null,
          showcases: [],
          loading: false,
          error: null,
        });

        return;
      }

      try {
        const activeIdentity =
          await getActiveIdentity({
            userId: user.id,
            userEmail: user.email,
          });

        const activeIdentityId =
          normalizeActiveIdentityId(
            activeIdentity?.id
          );

        if (!activeIdentityId) {
          if (
            requestId !==
            loadRequestRef.current
          ) {
            return;
          }

          setState({
            activeIdentityId: null,
            showcases: [],
            loading: false,
            error: null,
          });

          return;
        }

        const showcases =
          await getMyProductShowcases({
            identityId:
              activeIdentityId,
          });

        if (
          requestId !==
          loadRequestRef.current
        ) {
          return;
        }

        setState({
          activeIdentityId,
          showcases:
            sortShowcases(showcases),
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

        const resolvedError =
          resolveError(
            error,
            marketplaceMessage("showcase.product_showcases_could_not_be_loaded.bb4a17")
          );

        setState({
          activeIdentityId: null,
          showcases: [],
          loading: false,
          error:
            resolvedError.message,
        });
      }
    }, [
      authLoading,
      user?.id,
      user?.email,
    ]);

  useEffect(() => {
    function handleIdentityChanged() {
      void loadShowcases();
    }

    void loadShowcases();

    window.addEventListener(
      ACTIVE_IDENTITY_CHANGED_EVENT,
      handleIdentityChanged
    );

    return () => {
      loadRequestRef.current += 1;

      window.removeEventListener(
        ACTIVE_IDENTITY_CHANGED_EVENT,
        handleIdentityChanged
      );
    };
  }, [loadShowcases]);

  async function saveShowcase(
    input: SaveProductShowcaseInput
  ): Promise<ProductShowcase> {
    if (!state.activeIdentityId) {
      throw new Error(
        marketplaceMessage("service.no_active_identity.80f933")
      );
    }

    if (
      savingRef.current ||
      statusChangingRef.current ||
      deletingRef.current
    ) {
      throw new Error(
        marketplaceMessage("showcase.another_product_showcase_operation_is_already_in_progress.2610f6")
      );
    }

    const operationId =
      input.showcaseId?.trim() ||
      "new";

    savingRef.current = true;
    setSavingShowcaseId(operationId);

    setState((current) => ({
      ...current,
      error: null,
    }));

    try {
      const savedShowcase =
        await saveMyProductShowcase(
          input
        );

      setState((current) => ({
        ...current,
        showcases: upsertShowcase(
          current.showcases,
          savedShowcase
        ),
        error: null,
      }));

      return savedShowcase;
    } catch (error) {
      const resolvedError =
        resolveError(
          error,
          marketplaceMessage("showcase.the_product_showcase_could_not_be_saved.8e58b1")
        );

      setState((current) => ({
        ...current,
        error:
          resolvedError.message,
      }));

      throw resolvedError;
    } finally {
      savingRef.current = false;
      setSavingShowcaseId(null);
    }
  }

  async function changeStatus(
    showcaseId: string,
    status: ProductShowcaseStatus
  ): Promise<ProductShowcase> {
    if (!state.activeIdentityId) {
      throw new Error(
        marketplaceMessage("service.no_active_identity.80f933")
      );
    }

    if (
      savingRef.current ||
      statusChangingRef.current ||
      deletingRef.current
    ) {
      throw new Error(
        marketplaceMessage("showcase.another_product_showcase_operation_is_already_in_progress.2610f6")
      );
    }

    statusChangingRef.current = true;
    setChangingStatusShowcaseId(
      showcaseId
    );

    setState((current) => ({
      ...current,
      error: null,
    }));

    try {
      const updatedShowcase =
        await setMyProductShowcaseStatus({
          showcaseId,
          status,
        });

      setState((current) => ({
        ...current,
        showcases: upsertShowcase(
          current.showcases,
          updatedShowcase
        ),
        error: null,
      }));

      return updatedShowcase;
    } catch (error) {
      const resolvedError =
        resolveError(
          error,
          marketplaceMessage("showcase.the_product_showcase_status_could_not_be_changed.da945d")
        );

      setState((current) => ({
        ...current,
        error:
          resolvedError.message,
      }));

      throw resolvedError;
    } finally {
      statusChangingRef.current =
        false;

      setChangingStatusShowcaseId(
        null
      );
    }
  }


  async function deleteShowcase(
    showcaseId: string
  ): Promise<
    DeleteMyArchivedProductShowcaseResult
  > {
    if (!state.activeIdentityId) {
      throw new Error(
        marketplaceMessage("service.no_active_identity.80f933")
      );
    }

    if (
      savingRef.current ||
      statusChangingRef.current ||
      deletingRef.current
    ) {
      throw new Error(
        marketplaceMessage("showcase.another_product_showcase_operation_is_already_in_progress.2610f6")
      );
    }

    const showcase =
      state.showcases.find(
        (item) =>
          item.id === showcaseId
      );

    if (!showcase) {
      throw new Error(
        marketplaceMessage("showcase.product_showcase_not_found.a97381")
      );
    }

    if (
      showcase.status !==
      "archived"
    ) {
      throw new Error(
        marketplaceMessage("showcase.archive_the_product_showcase_before_deleting_it_permanently.245945")
      );
    }

    deletingRef.current = true;

    setDeletingShowcaseId(
      showcaseId
    );

    setState((current) => ({
      ...current,
      error: null,
    }));

    try {
      const result =
        await deleteMyArchivedProductShowcase({
          showcaseId,
        });

      /*
       * Prevent an older in-flight load from restoring
       * the item after the server has deleted it.
       */
      loadRequestRef.current += 1;

      setState((current) => ({
        ...current,
        showcases:
          current.showcases.filter(
            (item) =>
              item.id !== showcaseId
          ),
        error: null,
      }));

      return result;
    } catch (error) {
      const resolvedError =
        resolveError(
          error,
          marketplaceMessage("showcase.the_product_showcase_could_not_be_permanently_deleted.6bd5cd")
        );

      setState((current) => ({
        ...current,
        error:
          resolvedError.message,
      }));

      throw resolvedError;
    } finally {
      deletingRef.current = false;

      setDeletingShowcaseId(
        null
      );
    }
  }

  function clearError() {
    setState((current) => ({
      ...current,
      error: null,
    }));
  }

  return {
    ...state,
    savingShowcaseId,
    changingStatusShowcaseId,
    deletingShowcaseId,
    refresh: loadShowcases,
    saveShowcase,
    changeStatus,
    deleteShowcase,
    clearError,
  };
}
