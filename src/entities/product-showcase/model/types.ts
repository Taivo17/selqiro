export const PRODUCT_SHOWCASE_TITLE_MIN_LENGTH = 2;
export const PRODUCT_SHOWCASE_TITLE_MAX_LENGTH = 140;
export const PRODUCT_SHOWCASE_DESCRIPTION_MAX_LENGTH = 5000;
export const PRODUCT_SHOWCASE_CATEGORY_MAX_LENGTH = 120;
export const PRODUCT_SHOWCASE_URL_MAX_LENGTH = 2000;

export type ProductShowcaseStatus =
  | "draft"
  | "published"
  | "archived";

export type ProductShowcase = {
  id: string;
  identityId: string;
  title: string;
  description: string;
  category: string | null;
  imageUrl: string | null;
  externalUrl: string | null;
  status: ProductShowcaseStatus;
  sortOrder: number;
  publishedAt: string | null;
  lastConfirmedAt: string | null;
  activeUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveProductShowcaseInput = {
  showcaseId?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  externalUrl?: string | null;
};

export const PRODUCT_SHOWCASE_STATUSES: ProductShowcaseStatus[] = [
  "draft",
  "published",
  "archived",
];
