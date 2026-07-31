"use client";

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
  if (
    error instanceof Error &&
    error.message
  ) {
    return error;
  }

  return new Error(fallback);
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
            "Tootenäidiseid ei saanud laadida."
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
        "Aktiivne identiteet puudub."
      );
    }

    if (
      savingRef.current ||
      statusChangingRef.current ||
      deletingRef.current
    ) {
      throw new Error(
        "Teine tootenäidise toiming juba käib."
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
          "Tootenäidist ei saanud salvestada."
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
        "Aktiivne identiteet puudub."
      );
    }

    if (
      savingRef.current ||
      statusChangingRef.current ||
      deletingRef.current
    ) {
      throw new Error(
        "Teine tootenäidise toiming juba käib."
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
          "Tootenäidise staatust ei saanud muuta."
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
        "Aktiivne identiteet puudub."
      );
    }

    if (
      savingRef.current ||
      statusChangingRef.current ||
      deletingRef.current
    ) {
      throw new Error(
        "Teine tootenäidise toiming juba käib."
      );
    }

    const showcase =
      state.showcases.find(
        (item) =>
          item.id === showcaseId
      );

    if (!showcase) {
      throw new Error(
        "Tootenäidist ei leitud."
      );
    }

    if (
      showcase.status !==
      "archived"
    ) {
      throw new Error(
        "Tootenäidis tuleb enne jäädavat kustutamist arhiveerida."
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
          "Tootenäidist ei saanud jäädavalt kustutada."
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
