"use client";

import { useEffect, useMemo, useState } from "react";
import { updateListingBasics } from "../../../entities/listing/api/updateListingBasics";
import type { ProductListingDetail } from "../../../entities/listing/model/types";

export type ListingBasicsForm = {
  title: string;
  description: string;
  price: string;
  condition: string;
};

function buildInitialForm(
  listing: ProductListingDetail | null
): ListingBasicsForm {
  return {
    title: listing?.title || "",
    description: listing?.description || "",
    price:
      listing?.priceLabel && listing.priceLabel !== "Hind kokkuleppel"
        ? listing.priceLabel
        : "",
    condition: listing?.condition || "used",
  };
}

export function useListingBasicsForm(input: {
  listing: ProductListingDetail | null;
  userId: string | null;
  activeIdentityId: string | null;
}) {
  const { listing, userId, activeIdentityId } = input;

  const [initialForm, setInitialForm] = useState<ListingBasicsForm>(
    buildInitialForm(listing)
  );
  const [form, setForm] = useState<ListingBasicsForm>(
    buildInitialForm(listing)
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const next = buildInitialForm(listing);

    setInitialForm(next);
    setForm(next);
    setSaving(false);
    setSaveError(null);
    setSaved(false);
  }, [listing?.id]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm]
  );

  const canSave = Boolean(listing?.id && userId && dirty && !saving);

  function setField<K extends keyof ListingBasicsForm>(
    field: K,
    value: ListingBasicsForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
    setSaveError(null);
  }

  async function save() {
    if (!listing?.id) return;

    setSaving(true);
    setSaveError(null);
    setSaved(false);

    try {
      await updateListingBasics({
        listingId: listing.id,
        userId,
        activeIdentityId,
        title: form.title,
        description: form.description,
        price: form.price,
        condition: form.condition,
        category: listing.category,
        subcategory: listing.subcategory,
        details: listing.details,
      });

      setInitialForm(form);
      setSaved(true);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Kuulutuse salvestamine ebaõnnestus."
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
    setField,
    save,
  };
}
