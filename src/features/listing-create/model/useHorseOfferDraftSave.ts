"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  HorseOfferDraftSaveError,
  saveMyHorseOfferDraft,
} from "../../../entities/horse-offer/api/saveMyHorseOfferDraft";
import {
  type SavedHorseOfferDraft,
} from "../../../entities/horse-offer/model/types";
import {
  HorseOfferDraftPayloadError,
  buildHorseOfferDraftSaveInput,
  type HorseOfferDraftFormSnapshot,
} from "./horseOfferDraftSave";

export type HorseOfferDraftSavePhase =
  | "idle"
  | "saving"
  | "saved"
  | "error";

export type HorseOfferDraftSaveSnapshot =
  Omit<
    HorseOfferDraftFormSnapshot,
    "offerId"
  >;

type HorseOfferDraftRequestState = {
  phase:
    | "idle"
    | "saving"
    | "saved"
    | "error";
  revision: string | null;
  errorMessage: string | null;
};

export type HorseOfferDraftSaveController = {
  phase: HorseOfferDraftSavePhase;
  offerId: string | null;
  hasSavedDraft: boolean;
  hasUnsavedChanges: boolean;
  errorMessage: string | null;
  save: () => Promise<
    SavedHorseOfferDraft | null
  >;
};

function createHorseOfferDraftRevision(
  snapshot: HorseOfferDraftSaveSnapshot
): string {
  return JSON.stringify(snapshot);
}

function getPayloadErrorMessage(
  field: HorseOfferDraftPayloadError["field"]
): string {
  if (field === "birthYear") {
    return "Kontrolli hobuse sünniaastat.";
  }

  if (field === "heightCm") {
    return "Kontrolli hobuse turjakõrgust.";
  }

  if (
    field === "priceAmount"
    || field === "wantedBudgetAmount"
  ) {
    return "Kontrolli hinna või eelarve summat.";
  }

  if (field === "recurringFeePeriod") {
    return "Vali rendi või kaasratsaniku tasu periood.";
  }

  return "Eesti hobusepiloodis peab asukoha riik olema Eesti.";
}

function getDraftSaveErrorMessage(
  error: unknown
): string {
  if (error instanceof HorseOfferDraftPayloadError) {
    return getPayloadErrorMessage(error.field);
  }

  if (error instanceof HorseOfferDraftSaveError) {
    const normalized = [
      error.code || "",
      error.message,
    ]
      .join(" ")
      .toLowerCase();

    if (normalized.includes("not_authenticated")) {
      return "Mustandi salvestamiseks logi uuesti sisse.";
    }

    if (
      normalized.includes("active_identity")
      || normalized.includes("identity_forbidden")
    ) {
      return "Mustandi salvestamiseks vali ligipääsetav aktiivne identiteet.";
    }

    if (
      normalized.includes("not_found_or_forbidden")
      || normalized.includes("horse_offer_not_editable")
    ) {
      return "Seda hobuse mustandit ei saa enam selle identiteediga muuta.";
    }

    if (
      normalized.includes("market_not_enabled")
      || normalized.includes("policy")
      || normalized.includes("cross_border")
    ) {
      return "Hobusepakkumise mustand ei vasta praeguse Eesti piloodi tingimustele.";
    }
  }

  return "Mustandi salvestamine ebaõnnestus. Kontrolli ühendust ja proovi uuesti.";
}

export function useHorseOfferDraftSave(
  snapshot: HorseOfferDraftSaveSnapshot | null
): HorseOfferDraftSaveController {
  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const [offerId, setOfferId] =
    useState<string | null>(null);
  const [lastSavedRevision, setLastSavedRevision] =
    useState<string | null>(null);
  const [requestState, setRequestState] =
    useState<HorseOfferDraftRequestState>({
      phase: "idle",
      revision: null,
      errorMessage: null,
    });

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const currentRevision = snapshot
    ? createHorseOfferDraftRevision(snapshot)
    : null;

  let phase: HorseOfferDraftSavePhase =
    "idle";

  if (requestState.phase === "saving") {
    phase = "saving";
  } else if (
    requestState.phase === "error"
    && requestState.revision ===
      currentRevision
  ) {
    phase = "error";
  } else if (
    currentRevision !== null
    && lastSavedRevision ===
      currentRevision
  ) {
    phase = "saved";
  }

  const save = useCallback(async () => {
    if (
      !snapshot
      || currentRevision === null
      || inFlightRef.current
    ) {
      return null;
    }

    const requestedSnapshot = snapshot;
    const requestedRevision = currentRevision;

    inFlightRef.current = true;
    setRequestState({
      phase: "saving",
      revision: requestedRevision,
      errorMessage: null,
    });

    try {
      const input =
        buildHorseOfferDraftSaveInput({
          ...requestedSnapshot,
          offerId,
        });

      const savedDraft =
        await saveMyHorseOfferDraft(input);

      if (mountedRef.current) {
        setOfferId(savedDraft.offerId);
        setLastSavedRevision(
          requestedRevision
        );
        setRequestState({
          phase: "saved",
          revision: requestedRevision,
          errorMessage: null,
        });
      }

      return savedDraft;
    } catch (error: unknown) {
      console.error(
        "Horse offer draft save failed:",
        error
      );

      if (mountedRef.current) {
        setRequestState({
          phase: "error",
          revision: requestedRevision,
          errorMessage:
            getDraftSaveErrorMessage(error),
        });
      }

      return null;
    } finally {
      inFlightRef.current = false;
    }
  }, [
    currentRevision,
    offerId,
    snapshot,
  ]);

  const hasSavedDraft = offerId !== null;
  const hasUnsavedChanges =
    hasSavedDraft
    && currentRevision !== null
    && lastSavedRevision !==
      currentRevision;

  return {
    phase,
    offerId,
    hasSavedDraft,
    hasUnsavedChanges,
    errorMessage:
      phase === "error"
        ? requestState.errorMessage
        : null,
    save,
  };
}
