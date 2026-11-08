import type { ListingImage } from "../../../entities/listing/model/types";
import type { PublicGalleryPhoto } from "../../../shared/media/PublicPhotoGallery";

/** Keep the original display-size choices and exact public media URLs. */
export function listingGalleryPhotos(images: readonly ListingImage[], coverUrl: string | null): PublicGalleryPhoto[] {
  const photos = images.flatMap((image, index) => {
    const src = image.medium_url || image.original_url || image.thumb_url;
    return src ? [{
      id: image.id || `${index}:${src}`,
      src,
      thumbnailSrc: image.thumb_url || image.medium_url || image.original_url,
      fullSrc: image.original_url || image.medium_url || image.thumb_url,
    }] : [];
  });
  return photos.length || !coverUrl ? photos : [{ id: "cover", src: coverUrl }];
}
