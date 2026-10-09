"use client";

import { useState } from "react";
import { setListingPrimaryImage } from "../../../entities/listing/api/setListingPrimaryImage";
import { deleteListingImage } from "../../../entities/listing/api/deleteListingImage";
import { uploadListingImage } from "../../../entities/listing/api/uploadListingImage";
import type { ListingImage, ProductListingDetail } from "../../../entities/listing/model/types";

/** The page calls this unconditionally, as before extraction. No new save or retry policy. */
export function useListingEditImages(listing: ProductListingDetail | null) {
  const [primarySavingId, setPrimarySavingId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  async function handleSetPrimaryImage(image: ListingImage) {
    const listingIdForUpdate = listing?.id;
    const imageIdForUpdate = image.id ? String(image.id) : "";

    if (!listingIdForUpdate || !imageIdForUpdate) return;

    setPrimarySavingId(imageIdForUpdate);
    setImageError(null);

    try {
      await setListingPrimaryImage({
        listingId: listingIdForUpdate,
        imageId: imageIdForUpdate,
      });

      window.location.reload();
    } catch (error) {
      setImageError(
        error instanceof Error
          ? error.message
          : "Põhipildi muutmine ebaõnnestus."
      );
    } finally {
      setPrimarySavingId(null);
    }
  }

  async function handleDeleteImage(image: ListingImage) {
    const listingIdForUpdate = listing?.id;
    const imageIdForUpdate = image.id ? String(image.id) : "";

    if (!listingIdForUpdate || !imageIdForUpdate) return;

    if ((listing?.images.length || 0) <= 1) {
      setImageError("Viimast pilti ei saa kustutada.");
      return;
    }

    const confirmed = window.confirm("Kas kustutada see pilt kuulutuselt?");

    if (!confirmed) return;

    setDeletingImageId(imageIdForUpdate);
    setImageError(null);

    try {
      await deleteListingImage({
        listingId: listingIdForUpdate,
        imageId: imageIdForUpdate,
      });

      window.location.reload();
    } catch (error) {
      setImageError(
        error instanceof Error ? error.message : "Pildi kustutamine ebaõnnestus."
      );
    } finally {
      setDeletingImageId(null);
    }
  }

  async function handleUploadImages(files: File[]) {
    const listingIdForUpdate = listing?.id;
    const selectedFiles = files;

    if (!listingIdForUpdate || selectedFiles.length === 0 || uploadingImage) return;

    const currentImageCount = listing?.images.length || 0;
    const remainingSlots = 10 - currentImageCount;

    if (remainingSlots <= 0) {
      setImageError("Kuulutusele saab lisada kuni 10 pilti.");
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      setImageError(`Saad lisada veel ${remainingSlots} pilti.`);
      return;
    }

    setUploadingImage(true);
    setImageError(null);

    let uploadedCount = 0;

    try {
      for (const file of selectedFiles) {
        await uploadListingImage({
          listingId: listingIdForUpdate,
          file,
        });

        uploadedCount += 1;
      }

      window.location.reload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Pildi lisamine ebaõnnestus.";

      setImageError(
        uploadedCount > 0
          ? `${uploadedCount} pilti lisatud, aga järgmise pildi lisamine ebaõnnestus: ${message}`
          : message
      );
    } finally {
      setUploadingImage(false);
    }
  }

  return {
    primarySavingId, deletingImageId, uploadingImage, imageError,
    handleSetPrimaryImage, handleDeleteImage, handleUploadImages,
  };
}

export type ListingEditImageActions = ReturnType<typeof useListingEditImages>;
