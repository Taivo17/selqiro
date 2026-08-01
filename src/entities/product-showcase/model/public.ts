export type PublicProductShowcaseImage = {
  id: string;
  showcaseId: string;
  originalUrl: string;
  mediumUrl: string | null;
  thumbUrl: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string | null;
};

export type PublicProductShowcase = {
  id: string;
  identityId: string;
  title: string;
  description: string;
  category: string | null;
  imageUrl: string;
  status: "published";
  sortOrder: number;
  publishedAt: string | null;
  activeUntil: string;
  createdAt: string;
  updatedAt: string;
  images: PublicProductShowcaseImage[];
};

export function
getPublicProductShowcaseImageUrl(
  image: PublicProductShowcaseImage
): string {
  return (
    image.mediumUrl ||
    image.originalUrl ||
    image.thumbUrl ||
    ""
  );
}
