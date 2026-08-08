import type {
  ServicePriceType,
} from "./types";

export type PublicServiceImage = {
  id: string;
  serviceId: string;
  originalUrl: string;
  mediumUrl: string | null;
  thumbUrl: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string | null;
};

export type PublicService = {
  id: string;
  identityId: string;
  title: string;
  description: string;
  category: string | null;
  subcategory: string | null;
  imageUrl: string | null;
  images: PublicServiceImage[];
  priceAmount: number | null;
  currency: string;
  priceType: ServicePriceType;
  country: string | null;
  city: string | null;
  location: string | null;
  status: "published";
  sortOrder: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export function getPublicServiceImageUrl(
  image: PublicServiceImage
): string {
  return (
    image.mediumUrl ||
    image.originalUrl ||
    image.thumbUrl ||
    ""
  );
}
