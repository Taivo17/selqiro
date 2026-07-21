"use client";

import { useEffect, useMemo, useState } from "react";
import {
  updateListingClassificationLocation,
  type UpdateListingClassificationLocationResult,
} from "../../../entities/listing/api/updateListingClassificationLocation";
import type { ProductListingDetail } from "../../../entities/listing/model/types";

export type ListingClassificationLocationForm = {
  category: string;
  subcategory: string;
  detailCategory: string;
  country: string;
  city: string;
  listingLat: number | null;
  listingLng: number | null;
};

export type ListingLocationSelection = {
  displayName: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
};

type GeocodeResult = {
  lat: number;
  lng: number;
};

function getDetailCategory(
  listing: ProductListingDetail | null
): string {
  const value = listing?.details?.detailCategory;

  return typeof value === "string" ? value : "";
}

function normalizeCoordinate(
  value: number | null | undefined
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function buildInitialForm(
  listing: ProductListingDetail | null
): ListingClassificationLocationForm {
  return {
    category: listing?.category || "general",
    subcategory: listing?.subcategory || "",
    detailCategory: getDetailCategory(listing),
    country: listing?.country || "",
    city: listing?.city || "",
    listingLat: normalizeCoordinate(
      listing?.listingLat
    ),
    listingLng: normalizeCoordinate(
      listing?.listingLng
    ),
  };
}

function buildFormFromResult(
  result: UpdateListingClassificationLocationResult
): ListingClassificationLocationForm {
  return {
    category: result.category || "general",
    subcategory: result.subcategory || "",
    detailCategory: result.detailCategory || "",
    country: result.country || "",
    city: result.city || "",
    listingLat: result.listingLat,
    listingLng: result.listingLng,
  };
}

async function geocodeCity(
  country: string,
  city: string
): Promise<GeocodeResult | null> {
  try {
    const response = await fetch(
      "/api/location/geocode",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country,
          city,
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      success?: boolean;
      lat?: string | number | null;
      lng?: string | number | null;
    };

    if (!data.success) {
      return null;
    }

    const lat = Number(data.lat);
    const lng = Number(data.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return null;
    }

    return {
      lat,
      lng,
    };
  } catch {
    return null;
  }
}

export function useListingClassificationLocation(
  listing: ProductListingDetail | null
) {
  const [initialForm, setInitialForm] =
    useState<ListingClassificationLocationForm>(
      () => buildInitialForm(listing)
    );

  const [form, setForm] =
    useState<ListingClassificationLocationForm>(
      () => buildInitialForm(listing)
    );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] =
    useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const nextForm = buildInitialForm(listing);

    setInitialForm(nextForm);
    setForm(nextForm);
    setSaving(false);
    setSaveError(null);
    setSaved(false);
  }, [listing]);

  const dirty = useMemo(
    () =>
      JSON.stringify(form) !==
      JSON.stringify(initialForm),
    [form, initialForm]
  );

  const canSave = Boolean(
    listing?.id &&
      form.category.trim() &&
      dirty &&
      !saving
  );

  function clearFeedback() {
    setSaved(false);
    setSaveError(null);
  }

  function setCategory(category: string) {
    setForm((current) => {
      if (current.category === category) {
        return current;
      }

      return {
        ...current,
        category,
        subcategory: "",
        detailCategory: "",
      };
    });

    clearFeedback();
  }

  function setSubcategory(
    subcategory: string
  ) {
    setForm((current) => {
      if (
        current.subcategory === subcategory
      ) {
        return current;
      }

      return {
        ...current,
        subcategory,
        detailCategory: "",
      };
    });

    clearFeedback();
  }

  function setDetailCategory(
    detailCategory: string
  ) {
    setForm((current) => ({
      ...current,
      detailCategory,
    }));

    clearFeedback();
  }

  function setCountry(country: string) {
    setForm((current) => {
      if (current.country === country) {
        return current;
      }

      return {
        ...current,
        country,
        listingLat: null,
        listingLng: null,
      };
    });

    clearFeedback();
  }

  function setCity(city: string) {
    setForm((current) => ({
      ...current,
      city,
      listingLat: null,
      listingLng: null,
    }));

    clearFeedback();
  }

  function selectLocation(
    location: ListingLocationSelection
  ) {
    setForm((current) => ({
      ...current,
      country:
        location.country || current.country,
      city:
        location.city ||
        location.displayName,
      listingLat: location.lat,
      listingLng: location.lng,
    }));

    clearFeedback();
  }

  function reset() {
    setForm(initialForm);
    setSaved(false);
    setSaveError(null);
  }

  async function save() {
    if (!listing?.id || saving) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaved(false);

    try {
      const country = form.country.trim();
      const city = form.city.trim();

      let listingLat = form.listingLat;
      let listingLng = form.listingLng;

      /*
       * Kui kasutaja kirjutas linna käsitsi,
       * proovi enne salvestamist leida kaardipunkt.
       *
       * Kui geokodeerimine tulemust ei anna,
       * salvestatakse linn ja riik ilma
       * koordinaatideta.
       */
      if (
        country &&
        city &&
        (
          listingLat === null ||
          listingLng === null
        )
      ) {
        const geocoded = await geocodeCity(
          country,
          city
        );

        if (geocoded) {
          listingLat = geocoded.lat;
          listingLng = geocoded.lng;
        }
      }

      const result =
        await updateListingClassificationLocation({
          listingId: listing.id,
          category: form.category,
          subcategory:
            form.subcategory || null,
          detailCategory:
            form.detailCategory || null,
          country: country || null,
          city: city || null,
          listingLat,
          listingLng,
        });

      const nextForm =
        buildFormFromResult(result);

      setInitialForm(nextForm);
      setForm(nextForm);
      setSaved(true);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Kategooriat ja asukohta ei saanud salvestada."
      );
    } finally {
      setSaving(false);
    }
  }

  return {
    form,
    dirty,
    saving,
    saveError,
    saved,
    canSave,
    setCategory,
    setSubcategory,
    setDetailCategory,
    setCountry,
    setCity,
    selectLocation,
    reset,
    save,
  };
}
