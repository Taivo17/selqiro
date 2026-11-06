import type { ManagedListingImage } from "../../../entities/listing/model/managedListingImages";

/** Display order only: immutable gallery identifiers and source URLs stay unchanged. */
export function orderManagedListingImagesForDisplay<T extends Pick<ManagedListingImage, "isPrimary">>(
  images: readonly T[],
): readonly T[] {
  return [...images.filter(image => image.isPrimary), ...images.filter(image => !image.isPrimary)];
}
