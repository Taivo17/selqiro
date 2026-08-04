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

export const SERVICE_TITLE_MIN_LENGTH = 2;
export const SERVICE_TITLE_MAX_LENGTH = 140;
export const SERVICE_DESCRIPTION_MAX_LENGTH = 5000;
export const SERVICE_CATEGORY_MAX_LENGTH = 120;
export const SERVICE_SUBCATEGORY_MAX_LENGTH = 160;
export const SERVICE_COUNTRY_MAX_LENGTH = 120;
export const SERVICE_CITY_MAX_LENGTH = 160;
export const SERVICE_LOCATION_MAX_LENGTH = 300;
export const SERVICE_CURRENCY_LENGTH = 3;
export const SERVICE_PRICE_MAX = 9999999999.99;

export type SaveServiceInput = {
  serviceId?: string | null;
  title: string;
  description?: string | null;
  category: string;
  subcategory?: string | null;
  priceAmount?: number | null;
  currency?: string | null;
  priceType?: ServicePriceType;
  country?: string | null;
  city?: string | null;
  location?: string | null;
};

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
