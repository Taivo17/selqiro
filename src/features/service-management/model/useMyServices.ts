"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "../../../../lib/useAuth";
import { getActiveIdentity } from "../../../entities/identity/api/getActiveIdentity";
import { getMyServices } from "../../../entities/service/api/getMyServices";
import { saveMyService } from "../../../entities/service/api/saveMyService";
import { setMyServiceStatus } from "../../../entities/service/api/setMyServiceStatus";
import type {
  SaveServiceInput,
  Service,
  ServiceStatus,
} from "../../../entities/service/model/types";

const ACTIVE_IDENTITY_CHANGED_EVENT =
  "selqiro:active-identity-changed";

const SERVICE_MANAGEMENT_LIMIT = 500;

export type MyServicesState = {
  activeIdentityId: string | null;
  services: Service[];
  loading: boolean;
  error: string | null;
  savingServiceId:
    | string
    | "new"
    | null;
  changingStatusServiceId:
    | string
    | null;
  refresh: () => Promise<void>;
  saveService: (
    input: SaveServiceInput
  ) => Promise<Service>;
  changeStatus: (
    serviceId: string,
    status: ServiceStatus
  ) => Promise<Service>;
  clearError: () => void;
};

function normalizeActiveIdentityId(
  value: string | null | undefined
): string | null {
  const cleanValue =
    value?.trim() || "";

  if (
    !cleanValue ||
    cleanValue ===
      "fallback-private"
  ) {
    return null;
  }

  return cleanValue;
}

function sortServices(
  services: Service[]
): Service[] {
  return [...services].sort(
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

function upsertService(
  services: Service[],
  nextService: Service
): Service[] {
  return sortServices([
    ...services.filter(
      (service) =>
        service.id !==
        nextService.id
    ),
    nextService,
  ]);
}

const NEXT_SERVICE_STATUS: Record<
  ServiceStatus,
  ServiceStatus
> = {
  draft: "published",
  published: "archived",
  archived: "draft",
};

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

export function useMyServices(): MyServicesState {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [
    state,
    setState,
  ] = useState<{
    activeIdentityId:
      | string
      | null;
    services: Service[];
    loading: boolean;
    error: string | null;
  }>({
    activeIdentityId: null,
    services: [],
    loading: true,
    error: null,
  });

  const [
    savingServiceId,
    setSavingServiceId,
  ] = useState<
    string |
    "new" |
    null
  >(null);

  const savingRef =
    useRef(false);

  const [
    changingStatusServiceId,
    setChangingStatusServiceId,
  ] = useState<string | null>(
    null
  );

  const statusChangingRef =
    useRef(false);

  const loadRequestRef =
    useRef(0);

  const loadServices =
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
          services: [],
          loading: false,
          error: null,
        });

        return;
      }

      try {
        const activeIdentity =
          await getActiveIdentity({
            userId: user.id,
            userEmail:
              user.email,
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
            services: [],
            loading: false,
            error: null,
          });

          return;
        }

        const services =
          await getMyServices({
            identityId:
              activeIdentityId,
            limit:
              SERVICE_MANAGEMENT_LIMIT,
          });

        if (
          requestId !==
          loadRequestRef.current
        ) {
          return;
        }

        setState({
          activeIdentityId,
          services:
            sortServices(
              services
            ),
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
            "Teenuseid ei saanud laadida."
          );

        setState({
          activeIdentityId: null,
          services: [],
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
      void loadServices();
    }

    void loadServices();

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
  }, [loadServices]);

  async function saveService(
    input: SaveServiceInput
  ): Promise<Service> {
    const activeIdentityId =
      state.activeIdentityId;

    if (!activeIdentityId) {
      throw new Error(
        "Aktiivne identiteet puudub."
      );
    }

    const serviceId =
      input.serviceId?.trim() ||
      null;

    const existingService =
      serviceId
        ? state.services.find(
            (service) =>
              service.id === serviceId
          ) || null
        : null;

    if (
      serviceId &&
      !existingService
    ) {
      throw new Error(
        "Teenuse mustandit ei leitud aktiivse identiteedi alt."
      );
    }

    if (
      existingService &&
      existingService.status !==
        "draft"
    ) {
      throw new Error(
        "Muuta saab ainult teenuse mustandit."
      );
    }

    if (
      savingRef.current ||
      statusChangingRef.current
    ) {
      throw new Error(
        "Teine teenuse toiming juba käib."
      );
    }

    const operationId =
      serviceId ||
      "new";

    savingRef.current = true;
    setSavingServiceId(
      operationId
    );

    setState((current) => ({
      ...current,
      error: null,
    }));

    try {
      const savedService =
        await saveMyService(input);

      if (
        savedService.identityId !==
        activeIdentityId
      ) {
        throw new Error(
          "Andmebaas tagastas vale identiteedi teenuse."
        );
      }

      if (
        existingService &&
        savedService.status !==
          "draft"
      ) {
        throw new Error(
          "Andmebaas tagastas muutmisel ootamatu teenuse staatuse."
        );
      }

      setState((current) => ({
        ...current,
        services:
          upsertService(
            current.services,
            savedService
          ),
        error: null,
      }));

      return savedService;
    } catch (error) {
      throw resolveError(
        error,
        "Teenust ei saanud salvestada."
      );
    } finally {
      savingRef.current = false;
      setSavingServiceId(null);
    }
  }

  async function changeStatus(
    serviceId: string,
    status: ServiceStatus
  ): Promise<Service> {
    const activeIdentityId =
      state.activeIdentityId;

    if (!activeIdentityId) {
      throw new Error(
        "Aktiivne identiteet puudub."
      );
    }

    const cleanServiceId =
      serviceId.trim();

    const existingService =
      state.services.find(
        (service) =>
          service.id ===
          cleanServiceId
      ) || null;

    if (!existingService) {
      throw new Error(
        "Teenust ei leitud aktiivse identiteedi alt."
      );
    }

    const expectedStatus =
      NEXT_SERVICE_STATUS[
        existingService.status
      ];

    if (status !== expectedStatus) {
      throw new Error(
        "Valitud teenuse olekumuutus ei ole lubatud."
      );
    }

    if (
      savingRef.current ||
      statusChangingRef.current
    ) {
      throw new Error(
        "Teine teenuse toiming juba käib."
      );
    }

    statusChangingRef.current = true;
    setChangingStatusServiceId(
      cleanServiceId
    );

    setState((current) => ({
      ...current,
      error: null,
    }));

    try {
      const updatedService =
        await setMyServiceStatus({
          serviceId:
            cleanServiceId,
          status,
        });

      if (
        updatedService.identityId !==
        activeIdentityId
      ) {
        throw new Error(
          "Andmebaas tagastas vale identiteedi teenuse."
        );
      }

      if (
        updatedService.id !==
          existingService.id ||
        updatedService.status !==
          expectedStatus
      ) {
        throw new Error(
          "Andmebaas tagastas ootamatu teenuse staatuse."
        );
      }

      setState((current) => ({
        ...current,
        services:
          upsertService(
            current.services,
            updatedService
          ),
        error: null,
      }));

      return updatedService;
    } catch (error) {
      throw resolveError(
        error,
        "Teenuse staatust ei saanud muuta."
      );
    } finally {
      statusChangingRef.current =
        false;
      setChangingStatusServiceId(
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
    savingServiceId,
    changingStatusServiceId,
    refresh: loadServices,
    saveService,
    changeStatus,
    clearError,
  };
}
