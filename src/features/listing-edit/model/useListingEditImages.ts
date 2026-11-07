"use client";

import { useState } from "react";
import { useV2Translation } from "../../../shared/i18n/V2LanguageProvider";
import { listingEditMessages } from "./listingEditMessages";
import { setListingPrimaryImage } from "../../../entities/listing/api/setListingPrimaryImage";
import { deleteListingImage } from "../../../entities/listing/api/deleteListingImage";
import { uploadListingImage } from "../../../entities/listing/api/uploadListingImage";
import type { ListingImage, ProductListingDetail } from "../../../entities/listing/model/types";

/** The page calls this unconditionally, as before extraction. No new save or retry policy. */
export function useListingEditImages(listing: ProductListingDetail | null) {
  const { t } = useV2Translation(listingEditMessages);
  const [primarySavingId, setPrimarySavingId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageErrorState] = useState<string | null>(null);
  const [imageErrorParams, setImageErrorParams] = useState<Readonly<Record<string, string | number>> | undefined>();
  const [imageErrorReason, setImageErrorReason] = useState<string | null>(null);
  const setImageError = (key: string | null, params?: Readonly<Record<string, string | number>>, reason?: string) => {
    setImageErrorState(key); setImageErrorParams(params); setImageErrorReason(reason ?? null);
  };

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
          : "primaryChangeFailed"
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
      setImageError("lastImageCannotDelete");
      return;
    }

    const confirmed = window.confirm(t("confirmDeleteImage"));

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
        error instanceof Error ? error.message : "imageDeleteFailed"
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
      setImageError("legacyImageLimit");
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      setImageError("imageSlotsRemaining", { count: remainingSlots });
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
        error instanceof Error ? error.message : "imageAddFailed";

      setImageError(uploadedCount > 0 ? "imagesPartlyAdded" : message,
        uploadedCount > 0 ? { count: uploadedCount } : undefined,
        uploadedCount > 0 ? message : undefined);
    } finally {
      setUploadingImage(false);
    }
  }

  return {
    primarySavingId, deletingImageId, uploadingImage, imageError, imageErrorParams, imageErrorReason,
    handleSetPrimaryImage, handleDeleteImage, handleUploadImages,
  };
}

export type ListingEditImageActions = ReturnType<typeof useListingEditImages>;
