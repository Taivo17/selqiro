import type { ListingImage } from "./types";

export function sortListingImages(images: ListingImage[]): ListingImage[] {
  return [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;

    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

export function getPrimaryListingImageUrl(input: {
  images?: ListingImage[] | null;
  fallbackImage?: string | null;
}): string | null {
  const sortedImages = sortListingImages(input.images || []);
  const primary = sortedImages[0];

  return (
    primary?.thumb_url ||
    primary?.medium_url ||
    primary?.original_url ||
    input.fallbackImage ||
    null
  );
}
