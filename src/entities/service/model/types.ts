export const SERVICE_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;

export type ServiceStatus =
  (typeof SERVICE_STATUSES)[number];

export const SERVICE_PRICE_TYPES = [
  "fixed",
  "from",
  "hourly",
  "contact",
] as const;

export type ServicePriceType =
  (typeof SERVICE_PRICE_TYPES)[number];

export type Service = {
  id: string;
  identityId: string;
  title: string;
  description: string;
  category: string | null;
  subcategory: string | null;
  imageUrl: string | null;
  priceAmount: number | null;
  currency: string;
  priceType: ServicePriceType;
  country: string | null;
  city: string | null;
  location: string | null;
  serviceLat: number | null;
  serviceLng: number | null;
  status: ServiceStatus;
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
