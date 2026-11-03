import type { ManagedListingImage } from "../../../entities/listing/model/managedListingImages";

/** Display order only: the stored snapshot and each image's original ordinal stay unchanged. */
export function orderManagedListingImagesForDisplay(
  images: readonly ManagedListingImage[],
): readonly ManagedListingImage[] {
  return [
    ...images.filter(image => image.isPrimary),
    ...images.filter(image => !image.isPrimary),
  ];
}
